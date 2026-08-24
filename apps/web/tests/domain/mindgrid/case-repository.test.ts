import { describe, it, expect } from "vitest";
import { ServerCaseRepository } from "@/server/mindgrid/ServerCaseRepository";
import { SEED_MINDGRID_CASES } from "@/server/mindgrid/cases/seed-cases";

describe("ServerCaseRepository & Seed Cases", () => {
  const repo = new ServerCaseRepository();

  it("loads all 12 seed cases", async () => {
    const cases = await repo.getAllCases();
    expect(cases).toHaveLength(12);
  });

  it("contains 4 Easy, 5 Medium, and 3 Hard cases", async () => {
    const cases = await repo.getAllCases();
    const easy = cases.filter((c) => c.difficulty === "EASY");
    const medium = cases.filter((c) => c.difficulty === "MEDIUM");
    const hard = cases.filter((c) => c.difficulty === "HARD");

    expect(easy).toHaveLength(4);
    expect(medium).toHaveLength(5);
    expect(hard).toHaveLength(3);
  });

  it("verifies every case has valid structured solution metadata", async () => {
    const cases = await repo.getAllCases();

    for (const c of cases) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.investigationPoints).toBeGreaterThanOrEqual(8);
      expect(c.suspects.length).toBeGreaterThanOrEqual(3);
      expect(c.initialClues.length).toBeGreaterThanOrEqual(2);
      expect(c.evidence.length).toBeGreaterThanOrEqual(3);
      expect(c.timeline.length).toBeGreaterThanOrEqual(3);

      // Verify solution integrity
      expect(c.solution.culpritId).toBeTruthy();
      const culprit = c.suspects.find((s) => s.id === c.solution.culpritId);
      expect(culprit).toBeDefined();
      expect(c.solution.requiredEvidenceIds.length).toBeGreaterThanOrEqual(2);
      expect(c.solution.expectedTimelineOrder.length).toBeGreaterThanOrEqual(3);
      expect(c.solution.explanation.length).toBeGreaterThan(20);

      // Verify eliminated suspects
      for (const suspect of c.suspects) {
        if (suspect.id !== c.solution.culpritId) {
          const elim = c.solution.eliminatedSuspects[suspect.id];
          expect(elim).toBeDefined();
          expect(elim?.reason).toBeTruthy();
        }
      }
    }
  });

  it("strictly omits solutions and locked evidence descriptions in public case mapper", async () => {
    const publicCase = await repo.getPublicCase("case_001", []);
    expect(publicCase).not.toBeNull();

    // Solution must NOT exist on public case object
    expect((publicCase as any).solution).toBeUndefined();

    // Locked evidence must NOT have descriptions
    for (const ev of publicCase!.evidenceCatalog) {
      if (!ev.isInitial) {
        expect(ev.description).toBeUndefined();
        expect(ev.isUnlocked).toBe(false);
      }
    }
  });

  it("reveals descriptions when evidence is unlocked", async () => {
    const publicCase = await repo.getPublicCase("case_001", ["ev_1_cctv", "ev_1_keycard"]);
    expect(publicCase).not.toBeNull();

    const cctv = publicCase!.evidenceCatalog.find((e) => e.id === "ev_1_cctv");
    const keycard = publicCase!.evidenceCatalog.find((e) => e.id === "ev_1_keycard");
    const locker = publicCase!.evidenceCatalog.find((e) => e.id === "ev_1_locker");

    expect(cctv?.isUnlocked).toBe(true);
    expect(cctv?.description).toBeTruthy();

    expect(keycard?.isUnlocked).toBe(true);
    expect(keycard?.description).toBeTruthy();

    // Locker remains locked
    expect(locker?.isUnlocked).toBe(false);
    expect(locker?.description).toBeUndefined();
  });
});
