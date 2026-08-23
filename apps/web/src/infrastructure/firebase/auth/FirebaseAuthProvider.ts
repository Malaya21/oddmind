"use client";

import {
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithCustomToken as firebaseSignInWithCustomToken,
  signOut as firebaseSignOut,
} from "firebase/auth";
import type { AuthProvider } from "@/services/AuthProvider";
import type { AuthUser } from "@/types";
import { getFirebaseAuth } from "@/infrastructure/firebase/client";

function mapUser(user: import("firebase/auth").User): AuthUser {
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    email: user.email,
  };
}

let cachedIdToken: string | null = null;
let cachedUid: string | null = null;
let cachedEmail: string | null = null;

if (typeof window !== "undefined") {
  try {
    cachedIdToken = localStorage.getItem("oddmind_id_token");
    cachedUid = localStorage.getItem("oddmind_uid");
    cachedEmail = localStorage.getItem("oddmind_email");
  } catch {}
}

export class FirebaseAuthProvider implements AuthProvider {
  async signInAnonymously(): Promise<AuthUser> {
    const auth = getFirebaseAuth();
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Bypass-Tunnel-Reminder": "true" },
      });
      if (res.ok) {
        const json = await res.json();
        const customToken = json?.data?.customToken;
        const idToken = json?.data?.idToken;
        const uid = json?.data?.uid;

        if (idToken && uid) {
          cachedIdToken = idToken;
          cachedUid = uid;
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("oddmind_id_token", idToken);
              localStorage.setItem("oddmind_uid", uid);
              if (json?.data?.profile?.displayName) {
                localStorage.setItem(`oddmind_name_${uid}`, json.data.profile.displayName);
              }
            } catch {}
          }
        }

        if (customToken) {
          try {
            const credential = await firebaseSignInWithCustomToken(auth, customToken);
            return mapUser(credential.user);
          } catch (customErr) {
            console.warn("[auth.client_sign_in_warning]", customErr);
          }
        }

        if (uid) {
          return { uid, isAnonymous: true, email: cachedEmail };
        }
      }
    } catch (err) {
      console.warn("[auth.customToken.fallback]", err);
    }

    const credential = await firebaseSignInAnonymously(auth);
    return mapUser(credential.user);
  }

  async signOut(): Promise<void> {
    cachedIdToken = null;
    cachedUid = null;
    cachedEmail = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("oddmind_id_token");
        localStorage.removeItem("oddmind_uid");
        localStorage.removeItem("oddmind_email");
      } catch {}
    }
    await firebaseSignOut(getFirebaseAuth());
  }

  getCurrentUser(): AuthUser | null {
    const user = getFirebaseAuth().currentUser;
    if (user) return mapUser(user);
    if (cachedUid) {
      return { uid: cachedUid, isAnonymous: !cachedEmail, email: cachedEmail };
    }
    return null;
  }

  async getIdToken(): Promise<string | null> {
    const user = getFirebaseAuth().currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        if (token) return token;
      } catch {}
    }

    if (cachedIdToken) {
      return cachedIdToken;
    }

    try {
      await this.signInAnonymously();
      if (cachedIdToken) return cachedIdToken;
      const refreshedUser = getFirebaseAuth().currentUser;
      if (refreshedUser) return refreshedUser.getIdToken();
    } catch (err) {
      console.warn("[getIdToken error]", err);
    }

    return null;
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void) {
    if (cachedUid) {
      callback({ uid: cachedUid, isAnonymous: !cachedEmail, email: cachedEmail });
    }
    return firebaseOnAuthStateChanged(getFirebaseAuth(), (user) => {
      if (user) {
        callback(mapUser(user));
      } else if (cachedUid) {
        callback({ uid: cachedUid, isAnonymous: !cachedEmail, email: cachedEmail });
      } else {
        callback(null);
      }
    });
  }
}

export function createFirebaseAuthProvider(): AuthProvider {
  return new FirebaseAuthProvider();
}
