"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Trophy,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Search,
  FileText,
  Users,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import {
  fetchMindGridSession,
  startOrResumeMindGridSession,
} from "@/lib/api/mindgrid-client";
import type {
  MindGridSession,
  MindGridPublicCase,
  MindGridCaseResult,
} from "@/types/mindgrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ThinkingProfileCard } from "@/features/mindgrid/ThinkingProfileCard";
import { OddMindError } from "@/lib/errors";

interface CaseResultViewProps {
  sessionId: string;
}

export function CaseResultView({ sessionId }: CaseResultViewProps) {
  const router = useRouter();
  const { getIdToken } = useAuth();

  const [session, setSession] = useState<MindGridSession | null>(null);
  const [publicCase, setPublicCase] = useState<MindGridPublicCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [replaying, setReplaying] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Authentication required.", 401);

      const data = await fetchMindGridSession(token, sessionId);
      setSession(data.session);
      setPublicCase(data.publicCase);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to load case results.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, getIdToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleReplay() {
    if (!session) return;
    setReplaying(true);
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Authentication required.", 401);

      await startOrResumeMindGridSession(token, session.caseId);
      router.push(`/mindgrid/case/${session.caseId}`);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to launch replay session.");
      setReplaying(false);
    }
  }

  if (loading || !session || !publicCase || !session.result) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center min-h-[60vh] gap-3">
        <Brain className="size-8 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Calculating cognitive thinking profile...</p>
      </main>
    );
  }

  const result = session.result;
  const score = result.score;
  const isSolved = result.isSolved;

  return (
    <main className="flex flex-1 flex-col min-h-screen pb-16">
      {/* Top Header */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/mindgrid"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Case Files
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-xs font-semibold text-foreground">
              Case #{String(publicCase.caseNumber).padStart(3, "0")} Debrief
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold gap-1.5"
            onClick={() => router.push("/mindgrid")}
          >
            <span>All Cases</span>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {/* Outcome Banner */}
        <div
          className={`rounded-2xl border p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md ${
            isSolved
              ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 to-card"
              : "border-destructive/40 bg-gradient-to-br from-destructive/10 to-card"
          }`}
        >
          <div className="flex items-center gap-4 text-center md:text-left">
            <div
              className={`rounded-full p-4 shrink-0 ${
                isSolved ? "bg-emerald-500/20 text-emerald-400" : "bg-destructive/20 text-destructive"
              }`}
            >
              {isSolved ? <Trophy className="size-10" /> : <XCircle className="size-10" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Badge
                  variant={isSolved ? "default" : "destructive"}
                  className="text-[10px] uppercase font-bold tracking-wider"
                >
                  {isSolved ? "Case Solved" : "Case Missed"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Duration: {Math.floor((result.durationSec || 0) / 60)}m {(result.durationSec || 0) % 60}s
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {isSolved ? "Brilliant Deduction, Detective!" : "The True Culprit Escaped."}
              </h1>
              <p className="text-xs text-muted-foreground max-w-xl">
                {isSolved
                  ? `You successfully identified ${result.correctCulpritName} and established proof through physical logs and contradictions.`
                  : `You accused ${publicCase.suspects.find((s) => s.id === result.chosenCulpritId)?.name || "the wrong suspect"}. The true perpetrator was ${result.correctCulpritName}.`}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center bg-background/60 border border-border/60 rounded-xl px-6 py-4 text-center shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Thinking Score
            </span>
            <span className="text-4xl font-black text-primary tracking-tight">
              {score.overallScore}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </span>
          </div>
        </div>

        {/* Cognitive Thinking Profile Breakdown */}
        <ThinkingProfileCard
          profile={{
            logicalDeduction: score.deductionScore,
            attentionToDetail: score.attentionToDetailScore,
            evidenceEvaluation: score.evidenceEvaluationScore,
            planning: score.planningScore,
            timelineReasoning: score.timelineReasoningScore,
            contradictionDetection: score.contradictionDetectionScore,
            totalCasesCompleted: 1,
          }}
          overallScore={score.overallScore}
          isSingleCase={true}
        />

        {/* Educational Case Debrief & Explanation */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Solution & Case Narrative */}
          <Card className="lg:col-span-2 border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <FileText className="size-3.5" />
                <span>Authoritative Case Solution & Analysis</span>
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                Culprit: {result.correctCulpritName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed">
              <div className="rounded-lg bg-muted/20 p-4 border border-border/40 text-foreground/90 space-y-2">
                <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                  How the Mystery Unraveled:
                </h3>
                <p className="leading-relaxed">{result.explanation}</p>
              </div>

              {/* Suspect Eliminations */}
              <div className="space-y-2 pt-2">
                <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  <span>How Innocent Suspects Were Cleared:</span>
                </h3>

                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(result.eliminatedSuspects || {}).map(([sId, elim]) => {
                    const suspect = publicCase.suspects.find((s) => s.id === sId);
                    return (
                      <div
                        key={sId}
                        className="rounded-lg border border-border/40 bg-background/50 p-3 space-y-1"
                      >
                        <span className="font-bold text-foreground block">
                          {suspect?.name || sId}
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          {elim.reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Findings Summary */}
          <Card className="border-border/60 bg-card/60 backdrop-blur flex flex-col justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Search className="size-3.5 text-primary" />
                <span>Investigation Review</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1">
                  Timeline Reconstruction
                </span>
                <p className="font-bold text-foreground">
                  {result.timelineCorrectCount} / {result.timelineTotalCount} Events Ordered Correctly
                </p>
              </div>

              {result.contradictionsIdentified && result.contradictionsIdentified.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-1">
                    ✓ Contradictions Exposed
                  </span>
                  <ul className="space-y-1 list-disc list-inside text-muted-foreground text-[11px]">
                    {result.contradictionsIdentified.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.keyEvidenceMissed && result.keyEvidenceMissed.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block mb-1">
                    ⚠️ Uncollected Crucial Evidence
                  </span>
                  <ul className="space-y-1 list-disc list-inside text-muted-foreground text-[11px]">
                    {result.keyEvidenceMissed.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs font-semibold"
                onClick={handleReplay}
                disabled={replaying}
              >
                <RotateCcw className="size-3.5" />
                <span>{replaying ? "Replaying..." : "Replay Case"}</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="w-full gap-2 text-xs font-semibold"
                onClick={() => router.push("/mindgrid")}
              >
                <span>Return to Case Files</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
