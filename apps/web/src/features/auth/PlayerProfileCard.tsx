"use client";

import { useState } from "react";
import { LogOut, RefreshCw } from "lucide-react";
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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function PlayerProfileCard() {
  const {
    user,
    profile,
    loading,
    error,
    updateDisplayName,
    regenerateDisplayName,
    signInAsGuest,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const [displayNameInput, setDisplayNameInput] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [signingInGoogle, setSigningInGoogle] = useState(false);

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

  async function handleGoogleSignIn() {
    setSigningInGoogle(true);
    try {
      const authUser = await signInWithGoogle();
      setDisplayNameInput(null);
      toast.success(`Signed in as ${authUser.email ?? "Google User"}!`);
    } catch (err) {
      console.warn("[google_signin_error]", err);
      toast.error("Google sign-in was cancelled or encountered an issue.");
    } finally {
      setSigningInGoogle(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setDisplayNameInput(null);
      await signInAsGuest();
      toast.success("Switched to guest account.");
    } catch {
      toast.error("Could not sign out.");
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
        <CardContent className="space-y-3">
          <Button
            variant="default"
            size="sm"
            onClick={handleManualSignIn}
            disabled={retrying}
            className="w-full"
          >
            {retrying ? "Retrying..." : "Retry Guest Sign-in"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoogleSignIn}
            disabled={signingInGoogle}
            className="w-full inline-flex items-center justify-center gap-2"
          >
            <GoogleIcon className="size-4" />
            <span>Sign in with Google</span>
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
        <CardContent className="space-y-3">
          <Button
            variant="default"
            onClick={handleManualSignIn}
            disabled={retrying}
            className="w-full"
          >
            {retrying ? "Signing in..." : "Sign In as Guest"}
          </Button>
          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={signingInGoogle}
            className="w-full inline-flex items-center justify-center gap-2"
          >
            <GoogleIcon className="size-4" />
            <span>Sign in with Google</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentName = displayNameInput !== null ? displayNameInput : (profile.displayName ?? "");

  async function handleSave() {
    if (!currentName.trim()) {
      toast.error("Display name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateDisplayName(currentName.trim());
      setDisplayNameInput(null);
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
      setDisplayNameInput(null);
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
        <div className="flex items-center justify-between">
          <CardTitle>Your identity</CardTitle>
          {user.email && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Google Account
            </span>
          )}
        </div>
        <CardDescription>
          {user.email ? (
            <span className="text-xs text-muted-foreground break-all">
              {user.email}
            </span>
          ) : (
            "Signed in as a guest. Your UID is stable across refreshes."
          )}
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

        <div className="pt-2 border-t border-border/40">
          {user.email ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="size-3.5" />
              <span>Sign out / Switch to guest</span>
            </button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGoogleSignIn}
              disabled={signingInGoogle}
              className="w-full inline-flex items-center justify-center gap-2 text-xs h-8"
            >
              <GoogleIcon className="size-3.5" />
              <span>{signingInGoogle ? "Connecting..." : "Sign in with Google (Optional)"}</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
