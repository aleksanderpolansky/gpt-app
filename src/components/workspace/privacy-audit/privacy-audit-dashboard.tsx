import type { PrivacyAuditViewModel } from "./privacy-audit.types";
import { AuditLogList } from "./audit-log-list";
import { CorrectionHistoryPanel } from "./correction-history-panel";
import { FeedbackTracePanel } from "./feedback-trace-panel";
import { NoRightsStatePanel } from "./no-rights-state";
import { PrivacyAuditNavigationLinks } from "./privacy-audit-navigation-links";
import { PrivacyAuditReadOnlyBoundaryPanel } from "./privacy-audit-read-only-boundary";
import { PrivacyAuditSummaryHeader } from "./privacy-audit-summary-header";
import { PrivacyLevelLegend } from "./privacy-level-legend";
import { PrivacySettingsPanel } from "./privacy-settings-panel";
import { SensitiveCategoryControls } from "./sensitive-category-controls";

interface PrivacyAuditDashboardProps {
  readonly viewModel: PrivacyAuditViewModel;
}

export function PrivacyAuditDashboard({
  viewModel,
}: PrivacyAuditDashboardProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <PrivacyAuditSummaryHeader header={viewModel.header} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <AuditLogList
              auditEvents={viewModel.auditEvents}
              privacyLevels={viewModel.privacyLevels}
            />

            <CorrectionHistoryPanel
              correctionHistory={viewModel.correctionHistory}
            />

            <FeedbackTracePanel feedbackTraces={viewModel.feedbackTraces} />
          </div>

          <aside className="flex min-w-0 flex-col gap-6">
            <NoRightsStatePanel noRightsState={viewModel.noRightsState} />

            <PrivacyAuditReadOnlyBoundaryPanel
              boundary={viewModel.readOnlyBoundary}
            />

            <PrivacyAuditNavigationLinks
              navigationLinks={viewModel.navigationLinks}
            />
          </aside>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <PrivacyLevelLegend privacyLevels={viewModel.privacyLevels} />

          <div className="flex min-w-0 flex-col gap-6">
            <PrivacySettingsPanel settings={viewModel.settings} />

            <SensitiveCategoryControls
              controls={viewModel.sensitiveControls}
            />
          </div>
        </div>

        <section className="rounded-xl border border-dashed border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          Dashboard composer is fixture-first and read-only. It only combines
          existing UI-13 panels and does not execute writes, save feedback,
          mutate resolver state, or change privacy policy.
        </section>
      </div>
    </main>
  );
}
