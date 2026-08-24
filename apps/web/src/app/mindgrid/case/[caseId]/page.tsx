import { InvestigationWorkspace } from "@/features/mindgrid/InvestigationWorkspace";

interface PageProps {
  params: Promise<{ caseId: string }>;
}

export default async function MindGridCasePage({ params }: PageProps) {
  const { caseId } = await params;
  return <InvestigationWorkspace caseId={caseId} />;
}
