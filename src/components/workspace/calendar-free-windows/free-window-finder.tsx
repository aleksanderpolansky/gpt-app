import type {
  CalendarFreeWindow,
  CalendarFreeWindowsDurationBucket,
  CalendarFreeWindowsViewModel,
  CalendarSuggestedActionForWindow,
} from "./calendar-free-windows.types";
import { DurationBucketFilter } from "./duration-bucket-filter";
import { FreeWindowCard } from "./free-window-card";
import {
  formatCalendarFreeWindowsDuration,
  getCalendarFreeWindowsForBucket,
  getCalendarFreeWindowsForSelectedBucket,
  getCalendarFreeWindowsLargestWindow,
  getCalendarFreeWindowsSummaryCards,
} from "./calendar-free-windows.utils";

interface FreeWindowFinderProps {
  readonly viewModel: CalendarFreeWindowsViewModel;
}

const emptyBucketCounts: Record<CalendarFreeWindowsDurationBucket, number> = {
  5: 0,
  10: 0,
  20: 0,
  45: 0,
};

function countWindowsByBucket(
  viewModel: CalendarFreeWindowsViewModel,
): Record<CalendarFreeWindowsDurationBucket, number> {
  return viewModel.durationBuckets.reduce((counts, bucket) => {
    return {
      ...counts,
      [bucket]: getCalendarFreeWindowsForBucket(viewModel, bucket).length,
    };
  }, emptyBucketCounts);
}

function countCandidatesByBucket(
  viewModel: CalendarFreeWindowsViewModel,
): Record<CalendarFreeWindowsDurationBucket, number> {
  return viewModel.durationBuckets.reduce((counts, bucket) => {
    const count = viewModel.suggestedCandidates.filter((candidate) => {
      return candidate.durationBucket === bucket;
    }).length;

    return {
      ...counts,
      [bucket]: count,
    };
  }, emptyBucketCounts);
}

function SelectedWindowSummary({
  windows,
  selectedBucket,
}: {
  readonly windows: readonly CalendarFreeWindow[];
  readonly selectedBucket: CalendarFreeWindowsDurationBucket;
}) {
  const totalMinutes = windows.reduce((total, window) => {
    return total + window.range.durationMinutes;
  }, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Finder summary
      </p>

      <h2 className="mt-1 text-lg font-semibold text-slate-950">
        Windows fitting {selectedBucket} min
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
            Matching windows
          </p>
          <p className="mt-1 text-lg font-semibold text-cyan-950">
            {windows.length}
          </p>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
            Selected bucket
          </p>
          <p className="mt-1 text-lg font-semibold text-indigo-950">
            {selectedBucket} min
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Total available
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {formatCalendarFreeWindowsDuration(totalMinutes)}
          </p>
        </div>
      </div>
    </section>
  );
}

function CandidatePoolPreview({
  candidates,
}: {
  readonly candidates: readonly CalendarSuggestedActionForWindow[];
}) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700">
        Candidate pool
      </p>

      <h2 className="mt-1 text-lg font-semibold text-slate-950">
        Read-only action candidates
      </h2>

      <p className="mt-1 text-[13px] leading-6 text-slate-600">
        These are previews attached to free windows. UI-10 does not make the
        final Next Best Action decision.
      </p>

      <div className="mt-4 grid gap-2">
        {candidates.slice(0, 5).map((candidate) => (
          <article
            key={candidate.id}
            className="rounded-xl border border-violet-100 bg-white p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">
                {candidate.durationBucket} min
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                {candidate.state}
              </span>

              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                {candidate.fitState}
              </span>
            </div>

            <p className="mt-2 text-[12px] font-semibold text-slate-950">
              {candidate.title}
            </p>

            <p className="mt-1 text-[12px] leading-5 text-slate-600">
              {candidate.reason}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FreeWindowFinder({ viewModel }: FreeWindowFinderProps) {
  const selectedWindows = getCalendarFreeWindowsForSelectedBucket(viewModel);
  const largestWindow = getCalendarFreeWindowsLargestWindow(viewModel);
  const summaryCards = getCalendarFreeWindowsSummaryCards(viewModel);
  const windowCounts = countWindowsByBucket(viewModel);
  const candidateCounts = countCandidatesByBucket(viewModel);

  return (
    <section className="grid gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Free window finder
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              Find candidate-friendly calendar gaps
            </h2>

            <p className="mt-1 max-w-3xl text-[13px] leading-6 text-slate-600">
              This component reads fixture data and groups available time by
              duration bucket, energy and attention. It stays read-only and
              does not trigger external calendar writes.
            </p>
          </div>

          <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[12px] font-semibold text-cyan-700">
            {selectedWindows.length} matching windows
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {card.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {card.value}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-slate-600">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4">
          <SelectedWindowSummary
            windows={selectedWindows}
            selectedBucket={viewModel.selectedDurationBucket}
          />

          <div className="grid gap-3">
            {selectedWindows.map((freeWindow) => (
              <FreeWindowCard
                key={freeWindow.id}
                freeWindow={freeWindow}
                viewModel={viewModel}
                titlePrefix="Finder result"
              />
            ))}

            {selectedWindows.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white p-4 text-[13px] leading-6 text-slate-600 shadow-sm">
                No free window currently fits the selected duration bucket.
              </p>
            ) : null}
          </div>
        </div>

        <aside className="grid gap-4">
          <DurationBucketFilter
            buckets={viewModel.durationBuckets}
            selectedBucket={viewModel.selectedDurationBucket}
            windowCounts={windowCounts}
            candidateCounts={candidateCounts}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Largest window
            </p>

            {largestWindow ? (
              <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50 p-3">
                <p className="text-[12px] font-semibold text-cyan-950">
                  {largestWindow.title}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-cyan-800">
                  {largestWindow.range.start}–{largestWindow.range.end} ·{" "}
                  {formatCalendarFreeWindowsDuration(
                    largestWindow.range.durationMinutes,
                  )}
                </p>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] leading-5 text-slate-600">
                No free window is available in the current fixture.
              </p>
            )}
          </section>

          <CandidatePoolPreview candidates={viewModel.suggestedCandidates} />
        </aside>
      </div>
    </section>
  );
}
