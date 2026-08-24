import { apiFetch } from "@/lib/api/client";
import type {
  MindGridPublicCase,
  MindGridSession,
  PublicCaseEvidence,
  MindGridAccusation,
  MindGridCaseResult,
  MindGridUserProgress,
} from "@/types/mindgrid";

export async function fetchMindGridCases(token?: string | null): Promise<{
  cases: MindGridPublicCase[];
  progress: MindGridUserProgress | null;
}> {
  return apiFetch<{
    cases: MindGridPublicCase[];
    progress: MindGridUserProgress | null;
  }>("/api/mindgrid/cases", { token });
}

export async function startOrResumeMindGridSession(
  token: string,
  caseId: string,
): Promise<{
  session: MindGridSession;
  publicCase: MindGridPublicCase;
}> {
  return apiFetch<{
    session: MindGridSession;
    publicCase: MindGridPublicCase;
  }>("/api/mindgrid/sessions", {
    method: "POST",
    token,
    body: JSON.stringify({ caseId }),
  });
}

export async function fetchMindGridSession(
  token: string,
  sessionId: string,
): Promise<{
  session: MindGridSession;
  publicCase: MindGridPublicCase;
}> {
  return apiFetch<{
    session: MindGridSession;
    publicCase: MindGridPublicCase;
  }>(`/api/mindgrid/sessions/${sessionId}`, { token });
}

export async function unlockMindGridEvidence(
  token: string,
  sessionId: string,
  evidenceId: string,
): Promise<{
  session: MindGridSession;
  unlockedEvidence: PublicCaseEvidence;
  publicCase: MindGridPublicCase;
}> {
  return apiFetch<{
    session: MindGridSession;
    unlockedEvidence: PublicCaseEvidence;
    publicCase: MindGridPublicCase;
  }>(`/api/mindgrid/sessions/${sessionId}/unlock`, {
    method: "POST",
    token,
    body: JSON.stringify({ evidenceId }),
  });
}

export async function saveMindGridTimeline(
  token: string,
  sessionId: string,
  timelineOrder: string[],
): Promise<{ session: MindGridSession }> {
  return apiFetch<{ session: MindGridSession }>(
    `/api/mindgrid/sessions/${sessionId}/timeline`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ timelineOrder }),
    },
  );
}

export async function saveMindGridHypothesis(
  token: string,
  sessionId: string,
  hypothesis: {
    suspectId: string;
    supportingEvidenceIds: string[];
    timelineOrder?: string[];
    notes?: string;
  },
): Promise<{ session: MindGridSession }> {
  return apiFetch<{ session: MindGridSession }>(
    `/api/mindgrid/sessions/${sessionId}/hypothesis`,
    {
      method: "POST",
      token,
      body: JSON.stringify(hypothesis),
    },
  );
}

export async function submitMindGridAccusation(
  token: string,
  sessionId: string,
  accusation: MindGridAccusation,
): Promise<{
  session: MindGridSession;
  result: MindGridCaseResult;
  progress: MindGridUserProgress;
}> {
  return apiFetch<{
    session: MindGridSession;
    result: MindGridCaseResult;
    progress: MindGridUserProgress;
  }>(`/api/mindgrid/sessions/${sessionId}/submit`, {
    method: "POST",
    token,
    body: JSON.stringify(accusation),
  });
}

export async function fetchMindGridProgress(
  token: string,
): Promise<{ progress: MindGridUserProgress | null }> {
  return apiFetch<{ progress: MindGridUserProgress | null }>(
    "/api/mindgrid/progress",
    { token },
  );
}
