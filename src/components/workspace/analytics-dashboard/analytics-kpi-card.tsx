import type { AnalyticsSummaryCard, AnalyticsTone } from "./analytics-dashboard.types";

const toneClassNameByTone: Record<AnalyticsTone, string> = {
  primary: "border-primary/20 bg-secondary text-secondary-foreground",
  success: "border-border bg-background text-foreground",
  warning: "border-border bg-background text-foreground",
  danger: "border-border bg-background text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
  neutral: "border-border bg-background text-foreground",
};

const trendLabelByTrend: Record<AnalyticsSummaryCard["trend"], string> = {
  up: "Increasing preview signal",
  down: "Decreasing preview signal",
  flat: "Stable preview signal",
};

export interface AnalyticsKpiCardProps {
  readonly card: AnalyticsSummaryCard;
}

export function AnalyticsKpiCard({ card }: AnalyticsKpiCardProps) {
  return (
    <article className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
            {card.unit ? (
              <p className="pb-1 text-sm text-muted-foreground">{card.unit}</p>
            ) : null}
          </div>
        </div>

        <span
          className={[
            "rounded-full border px-3 py-1 text-xs font-medium",
            toneClassNameByTone[card.tone],
          ].join(" ")}
        >
          {trendLabelByTrend[card.trend]}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium">{card.deltaLabel}</p>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {card.explanation}
      </p>

      <p className="mt-4 rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground">
        {card.boundaryText}
      </p>
    </article>
  );
}
