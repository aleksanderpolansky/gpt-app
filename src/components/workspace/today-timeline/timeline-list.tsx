import type { TodayTimelineEvent } from "./today-timeline.types";
import { TimelineEventCard } from "./timeline-event-card";

type TimelineListProps = {
  readonly events: readonly TodayTimelineEvent[];
  readonly emptyStateTitle: string;
  readonly emptyStateDescription: string;
};

export function TimelineList({
  events,
  emptyStateTitle,
  emptyStateDescription,
}: TimelineListProps) {
  return (
    <div aria-label="TimelineList" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-slate-950">TimelineList</h2>
        <p className="text-sm text-slate-500">
          Chronological read-only Activity Events rendered from fixture data.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-base font-semibold text-slate-900">{emptyStateTitle}</p>
          <p className="mt-2 text-sm text-slate-500">{emptyStateDescription}</p>
        </div>
      ) : (
        <ol className="space-y-4">
          {events.map((event) => (
            <TimelineEventCard key={event.id} event={event} />
          ))}
        </ol>
      )}
    </div>
  );
}