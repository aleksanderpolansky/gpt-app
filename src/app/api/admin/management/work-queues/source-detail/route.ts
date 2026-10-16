import { NextResponse } from "next/server";
import { requirePlatformAdmin, platformAdminErrorResponse } from "@/lib/admin/require-platform-admin";
import { explainCommercialFailureP2 } from "@/lib/activity/commercialDiagnosticsP2";
import { inspectCommercialFactRoutesP25 } from "@/lib/activity/commercialSharedPreflightP25.server";
import { readCommercialAutoFactSettingV1 } from "@/lib/activity/commercialAutoFactControlV1.server";
import { buildCommercialWorkProgressV1, type CommercialWorkEvidence } from "@/lib/activity/commercialWorkProgressV1";
import { buildCommercialP25EvidenceV1 } from "@/lib/activity/commercialP25EvidenceV1";
import { supabase } from "../../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CONTRACT = "ARCTOR_ADM4B2_COMMERCIAL_SOURCE_DETAIL_V1";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, contract: CONTRACT, errorCode }, { status, headers: HEADERS });
}

/** Only ONE verified public commercial source. No personal raw signals, private metadata or writes. */
export async function GET(request: Request) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, CONTRACT);
  const id = new URL(request.url).searchParams.get("activityEventId") ?? "";
  if (!UUID.test(id)) return fail("ADM4B2_DETAIL_INVALID_ID", 400);
  try {
    const { data: activity, error } = await supabase.from("activity_events")
      .select("id,user_id,activity_template_id,title,input_text,created_at,commercial_processing_status,commercial_processing_error,source_message_object_id")
      .eq("id", id)
      .eq("activity_context_code", "commercial")
      .in("commercial_processing_status", ["analysis_ready", "needs_review", "failed"])
      .maybeSingle();
    if (error) { console.error("ADM4B2_DETAIL_EVENT_READ_FAILED", error.code); return fail("ADM4B2_DETAIL_UNAVAILABLE", 503); }
    if (!activity || !activity.source_message_object_id) return fail("ADM4B2_DETAIL_NOT_FOUND", 404);
    const { data: message, error: messageError } = await supabase.from("message_objects")
      .select("id")
      .eq("id", activity.source_message_object_id)
      .eq("audience_scope_code", "public")
      .eq("lifecycle_status", "active")
      .maybeSingle();
    if (messageError) { console.error("ADM4B2_DETAIL_MESSAGE_READ_FAILED", messageError.code); return fail("ADM4B2_DETAIL_UNAVAILABLE", 503); }
    if (!message) return fail("ADM4B2_DETAIL_NOT_PUBLIC", 404);
    // Evidence-backed progress: P2.5 only inspects routes. It never confirms a leaf or writes facts.
    // Query AFTER public-source validation; do not send private signal metadata to the browser.
    let completedAnalysis = false;
    let measurementCount: number | null = null;
    let rawMeasurements: unknown = null;
    const signalResult = await supabase.from("raw_activity_signals")
      .select("normalized_preview_json")
      .eq("output_event_id", activity.id)
      .eq("user_id", activity.user_id)
      .eq("source_type", "system_event")
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (!signalResult.error && signalResult.data) {
      const preview = signalResult.data.normalized_preview_json;
      const root = preview && typeof preview === "object" && !Array.isArray(preview)
        ? preview as Record<string, unknown> : {};
      const rawAnalysis = root.basicIntakeAnalysisV1;
      const analysis = rawAnalysis && typeof rawAnalysis === "object" && !Array.isArray(rawAnalysis)
        ? rawAnalysis as Record<string, unknown> : {};
      completedAnalysis = analysis.status === "completed";
      rawMeasurements = analysis.measurements;
      measurementCount = Array.isArray(analysis.measurements) ? analysis.measurements.length : null;
    }
    let profile: CommercialWorkEvidence["profile"] = null;
    let inspectedBindings: Awaited<ReturnType<typeof inspectCommercialFactRoutesP25>>["bindings"] | null = null;
    let profileFailureCode: string | null = null;
    try {
      const inspected = await inspectCommercialFactRoutesP25(activity.id);
      completedAnalysis = true; // P2.5 explicitly validated the completed analysis.
      inspectedBindings = inspected.bindings;
      profile = {
        bindings: inspected.bindings.length,
        preparedValues: inspected.bindings.filter(b => b.preparedValue !== null).length,
        valuesFromText: inspected.bindings.filter(b => b.preparedValue?.origin === "source_explicit").length,
        valuesFromTemplateDefaults: inspected.bindings.filter(b => b.preparedValue?.origin === "template_default").length,
        preliminaryLeafCandidates: inspected.bindings.filter(b => Boolean(b.selectedLeafValueObjectId || b.adminNominatedLeafId)).length,
        technicalRepresentativesProposed: inspected.bindings.filter(b => b.technicalRepresentative?.status === "proposed").length,
      };
    } catch (failure) {
      // Do not silently convert a failed profile inspection into a completed stage.
      const reason = failure instanceof Error ? failure.message : "P25_UNEXPECTED_FAILURE";
      profileFailureCode = reason.split(":", 1)[0].slice(0, 90);
    }
    let storedFacts: number | null = null;
    const factsResponse = await supabase.from("activity_object_facts")
      .select("id", { count: "exact", head: true })
      .eq("activity_event_id", activity.id).neq("fact_status", "deleted");
    if (!factsResponse.error && typeof factsResponse.count === "number") storedFacts = factsResponse.count;
    let automaticWriting: CommercialWorkEvidence["automaticWriting"] = "unknown";
    try {
      automaticWriting = (await readCommercialAutoFactSettingV1()).enabled ? "enabled" : "disabled";
    } catch { automaticWriting = "unknown"; }
    const workProgress = buildCommercialWorkProgressV1({
      analysisCompleted: completedAnalysis,
      extractedMeasurements: measurementCount,
      templateAssigned: Boolean(activity.activity_template_id),
      profile, profileFailureCode, storedFacts, automaticWriting,
    });
    const p25Evidence = buildCommercialP25EvidenceV1({
      completed: completedAnalysis, measurements: rawMeasurements,
      bindings: inspectedBindings, failureCode: profileFailureCode,
    });
    const diagnostic = explainCommercialFailureP2(activity.commercial_processing_status, activity.commercial_processing_error);
    const publicText = typeof activity.input_text === "string" ? activity.input_text : "";
    const label = typeof activity.title === "string" && activity.title.trim()
      ? activity.title.trim()
      : (publicText.slice(0, 180) || `Коммерческая активность ${id.slice(0, 8)}`);
    return NextResponse.json({
      ok: true, contract: CONTRACT,
      detail: {
        id: activity.id,
        title: label.slice(0, 200),
        publicText: publicText.slice(0, 3500),
        truncatedText: publicText.length > 3500,
        state: activity.commercial_processing_status ?? "unknown",
        createdAt: activity.created_at,
        stage: diagnostic.stage, problem: diagnostic.problem,
        suggestion: diagnostic.suggestion, reasonCode: diagnostic.code,
        messageId: message.id,
        workProgress,
        p25Evidence,
      },
      dbWritesPerformed: false, agentExecutionPerformed: false,
    }, { headers: HEADERS });
  } catch (cause) {
    console.error("ADM4B2_DETAIL_ERROR", cause instanceof Error ? cause.name : "unknown");
    return fail("ADM4B2_DETAIL_INTERNAL_ERROR", 500);
  }
}
