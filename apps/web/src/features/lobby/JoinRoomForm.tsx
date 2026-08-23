"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth";
import { joinRoom } from "@/lib/api/client";
import { OddMindError } from "@/lib/errors";
import { normalizeRoomCode } from "@/lib/room-code";
import { cn } from "@/lib/utils";

export function JoinRoomForm() {
  const router = useRouter();
  const { profile, loading, getIdToken } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    setJoining(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
      }
      const snapshot = await joinRoom(token, normalizeRoomCode(roomCode));
      toast.success(`Joined room ${snapshot.room.roomCode}.`);
      router.push(`/room/${snapshot.room.roomCode}`);
    } catch (error) {
      toast.error(
        error instanceof OddMindError ? error.message : "Could not join room.",
      );
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Join Room</CardTitle>
          <CardDescription>
            Joining as {profile?.displayName ?? "your guest profile"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room code</Label>
            <Input
              id="roomCode"
              value={roomCode}
              maxLength={6}
              autoCapitalize="characters"
              className="font-mono uppercase tracking-[0.2em]"
              onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleJoin}
              disabled={joining || !roomCode.trim()}
            >
              {joining ? "Joining..." : "Join Room"}
            </Button>
            <Link href="/" className={cn(buttonVariants({ variant: "ghost" }))}>
              Back
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
