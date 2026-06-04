import { ConflictMarker } from "./conflict-marker";
import { DaySummary } from "./day-summary";
import { DomainFilters } from "./domain-filters";
import { TodayTimelineNavigationLinks } from "./today-timeline-navigation-links";
import { TodayTimelineReadOnlyBoundary } from "./today-timeline-read-only-boundary";
import { TimelineList } from "./timeline-list";
import type { TodayTimelineViewModel } from "./today-timeline.types";

type TodayTimelineProps = {
  readonly viewModel: TodayTimelineViewModel;
};

export function TodayTimeline({ viewModel }: TodayTimelineProps) {
  const { day, visibleEvents, visibleConflicts } = viewModel;

  return (
    <main aria-label="TodayTimeline" className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                UI-9 Today Timeline
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Today
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Read-only timeline composition for Activity Events, daily summary,
                domain filters, conflicts, and correction candidates.
              </p>
            </div>

            <TodayTimelineReadOnlyBoundary placement="header" />
          </div>
        </header>

        <TodayTimelineNavigationLinks />

        <DaySummary summary={day.summary} />

        <DomainFilters filters={day.filters} />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <TimelineList
            events={visibleEvents}
            emptyStateTitle={day.emptyStateTitle}
            emptyStateDescription={day.emptyStateDescription}
          />

          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">ConflictMarker</h2>
            <p className="mt-1 text-sm text-slate-500">
              Conflicts are shown as visible signals only. No automatic resolution.
            </p>

            <div className="mt-4 space-y-3">
              {visibleConflicts.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No conflicts visible for the current fixture filter.
                </p>
              ) : (
                visibleConflicts.map((conflict) => (
                  <ConflictMarker key={conflict.id} conflict={conflict} />
                ))
              )}
            </div>

            <div className="mt-5">
              <TodayTimelineReadOnlyBoundary placement="aside" />
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}