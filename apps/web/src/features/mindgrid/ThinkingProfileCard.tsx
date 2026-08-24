"use client";

import { Brain, Sparkles, ShieldCheck, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface UnifiedThinkingProfileData {
  logicalDeduction?: number;
  attentionToDetail?: number;
  evidenceEvaluation?: number;
  planning?: number;
  timelineReasoning?: number;
  contradictionDetection?: number;
  patternRecognition?: number;
  problemSolving?: number;
  decisionMaking?: number;
  totalCasesCompleted?: number;
  totalChallengesCompleted?: number;
}

interface ThinkingProfileCardProps {
  profile?: UnifiedThinkingProfileData | null;
  overallScore?: number;
  isSingleCase?: boolean;
}

const ALL_DIMENSIONS: Array<{
  key: keyof UnifiedThinkingProfileData;
  label: string;
  description: string;
  color: string;
}> = [
  {
    key: "logicalDeduction",
    label: "Logical Deduction",
    description: "Constraint reasoning and elimination logic",
    color: "bg-emerald-500",
  },
  {
    key: "patternRecognition",
    label: "Pattern Recognition",
    description: "Identifying growth rules, series, and transformations",
    color: "bg-cyan-500",
  },
  {
    key: "problemSolving",
    label: "Problem Solving",
    description: "Solving multi-variable logical optimization puzzles",
    color: "bg-blue-500",
  },
  {
    key: "decisionMaking",
    label: "Decision Making",
    description: "Choosing optimal solutions under constraints",
    color: "bg-purple-500",
  },
  {
    key: "attentionToDetail",
    label: "Attention to Detail",
    description: "Catching subtle inconsistencies and clue details",
    color: "bg-amber-500",
  },
  {
    key: "planning",
    label: "Planning & Efficiency",
    description: "Resource budgeting and execution strategy",
    color: "bg-indigo-500",
  },
  {
    key: "evidenceEvaluation",
    label: "Evidence Evaluation",
    description: "Weighting relevant clues over distractions",
    color: "bg-teal-500",
  },
  {
    key: "timelineReasoning",
    label: "Timeline Reasoning",
    description: "Chronological sequence reconstruction",
    color: "bg-violet-500",
  },
  {
    key: "contradictionDetection",
    label: "Contradiction Detection",
    description: "Spotting false statements vs. sensor logs",
    color: "bg-rose-500",
  },
];

export function ThinkingProfileCard({
  profile,
  overallScore,
  isSingleCase = false,
}: ThinkingProfileCardProps) {
  const casesCompleted =
    (profile?.totalCasesCompleted ?? 0) + (profile?.totalChallengesCompleted ?? 0);
  const hasData = profile && (isSingleCase || casesCompleted > 0);

  // Active dimensions that have values
  const activeDimensions = ALL_DIMENSIONS.filter(
    (dim) => profile && typeof profile[dim.key] === "number" && (profile[dim.key] as number) > 0,
  );

  // Fallback to top 6 primary dimensions if none specific
  const displayedDimensions =
    activeDimensions.length > 0
      ? activeDimensions
      : ALL_DIMENSIONS.slice(0, 6);

  const calculatedOverall =
    overallScore ??
    (profile && activeDimensions.length > 0
      ? Math.round(
          activeDimensions.reduce((acc, dim) => acc + ((profile[dim.key] as number) || 0), 0) /
            activeDimensions.length,
        )
      : 0);

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Brain className="size-4 text-primary" />
              <span>MindGrid Game-based Thinking Profile</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {isSingleCase
                ? "Cognitive performance profile calculated for this scenario"
                : casesCompleted > 0
                  ? `Aggregated performance across ${casesCompleted} completed case${casesCompleted === 1 ? "" : "s"} & puzzle${casesCompleted === 1 ? "" : "s"}`
                  : "Complete your first detective case or quick challenge to unlock your thinking profile."}
            </CardDescription>
          </div>

          {hasData && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                  Thinking Score
                </span>
                <span className="text-2xl font-black text-primary tracking-tight">
                  {calculatedOverall}
                  <span className="text-xs font-normal text-muted-foreground">/100</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {hasData ? (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedDimensions.map((dim) => {
              const val = (profile?.[dim.key] as number) ?? 0;
              return (
                <div
                  key={dim.key}
                  className="rounded-lg border border-border/40 bg-background/50 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-foreground font-semibold">{dim.label}</span>
                    <span className="font-bold text-foreground">{val}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${dim.color}`}
                      style={{ width: `${Math.max(4, Math.min(100, val))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {dim.description}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground space-y-2">
            <Sparkles className="size-6 mx-auto text-muted-foreground/60" />
            <p className="font-medium text-foreground">No Puzzles or Cases Completed Yet</p>
            <p>
              Play a Detective Case or solve Quick Challenges to uncover patterns, deduce constraints,
              and build your game-based thinking profile.
            </p>
          </div>
        )}

        {/* Mandatory Educational Disclaimer */}
        <div className="flex items-start gap-2 rounded-md bg-muted/30 p-2.5 text-[11px] text-muted-foreground border border-border/30">
          <HelpCircle className="size-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
          <span>
            <strong>Disclaimer:</strong> This profile reflects performance in MindGrid game scenarios and is not a scientifically validated psychological or intelligence assessment.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
