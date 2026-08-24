"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain,
  Zap,
  Clock,
  ArrowLeft,
  Send,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import {
  startOrResumeQuickChallengeSession,
  submitQuickChallengeAnswer,
} from "@/lib/api/quick-challenge-client";
import type {
  PublicQuickChallenge,
  QuickChallengeSession,
} from "@/types/quick-challenge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OddMindError } from "@/lib/errors";

interface QuickChallengeWorkspaceProps {
  challengeId: string;
}

export function QuickChallengeWorkspace({ challengeId }: QuickChallengeWorkspaceProps) {
  const router = useRouter();
  const { getIdToken } = useAuth();

  const [publicChallenge, setPublicChallenge] = useState<PublicQuickChallenge | null>(null);
  const [session, setSession] = useState<QuickChallengeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadSession = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Sign in required to play.", 401);

      const data = await startOrResumeQuickChallengeSession(token, challengeId);
      if (data.session.state === "SUBMITTED") {
        router.push(`/mindgrid/quick/result/${data.session.sessionId}`);
        return;
      }

      setSession(data.session);
      setPublicChallenge(data.publicChallenge);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to load puzzle.");
    } finally {
      setLoading(false);
    }
  }, [challengeId, getIdToken, router]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Focus input on load
  useEffect(() => {
    if (!loading && publicChallenge?.inputType !== "MULTIPLE_CHOICE") {
      inputRef.current?.focus();
    }
  }, [loading, publicChallenge?.inputType]);

  // Live timer tick
  useEffect(() => {
    if (!session?.startedAt || session.state === "SUBMITTED") return;

    const start = new Date(session.startedAt).getTime();
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsedSec(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.startedAt, session?.state]);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!userAnswer.trim() || submitting || !session) return;

    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Sign in required.", 401);

      const res = await submitQuickChallengeAnswer(token, session.sessionId, userAnswer.trim());
      if (res.session.isCorrect) {
        toast.success("Correct deduction!");
      } else {
        toast.error("Incorrect answer.");
      }

      router.push(`/mindgrid/quick/result/${session.sessionId}`);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to submit answer.");
      setSubmitting(false);
    }
  }

  if (loading || !publicChallenge || !session) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center min-h-[60vh] gap-3">
        <Zap className="size-8 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Setting up puzzle chamber...</p>
      </main>
    );
  }

  const timeLimit = publicChallenge.timeLimitSec;
  const isOvertime = elapsedSec > timeLimit;

  return (
    <main className="flex flex-1 flex-col min-h-screen pb-16">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/mindgrid/quick"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              title="Return to Challenges"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-bold border-primary/40 bg-primary/10 text-primary"
                >
                  {publicChallenge.category.replace("_", " ")}
                </Badge>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  {publicChallenge.difficulty}
                </span>
              </div>
              <h1 className="text-sm font-bold text-foreground line-clamp-1">
                {publicChallenge.title}
              </h1>
            </div>
          </div>

          {/* Live Timer Pill */}
          <div
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono font-bold shadow-xs ${
              isOvertime
                ? "border-destructive/50 bg-destructive/10 text-destructive animate-pulse"
                : "border-border/60 bg-background/60 text-foreground"
            }`}
          >
            <Clock className="size-3.5" />
            <span>
              {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")} /{" "}
              {Math.floor(timeLimit / 60)}:{String(timeLimit % 60).padStart(2, "0")}
            </span>
          </div>
        </div>
      </header>

      {/* Main Puzzle Canvas */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <Card className="border-border/60 bg-card/60 backdrop-blur shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
              {publicChallenge.prompt}
            </CardTitle>
            <CardDescription className="text-xs">
              {publicChallenge.instructions}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Clues Box */}
            {publicChallenge.clues && publicChallenge.clues.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-background/60 p-4 sm:p-6 space-y-2.5">
                {publicChallenge.clues.map((clue, idx) => (
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

            {/* Answer Input Area */}
            {publicChallenge.inputType === "MULTIPLE_CHOICE" && publicChallenge.options ? (
              <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
                {publicChallenge.options.map((opt) => {
                  const isSelected = userAnswer === opt.label || userAnswer === opt.text;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setUserAnswer(opt.label)}
                      className={`text-left p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                        isSelected
                          ? "border-primary bg-primary/20 text-foreground font-bold shadow-xs ring-1 ring-primary"
                          : "border-border/60 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background/80"
                      }`}
                    >
                      <span className="block font-bold text-primary mb-1">Option {opt.label}</span>
                      <span className="text-foreground">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="answer-input"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground block"
                  >
                    Your Solution:
                  </label>
                  <input
                    id="answer-input"
                    ref={inputRef}
                    type={publicChallenge.inputType === "NUMBER" ? "number" : "text"}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder={publicChallenge.placeholder || "Enter your answer"}
                    className="w-full text-lg sm:text-xl font-mono font-bold tracking-wider rounded-xl border border-border/80 bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                    disabled={submitting}
                  />
                </div>
              </form>
            )}

            {/* Submit Action */}
            <div className="pt-4 flex items-center justify-between gap-4 border-t border-border/40">
              <span className="text-xs text-muted-foreground">
                ⚡ Deterministic answer validation
              </span>

              <Button
                variant="default"
                size="lg"
                className="font-bold gap-2 px-8 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={submitting || !userAnswer.trim()}
                onClick={() => handleSubmit()}
              >
                <Send className="size-4" />
                <span>{submitting ? "Checking..." : "Submit Answer"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
