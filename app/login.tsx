// screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity, Image, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { authService, dataService } from '../Backend/firebase';

/** Google OAuth needs real iOS/Android/web client IDs before this is shown. */
const GOOGLE_SIGN_IN_READY = false;

export default function LoginScreen({ onSuccess }: { onSuccess?: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setErr(null);
    setDisplayName('');
  };

  const submit = async () => {
    if (!email || !password) {
      setErr('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      setErr('Please enter your name');
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      let authUser = null;
      if (mode === 'login') {
        const credential = await authService.signIn(email.trim(), password);
        authUser = credential.user;
      } else {
        const credential = await authService.signUp(email.trim(), password, displayName.trim());
        authUser = credential.user;
      }

      if (authUser) {
        await dataService.ensureUserProfileFromAuthUser(
          authUser,
          mode === 'signup' ? displayName.trim() : undefined
        );
      }

      router.replace('/home');
    } catch (e: any) {
      console.log('Auth error:', e); // Debug log
      const errorMessage = mapAuthError(e?.code) || `Authentication failed: ${e?.message || 'Unknown error'}`;
      setErr(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = () => {
    Alert.alert(
      'Coming Soon',
      'Google sign-in will be available soon after app verification is completed.'
    );
  };

  const forgot = async () => {
    if (!email) return setErr('Enter your email first.');
    setBusy(true);
    setErr(null);
    try {
      await authService.resetPassword(email.trim());
      setErr('Password reset email sent.');
    } catch (e: any) {
      setErr(mapAuthError(e?.code) || 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <View style={styles.background}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Image
              source={require('../assets/images/logo-mark-light.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>The Third Space</Text>
          <Text style={styles.tagline}>Discover Amazing Events</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{mode === 'login' ? 'Welcome Back!' : 'Join the Community'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Sign in to discover events near you' : 'Create your account and start exploring'}
          </Text>

          {/*
            Google sign-in is hidden until real OAuth client IDs exist. A
            prominent, permanently disabled "(Soon)" button is the first thing a
            new user sees, and a dead primary action reads as a broken app.
            Flip GOOGLE_SIGN_IN_READY once the client IDs are configured.
          */}
          {GOOGLE_SIGN_IN_READY && (
            <>
              <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
                <Image
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          {mode === 'signup' && (
            <Text style={styles.consent}>
              By creating an account you agree to our{' '}
              <Text
                style={styles.consentLink}
                onPress={() => router.push({ pathname: '/legal', params: { tab: 'terms' } })}
              >
                Terms of Use
              </Text>{' '}
              and{' '}
              <Text
                style={styles.consentLink}
                onPress={() => router.push({ pathname: '/legal', params: { tab: 'privacy' } })}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          )}

          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  placeholder="Enter your name"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />
            </View>

            {!!err && (
              <View style={styles.errorContainer}>
                <Text style={styles.error}>{err}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.buttonDisabled]}
              onPress={submit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotButton} onPress={forgot}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.switchModeButton} onPress={toggle}>
              <Text style={styles.switchModeText}>
                {mode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'
                }
              </Text>
            </TouchableOpacity>
          </View>
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
  container: {
    flex: 1,
    backgroundColor: '#6366f1',
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  consent: {
    fontSize: 11.5,
    color: '#6b7280',
    lineHeight: 17,
    marginBottom: 14,
    textAlign: 'center',
  },
  consentLink: { color: '#6366f1', fontWeight: '600' },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#111827',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  switchModeButton: {
    alignItems: 'center',
  },
  switchModeText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
