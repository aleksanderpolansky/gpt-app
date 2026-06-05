import type { CommercialReadOnlyBoundary as CommercialReadOnlyBoundaryModel } from "./commercial-core.types";

type CommercialReadOnlyBoundaryPanelProps = {
  readonly boundary: CommercialReadOnlyBoundaryModel;
  readonly title?: string;
  readonly footerNote?: string;
};

function getReadOnlyBoundarySummary(
  boundary: CommercialReadOnlyBoundaryModel,
): string {
  const blockedActionCount = boundary.blockedActions.length;
  const gateLabel = boundary.futureGateRequired
    ? "future commercial write gate required"
    : "future commercial write gate not enabled";

  return (
    blockedActionCount.toLocaleString("en-US") +
    " blocked actions · " +
    gateLabel +
    " · no hidden writes"
  );
}

export function CommercialReadOnlyBoundaryPanel({
  boundary,
  title = "Read-only boundary",
  footerNote = "This fixture-first commercial UI does not run database, API, server action or client mutation writes.",
}: CommercialReadOnlyBoundaryPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Commercial read-only boundary
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {boundary.title}
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          No hidden writes
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {getReadOnlyBoundarySummary(boundary)}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Boundary description
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {boundary.description}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Future gate required
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {boundary.futureGateRequired
              ? "Future commercial write gate required"
              : "Future commercial write gate not enabled"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Commercial writes remain blocked in UI-14.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Blocked actions
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Disabled commercial write actions are listed for audit visibility.
            </p>
          </div>
          <div className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Read-only
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {boundary.blockedActions.map((blockedAction) => (
            <div
              className="rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground"
              key={blockedAction}
            >
              {blockedAction}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {boundary.noHiddenWritesNotice}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm leading-6 text-muted-foreground">
        {footerNote}
      </div>
    </section>
  );
}

