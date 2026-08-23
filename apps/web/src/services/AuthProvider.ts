import type { AuthUser, Unsubscribe } from "@/types";

export interface AuthProvider {
  signInAnonymously(): Promise<AuthUser>;
  signInWithEmail?(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  getIdToken(): Promise<string | null>;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): Unsubscribe;
}
