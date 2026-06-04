import { AnalyticsKpiCard } from "./analytics-kpi-card";
import { AnalyticsNavigationLinks } from "./analytics-navigation-links";
import { AnalyticsReadOnlyBoundary } from "./analytics-read-only-boundary";
import { AnalyticsSummaryHeader } from "./analytics-summary-header";
import { BalanceRings } from "./balance-rings";
import { DomainDashboardTabs } from "./domain-dashboard-tabs";
import { FocusHeatmap } from "./focus-heatmap";
import { analyticsDashboardFixture } from "./analytics-dashboard.fixtures";
import type { AnalyticsDashboardViewModel } from "./analytics-dashboard.types";
import { createAnalyticsDashboardSelectors } from "./analytics-dashboard.utils";
import { LoadRecoveryWarnings } from "./load-recovery-warnings";
import { ProgressDebtList } from "./progress-debt-list";
import { WeakDirectionsWidget } from "./weak-directions-widget";
import { WeeklyProgressChart } from "./weekly-progress-chart";

export interface AnalyticsDashboardProps {
  readonly viewModel?: AnalyticsDashboardViewModel;
}

export function AnalyticsDashboard({
  viewModel = analyticsDashboardFixture,
}: AnalyticsDashboardProps) {
  const selectors = createAnalyticsDashboardSelectors(viewModel);

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AnalyticsSummaryHeader viewModel={viewModel} />

        <section
          aria-label="Analytics summary cards"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {viewModel.summaryCards.map((card) => (
            <AnalyticsKpiCard key={card.id} card={card} />
          ))}
        </section>

        <BalanceRings metrics={selectors.balanceMetrics} />

        <WeeklyProgressChart series={viewModel.weeklyProgress} />

        <FocusHeatmap
          rows={selectors.heatmapRows}
          days={selectors.heatmapDays}
          lowCellCount={selectors.lowHeatmapCellCount}
          excessCellCount={selectors.excessHeatmapCellCount}
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <WeakDirectionsWidget directions={selectors.weakDirections} />
          <ProgressDebtList debts={viewModel.progressDebts} />
        </div>

        <DomainDashboardTabs tabs={selectors.domainTabs} />

        <LoadRecoveryWarnings warnings={viewModel.warnings} />

        <AnalyticsNavigationLinks
          links={viewModel.navigationLinks}
          currentHref="/analytics"
        />

        <AnalyticsReadOnlyBoundary boundary={viewModel.readOnlyBoundary} />
      </section>
    </main>
  );
}
