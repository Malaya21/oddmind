import { CaseResultView } from "@/features/mindgrid/CaseResultView";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function MindGridResultPage({ params }: PageProps) {
  const { sessionId } = await params;
  return <CaseResultView sessionId={sessionId} />;
}
