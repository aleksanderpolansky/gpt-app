import type { TodayTimelineDaySummary } from "./today-timeline.types";
import { formatTodayTimelineDuration } from "./today-timeline.utils";

type DaySummaryProps = {
  readonly summary: TodayTimelineDaySummary;
};

export function DaySummary({ summary }: DaySummaryProps) {
  const reviewSignalCount = summary.conflictCount + summary.correctionCount;

  return (
    <section aria-label="DaySummary" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Date</p>
        <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.dateLabel}</p>
        <p className="mt-1 text-sm text-slate-500">{summary.timezoneLabel}</p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Activity events</p>
        <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.totalEvents}</p>
        <p className="mt-1 text-sm text-slate-500">
          {summary.completedEvents} completed · {summary.activeEvents} active
        </p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Recorded time</p>
        <p className="mt-2 text-2xl font-semibold text-slate-950">
          {formatTodayTimelineDuration(summary.totalMinutes)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {formatTodayTimelineDuration(summary.focusMinutes)} focus ·{" "}
          {formatTodayTimelineDuration(summary.recoveryMinutes)} recovery
        </p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Review signals</p>
        <p className="mt-2 text-2xl font-semibold text-slate-950">{reviewSignalCount}</p>
        <p className="mt-1 text-sm text-slate-500">
          {summary.conflictCount} conflicts · {summary.correctionCount} corrections
        </p>
      </article>
    </section>
  );
}