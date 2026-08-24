import { describe, it, expect } from "vitest";
import { ServerQuickChallengeRepository } from "@/server/mindgrid/quick/ServerQuickChallengeRepository";
import { SEED_QUICK_CHALLENGES } from "@/server/mindgrid/quick/seed-challenges";
import type { QuickChallengeCategory } from "@/types/quick-challenge";

describe("ServerQuickChallengeRepository", () => {
  const repo = new ServerQuickChallengeRepository();

  it("loads exactly 50 curated seed challenges", async () => {
    const all = await repo.getAllChallenges();
    expect(all).toHaveLength(50);
  });

  it("contains exactly 10 challenges for each of the 5 categories", async () => {
    const categories: QuickChallengeCategory[] = [
      "CODE_BREAKER",
      "PATTERN_LOGIC",
      "SEQUENCE",
      "OPTIMIZATION",
      "LOGIC_DEDUCTION",
    ];

    for (const cat of categories) {
      const list = await repo.getChallengesByCategory(cat);
      expect(list).toHaveLength(10);
    }
  });

  it("ensures every seed challenge has deterministic answers and explanations", () => {
    for (const c of SEED_QUICK_CHALLENGES) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.solution.acceptedAnswers.length).toBeGreaterThanOrEqual(1);
      expect(c.solution.explanation.length).toBeGreaterThan(10);
      expect(c.timeLimitSec).toBeGreaterThanOrEqual(30);
    }
  });

  it("strips secret solution when mapped to public challenge", async () => {
    const pub = await repo.getPublicChallenge("qc_cb_001");
    expect(pub).toBeDefined();
    expect((pub as any).solution).toBeUndefined();
    expect(pub?.id).toBe("qc_cb_001");
  });

  it("verifies Code Breaker digit consistency across prompt, clues, and answers", async () => {
    const codeBreakers = await repo.getChallengesByCategory("CODE_BREAKER");
    expect(codeBreakers).toHaveLength(10);

    for (const cb of codeBreakers) {
      const isFourDigit = cb.prompt.includes("4-digit");
      const isThreeDigit = cb.prompt.includes("3-digit");

      expect(isFourDigit || isThreeDigit).toBe(true);

      const expectedLength = isFourDigit ? 4 : 3;

      // Primary accepted answer must match the expected length
      const primaryAnswer = cb.solution.acceptedAnswers[0]!;
      expect(primaryAnswer.length).toBe(expectedLength);

      // Check placeholder indicates the required digit count
      if (cb.placeholder) {
        expect(cb.placeholder).toContain(`${expectedLength} digits`);
      }

      // Check clue lengths (first number token in each clue)
      for (const clue of cb.clues) {
        const firstToken = clue.split(" ")[0]?.replace(/\D/g, "");
        if (firstToken) {
          expect(firstToken.length).toBe(expectedLength);
        }
      }
    }

    // Specific Safe Dial (qc_cb_002) check
    const safeDial = await repo.getChallenge("qc_cb_002");
    expect(safeDial?.prompt).toContain("4-digit");
    expect(safeDial?.placeholder).toBe("Enter 4 digits");
    expect(safeDial?.solution.acceptedAnswers).toContain("4183");
  });

  it("ensures no challenge placeholder ever leaks or equals the accepted answer", async () => {
    const all = await repo.getAllChallenges();
    for (const c of all) {
      if (c.placeholder) {
        for (const ans of c.solution.acceptedAnswers) {
          expect(c.placeholder.toLowerCase()).not.toBe(ans.toLowerCase());
          expect(c.placeholder.toLowerCase()).not.toBe(`e.g. ${ans.toLowerCase()}`);
        }
      }
    }
  });
});
