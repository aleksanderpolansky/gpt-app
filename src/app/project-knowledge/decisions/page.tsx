import type { DecisionRecord } from "@/types/project-knowledge";
import {
  Badge,
  CardGrid,
  InfoCard,
  InlineCode,
  PageShell,
} from "../_components/ProjectKnowledgeUi";
import { projectKnowledgeDecisions } from "@/data/project-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const decisions: readonly DecisionRecord[] = projectKnowledgeDecisions;

export default function ProjectKnowledgeDecisionsPage() {
  return (
    <PageShell
      eyebrow="Decision log"
      title="Project decision log"
      description="Active and historical project decisions with rationale, status and affected files or routes."
    >
      <CardGrid>
        {decisions.map((decision) => (
          <InfoCard
            key={decision.id}
            eyebrow={`${decision.id} / ${decision.date}`}
            title={decision.decision}
            description={decision.rationale}
          >
            <div className="flex flex-wrap gap-2">
              <Badge>{decision.status}</Badge>
              {decision.affectedRoutes?.slice(0, 5).map((route) => (
                <InlineCode key={route}>{route}</InlineCode>
              ))}
            </div>
          </InfoCard>
        ))}
      </CardGrid>
    </PageShell>
  );
}
