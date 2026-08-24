import { QuickPlayWorkspace } from "@/features/mindgrid/quick/QuickPlayWorkspace";

interface PageProps {
  params: Promise<{ playId: string }>;
}

export default async function QuickPlayPage({ params }: PageProps) {
  const { playId } = await params;
  return <QuickPlayWorkspace playId={playId} />;
}
