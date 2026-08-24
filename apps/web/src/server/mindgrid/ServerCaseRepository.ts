import type {
  MindGridCase,
  MindGridPublicCase,
  PublicCaseEvidence,
  CaseTimelineEvent,
} from "@/types/mindgrid";
import { SEED_MINDGRID_CASES } from "@/server/mindgrid/cases/seed-cases";

export interface ICaseRepository {
  getCase(caseId: string): Promise<MindGridCase | null>;
  getAllCases(): Promise<MindGridCase[]>;
  getPublicCase(
    caseId: string,
    unlockedEvidenceIds?: string[],
  ): Promise<MindGridPublicCase | null>;
  getAllPublicCases(): Promise<MindGridPublicCase[]>;
}

export class ServerCaseRepository implements ICaseRepository {
  private cases: Map<string, MindGridCase> = new Map();

  constructor(initialCases: MindGridCase[] = SEED_MINDGRID_CASES) {
    for (const c of initialCases) {
      this.cases.set(c.id, c);
    }
  }

  async getCase(caseId: string): Promise<MindGridCase | null> {
    return this.cases.get(caseId) || null;
  }

  async getAllCases(): Promise<MindGridCase[]> {
    return Array.from(this.cases.values());
  }

  async getPublicCase(
    caseId: string,
    unlockedEvidenceIds: string[] = [],
  ): Promise<MindGridPublicCase | null> {
    const fullCase = this.cases.get(caseId);
    if (!fullCase) return null;
    return this.mapToPublic(fullCase, unlockedEvidenceIds);
  }

  async getAllPublicCases(): Promise<MindGridPublicCase[]> {
    return Array.from(this.cases.values()).map((c) => this.mapToPublic(c, []));
  }

  public mapToPublic(
    fullCase: MindGridCase,
    unlockedEvidenceIds: string[] = [],
  ): MindGridPublicCase {
    const unlockedSet = new Set(unlockedEvidenceIds);

    const evidenceCatalog: PublicCaseEvidence[] = fullCase.evidence.map((ev) => {
      const isUnlocked = ev.isInitial || unlockedSet.has(ev.id);
      return {
        id: ev.id,
        title: ev.title,
        type: ev.type,
        unlockCost: ev.unlockCost,
        linkedSuspectIds: ev.linkedSuspectIds,
        linkedTimelineEventIds: ev.linkedTimelineEventIds,
        isInitial: ev.isInitial,
        isUnlocked,
        // Strict boundary: Only include description if unlocked!
        description: isUnlocked ? ev.description : undefined,
      };
    });

    // Timeline events: Initial events and events unlocked by unlocked evidence
    const visibleTimeline: CaseTimelineEvent[] = fullCase.timeline.filter(
      (tl) =>
        tl.isInitial ||
        (tl.unlockWithEvidenceId && unlockedSet.has(tl.unlockWithEvidenceId)),
    );

    return {
      id: fullCase.id,
      caseNumber: fullCase.caseNumber,
      title: fullCase.title,
      difficulty: fullCase.difficulty,
      scenario: fullCase.scenario,
      summary: fullCase.summary,
      investigationPoints: fullCase.investigationPoints,
      suspects: fullCase.suspects,
      initialClues: fullCase.initialClues,
      evidenceCatalog,
      timeline: visibleTimeline,
      scoring: {
        parDurationSec: fullCase.scoring.parDurationSec,
      },
    };
  }
}

export const serverCaseRepository = new ServerCaseRepository();
