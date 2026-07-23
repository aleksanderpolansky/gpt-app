import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../lib/supabase";

type GenericRow = Record<string, unknown>;


export const dynamic = "force-dynamic";

type ResponseMode = "summary" | "full";

type ActivityEventQueueRow = Record<string, unknown>;

const ENDPOINT = "/api/activity/intake/events";

const DEFAULT_EVENT_STATUSES = ["imported_pending"] as const;

const ACTIVITY_EVENT_STATUS_VALUES = [
  "draft",
  "planned",
  "pending",
  "started",
  "paused",
  "imported_pending",
  "completed",
  "cancelled",
  "archived",
  "missed",
] as const;

const ACTIVITY_EVENT_PROCESSING_STATUS_VALUES = [
  "pending",
  "processing",
  "processed",
  "failed",
  "skipped",
] as const;

const ACTIVITY_EVENT_SOURCE_VALUES = [
  "manual_chat",
  "manual_form",
  "voice_input",
  "app_action",
  "system_event",
  "api_webhook",
  "nfc_sensor",
  "wearable_import",
  "calendar_import",
  "ai_suggested",
  "file_import",
  "external_import",
  "unknown",
] as const;

const ACTIVITY_EVENT_STATUS_SET = new Set<string>(
  ACTIVITY_EVENT_STATUS_VALUES
);

const ACTIVITY_EVENT_PROCESSING_STATUS_SET = new Set<string>(
  ACTIVITY_EVENT_PROCESSING_STATUS_VALUES
);

const ACTIVITY_EVENT_SOURCE_SET = new Set<string>(ACTIVITY_EVENT_SOURCE_VALUES);

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

function getFirstString(
  row: ActivityEventQueueRow,
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
  row: ActivityEventQueueRow,
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
  row: ActivityEventQueueRow,
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

function parseEventStatuses(
  searchParams: URLSearchParams
): string[] | "all" | { error: string } {
  const rawValues = splitParamValues([
    ...searchParams.getAll("status"),
    ...searchParams.getAll("statuses"),
  ]);

  if (rawValues.length === 0) {
    return [...DEFAULT_EVENT_STATUSES];
  }

  if (rawValues.includes("all")) {
    return "all";
  }

  const invalidValues = rawValues.filter(
    (value) => !ACTIVITY_EVENT_STATUS_SET.has(value)
  );

  if (invalidValues.length > 0) {
    return {
      error: `Unsupported status value: ${invalidValues.join(", ")}`,
    };
  }

  return Array.from(new Set(rawValues));
}

function parseProcessingStatuses(
  searchParams: URLSearchParams
): string[] | "all" | { error: string } {
  const rawValues = splitParamValues([
    ...searchParams.getAll("processingStatus"),
    ...searchParams.getAll("processingStatuses"),
  ]);

  if (rawValues.length === 0 || rawValues.includes("all")) {
    return "all";
  }

  const invalidValues = rawValues.filter(
    (value) => !ACTIVITY_EVENT_PROCESSING_STATUS_SET.has(value)
  );

  if (invalidValues.length > 0) {
    return {
      error: `Unsupported processingStatus value: ${invalidValues.join(", ")}`,
    };
  }

  return Array.from(new Set(rawValues));
}

function parseSources(
  searchParams: URLSearchParams
): string[] | "all" | { error: string } {
  const rawValues = splitParamValues([
    ...searchParams.getAll("source"),
    ...searchParams.getAll("sources"),
  ]);

  if (rawValues.length === 0 || rawValues.includes("all")) {
    return "all";
  }

  const invalidValues = rawValues.filter(
    (value) => !ACTIVITY_EVENT_SOURCE_SET.has(value)
  );

  if (invalidValues.length > 0) {
    return {
      error: `Unsupported source value: ${invalidValues.join(", ")}`,
    };
  }

  return Array.from(new Set(rawValues));
}

function summarizeActivityEvent(row: ActivityEventQueueRow) {
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
    templateMapping: summarizeImportedTemplateMapping(row),
    createdAt: getFirstNullableString(row, ["created_at", "createdAt"]),
    updatedAt: getFirstNullableString(row, ["updated_at", "updatedAt"]),
  };
}

function normalizeFullActivityEvent(row: ActivityEventQueueRow) {
  return {
    ...summarizeActivityEvent(row),
    internal: {
      userId: getFirstNullableString(row, ["user_id", "userId"]),
      availableColumnKeys: Object.keys(row).sort(),
    },
  };
}

function p447AsRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function p447StringFromRecord(
  record: Record<string, unknown>,
  key: string
): string | null {
  const value = record[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function p447NumberFromRecord(
  record: Record<string, unknown>,
  key: string
): number | null {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function p447BooleanFromRecord(
  record: Record<string, unknown>,
  key: string
): boolean | null {
  const value = record[key];

  return typeof value === "boolean" ? value : null;
}

function summarizeImportedTemplateMapping(row: GenericRow) {
  const metadata = p447AsRecord(row.metadata_json ?? row.metadataJson);
  const mapping = p447AsRecord(metadata.importedTemplateMapping);

  if (Object.keys(mapping).length === 0) {
    return null;
  }

  return {
    mapper: p447StringFromRecord(mapping, "mapper"),
    matched: p447BooleanFromRecord(mapping, "matched"),
    matchType: p447StringFromRecord(mapping, "matchType"),
    confidence: p447NumberFromRecord(mapping, "confidence"),
    reason: p447StringFromRecord(mapping, "reason"),
    selectedTemplateId: p447StringFromRecord(mapping, "selectedTemplateId"),
    selectedTemplateTitle: p447StringFromRecord(mapping, "selectedTemplateTitle"),
    selectedTemplateSlug: p447StringFromRecord(mapping, "selectedTemplateSlug"),
    selectedActivityTypeId: p447StringFromRecord(mapping, "selectedActivityTypeId"),
    selectedLegacyTemplateId: p447StringFromRecord(mapping, "selectedLegacyTemplateId"),
    explicitActivityTemplateId: p447StringFromRecord(mapping, "explicitActivityTemplateId"),
    explicitLegacyTemplateId: p447StringFromRecord(mapping, "explicitLegacyTemplateId"),
    explicitActivityTypeId: p447StringFromRecord(mapping, "explicitActivityTypeId"),
    candidatesCount: p447NumberFromRecord(mapping, "candidatesCount"),
    searchTextPreview: p447StringFromRecord(mapping, "searchTextPreview"),
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
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const mode = parseMode(url.searchParams.get("mode"));
  const limit = parseLimit(url.searchParams.get("limit"));

  const statuses = parseEventStatuses(url.searchParams);

  if (typeof statuses === "object" && "error" in statuses) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: statuses.error,
        supportedStatuses: ACTIVITY_EVENT_STATUS_VALUES,
      },
      { status: 400 }
    );
  }

  const processingStatuses = parseProcessingStatuses(url.searchParams);

  if (
    typeof processingStatuses === "object" &&
    "error" in processingStatuses
  ) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: processingStatuses.error,
        supportedProcessingStatuses: ACTIVITY_EVENT_PROCESSING_STATUS_VALUES,
      },
      { status: 400 }
    );
  }

  const sources = parseSources(url.searchParams);

  if (typeof sources === "object" && "error" in sources) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error: sources.error,
        supportedSources: ACTIVITY_EVENT_SOURCE_VALUES,
      },
      { status: 400 }
    );
  }

  try {
    let query = supabase
      .from("activity_events")
      .select("*")
      .eq("user_id", appUser.id)
      .eq("acting_as_actor_id", personActor.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (statuses !== "all") {
      query = query.in("status", statuses);
    }

    if (processingStatuses !== "all") {
      query = query.in("processing_status", processingStatuses);
    }

    if (sources !== "all") {
      query = query.in("source", sources);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data as ActivityEventQueueRow[] | null) ?? [];

    return NextResponse.json({
      ok: true,
      endpoint: ENDPOINT,
      mode,
      filters: {
        limit,
        statuses,
        processingStatuses,
        sources,
      },
      summary: {
        totalEventsReturned: rows.length,
        defaultStatuses: DEFAULT_EVENT_STATUSES,
        fullPayloadIncluded: mode === "full",
        readOnly: true,
      },
      events:
        mode === "full"
          ? rows.map(normalizeFullActivityEvent)
          : rows.map(summarizeActivityEvent),
      note:
        mode === "full"
          ? "Full mode is still owner-only and intentionally excludes raw payloads. It adds minimal internal identifiers and available column keys for private debug workflows."
          : "Summary mode is the default review queue mode. It does not include raw payloads or heavy metadata.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        endpoint: ENDPOINT,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load imported activity events review queue.",
      },
      { status: 500 }
    );
  }
}

