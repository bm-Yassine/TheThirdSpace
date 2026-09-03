import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { authService, dataService } from '../Backend/firebase';

/**
 * Account deletion, with the two guards this needs.
 *
 * Firebase requires a recent sign-in before deleting an account, so the user
 * re-enters their password — typed by them, passed straight to Firebase, never
 * stored. And because erasure is irreversible and cascades across events,
 * messages and ratings, they must type DELETE to confirm.
 */

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccountDialog({
  visible,
  onClose,
  onDeleted,
}: {
  visible: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPassword('');
    setConfirmation('');
    setError(null);
    setStep('');
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const canSubmit = password.length > 0 && confirmation.trim().toUpperCase() === CONFIRM_WORD;

  const onDelete = async () => {
    if (!canSubmit || busy) return;

    setBusy(true);
    setError(null);
    try {
      // Prove identity first, so we never start erasing data only to fail at
      // the last step because the session was too old.
      await authService.reauthenticate(password);
    } catch (authError: any) {
      setBusy(false);
      setError(
        authError?.code === 'auth/wrong-password' ||
        authError?.code === 'auth/invalid-credential'
          ? 'That password is not correct.'
          : 'Could not verify your password. Please try again.'
      );
      return;
    }

    try {
      await dataService.deleteAccountAndData(setStep);
      reset();
      onDeleted();
    } catch (deleteError: any) {
      console.error('Account deletion failed:', deleteError);
      setError(
        deleteError?.message ||
          'Something went wrong while deleting your account. Some data may remain — please try again.'
      );
    } finally {
      setBusy(false);
      setStep('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <AlertTriangle size={20} color="#dc2626" />
            <Text style={styles.title}>Delete your account</Text>
          </View>

          <Text style={styles.body}>
            This permanently removes your profile, the events you host, your messages,
            your ratings and your uploaded files. Events you host will be cancelled and
            everyone who joined will be told. This cannot be undone.
          </Text>

          <Text style={styles.label}>Your password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
            editable={!busy}
          />

          <Text style={styles.label}>Type {CONFIRM_WORD} to confirm</Text>
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder={CONFIRM_WORD}
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            editable={!busy}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}
          {busy && !!step && <Text style={styles.step}>{step}…</Text>}

          <View style={styles.actions}>
            <Pressable onPress={close} style={[styles.btn, styles.cancelBtn]} disabled={busy}>
              <Text style={styles.cancelText}>Keep my account</Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              style={[styles.btn, styles.deleteBtn, (!canSubmit || busy) && styles.btnDisabled]}
              disabled={!canSubmit || busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.deleteText}>Delete forever</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.55)',
    justifyContent: 'center',
    padding: 22,
  },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  body: { fontSize: 13.5, color: '#4b5563', lineHeight: 20, marginBottom: 16 },

  label: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
    marginBottom: 14,
  },

  error: { fontSize: 12.5, color: '#dc2626', marginBottom: 10, lineHeight: 18 },
  step: { fontSize: 12.5, color: '#4b5563', marginBottom: 10 },

  actions: { flexDirection: 'row', gap: 9, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#f3f4f6' },
  cancelText: { fontSize: 13.5, fontWeight: '700', color: '#374151' },
  deleteBtn: { backgroundColor: '#dc2626' },
  deleteText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.45 },
});
