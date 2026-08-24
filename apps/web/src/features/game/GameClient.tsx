"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContextProvider";
import {
  fetchPlayerGameView,
  advanceGamePhase,
  submitClue,
  submitVote,
  leaveGame,
} from "@/lib/api/client";
import { FirebaseGameRealtimeService } from "@/infrastructure/firebase/realtime/FirebaseGameRealtimeService";
import { webRtcVoiceService } from "@/infrastructure/webrtc/WebRtcVoiceService";
import type { Game, PlayerGameView, GamePhase } from "@/types";
import { OddMindError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  EyeOff,
  Flame,
  HelpCircle,
  History,
  LogOut,
  MessageSquare,
  Mic,
  Radio,
  Send,
  ShieldAlert,
  ShieldCheck,
  Skull,
  Sparkles,
  Trophy,
  Users,
  Vote as VoteIcon,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { MicController } from "@/features/game/MicController";
import { GameChat } from "@/features/game/GameChat";

interface GameClientProps {
  gameId: string;
}

function formatPhaseTitle(phase: GamePhase, currentRound: number): string {
  switch (phase) {
    case "WORD_ASSIGNMENT":
      return "Secret Word Assignment";
    case "CLUE_PHASE":
      return `Cycle ${currentRound} — Clue Submission`;
    case "DISCUSSION_PHASE":
      return `Cycle ${currentRound} — Discussion & Voice`;
    case "VOTING_PHASE":
      return `Cycle ${currentRound} — Elimination Voting`;
    case "VOTE_REVEAL":
      return `Cycle ${currentRound} — Vote Breakdown`;
    case "ELIMINATION":
      return `Cycle ${currentRound} — Elimination`;
    case "FINAL_RESULT":
    case "GAME_OVER":
      return "Match Complete — Final Results";
    default:
      return phase;
  }
}

export function GameClient({ gameId }: GameClientProps) {
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const [view, setView] = useState<PlayerGameView | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordRevealed, setWordRevealed] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [advancing, setAdvancing] = useState(false);

  // Gameplay input states
  const [clueInput, setClueInput] = useState("");
  const [submittingClue, setSubmittingClue] = useState(false);
  const [votedTargetUid, setVotedTargetUid] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Voice & Speaking states
  const [isMySpeaking, setIsMySpeaking] = useState(false);
  const [remoteSpeakingMap, setRemoteSpeakingMap] = useState<Record<string, boolean>>({});
  const [isAudioDeafened, setIsAudioDeafened] = useState(false);

  const toggleMasterAudio = useCallback(() => {
    const nextDeafened = !isAudioDeafened;
    setIsAudioDeafened(nextDeafened);
    webRtcVoiceService.setMasterMuted(nextDeafened);
    if (nextDeafened) {
      toast.info("Incoming voice chat muted.");
    } else {
      toast.info("Incoming voice chat unmuted.");
    }
  }, [isAudioDeafened]);

  const realtimeService = useMemo(() => new FirebaseGameRealtimeService(), []);

  const loadView = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
      }
      const data = await fetchPlayerGameView(token, gameId);
      setView(data);
    } catch (err) {
      const message =
        err instanceof OddMindError ? err.message : "Could not load game.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [gameId, getIdToken]);

  useEffect(() => {
    loadView();
  }, [loadView]);

  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToGame(
      gameId,
      (updatedGame) => {
        setGame(updatedGame);
        loadView();
      },
    );
    return () => unsubscribe();
  }, [gameId, realtimeService, loadView]);

  // WebRTC Voice Listener setup
  useEffect(() => {
    const unsubscribeSpeaking = webRtcVoiceService.onRemoteSpeaking(
      (peerUid, isSpeaking) => {
        setRemoteSpeakingMap((prev) => ({
          ...prev,
          [peerUid]: isSpeaking,
        }));
      },
    );

    return () => {
      unsubscribeSpeaking();
      webRtcVoiceService.leaveVoice();
    };
  }, []);

  const localStreamRef = useRef<MediaStream | null>(null);

  // Sync WebRTC peer list when active players are loaded
  useEffect(() => {
    if (view?.activePlayerIds && user?.uid) {
      webRtcVoiceService.joinVoice(gameId, user.uid, view.activePlayerIds, localStreamRef.current, getIdToken);
    }
  }, [gameId, user?.uid, view?.activePlayerIds, getIdToken]);

  const handleStreamChange = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream;
    webRtcVoiceService.updateLocalStream(stream);
  }, []);

  // Phase countdown timer
  const phaseEndsAt = game?.phaseEndsAt ?? view?.phaseEndsAt;
  const currentPhase = game?.phase ?? view?.phase;

  useEffect(() => {
    if (!phaseEndsAt) return;

    const interval = setInterval(() => {
      const targetTime = new Date(phaseEndsAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((targetTime - now) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0 && currentPhase && currentPhase !== "GAME_OVER" && !advancing) {
        setAdvancing(true);
        getIdToken().then((token) => {
          if (!token) return;
          advanceGamePhase(token, gameId, currentPhase)
            .then(() => {
              loadView();
            })
            .catch(() => {})
            .finally(() => {
              setAdvancing(false);
            });
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phaseEndsAt, currentPhase, gameId, advancing, getIdToken, loadView]);

  // Reset inputs when phase transitions
  useEffect(() => {
    if (currentPhase === "CLUE_PHASE") {
      setClueInput("");
    } else if (currentPhase === "VOTING_PHASE") {
      setVotedTargetUid(null);
    }
  }, [currentPhase]);

  // Handlers
  async function handleClueSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clueInput.trim() || view?.isEliminated) return;

    setSubmittingClue(true);
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
      await submitClue(token, gameId, clueInput.trim());
      toast.success("Clue submitted!");
      await loadView();
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Could not submit clue.");
    } finally {
      setSubmittingClue(false);
    }
  }

  async function handleVoteSubmit(targetUid: string) {
    if (submittingVote || votedTargetUid || view?.isEliminated) return;

    setSubmittingVote(true);
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
      await submitVote(token, gameId, targetUid);
      setVotedTargetUid(targetUid);
      toast.success("Vote cast successfully!");
      await loadView();
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Could not submit vote.");
    } finally {
      setSubmittingVote(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      const token = await getIdToken();
      if (token) {
        await leaveGame(token, gameId);
      }
      webRtcVoiceService.leaveVoice();
      router.push("/");
    } catch {
      router.push("/");
    } finally {
      setLeaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-16">
        <p className="text-sm text-muted-foreground">Loading game arena...</p>
      </main>
    );
  }

  if (error || !view) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full border-destructive/40 bg-card/50">
          <CardHeader>
            <CardTitle>Error Loading Match</CardTitle>
            <CardDescription>{error ?? "Match view could not be retrieved."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} variant="outline" className="w-full">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isEliminated = view.isEliminated;
  const activePlayers = view.players.filter((p) => view.activePlayerIds.includes(p.uid));
  const eliminatedPlayers = view.players.filter((p) => view.eliminatedPlayerIds.includes(p.uid));
  const latestElimination = view.eliminationHistory[view.eliminationHistory.length - 1];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-widest text-primary">ODDMIND</span>
            <Badge variant="outline" className="text-xs">
              Continuous Elimination
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="gap-1 bg-emerald-950/40 text-emerald-400 border-emerald-500/30">
              <Users className="size-3" />
              <span>{view.activePlayerIds.length} Alive</span>
            </Badge>
            {view.eliminatedPlayerIds.length > 0 && (
              <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive border-destructive/30">
                <Skull className="size-3" />
                <span>{view.eliminatedPlayerIds.length} Eliminated</span>
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Master Incoming Audio Deafen / Mute Toggle */}
          <Button
            variant={isAudioDeafened ? "outline" : "secondary"}
            size="sm"
            onClick={toggleMasterAudio}
            className={`gap-1.5 text-xs font-medium ${
              isAudioDeafened
                ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "border-border/80 bg-card/60 hover:bg-card text-foreground"
            }`}
            title={isAudioDeafened ? "Unmute incoming voice chat" : "Mute incoming voice chat"}
          >
            {isAudioDeafened ? (
              <>
                <VolumeX className="size-3.5 text-destructive" />
                <span>Audio Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-primary" />
                <span>Audio On</span>
              </>
            )}
          </Button>

          <MicController
            isEliminated={isEliminated}
            onSpeakingChange={setIsMySpeaking}
            onStreamChange={handleStreamChange}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeave}
            disabled={leaving}
            className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
          >
            <LogOut className="size-3.5" />
            <span>Leave</span>
          </Button>
        </div>
      </header>

      {/* Spectator Alert Banner */}
      {isEliminated && currentPhase !== "GAME_OVER" && currentPhase !== "FINAL_RESULT" && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive shadow-sm">
          <ShieldAlert className="size-5 shrink-0" />
          <div className="text-xs">
            <strong className="font-semibold block">YOU HAVE BEEN ELIMINATED</strong>
            <span>You are now spectating. You can watch clues, votes, and listen to the remaining survivors.</span>
          </div>
        </div>
      )}

      {/* Secret Word Card (Sticky top bar for players) */}
      {view.myWord && !isEliminated && (
        <Card className="border-primary/30 bg-primary/5 shadow-inner backdrop-blur">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-3.5 px-5">
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-primary" />
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Your Secret Word
                </div>
                <div className="font-mono text-xl font-extrabold tracking-wide text-primary">
                  {wordRevealed ? view.myWord : "••••••••"}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWordRevealed(!wordRevealed)}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {wordRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              <span>{wordRevealed ? "Hide" : "Reveal"}</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Arena Container */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Main Phase View */}
        <div className="space-y-6 lg:col-span-2">
          {/* Phase Header Card */}
          <Card className="border-border/60 bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">
                  {formatPhaseTitle(currentPhase ?? "CLUE_PHASE", view.currentRound)}
                </CardTitle>
                <CardDescription className="text-xs">
                  {currentPhase === "CLUE_PHASE" && "Give a subtle single-word or short clue relating to your secret word."}
                  {currentPhase === "DISCUSSION_PHASE" && "Discuss the submitted clues using voice or text chat. Uncover the Odd player."}
                  {currentPhase === "VOTING_PHASE" && "Cast your vote for the player you believe is the Odd player."}
                  {currentPhase === "VOTE_REVEAL" && "Tallying all cast votes across the surviving players."}
                  {currentPhase === "ELIMINATION" && "A player has been eliminated from the match."}
                  {currentPhase === "FINAL_RESULT" && "Match has concluded! Discover the winner and word pair below."}
                </CardDescription>
              </div>

              {secondsRemaining > 0 && currentPhase !== "GAME_OVER" && (
                <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono font-semibold text-primary">
                  <Clock className="size-3.5 animate-spin" />
                  <span>{secondsRemaining}s</span>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* PHASE 1: CLUE_PHASE */}
          {currentPhase === "CLUE_PHASE" && (
            <Card className="border-border/60 bg-card/40">
              <CardContent className="pt-6 space-y-4">
                {isEliminated ? (
                  <div className="text-center py-6 text-muted-foreground text-sm space-y-1">
                    <Skull className="size-8 text-muted-foreground/60 mx-auto" />
                    <p className="font-semibold text-foreground">Waiting for survivors to submit clues...</p>
                    <p className="text-xs">Eliminated players cannot submit clues.</p>
                  </div>
                ) : view.myClueSubmitted ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-emerald-400">
                    <CheckCircle2 className="size-8" />
                    <span className="text-sm font-semibold">Clue Submitted! Waiting for other survivors...</span>
                  </div>
                ) : (
                  <form onSubmit={handleClueSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Your Clue</label>
                      <Input
                        value={clueInput}
                        onChange={(e) => setClueInput(e.target.value)}
                        placeholder="e.g. Warm, Morning, Brown..."
                        maxLength={50}
                        disabled={submittingClue}
                        className="bg-background/60 font-medium"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Be subtle! If your clue is too obvious, the Odd player will figure out the majority word.
                      </p>
                    </div>
                    <Button type="submit" disabled={submittingClue || !clueInput.trim()} className="w-full">
                      {submittingClue ? "Submitting..." : "Submit Clue"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* PHASE 2: DISCUSSION_PHASE */}
          {currentPhase === "DISCUSSION_PHASE" && (
            <div className="space-y-4">
              <Card className="border-emerald-500/30 bg-emerald-950/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <Radio className="size-4 animate-pulse" />
                    <span>Voice Chat & Discussion Open. Speak with other survivors or use text chat.</span>
                  </div>
                </CardContent>
              </Card>

              {/* Clues Review List */}
              <Card className="border-border/60 bg-card/40">
                <CardHeader className="py-3 px-4 border-b border-border/40">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Submitted Clues in Cycle {view.currentRound}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5">
                  {view.clues.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">No clues submitted.</p>
                  ) : (
                    view.clues.map((c) => (
                      <div
                        key={c.uid}
                        className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border/40"
                      >
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-primary" />
                          <span className="text-xs font-semibold text-foreground">{c.displayName}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                          &quot;{c.text}&quot;
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* PHASE 3: VOTING_PHASE */}
          {currentPhase === "VOTING_PHASE" && (
            <Card className="border-border/60 bg-card/40">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Select a Survivor to Eliminate</CardTitle>
                <CardDescription className="text-xs">
                  {isEliminated
                    ? "You are spectating. Only active survivors can cast votes."
                    : votedTargetUid
                      ? "Vote cast! Waiting for other survivors to vote..."
                      : "Choose carefully. The player with the highest votes will be eliminated."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2.5 sm:grid-cols-2">
                {activePlayers
                  .filter((p) => p.uid !== user?.uid)
                  .map((player) => (
                    <Button
                      key={player.uid}
                      variant={votedTargetUid === player.uid ? "default" : "outline"}
                      disabled={isEliminated || submittingVote || Boolean(votedTargetUid)}
                      onClick={() => handleVoteSubmit(player.uid)}
                      className="h-14 justify-start px-4 text-left border-border/60"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                          <VoteIcon className="size-4 text-primary" />
                          <span className="font-medium text-xs text-foreground">{player.displayName}</span>
                        </div>
                        {votedTargetUid === player.uid && (
                          <Badge variant="secondary" className="text-[10px] bg-primary text-primary-foreground">
                            Voted
                          </Badge>
                        )}
                      </div>
                    </Button>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* PHASE 4: VOTE_REVEAL */}
          {currentPhase === "VOTE_REVEAL" && (
            <Card className="border-border/60 bg-card/40">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Vote Breakdown</CardTitle>
                <CardDescription className="text-xs">Votes cast by the survivors:</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activePlayers.map((player) => {
                  const voteCount = view.voteResults?.counts[player.uid] ?? 0;
                  return (
                    <div
                      key={player.uid}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20"
                    >
                      <span className="text-xs font-semibold text-foreground">{player.displayName}</span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {voteCount} {voteCount === 1 ? "vote" : "votes"}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* PHASE 5: ELIMINATION */}
          {currentPhase === "ELIMINATION" && latestElimination && (
            <Card className="border-destructive/40 bg-destructive/5 text-center py-6 px-4 space-y-4">
              <Skull className="size-12 text-destructive mx-auto animate-bounce" />
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-foreground">{latestElimination.displayName}</h3>
                <p className="text-xs text-destructive font-medium">
                  Has been eliminated with {latestElimination.votesReceived} votes.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {view.activePlayerIds.length <= 2
                  ? "Only 2 survivors remain. Determining final match outcome..."
                  : "Advancing to next elimination cycle..."}
              </p>
            </Card>
          )}

          {/* PHASE 6: FINAL_RESULT / GAME_OVER */}
          {(currentPhase === "FINAL_RESULT" || currentPhase === "GAME_OVER") && (
            <div className="space-y-6">
              {/* Winner Announcement Card */}
              <Card
                className={`border-2 p-6 text-center ${
                  view.winner === "NORMAL"
                    ? "border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_24px_rgba(16,185,129,0.2)]"
                    : "border-purple-500/60 bg-purple-950/20 shadow-[0_0_24px_rgba(168,85,247,0.2)]"
                }`}
              >
                <Trophy
                  className={`size-14 mx-auto mb-2 ${
                    view.winner === "NORMAL" ? "text-emerald-400" : "text-amber-400"
                  }`}
                />
                <h2 className="text-2xl font-extrabold tracking-tight">
                  {view.winner === "NORMAL" ? "NORMAL PLAYERS WIN!" : "ODD PLAYER WINS!"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">{view.winReason}</p>
              </Card>

              {/* Secret Words Reveal */}
              <Card className="border-border/60 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Secret Words Revealed</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="p-3.5 rounded-lg bg-muted/40 border border-border/40">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Majority Word</div>
                    <div className="text-lg font-bold font-mono text-foreground mt-1">
                      {view.majorityWordRevealed ?? "—"}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-muted/40 border border-border/40">
                    <div className="text-[10px] uppercase font-bold text-primary">Odd Player Word</div>
                    <div className="text-lg font-bold font-mono text-primary mt-1">
                      {view.oddWordRevealed ?? "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Elimination History Timeline */}
              {view.eliminationHistory.length > 0 && (
                <Card className="border-border/60 bg-card/50">
                  <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <History className="size-4 text-muted-foreground" />
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Elimination Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {view.eliminationHistory.map((event) => (
                      <div
                        key={event.roundNumber}
                        className="flex items-center justify-between p-2.5 rounded bg-muted/30 border border-border/30 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            Cycle {event.roundNumber}
                          </Badge>
                          <span className="font-medium text-foreground">{event.displayName}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{event.votesReceived} votes</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Button onClick={() => router.push("/")} className="w-full" size="lg">
                Return to Lobby / Home
              </Button>
            </div>
          )}
        </div>

        {/* Right Col: Chat & Survivor Roster */}
        <div className="space-y-6">
          {/* Real-time Text Chat */}
          <GameChat
            gameId={gameId}
            roundNumber={view.currentRound}
            isEliminated={isEliminated}
            getIdToken={getIdToken}
          />

          {/* Survivor & Spectator Roster */}
          <Card className="border-border/60 bg-card/50">
            <CardHeader className="py-2.5 px-4 border-b border-border/40">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Roster ({view.players.length})</span>
                <span className="text-emerald-400 font-normal">{activePlayers.length} alive</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {view.players.map((p) => {
                const isAlive = view.activePlayerIds.includes(p.uid);
                const isMe = p.uid === user?.uid;
                const isSpeaking = remoteSpeakingMap[p.uid] || (isMe && isMySpeaking);

                return (
                  <div
                    key={p.uid}
                    className={`flex items-center justify-between p-2 rounded border text-xs transition-all ${
                      isSpeaking
                        ? "border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                        : !isAlive
                          ? "border-border/20 bg-muted/10 opacity-50"
                          : "border-border/40 bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isAlive ? (
                        <div className="size-2 rounded-full bg-emerald-400" />
                      ) : (
                        <Skull className="size-3 text-destructive" />
                      )}
                      <span className={`font-medium ${isMe ? "text-primary font-bold" : "text-foreground"}`}>
                        {p.displayName} {isMe && "(You)"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSpeaking && isAlive && (
                        <span className="text-[10px] text-emerald-400 animate-pulse font-semibold flex items-center gap-0.5">
                          <Mic className="size-2.5" /> Speaking
                        </span>
                      )}
                      {!isAlive && (
                        <span className="text-[10px] text-destructive font-medium">Eliminated</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
