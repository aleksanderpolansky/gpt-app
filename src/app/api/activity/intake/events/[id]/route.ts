import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ResponseMode = "summary" | "full";

type ActivityEventDetailRow = Record<string, unknown>;

type RawActivitySignalDetailRow = Record<string, unknown>;

const ENDPOINT = "/api/activity/intake/events/[id]";

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getObjectKeys(value: unknown) {
  if (!isPlainObject(value)) {
    return [];
  }

  return Object.keys(value).sort();
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

function parseMode(value: string | null): ResponseMode {
  return value === "full" ? "full" : "summary";
}

function summarizeActivityEvent(row: ActivityEventDetailRow) {
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
    comment: getFirstNullableString(row, [
      "comment",
      "description",
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

function summarizeRawSignal(row: RawActivitySignalDetailRow | null) {
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
    trustLevel: getFirstNullableString(row, ["trust_level", "trustLevel"]),
    privacyScope: getFirstNullableString(row, [
      "privacy_scope",
      "privacyScope",
    ]),
    processingStatus: getFirstNullableString(row, [
      "processing_status",
      "processingStatus",
    ]),
    processingError: getFirstNullableString(row, [
      "processing_error",
      "processingError",
    ]),
    outputEventId: getFirstNullableString(row, [
      "output_event_id",
      "outputEventId",
    ]),
    occurredAt: getFirstNullableString(row, ["occurred_at", "occurredAt"]),
    measuredAt: getFirstNullableString(row, ["measured_at", "measuredAt"]),
    receivedAt: getFirstNullableString(row, ["received_at", "receivedAt"]),
    createdAt: getFirstNullableString(row, ["created_at", "createdAt"]),
    updatedAt: getFirstNullableString(row, ["updated_at", "updatedAt"]),
    rawPayloadKeys: getObjectKeys(row.raw_payload),
    normalizedPreviewKeys: getObjectKeys(row.normalized_preview_json),
    metadataKeys: getObjectKeys(row.metadata_json),
  };
}

function buildReviewReadiness(params: {
  event: ActivityEventDetailRow;
  rawSignal: RawActivitySignalDetailRow | null;
}) {
  const { event, rawSignal } = params;

  const status = getFirstString(event, ["status"]);
  const processingStatus = getFirstNullableString(event, [
    "processing_status",
    "processingStatus",
  ]);

  const isImportedPending = status === "imported_pending";

  return {
    isReviewable: isImportedPending,
    canConfirm: isImportedPending,
    canReject: isImportedPending,
    canEditBeforeConfirm: isImportedPending,
    shouldCreateImpactsNow: false,
    hasLinkedRawSignal: Boolean(rawSignal),
    status,
    processingStatus,
    note: isImportedPending
      ? "This imported event is waiting for review. It may be edited, rejected or confirmed. Impacts should be created only after confirm."
      : "This event is not imported_pending. Detail endpoint is read-only and does not change lifecycle state.",
  };
}

function normalizeFullActivityEvent(row: ActivityEventDetailRow) {
  return {
    ...summarizeActivityEvent(row),
    internal: {
      userId: getFirstNullableString(row, ["user_id", "userId"]),
      availableColumnKeys: Object.keys(row).sort(),
    },
  };
}

function normalizeFullRawSignal(row: RawActivitySignalDetailRow | null) {
  if (!row) {
    return null;
  }

  return {
    ...summarizeRawSignal(row),
    rawPayload: row.raw_payload ?? null,
    normalizedPreview: row.normalized_preview_json ?? null,
    metadata: row.metadata_json ?? null,
    internal: {
      userId: getFirstNullableString(row, ["user_id", "userId"]),
      availableColumnKeys: Object.keys(row).sort(),
    },
  };
}

export async function GET(
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
        error: "Missing activity event id",
      },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const mode = parseMode(url.searchParams.get("mode"));

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
          error: "Activity event not found for current user",
        },
        { status: 404 }
      );
    }

    const event = eventData as ActivityEventDetailRow;

    const { data: rawSignalData, error: rawSignalError } = await supabase
      .from("raw_activity_signals")
      .select("*")
      .eq("user_id", appUser.id)
      .eq("output_event_id", eventId)
      .maybeSingle();

    if (rawSignalError) {
      throw new Error(rawSignalError.message);
    }

    const rawSignal = (rawSignalData as RawActivitySignalDetailRow | null) ?? null;

    return NextResponse.json({
      ok: true,
      endpoint: ENDPOINT,
      mode,
      eventId,
      summary: {
        readOnly: true,
        rawSignalLinked: Boolean(rawSignal),
        fullPayloadIncluded: mode === "full",
      },
      event:
        mode === "full"
          ? normalizeFullActivityEvent(event)
          : summarizeActivityEvent(event),
      rawSignal:
        mode === "full"
          ? normalizeFullRawSignal(rawSignal)
          : summarizeRawSignal(rawSignal),
      reviewReadiness: buildReviewReadiness({
        event,
        rawSignal,
      }),
      note:
        mode === "full"
          ? "Full mode includes linked raw signal payload for the authenticated owner only. Do not expose full mode in public UI."
          : "Summary mode is safe for private review workflows and does not include raw payload or heavy metadata.",
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
            : "Failed to load imported activity event detail.",
      },
      { status: 500 }
    );
  }
}
