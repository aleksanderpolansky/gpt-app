import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

type ShelfGroupKey = "unscheduled" | "dueSoon" | "needsClarification";

type ShelfItem = {
  id: string;
  title: string;
  status: string | null;
  scheduleModeCode: string | null;
  scheduledDate: string | null;
  scheduleStartDate: string | null;
  scheduleEndDate: string | null;
  deadlineAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  dueAt: string | null;
  enrichmentStatus: string | null;
  enrichmentUpdatedAt: string | null;
  updatedAt: string | null;
};

const ACTIVE_PLANNED_STATUSES = ["draft", "planned", "confirmed"] as const;
const MAX_PREVIEW_LIMIT = 20;
const DEFAULT_PREVIEW_LIMIT = 12;
const MAX_SCAN_LIMIT = 500;
const DEFAULT_SCAN_LIMIT = 300;
const DEFAULT_DUE_DAYS = 7;
const MAX_DUE_DAYS = 31;

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function asRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is JsonRecord =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function parseIntegerParam(
  searchParams: URLSearchParams,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const raw = searchParams.get(name);

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function titleForActivity(row: JsonRecord) {
  return (
    asString(row.title) ??
    asString(row.description) ??
    asString(row.input_text) ??
    "Untitled planned activity"
  );
}

function parseDateOnlyAtEndOfDay(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const timestamp = Date.parse(`${value}T23:59:59.999Z`);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function effectiveDueTimestamp(row: JsonRecord) {
  const scheduleModeCode = asString(row.schedule_mode_code);

  if (scheduleModeCode === "deadline") {
    return parseTimestamp(asString(row.deadline_at));
  }

  if (scheduleModeCode === "date_only") {
    return parseDateOnlyAtEndOfDay(asString(row.scheduled_date));
  }

  if (scheduleModeCode === "date_range") {
    return parseDateOnlyAtEndOfDay(
      asString(row.schedule_end_date) ??
        asString(row.schedule_start_date),
    );
  }

  return null;
}

function toShelfItem(
  row: JsonRecord,
  latestRun: JsonRecord | null,
): ShelfItem | null {
  const id = asString(row.id);

  if (!id) {
    return null;
  }

  const dueTimestamp = effectiveDueTimestamp(row);

  return {
    id,
    title: titleForActivity(row),
    status: asString(row.status),
    scheduleModeCode: asString(row.schedule_mode_code),
    scheduledDate: asString(row.scheduled_date),
    scheduleStartDate: asString(row.schedule_start_date),
    scheduleEndDate: asString(row.schedule_end_date),
    deadlineAt: asString(row.deadline_at),
    startedAt: asString(row.started_at),
    endedAt: asString(row.ended_at),
    durationMinutes: asNumber(row.duration_minutes),
    dueAt: dueTimestamp === null
      ? null
      : new Date(dueTimestamp).toISOString(),
    enrichmentStatus: latestRun
      ? asString(latestRun.status)
      : null,
    enrichmentUpdatedAt: latestRun
      ? asString(latestRun.updated_at) ?? asString(latestRun.created_at)
      : null,
    updatedAt: asString(row.updated_at) ?? asString(row.created_at),
  };
}

function compareNullableDatesAscending(
  left: string | null,
  right: string | null,
) {
  const leftTimestamp = parseTimestamp(left) ?? Number.MAX_SAFE_INTEGER;
  const rightTimestamp = parseTimestamp(right) ?? Number.MAX_SAFE_INTEGER;

  return leftTimestamp - rightTimestamp;
}

function compareNullableDatesDescending(
  left: string | null,
  right: string | null,
) {
  const leftTimestamp = parseTimestamp(left) ?? 0;
  const rightTimestamp = parseTimestamp(right) ?? 0;

  return rightTimestamp - leftTimestamp;
}

function buildGroup(
  key: ShelfGroupKey,
  items: ShelfItem[],
  limit: number,
) {
  return {
    key,
    totalCount: items.length,
    items: items.slice(0, limit),
  };
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json(
      {
        ok: false,
        error: "User context not found",
      },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const previewLimit = parseIntegerParam(
    url.searchParams,
    "limit",
    DEFAULT_PREVIEW_LIMIT,
    3,
    MAX_PREVIEW_LIMIT,
  );
  const scanLimit = parseIntegerParam(
    url.searchParams,
    "scanLimit",
    DEFAULT_SCAN_LIMIT,
    50,
    MAX_SCAN_LIMIT,
  );
  const dueDays = parseIntegerParam(
    url.searchParams,
    "dueDays",
    DEFAULT_DUE_DAYS,
    1,
    MAX_DUE_DAYS,
  );

  const activitySelect = [
    "id",
    "title",
    "description",
    "input_text",
    "status",
    "activity_role_code",
    "schedule_mode_code",
    "scheduled_date",
    "schedule_start_date",
    "schedule_end_date",
    "deadline_at",
    "started_at",
    "ended_at",
    "duration_minutes",
    "created_at",
    "updated_at",
  ].join(",");

  const { data: activityRowsRaw, error: activityError } =
    await supabase
      .from("activity_events")
      .select(activitySelect)
      .eq("user_id", appUser.id)
      .eq("acting_as_actor_id", personActor.id)
      .eq("activity_role_code", "planned")
      .in("status", [...ACTIVE_PLANNED_STATUSES])
      .order("updated_at", { ascending: false })
      .limit(scanLimit);

  if (activityError) {
    return NextResponse.json(
      {
        ok: false,
        error: activityError.message,
      },
      { status: 500 },
    );
  }

  const activityRows = asRecords(activityRowsRaw);
  const activityIds = activityRows
    .map((row) => asString(row.id))
    .filter((id): id is string => Boolean(id));

  let runRows: JsonRecord[] = [];

  if (activityIds.length > 0) {
    const runLimit = Math.min(MAX_SCAN_LIMIT, activityIds.length * 4);

    const { data: runRowsRaw, error: runError } =
      await supabase
        .from("activity_semantic_enrichment_runs_cux4")
        .select(
          "id,activity_event_id,status,attempt_no,created_at,updated_at",
        )
        .eq("owner_user_id", appUser.id)
        .eq("owner_actor_id", personActor.id)
        .in("activity_event_id", activityIds)
        .order("updated_at", { ascending: false })
        .limit(runLimit);

    if (runError) {
      return NextResponse.json(
        {
          ok: false,
          error: runError.message,
        },
        { status: 500 },
      );
    }

    runRows = asRecords(runRowsRaw);
  }

  const latestRunByActivityId = new Map<string, JsonRecord>();

  for (const runRow of runRows) {
    const activityEventId = asString(runRow.activity_event_id);

    if (
      activityEventId &&
      !latestRunByActivityId.has(activityEventId)
    ) {
      latestRunByActivityId.set(activityEventId, runRow);
    }
  }

  const now = Date.now();
  const dueWindowEnd = now + dueDays * 24 * 60 * 60 * 1000;

  const unscheduled: ShelfItem[] = [];
  const dueSoon: ShelfItem[] = [];
  const needsClarification: ShelfItem[] = [];

  for (const activityRow of activityRows) {
    const activityId = asString(activityRow.id);

    if (!activityId) {
      continue;
    }

    const latestRun =
      latestRunByActivityId.get(activityId) ?? null;
    const item = toShelfItem(activityRow, latestRun);

    if (!item) {
      continue;
    }

    if (item.scheduleModeCode === "unscheduled") {
      unscheduled.push(item);
    }

    const dueTimestamp = effectiveDueTimestamp(activityRow);

    if (
      dueTimestamp !== null &&
      dueTimestamp >= now &&
      dueTimestamp <= dueWindowEnd
    ) {
      dueSoon.push(item);
    }

    if (
      latestRun &&
      asString(latestRun.status) === "needs_clarification"
    ) {
      needsClarification.push(item);
    }
  }

  unscheduled.sort((left, right) =>
    compareNullableDatesDescending(left.updatedAt, right.updatedAt),
  );
  dueSoon.sort((left, right) =>
    compareNullableDatesAscending(left.dueAt, right.dueAt),
  );
  needsClarification.sort((left, right) =>
    compareNullableDatesDescending(
      left.enrichmentUpdatedAt,
      right.enrichmentUpdatedAt,
    ),
  );

  return NextResponse.json({
    ok: true,
    generatedAt: new Date(now).toISOString(),
    dueDays,
    previewLimit,
    scannedActivities: activityRows.length,
    groups: {
      unscheduled: buildGroup(
        "unscheduled",
        unscheduled,
        previewLimit,
      ),
      dueSoon: buildGroup(
        "dueSoon",
        dueSoon,
        previewLimit,
      ),
      needsClarification: buildGroup(
        "needsClarification",
        needsClarification,
        previewLimit,
      ),
    },
  });
}
