import type { ReviewRawActivity } from "./activity-review-types";

export const RAW_ACTIVITY_SECTION_CREATED =
  "RAW_ACTIVITY_SECTION_CREATED" as const;

interface RawActivitySectionProps {
  rawActivity: ReviewRawActivity;
  title?: string;
  description?: string;
  className?: string;
}

const SOURCE_LABELS: Record<ReviewRawActivity["source"], string> = {
  local: "Local input",
};

const STATUS_LABELS: Record<ReviewRawActivity["status"], string> = {
  draft: "Draft",
  preview: "Preview",
};

function formatRawActivityDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildRawActivityMetaItems(rawActivity: ReviewRawActivity): string[] {
  return [
    `ID: ${rawActivity.id}`,
    `Source: ${SOURCE_LABELS[rawActivity.source]}`,
    `Status: ${STATUS_LABELS[rawActivity.status]}`,
    `Created: ${formatRawActivityDate(rawActivity.localCreatedAt)}`,
  ];
}

export function RawActivitySection({
  rawActivity,
  title = "Raw activity",
  description = "Исходная запись пользователя до нормализации. Это только local-only review, без сохранения и без hidden writes.",
  className,
}: RawActivitySectionProps) {
  const metaItems = buildRawActivityMetaItems(rawActivity);

  return (
    <section
      className={[
        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-950",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="raw-activity-section-title"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Candidate input
        </p>
        <h2
          id="raw-activity-section-title"
          className="text-lg font-semibold text-slate-950 dark:text-slate-50"
        >
          {title}
        </h2>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-900 dark:text-slate-100">
          {rawActivity.rawText}
        </p>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {metaItems.map((item) => {
          const [label, ...valueParts] = item.split(": ");
          const value = valueParts.join(": ");

          return (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {label}
              </dt>
              <dd className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                {value}
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          Safety note:
        </strong>{" "}
        эта секция показывает только исходный локальный ввод. Она не создаёт
        Activity Event, не создаёт Value Objects и не выполняет DB write.
      </div>
    </section>
  );
}
