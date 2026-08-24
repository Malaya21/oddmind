"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Send,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import {
  fetchQuickPlaySession,
  submitQuickPlayStep,
  startQuickPlaySession,
} from "@/lib/api/quick-challenge-client";
import type {
  QuickPlaySession,
  PublicQuickChallenge,
  QuickPlayStepResult,
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
import { ThinkingProfileCard } from "@/features/mindgrid/ThinkingProfileCard";
import { OddMindError } from "@/lib/errors";

interface QuickPlayWorkspaceProps {
  playId: string;
}

export function QuickPlayWorkspace({ playId }: QuickPlayWorkspaceProps) {
  const router = useRouter();
  const { getIdToken } = useAuth();

  const [quickPlay, setQuickPlay] = useState<QuickPlaySession | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<PublicQuickChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadSession = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Sign in required.", 401);

      const data = await fetchQuickPlaySession(token, playId);
      setQuickPlay(data.quickPlay);
      setCurrentChallenge(data.currentPublicChallenge);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to load Quick Play.");
    } finally {
      setLoading(false);
    }
  }, [playId, getIdToken]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Live timer tick
  useEffect(() => {
    if (!quickPlay?.startedAt || quickPlay.isCompleted) return;

    const start = new Date(quickPlay.startedAt).getTime();
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsedSec(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [quickPlay?.startedAt, quickPlay?.isCompleted]);

  // Focus input when challenge changes
  useEffect(() => {
    setUserAnswer("");
    if (!quickPlay?.isCompleted && currentChallenge?.inputType !== "MULTIPLE_CHOICE") {
      inputRef.current?.focus();
    }
  }, [currentChallenge, quickPlay?.isCompleted]);

  async function handleSubmitStep(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!userAnswer.trim() || submitting || !quickPlay) return;

    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Sign in required.", 401);

      const res = await submitQuickPlayStep(token, playId, userAnswer.trim());
      setQuickPlay(res.quickPlay);
      setCurrentChallenge(res.nextPublicChallenge);

      if (res.stepResult.isCorrect) {
        toast.success(`Puzzle ${res.quickPlay.currentStepIndex} Correct!`);
      } else {
        toast.error(`Puzzle ${res.quickPlay.currentStepIndex} Incorrect.`);
      }
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to submit step.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePlayAgain() {
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Sign in required.", 401);

      const res = await startQuickPlaySession(token);
      router.push(`/mindgrid/quick/play/${res.quickPlay.playId}`);
    } catch (err) {
      toast.error("Failed to start new gauntlet.");
    }
  }

  if (loading || !quickPlay) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center min-h-[60vh] gap-3">
        <Zap className="size-8 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Preparing Quick Play gauntlet...</p>
      </main>
    );
  }

  // Final Quick Play Results Screen
  if (quickPlay.isCompleted) {
    const totalCorrect = quickPlay.stepResults.filter((s) => s.isCorrect).length;
    const totalScore = quickPlay.totalScore;
    const totalTime = quickPlay.totalDurationSec;

    return (
      <main className="flex flex-1 flex-col min-h-screen pb-16">
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
                Quick Play Summary
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

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
          {/* Summary Banner */}
          <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-card to-card/90 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md backdrop-blur">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="rounded-full p-4 bg-primary/20 text-primary shrink-0">
                <Trophy className="size-10" />
              </div>
              <div className="space-y-1">
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider border-primary/40 text-primary">
                  Gauntlet Completed
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {totalCorrect >= 4 ? "Masterful Problem Solving!" : "Gauntlet Complete!"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Solved <strong>{totalCorrect} / 5</strong> puzzles in {Math.floor(totalTime / 60)}m {totalTime % 60}s
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center bg-background/60 border border-border/60 rounded-xl px-6 py-4 text-center shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Gauntlet Score
              </span>
              <span className="text-4xl font-black text-primary tracking-tight">
                {totalScore}
                <span className="text-sm font-normal text-muted-foreground">/100</span>
              </span>
            </div>
          </div>

          {/* 5-Step Breakdown */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Brain className="size-3.5 text-primary" />
              <span>Step-by-Step Breakdown</span>
            </h2>

            <div className="space-y-2.5">
              {quickPlay.stepResults.map((step, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                    step.isCorrect
                      ? "border-emerald-500/30 bg-emerald-950/5"
                      : "border-destructive/30 bg-destructive/5"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {idx + 1}. {step.category.replace("_", " ")}
                      </span>
                      <Badge
                        variant={step.isCorrect ? "default" : "destructive"}
                        className="text-[9px] uppercase font-bold"
                      >
                        {step.isCorrect ? "Correct" : "Missed"}
                      </Badge>
                      <span className="text-muted-foreground">({step.durationSec}s)</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      Your answer: <strong>{step.userAnswer}</strong> | Correct: <strong>{step.correctAnswer}</strong>
                    </p>
                  </div>

                  <span className="font-mono font-bold text-foreground shrink-0 text-sm">
                    {step.score} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto gap-2 text-xs font-semibold"
              onClick={handlePlayAgain}
            >
              <RotateCcw className="size-3.5" />
              <span>Play Another Gauntlet</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              className="w-full sm:w-auto gap-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => router.push("/mindgrid/quick")}
            >
              <span>Return to Quick Challenges</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Active Challenge Step
  const stepNumber = quickPlay.currentStepIndex + 1;
  const totalSteps = quickPlay.challengeIds.length;

  return (
    <main className="flex flex-1 flex-col min-h-screen pb-16">
      {/* Action Bar */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/mindgrid/quick"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Exit
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Puzzle {stepNumber} of {totalSteps}
                </span>
                {currentChallenge && (
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase font-bold border-primary/40 bg-primary/10 text-primary"
                  >
                    {currentChallenge.category.replace("_", " ")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Timer & Step Progress */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              <span>
                {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")}
              </span>
            </div>

            {/* Step Pills */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`size-2 rounded-full transition-colors ${
                    i < quickPlay.currentStepIndex
                      ? "bg-primary"
                      : i === quickPlay.currentStepIndex
                        ? "bg-primary animate-pulse ring-2 ring-primary/40"
                        : "bg-muted/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Active Puzzle Canvas */}
      {currentChallenge && (
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                {currentChallenge.prompt}
              </CardTitle>
              <CardDescription className="text-xs">
                {currentChallenge.instructions}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Clues */}
              {currentChallenge.clues && currentChallenge.clues.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-background/60 p-4 sm:p-6 space-y-2.5">
                  {currentChallenge.clues.map((clue, idx) => (
                    <div
                      key={idx}
                      className="font-mono text-sm sm:text-base text-foreground font-semibold tracking-wide flex items-start gap-2"
                    >
                      <span className="text-primary font-bold">›</span>
                      <span className="leading-relaxed">{clue}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Multiple Choice Options or Text Input */}
              {currentChallenge.inputType === "MULTIPLE_CHOICE" && currentChallenge.options ? (
                <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
                  {currentChallenge.options.map((opt) => {
                    const isSelected = userAnswer === opt.label || userAnswer === opt.text;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setUserAnswer(opt.label)}
                        className={`text-left p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                          isSelected
                            ? "border-primary bg-primary/20 text-foreground font-bold shadow-xs ring-1 ring-primary"
                            : "border-border/60 bg-background/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="block font-bold text-primary mb-1">Option {opt.label}</span>
                        <span className="text-foreground">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <form onSubmit={handleSubmitStep} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="quickplay-input"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground block"
                    >
                      Your Solution:
                    </label>
                    <input
                      id="quickplay-input"
                      ref={inputRef}
                      type={currentChallenge.inputType === "NUMBER" ? "number" : "text"}
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder={currentChallenge.placeholder || "Enter answer"}
                      className="w-full text-lg sm:text-xl font-mono font-bold tracking-wider rounded-xl border border-border/80 bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                      disabled={submitting}
                    />
                  </div>
                </form>
              )}

              <div className="pt-4 flex items-center justify-between gap-4 border-t border-border/40">
                <span className="text-xs text-muted-foreground">
                  Step {stepNumber} of {totalSteps}
                </span>

                <Button
                  variant="default"
                  size="lg"
                  className="font-bold gap-2 px-8 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={submitting || !userAnswer.trim()}
                  onClick={() => handleSubmitStep()}
                >
                  <Send className="size-4" />
                  <span>
                    {submitting
                      ? "Verifying..."
                      : stepNumber === totalSteps
                        ? "Finish Gauntlet"
                        : "Next Puzzle"}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
