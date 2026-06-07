import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, query, where, orderBy, limit, type QueryConstraint, type QuerySnapshot, type DocumentData } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

export { collection, doc, onSnapshot, query, where, orderBy, limit };
export type { QueryConstraint, QuerySnapshot, DocumentData };
