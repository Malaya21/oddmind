import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ResultsPageProps {
  params: Promise<{ gameId: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { gameId } = await params;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>Game {gameId}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }))}>
            Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
