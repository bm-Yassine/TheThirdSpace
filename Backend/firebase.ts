// backend/firebase.ts
import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  type Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  reload,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
// 'firebase/auth/react-native' can be missing type declarations in some setups (TS); require dynamically and type as any
let getReactNativePersistence: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getReactNativePersistence = require('firebase/auth/react-native').getReactNativePersistence;
} catch (e) {
  getReactNativePersistence = undefined;
}
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  increment,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, listAll, deleteObject } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockEvents } from '../lib/events';
import { USE_MOCK_EVENTS, DEMO_MODE } from '../lib/config';
import { demoService } from '../lib/demoService';
import { withTimeout } from '../lib/async';
import {
  getEventStart,
  hasEventEnded,
  DEFAULT_EVENT_DURATION_MINUTES,
} from '../lib/eventTime';
import type { Attendee, AttendeeStatus, Rating, ReputationSummary } from '../lib/types';
import {
  counterChanges,
  decideJoinOutcome,
  decidePromotionOutcome,
  normalizeStatus,
} from '../lib/participation';

/**
 * Firebase client configuration.
 *
 * These values are not secrets. A Firebase web app ships them in its JavaScript
 * bundle by necessity, so they are readable from any deployed site — the API
 * key identifies the project, it does not grant access to it. What actually
 * protects the data is Firestore and Storage security rules, plus API key
 * restrictions in the Google Cloud console.
 *
 * They are read from the environment rather than hardcoded so the repository
 * does not publish them itself, which is what automated key scanners flag.
 */
const readConfigValue = (name: string, value: string | undefined): string => {
  if (value) return value;
  throw new Error(
    `Missing ${name}. Copy .env.example to .env.local and fill in the Firebase ` +
      'values from the Firebase console (Project settings → Your apps → SDK setup). ' +
      'On Vercel, add them as environment variables and redeploy.'
  );
};

const firebaseConfig = {
  apiKey: readConfigValue(
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY
  ),
  authDomain: readConfigValue(
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
  ),
  projectId: readConfigValue(
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
  ),
  storageBucket: readConfigValue(
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  ),
  messagingSenderId: readConfigValue(
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  ),
  appId: readConfigValue('EXPO_PUBLIC_FIREBASE_APP_ID', process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const googleClientIds = {
  webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID || '',
  androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID || '',
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Analytics is web-only, skip in React Native
// const analytics = Platform.OS === 'web' ? getAnalytics(app) : null;

// Proper RN persistence (web uses IndexedDB automatically)
let auth: Auth;
if (Platform.OS === 'web' || !getReactNativePersistence) {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export { auth };

// Authentication functions
export const authService = {
  async signIn(email: string, password: string) {
    return await signInWithEmailAndPassword(auth, email, password);
  },

  async signUp(email: string, password: string, displayName?: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // The account already exists at this point, so a Firestore hiccup must not
    // surface as "signup failed". AuthProvider re-attempts the profile write on
    // every auth state change, so a missed write is self-healing.
    if (userCredential.user) {
      try {
        await dataService.createUserProfile(userCredential.user.uid, {
          email: userCredential.user.email || email,
          displayName: displayName || 'User',
          photoURL: userCredential.user.photoURL || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.warn('Profile document could not be created at signup:', error);
      }
    }

    // Fire-and-forget: a failed verification email must not fail signup, and
    // the profile screen offers a retry.
    if (userCredential.user && !userCredential.user.emailVerified) {
      sendEmailVerification(userCredential.user).catch((error) =>
        console.warn('Verification email could not be sent:', error)
      );
    }

    return userCredential;
  },

  async signOut() {
    return await signOut(auth);
  },

  async resetPassword(email: string) {
    return await sendPasswordResetEmail(auth, email);
  },

  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUser() {
    return auth.currentUser;
  },

  /**
   * Sends the verification email. Called on signup and retryable from the
   * profile banner, since the first one is easy to miss.
   */
  async sendVerificationEmail() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    if (user.emailVerified) return;
    return sendEmailVerification(user);
  },

  /** Re-fetches the user so `emailVerified` reflects a link clicked elsewhere. */
  async refreshUser() {
    const user = auth.currentUser;
    if (!user) return null;
    await reload(user);
    return auth.currentUser;
  },

  /**
   * Confirms the user's password.
   *
   * Firebase requires a recent login before destructive account operations, so
   * deletion has to re-prove identity. The password is passed straight to
   * Firebase and never stored or logged.
   */
  async reauthenticate(password: string) {
    const user = auth.currentUser;
    if (!user?.email) throw new Error('User not authenticated');
    const credential = EmailAuthProvider.credential(user.email, password);
    return reauthenticateWithCredential(user, credential);
  },

  /** Deletes the Firebase Auth account. Call only after data has been erased. */
  async deleteAuthAccount() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return deleteUser(user);
  },
};

// User Profile type
export interface UserProfile {
  uid?: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  bio?: string;
  interests?: string[];
  createdAt: Date | any;
  updatedAt: Date | any;
  stats?: {
    eventsJoined?: number;
    eventsCreated?: number;
    rating?: number;
  };
}

export type CommitmentReason = 'approval' | 'waitlist' | 'direct' | 'payment' | 'promoted';
export type PaymentStatus = 'pending' | 'completed' | 'not_required';

export interface UserCommitment {
  eventId: string;
  status: AttendeeStatus;
  reason?: CommitmentReason;
  paymentStatus?: PaymentStatus;
  committedAt: Date | any;
  updatedAt?: Date | any;
  /** Denormalised at write time so profile lists render without an extra read. */
  eventTitle?: string;
  eventStartsAt?: any;
  organizerUid?: string | null;
}

export interface ConversationSummary {
  id: string;
  participantIds: string[];
  otherUserId: string;
  otherUserName: string;
  otherUserPhotoURL?: string | null;
  lastMessage?: string;
  lastMessageSenderId?: string;
  updatedAt?: Date | any;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Date | any;
}

const dateToMillis = (value: any) => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  return new Date(value).getTime() || 0;
};

/** Wraps the tested pure counter math in Firestore increment() sentinels. */
const counterDeltaFor = (
  from: AttendeeStatus | null,
  to: AttendeeStatus | null
): Record<string, any> =>
  Object.fromEntries(
    Object.entries(counterChanges(from, to)).map(([field, amount]) => [
      field,
      increment(amount),
    ])
  );

const toOrganizerUid = (organizerName?: string | null) => {
  const normalized = (organizerName || 'organizer')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `mock-organizer-${normalized || 'user'}`;
};

const getMockEventById = (eventId: string) => {
  if (!USE_MOCK_EVENTS) return null;

  const event = mockEvents.find((e) => String(e.id) === String(eventId));
  if (!event) return null;

  const organizerUid = event.organizer?.uid || toOrganizerUid(event.organizer?.name);
  return {
    ...event,
    id: String(event.id),
    createdBy: organizerUid,
    organizer: {
      ...event.organizer,
      uid: organizerUid,
      photoURL: event.organizer?.photoURL || null,
    },
    imageUrl:
      event.imageUrl ||
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&h=800&fit=crop',
  };
};

// Firestore data functions
const firestoreDataService = {
  // User Profile functions
  async createUserProfile(uid: string, profileData: Partial<UserProfile>) {
    const userRef = doc(db, 'users', uid);
    const profile: UserProfile = {
      uid,
      email: profileData.email || '',
      displayName: profileData.displayName || 'User',
      photoURL: profileData.photoURL || null,
      bio: profileData.bio || '',
      interests: profileData.interests || [],
      createdAt: profileData.createdAt || new Date(),
      updatedAt: new Date(),
      stats: {
        eventsJoined: 0,
        eventsCreated: 0,
        rating: 0,
      },
    };
    await setDoc(userRef, profile, { merge: true });
    return profile;
  },

  async ensureUserProfileFromAuthUser(user: User, displayNameOverride?: string) {
    const existing = await this.getUserProfile(user.uid).catch(() => null);
    if (existing) return existing;

    const derivedName =
      displayNameOverride?.trim() ||
      user.displayName ||
      user.email?.split('@')[0] ||
      'User';

    return this.createUserProfile(user.uid, {
      email: user.email || '',
      displayName: derivedName,
      photoURL: user.photoURL || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { uid: userDoc.id, ...userDoc.data() } as UserProfile;
    }
    return null;
  },

  async updateUserProfile(uid: string, updates: Partial<UserProfile>) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return this.getUserProfile(user.uid);
  },

  async getCurrentUserCreatedEvents(limitCount = 50) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      const refsSnapshot = await getDocs(collection(db, 'users', user.uid, 'createdEvents'));
      const refs = refsSnapshot.docs
        .map((snapshot) => {
          const data = snapshot.data() as any;
          return {
            eventId: String(data?.eventId || snapshot.id),
            createdAt: data?.createdAt,
          };
        })
        .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt))
        .slice(0, limitCount);

      if (refs.length > 0) {
        const events = await Promise.all(refs.map((ref) => this.getEvent(ref.eventId)));
        return events.filter(Boolean);
      }
    } catch {
      // fall through to organizer-based query
    }

    // Backward compatibility: if reference collection is empty/missing,
    // fetch directly from events created by this user.
    return this.getEvents({ organizerId: user.uid, limit: limitCount });
  },

  async getUserByDisplayName(displayName: string): Promise<UserProfile | null> {
    const userQuery = query(
      collection(db, 'users'),
      where('displayName', '==', displayName),
      limit(1)
    );
    const result = await getDocs(userQuery);
    if (result.empty) return null;
    const first = result.docs[0];
    return { uid: first.id, ...first.data() } as UserProfile;
  },

  // Events collection
  async createEvent(eventData: DocumentData) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const eventRef = doc(collection(db, 'events'));

    const startsAt = getEventStart(eventData);
    const durationMinutes =
      Number(eventData.durationMinutes) || DEFAULT_EVENT_DURATION_MINUTES;
    const endsAt = startsAt
      ? new Date(startsAt.getTime() + durationMinutes * 60 * 1000)
      : null;

    const eventWithMeta = {
      ...eventData,
      id: eventRef.id,
      createdBy: user.uid,
      // Stored as ISO strings so they survive the JSON round-trip through the
      // feed cache and stay comparable across web and native.
      startsAt: startsAt ? startsAt.toISOString() : null,
      endsAt: endsAt ? endsAt.toISOString() : null,
      durationMinutes,
      status: 'active',
      // Denormalised participation counters, kept in step by counterDeltaFor().
      attendees: 0,
      pendingCount: 0,
      waitlistCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(eventRef, eventWithMeta);

    // Keep a direct reference for profile "created events" lookups
    await setDoc(doc(db, 'users', user.uid, 'createdEvents', eventRef.id), {
      eventId: eventRef.id,
      createdAt: eventWithMeta.createdAt,
      updatedAt: eventWithMeta.updatedAt,
    });

    // Best-effort: keep profile stats in sync
    const profile = await this.getUserProfile(user.uid);
    if (profile) {
      await this.updateUserProfile(user.uid, {
        stats: {
          ...profile.stats,
          eventsCreated: (profile.stats?.eventsCreated || 0) + 1,
        },
      });
    }

    return eventRef.id;
  },

  async getEvents(filters?: { organizerId?: string; tags?: string[]; limit?: number }) {
    // NOTE:
    // Avoid hard-depending on composite indexes here. We'll sort client-side,
    // and only use the strict ordered query when organizer filter isn't applied.
    try {
      let q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));

      if (filters?.organizerId) {
        q = query(collection(db, 'events'), where('createdBy', '==', filters.organizerId));
      }

      if (filters?.limit) {
        q = query(q, limit(filters.limit));
      }

      const querySnapshot = await getDocs(q);
      const events = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const sorted = events.sort((a: any, b: any) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
      return filters?.limit ? sorted.slice(0, filters.limit) : sorted;
    } catch (error) {
      // Fallback for index/rules mismatches: use the simplest query possible
      let fallbackQuery = query(collection(db, 'events'));
      if (filters?.organizerId) {
        fallbackQuery = query(fallbackQuery, where('createdBy', '==', filters.organizerId));
      }

      const querySnapshot = await getDocs(fallbackQuery);
      const events = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const sorted = events.sort((a: any, b: any) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
      return filters?.limit ? sorted.slice(0, filters.limit) : sorted;
    }
  },

  async getEvent(eventId: string) {
    try {
      const eventDoc = await withTimeout(getDoc(doc(db, 'events', eventId)));
      if (eventDoc.exists()) {
        return { id: eventDoc.id, ...eventDoc.data() };
      }
    } catch (error) {
      // An unreachable database must not hang the detail screen forever.
      console.warn(`Could not read event ${eventId}:`, error);
    }

    return getMockEventById(eventId);
  },

  /**
   * Edits an event. Organizer only.
   *
   * Recomputes `endsAt` whenever the schedule moves, so the derived field can
   * never drift from `startsAt` + `durationMinutes` — which is what decides
   * whether an event counts as finished.
   */
  async updateEvent(eventId: string, updates: Partial<DocumentData>) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const eventRef = doc(db, 'events', eventId);
    const snapshot = await getDoc(eventRef);
    if (!snapshot.exists()) throw new Error('Event not found');
    if ((snapshot.data() as any).createdBy !== user.uid) {
      throw new Error('Only the organizer can edit this event');
    }

    const next: Record<string, any> = { ...updates, updatedAt: new Date() };

    if (updates.startsAt || updates.durationMinutes) {
      const merged = { ...(snapshot.data() as any), ...updates };
      const start = getEventStart(merged);
      const minutes = Number(merged.durationMinutes) || DEFAULT_EVENT_DURATION_MINUTES;
      next.endsAt = start
        ? new Date(start.getTime() + minutes * 60 * 1000).toISOString()
        : null;
    }

    await updateDoc(eventRef, next);
  },

  /**
   * Cancels an event without deleting it.
   *
   * Deleting would strip the event from every attendee's history and orphan
   * their commitments. Cancelling keeps the record, hides it from discovery,
   * and tells the people who were counting on it — via the existing chat
   * threads, which is the only notification channel the app actually has.
   */
  async cancelEvent(eventId: string, reason?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const eventRef = doc(db, 'events', eventId);
    const snapshot = await getDoc(eventRef);
    if (!snapshot.exists()) throw new Error('Event not found');

    const eventData = snapshot.data() as any;
    if (eventData.createdBy !== user.uid) {
      throw new Error('Only the organizer can cancel this event');
    }

    await updateDoc(eventRef, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason?.trim() || '',
      updatedAt: new Date(),
    });

    // Tell everyone who had a place or was waiting for one.
    const participants = await this.getEventParticipants(eventId);
    const toNotify = participants.filter((p) => p.status !== 'declined');

    const message = reason?.trim()
      ? `"${eventData.title}" has been cancelled by the organizer. Reason: ${reason.trim()}`
      : `"${eventData.title}" has been cancelled by the organizer.`;

    await Promise.all(
      toNotify.map(async (participant) => {
        try {
          const conversationId = await this.getOrCreateConversation(participant.uid);
          await this.sendMessage(conversationId, message);
          // Reflect the cancellation in the participant's own view.
          await setDoc(
            doc(db, 'users', participant.uid, 'commitments', eventId),
            { status: 'declined', reason: 'cancelled', updatedAt: new Date() },
            { merge: true }
          );
        } catch (error) {
          // One failed notification must not abort the cancellation.
          console.warn(`Could not notify ${participant.uid} of cancellation:`, error);
        }
      })
    );

    return { notified: toNotify.length };
  },

  /** Reopens a cancelled event. */
  async reopenEvent(eventId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const eventRef = doc(db, 'events', eventId);
    const snapshot = await getDoc(eventRef);
    if (!snapshot.exists()) throw new Error('Event not found');
    if ((snapshot.data() as any).createdBy !== user.uid) {
      throw new Error('Only the organizer can reopen this event');
    }

    await updateDoc(eventRef, {
      status: 'active',
      cancelledAt: null,
      cancellationReason: '',
      updatedAt: new Date(),
    });
  },

  async deleteEvent(eventId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    await deleteDoc(doc(db, 'events', eventId));
  },

  // User favorites
  async addToFavorites(eventId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const favoriteRef = doc(db, 'users', user.uid, 'favorites', eventId);
    await setDoc(favoriteRef, { eventId, addedAt: new Date() });
  },

  async removeFromFavorites(eventId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const favoriteRef = doc(db, 'users', user.uid, 'favorites', eventId);
    await deleteDoc(favoriteRef);
  },

  async getUserFavorites() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const favoritesQuery = query(collection(db, 'users', user.uid, 'favorites'));
    const querySnapshot = await getDocs(favoritesQuery);
    return querySnapshot.docs.map(doc => doc.data().eventId);
  },

  async isFavorite(eventId: string) {
    const user = auth.currentUser;
    if (!user) return false;

    const favoriteRef = doc(db, 'users', user.uid, 'favorites', eventId);
    const favoriteDoc = await getDoc(favoriteRef);
    return favoriteDoc.exists();
  },

  // ---------------------------------------------------------------------------
  // Participation
  //
  // Source of truth is `events/{eventId}/participants/{uid}`. The event document
  // carries denormalised counters (`attendees`, `pendingCount`, `waitlistCount`)
  // so feeds can render capacity without reading the subcollection, and
  // `users/{uid}/commitments/{eventId}` mirrors the row so a user can list their
  // own participation without querying across every event.
  //
  // All three are written inside one transaction, which is what makes capacity
  // safe under concurrent joins.
  // ---------------------------------------------------------------------------

  /**
   * Joins an event, picking the correct lane: confirmed, awaiting organizer
   * approval, awaiting payment, or waitlisted when the event is full.
   */
  async joinEvent(
    eventId: string,
    options?: { paymentCompleted?: boolean }
  ): Promise<{ status: AttendeeStatus; reason: CommitmentReason }> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const profile =
      (await this.getUserProfile(user.uid)) ||
      (await this.ensureUserProfileFromAuthUser(user));

    const eventRef = doc(db, 'events', eventId);
    const participantRef = doc(db, 'events', eventId, 'participants', user.uid);
    const commitmentRef = doc(db, 'users', user.uid, 'commitments', eventId);

    return runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) throw new Error('Event not found');

      const eventData = eventSnap.data() as any;
      if (eventData.status === 'cancelled') throw new Error('This event has been cancelled');
      if (eventData.createdBy === user.uid) throw new Error('You already host this event');
      if (hasEventEnded(eventData)) throw new Error('This event has already ended');

      const existingSnap = await transaction.get(participantRef);
      const previousStatus: AttendeeStatus | null = existingSnap.exists()
        ? normalizeStatus((existingSnap.data() as any).status)
        : null;

      // Re-joining after being declined is allowed; anything else is a no-op.
      if (previousStatus && previousStatus !== 'declined') {
        return {
          status: previousStatus,
          reason: ((existingSnap.data() as any).reason || 'direct') as CommitmentReason,
        };
      }

      const cost = Number(eventData.cost || 0);
      const { status, reason } = decideJoinOutcome({
        confirmedCount: Number(eventData.attendees || 0),
        maxAttendees: Number(eventData.maxAttendees || 0),
        cost,
        requiresApproval: !!eventData.requiresApproval,
        paymentCompleted: !!options?.paymentCompleted,
      });

      const paymentStatus: PaymentStatus =
        cost <= 0 ? 'not_required' : options?.paymentCompleted ? 'completed' : 'pending';

      const now = new Date();
      const participant: Attendee & { reason: CommitmentReason; updatedAt: any } = {
        uid: user.uid,
        name: profile?.displayName || user.displayName || 'User',
        photoURL: profile?.photoURL || null,
        avatar: '👤',
        status,
        reason,
        paymentStatus,
        joinedAt: now,
        updatedAt: now,
      };

      transaction.set(participantRef, participant);
      transaction.set(commitmentRef, {
        eventId,
        status,
        reason,
        paymentStatus,
        // Denormalised so the profile can sort and split past/upcoming without
        // fetching every event document.
        eventTitle: eventData.title || 'Untitled Event',
        eventStartsAt: eventData.startsAt || eventData.date || null,
        organizerUid: eventData.createdBy || null,
        committedAt: now,
        updatedAt: now,
      });

      transaction.update(eventRef, {
        ...counterDeltaFor(null, status),
        updatedAt: now,
      });

      return { status, reason };
    });
  },

  /** Backwards-compatible alias for screens still calling the old name. */
  async commitToEvent(eventId: string, options?: { paymentCompleted?: boolean }) {
    return this.joinEvent(eventId, options);
  },

  /** Leaves an event (or withdraws a request), then backfills from the waitlist. */
  async leaveEvent(eventId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const eventRef = doc(db, 'events', eventId);
    const participantRef = doc(db, 'events', eventId, 'participants', user.uid);
    const commitmentRef = doc(db, 'users', user.uid, 'commitments', eventId);

    const freedASpot = await runTransaction(db, async (transaction) => {
      const participantSnap = await transaction.get(participantRef);
      if (!participantSnap.exists()) {
        transaction.delete(commitmentRef);
        return false;
      }

      const previousStatus = normalizeStatus((participantSnap.data() as any).status);
      const eventSnap = await transaction.get(eventRef);

      transaction.delete(participantRef);
      transaction.delete(commitmentRef);

      if (eventSnap.exists()) {
        transaction.update(eventRef, {
          ...counterDeltaFor(previousStatus, null),
          updatedAt: new Date(),
        });
      }

      return previousStatus === 'confirmed';
    });

    if (freedASpot) {
      // Best effort: a failed promotion must not fail the user's cancellation.
      await this.promoteFromWaitlist(eventId).catch(() => undefined);
    }
  },

  /** Backwards-compatible alias for screens still calling the old name. */
  async cancelCommitment(eventId: string) {
    return this.leaveEvent(eventId);
  },

  /**
   * Promotes the longest-waiting person into a freed spot.
   * Called after a cancellation or a capacity increase.
   */
  async promoteFromWaitlist(eventId: string): Promise<string | null> {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) return null;

    const eventData = eventSnap.data() as any;
    const maxAttendees = Number(eventData.maxAttendees || 0);
    if (maxAttendees > 0 && Number(eventData.attendees || 0) >= maxAttendees) return null;

    // Queried outside the transaction because Firestore transactions cannot run
    // queries; the transaction below re-checks the row before promoting it.
    const waitlistSnap = await getDocs(
      query(
        collection(db, 'events', eventId, 'participants'),
        where('status', '==', 'waitlisted')
      )
    );
    if (waitlistSnap.empty) return null;

    const next = waitlistSnap.docs
      .map((snapshot) => ({ uid: snapshot.id, joinedAt: (snapshot.data() as any).joinedAt }))
      .sort((a, b) => dateToMillis(a.joinedAt) - dateToMillis(b.joinedAt))[0];

    const participantRef = doc(db, 'events', eventId, 'participants', next.uid);
    const commitmentRef = doc(db, 'users', next.uid, 'commitments', eventId);

    const promoted = await runTransaction(db, async (transaction) => {
      const [freshEvent, freshParticipant] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(participantRef),
      ]);

      if (!freshEvent.exists() || !freshParticipant.exists()) return false;
      if (normalizeStatus((freshParticipant.data() as any).status) !== 'waitlisted') return false;

      const freshData = freshEvent.data() as any;
      const cap = Number(freshData.maxAttendees || 0);
      if (cap > 0 && Number(freshData.attendees || 0) >= cap) return false;

      // A paid or approval-gated event promotes into `pending`, not straight in.
      const participantData = freshParticipant.data() as any;
      const { status: nextStatus, reason: nextReason } = decidePromotionOutcome({
        cost: Number(freshData.cost || 0),
        paymentCompleted: participantData.paymentStatus === 'completed',
        requiresApproval: !!freshData.requiresApproval,
      });

      const now = new Date();
      transaction.update(participantRef, { status: nextStatus, reason: nextReason, updatedAt: now });
      transaction.set(
        commitmentRef,
        { status: nextStatus, reason: nextReason, updatedAt: now },
        { merge: true }
      );
      transaction.update(eventRef, {
        ...counterDeltaFor('waitlisted', nextStatus),
        updatedAt: now,
      });

      return true;
    });

    return promoted ? next.uid : null;
  },

  /** Organizer-only: accept a pending request. */
  async approveParticipant(eventId: string, participantUid: string) {
    return this.setParticipantStatus(eventId, participantUid, 'confirmed');
  },

  /** Organizer-only: reject a pending request. */
  async declineParticipant(eventId: string, participantUid: string) {
    return this.setParticipantStatus(eventId, participantUid, 'declined');
  },

  async setParticipantStatus(
    eventId: string,
    participantUid: string,
    nextStatus: AttendeeStatus
  ) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const eventRef = doc(db, 'events', eventId);
    const participantRef = doc(db, 'events', eventId, 'participants', participantUid);
    const commitmentRef = doc(db, 'users', participantUid, 'commitments', eventId);

    await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) throw new Error('Event not found');

      const eventData = eventSnap.data() as any;
      if (eventData.createdBy !== user.uid) {
        throw new Error('Only the organizer can manage attendees');
      }

      const participantSnap = await transaction.get(participantRef);
      if (!participantSnap.exists()) throw new Error('Participant not found');

      const previousStatus = normalizeStatus((participantSnap.data() as any).status);
      if (previousStatus === nextStatus) return;

      if (nextStatus === 'confirmed') {
        const cap = Number(eventData.maxAttendees || 0);
        if (cap > 0 && Number(eventData.attendees || 0) >= cap) {
          throw new Error('Event is at capacity');
        }

        // A paid event cannot be approved into a confirmed place until the
        // money has actually settled, otherwise approving from the organizer
        // screen would hand out free entry.
        const participantData = participantSnap.data() as any;
        if (
          Number(eventData.cost || 0) > 0 &&
          participantData.paymentStatus !== 'completed'
        ) {
          throw new Error('This person has not completed payment yet');
        }
      }

      const now = new Date();
      transaction.update(participantRef, { status: nextStatus, updatedAt: now });
      transaction.set(commitmentRef, { status: nextStatus, updatedAt: now }, { merge: true });
      transaction.update(eventRef, {
        ...counterDeltaFor(previousStatus, nextStatus),
        updatedAt: now,
      });
    });
  },

  /** Marks a participant's payment as settled and moves them out of the payment lane. */
  async markParticipantPaid(eventId: string, participantUid?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    const targetUid = participantUid || user.uid;

    const eventRef = doc(db, 'events', eventId);
    const participantRef = doc(db, 'events', eventId, 'participants', targetUid);
    const commitmentRef = doc(db, 'users', targetUid, 'commitments', eventId);

    await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) throw new Error('Event not found');
      const eventData = eventSnap.data() as any;

      const participantSnap = await transaction.get(participantRef);
      if (!participantSnap.exists()) throw new Error('Participant not found');

      const previousStatus = normalizeStatus((participantSnap.data() as any).status);
      const cap = Number(eventData.maxAttendees || 0);
      const isFull = cap > 0 && Number(eventData.attendees || 0) >= cap;

      const nextStatus: AttendeeStatus = eventData.requiresApproval
        ? 'pending'
        : isFull && previousStatus !== 'confirmed'
        ? 'waitlisted'
        : 'confirmed';
      const nextReason: CommitmentReason = eventData.requiresApproval
        ? 'approval'
        : nextStatus === 'waitlisted'
        ? 'waitlist'
        : 'direct';

      const now = new Date();
      transaction.update(participantRef, {
        status: nextStatus,
        reason: nextReason,
        paymentStatus: 'completed',
        updatedAt: now,
      });
      transaction.set(
        commitmentRef,
        { status: nextStatus, reason: nextReason, paymentStatus: 'completed', updatedAt: now },
        { merge: true }
      );
      transaction.update(eventRef, {
        ...counterDeltaFor(previousStatus, nextStatus),
        updatedAt: now,
      });
    });
  },

  async getEventParticipants(eventId: string, status?: AttendeeStatus): Promise<Attendee[]> {
    const base = collection(db, 'events', eventId, 'participants');
    const snapshot = await getDocs(status ? query(base, where('status', '==', status)) : query(base));

    return snapshot.docs
      .map((snap) => {
        const data = snap.data() as any;
        return { ...data, uid: snap.id, status: normalizeStatus(data.status) } as Attendee;
      })
      .sort((a, b) => dateToMillis(a.joinedAt) - dateToMillis(b.joinedAt));
  },

  /** Live participant list, used by the organizer's attendee-management screen. */
  subscribeToEventParticipants(
    eventId: string,
    onChange: (participants: Attendee[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    return onSnapshot(
      collection(db, 'events', eventId, 'participants'),
      (snapshot) => {
        const participants = snapshot.docs
          .map((snap) => {
            const data = snap.data() as any;
            return { ...data, uid: snap.id, status: normalizeStatus(data.status) } as Attendee;
          })
          .sort((a, b) => dateToMillis(a.joinedAt) - dateToMillis(b.joinedAt));
        onChange(participants);
      },
      (error) => onError?.(error)
    );
  },

  async getUserCommitments(): Promise<UserCommitment[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const snapshot = await getDocs(collection(db, 'users', user.uid, 'commitments'));
    return snapshot.docs.map((snap) => {
      const data = snap.data() as any;
      return { ...data, eventId: snap.id, status: normalizeStatus(data.status) } as UserCommitment;
    });
  },

  async getUserCommitment(eventId: string): Promise<UserCommitment | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const snapshot = await getDoc(doc(db, 'users', user.uid, 'commitments', eventId));
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as any;
    return { ...data, eventId, status: normalizeStatus(data.status) } as UserCommitment;
  },

  async getOrCreateConversation(otherUserId: string): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    if (otherUserId === user.uid) throw new Error('Cannot create conversation with yourself');

    const existingQuery = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid)
    );
    const existingDocs = await getDocs(existingQuery);
    const existing = existingDocs.docs.find((d) => {
      const ids = d.data().participantIds as string[];
      return ids.includes(otherUserId);
    });

    if (existing) return existing.id;

    const me = await this.getUserProfile(user.uid);
    const other = await this.getUserProfile(otherUserId);

    const conversationRef = doc(collection(db, 'conversations'));
    await setDoc(conversationRef, {
      id: conversationRef.id,
      participantIds: [user.uid, otherUserId],
      participantProfiles: {
        [user.uid]: {
          displayName: me?.displayName || user.displayName || user.email || 'User',
          photoURL: me?.photoURL || user.photoURL || null,
        },
        [otherUserId]: {
          displayName: other?.displayName || 'User',
          photoURL: other?.photoURL || null,
        },
      },
      lastMessage: '',
      lastMessageSenderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return conversationRef.id;
  },

  async getUserConversations(): Promise<ConversationSummary[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid)
    );
    const result = await getDocs(conversationsQuery);

    const conversations: ConversationSummary[] = result.docs.map((snapshot) => {
      const data = snapshot.data();
      const participantIds: string[] = data.participantIds || [];
      const otherUserId = participantIds.find((id) => id !== user.uid) || user.uid;
      const otherProfile = data.participantProfiles?.[otherUserId] || {};

      return {
        id: snapshot.id,
        participantIds,
        otherUserId,
        otherUserName: otherProfile.displayName || 'User',
        otherUserPhotoURL: otherProfile.photoURL || null,
        lastMessage: data.lastMessage || '',
        lastMessageSenderId: data.lastMessageSenderId || '',
        updatedAt: data.updatedAt,
      };
    });

    return conversations.sort((a, b) => dateToMillis(b.updatedAt) - dateToMillis(a.updatedAt));
  },

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
    if (!conversationDoc.exists()) throw new Error('Conversation not found');

    const participantIds: string[] = conversationDoc.data().participantIds || [];
    if (!participantIds.includes(user.uid)) throw new Error('Access denied');

    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const messages = await getDocs(messagesQuery);

    return messages.docs.map((snapshot) => ({
      id: snapshot.id,
      conversationId,
      ...(snapshot.data() as Omit<ChatMessage, 'id' | 'conversationId'>),
    }));
  },

  async sendMessage(conversationId: string, text: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const trimmedText = text.trim();
    if (!trimmedText) throw new Error('Message cannot be empty');

    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    if (!conversationDoc.exists()) throw new Error('Conversation not found');

    const participantIds: string[] = conversationDoc.data().participantIds || [];
    if (!participantIds.includes(user.uid)) throw new Error('Access denied');

    const messageRef = doc(collection(db, 'conversations', conversationId, 'messages'));
    await setDoc(messageRef, {
      senderId: user.uid,
      text: trimmedText,
      createdAt: new Date(),
    });

    await updateDoc(conversationRef, {
      lastMessage: trimmedText,
      lastMessageSenderId: user.uid,
      updatedAt: new Date(),
    });

    return messageRef.id;
  },

  // ---------------------------------------------------------------------------
  // Realtime chat
  // ---------------------------------------------------------------------------

  /** Live message stream for an open conversation. */
  subscribeToConversationMessages(
    conversationId: string,
    onChange: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    return onSnapshot(
      query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc')),
      (snapshot) => {
        onChange(
          snapshot.docs.map((snap) => ({
            id: snap.id,
            conversationId,
            ...(snap.data() as Omit<ChatMessage, 'id' | 'conversationId'>),
          }))
        );
      },
      (error) => onError?.(error)
    );
  },

  /** Live conversation list, so the inbox reorders as messages arrive. */
  subscribeToConversations(
    onChange: (conversations: ConversationSummary[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    return onSnapshot(
      query(collection(db, 'conversations'), where('participantIds', 'array-contains', user.uid)),
      (snapshot) => {
        const conversations: ConversationSummary[] = snapshot.docs.map((snap) => {
          const data = snap.data() as any;
          const participantIds: string[] = data.participantIds || [];
          const otherUserId = participantIds.find((id) => id !== user.uid) || user.uid;
          const otherProfile = data.participantProfiles?.[otherUserId] || {};

          return {
            id: snap.id,
            participantIds,
            otherUserId,
            otherUserName: otherProfile.displayName || 'User',
            otherUserPhotoURL: otherProfile.photoURL || null,
            lastMessage: data.lastMessage || '',
            lastMessageSenderId: data.lastMessageSenderId || '',
            updatedAt: data.updatedAt,
          };
        });

        onChange(conversations.sort((a, b) => dateToMillis(b.updatedAt) - dateToMillis(a.updatedAt)));
      },
      (error) => onError?.(error)
    );
  },

  // ---------------------------------------------------------------------------
  // Ratings
  //
  // Stored top-level in `ratings` with a deterministic id
  // (`${eventId}_${raterUid}_${rateeUid}`) so a rating can only be cast once per
  // person per event — a re-submit overwrites rather than double-counting.
  // Aggregates are recomputed from the rater's perspective and denormalised onto
  // the ratee's user document as `reputation`.
  // ---------------------------------------------------------------------------

  buildRatingId(eventId: string, raterUid: string, rateeUid: string) {
    return `${eventId}_${raterUid}_${rateeUid}`;
  },

  /** Writes one batch of ratings and refreshes each ratee's reputation summary. */
  async submitRatings(
    eventId: string,
    entries: {
      rateeUid: string;
      rateeRole: 'organizer' | 'attendee';
      qualityId: string;
      qualityLabel: string;
      qualityEmoji: string;
      stars?: number;
      comment?: string;
    }[]
  ) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    if (entries.length === 0) return;

    const eventSnap = await getDoc(doc(db, 'events', eventId));
    const eventTitle = eventSnap.exists() ? (eventSnap.data() as any).title : undefined;

    await Promise.all(
      entries.map((entry) => {
        const id = this.buildRatingId(eventId, user.uid, entry.rateeUid);
        const rating: Rating = {
          id,
          eventId,
          eventTitle,
          raterUid: user.uid,
          rateeUid: entry.rateeUid,
          rateeRole: entry.rateeRole,
          qualityId: entry.qualityId,
          qualityLabel: entry.qualityLabel,
          qualityEmoji: entry.qualityEmoji,
          stars: entry.stars,
          comment: entry.comment?.trim() || '',
          createdAt: new Date(),
        };
        return setDoc(doc(db, 'ratings', id), rating);
      })
    );

    // Mark the event rated for this user so the prompt stops reappearing.
    await setDoc(
      doc(db, 'users', user.uid, 'ratedEvents', eventId),
      { eventId, ratedAt: new Date() },
      { merge: true }
    );

  },

  /**
   * Derives a user's reputation from the ratings they have received.
   *
   * Computed on read rather than denormalised onto the user document on write.
   * Denormalising would require the *rater* to write to the *ratee's* user doc,
   * which can only be permitted by a security rule loose enough to let anyone
   * forge someone else's reputation. Aggregating here keeps `users/{uid}`
   * writable by its owner alone, and the query is a single indexed lookup.
   */
  async getReputation(uid: string): Promise<ReputationSummary> {
    const snapshot = await getDocs(query(collection(db, 'ratings'), where('rateeUid', '==', uid)));

    const qualityCounts: Record<string, number> = {};
    let starTotal = 0;
    let starCount = 0;

    snapshot.docs.forEach((snap) => {
      const data = snap.data() as Rating;
      const key = data.qualityLabel || data.qualityId || 'unknown';
      qualityCounts[key] = (qualityCounts[key] || 0) + 1;
      if (typeof data.stars === 'number' && data.stars > 0) {
        starTotal += data.stars;
        starCount += 1;
      }
    });

    return {
      ratingCount: snapshot.size,
      averageStars: starCount > 0 ? Number((starTotal / starCount).toFixed(2)) : 0,
      qualityCounts,
    };
  },

  async getUserRatings(uid: string): Promise<Rating[]> {
    const snapshot = await getDocs(query(collection(db, 'ratings'), where('rateeUid', '==', uid)));
    return snapshot.docs
      .map((snap) => snap.data() as Rating)
      .sort((a, b) => dateToMillis(b.createdAt) - dateToMillis(a.createdAt));
  },

  async hasRatedEvent(eventId: string): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;
    const snapshot = await getDoc(doc(db, 'users', user.uid, 'ratedEvents', eventId));
    return snapshot.exists();
  },

  /**
   * Events that have finished, that the user actually took part in (as confirmed
   * attendee or as organizer), and that they have not rated yet.
   */
  async getEventsAwaitingRating(): Promise<
    { event: any; role: 'organizer' | 'attendee' }[]
  > {
    const user = auth.currentUser;
    if (!user) return [];

    const [commitments, createdEvents, ratedSnapshot] = await Promise.all([
      this.getUserCommitments(),
      this.getCurrentUserCreatedEvents(100),
      getDocs(collection(db, 'users', user.uid, 'ratedEvents')),
    ]);

    const ratedIds = new Set(ratedSnapshot.docs.map((snap) => snap.id));

    const attendedIds = commitments
      .filter((commitment) => commitment.status === 'confirmed')
      .map((commitment) => String(commitment.eventId))
      .filter((id) => !ratedIds.has(id));

    const attended = (await Promise.all(attendedIds.map((id) => this.getEvent(id))))
      .filter(Boolean)
      .filter((event) => hasEventEnded(event))
      .map((event) => ({ event, role: 'attendee' as const }));

    const hosted = (createdEvents as any[])
      .filter((event) => event && !ratedIds.has(String(event.id)))
      .filter((event) => hasEventEnded(event))
      .map((event) => ({ event, role: 'organizer' as const }));

    return [...hosted, ...attended];
  },

  // ---------------------------------------------------------------------------
  // Safety: reporting and blocking
  // ---------------------------------------------------------------------------

  /**
   * Files a report about an event or a person.
   *
   * Reports are write-only from the client: a reporter can create one but
   * nobody can read them back through the app, so a reported user cannot see
   * who reported them.
   */
  async reportContent(input: {
    targetType: 'event' | 'user' | 'message';
    targetId: string;
    reason: string;
    details?: string;
  }) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    if (input.targetId === user.uid) throw new Error('You cannot report yourself');

    const reportRef = doc(collection(db, 'reports'));
    await setDoc(reportRef, {
      id: reportRef.id,
      reporterUid: user.uid,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details?.trim() || '',
      status: 'open',
      createdAt: new Date(),
    });

    return reportRef.id;
  },

  /** Blocks a user: they disappear from your feed and cannot message you. */
  async blockUser(targetUid: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    if (targetUid === user.uid) throw new Error('You cannot block yourself');

    await setDoc(doc(db, 'users', user.uid, 'blocked', targetUid), {
      uid: targetUid,
      blockedAt: new Date(),
    });
  },

  async unblockUser(targetUid: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'blocked', targetUid));
  },

  async getBlockedUserIds(): Promise<string[]> {
    const user = auth.currentUser;
    if (!user) return [];
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'blocked'));
    return snapshot.docs.map((snap) => snap.id);
  },

  // ---------------------------------------------------------------------------
  // Account deletion
  //
  // GDPR gives a user the right to erasure, so this has to remove their data,
  // not just their login. Deleting the auth account alone would leave orphaned
  // documents referencing a uid that no longer resolves to anyone.
  // ---------------------------------------------------------------------------

  /** Everything about the current user, erased. Irreversible. */
  async deleteAccountAndData(onStep?: (step: string) => void) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    const uid = user.uid;

    const step = (label: string) => onStep?.(label);

    // 1. Cancel every event they host so attendees are told, then remove it.
    step('Cancelling your events');
    const hosted = (await this.getEvents({ organizerId: uid })) as any[];
    for (const event of hosted) {
      try {
        if (event.status !== 'cancelled' && !hasEventEnded(event)) {
          await this.cancelEvent(String(event.id), 'The organizer deleted their account');
        }
        // Participant rows live under the event, so clear them before the event.
        const participants = await this.getEventParticipants(String(event.id));
        await Promise.all(
          participants.map((participant) =>
            deleteDoc(doc(db, 'events', String(event.id), 'participants', participant.uid)).catch(
              () => undefined
            )
          )
        );
        await deleteDoc(doc(db, 'events', String(event.id)));
      } catch (error) {
        console.warn(`Could not fully remove event ${event.id}:`, error);
      }
    }

    // 2. Withdraw from events they joined, so counters stay correct.
    step('Leaving events you joined');
    const commitments = await this.getUserCommitments().catch(() => []);
    for (const commitment of commitments) {
      await this.leaveEvent(String(commitment.eventId)).catch(() => undefined);
    }

    // 3. Ratings they wrote and ratings about them. Both identify the person.
    step('Removing ratings');
    const [written, received] = await Promise.all([
      getDocs(query(collection(db, 'ratings'), where('raterUid', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'ratings'), where('rateeUid', '==', uid))).catch(() => null),
    ]);
    await Promise.all(
      [...(written?.docs || []), ...(received?.docs || [])].map((snap) =>
        deleteDoc(snap.ref).catch(() => undefined)
      )
    );

    // 4. Conversations and their messages.
    step('Removing your messages');
    const conversations = await getDocs(
      query(collection(db, 'conversations'), where('participantIds', 'array-contains', uid))
    ).catch(() => null);

    for (const conversation of conversations?.docs || []) {
      try {
        const messages = await getDocs(
          collection(db, 'conversations', conversation.id, 'messages')
        );
        await Promise.all(messages.docs.map((snap) => deleteDoc(snap.ref).catch(() => undefined)));
        await deleteDoc(conversation.ref);
      } catch (error) {
        console.warn(`Could not remove conversation ${conversation.id}:`, error);
      }
    }

    // 5. Uploaded files.
    step('Deleting uploaded files');
    for (const prefix of [`avatars/${uid}`, `events/${uid}`, `audio/${uid}`]) {
      try {
        const listing = await listAll(storageRef(storage, prefix));
        await Promise.all(listing.items.map((item) => deleteObject(item).catch(() => undefined)));
      } catch (error) {
        console.warn(`Could not clear ${prefix}:`, error);
      }
    }

    // 6. The profile document and its sub-collections.
    step('Removing your profile');
    for (const sub of ['favorites', 'commitments', 'createdEvents', 'ratedEvents', 'blocked', 'joinedEvents']) {
      try {
        const snapshot = await getDocs(collection(db, 'users', uid, sub));
        await Promise.all(snapshot.docs.map((snap) => deleteDoc(snap.ref).catch(() => undefined)));
      } catch {
        // Sub-collection may not exist; nothing to clear.
      }
    }
    await deleteDoc(doc(db, 'users', uid)).catch(() => undefined);

    // 7. Finally the login itself. Needs a recent sign-in, which is why the UI
    //    asks for the password first.
    step('Closing your account');
    await authService.deleteAuthAccount();
  },

  async recordPayment(eventId: string, amount: number, method: 'stripe' | 'card' | 'paypal', status: 'pending' | 'completed' = 'completed') {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const paymentRef = doc(collection(db, 'payments'));
    await setDoc(paymentRef, {
      id: paymentRef.id,
      eventId,
      payerUid: user.uid,
      amount,
      method,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return paymentRef.id;
  },
};

/**
 * The data layer screens talk to.
 *
 * In demo mode this is an in-memory implementation with a seeded user, so the
 * whole app is explorable without an account or a live database. Everywhere
 * else it is the Firestore-backed service above.
 */
export const dataService: typeof firestoreDataService = DEMO_MODE
  ? ({ ...firestoreDataService, ...demoService } as unknown as typeof firestoreDataService)
  : firestoreDataService;
