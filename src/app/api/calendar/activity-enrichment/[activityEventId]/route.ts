import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ activityEventId: string }>;
  },
) {
  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  const { activityEventId } = await context.params;

  if (!isUuid(activityEventId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid activityEventId" },
      { status: 400 },
    );
  }

  const { data: activityEvent, error: activityError } =
    await supabase
      .from("activity_events")
      .select(
        [
          "id",
          "title",
          "input_text",
          "description",
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
        ].join(","),
      )
      .eq("id", activityEventId)
      .eq("user_id", appUser.id)
      .eq("acting_as_actor_id", personActor.id)
      .maybeSingle();

  if (activityError) {
    return NextResponse.json(
      { ok: false, error: activityError.message },
      { status: 500 },
    );
  }

  if (!activityEvent) {
    return NextResponse.json(
      { ok: false, error: "Activity not found" },
      { status: 404 },
    );
  }

  const { data: run, error: runError } = await supabase
    .from("activity_semantic_enrichment_runs_cux4")
    .select("*")
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .eq("activity_event_id", activityEventId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runError) {
    return NextResponse.json(
      { ok: false, error: runError.message },
      { status: 500 },
    );
  }

  const activityRow = asRecord(activityEvent);

  if (!activityRow) {
    return NextResponse.json(
      { ok: false, error: "Unexpected activity response shape" },
      { status: 500 },
    );
  }

  const runRow = asRecord(run);
  const response = NextResponse.json({
    ok: true,
    activityEvent: {
      id: asString(activityRow.id),
      title: asString(activityRow.title),
      inputText: asString(activityRow.input_text),
      description: asString(activityRow.description),
      activityRoleCode: asString(activityRow.activity_role_code),
      scheduleModeCode: asString(activityRow.schedule_mode_code),
      scheduledDate: asString(activityRow.scheduled_date),
      scheduleStartDate: asString(activityRow.schedule_start_date),
      scheduleEndDate: asString(activityRow.schedule_end_date),
      deadlineAt: asString(activityRow.deadline_at),
      startedAt: asString(activityRow.started_at),
      endedAt: asString(activityRow.ended_at),
      durationMinutes: asNumber(activityRow.duration_minutes),
      createdAt: asString(activityRow.created_at),
      updatedAt: asString(activityRow.updated_at),
    },
    run: runRow
      ? {
          id: asString(runRow.id),
          status: asString(runRow.status),
          attemptNo: asNumber(runRow.attempt_no),
          sourceLocale: asString(runRow.source_locale),
          sourceText: asString(runRow.source_text),
          protectedFieldCodes: Array.isArray(
            runRow.protected_field_codes,
          )
            ? runRow.protected_field_codes
            : [],
          resultJson: asRecord(runRow.result_json),
          errorJson: asRecord(runRow.error_json),
          startedAt: asString(runRow.started_at),
          finishedAt: asString(runRow.finished_at),
          createdAt: asString(runRow.created_at),
          updatedAt: asString(runRow.updated_at),
        }
      : null,
  });

  response.headers.set("Cache-Control", "no-store");

  return response;
}
