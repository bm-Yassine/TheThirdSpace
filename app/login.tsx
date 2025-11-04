// screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { auth } from '../Backend/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';

export default function LoginScreen({ onSuccess }: { onSuccess?: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setErr(null);
  };

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      onSuccess?.();
    } catch (e: any) {
      setErr(mapAuthError(e?.code) || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email) return setErr('Enter your email first.');
    setBusy(true);
    setErr(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setErr('Password reset email sent.');
    } catch (e: any) {
      setErr(mapAuthError(e?.code) || 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <View style={styles.card}>
        <Text style={styles.h1}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
        <Text style={styles.subtle}>
          {mode === 'login' ? 'Sign in to continue' : 'Join and start discovering events'}
        </Text>

        <View style={{ height: 12 }} />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          style={styles.input}
        />

        <View style={{ height: 10 }} />
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          style={styles.input}
        />

        {!!err && <Text style={styles.error}>{err}</Text>}

        <Pressable onPress={submit} style={[styles.btn, styles.btnPrimary]} disabled={busy}>
          {busy ? <ActivityIndicator /> : <Text style={styles.btnText}>
            {mode === 'login' ? 'Sign in' : 'Sign up'}
          </Text>}
        </Pressable>

        <View style={styles.rowBetween}>
          <Pressable onPress={forgot}><Text style={styles.link}>Forgot password?</Text></Pressable>
          <Pressable onPress={toggle}>
            <Text style={styles.link}>
              {mode === 'login' ? "New here? Create account" : 'Have an account? Sign in'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function mapAuthError(code?: string): string | null {
  switch (code) {
    case 'auth/invalid-email': return 'Invalid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password': return 'Incorrect email or password.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    case 'auth/email-already-in-use': return 'Email already in use.';
    case 'auth/too-many-requests': return 'Too many attempts. Try again later.';
    default: return null;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 420, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 16, backgroundColor: '#fff' },
  h1: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  label: { fontSize: 13, color: '#111827', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  btnPrimary: { backgroundColor: '#111827' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  link: { color: '#2563eb', fontSize: 12 },
  error: { color: '#dc2626', marginTop: 10, fontSize: 12 },
});
