import type { CalendarFreeWindowsViewModel } from "./calendar-free-windows.types";
import { CalendarDayCard } from "./calendar-day-card";
import { CalendarNavigationLinks } from "./calendar-navigation-links";
import { CalendarReadOnlyBoundary } from "./calendar-read-only-boundary";
import { CalendarView } from "./calendar-view";
import { FreeWindowFinder } from "./free-window-finder";
import { SuggestedActionForWindow } from "./suggested-action-for-window";
import { TimeBlockLegend } from "./time-block-legend";
import {
  getCalendarCandidatesForWindow,
  getCalendarFreeWindowsActiveDay,
  getCalendarFreeWindowsForSelectedBucket,
  getCalendarFreeWindowsSummaryCards,
} from "./calendar-free-windows.utils";

interface CalendarFreeWindowsProps {
  readonly viewModel: CalendarFreeWindowsViewModel;
}

export function CalendarFreeWindows({ viewModel }: CalendarFreeWindowsProps) {
  const activeDay = getCalendarFreeWindowsActiveDay(viewModel);
  const selectedWindows = getCalendarFreeWindowsForSelectedBucket(viewModel);
  const summaryCards = getCalendarFreeWindowsSummaryCards(viewModel);
  const firstSelectedWindow = selectedWindows[0] ?? activeDay.freeWindows[0];
  const firstSuggestedCandidate = firstSelectedWindow
    ? getCalendarCandidatesForWindow(viewModel, firstSelectedWindow.id)[0]
    : viewModel.suggestedCandidates[0];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
                UI-10 · Calendar / Free Windows
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {viewModel.title}
              </h1>

              <p className="mt-2 max-w-3xl text-[14px] leading-6 text-slate-600">
                {viewModel.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[12px] font-semibold text-indigo-700">
                {viewModel.activeDateLabel}
              </span>

              <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[12px] font-semibold text-cyan-700">
                {selectedWindows.length} matching windows
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {summaryCards.slice(0, 3).map((card) => (
              <article
                key={card.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="grid gap-6">
            <CalendarView viewModel={viewModel} />

            <FreeWindowFinder viewModel={viewModel} />
          </section>

          <aside className="grid gap-6 content-start">
            <CalendarDayCard day={activeDay} viewModel={viewModel} />

            {firstSuggestedCandidate ? (
              <SuggestedActionForWindow
                candidate={firstSuggestedCandidate}
                viewModel={viewModel}
                label="First candidate preview"
              />
            ) : null}

            <TimeBlockLegend items={viewModel.legend} />

            <CalendarNavigationLinks viewModel={viewModel} />

            <CalendarReadOnlyBoundary viewModel={viewModel} />
          </aside>
        </div>
      </div>
    </main>
  );
}
