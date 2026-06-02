import type {
  ReviewActionFeedback,
  ReviewPackage,
} from "./activity-review-types";
import { ConfidenceSection } from "./confidence-section";
import { LinkedValueObjectsSection } from "./linked-value-objects-section";
import { NormalizedActivitySection } from "./normalized-activity-section";
import { QuestionsSection } from "./questions-section";
import { RawActivitySection } from "./raw-activity-section";
import { ReviewActionsSection } from "./review-actions-section";
import { ReviewMetricsSection } from "./review-metrics-section";
import { SafetyNotesSection } from "./safety-notes-section";
import { SemanticChipsSection } from "./semantic-chips-section";

export const ACTIVITY_REVIEW_CARD_CREATED =
  "ACTIVITY_REVIEW_CARD_CREATED" as const;

interface ActivityReviewCardProps {
  reviewPackage: ReviewPackage;
  actionFeedback?: ReviewActionFeedback;
  title?: string;
  description?: string;
  className?: string;
}

interface ActivityReviewCardHeaderProps {
  reviewPackage: ReviewPackage;
  title: string;
  description: string;
}

interface ActivityReviewCardStatsProps {
  reviewPackage: ReviewPackage;
}

function getReviewStatusLabel(reviewPackage: ReviewPackage): string {
  if (reviewPackage.status === "candidate") {
    return "Candidate package";
  }

  return "Local review package";
}

function buildReviewCardAriaLabel(reviewPackage: ReviewPackage): string {
  return `Activity review card. ${getReviewStatusLabel(reviewPackage)}. ${reviewPackage.normalizedActivity.title}.`;
}

function ActivityReviewCardStats({
  reviewPackage,
}: ActivityReviewCardStatsProps) {
  const stats = [
    {
      id: "semantic-chips",
      label: "Chips",
      value: String(reviewPackage.semanticChips.length),
    },
    {
      id: "metrics",
      label: "Metrics",
      value: String(reviewPackage.metrics.length),
    },
    {
      id: "questions",
      label: "Questions",
      value: String(reviewPackage.clarifyingQuestions.length),
    },
    {
      id: "value-objects",
      label: "VO candidates",
      value: String(reviewPackage.linkedValueObjectCandidates.length),
    },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {item.label}
          </dt>
          <dd className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ActivityReviewCardHeader({
  reviewPackage,
  title,
  description,
}: ActivityReviewCardHeaderProps) {
  return (
    <header className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-200">
            Activity Review Card
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {description}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <span className="inline-flex rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-slate-950 dark:text-indigo-200">
            {getReviewStatusLabel(reviewPackage)}
          </span>
          <span className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-200">
            No hidden writes
          </span>
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
            {reviewPackage.id}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <ActivityReviewCardStats reviewPackage={reviewPackage} />
      </div>
    </header>
  );
}

export function ActivityReviewCard({
  reviewPackage,
  actionFeedback,
  title = "Я понял это так",
  description = "Проверь локальную интерпретацию активности перед будущим write gate. Эта карточка ничего не сохраняет и показывает candidate package, not truth.",
  className,
}: ActivityReviewCardProps) {
  return (
    <article
      className={[
        "space-y-5 rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={buildReviewCardAriaLabel(reviewPackage)}
    >
      <ActivityReviewCardHeader
        reviewPackage={reviewPackage}
        title={title}
        description={description}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-5">
          <RawActivitySection rawActivity={reviewPackage.rawActivity} />
          <NormalizedActivitySection
            normalizedActivity={reviewPackage.normalizedActivity}
          />
          <SemanticChipsSection
            chips={reviewPackage.semanticChips}
            maxVisibleChips={12}
          />
          <ReviewMetricsSection
            metrics={reviewPackage.metrics}
            confidence={reviewPackage.confidence}
            maxVisibleMetrics={6}
          />
        </div>

        <aside className="space-y-5" aria-label="Activity review side panel">
          <ConfidenceSection
            reviewPackage={reviewPackage}
            maxVisibleDiagnostics={6}
          />
          <QuestionsSection
            questions={reviewPackage.clarifyingQuestions}
            maxVisibleQuestions={5}
          />
          <LinkedValueObjectsSection
            candidates={reviewPackage.linkedValueObjectCandidates}
            maxVisibleCandidates={5}
          />
          <ReviewActionsSection
            actions={reviewPackage.actions}
            confidenceLevel={reviewPackage.confidence.level}
            clarifyingQuestionCount={reviewPackage.clarifyingQuestions.length}
            maxVisibleActions={5}
            {...(actionFeedback !== undefined
              ? { feedback: actionFeedback }
              : {})}
          />
          <SafetyNotesSection
            safetyNotes={reviewPackage.safetyNotes}
            maxVisibleNotes={5}
          />
        </aside>
      </div>

      <footer className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          UI-5 boundary:
        </strong>{" "}
        ActivityReviewCard is a local-only review shell. It does not save data,
        does not create Value Objects, does not create Activity Event and does
        not perform DB write.
      </footer>
    </article>
  );
}
