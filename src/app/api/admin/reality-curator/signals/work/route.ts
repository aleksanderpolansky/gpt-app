import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import {
  appendRealityCuratorJourneyEvent,
  readRealityCuratorJourneysBySignalIds,
} from "@/lib/reality-curator/journey-log.server";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "reality-curator-work-v1" as const;
const BASIC_CONTRACT = "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1" as const;
const PARAMETER_EVENT_CODE = "related_parameter_catalog_checked" as const;
const JOURNEY_PROCESSOR_NAME = "reality_curator_journey" as const;
const JOURNEY_PROCESSOR_VERSION = "1" as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PARAMETER_RESULTS = new Set([
  "available",
  "missing",
  "not_needed",
  "needs_clarification",
]);

type JsonRecord = Record<string, unknown>;

type WorkRequest = {
  action?: unknown;
  signalId?: unknown;
  result?: unknown;
  templateId?: unknown;
  comment?: unknown;
};

type EligibleSignal = {
  id: string;
  userId: string;
  activityEventId: string;
  actorId: string;
};

type ParameterCheckState = {
  completed: boolean;
  result: string | null;
  resultSummaryRu: string | null;
  resultSummaryEn: string | null;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stableUuid(seed: string): string {
  const bytes = Buffer.from(crypto.createHash("sha256").update(seed, "utf8").digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parameterCheckLogId(signalId: string) {
  return stableUuid(`ARCTOR_REALITY_CURATOR_PARAMETER_CHECK_V1|${signalId}|${PARAMETER_EVENT_CODE}`);
}

async function readEligibleSignal(signalId: string): Promise<EligibleSignal> {
  const { data: signalRows, error: signalError } = await supabase
    .from("raw_activity_signals")
    .select("id,user_id,source_type,idempotency_key,normalized_preview_json,output_event_id")
    .eq("id", signalId)
    .limit(1);

  if (signalError) throw new Error(`CURATOR_WORK_SIGNAL_READ_FAILED:${signalError.message}`);
  const signal = signalRows?.[0];
  if (!signal) throw new Error("CURATOR_WORK_SIGNAL_NOT_FOUND");

  const normalized = asRecord(signal.normalized_preview_json);
  const analysis = asRecord(normalized.basicIntakeAnalysisV1);
  const candidates = Array.isArray(analysis.templateCandidates) ? analysis.templateCandidates : [];
  const eligible =
    signal.source_type === "manual_chat" &&
    text(signal.idempotency_key).startsWith("activity_ai_lab_quick_capture:") &&
    analysis.contract === BASIC_CONTRACT &&
    analysis.status === "completed" &&
    analysis.noSuitableTypicalActivity === true &&
    candidates.length === 0;
  if (!eligible) throw new Error("CURATOR_WORK_SIGNAL_NOT_ELIGIBLE");

  const activityEventId = text(analysis.activityEventId) || text(signal.output_event_id);
  if (!activityEventId) throw new Error("CURATOR_WORK_ACTIVITY_EVENT_MISSING");

  const { data: eventRows, error: eventError } = await supabase
    .from("activity_events")
    .select("id,user_id,acting_as_actor_id")
    .eq("id", activityEventId)
    .eq("user_id", signal.user_id)
    .limit(1);
  if (eventError) throw new Error(`CURATOR_WORK_ACTIVITY_READ_FAILED:${eventError.message}`);
  const event = eventRows?.[0];
  const actorId = text(event?.acting_as_actor_id);
  if (!event || !actorId) throw new Error("CURATOR_WORK_ACTIVITY_CONTEXT_MISSING");

  return { id: signal.id, userId: signal.user_id, activityEventId, actorId };
}

function adminMetadata(guard: Awaited<ReturnType<typeof requirePlatformAdmin>>) {
  if (!guard.ok) return {};
  return {
    curatorAppUserId: guard.appUser.id,
    curatorAdminId: guard.platformAdmin.id,
    curatorRole: guard.platformAdmin.role,
    curatorNameSnapshot: guard.appUser.name,
    curatorEmailSnapshot: guard.appUser.email,
  };
}

function parameterSummary(result: string) {
  if (result === "available") {
    return {
      ru: "В системном каталоге найдены параметры, связанные с предполагаемым смыслом.",
      en: "The system catalog contains parameters related to the presumed meaning.",
    };
  }
  if (result === "missing") {
    return {
      ru: "В системном каталоге не хватает параметра, связанного с предполагаемым смыслом.",
      en: "The system catalog is missing a parameter related to the presumed meaning.",
    };
  }
  if (result === "not_needed") {
    return {
      ru: "Для предполагаемого смысла отдельный параметр на этом этапе не требуется.",
      en: "No separate parameter is required for the presumed meaning at this stage.",
    };
  }
  return {
    ru: "Для проверки параметров требуется дополнительное уточнение.",
    en: "Additional clarification is required for the parameter review.",
  };
}

async function readParameterCheck(signal: EligibleSignal): Promise<ParameterCheckState> {
  const { data, error } = await supabase
    .from("activity_processing_logs")
    .select("id,metadata_json")
    .eq("id", parameterCheckLogId(signal.id))
    .eq("raw_signal_id", signal.id)
    .eq("processor_name", JOURNEY_PROCESSOR_NAME)
    .eq("processor_version", JOURNEY_PROCESSOR_VERSION)
    .limit(1);
  if (error) throw new Error(`CURATOR_PARAMETER_CHECK_READ_FAILED:${error.message}`);
  const row = data?.[0];
  if (!row) return { completed: false, result: null, resultSummaryRu: null, resultSummaryEn: null };
  const metadata = asRecord(row.metadata_json);
  return {
    completed: true,
    result: text(metadata.parameterCheckResult) || null,
    resultSummaryRu: text(metadata.resultSummaryRu) || null,
    resultSummaryEn: text(metadata.resultSummaryEn) || null,
  };
}

async function appendParameterCheck(input: {
  signal: EligibleSignal;
  guard: Awaited<ReturnType<typeof requirePlatformAdmin>>;
  result: string;
  comment: string;
  occurredAt: string;
}) {
  const summary = parameterSummary(input.result);
  const id = parameterCheckLogId(input.signal.id);
  const { error } = await supabase.from("activity_processing_logs").insert({
    id,
    user_id: input.signal.userId,
    raw_signal_id: input.signal.id,
    activity_event_id: input.signal.activityEventId,
    processor_name: JOURNEY_PROCESSOR_NAME,
    processor_version: JOURNEY_PROCESSOR_VERSION,
    processing_stage: "validate",
    processing_status: "completed",
    severity: "notice",
    message: "Reality curator journey event: related_parameter_catalog_checked",
    input_json: {},
    output_json: {},
    error_json: {},
    metadata_json: {
      contract: "ARCTOR_REALITY_CURATOR_JOURNEY_V1",
      eventCode: PARAMETER_EVENT_CODE,
      checklistVersion: "2.0",
      checklistStepCode: "6",
      checklistStepNameSnapshotRu: "Проверить каталог параметров и измерений, связанных с предполагаемым смыслом.",
      labelRu: "Проверен каталог параметров и измерений",
      labelEn: "Parameter and measurement catalog checked",
      actorKind: "curator",
      provenance: "curator_action",
      ...adminMetadata(input.guard),
      parameterCheckResult: input.result,
      curatorComment: input.comment || null,
      resultSummaryRu: summary.ru,
      resultSummaryEn: summary.en,
    },
    started_at: input.occurredAt,
    finished_at: input.occurredAt,
    duration_ms: 0,
  });
  if (error && error.code !== "23505") {
    throw new Error(`CURATOR_PARAMETER_CHECK_APPEND_FAILED:${error.message}`);
  }
  return { duplicate: error?.code === "23505", summary };
}

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);
  const signalId = new URL(request.url).searchParams.get("signalId")?.trim() ?? "";
  if (!UUID_RE.test(signalId)) {
    return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "signalId is invalid" }, { status: 400 });
  }
  try {
    const signal = await readEligibleSignal(signalId);
    const parameterCheck = await readParameterCheck(signal);
    return NextResponse.json({ ok: true, routeMarker: ROUTE_MARKER, parameterCheck });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: message }, { status: message.endsWith("NOT_FOUND") ? 404 : 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  let body: WorkRequest;
  try {
    body = (await request.json()) as WorkRequest;
  } catch {
    return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "Invalid JSON body" }, { status: 400 });
  }

  const action = text(body.action);
  const signalId = text(body.signalId);
  if (!UUID_RE.test(signalId)) {
    return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "signalId is invalid" }, { status: 400 });
  }

  try {
    const signal = await readEligibleSignal(signalId);
    const now = new Date().toISOString();

    if (action === "start_work") {
      const result = await appendRealityCuratorJourneyEvent({
        userId: signal.userId,
        rawSignalId: signal.id,
        activityEventId: signal.activityEventId,
        eventCode: "curator_work_started",
        occurredAt: now,
        actorKind: "curator",
        provenance: "curator_action",
        extraMetadata: {
          ...adminMetadata(guard),
          resultSummaryRu: "Сигнал взят куратором в работу.",
          resultSummaryEn: "The signal was taken into curator work.",
        },
      });
      return NextResponse.json({ ok: true, routeMarker: ROUTE_MARKER, action, duplicate: result.duplicate });
    }

    if (action === "complete_activity_check") {
      const journey = (await readRealityCuratorJourneysBySignalIds([signal.id]))[signal.id] ?? [];
      if (!journey.some((item) => item.eventCode === "curator_work_started")) {
        return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "Signal must be taken into work first" }, { status: 409 });
      }
      if (journey.some((item) => item.eventCode === "existing_typical_activity_checked")) {
        return NextResponse.json({ ok: true, routeMarker: ROUTE_MARKER, action, duplicate: true });
      }

      const checkResult = text(body.result);
      const curatorComment = text(body.comment);
      if (curatorComment.length > 1500) {
        return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "comment is too long" }, { status: 400 });
      }
      if (checkResult !== "found" && checkResult !== "not_found") {
        return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "result is invalid" }, { status: 400 });
      }

      let selectedTemplateId: string | null = null;
      let selectedTemplateTitle: string | null = null;
      let selectedTemplateGroup: string | null = null;
      if (checkResult === "found") {
        const templateId = text(body.templateId);
        if (!UUID_RE.test(templateId)) {
          return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "templateId is required" }, { status: 400 });
        }
        const { data: templateRows, error: templateError } = await supabase
          .from("activity_templates")
          .select("id,title,template_group")
          .eq("id", templateId)
          .eq("template_scope", "system")
          .eq("status", "active")
          .eq("is_active", true)
          .limit(1);
        if (templateError) throw new Error(`CURATOR_WORK_TEMPLATE_READ_FAILED:${templateError.message}`);
        const template = templateRows?.[0];
        if (!template) {
          return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "Selected system activity is not available" }, { status: 409 });
        }
        selectedTemplateId = template.id;
        selectedTemplateTitle = text(template.title);
        selectedTemplateGroup = text(template.template_group) || null;
      }

      const resultSummaryRu = checkResult === "found"
        ? `Подходящая системная типовая активность на платформе найдена: ${selectedTemplateTitle || selectedTemplateId}.`
        : "Подходящей системной типовой активности на платформе не найдено.";
      const resultSummaryEn = checkResult === "found"
        ? `A suitable system typical activity was found on the platform: ${selectedTemplateTitle || selectedTemplateId}.`
        : "No suitable system typical activity was found on the platform.";

      const result = await appendRealityCuratorJourneyEvent({
        userId: signal.userId,
        rawSignalId: signal.id,
        activityEventId: signal.activityEventId,
        eventCode: "existing_typical_activity_checked",
        occurredAt: now,
        actorKind: "curator",
        provenance: "curator_action",
        extraMetadata: {
          ...adminMetadata(guard),
          activityCheckResult: checkResult,
          selectedTemplateId,
          selectedTemplateTitle,
          selectedTemplateGroup,
          curatorComment: curatorComment || null,
          resultSummaryRu,
          resultSummaryEn,
        },
      });
      return NextResponse.json({ ok: true, routeMarker: ROUTE_MARKER, action, duplicate: result.duplicate, result: checkResult, selectedTemplateId });
    }

    if (action === "complete_parameter_check") {
      const journey = (await readRealityCuratorJourneysBySignalIds([signal.id]))[signal.id] ?? [];
      if (!journey.some((item) => item.eventCode === "existing_typical_activity_checked")) {
        return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "Typical activity check must be completed first" }, { status: 409 });
      }
      const checkResult = text(body.result);
      const curatorComment = text(body.comment);
      if (!PARAMETER_RESULTS.has(checkResult)) {
        return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "result is invalid" }, { status: 400 });
      }
      if (curatorComment.length > 1500) {
        return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "comment is too long" }, { status: 400 });
      }
      const written = await appendParameterCheck({ signal, guard, result: checkResult, comment: curatorComment, occurredAt: now });
      const parameterCheck: ParameterCheckState = {
        completed: true,
        result: checkResult,
        resultSummaryRu: written.summary.ru,
        resultSummaryEn: written.summary.en,
      };
      return NextResponse.json({ ok: true, routeMarker: ROUTE_MARKER, action, duplicate: written.duplicate, parameterCheck });
    }

    return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: "action is invalid" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, routeMarker: ROUTE_MARKER, error: message }, { status: message.endsWith("NOT_FOUND") ? 404 : 500 });
  }
}
