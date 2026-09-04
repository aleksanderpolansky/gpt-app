import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { supabase } from "../../../../../../lib/supabase";
import { readRealityCuratorJourneysBySignalIds } from "@/lib/reality-curator/journey-log.server";
import { readCuratorProcessingLogs } from "@/lib/reality-curator/processing-log.server";
import {
  isConfirmedMissingTypicalActivityAnalysis,
} from "@/lib/activity/basic-intake-analysis-state";
import { readCuratorModelAvailabilitySummary } from "@/lib/reality-curator/model-availability-summary.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "reality-curator-live-signals-v1" as const;
const MAX_SCAN_LIMIT = 500;
const DEFAULT_SCAN_LIMIT = 200;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

type RawActivitySignalRow = {
  id: string;
  user_id: string;
  source_type: string;
  idempotency_key: string | null;
  raw_payload: unknown;
  normalized_preview_json: unknown;
  processing_status: string;
  processing_error: string | null;
  output_event_id: string | null;
  metadata_json: unknown;
  updated_at: string;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readLimit(request: Request): number | null {
  const raw = new URL(request.url).searchParams.get("limit");
  if (!raw) return DEFAULT_SCAN_LIMIT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_SCAN_LIMIT) {
    return null;
  }
  return parsed;
}

function safeMeasurements(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 24).map((item) => {
    const row = asRecord(item);
    return {
      parameterCode: text(row.parameterCode),
      label: text(row.label),
      measureType: text(row.measureType),
      unit: text(row.unit),
      valueNumeric: finiteNumber(row.valueNumeric),
      valueText: text(row.valueText) || null,
      rawFragment: text(row.rawFragment),
      confidence: finiteNumber(row.confidence),
    };
  });
}

function buildCuratorSignal(row: RawActivitySignalRow) {
  const raw = asRecord(row.raw_payload);
  const metadata = asRecord(row.metadata_json);
  const normalized = asRecord(row.normalized_preview_json);
  const analysis = asRecord(normalized.basicIntakeAnalysisV1);
  if (!isConfirmedMissingTypicalActivityAnalysis(analysis)) return null;

  const activityEventId =
    text(analysis.activityEventId) || text(row.output_event_id) || null;
  const sourceText =
    text(raw.inputText) ||
    text(asRecord(normalized.durableResult).sourceText) ||
    "";

  return {
    kind: "missing_typical_activity" as const,
    status: "new" as const,
    sourceType: row.source_type,
    idempotencyKey: row.idempotency_key,
    signalId: row.id,
    activityEventId,
    userId: row.user_id,
    sourceText,
    locale: text(raw.locale) || text(metadata.locale) || null,
    timeZone: text(raw.timeZone) || text(metadata.timeZone) || null,
    temporalDirection:
      text(analysis.temporalDirection) ||
      text(raw.temporalDirection) ||
      text(metadata.temporalDirection) ||
      null,
    reportedAt: text(raw.reportedAt) || null,
    analyzedAt: text(analysis.analyzedAt) || row.updated_at,
    updatedAt: row.updated_at,
    processingStatus: row.processing_status,
    analysisMode: text(analysis.analysisMode) || null,
    providerAvailable:
      typeof analysis.providerAvailable === "boolean"
        ? analysis.providerAvailable
        : null,
    candidateLoadWarning: text(analysis.candidateLoadWarning) || null,
    measurements: safeMeasurements(analysis.measurements),
  };
}

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) {
    return platformAdminErrorResponse(guard, ROUTE_MARKER);
  }

  const limit = readLimit(request);
  if (!limit) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: `limit must be an integer from 1 to ${MAX_SCAN_LIMIT}`,
      },
      { status: 400 },
    );
  }

  const visitId =
    new URL(request.url).searchParams.get("visitId")?.trim() ?? "";
  if (visitId && !UUID_RE.test(visitId)) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: "visitId must be a UUID when provided",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("raw_activity_signals")
    .select(
      "id,user_id,source_type,idempotency_key,raw_payload,normalized_preview_json,processing_status,processing_error,output_event_id,metadata_json,updated_at",
    )
    .eq("source_type", "manual_chat")
    .like("idempotency_key", "activity_ai_lab_quick_capture:%")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: error.message,
      },
      { status: 500 },
    );
  }

  const scannedRows = (data ?? []) as RawActivitySignalRow[];
  const signals = scannedRows
    .map(buildCuratorSignal)
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const journeyBySignalId = await readRealityCuratorJourneysBySignalIds(
    signals.map((signal) => signal.signalId),
  );
  const signalsWithJourney = signals.map((signal) => ({
    ...signal,
    journey: journeyBySignalId[signal.signalId] ?? [],
  }));

  const processingLogBySignalId = await readCuratorProcessingLogs(
    signalsWithJourney.map((signal) => ({
      signalId: signal.signalId,
      userId: signal.userId,
      sourceText: signal.sourceText,
      sourceType: signal.sourceType,
      idempotencyKey: signal.idempotencyKey,
    })),
  );
  const signalsWithProcessingLog = signalsWithJourney.map((signal) => ({
    ...signal,
    processingLog: processingLogBySignalId[signal.signalId],
  }));

  const modelAvailability = await readCuratorModelAvailabilitySummary({
    curatorAppUserId: guard.appUser.id,
    visitId: visitId || null,
  });

  return NextResponse.json(
    {
      ok: true,
      routeMarker: ROUTE_MARKER,
      queueContract: "ARCTOR_REALITY_CURATOR_LIVE_SIGNAL_QUEUE_V1",
      journeyContract: "ARCTOR_REALITY_CURATOR_JOURNEY_V1",
      signalKind: "missing_typical_activity",
      signals: signalsWithProcessingLog,
      counts: {
        visible: signalsWithProcessingLog.length,
        scanned: scannedRows.length,
        scanLimit: limit,
      },
      modelAvailability,
      readOnly: true,
    },
    { status: 200 },
  );
}
