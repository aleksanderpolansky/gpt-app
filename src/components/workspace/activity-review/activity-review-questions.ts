import type {
  ReviewPackage,
  ReviewQuestion,
  ReviewQuestionKind,
} from "./activity-review-types";

export const ACTIVITY_REVIEW_QUESTIONS_CREATED =
  "ACTIVITY_REVIEW_QUESTIONS_CREATED" as const;

export type ReviewQuestionTone =
  | "neutral"
  | "accent"
  | "warning"
  | "danger"
  | "muted";

export interface ReviewQuestionViewModel {
  id: string;
  kind: ReviewQuestionKind;
  kindLabel: string;
  question: string;
  reason: string;
  required: false;
  requiredLabel: string;
  tone: ReviewQuestionTone;
  ariaLabel: string;
}

export interface ReviewQuestionGroup {
  kind: ReviewQuestionKind;
  kindLabel: string;
  tone: ReviewQuestionTone;
  questions: ReviewQuestionViewModel[];
}

export interface ReviewQuestionsSummary {
  totalCount: number;
  durationMissingCount: number;
  contextAmbiguousCount: number;
  privacyCautionCount: number;
  unknownTermCount: number;
  generalCount: number;
  hasQuestions: boolean;
  hasPrivacyCaution: boolean;
  hasUnknownTerms: boolean;
  hasDurationQuestion: boolean;
  hasContextQuestion: boolean;
  summaryText: string;
}

const QUESTION_KIND_ORDER: ReviewQuestionKind[] = [
  "duration_missing",
  "context_ambiguous",
  "privacy_caution",
  "unknown_term",
  "general",
];

const QUESTION_KIND_LABELS: Record<ReviewQuestionKind, string> = {
  duration_missing: "Нет длительности",
  context_ambiguous: "Неясный контекст",
  privacy_caution: "Приватность",
  unknown_term: "Неизвестный термин",
  general: "Уточнение",
};

function getQuestionKindRank(kind: ReviewQuestionKind): number {
  const index = QUESTION_KIND_ORDER.indexOf(kind);
  return index === -1 ? QUESTION_KIND_ORDER.length : index;
}

export function getReviewQuestionKindLabel(kind: ReviewQuestionKind): string {
  return QUESTION_KIND_LABELS[kind];
}

export function getReviewQuestionTone(
  question: ReviewQuestion,
): ReviewQuestionTone {
  if (question.kind === "privacy_caution") {
    return "warning";
  }

  if (question.kind === "unknown_term") {
    return "danger";
  }

  if (
    question.kind === "duration_missing" ||
    question.kind === "context_ambiguous"
  ) {
    return "accent";
  }

  return "neutral";
}

export function getReviewQuestionRequiredLabel(
  question: ReviewQuestion,
): string {
  return question.required ? "Обязательно" : "Необязательно";
}

export function mapReviewQuestionToViewModel(
  question: ReviewQuestion,
): ReviewQuestionViewModel {
  const kindLabel = getReviewQuestionKindLabel(question.kind);
  const requiredLabel = getReviewQuestionRequiredLabel(question);
  const tone = getReviewQuestionTone(question);

  return {
    id: question.id,
    kind: question.kind,
    kindLabel,
    question: question.question,
    reason: question.reason,
    required: question.required,
    requiredLabel,
    tone,
    ariaLabel: `${kindLabel}: ${question.question}. ${requiredLabel}.`,
  };
}

export function sortReviewQuestions(
  questions: ReviewQuestion[],
): ReviewQuestion[] {
  return [...questions].sort((firstQuestion, secondQuestion) => {
    const kindDifference =
      getQuestionKindRank(firstQuestion.kind) -
      getQuestionKindRank(secondQuestion.kind);

    if (kindDifference !== 0) {
      return kindDifference;
    }

    return firstQuestion.question.localeCompare(secondQuestion.question);
  });
}

export function mapReviewQuestionsToViewModels(
  questions: ReviewQuestion[],
): ReviewQuestionViewModel[] {
  return sortReviewQuestions(questions).map(mapReviewQuestionToViewModel);
}

export function groupReviewQuestionsByKind(
  questions: ReviewQuestion[],
): ReviewQuestionGroup[] {
  const mappedQuestions = mapReviewQuestionsToViewModels(questions);

  return QUESTION_KIND_ORDER.map((kind) => {
    const groupQuestions = mappedQuestions.filter(
      (question) => question.kind === kind,
    );

    return {
      kind,
      kindLabel: getReviewQuestionKindLabel(kind),
      tone: groupQuestions[0]?.tone ?? "muted",
      questions: groupQuestions,
    };
  }).filter((group) => group.questions.length > 0);
}

export function summarizeReviewQuestions(
  questions: ReviewQuestion[],
): ReviewQuestionsSummary {
  const durationMissingCount = questions.filter(
    (question) => question.kind === "duration_missing",
  ).length;

  const contextAmbiguousCount = questions.filter(
    (question) => question.kind === "context_ambiguous",
  ).length;

  const privacyCautionCount = questions.filter(
    (question) => question.kind === "privacy_caution",
  ).length;

  const unknownTermCount = questions.filter(
    (question) => question.kind === "unknown_term",
  ).length;

  const generalCount = questions.filter(
    (question) => question.kind === "general",
  ).length;

  const hasQuestions = questions.length > 0;
  const hasPrivacyCaution = privacyCautionCount > 0;
  const hasUnknownTerms = unknownTermCount > 0;
  const hasDurationQuestion = durationMissingCount > 0;
  const hasContextQuestion = contextAmbiguousCount > 0;

  let summaryText = "Уточняющих вопросов нет.";

  if (hasQuestions) {
    summaryText = `Уточняющие вопросы: ${questions.length}. Длительность: ${durationMissingCount}. Контекст: ${contextAmbiguousCount}. Privacy: ${privacyCautionCount}. Unknown: ${unknownTermCount}.`;
  }

  return {
    totalCount: questions.length,
    durationMissingCount,
    contextAmbiguousCount,
    privacyCautionCount,
    unknownTermCount,
    generalCount,
    hasQuestions,
    hasPrivacyCaution,
    hasUnknownTerms,
    hasDurationQuestion,
    hasContextQuestion,
    summaryText,
  };
}

export function getPrimaryReviewQuestion(
  questions: ReviewQuestion[],
): ReviewQuestion | undefined {
  return sortReviewQuestions(questions)[0];
}

export function getReviewQuestionsNeedingAttention(
  questions: ReviewQuestion[],
): ReviewQuestion[] {
  return sortReviewQuestions(
    questions.filter(
      (question) =>
        question.kind === "duration_missing" ||
        question.kind === "context_ambiguous" ||
        question.kind === "privacy_caution" ||
        question.kind === "unknown_term",
    ),
  );
}

export function getVisibleReviewQuestions(
  questions: ReviewQuestionViewModel[],
  maxVisibleQuestions: number,
): ReviewQuestionViewModel[] {
  if (maxVisibleQuestions <= 0) {
    return [];
  }

  return questions.slice(0, maxVisibleQuestions);
}

export function countHiddenReviewQuestions(
  questions: ReviewQuestionViewModel[],
  maxVisibleQuestions: number,
): number {
  if (maxVisibleQuestions <= 0) {
    return questions.length;
  }

  return Math.max(0, questions.length - maxVisibleQuestions);
}

export function hasReviewQuestions(
  reviewPackage: ReviewPackage,
): boolean {
  return reviewPackage.clarifyingQuestions.length > 0;
}

export function hasReviewPrivacyQuestions(
  reviewPackage: ReviewPackage,
): boolean {
  return reviewPackage.clarifyingQuestions.some(
    (question) => question.kind === "privacy_caution",
  );
}

export function hasReviewUnknownTermQuestions(
  reviewPackage: ReviewPackage,
): boolean {
  return reviewPackage.clarifyingQuestions.some(
    (question) => question.kind === "unknown_term",
  );
}

export function getReviewQuestionsRecommendation(
  reviewPackage: ReviewPackage,
): string {
  const summary = summarizeReviewQuestions(reviewPackage.clarifyingQuestions);

  if (!summary.hasQuestions) {
    return "Уточняющих вопросов нет; review package можно рассматривать как локально понятный кандидат.";
  }

  if (summary.hasPrivacyCaution) {
    return "Перед будущим сохранением нужно отдельно проверить приватность.";
  }

  if (summary.hasUnknownTerms) {
    return "Сначала стоит объяснить неизвестные термины, чтобы не создать неверные Value Object candidates.";
  }

  if (summary.hasDurationQuestion || summary.hasContextQuestion) {
    return "Стоит уточнить длительность или контекст, чтобы будущая аналитика была точнее.";
  }

  return "Можно ответить на вопросы позже; текущий результат остаётся local-only candidate package.";
}

export function getReviewQuestionsAriaSummary(
  reviewPackage: ReviewPackage,
): string {
  const summary = summarizeReviewQuestions(reviewPackage.clarifyingQuestions);
  const recommendation = getReviewQuestionsRecommendation(reviewPackage);

  return `${summary.summaryText} ${recommendation}`;
}

export function createLocalReviewQuestion(
  id: string,
  kind: ReviewQuestionKind,
  question: string,
  reason: string,
): ReviewQuestion {
  return {
    id,
    kind,
    question,
    reason,
    required: false,
  };
}
