import type { ApiEndpointRef } from "@/types/project-knowledge";
import {
  Badge,
  DataTable,
  InlineCode,
  PageShell,
  truncateText,
} from "../_components/ProjectKnowledgeUi";
import { projectKnowledgeApiEndpoints } from "@/data/project-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const endpoints: readonly ApiEndpointRef[] = projectKnowledgeApiEndpoints;

export default function ProjectKnowledgeApiMapPage() {
  const rows = endpoints.map((endpoint) => [
    <InlineCode key="endpoint">{endpoint.endpoint}</InlineCode>,
    endpoint.methods.join(", "),
    <InlineCode key="file">{endpoint.file}</InlineCode>,
    <Badge key="surface">{endpoint.surface}</Badge>,
    endpoint.likelyWriteOrMutation ? "yes" : "no",
    endpoint.authOrSessionUsage ? "yes" : "no",
    truncateText(endpoint.notes, "-", 160),
  ]);

  return (
    <PageShell
      eyebrow="API map"
      title="API and backend route map"
      description="Endpoint inventory with methods, mutation hints and auth/session markers. These are governance hints and not final security proof."
    >
      <DataTable
        headers={["Endpoint", "Methods", "File", "Surface", "Write?", "Auth/session", "Notes"]}
        rows={rows}
      />
    </PageShell>
  );
}
