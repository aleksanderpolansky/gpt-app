import type {
  ReviewAction,
  ReviewActionAvailability,
  ReviewActionFeedback,
  ReviewActionKind,
  ReviewPackage,
} from "./activity-review-types";

export const ACTIVITY_REVIEW_ACTIONS_CREATED =
  "ACTIVITY_REVIEW_ACTIONS_CREATED" as const;

export type ReviewActionTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export interface ReviewActionViewModel {
  id: string;
  kind: ReviewActionKind;
  kindLabel: string;
  label: string;
  description: string;
  availability: ReviewActionAvailability;
  availabilityLabel: string;
  tone: ReviewActionTone;
  isAvailable: boolean;
  disabledReason?: string;
  ariaLabel: string;
}

export interface ReviewActionsSummary {
  totalCount: number;
  availableCount: number;
  disabledCount: number;
  confirmCount: number;
  correctionCount: number;
  mergeLaterCount: number;
  rejectCount: number;
  askLaterCount: number;
  hasAvailableActions: boolean;
  hasDisabledActions: boolean;
  summaryText: string;
}

const ACTION_KIND_ORDER: ReviewActionKind[] = [
  "confirm_locally",
  "correct",
  "merge_later",
  "ask_later",
  "reject",
];

const ACTION_KIND_LABELS: Record<ReviewActionKind, string> = {
  confirm_locally: "Confirm locally",
  correct: "Correct",
  merge_later: "Merge later",
  reject: "Reject",
  ask_later: "Ask later",
};

const ACTION_AVAILABILITY_LABELS: Record<ReviewActionAvailability, string> = {
  disabled: "Недоступно",
  local_only: "Локально",
};

function getActionKindRank(kind: ReviewActionKind): number {
  const index = ACTION_KIND_ORDER.indexOf(kind);
  return index === -1 ? ACTION_KIND_ORDER.length : index;
}

export function getReviewActionKindLabel(kind: ReviewActionKind): string {
  return ACTION_KIND_LABELS[kind];
}

export function getReviewActionAvailabilityLabel(
  availability: ReviewActionAvailability,
): string {
  return ACTION_AVAILABILITY_LABELS[availability];
}

export function isReviewActionAvailable(action: ReviewAction): boolean {
  return action.availability === "local_only";
}

export function getReviewActionTone(action: ReviewAction): ReviewActionTone {
  if (action.availability === "disabled") {
    return "muted";
  }

  if (action.kind === "confirm_locally") {
    return "success";
  }

  if (action.kind === "correct") {
    return "accent";
  }

  if (action.kind === "merge_later" || action.kind === "ask_later") {
    return "warning";
  }

  if (action.kind === "reject") {
    return "danger";
  }

  return "neutral";
}

export function mapReviewActionToViewModel(
  action: ReviewAction,
): ReviewActionViewModel {
  const kindLabel = getReviewActionKindLabel(action.kind);
  const availabilityLabel = getReviewActionAvailabilityLabel(
    action.availability,
  );
  const isAvailable = isReviewActionAvailable(action);

  return {
    id: action.id,
    kind: action.kind,
    kindLabel,
    label: action.label,
    description: action.description,
    availability: action.availability,
    availabilityLabel,
    tone: getReviewActionTone(action),
    isAvailable,
    disabledReason: action.disabledReason,
    ariaLabel: `${kindLabel}: ${action.label}. ${availabilityLabel}. ${action.description}`,
  };
}

export function sortReviewActions(actions: ReviewAction[]): ReviewAction[] {
  return [...actions].sort((firstAction, secondAction) => {
    const availabilityDifference =
      Number(firstAction.availability === "disabled") -
      Number(secondAction.availability === "disabled");

    if (availabilityDifference !== 0) {
      return availabilityDifference;
    }

    const kindDifference =
      getActionKindRank(firstAction.kind) - getActionKindRank(secondAction.kind);

    if (kindDifference !== 0) {
      return kindDifference;
    }

    return firstAction.label.localeCompare(secondAction.label);
  });
}

export function mapReviewActionsToViewModels(
  actions: ReviewAction[],
): ReviewActionViewModel[] {
  return sortReviewActions(actions).map(mapReviewActionToViewModel);
}

export function getAvailableReviewActions(
  actions: ReviewAction[],
): ReviewAction[] {
  return sortReviewActions(
    actions.filter((action) => action.availability === "local_only"),
  );
}

export function getDisabledReviewActions(
  actions: ReviewAction[],
): ReviewAction[] {
  return sortReviewActions(
    actions.filter((action) => action.availability === "disabled"),
  );
}

export function getPrimaryReviewAction(
  actions: ReviewAction[],
): ReviewAction | undefined {
  const availableActions = getAvailableReviewActions(actions);
  return availableActions[0];
}

export function getConfirmReviewAction(
  actions: ReviewAction[],
): ReviewAction | undefined {
  return actions.find((action) => action.kind === "confirm_locally");
}

export function getCorrectReviewAction(
  actions: ReviewAction[],
): ReviewAction | undefined {
  return actions.find((action) => action.kind === "correct");
}

export function summarizeReviewActions(
  actions: ReviewAction[],
): ReviewActionsSummary {
  const availableCount = actions.filter(
    (action) => action.availability === "local_only",
  ).length;

  const disabledCount = actions.filter(
    (action) => action.availability === "disabled",
  ).length;

  const confirmCount = actions.filter(
    (action) => action.kind === "confirm_locally",
  ).length;

  const correctionCount = actions.filter(
    (action) => action.kind === "correct",
  ).length;

  const mergeLaterCount = actions.filter(
    (action) => action.kind === "merge_later",
  ).length;

  const rejectCount = actions.filter(
    (action) => action.kind === "reject",
  ).length;

  const askLaterCount = actions.filter(
    (action) => action.kind === "ask_later",
  ).length;

  const hasAvailableActions = availableCount > 0;
  const hasDisabledActions = disabledCount > 0;

  const summaryText =
    actions.length === 0
      ? "Действия пока не доступны."
      : `Actions: ${actions.length}. Local-only: ${availableCount}. Disabled: ${disabledCount}.`;

  return {
    totalCount: actions.length,
    availableCount,
    disabledCount,
    confirmCount,
    correctionCount,
    mergeLaterCount,
    rejectCount,
    askLaterCount,
    hasAvailableActions,
    hasDisabledActions,
    summaryText,
  };
}

export function hasLocalReviewActions(reviewPackage: ReviewPackage): boolean {
  return reviewPackage.actions.some(
    (action) => action.availability === "local_only",
  );
}

export function hasDisabledReviewActions(reviewPackage: ReviewPackage): boolean {
  return reviewPackage.actions.some(
    (action) => action.availability === "disabled",
  );
}

export function getReviewActionsRecommendation(
  reviewPackage: ReviewPackage,
): string {
  const summary = summarizeReviewActions(reviewPackage.actions);

  if (!summary.hasAvailableActions) {
    return "Нет доступных local-only actions; review package можно только просмотреть.";
  }

  if (reviewPackage.confidence.level === "low") {
    return "Лучше сначала нажать Correct или Ask later, потому что confidence низкий.";
  }

  if (reviewPackage.clarifyingQuestions.length > 0) {
    return "Перед Confirm locally стоит просмотреть уточняющие вопросы.";
  }

  return "Можно использовать Confirm locally; это не создаёт DB write и не является Activity Event.";
}

export function createReviewActionFeedback(
  action: ReviewAction,
  message?: string,
): ReviewActionFeedback {
  return {
    selectedActionId: action.id,
    selectedActionLabel: action.label,
    message:
      message ??
      `Local-only action selected: ${action.label}. No hidden writes were performed.`,
  };
}

export function createUnavailableReviewActionFeedback(
  action: ReviewAction,
): ReviewActionFeedback {
  return {
    selectedActionId: action.id,
    selectedActionLabel: action.label,
    message:
      action.disabledReason ??
      "This action is disabled in the current local-only review gate.",
  };
}

export function getVisibleReviewActions(
  actions: ReviewActionViewModel[],
  maxVisibleActions: number,
): ReviewActionViewModel[] {
  if (maxVisibleActions <= 0) {
    return [];
  }

  return actions.slice(0, maxVisibleActions);
}

export function countHiddenReviewActions(
  actions: ReviewActionViewModel[],
  maxVisibleActions: number,
): number {
  if (maxVisibleActions <= 0) {
    return actions.length;
  }

  return Math.max(0, actions.length - maxVisibleActions);
}
