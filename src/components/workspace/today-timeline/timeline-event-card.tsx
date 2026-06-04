import Link from "next/link";

import { CorrectionEntry } from "./correction-entry";
import type { TodayTimelineEvent } from "./today-timeline.types";
import {
  formatTodayTimelineDuration,
  formatTodayTimelineTimeRange,
  getTodayTimelineDomainLabel,
  getTodayTimelineStatusLabel,
  hasTodayTimelineConflict,
  hasTodayTimelineCorrections,
} from "./today-timeline.utils";

type TimelineEventCardProps = {
  readonly event: TodayTimelineEvent;
};

export function TimelineEventCard({ event }: TimelineEventCardProps) {
  return (
    <li aria-label="TimelineEventCard" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              {formatTodayTimelineTimeRange(event)}
            </span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900 ring-1 ring-indigo-100">
              {getTodayTimelineDomainLabel(event.domain)}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              {getTodayTimelineStatusLabel(event.status)}
            </span>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-950">{event.title}</h3>
            {event.description ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">{event.description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {event.valueObjects.map((valueObject) => (
              <Link
                key={valueObject.id}
                href={valueObject.href}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 underline-offset-4 hover:underline"
              >
                {valueObject.title}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-slate-500 lg:items-end">
          <span>{formatTodayTimelineDuration(event.durationMinutes)}</span>
          <span>{event.sourceLabel}</span>
          {event.locationLabel ? <span>{event.locationLabel}</span> : null}
        </div>
      </div>

      {hasTodayTimelineConflict(event) ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          ConflictMarker skeleton: visible read-only attention signal.
        </div>
      ) : null}

      {hasTodayTimelineCorrections(event) ? (
        <div className="mt-4 space-y-2">
          {event.corrections.map((correction) => (
            <CorrectionEntry key={correction.id} correction={correction} />
          ))}
        </div>
      ) : null}
    </li>
  );
}