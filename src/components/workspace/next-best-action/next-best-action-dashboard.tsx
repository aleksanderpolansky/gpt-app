import type { NextBestActionViewModel } from "./next-best-action.types";
import { ActionCandidateList } from "./action-candidate-list";
import { ConstraintPanel } from "./constraint-panel";
import { FeedbackAfterAction } from "./feedback-after-action";
import { NbaExplainabilityPanel } from "./nba-explainability-panel";
import { NbaNavigationLinks } from "./nba-navigation-links";
import { NbaReadOnlyBoundary } from "./nba-read-only-boundary";
import { NbaSummaryHeader } from "./nba-summary-header";
import { WeakDirectionList } from "./weak-direction-list";

export interface NextBestActionDashboardProps {
  readonly viewModel: NextBestActionViewModel;
}

export function NextBestActionDashboard({ viewModel }: NextBestActionDashboardProps) {
  const selectedDirection = viewModel.weakDirections.find(
    (direction) => direction.id === viewModel.selectedDirectionId,
  );

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <NbaSummaryHeader
          header={viewModel.header}
          selectedDirection={selectedDirection}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <WeakDirectionList
            weakDirections={viewModel.weakDirections}
            selectedDirectionId={viewModel.selectedDirectionId}
          />
          <ConstraintPanel constraints={viewModel.constraints} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
          <ActionCandidateList candidates={viewModel.actionCandidates} />
          <NbaExplainabilityPanel items={viewModel.explanation} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <FeedbackAfterAction feedbackActions={viewModel.feedbackActions} />
          <NbaReadOnlyBoundary boundary={viewModel.readOnlyBoundary} />
        </div>

        <NbaNavigationLinks links={viewModel.navigationLinks} currentHref="/next" />

        <section
          aria-labelledby="ui12-composer-boundary-title"
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <h2 id="ui12-composer-boundary-title" className="text-base font-semibold text-foreground">
            Composer boundary
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This dashboard composer arranges fixture-first read-only components only. It contains no raw hex, no inline style, no client state, no event handlers, no route calls, and no hidden persistence.
          </p>
        </section>
      </div>
    </main>
  );
}
