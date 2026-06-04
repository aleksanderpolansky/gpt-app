import type {
  TodayTimelineConflictMarker,
  TodayTimelineConflictSeverity,
} from "./today-timeline.types";

type ConflictMarkerProps = {
  readonly conflict: TodayTimelineConflictMarker;
};

const severityClassName: Record<TodayTimelineConflictSeverity, string> = {
  info: "border-cyan-200 bg-cyan-50 text-cyan-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  critical: "border-red-200 bg-red-50 text-red-950",
};

const severityLabelClassName: Record<TodayTimelineConflictSeverity, string> = {
  info: "text-cyan-800",
  warning: "text-amber-800",
  critical: "text-red-800",
};

export function ConflictMarker({ conflict }: ConflictMarkerProps) {
  return (
    <article
      aria-label="ConflictMarker"
      className={`rounded-2xl border p-4 ${severityClassName[conflict.severity]}`}
    >
      <p className="text-sm font-semibold">{conflict.title}</p>
      <p className="mt-2 text-sm leading-6">{conflict.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`text-xs font-semibold uppercase tracking-[0.16em] ${
            severityLabelClassName[conflict.severity]
          }`}
        >
          {conflict.severity} · read-only
        </span>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {conflict.affectedEventIds.length} affected events
        </span>
      </div>
    </article>
  );
}