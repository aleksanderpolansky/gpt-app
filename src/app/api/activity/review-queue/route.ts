import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

const MAX_REVIEW_ROWS = 250;

type Row = Record<string, unknown>;

function asRecord(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isPendingReview(metadata: Row) {
  return (
    metadata.quickCaptureReviewRequired === true &&
    metadata.quickCaptureReviewStatus !== "resolved"
  );
}

function mapReviewRow(row: Row) {
  const metadata = asRecord(row.metadata_json);
  const reviewSnapshot = asRecord(metadata.quickCaptureReviewSnapshot);

  return {
    id: asString(row.id),
    title: asString(row.title) ?? asString(row.input_text) ?? "Activity",
    inputText: asString(row.input_text),
    activityRoleCode: asString(row.activity_role_code),
    status: asString(row.status),
    processingStatus: asString(row.processing_status),
    startedAt: asString(row.started_at),
    endedAt: asString(row.ended_at),
    durationMinutes: asNumber(row.duration_minutes),
    scheduleModeCode: asString(row.schedule_mode_code),
    scheduledDate: asString(row.scheduled_date),
    scheduleStartDate: asString(row.schedule_start_date),
    scheduleEndDate: asString(row.schedule_end_date),
    deadlineAt: asString(row.deadline_at),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    reviewStatus: asString(metadata.quickCaptureReviewStatus) ?? "pending",
    reviewContract: asString(metadata.quickCaptureContract),
    reviewLocale: asString(metadata.locale),
    sourceMessageText: asString(metadata.quickCaptureSourceMessageText),
    sourceSegmentId: asString(metadata.quickCaptureSourceSegmentId),
    reviewSnapshot,
  };
}

export async function GET(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const activityEventId = asString(url.searchParams.get("activityEventId"));

  let query = supabase
    .from("activity_events")
    .select(
      "id,title,input_text,activity_role_code,status,processing_status,started_at,ended_at,duration_minutes,schedule_mode_code,scheduled_date,schedule_start_date,schedule_end_date,deadline_at,metadata_json,created_at,updated_at",
    )
    .eq("user_id", appUser.id)
    .eq("acting_as_actor_id", personActor.id);

  if (activityEventId) {
    query = query.eq("id", activityEventId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(activityEventId ? 1 : MAX_REVIEW_ROWS);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const rows = ((data ?? []) as Row[])
    .filter((row) => isPendingReview(asRecord(row.metadata_json)))
    .map(mapReviewRow)
    .filter((row) => Boolean(row.id));

  if (activityEventId) {
    const activity = rows[0] ?? null;

    if (!activity) {
      return NextResponse.json(
        { ok: false, error: "Activity requiring review not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      activity,
      reviewSnapshot: activity.reviewSnapshot,
    });
  }

  return NextResponse.json({
    ok: true,
    count: rows.length,
    activities: rows.map((row) => {
      const { reviewSnapshot, ...summary } = row;
      void reviewSnapshot;
      return summary;
    }),
  });
}
