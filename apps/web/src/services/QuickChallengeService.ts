import { randomUUID } from "node:crypto";
import type {
  PublicQuickChallenge,
  QuickChallenge,
  QuickChallengeSession,
  QuickPlaySession,
  QuickChallengeUserProgress,
  QuickPlayStepResult,
} from "@/types/quick-challenge";
import {
  ServerQuickChallengeRepository,
  type IQuickChallengeRepository,
} from "@/server/mindgrid/quick/ServerQuickChallengeRepository";
import {
  FirestoreQuickChallengeSessionRepository,
  type IQuickChallengeSessionRepository,
} from "@/repositories/QuickChallengeSessionRepository";
import {
  FirestoreQuickChallengeProgressRepository,
  type IQuickChallengeProgressRepository,
} from "@/repositories/QuickChallengeProgressRepository";
import {
  QuickChallengeScoringService,
  type QuickChallengeEvaluation,
} from "@/domain/mindgrid/QuickChallengeScoringService";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from "@/lib/errors";

export class QuickChallengeService {
  constructor(
    private challengeRepo: IQuickChallengeRepository = new ServerQuickChallengeRepository(),
    private sessionRepo: IQuickChallengeSessionRepository = new FirestoreQuickChallengeSessionRepository(),
    private progressRepo: IQuickChallengeProgressRepository = new FirestoreQuickChallengeProgressRepository(),
    private scoringService: QuickChallengeScoringService = new QuickChallengeScoringService(),
  ) {}

  async listChallenges(userId?: string): Promise<{
    challenges: PublicQuickChallenge[];
    progress: QuickChallengeUserProgress | null;
  }> {
    const challenges = await this.challengeRepo.getAllPublicChallenges();
    const progress = userId ? await this.progressRepo.getProgress(userId) : null;
    return { challenges, progress };
  }

  async startOrResumeSession(
    userId: string,
    challengeId: string,
  ): Promise<{
    session: QuickChallengeSession;
    publicChallenge: PublicQuickChallenge;
  }> {
    const fullChallenge = await this.challengeRepo.getChallenge(challengeId);
    if (!fullChallenge) {
      throw new NotFoundError("CHALLENGE_NOT_FOUND", "Challenge not found.");
    }

    const publicChallenge = this.challengeRepo.mapToPublic(fullChallenge);

    // Look for active in-progress session
    const existing = await this.sessionRepo.getActiveSessionForUserAndChallenge(
      userId,
      challengeId,
    );

    if (existing) {
      return { session: existing, publicChallenge };
    }

    const newSession: QuickChallengeSession = {
      sessionId: `qcs_${randomUUID().slice(0, 12)}`,
      userId,
      challengeId,
      category: fullChallenge.category,
      difficulty: fullChallenge.difficulty,
      state: "IN_PROGRESS",
      userAnswer: null,
      isCorrect: null,
      score: null,
      startedAt: new Date().toISOString(),
      submittedAt: null,
      durationSec: null,
      explanation: null,
      correctAnswer: null,
    };

    await this.sessionRepo.createSession(newSession);
    return { session: newSession, publicChallenge };
  }

  async getSessionState(
    userId: string,
    sessionId: string,
  ): Promise<{
    session: QuickChallengeSession;
    publicChallenge: PublicQuickChallenge;
  }> {
    const session = await this.sessionRepo.getSession(sessionId);
    if (!session) {
      throw new NotFoundError("SESSION_NOT_FOUND", "Session not found.");
    }
    if (session.userId !== userId) {
      throw new ForbiddenError("You do not have access to this challenge session.");
    }

    const fullChallenge = await this.challengeRepo.getChallenge(session.challengeId);
    if (!fullChallenge) {
      throw new NotFoundError("CHALLENGE_NOT_FOUND", "Challenge not found.");
    }

    const publicChallenge = this.challengeRepo.mapToPublic(fullChallenge);
    return { session, publicChallenge };
  }

  async submitAnswer(
    userId: string,
    sessionId: string,
    answer: string,
  ): Promise<{
    session: QuickChallengeSession;
    progress: QuickChallengeUserProgress;
    evaluation: QuickChallengeEvaluation;
  }> {
    const session = await this.sessionRepo.getSession(sessionId);
    if (!session) {
      throw new NotFoundError("SESSION_NOT_FOUND", "Session not found.");
    }
    if (session.userId !== userId) {
      throw new ForbiddenError("You do not have access to this challenge session.");
    }
    if (session.state === "SUBMITTED") {
      throw new ConflictError(
        "SESSION_ALREADY_COMPLETED",
        "This challenge has already been completed.",
      );
    }

    const fullChallenge = await this.challengeRepo.getChallenge(session.challengeId);
    if (!fullChallenge) {
      throw new NotFoundError("CHALLENGE_NOT_FOUND", "Challenge not found.");
    }

    const startedTime = new Date(session.startedAt).getTime();
    const durationSec = Math.max(1, Math.round((Date.now() - startedTime) / 1000));

    const evaluation = this.scoringService.evaluateAnswer(
      fullChallenge,
      answer,
      durationSec,
    );

    session.state = "SUBMITTED";
    session.userAnswer = answer;
    session.isCorrect = evaluation.isCorrect;
    session.score = evaluation.score;
    session.submittedAt = new Date().toISOString();
    session.durationSec = durationSec;
    session.explanation = fullChallenge.solution.explanation;
    session.correctAnswer = fullChallenge.solution.acceptedAnswers[0] || "";

    await this.sessionRepo.updateSession(session);

    const progress = await this.progressRepo.updateProgressWithResult(
      userId,
      fullChallenge,
      evaluation,
    );

    return { session, progress, evaluation };
  }

  async startQuickPlay(userId: string): Promise<{
    quickPlay: QuickPlaySession;
    currentPublicChallenge: PublicQuickChallenge;
  }> {
    const challenges = await this.challengeRepo.getQuickPlayChallenges();
    if (challenges.length < 5) {
      throw new ValidationError(
        "CHALLENGES_UNAVAILABLE",
        "Not enough challenges available for Quick Play.",
      );
    }

    const firstChallenge = challenges[0]!;
    const quickPlay: QuickPlaySession = {
      playId: `qp_${randomUUID().slice(0, 12)}`,
      userId,
      challengeIds: challenges.map((c) => c.id),
      currentStepIndex: 0,
      stepResults: [],
      isCompleted: false,
      totalScore: 0,
      totalDurationSec: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    await this.sessionRepo.createQuickPlaySession(quickPlay);
    return {
      quickPlay,
      currentPublicChallenge: this.challengeRepo.mapToPublic(firstChallenge),
    };
  }

  async getQuickPlaySession(
    userId: string,
    playId: string,
  ): Promise<{
    quickPlay: QuickPlaySession;
    currentPublicChallenge: PublicQuickChallenge | null;
  }> {
    const quickPlay = await this.sessionRepo.getQuickPlaySession(playId);
    if (!quickPlay) {
      throw new NotFoundError("PLAY_NOT_FOUND", "Quick Play session not found.");
    }
    if (quickPlay.userId !== userId) {
      throw new ForbiddenError("You do not have access to this Quick Play session.");
    }

    let currentPublicChallenge: PublicQuickChallenge | null = null;
    if (!quickPlay.isCompleted && quickPlay.currentStepIndex < quickPlay.challengeIds.length) {
      const cid = quickPlay.challengeIds[quickPlay.currentStepIndex]!;
      const challenge = await this.challengeRepo.getChallenge(cid);
      if (challenge) {
        currentPublicChallenge = this.challengeRepo.mapToPublic(challenge);
      }
    }

    return { quickPlay, currentPublicChallenge };
  }

  async submitQuickPlayStep(
    userId: string,
    playId: string,
    answer: string,
  ): Promise<{
    quickPlay: QuickPlaySession;
    stepResult: QuickPlayStepResult;
    nextPublicChallenge: PublicQuickChallenge | null;
    progress?: QuickChallengeUserProgress;
  }> {
    const quickPlay = await this.sessionRepo.getQuickPlaySession(playId);
    if (!quickPlay) {
      throw new NotFoundError("PLAY_NOT_FOUND", "Quick Play session not found.");
    }
    if (quickPlay.userId !== userId) {
      throw new ForbiddenError("You do not have access to this Quick Play session.");
    }
    if (quickPlay.isCompleted) {
      throw new ConflictError("PLAY_ALREADY_COMPLETED", "Quick Play already completed.");
    }

    const currentChallengeId = quickPlay.challengeIds[quickPlay.currentStepIndex];
    if (!currentChallengeId) {
      throw new ValidationError("INVALID_STEP", "No active challenge step.");
    }

    const fullChallenge = await this.challengeRepo.getChallenge(currentChallengeId);
    if (!fullChallenge) {
      throw new NotFoundError("CHALLENGE_NOT_FOUND", "Challenge not found.");
    }

    // Step duration approximation
    const previousDuration = quickPlay.stepResults.reduce(
      (acc, s) => acc + s.durationSec,
      0,
    );
    const totalElapsed = Math.max(
      1,
      Math.round((Date.now() - new Date(quickPlay.startedAt).getTime()) / 1000),
    );
    const stepDurationSec = Math.max(1, totalElapsed - previousDuration);

    const evalRes = this.scoringService.evaluateAnswer(
      fullChallenge,
      answer,
      stepDurationSec,
    );

    const stepResult: QuickPlayStepResult = {
      challengeId: fullChallenge.id,
      category: fullChallenge.category,
      difficulty: fullChallenge.difficulty,
      userAnswer: answer,
      isCorrect: evalRes.isCorrect,
      durationSec: stepDurationSec,
      score: evalRes.score,
      correctAnswer: fullChallenge.solution.acceptedAnswers[0] || "",
      explanation: fullChallenge.solution.explanation,
    };

    quickPlay.stepResults.push(stepResult);
    quickPlay.currentStepIndex += 1;

    let nextPublicChallenge: PublicQuickChallenge | null = null;
    let updatedProgress: QuickChallengeUserProgress | undefined;

    if (quickPlay.currentStepIndex >= quickPlay.challengeIds.length) {
      quickPlay.isCompleted = true;
      quickPlay.completedAt = new Date().toISOString();
      quickPlay.totalDurationSec = quickPlay.stepResults.reduce(
        (acc, s) => acc + s.durationSec,
        0,
      );
      quickPlay.totalScore = Math.round(
        quickPlay.stepResults.reduce((acc, s) => acc + s.score, 0) /
          quickPlay.stepResults.length,
      );

      // Save aggregate Quick Play stats to user progress
      updatedProgress = await this.progressRepo.updateProgressWithQuickPlay(
        userId,
        quickPlay,
      );
    } else {
      const nextCid = quickPlay.challengeIds[quickPlay.currentStepIndex]!;
      const nextChallenge = await this.challengeRepo.getChallenge(nextCid);
      if (nextChallenge) {
        nextPublicChallenge = this.challengeRepo.mapToPublic(nextChallenge);
      }
    }

    await this.sessionRepo.updateQuickPlaySession(quickPlay);
    return {
      quickPlay,
      stepResult,
      nextPublicChallenge,
      progress: updatedProgress,
    };
  }

  async getUserProgress(userId: string): Promise<QuickChallengeUserProgress | null> {
    return this.progressRepo.getProgress(userId);
  }
}

export const quickChallengeService = new QuickChallengeService();
