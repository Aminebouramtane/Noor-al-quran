import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isPlaceholder = (value?: string) => {
  if (!value) return true;
  const v = value.toLowerCase();
  return (
    v.includes('your_') ||
    v.includes('demo') ||
    v.includes('example')
  );
};

export const isFirebaseConfigured =
  !!firebaseConfig.apiKey &&
  firebaseConfig.apiKey.startsWith('AIza') &&
  !isPlaceholder(firebaseConfig.apiKey) &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.appId;

export const firebaseConfigError = isFirebaseConfigured
  ? null
  : 'Firebase config is missing or invalid. Please set valid VITE_FIREBASE_* values in .env.local';

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

// Initialize Firebase Authentication
export const auth: Auth | null = app ? getAuth(app) : null;

// Initialize Cloud Firestore
export const db: Firestore | null = app ? getFirestore(app) : null;

export default app;
