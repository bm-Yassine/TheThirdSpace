

// backend/firebase.ts
import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
// 'firebase/auth/react-native' can be missing type declarations in some setups (TS); require dynamically and type as any
let getReactNativePersistence: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getReactNativePersistence = require('firebase/auth/react-native').getReactNativePersistence;
} catch (e) {
  getReactNativePersistence = undefined;
}
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: move these to app.config.(ts).extra and read via expo-constants
const firebaseConfig = {
  apiKey:        'YOUR_API_KEY',
  authDomain:    'YOUR_PROJECT.firebaseapp.com',
  projectId:     'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId:         'YOUR_APP_ID',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

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

