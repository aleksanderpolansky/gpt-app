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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

type WorkRequest = {
  action?: unknown;
  signalId?: unknown;
  result?: unknown;
  templateId?: unknown;
};

type EligibleSignal = {
  id: string;
  userId: string;
  activityEventId: string;
  actorId: string;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function readEligibleSignal(signalId: string): Promise<EligibleSignal> {
  const { data: signalRows, error: signalError } = await supabase
    .from("raw_activity_signals")
    .select("id,user_id,source_type,idempotency_key,normalized_preview_json,output_event_id")
    .eq("id", signalId)
    .limit(1);

  if (signalError) {
    throw new Error(`CURATOR_WORK_SIGNAL_READ_FAILED:${signalError.message}`);
  }

  const signal = signalRows?.[0];
  if (!signal) throw new Error("CURATOR_WORK_SIGNAL_NOT_FOUND");

  const normalized = asRecord(signal.normalized_preview_json);
  const analysis = asRecord(normalized.basicIntakeAnalysisV1);
  const candidates = Array.isArray(analysis.templateCandidates)
    ? analysis.templateCandidates
    : [];

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

  if (eventError) {
    throw new Error(`CURATOR_WORK_ACTIVITY_READ_FAILED:${eventError.message}`);
  }
  const event = eventRows?.[0];
  const actorId = text(event?.acting_as_actor_id);
  if (!event || !actorId) throw new Error("CURATOR_WORK_ACTIVITY_CONTEXT_MISSING");

  return {
    id: signal.id,
    userId: signal.user_id,
    activityEventId,
    actorId,
  };
}

function adminMetadata(guard: Awaited<ReturnType<typeof requirePlatformAdmin>>) {
  if (!guard.ok) return {};
  return {
    curatorAppUserId: guard.appUser.id,
    curatorAdminId: guard.platformAdmin.id,
    curatorRole: guard.platformAdmin.role,
  };
}

export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  let body: WorkRequest;
  try {
    body = (await request.json()) as WorkRequest;
  } catch {
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const action = text(body.action);
  const signalId = text(body.signalId);
  if (!UUID_RE.test(signalId)) {
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: "signalId is invalid" },
      { status: 400 },
    );
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

      return NextResponse.json({
        ok: true,
        routeMarker: ROUTE_MARKER,
        action,
        duplicate: result.duplicate,
      });
    }

    if (action === "complete_activity_check") {
      const journey = (await readRealityCuratorJourneysBySignalIds([signal.id]))[
        signal.id
      ] ?? [];
      if (!journey.some((item) => item.eventCode === "curator_work_started")) {
        return NextResponse.json(
          {
            ok: false,
            routeMarker: ROUTE_MARKER,
            error: "Signal must be taken into work first",
          },
          { status: 409 },
        );
      }

      if (journey.some((item) => item.eventCode === "existing_typical_activity_checked")) {
        return NextResponse.json({
          ok: true,
          routeMarker: ROUTE_MARKER,
          action,
          duplicate: true,
        });
      }

      const checkResult = text(body.result);
      if (checkResult !== "found" && checkResult !== "not_found") {
        return NextResponse.json(
          { ok: false, routeMarker: ROUTE_MARKER, error: "result is invalid" },
          { status: 400 },
        );
      }

      let selectedTemplateId: string | null = null;
      let selectedTemplateTitle: string | null = null;
      let selectedTemplateGroup: string | null = null;

      if (checkResult === "found") {
        const templateId = text(body.templateId);
        if (!UUID_RE.test(templateId)) {
          return NextResponse.json(
            { ok: false, routeMarker: ROUTE_MARKER, error: "templateId is required" },
            { status: 400 },
          );
        }

        const { data: templateRows, error: templateError } = await supabase
          .from("activity_templates")
          .select("id,title,template_group")
          .eq("id", templateId)
          .eq("owner_user_id", signal.userId)
          .eq("owner_actor_id", signal.actorId)
          .eq("template_scope", "user")
          .eq("status", "active")
          .eq("is_active", true)
          .limit(1);

        if (templateError) {
          throw new Error(`CURATOR_WORK_TEMPLATE_READ_FAILED:${templateError.message}`);
        }
        const template = templateRows?.[0];
        if (!template) {
          return NextResponse.json(
            { ok: false, routeMarker: ROUTE_MARKER, error: "Selected activity is not available" },
            { status: 409 },
          );
        }
        selectedTemplateId = template.id;
        selectedTemplateTitle = text(template.title);
        selectedTemplateGroup = text(template.template_group) || null;
      }

      const resultSummaryRu =
        checkResult === "found"
          ? `Подходящая типовая активность найдена: ${selectedTemplateTitle || selectedTemplateId}.`
          : "Подходящей типовой активности в текущем профиле не найдено.";
      const resultSummaryEn =
        checkResult === "found"
          ? `A suitable typical activity was found: ${selectedTemplateTitle || selectedTemplateId}.`
          : "No suitable typical activity was found in the current profile.";

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
          resultSummaryRu,
          resultSummaryEn,
        },
      });

      return NextResponse.json({
        ok: true,
        routeMarker: ROUTE_MARKER,
        action,
        duplicate: result.duplicate,
        result: checkResult,
        selectedTemplateId,
      });
    }

    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: "action is invalid" },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.endsWith("NOT_FOUND") ? 404 : 500;
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: message },
      { status },
    );
  }
}
