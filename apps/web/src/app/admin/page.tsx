"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Crown,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Users,
  ArrowLeft,
  XCircle,
  Activity,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth";
import {
  adminLogin,
  adminPurgeAll,
  adminCleanDb,
  adminGetStatus,
  type AdminStatusData,
} from "@/lib/api/client";
import { OddMindError } from "@/lib/errors";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const { user, getIdToken, signOut } = useAuth();
  const [email, setEmail] = useState("sahomalaya21@gmail.com");
  const [passcode, setPasscode] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [purging, setPurging] = useState(false);
  const [cleaningDb, setCleaningDb] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusData, setStatusData] = useState<AdminStatusData | null>(null);
  const [localAdminEmail, setLocalAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("oddmind_email");
      if (stored) setLocalAdminEmail(stored);
    }
  }, []);

  const isAdmin =
    user?.email?.toLowerCase() === "sahomalaya21@gmail.com" ||
    localAdminEmail?.toLowerCase() === "sahomalaya21@gmail.com";

  useEffect(() => {
    if (isAdmin) {
      fetchStatus();
    }
  }, [isAdmin]);

  async function fetchStatus(overrideToken?: string) {
    setLoadingStatus(true);
    try {
      const token =
        overrideToken ||
        (await getIdToken()) ||
        (typeof window !== "undefined"
          ? localStorage.getItem("oddmind_id_token")
          : null);
      if (!token) return;
      const data = await adminGetStatus(token);
      setStatusData(data);
    } catch (err) {
      console.warn("[Admin status fetch warning]:", err);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await adminLogin(email, passcode);
      if (res?.idToken) {
        if (typeof window !== "undefined") {
          localStorage.setItem("oddmind_id_token", res.idToken);
          localStorage.setItem("oddmind_uid", res.uid);
          localStorage.setItem("oddmind_email", res.email);
        }
        setLocalAdminEmail(res.email);
        toast.success("Authenticated as Super Admin (sahomalaya21@gmail.com)!");
        await fetchStatus(res.idToken);
      }
    } catch (err) {
      toast.error(
        err instanceof OddMindError ? err.message : "Invalid admin credentials.",
      );
    } finally {
      setLoggingIn(false);
    }
  }

  async function handlePurgeAll() {
    if (
      !confirm(
        "⚠️ DANGER: Are you sure you want to REVOKE and PURGE all active rooms, games, and player sessions across the database?",
      )
    ) {
      return;
    }

    setPurging(true);
    try {
      const token =
        (await getIdToken()) ||
        (typeof window !== "undefined"
          ? localStorage.getItem("oddmind_id_token")
          : null);
      if (!token)
        throw new OddMindError("NOT_AUTHENTICATED", "Admin auth missing.", 401);
      const res = await adminPurgeAll(token);
      toast.success(
        `Database Purged: ${res.membershipsPurged} sessions, ${res.roomsCancelled} rooms, ${res.gamesAbandoned} games revoked!`,
      );
      fetchStatus();
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Purge failed.");
    } finally {
      setPurging(false);
    }
  }

  async function handleCleanDb() {
    if (
      !confirm(
        "🚨 PERMANENT DELETION: This will delete ALL rooms, games, and test records in Firebase to maintain 100% clean space. Are you sure?",
      )
    ) {
      return;
    }

    setCleaningDb(true);
    try {
      const token =
        (await getIdToken()) ||
        (typeof window !== "undefined"
          ? localStorage.getItem("oddmind_id_token")
          : null);
      if (!token)
        throw new OddMindError("NOT_AUTHENTICATED", "Admin auth missing.", 401);
      const res = await adminCleanDb(token);
      toast.success(
        `Firebase Cleaned: Wiped ${res.totalDeletedDocs} documents across collections! Space is now 100% clear.`,
      );
      fetchStatus();
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Clean failed.");
    } finally {
      setCleaningDb(false);
    }
  }

  async function handleSignOut() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("oddmind_email");
      localStorage.removeItem("oddmind_id_token");
      localStorage.removeItem("oddmind_uid");
    }
    setLocalAdminEmail(null);
    setStatusData(null);
    await signOut();
    window.location.href = "/";
  }

  return (
    <main className="flex flex-1 flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <div className="flex items-center gap-2">
              <Crown className="size-4 text-amber-400" />
              <span className="font-semibold text-sm text-foreground">
                OddMind Admin Console
              </span>
            </div>
          </div>

          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1.5"
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </Button>
          )}
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-start gap-8 px-4 py-10 sm:px-6">
        {!isAdmin ? (
          /* Admin Login Box */
          <div className="mx-auto w-full max-w-md space-y-6 pt-10">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
                <KeyRound className="size-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Super Admin Login
              </h1>
              <p className="text-xs text-muted-foreground">
                Restricted area. Please authenticate as{" "}
                <code className="text-amber-300 font-mono">
                  sahomalaya21@gmail.com
                </code>
                .
              </p>
            </div>

            <Card className="border-amber-500/30 bg-card/60 backdrop-blur shadow-lg">
              <CardContent className="pt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Admin Email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sahomalaya21@gmail.com"
                      className="bg-background/80 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Admin Passcode
                    </label>
                    <Input
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter admin passcode"
                      className="bg-background/80 text-sm"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loggingIn}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm"
                  >
                    {loggingIn ? "Authenticating..." : "Unlock Admin Dashboard"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Full Admin Dashboard */
          <div className="space-y-6">
            {/* Header banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 backdrop-blur">
              <div className="flex items-center gap-3">
                <Crown className="size-6 text-amber-400" />
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    Super Admin Console
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs">
                      sahomalaya21@gmail.com
                    </Badge>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Live system authority and session control.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchStatus()}
                  disabled={loadingStatus}
                  className="h-8 text-xs border-border/80 gap-1.5"
                >
                  <RefreshCw
                    className={cn("size-3.5", loadingStatus && "animate-spin")}
                  />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card className="border-border/60 bg-card/40">
                <CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Active Rooms
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {statusData ? statusData.activeRoomsCount : "—"}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/40">
                <CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Active Games
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {statusData ? statusData.activeGamesCount : "—"}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/40">
                <CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Locked Sessions
                  </div>
                  <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
                    {statusData ? statusData.activeMembershipsCount : "—"}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/40">
                <CardContent className="p-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Total Rooms
                  </div>
                  <div className="text-2xl font-bold font-mono text-foreground mt-1">
                    {statusData ? statusData.totalRoomsCount : "—"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Database Management & Cleanup */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Emergency Session Reset */}
              <Card className="border-amber-500/40 bg-amber-950/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <ShieldAlert className="size-5" />
                    <CardTitle className="text-sm font-bold">
                      Revoke Active Sessions
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Cancels running rooms, terminates active games, and releases session locks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={handlePurgeAll}
                    disabled={purging}
                    className="gap-2 font-semibold text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/40 w-full"
                  >
                    <RefreshCw className={cn("size-3.5", purging && "animate-spin")} />
                    <span>
                      {purging ? "Purging Sessions..." : "PURGE ACTIVE SESSIONS"}
                    </span>
                  </Button>
                </CardContent>
              </Card>

              {/* Complete Database Wipe */}
              <Card className="border-destructive/40 bg-destructive/10 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <Trash2 className="size-5" />
                    <CardTitle className="text-sm font-bold">
                      Remove All Data (Clear Firebase Space)
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Permanently wipes all rooms, games, and test records to maintain 100% clean Firebase storage.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={handleCleanDb}
                    disabled={cleaningDb}
                    className="gap-2 font-semibold text-xs shadow-md w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className={cn("size-3.5", cleaningDb && "animate-spin")} />
                    <span>
                      {cleaningDb ? "Wiping Firebase Data..." : "REMOVE ALL DATA FROM FIREBASE"}
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Active Rooms Table */}
            <Card className="border-border/60 bg-card/40">
              <CardHeader className="py-3.5 px-5 border-b border-border/40 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Room Instances ({statusData?.activeRooms?.length ?? 0})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {statusData?.activeRooms?.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">
                    No active rooms currently running. The system is clean.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {statusData?.activeRooms?.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono font-bold">
                            {room.roomCode}
                          </Badge>
                          <div>
                            <span className="font-medium text-foreground">
                              Host: {room.hostUid}
                            </span>
                            <span className="text-[11px] text-muted-foreground ml-2">
                              Status: {room.status}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            room.status === "IN_PROGRESS"
                              ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-950/40 text-amber-400 border-amber-500/30",
                          )}
                        >
                          {room.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </main>
  );
}
