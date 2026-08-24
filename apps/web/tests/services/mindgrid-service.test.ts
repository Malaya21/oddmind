import { describe, it, expect, beforeEach } from "vitest";
import { MindGridService } from "@/services/MindGridService";
import { ServerCaseRepository } from "@/server/mindgrid/ServerCaseRepository";
import { InMemoryMindGridSessionRepository } from "@/repositories/MindGridSessionRepository";
import { InMemoryMindGridProgressRepository } from "@/repositories/MindGridProgressRepository";
import { MindGridScoringService } from "@/domain/mindgrid/MindGridScoringService";
import { SEED_MINDGRID_CASES } from "@/server/mindgrid/cases/seed-cases";

describe("MindGridService Lifecycle & Rules", () => {
  let service: MindGridService;
  let sessionRepo: InMemoryMindGridSessionRepository;
  let progressRepo: InMemoryMindGridProgressRepository;
  const userId = "user_test_123";

  beforeEach(() => {
    sessionRepo = new InMemoryMindGridSessionRepository();
    progressRepo = new InMemoryMindGridProgressRepository();
    service = new MindGridService(
      new ServerCaseRepository(),
      sessionRepo,
      progressRepo,
      new MindGridScoringService(),
    );
  });

  it("starts a new session with initial points and public case data", async () => {
    const { session, publicCase } = await service.startOrResumeSession(userId, "case_001");

    expect(session.sessionId).toBeTruthy();
    expect(session.caseId).toBe("case_001");
    expect(session.userId).toBe(userId);
    expect(session.state).toBe("INVESTIGATING");
    expect(session.investigationPointsRemaining).toBe(8);

    expect(publicCase.id).toBe("case_001");
    expect((publicCase as any).solution).toBeUndefined();
  });

  it("resumes an existing active session on reconnect/refresh", async () => {
    const { session: s1 } = await service.startOrResumeSession(userId, "case_001");

    // Unlock an evidence item
    await service.unlockEvidence(userId, s1.sessionId, "ev_1_cctv");

    // Simulate page refresh / reconnect
    const { session: resumed, publicCase } = await service.startOrResumeSession(userId, "case_001");

    expect(resumed.sessionId).toBe(s1.sessionId);
    expect(resumed.unlockedEvidenceIds).toContain("ev_1_cctv");
    expect(resumed.investigationPointsRemaining).toBe(6); // 8 - 2 = 6

    const cctv = publicCase.evidenceCatalog.find((e) => e.id === "ev_1_cctv");
    expect(cctv?.isUnlocked).toBe(true);
    expect(cctv?.description).toBeTruthy();
  });

  it("rejects evidence unlock when investigation points are insufficient", async () => {
    const { session } = await service.startOrResumeSession(userId, "case_001");

    // Unlock 3 pieces of evidence to spend all points
    await service.unlockEvidence(userId, session.sessionId, "ev_1_cctv"); // -2 pts (6 left)
    await service.unlockEvidence(userId, session.sessionId, "ev_1_keycard"); // -2 pts (4 left)
    await service.unlockEvidence(userId, session.sessionId, "ev_1_locker"); // -3 pts (1 left)

    // Attempting to unlock a 2-point evidence with only 1 point left must throw error
    await expect(
      service.unlockEvidence(userId, session.sessionId, "ev_1_washbay_log"),
    ).rejects.toThrow(/Insufficient investigation points/i);
  });

  it("handles idempotent duplicate evidence unlock without double deducting points", async () => {
    const { session } = await service.startOrResumeSession(userId, "case_001");

    await service.unlockEvidence(userId, session.sessionId, "ev_1_cctv"); // 8 - 2 = 6
    const res2 = await service.unlockEvidence(userId, session.sessionId, "ev_1_cctv"); // same unlock

    expect(res2.session.investigationPointsRemaining).toBe(6);
  });

  it("submits final accusation, computes score, and updates user thinking profile", async () => {
    const { session } = await service.startOrResumeSession(userId, "case_001");
    await service.unlockEvidence(userId, session.sessionId, "ev_1_keycard");
    await service.unlockEvidence(userId, session.sessionId, "ev_1_cctv");
    await service.unlockEvidence(userId, session.sessionId, "ev_1_washbay_log");

    const case001 = SEED_MINDGRID_CASES.find((c) => c.id === "case_001")!;

    const { result, progress } = await service.submitAccusation(userId, session.sessionId, {
      suspectId: case001.solution.culpritId,
      reasoningEvidenceIds: ["ev_1_keycard", "ev_1_cctv", "ev_1_washbay_log"],
      timelineOrder: ["tl_1_1", "tl_1_2", "tl_1_3", "tl_1_4"],
    });

    expect(result.isSolved).toBe(true);
    expect(result.correctCulpritId).toBe(case001.solution.culpritId);
    expect(progress.completedCaseIds).toContain("case_001");
    expect(progress.totalSolved).toBe(1);
    expect(progress.aggregateThinkingProfile.totalCasesCompleted).toBe(1);
    expect(progress.aggregateThinkingProfile.logicalDeduction).toBe(100);
  });

  it("prevents modifying or re-submitting an already completed session", async () => {
    const { session } = await service.startOrResumeSession(userId, "case_001");
    const case001 = SEED_MINDGRID_CASES.find((c) => c.id === "case_001")!;

    await service.submitAccusation(userId, session.sessionId, {
      suspectId: case001.solution.culpritId,
      reasoningEvidenceIds: [],
      timelineOrder: [],
    });

    // Submitting again should be rejected
    await expect(
      service.submitAccusation(userId, session.sessionId, {
        suspectId: case001.solution.culpritId,
        reasoningEvidenceIds: [],
        timelineOrder: [],
      }),
    ).rejects.toThrow(/already been completed/i);

    // Unlocking evidence on completed session should be rejected
    await expect(
      service.unlockEvidence(userId, session.sessionId, "ev_1_cctv"),
    ).rejects.toThrow(/already been completed/i);
  });

  it("blocks unauthorized user from accessing another player's session", async () => {
    const { session } = await service.startOrResumeSession(userId, "case_001");

    await expect(
      service.getSessionState("another_user_456", session.sessionId),
    ).rejects.toThrow(/do not have access/i);
  });
});
