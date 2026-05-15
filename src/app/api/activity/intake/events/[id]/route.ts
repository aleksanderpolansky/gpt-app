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

type PatchImportedEventBody = {
  title?: unknown;
  description?: unknown;
  comment?: unknown;
  startedAt?: unknown;
  started_at?: unknown;
  endedAt?: unknown;
  ended_at?: unknown;
  durationMinutes?: unknown;
  duration_minutes?: unknown;
  reviewNote?: unknown;
  review_note?: unknown;
};

const ENDPOINT = "/api/activity/intake/events/[id]";

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
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

function normalizeOptionalIsoDate(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const rawValue = asString(value);

  if (!rawValue) {
    return undefined;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function getBodyValue(
  body: PatchImportedEventBody,
  camelKey: keyof PatchImportedEventBody,
  snakeKey: keyof PatchImportedEventBody
) {
  return body[camelKey] !== undefined ? body[camelKey] : body[snakeKey];
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
      "template_id",
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

async function loadLinkedRawSignal(params: {
  userId: string;
  eventId: string;
}): Promise<RawActivitySignalDetailRow | null> {
  const { userId, eventId } = params;

  const { data: rawSignalData, error: rawSignalError } = await supabase
    .from("raw_activity_signals")
    .select("*")
    .eq("user_id", userId)
    .eq("output_event_id", eventId)
    .maybeSingle();

  if (rawSignalError) {
    throw new Error(rawSignalError.message);
  }

  return (rawSignalData as RawActivitySignalDetailRow | null) ?? null;
}

async function readPatchBody(request: Request): Promise<PatchImportedEventBody> {
  try {
    return (await request.json()) as PatchImportedEventBody;
  } catch {
    return {};
  }
}

function appendReviewNote(params: {
  currentDescription: string | null;
  explicitDescription: string | null | undefined;
  reviewNote: string | null | undefined;
}) {
  const { currentDescription, explicitDescription, reviewNote } = params;

  const baseDescription =
    explicitDescription !== undefined ? explicitDescription : currentDescription;

  if (reviewNote === undefined || reviewNote === null) {
    return baseDescription;
  }

  const noteBlock = [
    "[Imported activity review edit]",
    `Review note: ${reviewNote}`,
    `Edited at: ${new Date().toISOString()}`,
  ].join("\n");

  if (!baseDescription) {
    return noteBlock;
  }

  return [baseDescription, "", noteBlock].join("\n");
}

function buildPatchUpdate(params: {
  event: ActivityEventDetailRow;
  body: PatchImportedEventBody;
}) {
  const { event, body } = params;

  const update: Record<string, unknown> = {};
  const changedFields: string[] = [];

  const title = asNullableString(body.title);

  if (title !== undefined) {
    update.title = title;
    changedFields.push("title");
  }

  const descriptionInput =
    body.description !== undefined ? body.description : body.comment;
  const explicitDescription = asNullableString(descriptionInput);
  const reviewNoteInput =
    body.reviewNote !== undefined ? body.reviewNote : body.review_note;
  const reviewNote = asNullableString(reviewNoteInput);

  if (explicitDescription !== undefined || reviewNote !== undefined) {
    update.description = appendReviewNote({
      currentDescription: getFirstNullableString(event, [
        "description",
        "comment",
        "notes",
        "note",
      ]),
      explicitDescription,
      reviewNote,
    });
    changedFields.push("description");
  }

  const startedAtWasProvided =
    body.startedAt !== undefined || body.started_at !== undefined;
  const endedAtWasProvided =
    body.endedAt !== undefined || body.ended_at !== undefined;
  const durationWasProvided =
    body.durationMinutes !== undefined || body.duration_minutes !== undefined;

  const startedAt = normalizeOptionalIsoDate(
    getBodyValue(body, "startedAt", "started_at")
  );

  if (startedAt !== undefined) {
    update.started_at = startedAt;
    changedFields.push("started_at");
  }

  const endedAt = normalizeOptionalIsoDate(
    getBodyValue(body, "endedAt", "ended_at")
  );

  if (endedAt !== undefined) {
    update.ended_at = endedAt;
    changedFields.push("ended_at");
  }

  const durationInput =
    body.durationMinutes !== undefined
      ? body.durationMinutes
      : body.duration_minutes;
  const durationMinutes =
    durationInput === undefined ? undefined : asNumber(durationInput);

  if (durationWasProvided) {
    if (durationMinutes === null || durationMinutes === undefined || durationMinutes < 0) {
      return {
        ok: false as const,
        error: "durationMinutes must be a non-negative number",
      };
    }

    update.duration_minutes = Math.round(durationMinutes);
    changedFields.push("duration_minutes");
  }

  const effectiveStartedAt =
    typeof update.started_at === "string"
      ? update.started_at
      : getFirstNullableString(event, ["started_at", "startedAt"]);
  const effectiveEndedAt =
    typeof update.ended_at === "string"
      ? update.ended_at
      : getFirstNullableString(event, ["ended_at", "endedAt"]);

  if (
    !durationWasProvided &&
    (startedAtWasProvided || endedAtWasProvided) &&
    effectiveStartedAt &&
    effectiveEndedAt
  ) {
    const startDate = new Date(effectiveStartedAt);
    const endDate = new Date(effectiveEndedAt);

    if (
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      endDate.getTime() >= startDate.getTime()
    ) {
      update.duration_minutes = Math.round(
        (endDate.getTime() - startDate.getTime()) / 60000
      );

      if (!changedFields.includes("duration_minutes")) {
        changedFields.push("duration_minutes");
      }
    }
  }

  if (durationWasProvided && effectiveStartedAt && !effectiveEndedAt) {
    const startDate = new Date(effectiveStartedAt);

    if (!Number.isNaN(startDate.getTime())) {
      update.ended_at = new Date(
        startDate.getTime() + Number(update.duration_minutes) * 60000
      ).toISOString();

      if (!changedFields.includes("ended_at")) {
        changedFields.push("ended_at");
      }
    }
  }

  if (durationWasProvided && !effectiveStartedAt && effectiveEndedAt) {
    const endDate = new Date(effectiveEndedAt);

    if (!Number.isNaN(endDate.getTime())) {
      update.started_at = new Date(
        endDate.getTime() - Number(update.duration_minutes) * 60000
      ).toISOString();

      if (!changedFields.includes("started_at")) {
        changedFields.push("started_at");
      }
    }
  }

  if (update.started_at && update.ended_at) {
    const startDate = new Date(String(update.started_at));
    const endDate = new Date(String(update.ended_at));

    if (
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      endDate.getTime() < startDate.getTime()
    ) {
      return {
        ok: false as const,
        error: "endedAt cannot be earlier than startedAt",
      };
    }
  }

  return {
    ok: true as const,
    update,
    changedFields: Array.from(new Set(changedFields)),
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
    const rawSignal = await loadLinkedRawSignal({
      userId: appUser.id,
      eventId,
    });

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

export async function PATCH(
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

  const body = await readPatchBody(request);

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

    const event = eventData as ActivityEventDetailRow;
    const currentStatus = getFirstString(event, ["status"]);

    if (currentStatus !== "imported_pending") {
      return NextResponse.json(
        {
          ok: false,
          status: "not_editable",
          endpoint: ENDPOINT,
          eventId,
          event: summarizeActivityEvent(event),
          reason:
            "Only imported_pending activity events can be edited through this endpoint.",
          note:
            "Completed, archived, cancelled, started or manually created events must use correction/lifecycle-specific flows.",
        },
        { status: 409 }
      );
    }

    const patch = buildPatchUpdate({
      event,
      body,
    });

    if (!patch.ok) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          eventId,
          error: patch.error,
        },
        { status: 400 }
      );
    }

    if (patch.changedFields.length === 0) {
      const rawSignal = await loadLinkedRawSignal({
        userId: appUser.id,
        eventId,
      });

      return NextResponse.json({
        ok: true,
        status: "no_changes",
        endpoint: ENDPOINT,
        eventId,
        changedFields: [],
        event: summarizeActivityEvent(event),
        rawSignal: summarizeRawSignal(rawSignal),
        reviewReadiness: buildReviewReadiness({
          event,
          rawSignal,
        }),
        impactEvents: [],
        dailyAggregates: [],
        currentSnapshots: [],
        note:
          "No editable fields were provided. Imported_pending event was not changed.",
      });
    }

    const { data: updatedEventData, error: updateError } = await supabase
      .from("activity_events")
      .update(patch.update)
      .eq("id", eventId)
      .eq("user_id", appUser.id)
      .eq("status", "imported_pending")
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const updatedEvent = updatedEventData as ActivityEventDetailRow;
    const rawSignal = await loadLinkedRawSignal({
      userId: appUser.id,
      eventId,
    });

    return NextResponse.json({
      ok: true,
      status: "updated_imported_pending",
      endpoint: ENDPOINT,
      eventId,
      changedFields: patch.changedFields,
      event: summarizeActivityEvent(updatedEvent),
      rawSignal: summarizeRawSignal(rawSignal),
      reviewReadiness: buildReviewReadiness({
        event: updatedEvent,
        rawSignal,
      }),
      impactEvents: [],
      dailyAggregates: [],
      currentSnapshots: [],
      note:
        "Imported_pending activity event was edited before confirmation. No impacts, daily aggregates or current snapshots were created.",
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
            : "Failed to edit imported activity event.",
      },
      { status: 500 }
    );
  }
}

