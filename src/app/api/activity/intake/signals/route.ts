import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import {
  isRawActivitySignalSourceType,
  RAW_ACTIVITY_SIGNAL_SOURCE_VALUES,
} from "../../../../../../lib/activity/activitySourceIntake";
import type {
  RawActivitySignalProcessingStatus,
  RawActivitySignalRow,
  RawActivitySignalSourceType,
} from "../../../../../../lib/activity/rawActivitySignals";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";

type ResponseMode = "summary" | "full";

const ENDPOINT = "/api/activity/intake/signals";

const RAW_ACTIVITY_SIGNAL_PROCESSING_STATUS_VALUES = [
  "received",
  "pending",
  "processing",
  "processed",
  "failed",
  "skipped",
  "duplicate",
  "ignored",
] as const;

const DEFAULT_PROCESSING_STATUSES: RawActivitySignalProcessingStatus[] = [
  "pending",
  "received",
  "processing",
];

const RAW_ACTIVITY_SIGNAL_PROCESSING_STATUS_SET = new Set<string>(
  RAW_ACTIVITY_SIGNAL_PROCESSING_STATUS_VALUES
);

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

function getObjectKeys(value: unknown) {
  if (!isPlainObject(value)) {
    return [];
  }

  return Object.keys(value).sort();
}

function parseLimit(value: string | null) {
  if (!value) {
    return 25;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 25;
  }

  return Math.min(Math.max(parsed, 1), 100);
}

function parseMode(value: string | null): ResponseMode {
  return value === "full" ? "full" : "summary";
}

function splitParamValues(values: string[]) {
  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseProcessingStatuses(
  searchParams: URLSearchParams
): RawActivitySignalProcessingStatus[] | "all" | { error: string } {
  const rawValues = splitParamValues([
    ...searchParams.getAll("processingStatus"),
    ...searchParams.getAll("processingStatuses"),
  ]);

  if (rawValues.length === 0) {
    return DEFAULT_PROCESSING_STATUSES;
  }

  if (rawValues.includes("all")) {
    return "all";
  }

  const invalidValues = rawValues.filter(
    (value) => !RAW_ACTIVITY_SIGNAL_PROCESSING_STATUS_SET.has(value)
  );

  if (invalidValues.length > 0) {
    return {
      error: `Unsupported processingStatus value: ${invalidValues.join(", ")}`,
    };
  }

  return Array.from(new Set(rawValues)) as RawActivitySignalProcessingStatus[];
}

function parseSourceTypes(
  searchParams: URLSearchParams
): RawActivitySignalSourceType[] | "all" | { error: string } {
  const rawValues = splitParamValues([
    ...searchParams.getAll("sourceType"),
    ...searchParams.getAll("sourceTypes"),
  ]);

  if (rawValues.length === 0 || rawValues.includes("all")) {
    return "all";
  }

  const invalidValues = rawValues.filter(
    (value) => !isRawActivitySignalSourceType(value)
  );

  if (invalidValues.length > 0) {
    return {
      error: `Unsupported sourceType value: ${invalidValues.join(", ")}`,
    };
  }

  return Array.from(new Set(rawValues)) as RawActivitySignalSourceType[];
}

function summarizeRawSignal(row: RawActivitySignalRow) {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceEventId: row.source_event_id,
    idempotencyKey: row.idempotency_key,
    trustLevel: row.trust_level,
    privacyScope: row.privacy_scope,
    processingStatus: row.processing_status,
    processingError: row.processing_error,
    outputEventId: row.output_event_id,
    occurredAt: row.occurred_at,
    measuredAt: row.measured_at,
    receivedAt: row.received_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rawPayloadKeys: getObjectKeys(row.raw_payload),
    normalizedPreviewKeys: getObjectKeys(row.normalized_preview_json),
    metadataKeys: getObjectKeys(row.metadata_json),
  };
}

function normalizeFullRawSignal(row: RawActivitySignalRow) {
  return {
    ...summarizeRawSignal(row),
    rawPayload: row.raw_payload,
    normalizedPreview: row.normalized_preview_json,
    metadata: row.metadata_json,
  };
}

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const mode = parseMode(url.searchParams.get("mode"));
  const limit = parseLimit(url.searchParams.get("limit"));

  const processingStatuses = parseProcessingStatuses(url.searchParams);

  if (typeof processingStatuses === "object" && "error" in processingStatuses) {
    return NextResponse.json(
      {
        ok: false,
        error: processingStatuses.error,
        supportedProcessingStatuses:
          RAW_ACTIVITY_SIGNAL_PROCESSING_STATUS_VALUES,
      },
      { status: 400 }
    );
  }

  const sourceTypes = parseSourceTypes(url.searchParams);

  if (typeof sourceTypes === "object" && "error" in sourceTypes) {
    return NextResponse.json(
      {
        ok: false,
        error: sourceTypes.error,
        supportedSourceTypes: RAW_ACTIVITY_SIGNAL_SOURCE_VALUES,
      },
      { status: 400 }
    );
  }

  try {
    let query = supabase
      .from("raw_activity_signals")
      .select("*")
      .eq("user_id", appUser.id)
      .order("received_at", { ascending: false })
      .limit(limit);

    if (processingStatuses !== "all") {
      query = query.in("processing_status", processingStatuses);
    }

    if (sourceTypes !== "all") {
      query = query.in("source_type", sourceTypes);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data as RawActivitySignalRow[] | null) ?? [];

    return NextResponse.json({
      ok: true,
      endpoint: ENDPOINT,
      mode,
      filters: {
        limit,
        processingStatuses,
        sourceTypes,
      },
      summary: {
        totalSignalsReturned: rows.length,
        fullPayloadIncluded: mode === "full",
        defaultProcessingStatuses: DEFAULT_PROCESSING_STATUSES,
      },
      signals:
        mode === "full"
          ? rows.map(normalizeFullRawSignal)
          : rows.map(summarizeRawSignal),
      note:
        mode === "full"
          ? "Full mode includes rawPayload, normalizedPreview and metadata for the authenticated owner only."
          : "Summary mode does not include full rawPayload, normalizedPreview or metadata. Use mode=full only for private debug/review workflows.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load raw activity intake signals.",
      },
      { status: 500 }
    );
  }
}
