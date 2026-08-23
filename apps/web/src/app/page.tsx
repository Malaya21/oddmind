import Link from "next/link";
import { KeyRound } from "lucide-react";
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

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-[0.2em]">ODDMIND</span>
            <Badge variant="secondary">MVP</Badge>
          </div>
          <ConnectionStatus />
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-4 py-16 sm:px-6">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find the Odd Player.
          </h1>
          <p className="text-lg text-muted-foreground">
            Most players share a secret word. One player doesn&apos;t. Give clues,
            discuss, vote — and see if you can spot who&apos;s odd before they spot
            you.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          <Card className="border-border/60 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Host a room</CardTitle>
              <CardDescription>
                Create a private room and invite friends with a short code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/create" className={cn(buttonVariants(), "w-full")}>
                Create Room
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Join a room</CardTitle>
              <CardDescription>
                Enter a room code and pick a display name to jump in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/join"
                className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
              >
                Join Room
              </Link>
            </CardContent>
          </Card>
          </div>

          <PlayerProfileCard />
        </div>

        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            OddMind is a game for entertainment — not a scientifically validated
            assessment.
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
