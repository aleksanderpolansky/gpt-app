import type { KnowledgeTerm } from "@/types/project-knowledge";
import {
  Badge,
  CardGrid,
  InfoCard,
  InlineCode,
  PageShell,
  truncateText,
} from "../_components/ProjectKnowledgeUi";
import { projectKnowledgeTerms } from "@/data/project-knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const terms: readonly KnowledgeTerm[] = projectKnowledgeTerms;

export default function ProjectKnowledgeGlossaryPage() {
  return (
    <PageShell
      eyebrow="Glossary"
      title="Project Knowledge glossary"
      description="Canonical project terms, definitions, aliases, related routes and forbidden confusions."
    >
      <CardGrid>
        {terms.map((term) => (
          <InfoCard
            key={term.id}
            eyebrow={term.layer ?? term.status}
            title={term.term}
            description={truncateText(term.definition, "-", 280)}
          >
            <div className="flex flex-wrap gap-2">
              <Badge>{term.status}</Badge>
              {term.role ? <Badge>{term.role}</Badge> : null}
              {term.aliases?.slice(0, 4).map((alias) => (
                <Badge key={alias}>alias: {alias}</Badge>
              ))}
            </div>
            {term.relatedRoutes?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {term.relatedRoutes.slice(0, 5).map((route) => (
                  <InlineCode key={route}>{route}</InlineCode>
                ))}
              </div>
            ) : null}
            {term.forbiddenConfusion ? (
              <p className="mt-3 text-sm leading-6 text-rose-700">
                Forbidden confusion: {term.forbiddenConfusion}
              </p>
            ) : null}
          </InfoCard>
        ))}
      </CardGrid>
    </PageShell>
  );
}
