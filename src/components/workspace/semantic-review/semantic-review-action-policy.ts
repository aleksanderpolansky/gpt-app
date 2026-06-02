import type {
  SemanticReviewActionKind,
  SemanticReviewAllowedAction,
  SemanticReviewDecisionPreview,
  SemanticReviewItem,
  SemanticReviewQueue,
} from "./semantic-review-types";

export const SEMANTIC_REVIEW_ACTION_POLICY_CREATED = true as const;

export type SemanticReviewActionPolicyMode =
  | "ui_preview_only"
  | "local_queue_only"
  | "blocked_until_feedback_gate";

export interface SemanticReviewActionPolicyInput {
  item: SemanticReviewItem;
  requestedActionKind?: SemanticReviewActionKind;
  mode?: SemanticReviewActionPolicyMode;
}

export interface SemanticReviewActionPolicyResult {
  itemId: string;
  selectedAction?: SemanticReviewAllowedAction;
  allowedActions: ReadonlyArray<SemanticReviewAllowedAction>;
  disabledActions: ReadonlyArray<SemanticReviewAllowedAction>;
  localOnlyActions: ReadonlyArray<SemanticReviewAllowedAction>;
  decisionPreview: SemanticReviewDecisionPreview;
  summary: string;
  canChangeRecords: false;
  policyMode: SemanticReviewActionPolicyMode;
}

export const semanticReviewActionCopy: Record<
  SemanticReviewActionKind,
  {
    label: string;
    description: string;
    safePreviewText: string;
  }
> = {
  confirm_local_candidate: {
    label: "Confirm candidate",
    description:
      "Preview that the selected candidate looks useful for the local semantic model.",
    safePreviewText:
      "Confirmation is shown as a preview only and does not change records.",
  },
  reject_candidate: {
    label: "Reject preview",
    description:
      "Preview that this candidate should stay out of the local semantic model.",
    safePreviewText:
      "Rejecting here only changes the visible preview state, not stored data.",
  },
  merge_later: {
    label: "Merge later",
    description:
      "Preview that two similar meanings may need a future merge decision.",
    safePreviewText:
      "Merge remains unavailable until a separate feedback gate exists.",
  },
  ask_later: {
    label: "Ask later",
    description:
      "Keep the item visible in the review queue without changing records.",
    safePreviewText:
      "The item remains in the local queue for later review.",
  },
  open_source_review: {
    label: "Open source review",
    description:
      "Explain where the candidate meaning came from and why it needs review.",
    safePreviewText:
      "Opening a source review is informational only.",
  },
};

export function isSemanticReviewWriteAction(
  action: SemanticReviewAllowedAction,
): boolean {
  return action.isWriteAction;
}

export function isSemanticReviewLocalOnlyAction(
  action: SemanticReviewAllowedAction,
): boolean {
  return action.isLocalOnly;
}

export function canRunSemanticReviewAction(
  action: SemanticReviewAllowedAction,
): boolean {
  return action.availability !== "disabled" && !action.isWriteAction;
}

export function getSemanticReviewActionPolicyReason(
  action: SemanticReviewAllowedAction,
): string {
  if (action.disabledReason) {
    return action.disabledReason;
  }

  if (action.isLocalOnly) {
    return "This action is local-only and does not change stored records.";
  }

  if (action.isWriteAction) {
    return "This action is blocked in UI-6 because record changes need a separate gate.";
  }

  return "This action is allowed only as a safe UI preview.";
}

export function createSemanticReviewAllowedAction(
  kind: SemanticReviewActionKind,
  availability: SemanticReviewAllowedAction["availability"],
  options: {
    id?: string;
    disabledReason?: string;
    isLocalOnly?: boolean;
  } = {},
): SemanticReviewAllowedAction {
  const copy = semanticReviewActionCopy[kind];

  return {
    id: options.id ?? kind,
    kind,
    label: copy.label,
    description: copy.description,
    availability,
    disabledReason: options.disabledReason,
    isWriteAction: false,
    isLocalOnly: options.isLocalOnly ?? availability !== "disabled",
  };
}

export function createSemanticReviewDecisionPreview(
  item: SemanticReviewItem,
  action: SemanticReviewAllowedAction,
): SemanticReviewDecisionPreview {
  const copy = semanticReviewActionCopy[action.kind];

  return {
    selectedActionId: action.id,
    label: copy.label,
    description: `${copy.description} ${copy.safePreviewText}`,
    safetyNote: [
      "Candidate, not truth.",
      "No Activity Events, Value Objects, global categories, state facts, points, or commercial records are created.",
      `Item: ${item.title}.`,
      getSemanticReviewActionPolicyReason(action),
    ].join(" "),
    willCreateRecords: false,
  };
}

export function getSemanticReviewAllowedActions(
  item: SemanticReviewItem,
): ReadonlyArray<SemanticReviewAllowedAction> {
  return item.actions.filter((action) => canRunSemanticReviewAction(action));
}

export function getSemanticReviewDisabledActions(
  item: SemanticReviewItem,
): ReadonlyArray<SemanticReviewAllowedAction> {
  return item.actions.filter((action) => !canRunSemanticReviewAction(action));
}

export function getSemanticReviewLocalOnlyActions(
  item: SemanticReviewItem,
): ReadonlyArray<SemanticReviewAllowedAction> {
  return item.actions.filter((action) => action.isLocalOnly);
}

export function getPrimarySemanticReviewAction(
  item: SemanticReviewItem,
): SemanticReviewAllowedAction | undefined {
  const allowedActions = getSemanticReviewAllowedActions(item);

  return (
    allowedActions.find((action) => action.kind === "ask_later") ??
    allowedActions[0] ??
    item.actions[0]
  );
}

export function getSecondarySemanticReviewActions(
  item: SemanticReviewItem,
): ReadonlyArray<SemanticReviewAllowedAction> {
  const primaryAction = getPrimarySemanticReviewAction(item);

  if (!primaryAction) {
    return item.actions;
  }

  return item.actions.filter((action) => action.id !== primaryAction.id);
}

export function getSemanticReviewActionPolicySummary(
  item: SemanticReviewItem,
): string {
  const allowedCount = getSemanticReviewAllowedActions(item).length;
  const disabledCount = getSemanticReviewDisabledActions(item).length;
  const localOnlyCount = getSemanticReviewLocalOnlyActions(item).length;

  return `${allowedCount} safe preview actions, ${localOnlyCount} local-only actions, ${disabledCount} blocked actions.`;
}

export function buildSemanticReviewActionPolicy(
  input: SemanticReviewActionPolicyInput,
): SemanticReviewActionPolicyResult {
  const policyMode = input.mode ?? "ui_preview_only";
  const allowedActions = getSemanticReviewAllowedActions(input.item);
  const disabledActions = getSemanticReviewDisabledActions(input.item);
  const localOnlyActions = getSemanticReviewLocalOnlyActions(input.item);

  const selectedAction =
    input.requestedActionKind
      ? input.item.actions.find((action) => action.kind === input.requestedActionKind)
      : getPrimarySemanticReviewAction(input.item);

  const safeSelectedAction =
    selectedAction ??
    createSemanticReviewAllowedAction("ask_later", "local_only", {
      id: "fallback-ask-later",
      isLocalOnly: true,
    });

  return {
    itemId: input.item.id,
    selectedAction: safeSelectedAction,
    allowedActions,
    disabledActions,
    localOnlyActions,
    decisionPreview: createSemanticReviewDecisionPreview(
      input.item,
      safeSelectedAction,
    ),
    summary: getSemanticReviewActionPolicySummary(input.item),
    canChangeRecords: false,
    policyMode,
  };
}

export function buildSemanticReviewQueueActionSummary(
  queue: SemanticReviewQueue,
): string {
  const totalActions = queue.items.reduce(
    (sum, item) => sum + item.actions.length,
    0,
  );

  const localOnlyActions = queue.items.reduce(
    (sum, item) => sum + getSemanticReviewLocalOnlyActions(item).length,
    0,
  );

  const disabledActions = queue.items.reduce(
    (sum, item) => sum + getSemanticReviewDisabledActions(item).length,
    0,
  );

  return `${queue.items.length} items, ${totalActions} actions, ${localOnlyActions} local-only, ${disabledActions} disabled.`;
}

export function applySemanticReviewActionPreview(
  item: SemanticReviewItem,
  actionKind: SemanticReviewActionKind,
): SemanticReviewDecisionPreview {
  const policy = buildSemanticReviewActionPolicy({
    item,
    requestedActionKind: actionKind,
    mode: "ui_preview_only",
  });

  return policy.decisionPreview;
}
