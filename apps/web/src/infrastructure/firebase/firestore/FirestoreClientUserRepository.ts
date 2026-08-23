"use client";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import type { User, StatsDelta } from "@/types";
import type { UserRepository } from "@/repositories/UserRepository";
import { getFirebaseFirestore } from "@/infrastructure/firebase/client";

const USERS_COLLECTION = "users";

function mapUserDoc(uid: string, data: Record<string, unknown>): User {
  return {
    uid,
    displayName: (data.displayName as string | null | undefined) ?? undefined,
    createdAt: data.createdAt as string,
    lastSeenAt: data.lastSeenAt as string,
    stats: data.stats as User["stats"],
  };
}

export class FirestoreClientUserRepository implements UserRepository {
  async upsertUser(user: User): Promise<void> {
    await setDoc(
      doc(getFirebaseFirestore(), USERS_COLLECTION, user.uid),
      {
        displayName: user.displayName ?? null,
        createdAt: user.createdAt,
        lastSeenAt: user.lastSeenAt,
        stats: user.stats ?? {
          gamesPlayed: 0,
          gamesWon: 0,
          totalScore: 0,
        },
      },
      { merge: true },
    );
  }

  async getUser(uid: string): Promise<User | null> {
    const snapshot = await getDoc(
      doc(getFirebaseFirestore(), USERS_COLLECTION, uid),
    );

    if (!snapshot.exists()) {
      return null;
    }

    return mapUserDoc(uid, snapshot.data());
  }

  async updateStats(uid: string, delta: StatsDelta): Promise<void> {
    const updates: Record<string, ReturnType<typeof increment>> = {};

    if (delta.gamesPlayed !== undefined) {
      updates["stats.gamesPlayed"] = increment(delta.gamesPlayed);
    }
    if (delta.gamesWon !== undefined) {
      updates["stats.gamesWon"] = increment(delta.gamesWon);
    }
    if (delta.totalScore !== undefined) {
      updates["stats.totalScore"] = increment(delta.totalScore);
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    await updateDoc(doc(getFirebaseFirestore(), USERS_COLLECTION, uid), updates);
  }
}

export function createFirestoreClientUserRepository(): UserRepository {
  return new FirestoreClientUserRepository();
}
