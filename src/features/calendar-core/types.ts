export type CalendarViewMode = "day" | "week" | "month";

export type CalendarEventKind =
  | "planned_activity"
  | "activity_fact"
  | "external_event"
  | "time_block"
  | "candidate";

export type CalendarEventStatus =
  | "planned"
  | "done"
  | "candidate"
  | "cancelled"
  | "hidden";

export type CalendarEventSource =
  | "manual"
  | "ai_semantic_preview"
  | "google_calendar"
  | "biometric_import"
  | "system";

export type CalendarEventLayer =
  | "personal"
  | "work"
  | "business"
  | "health"
  | "certificates"
  | "points";

export type CalendarValueObjectRef = {
  id: string;
  title: string;
  branchTypeCode: string | null;
  objectKind: string | null;
  parentValueObjectId: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  kind: CalendarEventKind;
  status: CalendarEventStatus;
  source: CalendarEventSource;
  layer: CalendarEventLayer;
  isPrivate: boolean;
  semanticPreviewId?: string | null;
  activityEventId?: string | null;
  valueObjectIds?: string[];
  valueObjects?: CalendarValueObjectRef[];
};

export type CalendarAllDayScheduleMode =
  | "date_only"
  | "date_range"
  | "deadline";

export type CalendarAllDayItem = {
  id: string;
  activityEventId: string;
  title: string;
  inputText: string | null;
  description: string | null;
  source: string | null;
  privacyScope: string | null;
  status: string | null;
  scheduleModeCode: CalendarAllDayScheduleMode;
  scheduledDate: string | null;
  scheduleStartDate: string | null;
  scheduleEndDate: string | null;
  deadlineAt: string | null;
  startDate: string;
  endDate: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  dueAt: string | null;
  updatedAt: string | null;
  valueObjectIds: string[];
  valueObjects: CalendarValueObjectRef[];
};

export type CalendarRange = {
  start: Date;
  end: Date;
};

export type CalendarViewModel = {
  view: CalendarViewMode;
  focusDate: Date;
  range: CalendarRange;
  events: CalendarEvent[];
};
