/**
 * ARCTor.app PP1 activity model contract.
 *
 * Compile-time contract for the canonical planned/actual activity foundation.
 * PP1A adds the database foundation; PP1B switches user-facing write paths.
 */

export const ACTIVITY_ROLE_CODES_PP1 = ["planned", "actual"] as const;
export type ActivityRoleCodePp1 = (typeof ACTIVITY_ROLE_CODES_PP1)[number];

export const ACTIVITY_SCHEDULE_MODE_CODES_PP1 = [
  "unscheduled",
  "date_only",
  "date_range",
  "deadline",
  "exact",
] as const;
export type ActivityScheduleModeCodePp1 =
  (typeof ACTIVITY_SCHEDULE_MODE_CODES_PP1)[number];

export const PLANNED_ACTIVITY_STATUS_CODES_PP1 = [
  "draft",
  "planned",
  "confirmed",
  "cancelled",
  "missed",
  "archived",
] as const;
export type PlannedActivityStatusCodePp1 =
  (typeof PLANNED_ACTIVITY_STATUS_CODES_PP1)[number];

export const ACTUAL_ACTIVITY_STATUS_CODES_PP1 = [
  "draft",
  "started",
  "paused",
  "completed",
  "corrected",
  "cancelled",
  "imported_pending",
  "archived",
] as const;
export type ActualActivityStatusCodePp1 =
  (typeof ACTUAL_ACTIVITY_STATUS_CODES_PP1)[number];

export const ACTIVITY_VALUE_OBJECT_LINK_TYPE_CODES_PP1 = [
  "semantic_exposure",
  "planned_target",
] as const;
export type ActivityValueObjectLinkTypeCodePp1 =
  (typeof ACTIVITY_VALUE_OBJECT_LINK_TYPE_CODES_PP1)[number];

export interface ActivityActorContextPp1 {
  readonly ownerUserId: string;
  readonly ownerActorId: string;
}

export interface ActivityScheduleUnscheduledPp1 {
  readonly scheduleModeCode: "unscheduled";
}

export interface ActivityScheduleDateOnlyPp1 {
  readonly scheduleModeCode: "date_only";
  readonly scheduledDate: string;
}

export interface ActivityScheduleDateRangePp1 {
  readonly scheduleModeCode: "date_range";
  readonly scheduleStartDate: string;
  readonly scheduleEndDate: string;
}

export interface ActivityScheduleDeadlinePp1 {
  readonly scheduleModeCode: "deadline";
  readonly deadlineAt: string;
}

export interface ActivityScheduleExactPp1 {
  readonly scheduleModeCode: "exact";
  readonly startedAt: string;
  readonly endedAt?: string | null;
  readonly durationMinutes?: number | null;
  readonly createCalendarProjection?: boolean;
}

export type PlannedActivitySchedulePp1 =
  | ActivityScheduleUnscheduledPp1
  | ActivityScheduleDateOnlyPp1
  | ActivityScheduleDateRangePp1
  | ActivityScheduleDeadlinePp1
  | ActivityScheduleExactPp1;

interface ActivityCreateBasePp1 {
  readonly title: string;
  readonly inputText?: string | null;
  readonly description?: string | null;
  readonly source?: string;
  readonly privacyScope?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type PlannedActivityCreatePp1 = ActivityCreateBasePp1 &
  PlannedActivitySchedulePp1 & {
    readonly activityRoleCode: "planned";
    readonly status?: PlannedActivityStatusCodePp1;
    readonly plannedTargetValueObjectIds?: readonly string[];
  };

export interface ActualActivityCreatePp1 extends ActivityCreateBasePp1 {
  readonly activityRoleCode: "actual";
  readonly status?: ActualActivityStatusCodePp1;
  readonly startedAt?: string | null;
  readonly endedAt?: string | null;
  readonly durationMinutes?: number | null;
  readonly fulfillsPlannedActivityEventId?: string | null;
}

export type ActivityCreatePp1 =
  | PlannedActivityCreatePp1
  | ActualActivityCreatePp1;

export interface ActivityCreateResultPp1 {
  readonly ok: true;
  readonly disposition: "created" | "idempotent_replay";
  readonly activityEvent: Readonly<Record<string, unknown>>;
  readonly calendarEvent: Readonly<Record<string, unknown>> | null;
  readonly plannedTargetValueObjectIds: readonly string[];
}
