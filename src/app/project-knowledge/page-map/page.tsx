import type { PageRouteRef } from "@/types/project-knowledge";
import {
  Badge,
  DataTable,
  InlineCode,
  PageShell,
  truncateText,
} from "../_components/ProjectKnowledgeUi";
import { projectKnowledgePageRoutes } from "@/data/project-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const pageRoutes: readonly PageRouteRef[] = projectKnowledgePageRoutes;

export default function ProjectKnowledgePageMapPage() {
  const rows = pageRoutes.map((route) => [
    <InlineCode key="route">{route.route}</InlineCode>,
    <InlineCode key="file">{route.file}</InlineCode>,
    <Badge key="surface">{route.surface}</Badge>,
    <Badge key="status">{route.status}</Badge>,
    route.usesI18n ? "yes" : "no",
    truncateText(route.notes, "-", 160),
  ]);

  return (
    <PageShell
      eyebrow="Page map"
      title="Route and page map"
      description="Application route inventory with source files, surfaces, statuses and i18n markers."
    >
      <DataTable
        headers={["Route", "File", "Surface", "Status", "I18n", "Notes"]}
        rows={rows}
      />
    </PageShell>
  );
}
