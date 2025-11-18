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

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDeExkfYP6q-4x2levBqNzvpYkHGC44X1Y",
  authDomain: "thirdspace-8092b.firebaseapp.com",
  projectId: "thirdspace-8092b",
  storageBucket: "thirdspace-8092b.firebasestorage.app",
  messagingSenderId: "258758943296",
  appId: "1:258758943296:web:ea21ab65e4fc01aa52b5a5",
  measurementId: "G-TP70FQ8CVT"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Analytics is web-only, skip in React Native
// const analytics = Platform.OS === 'web' ? getAnalytics(app) : null;

// Proper RN persistence (web uses IndexedDB automatically)
let auth: Auth;
if (Platform.OS === 'web') {
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
    await setDoc(userRef, profile);
    return profile;
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
    return null;
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

  // User commitments
  async commitToEvent(eventId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const commitmentRef = doc(db, 'users', user.uid, 'commitments', eventId);
    await setDoc(commitmentRef, {
      eventId,
      status: 'pending',
      committedAt: new Date()
    });
  },

  async getUserCommitments() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const commitmentsQuery = query(collection(db, 'users', user.uid, 'commitments'));
    const querySnapshot = await getDocs(commitmentsQuery);
    return querySnapshot.docs.map(doc => ({ eventId: doc.id, ...doc.data() }));
  }
};
