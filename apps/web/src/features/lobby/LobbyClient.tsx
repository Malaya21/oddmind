"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, Save } from "lucide-react";
import { toast } from "sonner";
import type { Room, RoomPlayer, RoomSettings } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth";
import {
  closeRoom,
  fetchRoomSnapshot,
  leaveRoom,
  startGame,
  updateRoomSettings,
} from "@/lib/api/client";
import { OddMindError } from "@/lib/errors";
import { FirebaseGameRealtimeService } from "@/infrastructure/firebase/realtime/FirebaseGameRealtimeService";
import {
  RoomSettingsFields,
  oddPlayerModeLabel,
} from "@/features/lobby/settings-form";

interface LobbyClientProps {
  roomCode: string;
}

function settingRows(settings: RoomSettings): Array<[string, string]> {
  return [
    ["Minimum Players", String(settings.minPlayers)],
    ["Maximum Players", String(settings.maxPlayers)],
    ["Rounds", String(settings.rounds)],
    ["Clue Time", `${settings.clueDurationSec} sec`],
    ["Discussion", `${settings.discussionDurationSec} sec`],
    ["Voting", `${settings.votingDurationSec} sec`],
    ["Odd Players", oddPlayerModeLabel(settings.oddPlayerMode)],
  ];
}

export function LobbyClient({ roomCode }: LobbyClientProps) {
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<RoomSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHost = Boolean(user && room?.hostUid === user.uid);
  const canStart = Boolean(room && room.playerCount >= room.settings.minPlayers);
  const realtimeService = useMemo(() => new FirebaseGameRealtimeService(), []);

  useEffect(() => {
    if (room?.status === "IN_PROGRESS" && room?.gameId) {
      router.push(`/game/${room.gameId}`);
    }
  }, [room?.status, room?.gameId, router]);

  useEffect(() => {
    if (room?.status === "CANCELLED") {
      toast.error("This room was closed by the host.");
      router.push("/");
    }
  }, [room?.status, router]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) {
          throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
        }
        const snapshot = await fetchRoomSnapshot(token, roomCode);
        if (cancelled) {
          return;
        }
        setRoom(snapshot.room);
        setPlayers(snapshot.players);
        setSettingsDraft(snapshot.room.settings);
        unsubscribe = realtimeService.subscribeToRoom(
          snapshot.room.id,
          (nextRoom, nextPlayers) => {
            setRoom(nextRoom);
            setPlayers(nextPlayers);
            setSettingsDraft((current) => current ?? nextRoom.settings);
          },
        );
      } catch (err) {
        const message =
          err instanceof OddMindError ? err.message : "Could not load room.";
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [getIdToken, realtimeService, roomCode]);

  async function handleCopy() {
    if (!room) {
      return;
    }
    await navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    toast.success("Room code copied.");
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
      }
      await leaveRoom(token, roomCode);
      router.push("/");
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Could not leave.");
    } finally {
      setLeaving(false);
    }
  }

  async function handleSaveSettings() {
    if (!settingsDraft) {
      return;
    }
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
      }
      const updated = await updateRoomSettings(token, roomCode, settingsDraft);
      setRoom(updated);
      setSettingsDraft(updated.settings);
      toast.success("Room settings saved.");
    } catch (err) {
      toast.error(
        err instanceof OddMindError
          ? err.message
          : "Could not save room settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStartGame() {
    setStarting(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
      }
      const result = await startGame(token, roomCode);
      toast.success("Game is starting!");
      router.push(`/game/${result.gameId}`);
    } catch (err) {
      toast.error(
        err instanceof OddMindError ? err.message : "Could not start game.",
      );
      setStarting(false);
    }
  }

  async function handleCloseRoom() {
    setClosing(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
      }
      await closeRoom(token, roomCode);
      toast.success("Room closed.");
      router.push("/");
    } catch (err) {
      toast.error(
        err instanceof OddMindError ? err.message : "Could not close room.",
      );
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-12">
        <p className="text-sm text-muted-foreground">Loading lobby...</p>
      </main>
    );
  }

  if (error || !room || !settingsDraft) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-12">
        <Card className="w-full border-destructive/40 bg-card/50">
          <CardHeader>
            <CardTitle>Lobby unavailable</CardTitle>
            <CardDescription>{error ?? "Room not found."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")}>Back home</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.35em] text-muted-foreground">
            ODDMIND
          </p>
          <h1 className="mt-2 text-3xl font-bold">Room Lobby</h1>
        </div>
        <div className="flex items-center gap-2">
          {isHost ? (
            <Button
              variant="destructive"
              onClick={handleCloseRoom}
              disabled={closing}
            >
              <LogOut className="size-4 mr-1" />
              {closing ? "Closing..." : "Close Room"}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleLeave} disabled={leaving}>
              <LogOut className="size-4 mr-1" />
              {leaving ? "Leaving..." : "Leave"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="border-border/60 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardDescription>Room Code</CardDescription>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="font-mono text-5xl tracking-[0.18em]">
                {room.roomCode}
              </CardTitle>
              <Button variant="secondary" onClick={handleCopy}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy Code"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <p className="text-sm text-muted-foreground">Players</p>
                <p className="text-2xl font-semibold">
                  {players.length} / {room.settings.maxPlayers}
                </p>
              </div>
              <Badge variant={room.status === "LOBBY" ? "secondary" : "outline"}>
                {room.status}
              </Badge>
            </div>

            <ul className="space-y-3">
              {players.map((player) => (
                <li
                  key={player.uid}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="truncate">{player.displayName}</span>
                  </span>
                  {player.isHost && <Badge variant="outline">Host</Badge>}
                </li>
              ))}
            </ul>

            {isHost ? (
              <Button
                className="w-full"
                disabled={!canStart || starting}
                onClick={handleStartGame}
              >
                {starting
                  ? "Starting..."
                  : canStart
                    ? "Start Game"
                    : `Need at least ${room.settings.minPlayers} players (${players.length}/${room.settings.minPlayers})`}
              </Button>
            ) : (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center text-sm text-muted-foreground">
                {canStart
                  ? "Waiting for host to start the game..."
                  : `Waiting for players (${players.length}/${room.settings.minPlayers})`}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Room Settings</CardTitle>
            <CardDescription>
              {isHost ? "Host controls are active." : "Configured by the host."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isHost ? (
              <>
                <RoomSettingsFields
                  settings={settingsDraft}
                  onChange={setSettingsDraft}
                  disabled={saving}
                />
                <Button
                  variant="secondary"
                  onClick={handleSaveSettings}
                  disabled={saving}
                >
                  <Save />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </>
            ) : (
              <dl className="grid gap-3">
                {settingRows(room.settings).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 border-b border-border/50 pb-2 last:border-b-0"
                  >
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
