import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type RawActivitySignalRow = Record<string, unknown>;

type IgnoreRawSignalBody = {
  reason?: unknown;
  note?: unknown;
  metadata?: unknown;
};

const ENDPOINT = "/api/activity/intake/signals/[id]/ignore";

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
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

function summarizeRawSignal(row: RawActivitySignalRow) {
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
  };
}

function buildIgnoredMetadata(params: {
  existingMetadata: unknown;
  body: IgnoreRawSignalBody;
}) {
  const { existingMetadata, body } = params;

  return {
    ...asRecord(existingMetadata),
    ...asRecord(body.metadata),
    ignore: {
      endpoint: ENDPOINT,
      ignoredAt: new Date().toISOString(),
      reason: asString(body.reason),
      note: asString(body.note),
      lifecycleRule:
        "Raw signal was ignored before promotion. No activity_event was created.",
    },
  };
}

async function readBody(request: Request): Promise<IgnoreRawSignalBody> {
  try {
    return (await request.json()) as IgnoreRawSignalBody;
  } catch {
    return {};
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: ENDPOINT,
    method: "POST",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "Ignore a raw activity signal before it is promoted. This endpoint does not create or update activity_events."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    lifecycleRule:
      "Only raw signals without output_event_id can be ignored. Already promoted raw signals must be handled through the imported activity event lifecycle.",
    example: {
      reason: "not_an_activity",
      note: "Signal was noise or should not become an activity event.",
      metadata: {
        reviewedBy: "manual-debug",
      },
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
  const rawSignalId = asString(id);

  if (!rawSignalId) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: "Missing raw activity signal id",
      },
      { status: 400 }
    );
  }

  const body = await readBody(request);

  try {
    const { data: rawSignalData, error: rawSignalError } = await supabase
      .from("raw_activity_signals")
      .select("*")
      .eq("id", rawSignalId)
      .eq("user_id", appUser.id)
      .maybeSingle();

    if (rawSignalError) {
      throw new Error(rawSignalError.message);
    }

    if (!rawSignalData) {
      return NextResponse.json(
        {
          ok: false,
          endpoint: ENDPOINT,
          rawSignalId,
          error: "Raw activity signal not found for current user",
        },
        { status: 404 }
      );
    }

    const rawSignal = rawSignalData as RawActivitySignalRow;
    const currentStatus = getFirstNullableString(rawSignal, [
      "processing_status",
      "processingStatus",
    ]);
    const outputEventId = getFirstNullableString(rawSignal, [
      "output_event_id",
      "outputEventId",
    ]);

    if (outputEventId) {
      return NextResponse.json(
        {
          ok: false,
          status: "already_promoted",
          endpoint: ENDPOINT,
          rawSignal: summarizeRawSignal(rawSignal),
          activityEventId: outputEventId,
          note:
            "This raw signal already has an output activity_event. It cannot be ignored at raw-signal level. Use imported event reject/archive flow instead.",
        },
        { status: 409 }
      );
    }

    if (currentStatus === "ignored") {
      return NextResponse.json({
        ok: true,
        status: "already_ignored",
        endpoint: ENDPOINT,
        rawSignal: summarizeRawSignal(rawSignal),
        activityEvent: null,
        note:
          "Raw activity signal was already ignored. No activity_event was created.",
      });
    }

    const ignoredMetadata = buildIgnoredMetadata({
      existingMetadata: rawSignal.metadata_json,
      body,
    });

    const { data: updatedData, error: updateError } = await supabase
      .from("raw_activity_signals")
      .update({
        processing_status: "ignored",
        processing_error: null,
        output_event_id: null,
        metadata_json: ignoredMetadata,
      })
      .eq("id", rawSignalId)
      .eq("user_id", appUser.id)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const updatedRawSignal = updatedData as RawActivitySignalRow;

    return NextResponse.json({
      ok: true,
      status: "ignored",
      endpoint: ENDPOINT,
      rawSignal: summarizeRawSignal(updatedRawSignal),
      activityEvent: null,
      note:
        "Raw activity signal was ignored before promotion. No activity_event was created.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        rawSignalId,
        error:
          error instanceof Error
            ? error.message
            : "Failed to ignore raw activity signal.",
      },
      { status: 500 }
    );
  }
}
