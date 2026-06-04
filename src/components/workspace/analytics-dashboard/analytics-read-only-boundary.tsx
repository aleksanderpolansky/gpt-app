import type { AnalyticsReadOnlyBoundary as AnalyticsReadOnlyBoundaryModel } from "./analytics-dashboard.types";

export interface AnalyticsReadOnlyBoundaryProps {
  readonly boundary: AnalyticsReadOnlyBoundaryModel;
}

interface BoundaryItemProps {
  readonly item: string;
}

function BoundaryItem({ item }: BoundaryItemProps) {
  return (
    <li className="rounded-lg border bg-background p-3 text-sm leading-6 text-muted-foreground">
      {item}
    </li>
  );
}

export function AnalyticsReadOnlyBoundary({
  boundary,
}: AnalyticsReadOnlyBoundaryProps) {
  return (
    <section
      aria-label="UI-11 read-only analytics boundary"
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Safety boundary
          </p>
          <h2 className="text-xl font-semibold">{boundary.title}</h2>
        </div>

        <a
          href={boundary.nextBlockHref}
          className="rounded-full border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          Next separate block: {boundary.nextBlockLabel}
        </a>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
        UI-11 is a read-only analytics preview. It can show weak directions,
        progress debt, heatmap cells, load/recovery warnings, and navigation
        context, but it must not write data, persist analytics, execute actions,
        or choose the final Next Best Action.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border bg-background p-4">
          <p className="font-semibold">Allowed in UI-11</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Fixture-first signals, visual analytics, read-only explanations,
            accessibility labels, and links to related pages.
          </p>
        </div>

        <div className="rounded-xl border bg-background p-4">
          <p className="font-semibold">Forbidden in UI-11</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            No database writes, no hidden writes, no final Next Best Action, no action execution, no medical diagnosis, no hormone truth, no productivity truth, and no financial advice.
          </p>
        </div>
      </div>

      <ul className="mt-6 grid gap-3 md:grid-cols-2" role="list">
        {boundary.items.map((item) => (
          <BoundaryItem key={item} item={item} />
        ))}
      </ul>

      <p className="mt-5 rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground">
        The dashboard remains conservative by design: analytics are review signals only. UI-12 handles Next Best Action candidates separately after UI-11 is closed.
      </p>
    </section>
  );
}
