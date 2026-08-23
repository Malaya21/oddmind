"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { DEFAULT_ROOM_SETTINGS, type RoomSettings } from "@/types";
import { RoomSettingsFields } from "@/features/lobby/settings-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth";
import { createRoom } from "@/lib/api/client";
import { OddMindError } from "@/lib/errors";
import { cn } from "@/lib/utils";

export function CreateRoomForm() {
  const router = useRouter();
  const { profile, loading, getIdToken } = useAuth();
  const [settings, setSettings] =
    useState<RoomSettings>(DEFAULT_ROOM_SETTINGS);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      const token = await getIdToken();
      if (!token) {
        throw new OddMindError("NOT_AUTHENTICATED", "Not authenticated.", 401);
      }
      const snapshot = await createRoom(token, settings);
      toast.success(`Room ${snapshot.room.roomCode} created.`);
      router.push(`/room/${snapshot.room.roomCode}`);
    } catch (error) {
      toast.error(
        error instanceof OddMindError
          ? error.message
          : "Could not create room.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Create Room</CardTitle>
          <CardDescription>
            Host a private lobby as {profile?.displayName ?? "your guest profile"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RoomSettingsFields settings={settings} onChange={setSettings} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Room"}
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
