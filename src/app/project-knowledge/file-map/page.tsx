import type { ComponentRef, FileResponsibility } from "@/types/project-knowledge";
import {
  Badge,
  DataTable,
  InlineCode,
  PageShell,
  truncateText,
} from "../_components/ProjectKnowledgeUi";
import {
  projectKnowledgeComponents,
  projectKnowledgeFileResponsibilities,
} from "@/data/project-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fileResponsibilities: readonly FileResponsibility[] =
  projectKnowledgeFileResponsibilities;
const components: readonly ComponentRef[] = projectKnowledgeComponents;

export default function ProjectKnowledgeFileMapPage() {
  const responsibilityRows = fileResponsibilities.map((item) => [
    <InlineCode key="file">{item.file}</InlineCode>,
    <Badge key="layer">{item.layer}</Badge>,
    item.confidence,
    truncateText(item.primaryResponsibility, "-", 220),
    truncateText(item.notes, "-", 160),
  ]);

  const componentRows = components.slice(0, 120).map((component) => [
    <InlineCode key="file">{component.file}</InlineCode>,
    component.componentOrExportGuess,
    component.area,
    component.usesI18n ? "yes" : "no",
    component.usesSupabaseOrApiFetch ? "yes" : "no",
  ]);

  return (
    <PageShell
      eyebrow="File map"
      title="File responsibility map"
      description="Where to start when a feature breaks: responsibility map plus component inventory."
    >
      <section className="grid gap-6">
        <DataTable
          headers={["File", "Layer", "Confidence", "Responsibility", "Notes"]}
          rows={responsibilityRows}
        />
        <DataTable
          headers={["Component file", "Export guess", "Area", "I18n", "External data"]}
          rows={componentRows}
        />
      </section>
    </PageShell>
  );
}
