import { type FirebaseApp, initializeApp } from 'firebase/app';
import { type Auth, getAuth } from 'firebase/auth';

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (cachedApp !== null) return cachedApp;

  cachedApp = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });

  return cachedApp;
};

/** Firebase Authentication インスタンスを取得する (issue #194 のバックアップ用メール認証で利用)。 */
export const getFirebaseAuth = (): Auth => {
  if (cachedAuth !== null) return cachedAuth;
  cachedAuth = getAuth(getFirebaseApp());
  return cachedAuth;
};
