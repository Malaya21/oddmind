import type {
  MindGridCase,
  MindGridAccusation,
  MindGridScoreBreakdown,
  MindGridCaseResult,
} from "@/types/mindgrid";

export class MindGridScoringService {
  public calculateScore(
    caseData: MindGridCase,
    accusation: MindGridAccusation,
    pointsRemaining: number,
    durationSec: number,
    unlockedEvidenceIds: string[],
  ): {
    score: MindGridScoreBreakdown;
    result: Omit<MindGridCaseResult, "sessionId" | "userId" | "submittedAt">;
  } {
    const isCorrect = accusation.suspectId === caseData.solution.culpritId;

    // 1. Deduction Accuracy (100 if culprit matched, 0 if wrong)
    const deductionScore = isCorrect ? 100 : 0;

    // 2. Contradiction Detection Score
    const primaryContradictions = caseData.solution.primaryContradictionEvidenceIds;
    const selectedEvidenceSet = new Set(accusation.reasoningEvidenceIds);
    let matchedContradictions = 0;
    for (const cId of primaryContradictions) {
      if (selectedEvidenceSet.has(cId)) {
        matchedContradictions++;
      }
    }
    const contradictionDetectionScore =
      primaryContradictions.length > 0
        ? Math.round((matchedContradictions / primaryContradictions.length) * 100)
        : isCorrect
          ? 90
          : 30;

    // 3. Evidence Evaluation Score
    const requiredEvidence = caseData.solution.requiredEvidenceIds;
    let matchedRequired = 0;
    for (const reqId of requiredEvidence) {
      if (selectedEvidenceSet.has(reqId)) {
        matchedRequired++;
      }
    }
    const requiredRatio = requiredEvidence.length > 0 ? matchedRequired / requiredEvidence.length : 1;
    const evidenceEvaluationScore = Math.round(
      Math.min(100, requiredRatio * 85 + (isCorrect ? 15 : 0)),
    );

    // 4. Planning & Resource Management Score
    const initialPoints = caseData.investigationPoints;
    const pointsRatio = Math.max(0, Math.min(1, pointsRemaining / initialPoints));
    const planningScore = isCorrect
      ? Math.min(100, Math.round(70 + pointsRatio * 30))
      : Math.min(60, Math.round(40 + pointsRatio * 20));

    // 5. Timeline Reasoning Score
    const expectedOrder = caseData.solution.expectedTimelineOrder;
    const submittedOrder = accusation.timelineOrder || [];
    let correctTimelinePositions = 0;

    for (let i = 0; i < expectedOrder.length; i++) {
      if (submittedOrder[i] === expectedOrder[i]) {
        correctTimelinePositions++;
      }
    }

    const timelineReasoningScore =
      expectedOrder.length > 0
        ? Math.round((correctTimelinePositions / expectedOrder.length) * 100)
        : 80;

    // 6. Attention to Detail Score
    const attentionToDetailScore = Math.round(
      timelineReasoningScore * 0.5 + contradictionDetectionScore * 0.5,
    );

    // 7. Time Bonus Score
    const par = caseData.scoring.parDurationSec;
    let timeBonus = 100;
    if (durationSec > par) {
      const overSec = durationSec - par;
      timeBonus = Math.max(25, Math.round(100 - (overSec / par) * 50));
    }

    // 8. Overall MindGrid Thinking Score
    let overallScore: number;
    if (isCorrect) {
      overallScore = Math.round(
        deductionScore * 0.4 +
          contradictionDetectionScore * 0.15 +
          evidenceEvaluationScore * 0.15 +
          planningScore * 0.1 +
          timelineReasoningScore * 0.15 +
          timeBonus * 0.05,
      );
      overallScore = Math.max(60, Math.min(100, overallScore));
    } else {
      // Partial credit for reasoning even if culprit was missed
      overallScore = Math.min(
        48,
        Math.round(
          contradictionDetectionScore * 0.35 +
            timelineReasoningScore * 0.35 +
            evidenceEvaluationScore * 0.3,
        ),
      );
    }

    const scoreBreakdown: MindGridScoreBreakdown = {
      overallScore,
      deductionScore,
      attentionToDetailScore,
      evidenceEvaluationScore,
      planningScore,
      timelineReasoningScore,
      contradictionDetectionScore,
      timeBonus,
      isCorrect,
    };

    // Determine missed key evidence
    const unlockedSet = new Set(unlockedEvidenceIds);
    const keyEvidenceMissed = caseData.solution.requiredEvidenceIds
      .filter((id) => !unlockedSet.has(id))
      .map((id) => {
        const ev = caseData.evidence.find((e) => e.id === id);
        return ev ? ev.title : id;
      });

    const contradictionsIdentified = primaryContradictions
      .filter((id) => selectedEvidenceSet.has(id))
      .map((id) => {
        const ev = caseData.evidence.find((e) => e.id === id);
        return ev ? ev.title : id;
      });

    return {
      score: scoreBreakdown,
      result: {
        caseId: caseData.id,
        isSolved: isCorrect,
        score: scoreBreakdown,
        chosenCulpritId: accusation.suspectId,
        correctCulpritId: caseData.solution.culpritId,
        correctCulpritName: caseData.solution.culpritName,
        explanation: caseData.solution.explanation,
        eliminatedSuspects: caseData.solution.eliminatedSuspects,
        keyEvidenceMissed,
        contradictionsIdentified,
        timelineCorrectCount: correctTimelinePositions,
        timelineTotalCount: expectedOrder.length,
        durationSec,
      },
    };
  }
}

export const mindGridScoringService = new MindGridScoringService();
