"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Trash2, RefreshCw, KeyRound, CheckCircle2, Crown, Activity } from "lucide-react";
import { toast } from "sonner";
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
import { useAuth } from "@/features/auth";
import { adminLogin, adminPurgeAll, adminGetStatus, type AdminStatusData } from "@/lib/api/client";
import { OddMindError } from "@/lib/errors";

export function AdminPanel() {
  const { user, getIdToken } = useAuth();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [email, setEmail] = useState("sahomalaya21@gmail.com");
  const [passcode, setPasscode] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [purging, setPurging] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusData, setStatusData] = useState<AdminStatusData | null>(null);

  const isCurrentUserAdmin = user?.email?.toLowerCase() === "sahomalaya21@gmail.com";

  useEffect(() => {
    if (isCurrentUserAdmin) {
      setIsAdminLoggedIn(true);
      fetchStatus();
    }
  }, [isCurrentUserAdmin]);

  async function fetchStatus() {
    setLoadingStatus(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const data = await adminGetStatus(token);
      setStatusData(data);
    } catch (err) {
      console.warn("[Admin status fetch warning]:", err);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await adminLogin(email, passcode);
      if (res?.idToken) {
        localStorage.setItem("oddmind_id_token", res.idToken);
        localStorage.setItem("oddmind_uid", res.uid);
        setIsAdminLoggedIn(true);
        toast.success("Logged in as Super Admin (sahomalaya21@gmail.com)!");
        window.location.reload();
      }
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Admin login failed.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handlePurgeAll() {
    if (!confirm("⚠️ Are you sure you want to REVOKE & PURGE all active rooms, games, and player sessions?")) {
      return;
    }

    setPurging(true);
    try {
      const token = await getIdToken();
      if (!token) throw new OddMindError("NOT_AUTHENTICATED", "Admin authentication missing.", 401);
      const res = await adminPurgeAll(token);
      toast.success(
        `Database Reset: Purged ${res.membershipsPurged} sessions, ${res.roomsCancelled} rooms, ${res.gamesAbandoned} games!`,
      );
      fetchStatus();
    } catch (err) {
      toast.error(err instanceof OddMindError ? err.message : "Purge failed.");
    } finally {
      setPurging(false);
    }
  }

  if (!isAdminLoggedIn && !isCurrentUserAdmin) {
    return (
      <Card className="border-amber-500/30 bg-amber-950/10 backdrop-blur mt-6">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-300">Admin Control Access</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
            sahomalaya21@gmail.com
          </Badge>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <form onSubmit={handleAdminLogin} className="flex flex-wrap gap-2 items-center">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin Email"
              className="h-8 text-xs max-w-[220px] bg-background/80"
              required
            />
            <Input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Admin Passcode"
              className="h-8 text-xs max-w-[150px] bg-background/80"
              required
            />
            <Button
              type="submit"
              size="sm"
              disabled={loggingIn}
              className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium"
            >
              {loggingIn ? "Authenticating..." : "Login as Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/50 bg-amber-950/20 backdrop-blur shadow-[0_0_20px_rgba(245,158,11,0.15)] mt-6">
      <CardHeader className="py-3.5 px-5 flex flex-row items-center justify-between border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <Crown className="size-5 text-amber-400 animate-pulse" />
          <div>
            <CardTitle className="text-sm font-bold text-amber-300 flex items-center gap-2">
              Super Admin Control Console
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                sahomalaya21@gmail.com
              </Badge>
            </CardTitle>
            <CardDescription className="text-[11px] text-amber-200/70">
              Full control over all active rooms, games, and sessions across OddMind.
            </CardDescription>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={loadingStatus}
          className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/40 gap-1"
        >
          <RefreshCw className={`size-3 ${loadingStatus ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Status Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded bg-black/40 border border-amber-500/20 text-center">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Active Rooms</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
              {statusData ? statusData.activeRoomsCount : "—"}
            </div>
          </div>
          <div className="p-3 rounded bg-black/40 border border-amber-500/20 text-center">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Active Games</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {statusData ? statusData.activeGamesCount : "—"}
            </div>
          </div>
          <div className="p-3 rounded bg-black/40 border border-amber-500/20 text-center">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Locked Memberships</div>
            <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">
              {statusData ? statusData.activeMembershipsCount : "—"}
            </div>
          </div>
        </div>

        {/* Master Revoke / Purge Button */}
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-destructive flex items-center gap-1.5">
              <ShieldAlert className="size-4" />
              Emergency Reset / Revoke All Sessions
            </div>
            <p className="text-[11px] text-muted-foreground">
              Cancels all running rooms, closes stuck sessions, and releases all room code locks immediately.
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handlePurgeAll}
            disabled={purging}
            className="shrink-0 gap-1.5 font-semibold text-xs shadow-md"
          >
            <Trash2 className="size-3.5" />
            <span>{purging ? "Purging..." : "Purge All Sessions"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
