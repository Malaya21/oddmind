"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  HelpCircle,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import {
  fetchQuickChallengeSession,
  startOrResumeQuickChallengeSession,
} from "@/lib/api/quick-challenge-client";
import type {
  QuickChallengeSession,
  PublicQuickChallenge,
} from "@/types/quick-challenge";
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
import { OddMindError } from "@/lib/errors";

interface QuickChallengeResultViewProps {
  sessionId: string;
}

export function QuickChallengeResultView({ sessionId }: QuickChallengeResultViewProps) {
  const router = useRouter();
  const { getIdToken } = useAuth();

  const [session, setSession] = useState<QuickChallengeSession | null>(null);
  const [publicChallenge, setPublicChallenge] = useState<PublicQuickChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Sign in required.", 401);

      const data = await fetchQuickChallengeSession(token, sessionId);
      setSession(data.session);
      setPublicChallenge(data.publicChallenge);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to load results.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, getIdToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleReplay() {
    if (!session) return;
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Sign in required.", 401);

      await startOrResumeQuickChallengeSession(token, session.challengeId);
      router.push(`/mindgrid/quick/${session.challengeId}`);
    } catch (err) {
      toast.error("Could not replay puzzle.");
    }
  }

  if (loading || !session || !publicChallenge) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center min-h-[60vh] gap-3">
        <Zap className="size-8 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Evaluating puzzle logic...</p>
      </main>
    );
  }

  const isCorrect = session.isCorrect ?? false;
  const score = session.score ?? 0;

  return (
    <main className="flex flex-1 flex-col min-h-screen pb-16">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/mindgrid/quick"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Quick Challenges
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-xs font-semibold text-foreground">
              {publicChallenge.title} Result
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold"
            onClick={() => router.push("/mindgrid/quick")}
          >
            All Challenges
          </Button>
        </div>
      </header>

      {/* Result Container */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {/* Banner */}
        <div
          className={`rounded-2xl border p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md ${
            isCorrect
              ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 to-card"
              : "border-destructive/40 bg-gradient-to-br from-destructive/10 to-card"
          }`}
        >
          <div className="flex items-center gap-4 text-center md:text-left">
            <div
              className={`rounded-full p-4 shrink-0 ${
                isCorrect
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-destructive/20 text-destructive"
              }`}
            >
              {isCorrect ? <CheckCircle2 className="size-10" /> : <XCircle className="size-10" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Badge
                  variant={isCorrect ? "default" : "destructive"}
                  className="text-[10px] uppercase font-bold tracking-wider"
                >
                  {isCorrect ? "Correct Solution" : "Incorrect Answer"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Time: {session.durationSec ?? 0}s
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {isCorrect ? "Sharp Reasoning!" : "Puzzle Missed"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Category: <strong>{publicChallenge.category.replace("_", " ")}</strong> (
                {publicChallenge.difficulty})
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center bg-background/60 border border-border/60 rounded-xl px-6 py-4 text-center shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Challenge Score
            </span>
            <span className="text-4xl font-black text-primary tracking-tight">
              {score}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </span>
          </div>
        </div>

        {/* Answer Comparison */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-wider">
                Your Answer
              </CardDescription>
              <CardTitle className="text-lg font-mono font-bold text-foreground">
                {session.userAnswer || "None"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border/60 bg-card/60">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Correct Solution
              </CardDescription>
              <CardTitle className="text-lg font-mono font-bold text-emerald-400">
                {session.correctAnswer || "Verified"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Educational Solution & Step-by-Step Logic */}
        {session.explanation && (
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <BookOpen className="size-3.5" />
                <span>Logical Explanation & Solution Analysis</span>
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Why this is the correct answer:
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs sm:text-sm text-foreground/90 leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/30 m-4 mt-0">
              {session.explanation}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto gap-2 text-xs font-semibold"
            onClick={handleReplay}
          >
            <RotateCcw className="size-3.5" />
            <span>Try Again</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            className="w-full sm:w-auto gap-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => router.push("/mindgrid/quick")}
          >
            <span>Next Challenge</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </main>
  );
}
