import type { CalendarFreeWindowsDurationBucket } from "./calendar-free-windows.types";
import { getCalendarFreeWindowsBucketLabel } from "./calendar-free-windows.utils";

interface DurationBucketFilterProps {
  readonly buckets: readonly CalendarFreeWindowsDurationBucket[];
  readonly selectedBucket: CalendarFreeWindowsDurationBucket;
  readonly windowCounts?: Partial<Record<CalendarFreeWindowsDurationBucket, number>>;
  readonly candidateCounts?: Partial<Record<CalendarFreeWindowsDurationBucket, number>>;
}

export function DurationBucketFilter({
  buckets,
  selectedBucket,
  windowCounts = {},
  candidateCounts = {},
}: DurationBucketFilterProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Duration buckets
        </p>
        <h2 className="text-lg font-semibold text-slate-950">
          Selectable time-window sizes
        </h2>
        <p className="text-[13px] leading-6 text-slate-600">
          UI-10 keeps the bucket choice read-only for now. The selected bucket
          explains which windows can fit short, medium or focused actions.
        </p>
      </div>

      <div className="mt-4 grid gap-2">
        {buckets.map((bucket) => {
          const isSelected = bucket === selectedBucket;
          const windowCount = windowCounts[bucket] ?? 0;
          const candidateCount = candidateCounts[bucket] ?? 0;

          return (
            <article
              key={bucket}
              className={
                isSelected
                  ? "rounded-xl border border-indigo-200 bg-indigo-50 p-3"
                  : "rounded-xl border border-slate-200 bg-slate-50 p-3"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={
                      isSelected
                        ? "text-[13px] font-semibold text-indigo-950"
                        : "text-[13px] font-semibold text-slate-950"
                    }
                  >
                    {getCalendarFreeWindowsBucketLabel(bucket)}
                  </p>
                  <p
                    className={
                      isSelected
                        ? "mt-1 text-[12px] leading-5 text-indigo-700"
                        : "mt-1 text-[12px] leading-5 text-slate-600"
                    }
                  >
                    {windowCount} windows · {candidateCount} candidates
                  </p>
                </div>

                <span
                  className={
                    isSelected
                      ? "rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700"
                      : "rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  }
                >
                  {isSelected ? "active" : "preview"}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
