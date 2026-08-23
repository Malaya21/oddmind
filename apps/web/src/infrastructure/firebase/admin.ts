import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getDatabase, type Database } from "firebase-admin/database";
import { getServerEnv } from "@/lib/env";

let adminApp: App | undefined;
let adminAuth: Auth | undefined;
let adminFirestore: Firestore | undefined;
let adminDatabase: Database | undefined;

function getAdminApp(): App {
  if (!adminApp) {
    adminApp = getApps().length
      ? getApps()[0]!
      : initializeApp({
          credential: cert({
            projectId: getServerEnv("FIREBASE_PROJECT_ID"),
            clientEmail: getServerEnv("FIREBASE_CLIENT_EMAIL"),
            privateKey: getServerEnv("FIREBASE_PRIVATE_KEY").replace(
              /\\n/g,
              "\n",
            ),
          }),
          databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        });
  }
  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    adminFirestore = getFirestore(getAdminApp());
  }
  return adminFirestore;
}

export function getAdminDatabase(): Database {
  if (!adminDatabase) {
    adminDatabase = getDatabase(getAdminApp());
  }
  return adminDatabase;
}
