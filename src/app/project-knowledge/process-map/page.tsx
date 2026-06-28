import type { ProcessMapItem } from "@/types/project-knowledge";
import {
  Badge,
  CardGrid,
  InfoCard,
  InlineCode,
  PageShell,
} from "../_components/ProjectKnowledgeUi";
import { projectKnowledgeProcesses } from "@/data/project-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const processes: readonly ProcessMapItem[] = projectKnowledgeProcesses;

export default function ProjectKnowledgeProcessMapPage() {
  return (
    <PageShell
      eyebrow="Process map"
      title="Process and gate map"
      description="Core product flows with routes, endpoints, source files and gate notes."
    >
      <CardGrid>
        {processes.map((process) => (
          <InfoCard
            key={process.id}
            eyebrow={process.id}
            title={process.process}
            description={process.gateNotes}
          >
            <div className="flex flex-wrap gap-2">
              <Badge>{process.status}</Badge>
              {process.primaryRoutes.slice(0, 6).map((route) => (
                <InlineCode key={route}>{route}</InlineCode>
              ))}
            </div>
            {process.primaryApi.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {process.primaryApi.slice(0, 6).map((endpoint) => (
                  <InlineCode key={endpoint}>{endpoint}</InlineCode>
                ))}
              </div>
            ) : null}
          </InfoCard>
        ))}
      </CardGrid>
    </PageShell>
  );
}
