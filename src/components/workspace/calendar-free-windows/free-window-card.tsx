import type {
  CalendarFreeWindow,
  CalendarFreeWindowsDomain,
  CalendarFreeWindowsViewModel,
  CalendarSuggestedActionForWindow,
} from "./calendar-free-windows.types";
import {
  formatCalendarFreeWindowsDuration,
  getCalendarCandidatesForWindow,
} from "./calendar-free-windows.utils";

interface FreeWindowCardProps {
  readonly freeWindow: CalendarFreeWindow;
  readonly viewModel: CalendarFreeWindowsViewModel;
  readonly titlePrefix?: string;
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

const fitStateClasses: Record<CalendarSuggestedActionForWindow["fitState"], string> = {
  blocked_by_context: "border-rose-100 bg-rose-50 text-rose-700",
  fits: "border-emerald-100 bg-emerald-50 text-emerald-700",
  tight: "border-orange-100 bg-orange-50 text-orange-700",
  too_short: "border-slate-200 bg-slate-50 text-slate-500",
};

const energyClasses: Record<CalendarFreeWindow["energyLevel"], string> = {
  high: "border-emerald-100 bg-emerald-50 text-emerald-700",
  low: "border-teal-100 bg-teal-50 text-teal-700",
  medium: "border-amber-100 bg-amber-50 text-amber-700",
};

const attentionClasses: Record<CalendarFreeWindow["attentionLevel"], string> = {
  deep: "border-violet-100 bg-violet-50 text-violet-700",
  focused: "border-indigo-100 bg-indigo-50 text-indigo-700",
  shallow: "border-slate-200 bg-slate-50 text-slate-600",
};

function CandidatePreview({
  candidate,
}: {
  readonly candidate: CalendarSuggestedActionForWindow;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${fitStateClasses[candidate.fitState]}`}
        >
          {candidate.fitState}
        </span>

        <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">
          {candidate.durationBucket} min
        </span>

        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${domainClasses[candidate.domain]}`}>
          {candidate.domain}
        </span>
      </div>

      <p className="mt-2 text-[12px] font-semibold text-slate-950">
        {candidate.title}
      </p>

      <p className="mt-1 text-[12px] leading-5 text-slate-600">
        {candidate.description}
      </p>

      <p className="mt-2 text-[12px] leading-5 text-slate-500">
        {candidate.reason}
      </p>
    </article>
  );
}

export function FreeWindowCard({
  freeWindow,
  viewModel,
  titlePrefix = "Free window",
}: FreeWindowCardProps) {
  const candidates = getCalendarCandidatesForWindow(viewModel, freeWindow.id);

  return (
    <article className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
            {titlePrefix}
          </p>

          <h3 className="mt-1 text-sm font-semibold text-slate-950">
            {freeWindow.title}
          </h3>

          <p className="mt-1 text-[13px] leading-6 text-slate-600">
            {freeWindow.description}
          </p>
        </div>

        <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[12px] font-semibold text-cyan-700">
          {formatCalendarFreeWindowsDuration(freeWindow.range.durationMinutes)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
          {freeWindow.range.start}–{freeWindow.range.end}
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${domainClasses[freeWindow.domain]}`}
        >
          {freeWindow.domain}
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${energyClasses[freeWindow.energyLevel]}`}
        >
          {freeWindow.energyLevel} energy
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${attentionClasses[freeWindow.attentionLevel]}`}
        >
          {freeWindow.attentionLevel} attention
        </span>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Available buckets
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {freeWindow.availableBuckets.map((bucket) => (
            <span
              key={bucket}
              className={
                bucket === viewModel.selectedDurationBucket
                  ? "rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700"
                  : "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600"
              }
            >
              {bucket} min
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Constraint ids
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {freeWindow.constraintIds.map((constraintId) => (
              <span
                key={constraintId}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600"
              >
                {constraintId}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700">
            Candidate previews
          </p>

          <div className="mt-2 grid gap-2">
            {candidates.length > 0 ? (
              candidates.map((candidate) => (
                <CandidatePreview key={candidate.id} candidate={candidate} />
              ))
            ) : (
              <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] leading-5 text-slate-600">
                No candidate action is attached to this free window in the
                current fixture.
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
