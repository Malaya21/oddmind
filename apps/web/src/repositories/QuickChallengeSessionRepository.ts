import type {
  QuickChallengeSession,
  QuickPlaySession,
} from "@/types/quick-challenge";
import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import type {
  CollectionReference,
  DocumentData,
} from "firebase-admin/firestore";

export interface IQuickChallengeSessionRepository {
  createSession(session: QuickChallengeSession): Promise<void>;
  getSession(sessionId: string): Promise<QuickChallengeSession | null>;
  updateSession(session: QuickChallengeSession): Promise<void>;
  getActiveSessionForUserAndChallenge(
    userId: string,
    challengeId: string,
  ): Promise<QuickChallengeSession | null>;

  createQuickPlaySession(session: QuickPlaySession): Promise<void>;
  getQuickPlaySession(playId: string): Promise<QuickPlaySession | null>;
  updateQuickPlaySession(session: QuickPlaySession): Promise<void>;
}

export class FirestoreQuickChallengeSessionRepository
  implements IQuickChallengeSessionRepository
{
  private get sessionCollection(): CollectionReference<DocumentData> {
    return getAdminFirestore().collection("quickChallengeSessions");
  }

  private get quickPlayCollection(): CollectionReference<DocumentData> {
    return getAdminFirestore().collection("quickPlaySessions");
  }

  async createSession(session: QuickChallengeSession): Promise<void> {
    const clean = JSON.parse(JSON.stringify(session));
    await this.sessionCollection.doc(session.sessionId).set(clean);
  }

  async getSession(sessionId: string): Promise<QuickChallengeSession | null> {
    const snap = await this.sessionCollection.doc(sessionId).get();
    if (!snap.exists) return null;
    return snap.data() as QuickChallengeSession;
  }

  async updateSession(session: QuickChallengeSession): Promise<void> {
    const clean = JSON.parse(JSON.stringify(session));
    await this.sessionCollection.doc(session.sessionId).set(clean, { merge: true });
  }

  async getActiveSessionForUserAndChallenge(
    userId: string,
    challengeId: string,
  ): Promise<QuickChallengeSession | null> {
    const snap = await this.sessionCollection
      .where("userId", "==", userId)
      .where("challengeId", "==", challengeId)
      .limit(10)
      .get();

    if (snap.empty) return null;
    const activeDoc = snap.docs.find((doc) => {
      const data = doc.data() as QuickChallengeSession;
      return data.state !== "SUBMITTED";
    });

    return activeDoc ? (activeDoc.data() as QuickChallengeSession) : null;
  }

  async createQuickPlaySession(session: QuickPlaySession): Promise<void> {
    const clean = JSON.parse(JSON.stringify(session));
    await this.quickPlayCollection.doc(session.playId).set(clean);
  }

  async getQuickPlaySession(playId: string): Promise<QuickPlaySession | null> {
    const snap = await this.quickPlayCollection.doc(playId).get();
    if (!snap.exists) return null;
    return snap.data() as QuickPlaySession;
  }

  async updateQuickPlaySession(session: QuickPlaySession): Promise<void> {
    const clean = JSON.parse(JSON.stringify(session));
    await this.quickPlayCollection.doc(session.playId).set(clean, { merge: true });
  }
}

export class InMemoryQuickChallengeSessionRepository
  implements IQuickChallengeSessionRepository
{
  private sessions: Map<string, QuickChallengeSession> = new Map();
  private quickPlays: Map<string, QuickPlaySession> = new Map();

  async createSession(session: QuickChallengeSession): Promise<void> {
    this.sessions.set(session.sessionId, JSON.parse(JSON.stringify(session)));
  }

  async getSession(sessionId: string): Promise<QuickChallengeSession | null> {
    const s = this.sessions.get(sessionId);
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  async updateSession(session: QuickChallengeSession): Promise<void> {
    this.sessions.set(session.sessionId, JSON.parse(JSON.stringify(session)));
  }

  async getActiveSessionForUserAndChallenge(
    userId: string,
    challengeId: string,
  ): Promise<QuickChallengeSession | null> {
    for (const s of this.sessions.values()) {
      if (s.userId === userId && s.challengeId === challengeId && s.state !== "SUBMITTED") {
        return JSON.parse(JSON.stringify(s));
      }
    }
    return null;
  }

  async createQuickPlaySession(session: QuickPlaySession): Promise<void> {
    this.quickPlays.set(session.playId, JSON.parse(JSON.stringify(session)));
  }

  async getQuickPlaySession(playId: string): Promise<QuickPlaySession | null> {
    const p = this.quickPlays.get(playId);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  async updateQuickPlaySession(session: QuickPlaySession): Promise<void> {
    this.quickPlays.set(session.playId, JSON.parse(JSON.stringify(session)));
  }
}
