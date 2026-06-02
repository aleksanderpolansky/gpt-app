import type { ReviewAction, ReviewActionFeedback } from "./activity-review-types";
import {
  countHiddenReviewActions,
  getVisibleReviewActions,
  mapReviewActionsToViewModels,
  summarizeReviewActions,
} from "./activity-review-actions";
import type {
  ReviewActionTone,
  ReviewActionViewModel,
} from "./activity-review-actions";

export const REVIEW_ACTIONS_SECTION_CREATED =
  "REVIEW_ACTIONS_SECTION_CREATED" as const;

interface ReviewActionsSectionProps {
  actions: ReviewAction[];
  feedback?: ReviewActionFeedback;
  confidenceLevel?: "high" | "medium" | "low";
  clarifyingQuestionCount?: number;
  title?: string;
  description?: string;
  maxVisibleActions?: number;
  className?: string;
}

interface ReviewActionCardProps {
  action: ReviewActionViewModel;
}

const ACTION_TONE_CLASS_NAMES: Record<ReviewActionTone, string> = {
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
  accent:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
  muted:
    "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400",
};

function getActionToneClassName(tone: ReviewActionTone): string {
  return ACTION_TONE_CLASS_NAMES[tone];
}

function getActionButtonClassName(action: ReviewActionViewModel): string {
  if (!action.isAvailable) {
    return "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500";
  }

  if (action.tone === "success") {
    return "border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600";
  }

  if (action.tone === "accent") {
    return "border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700 dark:border-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600";
  }

  if (action.tone === "warning") {
    return "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900";
  }

  if (action.tone === "danger") {
    return "border-rose-200 bg-rose-100 text-rose-800 hover:bg-rose-200 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900";
  }

  return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
}

function getLocalReviewActionsRecommendation(
  actions: ReviewAction[],
  confidenceLevel: "high" | "medium" | "low",
  clarifyingQuestionCount: number,
): string {
  const summary = summarizeReviewActions(actions);

  if (!summary.hasAvailableActions) {
    return "Нет доступных local-only actions; review package можно только просмотреть.";
  }

  if (confidenceLevel === "low") {
    return "Лучше сначала использовать Correct или Ask later, потому что confidence низкий.";
  }

  if (clarifyingQuestionCount > 0) {
    return "Перед Confirm locally стоит просмотреть уточняющие вопросы.";
  }

  return "Можно использовать Confirm locally; это не создаёт DB write и не является Activity Event.";
}

function buildReviewActionsAriaSummary(
  actions: ReviewActionViewModel[],
  hiddenCount: number,
): string {
  const visibleCount = actions.length;

  if (visibleCount === 0 && hiddenCount === 0) {
    return "Review actions are not available for this local review package.";
  }

  if (hiddenCount > 0) {
    return `Review actions visible: ${visibleCount}. Hidden actions: ${hiddenCount}.`;
  }

  return `Review actions visible: ${visibleCount}.`;
}

function ReviewActionCard({ action }: ReviewActionCardProps) {
  const disabledMessage =
    action.disabledReason ?? "This action is disabled in the current local-only review gate.";

  return (
    <li
      className={[
        "rounded-2xl border px-4 py-3",
        getActionToneClassName(action.tone),
      ].join(" ")}
      aria-label={action.ariaLabel}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
            {action.kindLabel}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6">
            {action.label}
          </p>
          <p className="mt-2 text-xs leading-5 opacity-80">
            {action.description}
          </p>
        </div>

        <button
          type="button"
          disabled={!action.isAvailable}
          className={[
            "inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition",
            getActionButtonClassName(action),
          ].join(" ")}
          aria-disabled={!action.isAvailable}
          title={action.isAvailable ? action.description : disabledMessage}
        >
          {action.availabilityLabel}
        </button>
      </div>

      {!action.isAvailable ? (
        <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          {disabledMessage}
        </p>
      ) : null}
    </li>
  );
}

export function ReviewActionsSection({
  actions,
  feedback,
  confidenceLevel = "medium",
  clarifyingQuestionCount = 0,
  title = "Review actions",
  description = "Эта секция показывает local-only actions для review package. Кнопки не выполняют DB write и не создают Activity Event.",
  maxVisibleActions,
  className,
}: ReviewActionsSectionProps) {
  const mappedActions = mapReviewActionsToViewModels(actions);
  const visibleActions =
    maxVisibleActions === undefined
      ? mappedActions
      : getVisibleReviewActions(mappedActions, maxVisibleActions);
  const hiddenCount =
    maxVisibleActions === undefined
      ? 0
      : countHiddenReviewActions(mappedActions, maxVisibleActions);
  const summary = summarizeReviewActions(actions);
  const recommendation = getLocalReviewActionsRecommendation(
    actions,
    confidenceLevel,
    clarifyingQuestionCount,
  );
  const ariaSummary = buildReviewActionsAriaSummary(visibleActions, hiddenCount);

  return (
    <section
      className={[
        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-950",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="review-actions-section-title"
      aria-describedby="review-actions-section-summary"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Local action gate
          </p>
          <h2
            id="review-actions-section-title"
            className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
          {summary.availableCount} local-only
        </span>
      </div>

      <p
        id="review-actions-section-summary"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      >
        {summary.summaryText}
      </p>

      <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
        <strong className="font-semibold">Recommendation:</strong>{" "}
        {recommendation}
      </div>

      {feedback !== undefined ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <strong className="font-semibold">
            {feedback.selectedActionLabel}:
          </strong>{" "}
          {feedback.message}
        </div>
      ) : null}

      <div className="mt-4" aria-label={ariaSummary}>
        {visibleActions.length > 0 ? (
          <ul className="grid gap-3">
            {visibleActions.map((action) => (
              <ReviewActionCard key={action.id} action={action} />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Review actions are not available yet.
          </div>
        )}
      </div>

      {hiddenCount > 0 ? (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          +{hiddenCount} hidden actions in this local-only review preview.
        </p>
      ) : null}

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          Candidate note:
        </strong>{" "}
        actions are UI review controls only. This component does not save data,
        does not create Value Objects, does not create Activity Event and does
        not perform DB write.
      </div>
    </section>
  );
}
