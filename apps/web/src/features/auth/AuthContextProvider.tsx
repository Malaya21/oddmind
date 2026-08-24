"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, User } from "@/types";
import type { AuthProvider } from "@/services/AuthProvider";
import { createFirebaseAuthProvider } from "@/infrastructure/firebase/auth/FirebaseAuthProvider";
import { getClientUserService } from "@/features/auth/useClientUserService";
import { generateDisplayName } from "@/domain/player/DisplayNameGenerator";
import { OddMindError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

interface AuthContextValue {
  user: AuthUser | null;
  profile: User | null;
  loading: boolean;
  profileLoading: boolean;
  error: string | null;
  signInAsGuest: () => Promise<AuthUser>;
  signInWithGoogle: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  updateDisplayName: (displayName: string) => Promise<User>;
  regenerateDisplayName: () => Promise<User>;
  refreshProfile: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthContextProviderProps {
  children: ReactNode;
  authProvider?: AuthProvider;
}

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof OddMindError || err instanceof ValidationError) {
    return err.message;
  }
  if (err instanceof Error) {
    if (err.message.includes("Missing or insufficient permissions")) {
      return "Firestore permission denied. Deploy firestore.rules and enable Anonymous Auth.";
    }
    if (err.message.includes("auth/admin-restricted-operation")) {
      return "Enable Anonymous sign-in in Firebase Console → Authentication.";
    }
    return err.message;
  }
  return fallback;
}

export function AuthContextProvider({
  children,
  authProvider: authProviderProp,
}: AuthContextProviderProps) {
  const authProvider = useMemo(
    () => authProviderProp ?? createFirebaseAuthProvider(),
    [authProviderProp],
  );
  const userService = useMemo(() => getClientUserService(), []);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signingInRef = useRef(false);

  const loadProfile = useCallback(
    async (authUser: AuthUser): Promise<User | null> => {
      // 1. Instantly set cached or generated profile so UI is NEVER blocked
      let cachedName: string | null = null;
      if (typeof window !== "undefined") {
        cachedName = localStorage.getItem(`oddmind_name_${authUser.uid}`);
      }
      const initialName = cachedName || generateDisplayName();
      const now = new Date().toISOString();
      const fallbackProfile: User = {
        uid: authUser.uid,
        displayName: initialName,
        createdAt: now,
        lastSeenAt: now,
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          totalScore: 0,
        },
      };

      setProfile((current) => current ?? fallbackProfile);
      setLoading(false);

      // 2. Synchronize with Firestore in background
      setProfileLoading(true);
      setError(null);

      try {
        const nextProfile = await userService.ensureUser(authUser.uid);
        setProfile(nextProfile);
        if (typeof window !== "undefined" && nextProfile.displayName) {
          localStorage.setItem(`oddmind_name_${authUser.uid}`, nextProfile.displayName);
        }
        logger.info("auth.profile.ready", { uid: authUser.uid });
        return nextProfile;
      } catch (err) {
        console.warn("[auth.profile.fallback_used]", err);
        return fallbackProfile;
      } finally {
        setProfileLoading(false);
      }
    },
    [userService],
  );

  useEffect(() => {
    let cancelled = false;

    // Safety timeout: if auth takes more than 3.5 seconds, unblock UI
    const timer = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
      }
    }, 3500);

    const unsubscribe = authProvider.onAuthStateChanged(async (nextUser) => {
      if (cancelled) {
        return;
      }

      if (!nextUser) {
        if (signingInRef.current) {
          return;
        }

        signingInRef.current = true;
        setUser(null);
        setProfile(null);

        try {
          logger.info("auth.sign_in_anonymous.start");
          await authProvider.signInAnonymously();
        } catch (err) {
          signingInRef.current = false;
          const message = toErrorMessage(err, "Anonymous sign-in failed.");
          setError(message);
          setLoading(false);
          logger.error("auth.sign_in_anonymous.error", { message });
        }
        return;
      }

      signingInRef.current = false;
      setUser(nextUser);
      await loadProfile(nextUser);
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [authProvider, loadProfile]);

  const signInAsGuest = useCallback(async () => {
    const nextUser = await authProvider.signInAnonymously();
    logger.info("auth.sign_in_anonymous", { uid: nextUser.uid });
    return nextUser;
  }, [authProvider]);

  const signInWithGoogle = useCallback(async () => {
    if (!authProvider.signInWithGoogle) {
      throw new OddMindError("UNSUPPORTED", "Google sign-in not supported on this provider", 400);
    }
    const nextUser = await authProvider.signInWithGoogle();
    logger.info("auth.sign_in_google", { uid: nextUser.uid, email: nextUser.email ?? undefined });
    setUser(nextUser);
    await loadProfile(nextUser);
    return nextUser;
  }, [authProvider, loadProfile]);

  const signOut = useCallback(async () => {
    await authProvider.signOut();
    setUser(null);
    setProfile(null);
    logger.info("auth.sign_out");
  }, [authProvider]);

  const getIdToken = useCallback(() => authProvider.getIdToken(), [authProvider]);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      const currentUser = authProvider.getCurrentUser();
      if (!currentUser) {
        throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
      }
      const updated = await userService.updateDisplayName(
        currentUser.uid,
        displayName,
      );
      setProfile(updated);
      return updated;
    },
    [authProvider, userService],
  );

  const regenerateDisplayName = useCallback(async () => {
    const currentUser = authProvider.getCurrentUser();
    if (!currentUser) {
      throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
    }
    const updated = await userService.regenerateDisplayName(currentUser.uid);
    setProfile(updated);
    return updated;
  }, [authProvider, userService]);

  const refreshProfile = useCallback(async () => {
    const currentUser = authProvider.getCurrentUser();
    if (!currentUser) {
      return null;
    }
    return loadProfile(currentUser);
  }, [authProvider, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      error,
      signInAsGuest,
      signInWithGoogle,
      signOut,
      getIdToken,
      updateDisplayName,
      regenerateDisplayName,
      refreshProfile,
    }),
    [
      user,
      profile,
      loading,
      profileLoading,
      error,
      signInAsGuest,
      signInWithGoogle,
      signOut,
      getIdToken,
      updateDisplayName,
      regenerateDisplayName,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthContextProvider");
  }
  return context;
}
