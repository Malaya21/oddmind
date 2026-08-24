import { getAdminFirestore } from "@/infrastructure/firebase/admin";
import type { MindGridSession } from "@/types/mindgrid";

export interface IMindGridSessionRepository {
  createSession(session: MindGridSession): Promise<void>;
  getSession(sessionId: string): Promise<MindGridSession | null>;
  updateSession(session: MindGridSession): Promise<void>;
  getActiveSessionForUserAndCase(
    userId: string,
    caseId: string,
  ): Promise<MindGridSession | null>;
}

export class FirestoreMindGridSessionRepository
  implements IMindGridSessionRepository
{
  private get collection() {
    return getAdminFirestore().collection("mindgridSessions");
  }

  async createSession(session: MindGridSession): Promise<void> {
    const clean = JSON.parse(JSON.stringify(session));
    await this.collection.doc(session.sessionId).set(clean);
  }

  async getSession(sessionId: string): Promise<MindGridSession | null> {
    const snap = await this.collection.doc(sessionId).get();
    if (!snap.exists) return null;
    return snap.data() as MindGridSession;
  }

  async updateSession(session: MindGridSession): Promise<void> {
    const clean = JSON.parse(JSON.stringify(session));
    await this.collection.doc(session.sessionId).set(clean, { merge: true });
  }

  async getActiveSessionForUserAndCase(
    userId: string,
    caseId: string,
  ): Promise<MindGridSession | null> {
    const snap = await this.collection
      .where("userId", "==", userId)
      .where("caseId", "==", caseId)
      .limit(10)
      .get();

    if (snap.empty) return null;
    const activeDoc = snap.docs.find((doc) => {
      const data = doc.data() as MindGridSession;
      return data.state !== "SUBMITTED";
    });

    return activeDoc ? (activeDoc.data() as MindGridSession) : null;
  }
}

export class InMemoryMindGridSessionRepository
  implements IMindGridSessionRepository
{
  private sessions: Map<string, MindGridSession> = new Map();

  async createSession(session: MindGridSession): Promise<void> {
    this.sessions.set(session.sessionId, { ...session });
  }

  async getSession(sessionId: string): Promise<MindGridSession | null> {
    const s = this.sessions.get(sessionId);
    return s ? { ...s } : null;
  }

  async updateSession(session: MindGridSession): Promise<void> {
    this.sessions.set(session.sessionId, { ...session });
  }

  async getActiveSessionForUserAndCase(
    userId: string,
    caseId: string,
  ): Promise<MindGridSession | null> {
    for (const session of this.sessions.values()) {
      if (
        session.userId === userId &&
        session.caseId === caseId &&
        session.state !== "SUBMITTED"
      ) {
        return { ...session };
      }
    }
    return null;
  }
}

export const mindGridSessionRepository = new FirestoreMindGridSessionRepository();
