import { randomUUID } from "node:crypto";
import type {
  MindGridSession,
  MindGridPublicCase,
  PublicCaseEvidence,
  MindGridAccusation,
  MindGridCaseResult,
  MindGridUserProgress,
} from "@/types/mindgrid";
import { ICaseRepository, serverCaseRepository } from "@/server/mindgrid/ServerCaseRepository";
import {
  IMindGridSessionRepository,
  mindGridSessionRepository,
} from "@/repositories/MindGridSessionRepository";
import {
  IMindGridProgressRepository,
  mindGridProgressRepository,
} from "@/repositories/MindGridProgressRepository";
import {
  MindGridScoringService,
  mindGridScoringService,
} from "@/domain/mindgrid/MindGridScoringService";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from "@/lib/errors";

export class MindGridService {
  constructor(
    private caseRepo: ICaseRepository = serverCaseRepository,
    private sessionRepo: IMindGridSessionRepository = mindGridSessionRepository,
    private progressRepo: IMindGridProgressRepository = mindGridProgressRepository,
    private scoringService: MindGridScoringService = mindGridScoringService,
  ) {}

  async startOrResumeSession(
    userId: string,
    caseId: string,
  ): Promise<{ session: MindGridSession; publicCase: MindGridPublicCase }> {
    const fullCase = await this.caseRepo.getCase(caseId);
    if (!fullCase) {
      throw new NotFoundError("CASE_NOT_FOUND", `Case with ID ${caseId} was not found.`);
    }

    // Check for existing active session
    const existingSession = await this.sessionRepo.getActiveSessionForUserAndCase(userId, caseId);
    if (existingSession) {
      const publicCase = (await this.caseRepo.getPublicCase(
        caseId,
        existingSession.unlockedEvidenceIds,
      ))!;
      return { session: existingSession, publicCase };
    }

    // Identify initial free evidence
    const initialEvidenceIds = fullCase.evidence
      .filter((e) => e.isInitial)
      .map((e) => e.id);

    const newSession: MindGridSession = {
      sessionId: `session_${randomUUID().replace(/-/g, "").substring(0, 16)}`,
      userId,
      caseId,
      state: "INVESTIGATING",
      investigationPointsRemaining: fullCase.investigationPoints,
      unlockedEvidenceIds: initialEvidenceIds,
      hypothesis: null,
      accusation: null,
      startedAt: new Date().toISOString(),
      submittedAt: null,
      durationSec: null,
      result: null,
    };

    await this.sessionRepo.createSession(newSession);
    const publicCase = (await this.caseRepo.getPublicCase(caseId, initialEvidenceIds))!;

    return { session: newSession, publicCase };
  }

  async getSessionState(
    userId: string,
    sessionId: string,
  ): Promise<{ session: MindGridSession; publicCase: MindGridPublicCase }> {
    const session = await this.sessionRepo.getSession(sessionId);
    if (!session) {
      throw new NotFoundError("SESSION_NOT_FOUND", "MindGrid session not found.");
    }
    if (session.userId !== userId) {
      throw new ForbiddenError("You do not have access to this MindGrid session.");
    }

    const publicCase = await this.caseRepo.getPublicCase(
      session.caseId,
      session.unlockedEvidenceIds,
    );
    if (!publicCase) {
      throw new NotFoundError("CASE_NOT_FOUND", "Case associated with session not found.");
    }

    return { session, publicCase };
  }

  async unlockEvidence(
    userId: string,
    sessionId: string,
    evidenceId: string,
  ): Promise<{
    session: MindGridSession;
    unlockedEvidence: PublicCaseEvidence;
    publicCase: MindGridPublicCase;
  }> {
    const session = await this.sessionRepo.getSession(sessionId);
    if (!session) {
      throw new NotFoundError("SESSION_NOT_FOUND", "MindGrid session not found.");
    }
    if (session.userId !== userId) {
      throw new ForbiddenError("You do not have access to this MindGrid session.");
    }
    if (session.state === "SUBMITTED") {
      throw new ConflictError("SESSION_ALREADY_COMPLETED", "This case session has already been completed.");
    }

    const fullCase = await this.caseRepo.getCase(session.caseId);
    if (!fullCase) {
      throw new NotFoundError("CASE_NOT_FOUND", "Case not found.");
    }

    const targetEvidence = fullCase.evidence.find((e) => e.id === evidenceId);
    if (!targetEvidence) {
      throw new NotFoundError("EVIDENCE_NOT_FOUND", `Evidence with ID ${evidenceId} not found in this case.`);
    }

    // If already unlocked, return idempotent result without deducting points
    if (session.unlockedEvidenceIds.includes(evidenceId)) {
      const publicCase = (await this.caseRepo.getPublicCase(
        session.caseId,
        session.unlockedEvidenceIds,
      ))!;
      const publicEv = publicCase.evidenceCatalog.find((e) => e.id === evidenceId)!;
      return { session, unlockedEvidence: publicEv, publicCase };
    }

    // Check points
    if (session.investigationPointsRemaining < targetEvidence.unlockCost) {
      throw new ValidationError(
        "investigationPoints",
        `Insufficient investigation points. Required: ${targetEvidence.unlockCost}, Remaining: ${session.investigationPointsRemaining}`,
      );
    }

    const updatedUnlocked = [...session.unlockedEvidenceIds, evidenceId];
    const updatedPoints = session.investigationPointsRemaining - targetEvidence.unlockCost;

    session.unlockedEvidenceIds = updatedUnlocked;
    session.investigationPointsRemaining = updatedPoints;

    await this.sessionRepo.updateSession(session);

    const publicCase = (await this.caseRepo.getPublicCase(session.caseId, updatedUnlocked))!;
    const unlockedEv = publicCase.evidenceCatalog.find((e) => e.id === evidenceId)!;

    return { session, unlockedEvidence: unlockedEv, publicCase };
  }

  async saveHypothesis(
    userId: string,
    sessionId: string,
    hypothesisData: {
      suspectId: string;
      supportingEvidenceIds: string[];
      timelineOrder?: string[];
      notes?: string;
    },
  ): Promise<MindGridSession> {
    const session = await this.sessionRepo.getSession(sessionId);
    if (!session) {
      throw new NotFoundError("SESSION_NOT_FOUND", "Session not found.");
    }
    if (session.userId !== userId) {
      throw new ForbiddenError("You do not have access to this MindGrid session.");
    }
    if (session.state === "SUBMITTED") {
      throw new ConflictError("SESSION_ALREADY_COMPLETED", "This case session has already been completed.");
    }

    session.hypothesis = {
      ...hypothesisData,
      updatedAt: new Date().toISOString(),
    };
    session.state = "HYPOTHESIS_FORMED";

    await this.sessionRepo.updateSession(session);
    return session;
  }

  async saveTimeline(
    userId: string,
    sessionId: string,
    timelineOrder: string[],
  ): Promise<MindGridSession> {
    const session = await this.sessionRepo.getSession(sessionId);
    if (!session) {
      throw new NotFoundError("SESSION_NOT_FOUND", "Session not found.");
    }
    if (session.userId !== userId) {
      throw new ForbiddenError("You do not have access to this MindGrid session.");
    }
    if (session.state === "SUBMITTED") {
      throw new ConflictError("SESSION_ALREADY_COMPLETED", "This case session has already been completed.");
    }

    if (session.hypothesis) {
      session.hypothesis.timelineOrder = timelineOrder;
      session.hypothesis.updatedAt = new Date().toISOString();
    } else {
      session.hypothesis = {
        suspectId: "",
        supportingEvidenceIds: [],
        timelineOrder,
        updatedAt: new Date().toISOString(),
      };
    }

    await this.sessionRepo.updateSession(session);
    return session;
  }

  async submitAccusation(
    userId: string,
    sessionId: string,
    accusation: MindGridAccusation,
  ): Promise<{
    session: MindGridSession;
    result: MindGridCaseResult;
    progress: MindGridUserProgress;
  }> {
    const session = await this.sessionRepo.getSession(sessionId);
    if (!session) {
      throw new NotFoundError("SESSION_NOT_FOUND", "Session not found.");
    }
    if (session.userId !== userId) {
      throw new ForbiddenError("You do not have access to this MindGrid session.");
    }
    if (session.state === "SUBMITTED") {
      throw new ConflictError("SESSION_ALREADY_COMPLETED", "This case session has already been completed.");
    }

    const fullCase = await this.caseRepo.getCase(session.caseId);
    if (!fullCase) {
      throw new NotFoundError("CASE_NOT_FOUND", "Case not found.");
    }

    // Validate suspect existence
    const validSuspect = fullCase.suspects.find((s) => s.id === accusation.suspectId);
    if (!validSuspect) {
      throw new ValidationError("suspectId", "Selected suspect does not exist in this case.");
    }

    // Calculate authoritative duration
    const startedTime = new Date(session.startedAt).getTime();
    const nowTime = Date.now();
    const durationSec = Math.max(5, Math.round((nowTime - startedTime) / 1000));

    // Authoritative score calculation
    const { score, result: rawResult } = this.scoringService.calculateScore(
      fullCase,
      accusation,
      session.investigationPointsRemaining,
      durationSec,
      session.unlockedEvidenceIds,
    );

    const result: MindGridCaseResult = {
      ...rawResult,
      sessionId,
      userId,
      submittedAt: new Date().toISOString(),
    };

    session.state = "SUBMITTED";
    session.accusation = accusation;
    session.submittedAt = result.submittedAt;
    session.durationSec = durationSec;
    session.result = result;

    await this.sessionRepo.updateSession(session);

    // Update user's progress and aggregate thinking profile
    const progress = await this.progressRepo.updateProgressWithResult(
      userId,
      session.caseId,
      result,
    );

    return { session, result, progress };
  }

  async getUserProgress(userId: string): Promise<MindGridUserProgress | null> {
    return this.progressRepo.getProgress(userId);
  }
}

export const mindGridService = new MindGridService();
