import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { isConfirmedMissingTypicalActivityAnalysis } from "@/lib/activity/basic-intake-analysis-state";
import {
  ARCTOR_SYSTEM_TYPICAL_ACTIVITY_CATALOG_V1,
  loadSystemTypicalActivityCatalogV1,
} from "@/lib/activity/typical-activity-catalog.server";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "reality-curator-template-check-v2" as const;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIMIT = 500;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  const signalId = text(new URL(request.url).searchParams.get("signalId"));
  if (!UUID_RE.test(signalId)) {
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: "signalId is invalid" },
      { status: 400 },
    );
  }

  const { data: signalRows, error: signalError } = await supabase
    .from("raw_activity_signals")
    .select(
      "id,user_id,source_type,idempotency_key,normalized_preview_json,output_event_id",
    )
    .eq("id", signalId)
    .limit(1);

  if (signalError) {
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: signalError.message },
      { status: 500 },
    );
  }

  const signal = signalRows?.[0];
  if (!signal) {
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: "Signal not found" },
      { status: 404 },
    );
  }

  const normalized = asRecord(signal.normalized_preview_json);
  const analysis = asRecord(normalized.basicIntakeAnalysisV1);
  const eligible =
    signal.source_type === "manual_chat" &&
    text(signal.idempotency_key).startsWith(
      "activity_ai_lab_quick_capture:",
    ) &&
    isConfirmedMissingTypicalActivityAnalysis(analysis);

  if (!eligible) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: "Signal is not eligible",
      },
      { status: 409 },
    );
  }

  const activityEventId =
    text(analysis.activityEventId) || text(signal.output_event_id);
  if (!activityEventId) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: "Activity event is missing",
      },
      { status: 409 },
    );
  }

  const { data: eventRows, error: eventError } = await supabase
    .from("activity_events")
    .select("id,acting_as_actor_id")
    .eq("id", activityEventId)
    .eq("user_id", signal.user_id)
    .limit(1);

  if (eventError) {
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: eventError.message },
      { status: 500 },
    );
  }

  if (!text(eventRows?.[0]?.acting_as_actor_id)) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: "Activity profile is missing",
      },
      { status: 409 },
    );
  }

  try {
    const rows = await loadSystemTypicalActivityCatalogV1({ limit: LIMIT });

    const templates = rows.map((item) => ({
      id: item.id,
      title: item.title,
      shortTitle: item.short_title,
      templateGroup: item.template_group || null,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      signalId,
      templates,
      count: templates.length,
      truncated: templates.length >= LIMIT,
      scope: "system",
      catalogContract: ARCTOR_SYSTEM_TYPICAL_ACTIVITY_CATALOG_V1,
      readOnly: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error:
          error instanceof Error
            ? error.message
            : "Typical-activity catalog read failed",
      },
      { status: 500 },
    );
  }
}
