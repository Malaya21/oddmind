import { describe, it, expect } from "vitest";
import { QuickChallengeScoringService } from "@/domain/mindgrid/QuickChallengeScoringService";
import { SEED_QUICK_CHALLENGES } from "@/server/mindgrid/quick/seed-challenges";

describe("QuickChallengeScoringService", () => {
  const scoring = new QuickChallengeScoringService();
  const codeBreakerChallenge = SEED_QUICK_CHALLENGES.find((c) => c.id === "qc_cb_001")!;
  const patternChallenge = SEED_QUICK_CHALLENGES.find((c) => c.id === "qc_pl_001")!;

  it("evaluates correct numeric answers with varying formats and spaces", () => {
    const res1 = scoring.evaluateAnswer(codeBreakerChallenge, "042", 20);
    expect(res1.isCorrect).toBe(true);
    expect(res1.score).toBeGreaterThanOrEqual(90);
    expect(res1.dimensionContributions.logicalDeduction).toBeGreaterThan(0);

    const res2 = scoring.evaluateAnswer(codeBreakerChallenge, " 042 ", 20);
    expect(res2.isCorrect).toBe(true);
  });

  it("evaluates incorrect answers gracefully with partial participation score", () => {
    const res = scoring.evaluateAnswer(codeBreakerChallenge, "999", 30);
    expect(res.isCorrect).toBe(false);
    expect(res.score).toBeLessThanOrEqual(20);
  });

  it("awards maximum time bonus for fast solutions", () => {
    const fast = scoring.evaluateAnswer(patternChallenge, "42", 10);
    const slow = scoring.evaluateAnswer(patternChallenge, "42", 80);

    expect(fast.timeBonus).toBe(10);
    expect(slow.timeBonus).toBeLessThan(10);
    expect(fast.score).toBeGreaterThan(slow.score);
  });
});
