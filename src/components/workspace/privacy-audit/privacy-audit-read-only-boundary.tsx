import type { PrivacyAuditReadOnlyBoundary } from "./privacy-audit.types";

interface PrivacyAuditReadOnlyBoundaryPanelProps {
  readonly boundary: PrivacyAuditReadOnlyBoundary;
}

export function PrivacyAuditReadOnlyBoundaryPanel({
  boundary,
}: PrivacyAuditReadOnlyBoundaryPanelProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Read-only boundary
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {boundary.title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {boundary.description}
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {boundary.rules.map((rule) => (
          <article
            key={rule}
            className="rounded-lg border border-border bg-background/60 p-4"
          >
            <div className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-1 h-2.5 w-2.5 rounded-full bg-primary"
              />
              <p className="text-sm leading-6 text-foreground">{rule}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-dashed border-border bg-muted px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            No hidden writes
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground">
            The page must not persist feedback, change privacy policy, or save
            resolver decisions.
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-muted px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            No destructive update
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground">
            Source events and correction history remain visible; rejected and
            corrected meanings are not hidden.
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-muted px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Additive corrections
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground">
            Corrections append context and explanations instead of rewriting
            prior activity history.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
        UI-13 is a transparency surface only: no database write, no API write,
        no resolver mutation, no policy change, and no automatic learning.
      </div>
    </section>
  );
}
