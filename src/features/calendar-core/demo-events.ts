import type { CalendarEvent } from "./types";

export const calendarRebuildDemoEvents: CalendarEvent[] = [
  {
    id: "demo-planned-train-station",
    title: "\u043f\u043e\u0435\u0437\u0434\u043a\u0430 \u043d\u0430 \u0436\u0434 \u0432\u043e\u043a\u0437\u0430\u043b",
    startAt: "2026-07-03T11:30:00+02:00",
    endAt: "2026-07-03T12:00:00+02:00",
    timezone: "Europe/Warsaw",
    kind: "planned_activity",
    status: "planned",
    source: "ai_semantic_preview",
    layer: "personal",
    isPrivate: true,
    semanticPreviewId: "demo-semantic-preview-planned-activity",
    valueObjectIds: ["transport", "time", "personal-log"],
  },
  {
    id: "demo-two-hour-work-block",
    title: "\u0433\u043b\u0443\u0431\u043e\u043a\u0430\u044f \u0440\u0430\u0431\u043e\u0442\u0430 \u043d\u0430\u0434 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u0435\u043c",
    startAt: "2026-07-03T14:00:00+02:00",
    endAt: "2026-07-03T16:00:00+02:00",
    timezone: "Europe/Warsaw",
    kind: "time_block",
    status: "planned",
    source: "manual",
    layer: "work",
    isPrivate: true,
  },
];
