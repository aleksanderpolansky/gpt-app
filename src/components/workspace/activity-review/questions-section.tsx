import type { ReviewQuestion } from "./activity-review-types";
import {
  countHiddenReviewQuestions,
  getReviewQuestionsRecommendation,
  getVisibleReviewQuestions,
  mapReviewQuestionsToViewModels,
  summarizeReviewQuestions,
} from "./activity-review-questions";
import type {
  ReviewQuestionTone,
  ReviewQuestionViewModel,
} from "./activity-review-questions";

export const QUESTIONS_SECTION_CREATED =
  "QUESTIONS_SECTION_CREATED" as const;

interface QuestionsSectionProps {
  questions: ReviewQuestion[];
  title?: string;
  description?: string;
  maxVisibleQuestions?: number;
  className?: string;
}

interface QuestionCardProps {
  question: ReviewQuestionViewModel;
}

const QUESTION_TONE_CLASS_NAMES: Record<ReviewQuestionTone, string> = {
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
  accent:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  danger:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
  muted:
    "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400",
};

function getQuestionToneClassName(tone: ReviewQuestionTone): string {
  return QUESTION_TONE_CLASS_NAMES[tone];
}

function buildQuestionsAriaSummary(
  questions: ReviewQuestionViewModel[],
  hiddenCount: number,
): string {
  const visibleCount = questions.length;

  if (visibleCount === 0 && hiddenCount === 0) {
    return "Clarifying questions are not available for this local review package.";
  }

  if (hiddenCount > 0) {
    return `Clarifying questions visible: ${visibleCount}. Hidden questions: ${hiddenCount}.`;
  }

  return `Clarifying questions visible: ${visibleCount}.`;
}

function QuestionCard({ question }: QuestionCardProps) {
  return (
    <li
      className={[
        "rounded-2xl border px-4 py-3",
        getQuestionToneClassName(question.tone),
      ].join(" ")}
      aria-label={question.ariaLabel}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
            {question.kindLabel}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6">
            {question.question}
          </p>
          <p className="mt-2 text-xs leading-5 opacity-80">
            {question.reason}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {question.requiredLabel}
        </span>
      </div>
    </li>
  );
}

export function QuestionsSection({
  questions,
  title = "Clarifying questions",
  description = "Эти вопросы помогают уточнить local-only review package перед будущими действиями. Ответы пока не сохраняются.",
  maxVisibleQuestions,
  className,
}: QuestionsSectionProps) {
  const mappedQuestions = mapReviewQuestionsToViewModels(questions);
  const visibleQuestions =
    maxVisibleQuestions === undefined
      ? mappedQuestions
      : getVisibleReviewQuestions(mappedQuestions, maxVisibleQuestions);
  const hiddenCount =
    maxVisibleQuestions === undefined
      ? 0
      : countHiddenReviewQuestions(mappedQuestions, maxVisibleQuestions);
  const summary = summarizeReviewQuestions(questions);
  const recommendation = getReviewQuestionsRecommendation({
    id: "questions-section-local-review-package",
    status: "candidate",
    rawActivity: {
      id: "questions-section-local-raw",
      rawText: "",
      localCreatedAt: "",
      source: "local",
      status: "preview",
    },
    normalizedActivity: {
      title: "",
      summary: "",
      domain: "general",
      domainLabel: "General",
      statusLabel: "Candidate",
    },
    semanticChips: [],
    metrics: [],
    confidence: {
      level: "medium",
      score: 0.55,
      label: "Medium confidence",
      explanation: "Questions section local package.",
      sourceRule: "questions-section-local-summary-rule",
    },
    clarifyingQuestions: questions,
    linkedValueObjectCandidates: [],
    actions: [],
    safetyNotes: [],
  });
  const ariaSummary = buildQuestionsAriaSummary(
    visibleQuestions,
    hiddenCount,
  );

  return (
    <section
      className={[
        "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-950",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="questions-section-title"
      aria-describedby="questions-section-summary"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Clarification gate
          </p>
          <h2
            id="questions-section-title"
            className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {mappedQuestions.length} questions
        </span>
      </div>

      <p
        id="questions-section-summary"
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      >
        {summary.summaryText}
      </p>

      <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
        <strong className="font-semibold">Recommendation:</strong>{" "}
        {recommendation}
      </div>

      <div className="mt-4" aria-label={ariaSummary}>
        {visibleQuestions.length > 0 ? (
          <ul className="grid gap-3">
            {visibleQuestions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Clarifying questions are not available yet.
          </div>
        )}
      </div>

      {hiddenCount > 0 ? (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          +{hiddenCount} hidden questions in this local-only review preview.
        </p>
      ) : null}

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          Candidate note:
        </strong>{" "}
        questions are clarification candidates only. This component does not
        save answers, does not create Activity Event and does not perform DB write.
      </div>
    </section>
  );
}
