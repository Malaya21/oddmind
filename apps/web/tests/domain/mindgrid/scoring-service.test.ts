import { describe, it, expect } from "vitest";
import { MindGridScoringService } from "@/domain/mindgrid/MindGridScoringService";
import { SEED_MINDGRID_CASES } from "@/server/mindgrid/cases/seed-cases";

describe("MindGridScoringService", () => {
  const service = new MindGridScoringService();
  const case001 = SEED_MINDGRID_CASES.find((c) => c.id === "case_001")!;

  it("awards high thinking score when correct culprit and required evidence are chosen", () => {
    const accusation = {
      suspectId: case001.solution.culpritId, // suspect_brian
      reasoningEvidenceIds: ["ev_1_keycard", "ev_1_cctv", "ev_1_washbay_log"],
      timelineOrder: ["tl_1_1", "tl_1_2", "tl_1_3", "tl_1_4"],
    };

    const { score, result } = service.calculateScore(
      case001,
      accusation,
      4, // 4 points remaining
      120, // 120s duration
      ["ev_1_keycard", "ev_1_cctv", "ev_1_washbay_log"],
    );

    expect(result.isSolved).toBe(true);
    expect(score.isCorrect).toBe(true);
    expect(score.deductionScore).toBe(100);
    expect(score.contradictionDetectionScore).toBe(100);
    expect(score.timelineReasoningScore).toBe(100);
    expect(score.planningScore).toBeGreaterThanOrEqual(80);
    expect(score.overallScore).toBeGreaterThanOrEqual(85);
    expect(result.keyEvidenceMissed).toHaveLength(0);
    expect(result.timelineCorrectCount).toBe(4);
  });

  it("penalizes score when incorrect culprit is accused", () => {
    const wrongAccusation = {
      suspectId: "suspect_alex", // Innocent Dr. Alex Wright
      reasoningEvidenceIds: ["ev_1_lounge_cctv"],
      timelineOrder: ["tl_1_1", "tl_1_2", "tl_1_3", "tl_1_4"],
    };

    const { score, result } = service.calculateScore(
      case001,
      wrongAccusation,
      2,
      200,
      ["ev_1_lounge_cctv"],
    );

    expect(result.isSolved).toBe(false);
    expect(score.isCorrect).toBe(false);
    expect(score.deductionScore).toBe(0);
    expect(score.overallScore).toBeLessThanOrEqual(48);
    expect(result.keyEvidenceMissed.length).toBeGreaterThan(0);
  });

  it("evaluates partial timeline accuracy accurately", () => {
    const partialTimelineAccusation = {
      suspectId: case001.solution.culpritId,
      reasoningEvidenceIds: ["ev_1_keycard", "ev_1_cctv", "ev_1_washbay_log"],
      // Swapped timeline order
      timelineOrder: ["tl_1_1", "tl_1_3", "tl_1_2", "tl_1_4"],
    };

    const { score, result } = service.calculateScore(
      case001,
      partialTimelineAccusation,
      4,
      120,
      ["ev_1_keycard", "ev_1_cctv", "ev_1_washbay_log"],
    );

    expect(result.isSolved).toBe(true);
    expect(result.timelineCorrectCount).toBe(2); // tl_1_1 and tl_1_4 matched positions
    expect(score.timelineReasoningScore).toBe(50);
  });
});
