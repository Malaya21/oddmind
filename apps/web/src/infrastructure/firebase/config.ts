import { getClientEnv } from "@/lib/env";

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseURL: string;
}

export function getFirebaseClientConfig(): FirebaseClientConfig {
  return {
    apiKey: getClientEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: getClientEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: getClientEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: getClientEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: getClientEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: getClientEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
    databaseURL: getClientEnv("NEXT_PUBLIC_FIREBASE_DATABASE_URL"),
  };
}
