import { describe, it, expect, beforeEach } from "vitest";
import { QuickChallengeService } from "@/services/QuickChallengeService";
import { ServerQuickChallengeRepository } from "@/server/mindgrid/quick/ServerQuickChallengeRepository";
import {
  InMemoryQuickChallengeSessionRepository,
} from "@/repositories/QuickChallengeSessionRepository";
import {
  InMemoryQuickChallengeProgressRepository,
} from "@/repositories/QuickChallengeProgressRepository";
import { QuickChallengeScoringService } from "@/domain/mindgrid/QuickChallengeScoringService";

describe("QuickChallengeService Lifecycle", () => {
  let service: QuickChallengeService;
  let sessionRepo: InMemoryQuickChallengeSessionRepository;
  let progressRepo: InMemoryQuickChallengeProgressRepository;

  beforeEach(() => {
    sessionRepo = new InMemoryQuickChallengeSessionRepository();
    progressRepo = new InMemoryQuickChallengeProgressRepository();
    service = new QuickChallengeService(
      new ServerQuickChallengeRepository(),
      sessionRepo,
      progressRepo,
      new QuickChallengeScoringService(),
    );
  });

  it("handles single challenge start and submission lifecycle", async () => {
    const userId = "test_user_1";
    const challengeId = "qc_cb_001";

    const { session, publicChallenge } = await service.startOrResumeSession(userId, challengeId);
    expect(session.state).toBe("IN_PROGRESS");
    expect(publicChallenge.id).toBe(challengeId);

    const { session: submittedSession, progress, evaluation } = await service.submitAnswer(
      userId,
      session.sessionId,
      "042",
    );

    expect(submittedSession.state).toBe("SUBMITTED");
    expect(submittedSession.isCorrect).toBe(true);
    expect(submittedSession.score).toBeGreaterThanOrEqual(80);
    expect(submittedSession.explanation).toBeTruthy();

    expect(progress.completedChallengeIds).toContain(challengeId);
    expect(progress.categoryStats.CODE_BREAKER.solved).toBe(1);
    expect(progress.thinkingProfile.logicalDeduction).toBeGreaterThan(0);
  });

  it("completes a full 5-challenge Quick Play gauntlet", async () => {
    const userId = "test_user_quickplay";

    const { quickPlay, currentPublicChallenge } = await service.startQuickPlay(userId);
    expect(quickPlay.challengeIds).toHaveLength(5);
    expect(quickPlay.currentStepIndex).toBe(0);
    expect(currentPublicChallenge.id).toBe(quickPlay.challengeIds[0]);

    let activePlay = quickPlay;
    for (let i = 0; i < 5; i++) {
      const stepRes = await service.submitQuickPlayStep(userId, activePlay.playId, "042");
      activePlay = stepRes.quickPlay;
      if (i < 4) {
        expect(stepRes.nextPublicChallenge).toBeDefined();
      } else {
        expect(stepRes.nextPublicChallenge).toBeNull();
        expect(activePlay.isCompleted).toBe(true);
        expect(activePlay.totalScore).toBeGreaterThanOrEqual(0);
        expect(stepRes.progress?.quickPlayStats.played).toBe(1);
      }
    }
  });
});
