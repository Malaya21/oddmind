import { QuickChallengeWorkspace } from "@/features/mindgrid/quick/QuickChallengeWorkspace";

interface PageProps {
  params: Promise<{ challengeId: string }>;
}

export default async function QuickChallengePage({ params }: PageProps) {
  const { challengeId } = await params;
  return <QuickChallengeWorkspace challengeId={challengeId} />;
}
