import Link from "next/link";
import { KeyRound, Brain, Users, Sparkles, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { PlayerProfileCard } from "@/features/auth";
import { cn } from "@/lib/utils";

import { OddMindLogo } from "@/components/brand/OddMindLogo";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <OddMindLogo size={34} />
            <Badge variant="secondary" className="text-[10px] font-bold">LIVE</Badge>
          </div>
          <ConnectionStatus />
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-4 py-12 sm:px-6">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Choose Your Game Mode.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Play social deduction with friends in multiplayer or test your logic, timeline reconstruction, and contradiction detection in single-player mystery cases.
          </p>
        </div>

        {/* Primary Dual Game Modes */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Mode 1: Multiplayer Social Deduction */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Multiplayer — Social Deduction
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-border/60 bg-card/50 backdrop-blur flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Host a Room</CardTitle>
                  <CardDescription className="text-xs">
                    Create a private room and invite friends with a short code.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/create" className={cn(buttonVariants(), "w-full text-xs font-semibold")}>
                    Create Room
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/50 backdrop-blur flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Join a Room</CardTitle>
                  <CardDescription className="text-xs">
                    Enter a room code and pick a display name to jump in.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/join"
                    className={cn(buttonVariants({ variant: "secondary" }), "w-full text-xs font-semibold")}
                  >
                    Join Room
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Mode 2: MindGrid Solo Investigation */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="size-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Solo Mode — Logic & Investigation
                </h2>
              </div>

              <Card className="border-primary/40 bg-gradient-to-br from-card to-card/90 shadow-sm backdrop-blur">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider">
                      New Game Mode
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">12 Solvable Cases</span>
                  </div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <span>MindGrid</span>
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    Step into the shoes of an investigator. Manage investigation points, unlock CCTV and access logs, expose contradictions, and build your game-based Thinking Profile.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/mindgrid"
                    className={cn(buttonVariants({ variant: "default" }), "w-full text-xs font-bold gap-2 shadow-xs")}
                  >
                    <Sparkles className="size-3.5" />
                    <span>Enter MindGrid</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          <PlayerProfileCard />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            OddMind is a game for entertainment — not a scientifically validated assessment.
          </p>
          <Link
            href="/admin"
            title="System"
            className="opacity-15 hover:opacity-80 transition-opacity p-1.5 text-muted-foreground hover:text-foreground"
          >
            <KeyRound className="size-3.5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
