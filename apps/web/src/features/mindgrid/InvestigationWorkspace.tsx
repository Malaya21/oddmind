"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  FileText,
  Users,
  Search,
  Calendar,
  Send,
  ArrowLeft,
  Eye,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  MoveUp,
  MoveDown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import {
  fetchMindGridSession,
  startOrResumeMindGridSession,
  unlockMindGridEvidence,
  saveMindGridHypothesis,
  saveMindGridTimeline,
  submitMindGridAccusation,
} from "@/lib/api/mindgrid-client";
import type {
  MindGridPublicCase,
  MindGridSession,
  PublicCaseEvidence,
  CaseSuspect,
  CaseTimelineEvent,
  EvidenceType,
} from "@/types/mindgrid";
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

interface InvestigationWorkspaceProps {
  caseId: string;
}

export function InvestigationWorkspace({ caseId }: InvestigationWorkspaceProps) {
  const router = useRouter();
  const { user, getIdToken } = useAuth();

  const [publicCase, setPublicCase] = useState<MindGridPublicCase | null>(null);
  const [session, setSession] = useState<MindGridSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Selected hypothesis & accusation state
  const [selectedSuspectId, setSelectedSuspectId] = useState<string>("");
  const [selectedReasoningIds, setSelectedReasoningIds] = useState<string[]>([]);
  const [timelineOrder, setTimelineOrder] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Timer state
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Load or resume session
  const loadSession = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        throw new OddMindError("NOT_AUTHENTICATED", "Please sign in to access case files.", 401);
      }

      const data = await startOrResumeMindGridSession(token, caseId);
      if (data.session.state === "SUBMITTED") {
        router.push(`/mindgrid/result/${data.session.sessionId}`);
        return;
      }

      setSession(data.session);
      setPublicCase(data.publicCase);

      // Initialize timeline order
      const initialTimelineIds = data.publicCase.timeline.map((t) => t.id);
      setTimelineOrder(data.session.hypothesis?.timelineOrder || initialTimelineIds);

      // Restore saved hypothesis if exists
      if (data.session.hypothesis) {
        setSelectedSuspectId(data.session.hypothesis.suspectId || "");
        setSelectedReasoningIds(data.session.hypothesis.supportingEvidenceIds || []);
      }
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to load case session.");
    } finally {
      setLoading(false);
    }
  }, [caseId, getIdToken, router]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

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

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  // Handle evidence unlock
  async function handleUnlockEvidence(evidenceId: string) {
    if (!session || unlockingId) return;
    setUnlockingId(evidenceId);

    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Authentication required.", 401);

      const res = await unlockMindGridEvidence(token, session.sessionId, evidenceId);
      setSession(res.session);
      setPublicCase(res.publicCase);

      // Update timeline events with newly unlocked items
      const updatedTimelineIds = res.publicCase.timeline.map((t) => t.id);
      setTimelineOrder((prev) => {
        const combined = Array.from(new Set([...prev, ...updatedTimelineIds]));
        return combined.filter((id) => updatedTimelineIds.includes(id));
      });

      toast.success(`Evidence Unlocked: ${res.unlockedEvidence.title}`);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to unlock evidence.");
    } finally {
      setUnlockingId(null);
    }
  }

  // Timeline ordering helpers
  function moveTimelineEvent(index: number, direction: "up" | "down") {
    setTimelineOrder((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index]!;
      next[index] = next[targetIndex]!;
      next[targetIndex] = temp;

      // Auto-save timeline order to session
      getIdToken().then((token) => {
        if (token && session) {
          saveMindGridTimeline(token, session.sessionId, next).catch(() => {});
        }
      });

      return next;
    });
  }

  function toggleReasoningEvidence(evId: string) {
    setSelectedReasoningIds((prev) =>
      prev.includes(evId) ? prev.filter((id) => id !== evId) : [...prev, evId],
    );
  }

  // Handle final submission
  async function handleSubmitAccusation() {
    if (!selectedSuspectId) {
      toast.error("Please select the suspect you are accusing.");
      return;
    }
    if (selectedReasoningIds.length === 0) {
      toast.error("Please select at least one supporting piece of evidence.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token || !session) {
        throw new OddMindError("NOT_AUTHENTICATED", "Authentication required.", 401);
      }

      const res = await submitMindGridAccusation(token, session.sessionId, {
        suspectId: selectedSuspectId,
        reasoningEvidenceIds: selectedReasoningIds,
        timelineOrder,
      });

      toast.success("Case accusation evaluated!");
      router.push(`/mindgrid/result/${session.sessionId}`);
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Failed to submit accusation.");
      setSubmitting(false);
    }
  }

  if (loading || !publicCase || !session) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center min-h-[60vh] gap-3">
        <Brain className="size-8 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Opening case files and physical logs...</p>
      </main>
    );
  }

  const initialPoints = publicCase.investigationPoints;
  const remainingPoints = session.investigationPointsRemaining;
  const pointsPercentage = Math.round((remainingPoints / initialPoints) * 100);

  const evidenceList = publicCase.evidenceCatalog;
  const filteredEvidence =
    selectedCategory === "ALL"
      ? evidenceList
      : evidenceList.filter((e) => e.type === selectedCategory);

  const timelineMap = new Map(publicCase.timeline.map((t) => [t.id, t]));
  const orderedTimelineEvents = timelineOrder
    .map((id) => timelineMap.get(id))
    .filter(Boolean) as CaseTimelineEvent[];

  return (
    <main className="flex flex-1 flex-col min-h-screen pb-16">
      {/* Sticky Workspace Action Bar */}
      <header className="border-b border-border/60 bg-card/70 backdrop-blur sticky top-0 z-20 shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/mindgrid"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              title="Return to Case Files"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Case #{String(publicCase.caseNumber).padStart(3, "0")}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[9px] uppercase font-bold ${
                    publicCase.difficulty === "EASY"
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                      : publicCase.difficulty === "MEDIUM"
                        ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                        : "border-destructive/40 text-destructive bg-destructive/10"
                  }`}
                >
                  {publicCase.difficulty}
                </Badge>
              </div>
              <h1 className="text-sm font-bold text-foreground line-clamp-1">
                {publicCase.title}
              </h1>
            </div>
          </div>

          {/* Points & Timer Indicators */}
          <div className="flex items-center gap-4">
            {/* Points Budget Pill */}
            <div className="flex items-center gap-2 rounded-lg bg-background/60 border border-border/60 px-3 py-1.5 shadow-xs">
              <Sparkles className="size-3.5 text-primary" />
              <div className="text-xs">
                <span className="font-bold text-foreground">{remainingPoints}</span>
                <span className="text-muted-foreground text-[10px]">/{initialPoints} Pts</span>
              </div>
            </div>

            {/* Timer Pill */}
            <div className="flex items-center gap-1.5 rounded-lg bg-background/60 border border-border/60 px-3 py-1.5 text-xs text-muted-foreground shadow-xs font-mono">
              <Clock className="size-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">{formatTime(elapsedSec)}</span>
            </div>

            <Button
              variant="default"
              size="sm"
              className="gap-1.5 text-xs font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                const element = document.getElementById("accusation-chamber");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Send className="size-3.5" />
              <span>Accuse</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Investigation Canvas */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        {/* Top Grid: Case Briefing & Initial Clues */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Briefing Scenario */}
          <Card className="lg:col-span-2 border-border/60 bg-card/50 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FileText className="size-3.5 text-primary" />
                <span>Case Briefing & Incident Report</span>
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                {publicCase.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
              <p className="text-foreground/90 font-medium leading-relaxed bg-muted/20 p-3.5 rounded-lg border border-border/30">
                {publicCase.scenario}
              </p>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  <span>Initial Verified Clues</span>
                </h3>
                <ul className="space-y-1.5 list-disc list-inside text-foreground/80 pl-1">
                  {publicCase.initialClues.map((clue) => (
                    <li key={clue.id} className="leading-normal">
                      {clue.text}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Quick Investigation Point Budget Guide */}
          <Card className="border-border/60 bg-card/50 backdrop-blur flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Brain className="size-3.5 text-primary" />
                <span>Resource Strategy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Investigation Budget</span>
                  <span className="font-bold text-foreground">{remainingPoints} points remaining</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      pointsPercentage > 40
                        ? "bg-primary"
                        : pointsPercentage > 15
                          ? "bg-amber-500"
                          : "bg-destructive"
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, pointsPercentage))}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Spend points strategically to check CCTV, inspect access logs, and interview suspects.
                Conserving points boosts your final <strong>Investigation Planning</strong> score!
              </p>
            </CardContent>
            <div className="p-4 pt-0">
              <div className="rounded-md bg-muted/30 p-2 text-[10px] text-muted-foreground border border-border/30">
                🔒 Evidence details are hidden until investigated.
              </div>
            </div>
          </Card>
        </div>

        {/* Suspects Roster */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Suspects ({publicCase.suspects.length})
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {publicCase.suspects.map((suspect) => {
              const isAccused = selectedSuspectId === suspect.id;
              return (
                <div
                  key={suspect.id}
                  onClick={() => setSelectedSuspectId(suspect.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between gap-3 ${
                    isAccused
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                      : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{suspect.name}</h3>
                        <span className="text-[11px] font-medium text-primary block">
                          {suspect.role}
                        </span>
                      </div>
                      {isAccused && (
                        <Badge variant="default" className="text-[9px] uppercase font-bold">
                          Prime Suspect
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {suspect.bio}
                    </p>
                  </div>

                  <div className="rounded-lg bg-background/60 p-2.5 border border-border/40 text-[11px]">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/80 block mb-0.5">
                      Initial Statement
                    </span>
                    <p className="text-foreground/90 italic">&ldquo;{suspect.initialStatement}&rdquo;</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Evidence Board */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Evidence Board ({publicCase.evidenceCatalog.length})
              </h2>
            </div>

            {/* Evidence Categories */}
            <div className="flex flex-wrap items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/40 text-[11px]">
              {(
                [
                  "ALL",
                  "CCTV",
                  "ACCESS_LOG",
                  "PHYSICAL_EVIDENCE",
                  "CONTRADICTION",
                  "STATEMENT",
                ] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-colors ${
                    selectedCategory === cat
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat === "ALL" ? "All Evidence" : cat.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Evidence Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvidence.map((ev) => {
              const isUnlocked = ev.isUnlocked ?? false;
              const canAfford = remainingPoints >= ev.unlockCost;
              const isUnlocking = unlockingId === ev.id;
              const isSelectedForReasoning = selectedReasoningIds.includes(ev.id);

              return (
                <Card
                  key={ev.id}
                  className={`flex flex-col justify-between border transition-all duration-200 ${
                    isUnlocked
                      ? "border-border/80 bg-card/70 shadow-xs"
                      : "border-border/40 bg-card/30"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className="text-[9px] uppercase tracking-wider font-semibold"
                      >
                        {ev.type.replace("_", " ")}
                      </Badge>
                      {isUnlocked ? (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" />
                          <span>Unlocked</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                          <Lock className="size-3" />
                          <span>{ev.unlockCost} Pts</span>
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      {ev.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="py-2 flex-1">
                    {isUnlocked && ev.description ? (
                      <div className="space-y-2">
                        <p className="text-xs text-foreground/90 leading-relaxed bg-background/50 p-2.5 rounded-md border border-border/40">
                          {ev.description}
                        </p>
                        {/* Reasoning Checkbox */}
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1 text-muted-foreground hover:text-foreground">
                          <input
                            type="checkbox"
                            checked={isSelectedForReasoning}
                            onChange={() => toggleReasoningEvidence(ev.id)}
                            className="size-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <span>Cite as supporting reasoning</span>
                        </label>
                      </div>
                    ) : (
                      <div className="rounded-md bg-muted/20 p-4 text-center text-xs text-muted-foreground border border-dashed border-border/40 flex flex-col items-center justify-center gap-1">
                        <Lock className="size-4 text-muted-foreground/60" />
                        <span>Requires investigation to uncover details</span>
                      </div>
                    )}
                  </CardContent>

                  {!isUnlocked && (
                    <div className="p-3 pt-0">
                      <Button
                        variant={canAfford ? "secondary" : "outline"}
                        size="sm"
                        className="w-full gap-1.5 text-xs font-semibold"
                        disabled={!canAfford || isUnlocking}
                        onClick={() => handleUnlockEvidence(ev.id)}
                      >
                        {isUnlocking ? (
                          <span>Investigating...</span>
                        ) : canAfford ? (
                          <>
                            <Unlock className="size-3.5 text-primary" />
                            <span>Investigate ({ev.unlockCost} Pts)</span>
                          </>
                        ) : (
                          <span>Need {ev.unlockCost} Points</span>
                        )}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* Timeline Reconstructor */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Timeline Reconstruction ({orderedTimelineEvents.length} Events)
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Use arrows to order chronological events correctly
            </span>
          </div>

          <div className="space-y-2">
            {orderedTimelineEvents.map((event, idx) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 shrink-0">
                    {event.timeLabel}
                  </span>
                  <p className="text-foreground leading-normal">{event.description}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={idx === 0}
                    onClick={() => moveTimelineEvent(idx, "up")}
                    title="Move earlier"
                  >
                    <MoveUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={idx === orderedTimelineEvents.length - 1}
                    onClick={() => moveTimelineEvent(idx, "down")}
                    title="Move later"
                  >
                    <MoveDown className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final Accusation & Reasoning Chamber */}
        <section id="accusation-chamber" className="space-y-4 pt-4 border-t border-border/60">
          <Card className="border-primary/40 bg-card/80 backdrop-blur shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Brain className="size-4" />
                <span>Hypothesis & Final Accusation Chamber</span>
              </div>
              <CardTitle className="text-base font-bold text-foreground">
                Who is responsible and what evidence proves it?
              </CardTitle>
              <CardDescription className="text-xs">
                Select your prime suspect and cite the supporting evidence pieces that prove their guilt
                and eliminate other suspects.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Accusation Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground block mb-2">
                  1. Prime Accused Suspect:
                </label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {publicCase.suspects.map((s) => {
                    const isSelected = selectedSuspectId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSuspectId(s.id)}
                        className={`text-left p-3 rounded-lg border text-xs font-medium transition-all ${
                          isSelected
                            ? "border-primary bg-primary/20 text-foreground font-bold shadow-xs"
                            : "border-border/60 bg-background/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="block font-bold text-foreground">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground">{s.role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cited Evidence Checklist */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground block mb-2">
                  2. Supporting Evidence Cited ({selectedReasoningIds.length} selected):
                </label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {publicCase.evidenceCatalog
                    .filter((e) => e.isUnlocked)
                    .map((ev) => {
                      const isChecked = selectedReasoningIds.includes(ev.id);
                      return (
                        <label
                          key={ev.id}
                          className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? "border-primary/60 bg-primary/10 text-foreground"
                              : "border-border/40 bg-background/40 text-muted-foreground"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleReasoningEvidence(ev.id)}
                            className="size-4 mt-0.5 rounded border-border text-primary focus:ring-primary"
                          />
                          <span className="font-medium leading-tight">{ev.title}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Submission CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40">
                <div className="text-xs text-muted-foreground">
                  ⚠️ Once submitted, your accusation is final and your Thinking Profile will be calculated.
                </div>

                <Button
                  variant="default"
                  size="lg"
                  className="w-full sm:w-auto font-bold gap-2 px-8 shadow-sm"
                  disabled={submitting || !selectedSuspectId}
                  onClick={handleSubmitAccusation}
                >
                  <Send className="size-4" />
                  <span>{submitting ? "Evaluating..." : "Submit Final Accusation"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
