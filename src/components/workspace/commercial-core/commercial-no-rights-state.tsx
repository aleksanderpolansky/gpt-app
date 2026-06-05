import type { CommercialNoRightsState as CommercialNoRightsStateModel } from "./commercial-core.types";

type CommercialNoRightsStatePanelProps = {
  readonly state: CommercialNoRightsStateModel;
  readonly title?: string;
  readonly footerNote?: string;
};

function getNoRightsSummary(state: CommercialNoRightsStateModel): string {
  const missingRightsCount = state.missingRights.length;

  return (
    missingRightsCount.toLocaleString("en-US") +
    " missing rights · safe fallback route: " +
    state.safeFallbackRoute
  );
}

export function CommercialNoRightsStatePanel({
  state,
  title = "No rights state",
  footerNote = "No-rights commercial UI is fixture-first, read-only and does not run hidden writes.",
}: CommercialNoRightsStatePanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Commercial no-rights state
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {state.title}
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Read-only
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {getNoRightsSummary(state)}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            No-rights description
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {state.description}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Safe fallback route
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {state.safeFallbackRoute}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The user can be shown a safe route without creating commercial writes.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Missing rights
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Access is blocked for these commercial capabilities.
            </p>
          </div>
          <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            No hidden writes
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {state.missingRights.map((missingRight) => (
            <div
              className="rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground"
              key={missingRight}
            >
              {missingRight}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {state.supportHint}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {footerNote}
      </div>
    </section>
  );
}

