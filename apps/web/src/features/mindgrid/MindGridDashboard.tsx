"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain,
  Zap,
  CheckCircle2,
  Clock,
  Flame,
  Search,
  Sparkles,
  Trophy,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  Compass,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import {
  fetchMindGridCases,
  startOrResumeMindGridSession,
} from "@/lib/api/mindgrid-client";
import {
  fetchQuickChallenges,
  startQuickPlaySession,
} from "@/lib/api/quick-challenge-client";
import type {
  MindGridPublicCase,
  MindGridUserProgress,
  MindGridCaseDifficulty,
} from "@/types/mindgrid";
import type { QuickChallengeUserProgress } from "@/types/quick-challenge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OddMindLogoIcon } from "@/components/brand/OddMindLogo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ThinkingProfileCard } from "@/features/mindgrid/ThinkingProfileCard";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { OddMindError } from "@/lib/errors";

export function MindGridDashboard() {
  const router = useRouter();
  const { user, getIdToken } = useAuth();

  const [cases, setCases] = useState<MindGridPublicCase[]>([]);
  const [detectiveProgress, setDetectiveProgress] = useState<MindGridUserProgress | null>(null);
  const [quickProgress, setQuickProgress] = useState<QuickChallengeUserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingCaseId, setStartingCaseId] = useState<string | null>(null);
  const [startingQuickPlay, setStartingQuickPlay] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "ALL" | MindGridCaseDifficulty
  >("ALL");

  useEffect(() => {
    async function load() {
      try {
        const token = await getIdToken();
        const [caseData, quickData] = await Promise.all([
          fetchMindGridCases(token),
          fetchQuickChallenges(token).catch(() => ({ challenges: [], progress: null })),
        ]);
        setCases(caseData.cases);
        setDetectiveProgress(caseData.progress);
        setQuickProgress(quickData.progress);
      } catch (err) {
        toast.error("Failed to load MindGrid hub.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getIdToken]);

  const filteredCases = useMemo(() => {
    if (selectedDifficulty === "ALL") return cases;
    return cases.filter((c) => c.difficulty === selectedDifficulty);
  }, [cases, selectedDifficulty]);

  // Combined Thinking Profile (40% Detective, 60% Quick Challenges)
  const combinedThinkingProfile = useMemo(() => {
    const dProf = detectiveProgress?.aggregateThinkingProfile;
    const qProf = quickProgress?.thinkingProfile;

    const dCases = dProf?.totalCasesCompleted ?? 0;
    const qChallenges = qProf?.totalChallengesCompleted ?? 0;

    if (dCases === 0 && qChallenges === 0) {
      return null;
    }

    if (dCases > 0 && qChallenges === 0) {
      return dProf;
    }

    if (dCases === 0 && qChallenges > 0) {
      return qProf;
    }

    // Weighted blend: 40% detective, 60% quick challenges
    return {
      logicalDeduction: Math.round((dProf!.logicalDeduction * 0.4) + (qProf!.logicalDeduction * 0.6)),
      attentionToDetail: Math.round((dProf!.attentionToDetail * 0.4) + (qProf!.attentionToDetail * 0.6)),
      evidenceEvaluation: Math.round(dProf!.evidenceEvaluation),
      planning: Math.round((dProf!.planning * 0.4) + (qProf!.planning * 0.6)),
      timelineReasoning: Math.round(dProf!.timelineReasoning),
      contradictionDetection: Math.round(dProf!.contradictionDetection),
      patternRecognition: Math.round(qProf!.patternRecognition),
      problemSolving: Math.round(qProf!.problemSolving),
      decisionMaking: Math.round(qProf!.decisionMaking),
      totalCasesCompleted: dCases + qChallenges,
    };
  }, [detectiveProgress, quickProgress]);

  async function handleStartCase(caseId: string) {
    setStartingCaseId(caseId);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new OddMindError("NOT_AUTHENTICATED", "Authentication required to start investigation.", 401);
      }

      await startOrResumeMindGridSession(token, caseId);
      router.push(`/mindgrid/case/${caseId}`);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Could not launch case.");
      setStartingCaseId(null);
    }
  }

  async function handleStartQuickPlay() {
    setStartingQuickPlay(true);
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Sign in required.", 401);

      const res = await startQuickPlaySession(token);
      router.push(`/mindgrid/quick/play/${res.quickPlay.playId}`);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to launch Quick Play.");
      setStartingQuickPlay(false);
    }
  }

  function getDifficultyBadge(diff: MindGridCaseDifficulty) {
    switch (diff) {
      case "EASY":
        return (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px]">
            Easy
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px]">
            Medium
          </Badge>
        );
      case "HARD":
        return (
          <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive text-[10px]">
            Hard
          </Badge>
        );
    }
  }

  return (
    <main className="flex flex-1 flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <OddMindLogoIcon size={22} />
              <span className="font-bold tracking-wider text-xs">ODDMIND</span>
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <div className="flex items-center gap-1.5 font-bold text-foreground tracking-wider text-sm">
              <Brain className="size-4 text-primary" />
              <span>MINDGRID</span>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold">
              Solo Hub
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
              Multiplayer Mode
            </Link>
            <ConnectionStatus />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
              MindGrid Hub
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Train your reasoning and challenge your thinking. Choose between deep detective case investigations or fast 30s–3min logic puzzles.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-card/60 border border-border/60 rounded-xl p-3 shadow-sm shrink-0">
            <div className="text-center px-3 border-r border-border/40">
              <span className="text-lg font-black text-foreground">
                {detectiveProgress?.totalSolved ?? 0}
              </span>
              <span className="text-[10px] text-muted-foreground block uppercase font-medium">Cases Solved</span>
            </div>
            <div className="text-center px-3">
              <span className="text-lg font-black text-primary">
                {quickProgress?.completedChallengeIds.length ?? 0}
              </span>
              <span className="text-[10px] text-muted-foreground block uppercase font-medium">Quick Puzzles</span>
            </div>
          </div>
        </div>

        {/* Dual Mode Cards (Detective Mode vs Quick Challenges) */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Mode A: Detective Cases */}
          <Card className="border-primary/40 bg-card/60 backdrop-blur shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/40 text-primary">
                  12 Full Cases
                </Badge>
                <span className="text-xs text-muted-foreground">10–20 mins per case</span>
              </div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Search className="size-5 text-primary" />
                <span>Detective Cases</span>
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Examine crime scenes, manage investigation points, inspect CCTV and access logs, expose contradictions, and reconstruct event timelines to identify the true culprit.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-lg bg-muted/20 p-2.5 text-[11px] text-muted-foreground border border-border/30">
                {detectiveProgress
                  ? `Solved ${detectiveProgress.totalSolved} / 12 cases`
                  : "12 Curated mystery cases (Easy / Medium / Hard)"}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                variant="default"
                size="sm"
                className="w-full gap-2 text-xs font-semibold"
                onClick={() => {
                  const el = document.getElementById("detective-cases-grid");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <span>Browse 12 Case Files</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </CardFooter>
          </Card>

          {/* Mode B: Quick Challenges */}
          <Card className="border-border/60 bg-gradient-to-br from-card via-card/80 to-primary/5 backdrop-blur shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] uppercase font-bold border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                  50 Fast Puzzles
                </Badge>
                <span className="text-xs text-muted-foreground">30s – 3 mins</span>
              </div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Zap className="size-5 text-primary" />
                <span>Quick Challenges</span>
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Bite-sized logic puzzles across 5 categories: Code Breakers, Pattern Logic, Sequences, Optimization, and Logic Deduction. Play individual puzzles or a 5-challenge Gauntlet.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-lg bg-muted/20 p-2.5 text-[11px] text-muted-foreground border border-border/30">
                {quickProgress
                  ? `Solved ${quickProgress.completedChallengeIds.length} / 50 puzzles (${quickProgress.quickPlayStats.played} Gauntlets)`
                  : "5 Categories: Code Breaker, Pattern, Sequence, Optimization, Deduction"}
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex items-center gap-2">
              <Link href="/mindgrid/quick" className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs font-semibold">
                  <span>Browse 50 Puzzles</span>
                </Button>
              </Link>
              <Button
                variant="default"
                size="sm"
                className="flex-1 gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={startingQuickPlay}
                onClick={handleStartQuickPlay}
              >
                <Zap className="size-3.5" />
                <span>{startingQuickPlay ? "Starting..." : "Play Gauntlet"}</span>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Cognitive Thinking Profile Section */}
        <ThinkingProfileCard profile={combinedThinkingProfile} />

        {/* Detective Case Selection & Filter */}
        <div id="detective-cases-grid" className="space-y-4 pt-4 border-t border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Layers className="size-4 text-primary" />
              <h2 className="text-base font-bold text-foreground uppercase tracking-wider text-xs">
                Detective Case Files ({filteredCases.length})
              </h2>
            </div>

            {/* Difficulty Tabs */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40 text-xs">
              {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    selectedDifficulty === diff
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {diff === "ALL" ? "All Files" : diff.charAt(0) + diff.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Cases Grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 rounded-xl bg-card/30 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCases.map((c) => {
                const stat = detectiveProgress?.caseStats[c.id];
                const isCompleted = stat?.completed ?? false;
                const isStarting = startingCaseId === c.id;

                return (
                  <Card
                    key={c.id}
                    className={`flex flex-col justify-between border-border/60 bg-card/60 backdrop-blur transition-all duration-200 hover:border-primary/50 hover:bg-card/80 ${
                      isCompleted ? "border-emerald-500/30 bg-emerald-950/5" : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Case #{String(c.caseNumber).padStart(3, "0")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {getDifficultyBadge(c.difficulty)}
                          {isCompleted && (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/50 bg-emerald-500/20 text-emerald-400 text-[10px] gap-1"
                            >
                              <CheckCircle2 className="size-3" />
                              <span>Solved</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardTitle className="text-base font-bold text-foreground line-clamp-1">
                        {c.title}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2 leading-relaxed">
                        {c.summary}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="py-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/30">
                        <div>
                          <span className="block text-[9px] uppercase font-bold tracking-wider text-muted-foreground/70">
                            Budget
                          </span>
                          <span className="font-semibold text-foreground">
                            {c.investigationPoints} Points
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-bold tracking-wider text-muted-foreground/70">
                            Par Time
                          </span>
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <Clock className="size-3 text-muted-foreground" />
                            {Math.round(c.scoring.parDurationSec / 60)} mins
                          </span>
                        </div>
                      </div>

                      {stat && (
                        <div className="flex items-center justify-between text-[11px] px-1 pt-1 text-muted-foreground">
                          <span>Best Score: <strong className="text-primary font-bold">{stat.bestScore}/100</strong></span>
                          <span>Attempts: {stat.attempts}</span>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-2">
                      <Button
                        variant={isCompleted ? "outline" : "default"}
                        size="sm"
                        className="w-full gap-2 text-xs font-semibold"
                        onClick={() => handleStartCase(c.id)}
                        disabled={isStarting}
                      >
                        <span>{isStarting ? "Opening File..." : isCompleted ? "Replay Case" : "Investigate"}</span>
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
