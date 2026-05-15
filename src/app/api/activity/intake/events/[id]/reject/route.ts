import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ActivityEventRow = Record<string, unknown>;

type RawActivitySignalRow = Record<string, unknown>;

type RejectImportedEventBody = {
  reason?: unknown;
  note?: unknown;
};

const ENDPOINT = "/api/activity/intake/events/[id]/reject";

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getFirstString(
  row: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = asString(row[key]);

    if (value) {
      return value;
    }
  }

  return null;
}

function getFirstNullableString(
  row: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    if (key in row) {
      const value = row[key];

      if (value === null || value === undefined) {
        return null;
      }

      return typeof value === "string" ? value : String(value);
    }
  }

  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getFirstNumber(
  row: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = asNumber(row[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

async function readBody(request: Request): Promise<RejectImportedEventBody> {
  try {
    return (await request.json()) as RejectImportedEventBody;
  } catch {
    return {};
  }
}

function summarizeActivityEvent(row: ActivityEventRow) {
  return {
    id: getFirstString(row, ["id"]),
    title: getFirstNullableString(row, ["title", "name"]),
    status: getFirstString(row, ["status"]),
    source: getFirstString(row, ["source"]),
    privacyScope: getFirstNullableString(row, ["privacy_scope", "privacyScope"]),
    processingStatus: getFirstNullableString(row, [
      "processing_status",
      "processingStatus",
    ]),
    startedAt: getFirstNullableString(row, ["started_at", "startedAt"]),
    endedAt: getFirstNullableString(row, ["ended_at", "endedAt"]),
    durationMinutes: getFirstNumber(row, [
      "duration_minutes",
      "durationMinutes",
    ]),
    description: getFirstNullableString(row, [
      "description",
      "comment",
      "notes",
      "note",
    ]),
    activityTypeId: getFirstNullableString(row, [
      "activity_type_id",
      "activityTypeId",
    ]),
    activityTemplateId: getFirstNullableString(row, [
      "activity_template_id",
      "activityTemplateId",
    ]),
    legacyTemplateId: getFirstNullableString(row, [
      "legacy_template_id",
      "legacyTemplateId",
    ]),
    createdAt: getFirstNullableString(row, ["created_at", "createdAt"]),
    updatedAt: getFirstNullableString(row, ["updated_at", "updatedAt"]),
  };
}

function summarizeRawSignal(row: RawActivitySignalRow | null) {
  if (!row) {
    return null;
  }

  return {
    id: getFirstString(row, ["id"]),
    sourceType: getFirstString(row, ["source_type", "sourceType"]),
    sourceEventId: getFirstNullableString(row, [
      "source_event_id",
      "sourceEventId",
    ]),
    idempotencyKey: getFirstNullableString(row, [
      "idempotency_key",
      "idempotencyKey",
    ]),
    processingStatus: getFirstNullableString(row, [
      "processing_status",
      "processingStatus",
    ]),
    outputEventId: getFirstNullableString(row, [
      "output_event_id",
      "outputEventId",
    ]),
    occurredAt: getFirstNullableString(row, ["occurred_at", "occurredAt"]),
    measuredAt: getFirstNullableString(row, ["measured_at", "measuredAt"]),
    receivedAt: getFirstNullableString(row, ["received_at", "receivedAt"]),
    updatedAt: getFirstNullableString(row, ["updated_at", "updatedAt"]),
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: ENDPOINT,
    method: "POST",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "Reject an imported_pending activity event by archiving it. This endpoint does not create impacts, daily aggregates or current snapshots."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    lifecycleRule:
      "Only imported_pending activity events can be rejected here. Raw signal linkage is preserved. Completed events must not be rejected through this endpoint.",
    example: {
      reason: "not_an_activity",
      note: "Imported event was reviewed and rejected before confirmation.",
    },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
    );
  }

  const { appUser, errorResponse } = await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser) {
    return NextResponse.json(
      {
        ok: false,
        error: "User context not found",
      },
      { status: 500 }
    );
  }

  const { id } = await context.params;
  const eventId = asString(id);

  if (!eventId) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: "Missing imported activity event id",
      },
      { status: 400 }
    );
  }

  const body = await readBody(request);
  const reason = asString(body.reason);
  const note = asString(body.note);

  try {
    const { data: eventData, error: eventError } = await supabase
      .from("activity_events")
      .select("*")
      .eq("id", eventId)
      .eq("user_id", appUser.id)
      .maybeSingle();

    if (eventError) {
      throw new Error(eventError.message);
    }

    if (!eventData) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          eventId,
          error: "Activity event not found for current user",
        },
        { status: 404 }
      );
    }

    const event = eventData as ActivityEventRow;
    const currentStatus = getFirstString(event, ["status"]);

    const { data: rawSignalData, error: rawSignalError } = await supabase
      .from("raw_activity_signals")
      .select("*")
      .eq("user_id", appUser.id)
      .eq("output_event_id", eventId)
      .maybeSingle();

    if (rawSignalError) {
      throw new Error(rawSignalError.message);
    }

    const rawSignal = (rawSignalData as RawActivitySignalRow | null) ?? null;

    if (currentStatus === "archived") {
      return NextResponse.json({
        ok: true,
        status: "already_rejected",
        endpoint: ENDPOINT,
        event: summarizeActivityEvent(event),
        rawSignal: summarizeRawSignal(rawSignal),
        impactEvents: [],
        dailyAggregates: [],
        currentSnapshots: [],
        note:
          "Imported activity event was already archived. No impacts, daily aggregates or current snapshots were created.",
      });
    }

    if (currentStatus !== "imported_pending") {
      return NextResponse.json(
        {
          ok: false,
          status: "not_rejectable",
          endpoint: ENDPOINT,
          event: summarizeActivityEvent(event),
          rawSignal: summarizeRawSignal(rawSignal),
          reason:
            "Only imported_pending activity events can be rejected through this endpoint.",
          note:
            "Completed, started, planned or manually created events must use a different lifecycle/correction flow.",
        },
        { status: 409 }
      );
    }

    const rejectionDescriptionParts = [
      getFirstNullableString(event, ["description", "comment", "notes", "note"]),
      "",
      "[Imported activity rejected]",
      reason ? `Reason: ${reason}` : null,
      note ? `Note: ${note}` : null,
      `Rejected at: ${new Date().toISOString()}`,
    ].filter((part): part is string => Boolean(part));

    const rejectionDescription = rejectionDescriptionParts.join("\n");

    const { data: updatedEventData, error: updateError } = await supabase
      .from("activity_events")
      .update({
        status: "archived",
        processing_status: "skipped",
        description: rejectionDescription,
      })
      .eq("id", eventId)
      .eq("user_id", appUser.id)
      .eq("status", "imported_pending")
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const updatedEvent = updatedEventData as ActivityEventRow;

    return NextResponse.json({
      ok: true,
      status: "rejected_archived",
      endpoint: ENDPOINT,
      event: summarizeActivityEvent(updatedEvent),
      rawSignal: summarizeRawSignal(rawSignal),
      impactEvents: [],
      dailyAggregates: [],
      currentSnapshots: [],
      note:
        "Imported_pending activity event was rejected and archived. No impacts, daily aggregates or current snapshots were created. Raw signal linkage is preserved.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        eventId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to reject imported activity event.",
      },
      { status: 500 }
    );
  }
}
