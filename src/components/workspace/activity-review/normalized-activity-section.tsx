import type { ReviewNormalizedActivity } from "./activity-review-types";

export const NORMALIZED_ACTIVITY_SECTION_CREATED =
  "NORMALIZED_ACTIVITY_SECTION_CREATED" as const;

interface NormalizedActivitySectionProps {
  normalizedActivity: ReviewNormalizedActivity;
  title?: string;
  description?: string;
  className?: string;
}

interface NormalizedActivityMetaItem {
  id: string;
  label: string;
  value: string;
}

function formatDurationMinutes(durationMinutes: number): string {
  if (durationMinutes === 1) {
    return "1 минута";
  }

  return `${durationMinutes} минут`;
}

function buildNormalizedActivityMetaItems(
  normalizedActivity: ReviewNormalizedActivity,
): NormalizedActivityMetaItem[] {
  const items: NormalizedActivityMetaItem[] = [
    {
      id: "domain",
      label: "Domain",
      value: normalizedActivity.domainLabel,
    },
    {
      id: "status",
      label: "Status",
      value: normalizedActivity.statusLabel,
    },
  ];

  if (normalizedActivity.contextLabel !== undefined) {
    items.push({
      id: "context",
      label: "Context",
      value: normalizedActivity.contextLabel,
    });
  }

  if (normalizedActivity.durationMinutes !== undefined) {
    items.push({
      id: "duration",
      label: "Duration",
      value: formatDurationMinutes(normalizedActivity.durationMinutes),
    });
  }

  return items;
}

function getDomainBadgeClassName(domain: ReviewNormalizedActivity["domain"]): string {
  if (domain === "language") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200";
  }

  if (domain === "fitness" || domain === "health" || domain === "recovery") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  }

  if (domain === "nutrition") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
  }

  if (domain === "work" || domain === "money" || domain === "purchase") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200";
  }

  if (domain === "family") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
}

export function NormalizedActivitySection({
  normalizedActivity,
  title = "Я понял это так",
  description = "Нормализованная версия активности. Это локальная интерпретация-кандидат, а не подтверждённый факт.",
  className,
}: NormalizedActivitySectionProps) {
  const metaItems = buildNormalizedActivityMetaItems(normalizedActivity);
  const badgeClassName = getDomainBadgeClassName(normalizedActivity.domain);

  return (
    <section
      className={[
        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-950",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="normalized-activity-section-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Normalized candidate
          </p>
          <h2
            id="normalized-activity-section-title"
            className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        <span
          className={[
            "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold",
            badgeClassName,
          ].join(" ")}
        >
          {normalizedActivity.domainLabel}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300">
          Normalized title
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">
          {normalizedActivity.title}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
          {normalizedActivity.summary}
        </p>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {metaItems.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {item.label}
            </dt>
            <dd className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          Candidate note:
        </strong>{" "}
        normalized title, domain, context and duration are shown for review only.
        This component does not confirm truth and does not perform DB write.
      </div>
    </section>
  );
}
