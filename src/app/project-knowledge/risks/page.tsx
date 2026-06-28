import type {
  ConflictItem,
  GapItem,
  ProjectKnowledgeBacklogItem,
} from "@/types/project-knowledge";
import {
  Badge,
  CardGrid,
  InfoCard,
  PageShell,
  truncateText,
} from "../_components/ProjectKnowledgeUi";
import {
  projectKnowledgeBacklog,
  projectKnowledgeGaps,
  projectKnowledgeVersionConflicts,
} from "@/data/project-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const gaps: readonly GapItem[] = projectKnowledgeGaps;
const conflicts: readonly ConflictItem[] = projectKnowledgeVersionConflicts;
const backlog: readonly ProjectKnowledgeBacklogItem[] = projectKnowledgeBacklog;

export default function ProjectKnowledgeRisksPage() {
  return (
    <PageShell
      eyebrow="Risks"
      title="Gaps, conflicts and backlog"
      description="Open governance risks, version conflicts and backlog items to keep old assumptions from being treated as current facts."
    >
      <section className="grid gap-6">
        <CardGrid>
          {gaps.map((gap) => (
            <InfoCard
              key={gap.id}
              eyebrow={`${gap.id} / ${gap.priority}`}
              title={gap.title}
              description={truncateText(gap.risk, "-", 240)}
            >
              <div className="flex flex-wrap gap-2">
                <Badge>{gap.area}</Badge>
                <Badge>{gap.status}</Badge>
              </div>
            </InfoCard>
          ))}
        </CardGrid>

        <CardGrid>
          {conflicts.map((conflict) => (
            <InfoCard
              key={conflict.id}
              eyebrow={`${conflict.id} / ${conflict.priority}`}
              title={conflict.title}
              description={truncateText(conflict.decision, "-", 240)}
            >
              <div className="flex flex-wrap gap-2">
                <Badge>{conflict.type}</Badge>
                <Badge>{conflict.status}</Badge>
              </div>
            </InfoCard>
          ))}
        </CardGrid>

        <CardGrid>
          {backlog.map((item) => (
            <InfoCard
              key={item.id}
              eyebrow={`${item.id} / ${item.priority}`}
              title={item.title}
              description={truncateText(item.acceptance, "-", 240)}
            >
              <div className="flex flex-wrap gap-2">
                <Badge>{item.area}</Badge>
                <Badge>{item.status}</Badge>
              </div>
            </InfoCard>
          ))}
        </CardGrid>
      </section>
    </PageShell>
  );
}
