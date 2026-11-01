import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, dataService, googleClientIds } from '../Backend/firebase';

/**
 * Google sign-in.
 *
 * Uses expo-auth-session rather than a native Google SDK so one code path
 * serves web, iOS and Android — the native SDKs need a custom dev client,
 * which this project does not build.
 *
 * The flow returns an id_token, which is exchanged for a Firebase credential.
 * Firebase is the source of truth for identity either way, so a Google user
 * and an email user are the same kind of account downstream.
 */

// Required on web so the popup can hand the result back to the opener.
WebBrowser.maybeCompleteAuthSession();

/**
 * True when real client IDs exist for the current platform.
 * Web needs the web client id; native needs its own, because Google issues a
 * separate id per platform and the wrong one fails at the consent screen
 * rather than at configuration time.
 */
export const isGoogleConfigured = (): boolean => {
  if (Platform.OS === 'web') return !!googleClientIds.webClientId;
  if (Platform.OS === 'ios') return !!googleClientIds.iosClientId;
  if (Platform.OS === 'android') return !!googleClientIds.androidClientId;
  return false;
};

export type GoogleSignInState = {
  available: boolean;
  /** False while the auth request object is still being prepared. */
  ready: boolean;
  signIn: () => void;
};

/**
 * Drives the Google flow and completes the Firebase sign-in.
 * `onSuccess` fires only after Firebase has the session and the profile
 * document exists, so callers can navigate immediately.
 */
export function useGoogleSignIn(options: {
  onSuccess: (isNewUser: boolean) => void;
  onError: (message: string) => void;
}): GoogleSignInState {
  const available = isGoogleConfigured();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientIds.webClientId || undefined,
    iosClientId: googleClientIds.iosClientId || undefined,
    androidClientId: googleClientIds.androidClientId || undefined,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'dismiss' || response.type === 'cancel') return;

    if (response.type === 'error') {
      options.onError(response.error?.message || 'Google sign-in failed.');
      return;
    }

    if (response.type !== 'success') return;

    const idToken = response.params?.id_token ?? (response as any).authentication?.idToken;
    if (!idToken) {
      options.onError('Google did not return a usable token.');
      return;
    }

    (async () => {
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);

        // A Google account arrives with a name and photo; seed the profile
        // from them so the user does not land on an empty profile.
        const existing = await dataService.getUserProfile(result.user.uid).catch(() => null);
        const isNewUser = !existing;

        if (isNewUser) {
          await dataService.createUserProfile(result.user.uid, {
            email: result.user.email || '',
            displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
            photoURL: result.user.photoURL || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        options.onSuccess(isNewUser);
      } catch (error: any) {
        options.onError(
          error?.code === 'auth/account-exists-with-different-credential'
            ? 'That email already has a password account. Sign in with your password instead.'
            : error?.message || 'Could not complete Google sign-in.'
        );
      }
    })();
    // options is recreated per render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return {
    available,
    ready: !!request,
    signIn: () => {
      promptAsync();
    },
  };
}
