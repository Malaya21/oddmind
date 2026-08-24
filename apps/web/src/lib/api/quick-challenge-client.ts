import { apiFetch } from "@/lib/api/client";
import type {
  PublicQuickChallenge,
  QuickChallengeSession,
  QuickPlaySession,
  QuickChallengeUserProgress,
  QuickPlayStepResult,
} from "@/types/quick-challenge";
import type { QuickChallengeEvaluation } from "@/domain/mindgrid/QuickChallengeScoringService";

export async function fetchQuickChallenges(token?: string | null): Promise<{
  challenges: PublicQuickChallenge[];
  progress: QuickChallengeUserProgress | null;
}> {
  return apiFetch<{
    challenges: PublicQuickChallenge[];
    progress: QuickChallengeUserProgress | null;
  }>("/api/mindgrid/quick/challenges", { token });
}

export async function startOrResumeQuickChallengeSession(
  token: string,
  challengeId: string,
): Promise<{
  session: QuickChallengeSession;
  publicChallenge: PublicQuickChallenge;
}> {
  return apiFetch<{
    session: QuickChallengeSession;
    publicChallenge: PublicQuickChallenge;
  }>("/api/mindgrid/quick/sessions", {
    method: "POST",
    token,
    body: JSON.stringify({ challengeId }),
  });
}

export async function fetchQuickChallengeSession(
  token: string,
  sessionId: string,
): Promise<{
  session: QuickChallengeSession;
  publicChallenge: PublicQuickChallenge;
}> {
  return apiFetch<{
    session: QuickChallengeSession;
    publicChallenge: PublicQuickChallenge;
  }>(`/api/mindgrid/quick/sessions/${sessionId}`, { token });
}

export async function submitQuickChallengeAnswer(
  token: string,
  sessionId: string,
  answer: string,
): Promise<{
  session: QuickChallengeSession;
  progress: QuickChallengeUserProgress;
  evaluation: QuickChallengeEvaluation;
}> {
  return apiFetch<{
    session: QuickChallengeSession;
    progress: QuickChallengeUserProgress;
    evaluation: QuickChallengeEvaluation;
  }>(`/api/mindgrid/quick/sessions/${sessionId}/submit`, {
    method: "POST",
    token,
    body: JSON.stringify({ answer }),
  });
}

export async function startQuickPlaySession(token: string): Promise<{
  quickPlay: QuickPlaySession;
  currentPublicChallenge: PublicQuickChallenge;
}> {
  return apiFetch<{
    quickPlay: QuickPlaySession;
    currentPublicChallenge: PublicQuickChallenge;
  }>("/api/mindgrid/quick/play", {
    method: "POST",
    token,
  });
}

export async function fetchQuickPlaySession(
  token: string,
  playId: string,
): Promise<{
  quickPlay: QuickPlaySession;
  currentPublicChallenge: PublicQuickChallenge | null;
}> {
  return apiFetch<{
    quickPlay: QuickPlaySession;
    currentPublicChallenge: PublicQuickChallenge | null;
  }>(`/api/mindgrid/quick/play/${playId}`, { token });
}

export async function submitQuickPlayStep(
  token: string,
  playId: string,
  answer: string,
): Promise<{
  quickPlay: QuickPlaySession;
  stepResult: QuickPlayStepResult;
  nextPublicChallenge: PublicQuickChallenge | null;
  progress?: QuickChallengeUserProgress;
}> {
  return apiFetch<{
    quickPlay: QuickPlaySession;
    stepResult: QuickPlayStepResult;
    nextPublicChallenge: PublicQuickChallenge | null;
    progress?: QuickChallengeUserProgress;
  }>(`/api/mindgrid/quick/play/${playId}/submit-step`, {
    method: "POST",
    token,
    body: JSON.stringify({ answer }),
  });
}
