import Link from "next/link";

import type { TodayTimelineDomainFilter } from "./today-timeline.types";
import { formatTodayTimelineDuration } from "./today-timeline.utils";

type DomainFiltersProps = {
  readonly filters: readonly TodayTimelineDomainFilter[];
  readonly workspaceHref?: string;
};

export function DomainFilters({ filters, workspaceHref = "/workspace" }: DomainFiltersProps) {
  return (
    <section aria-label="DomainFilters" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Domain filters</h2>
          <p className="mt-1 text-sm text-slate-500">
            Read-only filter preview. Interactive filtering stays closed until a dedicated UI step.
          </p>
        </div>

        <Link
          href={workspaceHref}
          className="text-sm font-semibold text-indigo-700 underline-offset-4 hover:underline"
        >
          Back to workspace
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <span
            key={filter.id}
            className={
              filter.isActive
                ? "rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900"
                : "rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600"
            }
          >
            {filter.label} · {filter.totalEvents} · {formatTodayTimelineDuration(filter.totalMinutes)}
          </span>
        ))}
      </div>
    </section>
  );
}