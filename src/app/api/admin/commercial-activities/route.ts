import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { retryCommercialFeedActivityV1 } from "@/lib/activity/commercialFeedActivityBridge.server";
import { explainCommercialFailureP2 } from "@/lib/activity/commercialDiagnosticsP2";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const MARKER = "ARCTOR_COMMERCIAL_ADMIN_DIAGNOSTICS_P2_V1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonMap = Record<string, unknown>;
function object(value: unknown): JsonMap {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonMap : {};
}
function shortText(value: unknown, max = 240): string | null {
  return typeof value === "string" ? value.slice(0, max) : null;
}

/** Read only. Never infer fact-to-ON links from names, descriptions or intermediary ancestors. */
export async function GET() {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, MARKER);

  const { data, error } = await supabase.from("activity_events")
    .select("id,title,input_text,created_at,commercial_processing_status,commercial_processing_error,activity_template_id,source_message_object_id,metadata_json")
    .eq("activity_context_code", "commercial")
    .in("commercial_processing_status", ["analysis_ready", "needs_review", "failed"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const events = data ?? [];
  const ids = events.map((e) => e.id);
  const signalIds = [...new Set(events.map((e) => {
    const bridge = object(object(e.metadata_json).commercialFeedPublicationV1);
    return typeof bridge.rawSignalId === "string" ? bridge.rawSignalId : null;
  }).filter((id): id is string => Boolean(id && UUID_RE.test(id))))];

  // Data is queried only for a verified platform administrator and is never
  // returned to the public feed. A failure to read diagnostics is explicit.
  const signalResult = signalIds.length ? await supabase.from("raw_activity_signals")
    .select("id,normalized_preview_json").in("id", signalIds) : { data: [], error: null };
  if (signalResult.error) return NextResponse.json({ ok: false,
    error: `COMMERCIAL_DIAGNOSTIC_SIGNAL_READ_FAILED:${signalResult.error.message}` }, { status: 500 });
  const previewBySignal = new Map((signalResult.data ?? []).map((s) => [s.id, object(s.normalized_preview_json)]));

  const factsResult = ids.length ? await supabase.from("activity_object_facts")
    .select("activity_event_id,value_object_id,parameter_definition_id,value_numeric,value_text,unit,fact_status")
    .in("activity_event_id", ids).neq("fact_status", "deleted").limit(1000) : { data: [], error: null };
  if (factsResult.error) return NextResponse.json({ ok: false,
    error: `COMMERCIAL_DIAGNOSTIC_FACT_READ_FAILED:${factsResult.error.message}` }, { status: 500 });
  const factsByEvent = new Map<string, typeof factsResult.data>();
  for (const fact of factsResult.data ?? []) {
    if (!fact.activity_event_id) continue;
    const list = factsByEvent.get(fact.activity_event_id) ?? [];
    list.push(fact);
    factsByEvent.set(fact.activity_event_id, list);
  }

  const records = events.map((event) => {
    const bridge = object(object(event.metadata_json).commercialFeedPublicationV1);
    const signalId = typeof bridge.rawSignalId === "string" ? bridge.rawSignalId : "";
    const preview = previewBySignal.get(signalId) ?? {};
    const analysis = object(preview.basicIntakeAnalysisV1);
    const measurements = Array.isArray(analysis.measurements) ? analysis.measurements : [];
    const templateCandidates = Array.isArray(analysis.templateCandidates) ? analysis.templateCandidates : [];
    const history = Array.isArray(preview.commercialRetryHistoryV1)
      ? preview.commercialRetryHistoryV1.slice(-10).map((item) => {
          const entry = object(item);
          const previous = object(entry.previous);
          return {
            at: shortText(entry.at, 60),
            status: shortText(entry.previousStatus, 80),
            reason: shortText(entry.previousReason, 300),
            templateId: shortText(entry.previousTemplateId, 60),
            analysisAvailable: Object.keys(previous).length > 0,
          };
        }) : [];
    const facts = factsByEvent.get(event.id) ?? [];
    return {
      id: event.id, title: event.title, input_text: event.input_text,
      created_at: event.created_at,
      commercial_processing_status: event.commercial_processing_status,
      commercial_processing_error: event.commercial_processing_error,
      activity_template_id: event.activity_template_id,
      source_message_object_id: event.source_message_object_id,
      diagnostic: {
        ...explainCommercialFailureP2(event.commercial_processing_status, event.commercial_processing_error),
        source: { rawSignalAvailable: Boolean(previewBySignal.has(signalId)),
          basicAnalysisAvailable: Object.keys(analysis).length > 0 },
        extractedMeasurements: measurements.slice(0, 15).map((item) => {
          const m = object(item);
          return {
            parameterCode: shortText(m.parameterCode, 80),
            valueNumeric: typeof m.valueNumeric === "number" && Number.isFinite(m.valueNumeric) ? m.valueNumeric : null,
            valueText: shortText(m.valueText, 100),
            unit: shortText(m.unit, 40),
            fragment: shortText(m.rawFragment, 160),
          };
        }),
        candidateCount: templateCandidates.length,
        recordedFacts: facts.slice(0, 20).map((fact) => ({
          valueObjectId: fact.value_object_id,
          parameterDefinitionId: fact.parameter_definition_id,
          valueNumeric: fact.value_numeric,
          valueText: shortText(fact.value_text, 100),
          unit: fact.unit,
          status: fact.fact_status,
        })),
        recordedFactCountWithinSample: facts.length,
        factsQueryLimitReached: (factsResult.data ?? []).length >= 1000,
        history,
        historyNote: "История содержит только доступные сохранённые попытки; старые статусы до P2 могли не записываться.",
      },
    };
  });
  return NextResponse.json({ ok: true, contract: MARKER, records },
    { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, MARKER);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, error: "CROSS_ORIGIN_RETRY_DENIED" }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 }); }
  const eventId = body && typeof body === "object" && "activityEventId" in body
    ? (body as { activityEventId?: unknown }).activityEventId : null;
  if (typeof eventId !== "string" || !UUID_RE.test(eventId))
    return NextResponse.json({ ok: false, error: "INVALID_EVENT_ID" }, { status: 400 });
  try {
    const result = await retryCommercialFeedActivityV1(eventId);
    return NextResponse.json({ ok: true, contract: MARKER, result },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, contract: MARKER,
      error: error instanceof Error ? error.message : "RETRY_FAILED" }, { status: 409 });
  }
}
