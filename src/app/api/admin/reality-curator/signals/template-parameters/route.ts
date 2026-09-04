import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
  type RequirePlatformAdminSuccess,
} from "@/lib/admin/require-platform-admin";
import {
  getActivityParameterPresentation,
  getActivityUnitLabel,
  type ActivityParameterLocale,
} from "@/lib/activity/activity-parameter-presentation";
import { supabase } from "../../../../../../../lib/supabase";
import { isConfirmedMissingTypicalActivityAnalysis } from "@/lib/activity/basic-intake-analysis-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "reality-curator-template-parameters-v1" as const;
const PROCESSOR_NAME = "reality_curator_journey" as const;
const PROCESSOR_VERSION = "1" as const;
const PARAMETER_CHECK_EVENT_CODE = "related_parameter_catalog_checked" as const;
const PARAMETER_SELECTED_EVENT_CODE = "typical_activity_parameter_selected" as const;
const PARAMETER_SET_EVENT_CODE = "typical_activity_parameter_set_confirmed" as const;
const OBJECT_DECISION_EVENT_CODE = "measurable_object_decision_recorded" as const;
const OBJECT_CREATED_EVENT_CODE = "observation_object_created" as const;
const CONTRACT = "ARCTOR_REALITY_CURATOR_ACTIVITY_TEMPLATE_PARAMETER_SET_V1" as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCALES = new Set<ActivityParameterLocale>([
  "en",
  "pl",
  "ru",
  "uk",
  "de",
  "es",
  "cs",
]);

const DEFINITION_SELECT =
  "id,parameter_code,title,description,dimension_code,value_type_code,canonical_unit_code,aggregation_method_code,default_window_code,status,scope_code" as const;

type JsonRecord = Record<string, unknown>;

type EligibleSignal = {
  id: string;
  userId: string;
  activityEventId: string;
};

type ParameterDefinitionRow = {
  id: string;
  parameter_code: string;
  title: string;
  description: string | null;
  dimension_code: string;
  value_type_code: string;
  canonical_unit_code: string;
  aggregation_method_code: string;
  default_window_code: string;
  status: string;
  scope_code: string;
};

type ParameterSelectionLogRow = {
  id: string;
  metadata_json: unknown;
  started_at: string | null;
  created_at: string;
};

type WorkBody = {
  action?: unknown;
  signalId?: unknown;
  parameterDefinitionId?: unknown;
  selectionSource?: unknown;
  comment?: unknown;
  locale?: unknown;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocale(value: unknown): ActivityParameterLocale {
  const raw = text(value).toLowerCase() as ActivityParameterLocale;
  return LOCALES.has(raw) ? raw : "en";
}

function stableUuid(seed: string): string {
  const bytes = Buffer.from(
    crypto.createHash("sha256").update(seed, "utf8").digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function selectionLogId(signalId: string, parameterDefinitionId: string) {
  return stableUuid(
    `${CONTRACT}|${signalId}|${PARAMETER_SELECTED_EVENT_CODE}|${parameterDefinitionId}`,
  );
}

function setConfirmedLogId(signalId: string) {
  return stableUuid(`${CONTRACT}|${signalId}|${PARAMETER_SET_EVENT_CODE}`);
}

function adminMetadata(guard: RequirePlatformAdminSuccess) {
  return {
    curatorAppUserId: guard.appUser.id,
    curatorAdminId: guard.platformAdmin.id,
    curatorRole: guard.platformAdmin.role,
    curatorNameSnapshot: guard.appUser.name,
    curatorEmailSnapshot: guard.appUser.email,
  };
}

function errorResponse(errorCode: string, error: string, status: number) {
  return NextResponse.json(
    { ok: false, routeMarker: ROUTE_MARKER, errorCode, error },
    { status },
  );
}

async function readEligibleSignal(signalId: string): Promise<EligibleSignal> {
  const { data: signalRows, error: signalError } = await supabase
    .from("raw_activity_signals")
    .select(
      "id,user_id,source_type,idempotency_key,normalized_preview_json,output_event_id",
    )
    .eq("id", signalId)
    .limit(1);

  if (signalError) {
    throw new Error(
      `CURATOR_TEMPLATE_PARAMETERS_SIGNAL_READ_FAILED:${signalError.message}`,
    );
  }
  const signal = signalRows?.[0];
  if (!signal) throw new Error("CURATOR_TEMPLATE_PARAMETERS_SIGNAL_NOT_FOUND");

  const normalized = asRecord(signal.normalized_preview_json);
  const analysis = asRecord(normalized.basicIntakeAnalysisV1);
  const eligible =
    signal.source_type === "manual_chat" &&
    text(signal.idempotency_key).startsWith("activity_ai_lab_quick_capture:") &&
    isConfirmedMissingTypicalActivityAnalysis(analysis);

  if (!eligible) {
    throw new Error("CURATOR_TEMPLATE_PARAMETERS_SIGNAL_NOT_ELIGIBLE");
  }

  const activityEventId =
    text(analysis.activityEventId) || text(signal.output_event_id);
  if (!activityEventId) {
    throw new Error("CURATOR_TEMPLATE_PARAMETERS_ACTIVITY_EVENT_MISSING");
  }

  const { data: eventRows, error: eventError } = await supabase
    .from("activity_events")
    .select("id,user_id")
    .eq("id", activityEventId)
    .eq("user_id", signal.user_id)
    .limit(1);
  if (eventError) {
    throw new Error(
      `CURATOR_TEMPLATE_PARAMETERS_ACTIVITY_READ_FAILED:${eventError.message}`,
    );
  }
  if (!eventRows?.[0]) {
    throw new Error("CURATOR_TEMPLATE_PARAMETERS_ACTIVITY_CONTEXT_MISSING");
  }

  return {
    id: signal.id,
    userId: signal.user_id,
    activityEventId,
  };
}

async function assertParameterCheckCompleted(signalId: string) {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("id")
    .eq("raw_signal_id", signalId)
    .eq("processor_name", PROCESSOR_NAME)
    .eq("processor_version", PROCESSOR_VERSION)
    .contains("metadata_json", { eventCode: PARAMETER_CHECK_EVENT_CODE })
    .limit(1);
  if (error) {
    throw new Error(
      `CURATOR_TEMPLATE_PARAMETERS_PARAMETER_CHECK_READ_FAILED:${error.message}`,
    );
  }
  if (!data?.[0]) {
    throw new Error("CURATOR_TEMPLATE_PARAMETERS_PARAMETER_CHECK_REQUIRED");
  }
}

async function readSystemDefinitions(): Promise<ParameterDefinitionRow[]> {
  const { data, error } = await supabase
    .from("value_object_parameter_definitions")
    .select(DEFINITION_SELECT)
    .eq("scope_code", "system")
    .neq("parameter_code", "process_count")
    .order("updated_at", { ascending: false })
    .limit(2000);
  if (error) {
    throw new Error(
      `CURATOR_TEMPLATE_PARAMETERS_CATALOG_READ_FAILED:${error.message}`,
    );
  }
  return (data ?? []) as unknown as ParameterDefinitionRow[];
}

function mapDefinition(row: ParameterDefinitionRow, locale: ActivityParameterLocale) {
  const presentation = getActivityParameterPresentation(
    row.parameter_code,
    locale,
    row.title,
    row.description,
  );
  return {
    id: row.id,
    parameterCode: row.parameter_code,
    title: presentation.title,
    description: presentation.description,
    dimensionCode: row.dimension_code,
    valueTypeCode: row.value_type_code,
    canonicalUnitCode: row.canonical_unit_code,
    canonicalUnitLabel: getActivityUnitLabel(row.canonical_unit_code, locale),
    aggregationMethodCode: row.aggregation_method_code,
    defaultWindowCode: row.default_window_code,
    status: row.status,
  };
}

async function readSelectionLogs(signalId: string) {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("id,metadata_json,started_at,created_at")
    .eq("raw_signal_id", signalId)
    .eq("processor_name", PROCESSOR_NAME)
    .eq("processor_version", PROCESSOR_VERSION)
    .contains("metadata_json", { eventCode: PARAMETER_SELECTED_EVENT_CODE })
    .order("started_at", { ascending: true })
    .limit(200);
  if (error) {
    throw new Error(
      `CURATOR_TEMPLATE_PARAMETERS_SELECTION_READ_FAILED:${error.message}`,
    );
  }
  return (data ?? []) as unknown as ParameterSelectionLogRow[];
}

async function readSetConfirmed(signalId: string) {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("id,metadata_json,started_at,created_at")
    .eq("id", setConfirmedLogId(signalId))
    .eq("raw_signal_id", signalId)
    .eq("processor_name", PROCESSOR_NAME)
    .eq("processor_version", PROCESSOR_VERSION)
    .limit(1);
  if (error) {
    throw new Error(
      `CURATOR_TEMPLATE_PARAMETERS_CONFIRM_READ_FAILED:${error.message}`,
    );
  }
  return data?.[0] ?? null;
}

async function readMappingState(signalId: string, parameterDefinitionId: string) {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("metadata_json,started_at,created_at")
    .eq("raw_signal_id", signalId)
    .eq("processor_name", PROCESSOR_NAME)
    .eq("processor_version", PROCESSOR_VERSION)
    .contains("metadata_json", { parameterDefinitionId })
    .order("started_at", { ascending: false })
    .limit(200);
  if (error) {
    throw new Error(
      `CURATOR_TEMPLATE_PARAMETERS_MAPPING_READ_FAILED:${error.message}`,
    );
  }

  let decision: JsonRecord | null = null;
  let targetLeaf: JsonRecord | null = null;
  for (const row of data ?? []) {
    const metadata = asRecord(row.metadata_json);
    const eventCode = text(metadata.eventCode);
    if (!decision && eventCode === OBJECT_DECISION_EVENT_CODE) {
      decision = metadata;
    }
    if (
      !targetLeaf &&
      eventCode === OBJECT_CREATED_EVENT_CODE &&
      metadata.completedTargetLeaf === true
    ) {
      targetLeaf = metadata;
    }
  }

  const result = text(decision?.objectDecisionResult);
  const completed =
    decision !== null &&
    (result !== "new_leaf_required" || targetLeaf !== null);
  const summaryRu =
    text(targetLeaf?.resultSummaryRu) || text(decision?.resultSummaryRu) || null;
  const summaryEn =
    text(targetLeaf?.resultSummaryEn) || text(decision?.resultSummaryEn) || null;

  return {
    completed,
    result: result || null,
    summaryRu,
    summaryEn,
  };
}

async function buildState(signalId: string, locale: ActivityParameterLocale) {
  const [definitions, selections, confirmedRow] = await Promise.all([
    readSystemDefinitions(),
    readSelectionLogs(signalId),
    readSetConfirmed(signalId),
  ]);

  const definitionById = new Map<string, ParameterDefinitionRow>(
    definitions.map((row) => [row.id, row] as const),
  );
  const selectedRaw = selections
    .map((row) => {
      const metadata = asRecord(row.metadata_json);
      const id = text(metadata.parameterDefinitionId);
      if (!UUID_RE.test(id)) return null;
      return {
        id,
        selectionSource: text(metadata.selectionSource) || "existing",
        selectedAt: row.started_at || row.created_at,
      };
    })
    .filter(
      (
        item,
      ): item is {
        id: string;
        selectionSource: string;
        selectedAt: string;
      } => Boolean(item),
    );

  const selected = [];
  for (const selection of selectedRaw) {
    const row = definitionById.get(selection.id);
    if (!row) continue;
    const mapping = await readMappingState(signalId, selection.id);
    selected.push({
      ...mapDefinition(row, locale),
      selectionSource: selection.selectionSource,
      selectedAt: selection.selectedAt,
      mappingCompleted: mapping.completed,
      mappingResult: mapping.result,
      mappingSummaryRu: mapping.summaryRu,
      mappingSummaryEn: mapping.summaryEn,
    });
  }

  const selectedIds = new Set(selected.map((item) => item.id));
  const available = definitions
    .filter((row) => row.status === "active" && !selectedIds.has(row.id))
    .map((row) => mapDefinition(row, locale))
    .sort(
      (left, right) =>
        left.dimensionCode.localeCompare(right.dimensionCode) ||
        left.title.localeCompare(right.title),
    );

  const confirmedMetadata = confirmedRow
    ? asRecord(confirmedRow.metadata_json)
    : null;

  return {
    ok: true,
    routeMarker: ROUTE_MARKER,
    confirmed: Boolean(confirmedRow),
    confirmationComment: text(confirmedMetadata?.curatorComment) || null,
    selected,
    available,
  };
}

async function appendLog(input: {
  id: string;
  signal: EligibleSignal;
  guard: RequirePlatformAdminSuccess;
  eventCode: string;
  labelRu: string;
  labelEn: string;
  resultSummaryRu: string;
  resultSummaryEn: string;
  comment: string | null;
  extraMetadata: JsonRecord;
}) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("activity_processing_logs").insert({
    id: input.id,
    user_id: input.signal.userId,
    raw_signal_id: input.signal.id,
    activity_event_id: input.signal.activityEventId,
    processor_name: PROCESSOR_NAME,
    processor_version: PROCESSOR_VERSION,
    processing_stage: "validate",
    processing_status: "completed",
    severity: "notice",
    message: input.labelEn,
    input_json: {},
    output_json: {},
    error_json: {},
    metadata_json: {
      contract: CONTRACT,
      eventCode: input.eventCode,
      checklistVersion: "2.0",
      checklistStepCode: "400.P",
      checklistStepNameSnapshotRu:
        "Сформировать обязательный набор параметров проектируемой типовой активности.",
      labelRu: input.labelRu,
      labelEn: input.labelEn,
      actorKind: "curator",
      provenance: "curator_action",
      ...adminMetadata(input.guard),
      curatorComment: input.comment,
      resultSummaryRu: input.resultSummaryRu,
      resultSummaryEn: input.resultSummaryEn,
      ...input.extraMetadata,
    },
    started_at: now,
    finished_at: now,
    duration_ms: 0,
  });
  if (error && error.code !== "23505") {
    throw new Error(
      `CURATOR_TEMPLATE_PARAMETERS_LOG_APPEND_FAILED:${input.eventCode}:${error.message}`,
    );
  }
  return { duplicate: error?.code === "23505" };
}

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  const url = new URL(request.url);
  const signalId = text(url.searchParams.get("signalId"));
  const locale = normalizeLocale(url.searchParams.get("locale"));
  if (!UUID_RE.test(signalId)) {
    return errorResponse(
      "CURATOR_TEMPLATE_PARAMETERS_SIGNAL_ID_INVALID",
      "signalId is invalid",
      400,
    );
  }

  try {
    const signal = await readEligibleSignal(signalId);
    await assertParameterCheckCompleted(signal.id);
    return NextResponse.json(await buildState(signal.id, locale));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.endsWith("NOT_FOUND")
      ? 404
      : message.endsWith("REQUIRED")
        ? 409
        : 500;
    return errorResponse(
      "CURATOR_TEMPLATE_PARAMETERS_GET_FAILED",
      message,
      status,
    );
  }
}

export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  let body: WorkBody;
  try {
    body = (await request.json()) as WorkBody;
  } catch {
    return errorResponse(
      "CURATOR_TEMPLATE_PARAMETERS_JSON_INVALID",
      "Invalid JSON body",
      400,
    );
  }

  const signalId = text(body.signalId);
  const locale = normalizeLocale(body.locale);
  if (!UUID_RE.test(signalId)) {
    return errorResponse(
      "CURATOR_TEMPLATE_PARAMETERS_SIGNAL_ID_INVALID",
      "signalId is invalid",
      400,
    );
  }

  try {
    const signal = await readEligibleSignal(signalId);
    await assertParameterCheckCompleted(signal.id);
    const action = text(body.action);
    const confirmed = await readSetConfirmed(signal.id);

    if (action === "select_parameter") {
      if (confirmed) {
        return errorResponse(
          "CURATOR_TEMPLATE_PARAMETERS_ALREADY_CONFIRMED",
          "The parameter set is already confirmed.",
          409,
        );
      }

      const parameterDefinitionId = text(body.parameterDefinitionId);
      if (!UUID_RE.test(parameterDefinitionId)) {
        return errorResponse(
          "CURATOR_TEMPLATE_PARAMETER_ID_INVALID",
          "parameterDefinitionId is invalid",
          400,
        );
      }

      const { data, error } = await supabase
        .from("value_object_parameter_definitions")
        .select(DEFINITION_SELECT)
        .eq("id", parameterDefinitionId)
        .eq("scope_code", "system")
        .eq("status", "active")
        .limit(1);
      if (error) {
        throw new Error(
          `CURATOR_TEMPLATE_PARAMETER_READ_FAILED:${error.message}`,
        );
      }
      const parameter = (data?.[0] as unknown as ParameterDefinitionRow) ?? null;
      if (!parameter) {
        return errorResponse(
          "CURATOR_TEMPLATE_PARAMETER_NOT_AVAILABLE",
          "Selected system parameter is not active or does not exist.",
          409,
        );
      }

      const sourceRaw = text(body.selectionSource);
      const selectionSource = sourceRaw === "created" ? "created" : "existing";
      const presentation = getActivityParameterPresentation(
        parameter.parameter_code,
        locale,
        parameter.title,
        parameter.description,
      );
      const resultSummaryRu = `В набор типовой активности добавлен параметр «${getActivityParameterPresentation(parameter.parameter_code, "ru", parameter.title, parameter.description).title}» (${parameter.parameter_code}).`;
      const resultSummaryEn = `Parameter “${getActivityParameterPresentation(parameter.parameter_code, "en", parameter.title, parameter.description).title}” (${parameter.parameter_code}) was added to the typical-activity parameter set.`;

      const result = await appendLog({
        id: selectionLogId(signal.id, parameter.id),
        signal,
        guard,
        eventCode: PARAMETER_SELECTED_EVENT_CODE,
        labelRu: "Параметр добавлен в проект типовой активности",
        labelEn: "Parameter added to the typical-activity draft",
        resultSummaryRu,
        resultSummaryEn,
        comment: null,
        extraMetadata: {
          parameterDefinitionId: parameter.id,
          parameterCode: parameter.parameter_code,
          parameterTitleSnapshot: presentation.title,
          selectionSource,
        },
      });

      return NextResponse.json({
        ...(await buildState(signal.id, locale)),
        action,
        duplicate: result.duplicate,
      });
    }

    if (action === "confirm_parameter_set") {
      if (confirmed) {
        return NextResponse.json({
          ...(await buildState(signal.id, locale)),
          action,
          duplicate: true,
        });
      }

      const comment = text(body.comment);
      if (!comment || comment.length > 1500) {
        return errorResponse(
          "CURATOR_TEMPLATE_PARAMETER_SET_COMMENT_REQUIRED",
          "comment is required and must be 1500 characters or fewer",
          400,
        );
      }

      const selections = await readSelectionLogs(signal.id);
      const selectedIds = selections
        .map((row) => text(asRecord(row.metadata_json).parameterDefinitionId))
        .filter((value) => UUID_RE.test(value));
      const uniqueIds = [...new Set(selectedIds)];
      if (uniqueIds.length === 0) {
        return errorResponse(
          "CURATOR_TEMPLATE_PARAMETER_SET_EMPTY",
          "A typical activity must contain at least one selected system parameter.",
          409,
        );
      }

      const { data: activeRows, error: activeError } = await supabase
        .from("value_object_parameter_definitions")
        .select("id,parameter_code,title,status,scope_code")
        .in("id", uniqueIds)
        .eq("scope_code", "system")
        .eq("status", "active");
      if (activeError) {
        throw new Error(
          `CURATOR_TEMPLATE_PARAMETER_SET_ACTIVE_CHECK_FAILED:${activeError.message}`,
        );
      }
      if ((activeRows ?? []).length !== uniqueIds.length) {
        return errorResponse(
          "CURATOR_TEMPLATE_PARAMETER_SET_CONTAINS_INACTIVE",
          "Every selected parameter must still be an active system parameter.",
          409,
        );
      }

      const resultSummaryRu = `Сформирован обязательный набор параметров типовой активности: ${uniqueIds.length}. Следующий шаг — определить измеримый листовой ОН для каждого выбранного параметра.`;
      const resultSummaryEn = `The required typical-activity parameter set was formed: ${uniqueIds.length}. Next, determine the measurable leaf observation object for every selected parameter.`;
      const result = await appendLog({
        id: setConfirmedLogId(signal.id),
        signal,
        guard,
        eventCode: PARAMETER_SET_EVENT_CODE,
        labelRu: "Набор параметров типовой активности сформирован",
        labelEn: "Typical-activity parameter set confirmed",
        resultSummaryRu,
        resultSummaryEn,
        comment,
        extraMetadata: {
          selectedParameterDefinitionIds: uniqueIds,
          selectedParameterCount: uniqueIds.length,
          minimumParameterRule: "at_least_one_parameter_required",
        },
      });

      return NextResponse.json({
        ...(await buildState(signal.id, locale)),
        action,
        duplicate: result.duplicate,
      });
    }

    return errorResponse(
      "CURATOR_TEMPLATE_PARAMETERS_ACTION_INVALID",
      "action is invalid",
      400,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const conflict =
      message.includes("REQUIRED") ||
      message.includes("NOT_AVAILABLE") ||
      message.includes("ALREADY_CONFIRMED") ||
      message.includes("EMPTY") ||
      message.includes("INACTIVE");
    const notFound = message.endsWith("NOT_FOUND");
    return errorResponse(
      "CURATOR_TEMPLATE_PARAMETERS_POST_FAILED",
      message,
      notFound ? 404 : conflict ? 409 : 500,
    );
  }
}
