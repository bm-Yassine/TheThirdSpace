import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from 'firebase/auth';
import { authService, dataService, type UserProfile } from '../Backend/firebase';

type AuthState = {
  /** Firebase auth user, or null when signed out. */
  user: User | null;
  /** Firestore profile document for `user`, loaded lazily after sign-in. */
  profile: UserProfile | null;
  /**
   * True until Firebase has restored (or ruled out) a persisted session.
   * Screens must not treat `user === null` as "signed out" while this is true —
   * on web the session is rehydrated asynchronously from IndexedDB.
   */
  initializing: boolean;
  /** True while the profile document is being fetched. */
  loadingProfile: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  /** Apply a local patch so screens reflect edits without a round trip. */
  patchProfile: (updates: Partial<UserProfile>) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (nextUser) => {
      setUser(nextUser);
      setInitializing(false);

      if (!nextUser) {
        setProfile(null);
        return;
      }

      setLoadingProfile(true);
      try {
        // Guarantees a profile document exists for every signed-in user,
        // including accounts created before profiles were written on signup.
        const nextProfile = await dataService.ensureUserProfileFromAuthUser(nextUser);
        setProfile(nextProfile);
      } catch {
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    });

    return unsubscribe;
  }, []);

  const refreshProfile = useCallback(async () => {
    const current = authService.getCurrentUser();
    if (!current) {
      setProfile(null);
      return null;
    }

    setLoadingProfile(true);
    try {
      const next = await dataService.getUserProfile(current.uid);
      setProfile(next);
      return next;
    } catch {
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const patchProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      initializing,
      loadingProfile,
      refreshProfile,
      patchProfile,
      signOut,
    }),
    [user, profile, initializing, loadingProfile, refreshProfile, patchProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
}
