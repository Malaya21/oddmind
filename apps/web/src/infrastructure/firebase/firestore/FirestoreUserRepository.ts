import type { DocumentData } from "firebase-admin/firestore";
import type { User, StatsDelta } from "@/types";
import type { UserRepository } from "@/repositories/UserRepository";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const USERS_COLLECTION = "users";

function mapUserDoc(uid: string, data: DocumentData): User {
  return {
    uid,
    displayName: data.displayName ?? undefined,
    createdAt: data.createdAt as string,
    lastSeenAt: data.lastSeenAt as string,
    stats: data.stats as User["stats"],
  };
}

export class FirestoreUserRepository implements UserRepository {
  async upsertUser(user: User): Promise<void> {
    await getAdminFirestore()
      .collection(USERS_COLLECTION)
      .doc(user.uid)
      .set(
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
    const snapshot = await getAdminFirestore()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    return mapUserDoc(uid, snapshot.data()!);
  }

  async updateStats(uid: string, delta: StatsDelta): Promise<void> {
    const updates: Record<string, FieldValue | number> = {};

    if (delta.gamesPlayed !== undefined) {
      updates["stats.gamesPlayed"] = FieldValue.increment(delta.gamesPlayed);
    }
    if (delta.gamesWon !== undefined) {
      updates["stats.gamesWon"] = FieldValue.increment(delta.gamesWon);
    }
    if (delta.totalScore !== undefined) {
      updates["stats.totalScore"] = FieldValue.increment(delta.totalScore);
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    await getAdminFirestore()
      .collection(USERS_COLLECTION)
      .doc(uid)
      .update(updates);
  }
}
