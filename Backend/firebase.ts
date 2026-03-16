// backend/firebase.ts
import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged, type User } from 'firebase/auth';
// 'firebase/auth/react-native' can be missing type declarations in some setups (TS); require dynamically and type as any
let getReactNativePersistence: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getReactNativePersistence = require('firebase/auth/react-native').getReactNativePersistence;
} catch (e) {
  getReactNativePersistence = undefined;
}
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, type DocumentData } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockEvents } from '../lib/events';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDeExkfYP6q-4x2levBqNzvpYkHGC44X1Y',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'thirdspace-8092b.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'thirdspace-8092b',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'thirdspace-8092b.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '258758943296',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:258758943296:web:ea21ab65e4fc01aa52b5a5',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-TP70FQ8CVT',
  WebClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID || '258758943296-p4o6gvj7l0f178o8tcf7549qkkiggif1.apps.googleusercontent.com'
};

export const googleClientIds = {
  webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID || firebaseConfig.WebClientId,
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
    
    // Create user profile in Firestore
    if (userCredential.user) {
      await dataService.createUserProfile(userCredential.user.uid, {
        email: userCredential.user.email || email,
        displayName: displayName || 'User',
        photoURL: userCredential.user.photoURL || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
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
  }
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

export interface UserCommitment {
  eventId: string;
  status: 'pending' | 'approved';
  committedAt: Date | any;
  reason?: 'approval' | 'waitlist' | 'direct';
  paymentStatus?: 'pending' | 'completed';
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

const toOrganizerUid = (organizerName?: string | null) => {
  const normalized = (organizerName || 'organizer')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `mock-organizer-${normalized || 'user'}`;
};

const getMockEventById = (eventId: string) => {
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
export const dataService = {
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
    const existing = await this.getUserProfile(user.uid);
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
    const eventWithMeta = {
      ...eventData,
      id: eventRef.id,
      createdBy: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(eventRef, eventWithMeta);

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
    let q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));

    if (filters?.organizerId) {
      q = query(q, where('createdBy', '==', filters.organizerId));
    }

    if (filters?.limit) {
      q = query(q, limit(filters.limit));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getEvent(eventId: string) {
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (eventDoc.exists()) {
      return { id: eventDoc.id, ...eventDoc.data() };
    }

    return getMockEventById(eventId);
  },

  async updateEvent(eventId: string, updates: Partial<DocumentData>) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      ...updates,
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

  // User commitments
  async commitToEvent(eventId: string, options?: { paymentCompleted?: boolean }) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    // Get user profile to add their info to the event
    let userProfile = await this.getUserProfile(user.uid);
    if (!userProfile) {
      userProfile = await this.ensureUserProfileFromAuthUser(user);
    }
    if (!userProfile) throw new Error('User profile not found');

    // Get the event first to determine approval/waitlist status
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);
    const mockEvent = !eventDoc.exists() ? getMockEventById(eventId) : null;
    if (!eventDoc.exists() && !mockEvent) throw new Error('Event not found');

    const eventData: any = eventDoc.exists() ? eventDoc.data() : mockEvent;
    if (!eventData) throw new Error('Event not found');
    const currentAttendees = eventData.attendees || 0;
    const maxAttendees = eventData.maxAttendees || 0;
    const isFull = maxAttendees > 0 && currentAttendees >= maxAttendees;
    const requiresApproval = !!eventData.requiresApproval;

    const status: UserCommitment['status'] = requiresApproval || isFull ? 'pending' : 'approved';
    const reason: UserCommitment['reason'] = requiresApproval
      ? 'approval'
      : isFull
      ? 'waitlist'
      : 'direct';

    // Add/update user's commitment
    const commitmentRef = doc(db, 'users', user.uid, 'commitments', eventId);
    await setDoc(commitmentRef, {
      eventId,
      status,
      reason,
      paymentStatus: options?.paymentCompleted ? 'completed' : 'pending',
      committedAt: new Date(),
    });

    // Only auto-confirm attendees if approved immediately
    if (status === 'approved' && eventDoc.exists()) {
      const attendeesList = eventData.attendeesList || [];

      // Check if user is already in the attendees list
      const alreadyAttending = attendeesList.some((a: any) => a.uid === user.uid);

      if (!alreadyAttending) {
        // Add user to attendees list
        const newAttendee = {
          uid: user.uid,
          name: userProfile.displayName,
          photoURL: userProfile.photoURL,
          joinedAt: new Date(),
          status: 'confirmed'
        };
        
        attendeesList.push(newAttendee);
        
        // Update the event
        await updateDoc(eventRef, {
          attendees: currentAttendees + 1,
          attendeesList: attendeesList,
          updatedAt: new Date(),
        });
      }
    }

    // Best-effort stats update for joined events
    const profile = await this.getUserProfile(user.uid);
    if (profile) {
      await this.updateUserProfile(user.uid, {
        stats: {
          ...profile.stats,
          eventsJoined: (profile.stats?.eventsJoined || 0) + 1,
        },
      });
    }

    return { status, reason };
  },

  async getUserCommitments() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const commitmentsQuery = query(collection(db, 'users', user.uid, 'commitments'));
    const querySnapshot = await getDocs(commitmentsQuery);
    return querySnapshot.docs.map(doc => ({ eventId: doc.id, ...doc.data() }));
  },

  async getUserCommitment(eventId: string): Promise<UserCommitment | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const commitmentDoc = await getDoc(doc(db, 'users', user.uid, 'commitments', eventId));
    if (!commitmentDoc.exists()) return null;
    return commitmentDoc.data() as UserCommitment;
  },

  async cancelCommitment(eventId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const commitmentRef = doc(db, 'users', user.uid, 'commitments', eventId);
    const commitmentDoc = await getDoc(commitmentRef);
    if (!commitmentDoc.exists()) return;

    const commitment = commitmentDoc.data() as UserCommitment;
    await deleteDoc(commitmentRef);

    // If they had a confirmed spot, remove from event attendees
    if (commitment.status === 'approved') {
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        const attendeesList = (eventData.attendeesList || []).filter((a: any) => a.uid !== user.uid);
        await updateDoc(eventRef, {
          attendees: Math.max((eventData.attendees || 1) - 1, 0),
          attendeesList,
          updatedAt: new Date(),
        });
      }
    }
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
