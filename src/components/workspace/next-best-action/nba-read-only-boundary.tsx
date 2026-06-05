import type { ReadOnlyBoundary } from "./next-best-action.types";

export interface NbaReadOnlyBoundaryProps {
  readonly boundary: ReadOnlyBoundary;
}

export function NbaReadOnlyBoundary({ boundary }: NbaReadOnlyBoundaryProps) {
  return (
    <section
      aria-labelledby="nba-read-only-boundary-title"
      className="rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Read-only boundary
          </p>
          <h2 id="nba-read-only-boundary-title" className="mt-2 text-xl font-semibold text-foreground">
            {boundary.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {boundary.summary}
          </p>
        </div>

        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
          Fixture-first only
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <BoundaryColumn
          title="Allowed preview"
          label="UI-12"
          items={boundary.allowed}
        />
        <BoundaryColumn
          title="Forbidden now"
          label="No final NBA"
          items={boundary.forbidden}
        />
        <BoundaryColumn
          title="Future gated work"
          label="Later"
          items={boundary.futureGateNotes}
        />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-background/60 p-4">
        <p className="text-sm font-semibold text-foreground">Boundary statement</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          UI-12 shows candidate previews only: no final NBA, no action execution, no hidden
          persistence, and no live DB/API connection. UI-17, AI integration, and feedback writes
          belong to later gated implementation blocks.
        </p>
      </div>
    </section>
  );
}

interface BoundaryColumnProps {
  readonly title: string;
  readonly label: string;
  readonly items: readonly string[];
}

function BoundaryColumn({ title, label, items }: BoundaryColumnProps) {
  return (
    <article className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <span className="rounded-full border border-border bg-card px-2 py-1 text-xs font-semibold text-muted-foreground">
          {label}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
