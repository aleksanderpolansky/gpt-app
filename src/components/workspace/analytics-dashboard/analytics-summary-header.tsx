import type { AnalyticsDashboardViewModel } from "./analytics-dashboard.types";

export interface AnalyticsSummaryHeaderProps {
  readonly viewModel: AnalyticsDashboardViewModel;
}

interface SummaryBadgeProps {
  readonly label: string;
  readonly variant?: "primary" | "neutral";
}

function SummaryBadge({ label, variant = "neutral" }: SummaryBadgeProps) {
  const className =
    variant === "primary"
      ? "border-primary/20 bg-secondary text-secondary-foreground"
      : "border-border bg-background text-muted-foreground";

  return (
    <span className={["rounded-full border px-3 py-1 text-xs font-medium", className].join(" ")}>
      {label}
    </span>
  );
}

export function AnalyticsSummaryHeader({
  viewModel,
}: AnalyticsSummaryHeaderProps) {
  return (
    <header
      aria-label="Analytics summary header"
      className="rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            UI-11 · Analytics Dashboard · read-only preview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {viewModel.sourceContext.description}
          </p>
        </div>

        <div className="rounded-xl border bg-background px-4 py-3 text-sm">
          <p className="font-medium">{viewModel.period.label}</p>
          <p className="text-muted-foreground">
            {viewModel.period.startDate} — {viewModel.period.endDate}
          </p>
          <p className="text-muted-foreground">
            Timezone: {viewModel.period.timezone}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <SummaryBadge label="Fixture-first" variant="primary" />
        <SummaryBadge label="No DB writes" />
        <SummaryBadge label="No hidden writes" />
        <SummaryBadge label="No final Next Best Action" />
        <SummaryBadge label="Signals only" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border bg-background p-4">
          <p className="text-sm font-medium">Source context</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {viewModel.sourceContext.label} · {viewModel.sourceContext.updatedAtLabel}
          </p>
        </div>

        <div className="rounded-xl border bg-background p-4">
          <p className="text-sm font-medium">Boundary</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Analytics are review signals only. UI-11 does not write data,
            persist analytics, execute actions, or choose the final Next Best Action.
          </p>
        </div>
      </div>
    </header>
  );
}
