import { QuickChallengeResultView } from "@/features/mindgrid/quick/QuickChallengeResultView";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function QuickChallengeResultPage({ params }: PageProps) {
  const { sessionId } = await params;
  return <QuickChallengeResultView sessionId={sessionId} />;
}
