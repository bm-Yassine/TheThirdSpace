import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Flag } from 'lucide-react-native';
import { dataService } from '../Backend/firebase';

/**
 * Reporting an event or a person.
 *
 * Reports are write-only: the person reported can never see who reported them,
 * which is enforced by the security rules rather than only in the UI.
 */

const REASONS = [
  { id: 'harassment', label: 'Harassment or abuse' },
  { id: 'unsafe', label: 'Unsafe or dangerous' },
  { id: 'scam', label: 'Scam or misleading' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'spam', label: 'Spam' },
  { id: 'other', label: 'Something else' },
];

export default function ReportDialog({
  visible,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: 'event' | 'user' | 'message';
  targetId: string;
  targetLabel?: string;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setReason(null);
    setDetails('');
    setSent(false);
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await dataService.reportContent({ targetType, targetId, reason, details });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Could not send your report. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {sent ? (
            <>
              <Text style={styles.title}>Report sent</Text>
              <Text style={styles.body}>
                Thanks — we&apos;ll review this. If you feel unsafe, you can also block this
                person so they can no longer message you.
              </Text>
              <Pressable onPress={close} style={[styles.btn, styles.primaryBtn]}>
                <Text style={styles.primaryText}>Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.titleRow}>
                <Flag size={18} color="#dc2626" />
                <Text style={styles.title}>
                  Report {targetLabel ? `"${targetLabel}"` : `this ${targetType}`}
                </Text>
              </View>

              <Text style={styles.label}>What&apos;s wrong?</Text>
              <View style={styles.reasons}>
                {REASONS.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() => setReason(option.id)}
                    style={[styles.reason, reason === option.id && styles.reasonSelected]}
                  >
                    <Text
                      style={[
                        styles.reasonText,
                        reason === option.id && styles.reasonTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Anything else? (optional)</Text>
              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="Add context that would help us understand"
                placeholderTextColor="#9ca3af"
                multiline
                style={[styles.input, styles.textArea]}
                editable={!busy}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.actions}>
                <Pressable onPress={close} style={[styles.btn, styles.cancelBtn]} disabled={busy}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={submit}
                  style={[styles.btn, styles.primaryBtn, (!reason || busy) && styles.btnDisabled]}
                  disabled={!reason || busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryText}>Send report</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    paddingBottom: 34,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  body: { fontSize: 13.5, color: '#4b5563', lineHeight: 20, marginVertical: 12 },

  label: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 8 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  reason: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reasonSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  reasonText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  reasonTextSelected: { color: '#fff' },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textArea: { minHeight: 76, textAlignVertical: 'top', marginBottom: 14 },
  error: { fontSize: 12.5, color: '#dc2626', marginBottom: 10 },

  actions: { flexDirection: 'row', gap: 9, marginTop: 6 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#f3f4f6' },
  cancelText: { fontSize: 13.5, fontWeight: '700', color: '#374151' },
  primaryBtn: { backgroundColor: '#111827' },
  primaryText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.45 },
});
