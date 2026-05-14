export const ACTIVITY_STATUS_VALUES = [
  "draft",
  "planned",
  "confirmed",
  "started",
  "paused",
  "completed",
  "cancelled",
  "missed",
  "corrected",
  "imported_pending",
  "archived",
] as const;

export type ActivityStatus = (typeof ACTIVITY_STATUS_VALUES)[number];

export const ACTIVITY_STATUS_DRAFT: ActivityStatus = "draft";
export const ACTIVITY_STATUS_PLANNED: ActivityStatus = "planned";
export const ACTIVITY_STATUS_CONFIRMED: ActivityStatus = "confirmed";
export const ACTIVITY_STATUS_STARTED: ActivityStatus = "started";
export const ACTIVITY_STATUS_PAUSED: ActivityStatus = "paused";
export const ACTIVITY_STATUS_COMPLETED: ActivityStatus = "completed";
export const ACTIVITY_STATUS_CANCELLED: ActivityStatus = "cancelled";
export const ACTIVITY_STATUS_MISSED: ActivityStatus = "missed";
export const ACTIVITY_STATUS_CORRECTED: ActivityStatus = "corrected";
export const ACTIVITY_STATUS_IMPORTED_PENDING: ActivityStatus = "imported_pending";
export const ACTIVITY_STATUS_ARCHIVED: ActivityStatus = "archived";

export const ACTIVITY_DRAFT_STATUSES = ["draft"] as const;

export const ACTIVITY_PLANNING_STATUSES = [
  "planned",
  "confirmed",
] as const;

export const ACTIVITY_ACTIVE_STATUSES = [
  "started",
  "paused",
] as const;

export const ACTIVITY_COMPLETABLE_STATUSES = [
  "started",
  "paused",
] as const;

export const ACTIVITY_FACT_STATUSES = [
  "completed",
] as const;

export const ACTIVITY_IMPORT_REVIEW_STATUSES = [
  "imported_pending",
] as const;

export const ACTIVITY_ROLLBACK_ONLY_STATUSES = [
  "cancelled",
  "missed",
  "archived",
  "corrected",
] as const;

export const ACTIVITY_TERMINAL_STATUSES = [
  "completed",
  "cancelled",
  "missed",
  "corrected",
  "archived",
] as const;

export const ACTIVITY_TIMELINE_EXCLUDED_STATUSES = [
  "cancelled",
  "missed",
  "archived",
  "corrected",
] as const;

export const ACTIVITY_PROCESSING_STATUS_VALUES = [
  "pending",
  "processed",
  "failed",
  "skipped",
] as const;

export type ActivityProcessingStatus =
  (typeof ACTIVITY_PROCESSING_STATUS_VALUES)[number];

export type ActivityStatusTransitionKind =
  | "same_status"
  | "draft_flow"
  | "planning_flow"
  | "active_flow"
  | "pause_resume_flow"
  | "completion_flow"
  | "import_review_flow"
  | "rollback_flow"
  | "archive_flow"
  | "not_allowed";

export type ActivityStatusTransitionResult = {
  fromStatus: ActivityStatus;
  toStatus: ActivityStatus;
  allowed: boolean;
  transitionKind: ActivityStatusTransitionKind;
  reason: string;
};

const ACTIVITY_STATUS_SET = new Set<string>(ACTIVITY_STATUS_VALUES);
const ACTIVITY_PROCESSING_STATUS_SET = new Set<string>(
  ACTIVITY_PROCESSING_STATUS_VALUES
);

const ACTIVITY_ROLLBACK_ONLY_STATUS_SET = new Set<string>(
  ACTIVITY_ROLLBACK_ONLY_STATUSES
);

const ACTIVITY_TERMINAL_STATUS_SET = new Set<string>(
  ACTIVITY_TERMINAL_STATUSES
);

const ACTIVITY_TIMELINE_EXCLUDED_STATUS_SET = new Set<string>(
  ACTIVITY_TIMELINE_EXCLUDED_STATUSES
);

const ACTIVITY_COMPLETABLE_STATUS_SET = new Set<string>(
  ACTIVITY_COMPLETABLE_STATUSES
);

export const ACTIVITY_STATUS_TRANSITIONS: Record<
  ActivityStatus,
  readonly ActivityStatus[]
> = {
  draft: [
    "planned",
    "confirmed",
    "started",
    "completed",
    "cancelled",
    "archived",
  ],

  planned: [
    "confirmed",
    "started",
    "completed",
    "cancelled",
    "missed",
    "archived",
  ],

  confirmed: [
    "planned",
    "started",
    "completed",
    "cancelled",
    "missed",
    "archived",
  ],

  started: [
    "paused",
    "completed",
    "cancelled",
    "missed",
    "archived",
  ],

  paused: [
    "started",
    "completed",
    "cancelled",
    "missed",
    "archived",
  ],

  completed: [
    "corrected",
    "cancelled",
    "missed",
    "archived",
  ],

  cancelled: [
    "archived",
  ],

  missed: [
    "archived",
  ],

  corrected: [
    "archived",
  ],

  imported_pending: [
    "draft",
    "planned",
    "confirmed",
    "completed",
    "cancelled",
    "archived",
  ],

  archived: [],
};

function asTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function isActivityStatus(value: unknown): value is ActivityStatus {
  const status = asTrimmedString(value);

  if (!status) {
    return false;
  }

  return ACTIVITY_STATUS_SET.has(status);
}

export function isActivityProcessingStatus(
  value: unknown
): value is ActivityProcessingStatus {
  const status = asTrimmedString(value);

  if (!status) {
    return false;
  }

  return ACTIVITY_PROCESSING_STATUS_SET.has(status);
}

export function normalizeActivityStatus(
  value: unknown,
  fallback: ActivityStatus = "draft"
): ActivityStatus {
  const status = asTrimmedString(value);

  if (isActivityStatus(status)) {
    return status;
  }

  return fallback;
}

export function normalizeActivityProcessingStatus(
  value: unknown,
  fallback: ActivityProcessingStatus = "pending"
): ActivityProcessingStatus {
  const status = asTrimmedString(value);

  if (isActivityProcessingStatus(status)) {
    return status;
  }

  return fallback;
}

export function isRollbackOnlyActivityStatus(value: unknown) {
  const status = asTrimmedString(value);

  if (!status) {
    return false;
  }

  return ACTIVITY_ROLLBACK_ONLY_STATUS_SET.has(status);
}

export function isTerminalActivityStatus(value: unknown) {
  const status = asTrimmedString(value);

  if (!status) {
    return false;
  }

  return ACTIVITY_TERMINAL_STATUS_SET.has(status);
}

export function shouldExcludeActivityStatusFromTimeline(value: unknown) {
  const status = asTrimmedString(value);

  if (!status) {
    return false;
  }

  return ACTIVITY_TIMELINE_EXCLUDED_STATUS_SET.has(status);
}

export function isCompletableActivityStatus(value: unknown) {
  const status = asTrimmedString(value);

  if (!status) {
    return false;
  }

  return ACTIVITY_COMPLETABLE_STATUS_SET.has(status);
}

export function getAllowedNextActivityStatuses(
  fromStatus: ActivityStatus
): readonly ActivityStatus[] {
  return ACTIVITY_STATUS_TRANSITIONS[fromStatus] ?? [];
}

export function canTransitionActivityStatus(params: {
  fromStatus: unknown;
  toStatus: unknown;
  allowSameStatus?: boolean;
}): ActivityStatusTransitionResult {
  const fromStatus = normalizeActivityStatus(params.fromStatus, "draft");
  const toStatus = normalizeActivityStatus(params.toStatus, "draft");
  const allowSameStatus = params.allowSameStatus ?? true;

  if (fromStatus === toStatus) {
    return {
      fromStatus,
      toStatus,
      allowed: allowSameStatus,
      transitionKind: allowSameStatus ? "same_status" : "not_allowed",
      reason: allowSameStatus
        ? "No lifecycle transition is required because the status is unchanged."
        : "Same-status transition is not allowed in this context.",
    };
  }

  const allowedNextStatuses = getAllowedNextActivityStatuses(fromStatus);

  if (!allowedNextStatuses.includes(toStatus)) {
    return {
      fromStatus,
      toStatus,
      allowed: false,
      transitionKind: "not_allowed",
      reason: `Transition from ${fromStatus} to ${toStatus} is not allowed by Activity Lifecycle v2 policy.`,
    };
  }

  if (fromStatus === "draft") {
    return {
      fromStatus,
      toStatus,
      allowed: true,
      transitionKind: "draft_flow",
      reason: `Draft activity can transition to ${toStatus}.`,
    };
  }

  if (fromStatus === "planned" || fromStatus === "confirmed") {
    return {
      fromStatus,
      toStatus,
      allowed: true,
      transitionKind: "planning_flow",
      reason: `Planned or confirmed activity can transition to ${toStatus}.`,
    };
  }

  if (fromStatus === "started" && toStatus === "paused") {
    return {
      fromStatus,
      toStatus,
      allowed: true,
      transitionKind: "pause_resume_flow",
      reason: "Started activity can be paused.",
    };
  }

  if (fromStatus === "paused" && toStatus === "started") {
    return {
      fromStatus,
      toStatus,
      allowed: true,
      transitionKind: "pause_resume_flow",
      reason: "Paused activity can be resumed.",
    };
  }

  if (fromStatus === "started" || fromStatus === "paused") {
    return {
      fromStatus,
      toStatus,
      allowed: true,
      transitionKind:
        toStatus === "completed" ? "completion_flow" : "active_flow",
      reason: `Active activity can transition to ${toStatus}.`,
    };
  }

  if (fromStatus === "completed") {
    return {
      fromStatus,
      toStatus,
      allowed: true,
      transitionKind:
        toStatus === "archived" ? "archive_flow" : "rollback_flow",
      reason: `Completed activity can transition to ${toStatus} through correction or rollback flow.`,
    };
  }

  if (fromStatus === "imported_pending") {
    return {
      fromStatus,
      toStatus,
      allowed: true,
      transitionKind: "import_review_flow",
      reason: `Imported pending activity can be reviewed and transitioned to ${toStatus}.`,
    };
  }

  return {
    fromStatus,
    toStatus,
    allowed: true,
    transitionKind: toStatus === "archived" ? "archive_flow" : "not_allowed",
    reason: `Transition from ${fromStatus} to ${toStatus} is allowed by explicit lifecycle map.`,
  };
}

export function assertActivityStatus(value: unknown): ActivityStatus {
  if (!isActivityStatus(value)) {
    throw new Error(`Unsupported activity status: ${String(value)}`);
  }

  return value;
}

export function assertActivityProcessingStatus(
  value: unknown
): ActivityProcessingStatus {
  if (!isActivityProcessingStatus(value)) {
    throw new Error(
      `Unsupported activity processing status: ${String(value)}`
    );
  }

  return value;
}

