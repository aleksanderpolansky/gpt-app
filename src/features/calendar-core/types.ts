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
  valueObjectIds?: string[];
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
