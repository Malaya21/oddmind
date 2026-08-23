"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
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
import { OddMindError } from "@/lib/errors";
import { cn } from "@/lib/utils";

export function PlayerProfileCard() {
  const {
    user,
    profile,
    loading,
    profileLoading,
    error,
    updateDisplayName,
    regenerateDisplayName,
  } = useAuth();

  const [displayNameInput, setDisplayNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const { signInAsGuest } = useAuth();

  async function handleManualSignIn() {
    setRetrying(true);
    try {
      await signInAsGuest();
      toast.success("Signed in as guest!");
    } catch (err) {
      toast.error(
        err instanceof OddMindError
          ? err.message
          : "Sign-in failed. Please refresh.",
      );
    } finally {
      setRetrying(false);
    }
  }

  if (loading && !profile) {
    return (
      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Your identity</CardTitle>
          <CardDescription>Signing you in...</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSignIn}
            disabled={retrying}
            className="w-full text-xs"
          >
            {retrying ? "Signing in..." : "Tap to Sign In as Guest"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error && !profile) {
    return (
      <Card className="border-destructive/40 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="default"
            size="sm"
            onClick={handleManualSignIn}
            disabled={retrying}
            className="w-full"
          >
            {retrying ? "Retrying..." : "Retry Guest Sign-in"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!user || !profile) {
    return (
      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Your identity</CardTitle>
          <CardDescription>Get ready to play.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="default"
            onClick={handleManualSignIn}
            disabled={retrying}
            className="w-full"
          >
            {retrying ? "Signing in..." : "Sign In as Guest"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentName = displayNameInput || profile.displayName || "";

  async function handleSave() {
    setSaving(true);
    try {
      await updateDisplayName(currentName);
      toast.success("Display name updated.");
    } catch (err) {
      const message =
        err instanceof OddMindError
          ? err.message
          : "Could not update display name.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const updated = await regenerateDisplayName();
      setDisplayNameInput(updated.displayName ?? "");
      toast.success(`Now playing as ${updated.displayName}.`);
    } catch (err) {
      const message =
        err instanceof OddMindError
          ? err.message
          : "Could not regenerate display name.";
      toast.error(message);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle>Your identity</CardTitle>
        <CardDescription>
          Signed in as a guest. Your UID is stable across refreshes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={currentName}
            placeholder={profile.displayName}
            maxLength={24}
            onChange={(event) => setDisplayNameInput(event.target.value)}
            onFocus={() => {
              if (!displayNameInput && profile.displayName) {
                setDisplayNameInput(profile.displayName);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            3–24 characters. Letters, numbers, and one space (e.g. Blue Falcon).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving || !currentName.trim()}>
            {saving ? "Saving..." : "Save name"}
          </Button>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "inline-flex items-center gap-2",
            )}
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            <RefreshCw
              className={cn("size-4", regenerating && "animate-spin")}
            />
            {regenerating ? "Generating..." : "Random name"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
