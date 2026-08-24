"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  ArrowRight,
  Layers,
  Search,
  KeyRound,
  Grid,
  TrendingUp,
  Compass,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import {
  fetchQuickChallenges,
  startOrResumeQuickChallengeSession,
  startQuickPlaySession,
} from "@/lib/api/quick-challenge-client";
import type {
  PublicQuickChallenge,
  QuickChallengeUserProgress,
  QuickChallengeCategory,
  QuickChallengeDifficulty,
} from "@/types/quick-challenge";
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
import { OddMindError } from "@/lib/errors";

const CATEGORY_META: Record<
  QuickChallengeCategory,
  { label: string; icon: any; color: string; desc: string }
> = {
  CODE_BREAKER: {
    label: "Code Breaker",
    icon: KeyRound,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    desc: "Deduce numeric passcodes from positional clues and eliminations.",
  },
  PATTERN_LOGIC: {
    label: "Pattern Logic",
    icon: Grid,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    desc: "Uncover mathematical, geometric, and operational growth rules.",
  },
  SEQUENCE: {
    label: "Sequence",
    icon: TrendingUp,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    desc: "Determine next elements in alphabetical, modular, and stepped series.",
  },
  OPTIMIZATION: {
    label: "Optimization",
    icon: Sliders,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    desc: "Find optimal resource allocation under capacity and time constraints.",
  },
  LOGIC_DEDUCTION: {
    label: "Logic Deduction",
    icon: Compass,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    desc: "Solve constraint satisfaction, truth-teller, and placement puzzles.",
  },
};

export function QuickChallengeHub() {
  const router = useRouter();
  const { getIdToken } = useAuth();

  const [challenges, setChallenges] = useState<PublicQuickChallenge[]>([]);
  const [progress, setProgress] = useState<QuickChallengeUserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingQuickPlay, setStartingQuickPlay] = useState(false);
  const [startingChallengeId, setStartingChallengeId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    "ALL" | QuickChallengeCategory
  >("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "ALL" | QuickChallengeDifficulty
  >("ALL");

  useEffect(() => {
    async function load() {
      try {
        const token = await getIdToken();
        const data = await fetchQuickChallenges(token);
        setChallenges(data.challenges);
        setProgress(data.progress);
      } catch (err) {
        toast.error("Failed to load Quick Challenges.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [getIdToken]);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      const matchCat = selectedCategory === "ALL" || c.category === selectedCategory;
      const matchDiff = selectedDifficulty === "ALL" || c.difficulty === selectedDifficulty;
      return matchCat && matchDiff;
    });
  }, [challenges, selectedCategory, selectedDifficulty]);

  async function handleStartQuickPlay() {
    setStartingQuickPlay(true);
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Sign in required to play.", 401);

      const res = await startQuickPlaySession(token);
      router.push(`/mindgrid/quick/play/${res.quickPlay.playId}`);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to launch Quick Play.");
      setStartingQuickPlay(false);
    }
  }

  async function handleStartChallenge(challengeId: string) {
    setStartingChallengeId(challengeId);
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Sign in required to play.", 401);

      await startOrResumeQuickChallengeSession(token, challengeId);
      router.push(`/mindgrid/quick/${challengeId}`);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Could not launch challenge.");
      setStartingChallengeId(null);
    }
  }

  return (
    <main className="flex flex-1 flex-col min-h-screen pb-16">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <OddMindLogoIcon size={20} />
              <span className="font-bold">ODDMIND</span>
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <Link
              href="/mindgrid"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>MINDGRID</span>
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <div className="flex items-center gap-1.5 font-bold text-foreground tracking-wider text-sm">
              <Zap className="size-4 text-primary" />
              <span>QUICK CHALLENGES</span>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold">
              50 Puzzles
            </Badge>
          </div>

          <Link href="/mindgrid" className="text-xs text-muted-foreground hover:text-foreground">
            Detective Cases
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        {/* Quick Play Featured Banner */}
        <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-card via-card/80 to-primary/5 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md backdrop-blur">
          <div className="space-y-2 text-center md:text-left max-w-xl">
            <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider">
              5-Challenge Gauntlet
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Quick Play Mode
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Test all five cognitive areas in a balanced 5-puzzle sequence (Code Breaker, Pattern, Sequence, Optimization, Deduction). Takes approximately 3–5 minutes!
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 shrink-0 w-full sm:w-auto">
            <Button
              variant="default"
              size="lg"
              className="w-full sm:w-auto gap-2 font-bold px-8 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={startingQuickPlay}
              onClick={handleStartQuickPlay}
            >
              <Zap className="size-4" />
              <span>{startingQuickPlay ? "Preparing Gauntlet..." : "Play Quick Play (5 Puzzles)"}</span>
              <ArrowRight className="size-4" />
            </Button>
            {progress?.quickPlayStats && progress.quickPlayStats.played > 0 && (
              <span className="text-[11px] text-muted-foreground">
                High Score: <strong className="text-primary">{progress.quickPlayStats.bestScore}/100</strong> ({progress.quickPlayStats.played} runs)
              </span>
            )}
          </div>
        </div>

        {/* Cognitive Thinking Profile */}
        <ThinkingProfileCard profile={progress?.thinkingProfile} />

        {/* Challenge Library & Filters */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Layers className="size-4 text-primary" />
              <h2 className="text-base font-bold text-foreground uppercase tracking-wider text-xs">
                Challenge Library ({filteredChallenges.length})
              </h2>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  selectedCategory === "ALL"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All (50)
              </button>
              {(
                [
                  "CODE_BREAKER",
                  "PATTERN_LOGIC",
                  "SEQUENCE",
                  "OPTIMIZATION",
                  "LOGIC_DEDUCTION",
                ] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {CATEGORY_META[cat].label}
                </button>
              ))}
            </div>
          </div>

          {/* Challenges Grid */}
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 rounded-xl bg-card/30 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredChallenges.map((c) => {
                const isCompleted = progress?.completedChallengeIds.includes(c.id) ?? false;
                const meta = CATEGORY_META[c.category];
                const IconComponent = meta.icon;
                const isStarting = startingChallengeId === c.id;

                return (
                  <Card
                    key={c.id}
                    className={`flex flex-col justify-between border-border/60 bg-card/60 backdrop-blur transition-all duration-200 hover:border-primary/50 hover:bg-card/80 ${
                      isCompleted ? "border-emerald-500/30 bg-emerald-950/5" : ""
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 ${meta.color}`}
                        >
                          <IconComponent className="size-3 mr-1 inline" />
                          <span>{meta.label}</span>
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            {c.difficulty}
                          </span>
                          {isCompleted && (
                            <CheckCircle2 className="size-3.5 text-emerald-400" />
                          )}
                        </div>
                      </div>

                      <CardTitle className="text-sm font-bold text-foreground line-clamp-1">
                        {c.title}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2 leading-relaxed">
                        {c.prompt}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="py-2 space-y-2">
                      <div className="flex items-center justify-between text-[11px] bg-muted/20 px-2.5 py-1.5 rounded-md border border-border/30 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          <span>Time Limit: {c.timeLimitSec}s</span>
                        </span>
                        <span className="capitalize">{c.inputType.replace("_", " ").toLowerCase()}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2">
                      <Button
                        variant={isCompleted ? "outline" : "default"}
                        size="sm"
                        className="w-full gap-1.5 text-xs font-semibold"
                        onClick={() => handleStartChallenge(c.id)}
                        disabled={isStarting}
                      >
                        <span>{isStarting ? "Loading..." : isCompleted ? "Replay Puzzle" : "Solve Puzzle"}</span>
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
