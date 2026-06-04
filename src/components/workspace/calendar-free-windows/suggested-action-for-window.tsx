import type {
  CalendarFreeWindowsDomain,
  CalendarFreeWindowsFitState,
  CalendarFreeWindowsViewModel,
  CalendarSuggestedActionForWindow,
} from "./calendar-free-windows.types";

interface SuggestedActionForWindowProps {
  readonly candidate: CalendarSuggestedActionForWindow;
  readonly viewModel: CalendarFreeWindowsViewModel;
  readonly label?: string;
  readonly compact?: boolean;
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

const fitStateClasses: Record<CalendarFreeWindowsFitState, string> = {
  blocked_by_context: "border-rose-100 bg-rose-50 text-rose-700",
  fits: "border-emerald-100 bg-emerald-50 text-emerald-700",
  tight: "border-orange-100 bg-orange-50 text-orange-700",
  too_short: "border-slate-200 bg-slate-50 text-slate-500",
};

const candidateStateClasses: Record<
  CalendarSuggestedActionForWindow["state"],
  string
> = {
  blocked_by_constraints: "border-rose-100 bg-rose-50 text-rose-700",
  candidate: "border-cyan-100 bg-cyan-50 text-cyan-700",
  deferred: "border-slate-200 bg-slate-50 text-slate-600",
  preview: "border-violet-100 bg-violet-50 text-violet-700",
};

function getConstraintLabels(
  viewModel: CalendarFreeWindowsViewModel,
  candidate: CalendarSuggestedActionForWindow,
): readonly string[] {
  return candidate.constraintIds.map((constraintId) => {
    const constraint = viewModel.constraints.find((item) => {
      return item.id === constraintId;
    });

    return constraint?.label ?? constraintId;
  });
}

export function SuggestedActionForWindow({
  candidate,
  viewModel,
  label = "Suggested action",
  compact = false,
}: SuggestedActionForWindowProps) {
  const constraintLabels = getConstraintLabels(viewModel, candidate);

  return (
    <article className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700">
            {label}
          </p>

          <h3 className="mt-1 text-sm font-semibold text-slate-950">
            {candidate.title}
          </h3>

          <p className="mt-1 text-[13px] leading-6 text-slate-600">
            {candidate.description}
          </p>
        </div>

        <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[12px] font-semibold text-violet-700">
          {candidate.durationBucket} min
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${domainClasses[candidate.domain]}`}
        >
          {candidate.domain}
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${fitStateClasses[candidate.fitState]}`}
        >
          {candidate.fitState}
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${candidateStateClasses[candidate.state]}`}
        >
          {candidate.state}
        </span>
      </div>

      {compact ? null : (
        <div className="mt-4 grid gap-3">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Why this candidate appears
            </p>

            <p className="mt-2 text-[12px] leading-5 text-slate-600">
              {candidate.reason}
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Constraint context
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {constraintLabels.map((constraintLabel) => (
                <span
                  key={constraintLabel}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                >
                  {constraintLabel}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              Read-only boundary
            </p>

            <p className="mt-2 text-[12px] leading-5 text-amber-800">
              This card previews a candidate action only. UI-10 does not choose
              the final Next Best Action and does not save anything to a live
              calendar.
            </p>
          </section>
        </div>
      )}
    </article>
  );
}
