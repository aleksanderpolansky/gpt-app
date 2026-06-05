import type { ExplainabilityItem } from "./next-best-action.types";

export interface NbaExplainabilityPanelProps {
  readonly items: readonly ExplainabilityItem[];
}

export function NbaExplainabilityPanel({ items }: NbaExplainabilityPanelProps) {
  return (
    <section
      aria-labelledby="nba-explainability-panel-title"
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Explainability
          </p>
          <h2
            id="nba-explainability-panel-title"
            className="mt-2 text-xl font-semibold text-foreground"
          >
            Why these candidates appeared
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Evidence is shown as transparent source labels. The panel separates weak direction
            signals, similarity notes, relevance notes, and constraint matches without making a
            productivity truth claim.
          </p>
        </div>

        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
          No truth overclaim
        </span>
      </div>

      <div className="mt-6 grid gap-4">
        {items.map((item) => (
          <ExplainabilityCard key={item.id} item={item} />
        ))}
      </div>

      <p className="mt-6 rounded-lg border border-border bg-background/60 px-4 py-3 text-xs leading-5 text-muted-foreground">
        Transparent source labels only: this panel explains candidate preview logic, but it does not prove productivity, diagnose health, guarantee outcomes, execute actions, or persist feedback.
      </p>
    </section>
  );
}

interface ExplainabilityCardProps {
  readonly item: ExplainabilityItem;
}

function ExplainabilityCard({ item }: ExplainabilityCardProps) {
  return (
    <article className="rounded-xl border border-border bg-background/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Source signal
          </p>
          <h3 className="mt-2 text-base font-semibold text-foreground">{item.sourceSignal}</h3>
        </div>

        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
          Evidence preview
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <EvidenceBlock title="Weak direction reasoning" body={item.reasoning} />
        <EvidenceBlock title="Constraint match" body={item.constraintMatch} />
        <EvidenceBlock title="Similarity note" body={item.similarityNote} />
        <EvidenceBlock title="Relevance note" body={item.relevanceNote} />
      </div>

      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          No overclaim
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.noTruthClaim}</p>
      </div>
    </article>
  );
}

interface EvidenceBlockProps {
  readonly title: string;
  readonly body: string;
}

function EvidenceBlock({ title, body }: EvidenceBlockProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
