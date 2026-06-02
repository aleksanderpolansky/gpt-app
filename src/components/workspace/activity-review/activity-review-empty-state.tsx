export const ACTIVITY_REVIEW_EMPTY_STATE_CREATED =
  "ACTIVITY_REVIEW_EMPTY_STATE_CREATED" as const;

interface ActivityReviewEmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

interface EmptyStateStep {
  id: string;
  label: string;
  description: string;
}

const EMPTY_STATE_STEPS: EmptyStateStep[] = [
  {
    id: "capture",
    label: "1. Describe activity",
    description: "Введите активность обычным языком в local Activity Capture.",
  },
  {
    id: "preview",
    label: "2. Local parser preview",
    description: "UI покажет parser candidate без сохранения данных.",
  },
  {
    id: "review",
    label: "3. Review card",
    description: "После preview появится карточка “Я понял это так”.",
  },
];

function buildEmptyStateAriaLabel(title: string): string {
  return `${title}. Empty Activity Review Card state. No hidden writes. No Activity Event. No DB write.`;
}

function EmptyStateStepItem({ step }: { step: EmptyStateStep }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {step.label}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {step.description}
      </p>
    </li>
  );
}

export function ActivityReviewEmptyState({
  title = "Review card will appear here",
  description = "Пока parserResult пустой, ActivityReviewCard не строится. Заполни Activity Capture и нажми local preview, чтобы увидеть candidate package.",
  className,
}: ActivityReviewEmptyStateProps) {
  return (
    <section
      className={[
        "rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-5",
        "dark:border-slate-700 dark:bg-slate-900",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={buildEmptyStateAriaLabel(title)}
      data-ui5-review-empty-state="activity-review-empty-state"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Activity Review empty state
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-50">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        <span className="inline-flex shrink-0 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-200">
          candidate package waits
        </span>
      </div>

      <ol className="mt-5 grid gap-3 lg:grid-cols-3">
        {EMPTY_STATE_STEPS.map((step) => (
          <EmptyStateStepItem key={step.id} step={step} />
        ))}
      </ol>

      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        <strong className="font-semibold">No hidden writes:</strong>{" "}
        this empty state does not save data, does not create Value Objects, does
        not create Activity Event and does not perform DB write.
      </div>
    </section>
  );
}
