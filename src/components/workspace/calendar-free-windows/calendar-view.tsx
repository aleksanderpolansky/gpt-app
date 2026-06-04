import type {
  CalendarFreeWindowsDay,
  CalendarFreeWindowsDomain,
  CalendarFreeWindowsTimeBlock,
  CalendarFreeWindowsViewModel,
} from "./calendar-free-windows.types";
import {
  formatCalendarFreeWindowsDuration,
  getCalendarFreeWindowsDayCandidateCount,
} from "./calendar-free-windows.utils";

interface CalendarViewProps {
  readonly viewModel: CalendarFreeWindowsViewModel;
}

const domainClasses: Record<CalendarFreeWindowsDomain, string> = {
  admin: "border-slate-200 bg-slate-50 text-slate-700",
  business: "border-violet-100 bg-violet-50 text-violet-700",
  errand: "border-orange-100 bg-orange-50 text-orange-700",
  family: "border-rose-100 bg-rose-50 text-rose-700",
  health: "border-emerald-100 bg-emerald-50 text-emerald-700",
  language: "border-indigo-100 bg-indigo-50 text-indigo-700",
  learning: "border-amber-100 bg-amber-50 text-amber-700",
  mixed: "border-cyan-100 bg-cyan-50 text-cyan-700",
  recovery: "border-teal-100 bg-teal-50 text-teal-700",
  work: "border-slate-200 bg-slate-100 text-slate-700",
};

const blockKindClasses: Record<CalendarFreeWindowsTimeBlock["kind"], string> = {
  busy: "border-slate-200 bg-slate-50",
  free: "border-cyan-100 bg-cyan-50",
  blocked: "border-rose-100 bg-rose-50",
};

function CalendarDayMiniSummary({
  day,
  candidateCount,
}: {
  readonly day: CalendarFreeWindowsDay;
  readonly candidateCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Free
        </p>
        <p className="mt-1 text-[12px] font-semibold text-slate-950">
          {formatCalendarFreeWindowsDuration(day.summary.freeMinutes)}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Largest
        </p>
        <p className="mt-1 text-[12px] font-semibold text-slate-950">
          {formatCalendarFreeWindowsDuration(day.summary.largestFreeWindowMinutes)}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Candidates
        </p>
        <p className="mt-1 text-[12px] font-semibold text-slate-950">
          {candidateCount}
        </p>
      </div>
    </div>
  );
}

export function CalendarView({ viewModel }: CalendarViewProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Calendar view
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Free windows across visible days
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-6 text-slate-600">
            This read-only view combines fixed blocks, protected contexts and
            available windows without writing to any calendar provider.
          </p>
        </div>

        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[12px] font-semibold text-indigo-700">
          {viewModel.activeDateLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {viewModel.days.map((day) => {
          const candidateCount = getCalendarFreeWindowsDayCandidateCount(
            viewModel,
            day.id,
          );

          return (
            <article
              key={day.id}
              className={
                day.isToday
                  ? "rounded-2xl border border-indigo-200 bg-indigo-50 p-4"
                  : "rounded-2xl border border-slate-200 bg-slate-50 p-4"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {day.weekdayLabel}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-950">
                    {day.dayLabel}
                  </h3>
                  <p className="mt-1 text-[12px] text-slate-600">
                    {day.isoDate}
                  </p>
                </div>

                <span
                  className={
                    day.isToday
                      ? "rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700"
                      : "rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  }
                >
                  {day.isToday ? "today" : "preview"}
                </span>
              </div>

              <div className="mt-4">
                <CalendarDayMiniSummary
                  day={day}
                  candidateCount={candidateCount}
                />
              </div>

              <div className="mt-4 grid gap-2">
                {day.blocks.map((block) => (
                  <div
                    key={block.id}
                    className={`rounded-xl border p-3 ${blockKindClasses[block.kind]}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${domainClasses[block.domain]}`}
                      >
                        {block.kind}
                      </span>
                      <span className="text-[12px] font-semibold text-slate-950">
                        {block.range.start}–{block.range.end}
                      </span>
                    </div>

                    <p className="mt-2 text-[12px] font-semibold text-slate-950">
                      {block.title}
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-slate-600">
                      {block.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-2">
                {day.freeWindows.map((window) => (
                  <div
                    key={window.id}
                    className="rounded-xl border border-cyan-100 bg-white p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                        free
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${domainClasses[window.domain]}`}
                      >
                        {window.domain}
                      </span>
                    </div>

                    <p className="mt-2 text-[12px] font-semibold text-slate-950">
                      {window.range.start}–{window.range.end} ·{" "}
                      {formatCalendarFreeWindowsDuration(
                        window.range.durationMinutes,
                      )}
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-slate-600">
                      {window.title}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
