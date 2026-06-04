import type { TodayTimelineCorrectionEntry } from "./today-timeline.types";

type CorrectionEntryProps = {
  readonly correction: TodayTimelineCorrectionEntry;
};

const correctionKindLabel: Record<TodayTimelineCorrectionEntry["kind"], string> = {
  time_adjustment: "Time adjustment",
  status_adjustment: "Status adjustment",
  domain_adjustment: "Domain adjustment",
  semantic_adjustment: "Semantic adjustment",
  note: "Note",
};

const formatCorrectionTimestamp = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export function CorrectionEntry({ correction }: CorrectionEntryProps) {
  return (
    <div
      aria-label="CorrectionEntry"
      className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-900">
            CorrectionEntry: {correction.title}
          </p>
          <p className="mt-1 text-slate-600">{correction.description}</p>
        </div>

        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {correctionKindLabel[correction.kind]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Read-only · {correction.isApplied ? "applied" : "not applied"}
        </span>
        <span className="rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {correction.createdByLabel}
        </span>
        <span className="rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {formatCorrectionTimestamp(correction.createdAt)}
        </span>
      </div>
    </div>
  );
}