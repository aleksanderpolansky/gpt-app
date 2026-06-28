import type { SourceDocument } from "@/types/project-knowledge";
import {
  Badge,
  DataTable,
  InlineCode,
  PageShell,
  truncateText,
} from "../_components/ProjectKnowledgeUi";
import { projectKnowledgeSourceDocuments } from "@/data/project-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sources: readonly SourceDocument[] = projectKnowledgeSourceDocuments;

export default function ProjectKnowledgeSourcesPage() {
  const rows = sources.map((source) => [
    <InlineCode key="file">{source.file}</InlineCode>,
    source.title,
    <Badge key="status">{source.status}</Badge>,
    source.sourceGroup ?? "-",
    source.stageOrPhaseGuess ?? "-",
    truncateText(source.notes, "-", 180),
  ]);

  return (
    <PageShell
      eyebrow="Sources"
      title="Source document register"
      description="Document and report register with active, historical, generated and superseded source status."
    >
      <DataTable
        headers={["File", "Title", "Status", "Group", "Stage", "Notes"]}
        rows={rows}
      />
    </PageShell>
  );
}
