import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../../lib/supabase";
import { ensureMissingTypicalActivityJourney } from "@/lib/reality-curator/journey-log.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ANALYSIS_CONTRACT = "ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1";
const REJECTION_CONTRACT = "ARCTOR_USER_TYPICAL_ACTIVITY_REJECTION_V1";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

type CandidateSnapshot = {
  templateId: string;
  title: string | null;
  shortTitle: string | null;
  templateGroup: string | null;
  confidence: number | null;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocale(value: unknown) {
  return value === "en" ||
    value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
    ? value
    : "en";
}

async function localizedTemplateTitle(templateId: string, locale: string) {
  const { data, error } = await supabase
    .from("activity_templates")
    .select("id,title,default_metadata_json")
    .eq("id", templateId)
    .maybeSingle();

  if (error || !data) return null;

  const metadata = asRecord(data.default_metadata_json);
  const curator = asRecord(metadata.curatorSystemMaterializationV1);
  const localizations = asRecord(curator.localizations);
  const requested = asRecord(localizations[locale]);
  const english = asRecord(localizations.en);
  return text(requested.title) || text(english.title) || text(data.title) || null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function candidates(value: unknown): CandidateSnapshot[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const row = asRecord(item);
      const templateId = text(row.templateId);
      if (!UUID_RE.test(templateId)) return null;

      return {
        templateId,
        title: text(row.title) || null,
        shortTitle: text(row.shortTitle) || null,
        templateGroup: text(row.templateGroup) || null,
        confidence: finiteNumber(row.confidence),
      };
    })
    .filter((item): item is CandidateSnapshot => item !== null);
}

export async function POST(request: Request) {
  const { appUser, errorResponse } = await getActivityUserContext();
  if (errorResponse) return errorResponse;
  if (!appUser) {
    return NextResponse.json(
      { ok: false, error: "User context not found" },
      { status: 500 },
    );
  }

  let body: JsonRecord;
  try {
    body = asRecord(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const activityEventId = text(body.activityEventId);
  const templateId = text(body.templateId);
  const locale = normalizeLocale(body.locale);

  if (!UUID_RE.test(activityEventId) || !UUID_RE.test(templateId)) {
    return NextResponse.json(
      { ok: false, error: "activityEventId and templateId must be UUIDs" },
      { status: 400 },
    );
  }

  const { data: signalData, error: signalError } = await supabase
    .from("raw_activity_signals")
    .select("id,output_event_id,normalized_preview_json")
    .eq("user_id", appUser.id)
    .eq("source_type", "manual_chat")
    .eq("output_event_id", activityEventId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (signalError) {
    return NextResponse.json(
      { ok: false, error: signalError.message },
      { status: 500 },
    );
  }

  if (!signalData) {
    return NextResponse.json(
      { ok: false, error: "Activity intake signal not found" },
      { status: 404 },
    );
  }

  const normalizedPreview = asRecord(signalData.normalized_preview_json);
  const analysis = asRecord(normalizedPreview.basicIntakeAnalysisV1);

  if (
    analysis.contract !== ANALYSIS_CONTRACT ||
    analysis.status !== "completed" ||
    text(analysis.activityEventId) !== activityEventId
  ) {
    return NextResponse.json(
      { ok: false, error: "Completed basic intake analysis not found" },
      { status: 409 },
    );
  }

  const candidateSnapshot = candidates(analysis.templateCandidates);
  const rejectedCandidate = candidateSnapshot.find(
    (candidate) => candidate.templateId === templateId,
  );

  if (!rejectedCandidate) {
    const existingRejection = asRecord(analysis.userTypicalActivityRejectionV1);
    if (
      text(existingRejection.contract) === REJECTION_CONTRACT &&
      text(existingRejection.rejectedTemplateId) === templateId
    ) {
      return NextResponse.json({
        ok: true,
        idempotentReplay: true,
        queuedForCurator: true,
        analysis,
      });
    }

    return NextResponse.json(
      { ok: false, error: "The selected typical activity is not an active candidate" },
      { status: 409 },
    );
  }

  const rejectedTitle =
    (await localizedTemplateTitle(rejectedCandidate.templateId, locale)) ||
    rejectedCandidate.title;
  const rejectedAt = new Date().toISOString();
  const nextAnalysis = {
    ...analysis,
    templateCandidates: [],
    noSuitableTypicalActivity: true,
    typicalActivitySearchStatus: "completed",
    fullAiAnalysisCompleted: true,
    retryable: false,
    automaticTemplateBinding: false,
    userTypicalActivityRejectionV1: {
      contract: REJECTION_CONTRACT,
      rejectedAt,
      rejectedTemplateId: rejectedCandidate.templateId,
      rejectedTemplateTitle: rejectedTitle,
      candidatesSnapshot: candidateSnapshot,
      activityEventId,
      rawSignalId: signalData.id,
      source: "user_explicit_rejection",
      disposition: "send_to_reality_curator",
      automaticTemplateBindingWasUsed: false,
    },
  };

  const nextNormalizedPreview = {
    ...normalizedPreview,
    basicIntakeAnalysisV1: nextAnalysis,
  };

  const { data: updated, error: updateError } = await supabase
    .from("raw_activity_signals")
    .update({
      normalized_preview_json: nextNormalizedPreview,
      updated_at: rejectedAt,
    })
    .eq("id", signalData.id)
    .eq("user_id", appUser.id)
    .select("id")
    .maybeSingle();

  if (updateError || !updated?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: updateError?.message ?? "Typical-activity rejection was not persisted",
      },
      { status: 500 },
    );
  }

  await ensureMissingTypicalActivityJourney({
    userId: appUser.id,
    rawSignalId: signalData.id,
    activityEventId,
    analysis: nextAnalysis,
    provenance: "user_explicit_typical_activity_rejection",
  }).catch((journeyError) => {
    console.error(
      "REALITY_CURATOR_REJECTED_MATCH_JOURNEY_ENSURE_FAILED",
      signalData.id,
      journeyError,
    );
  });

  return NextResponse.json({
    ok: true,
    idempotentReplay: false,
    queuedForCurator: true,
    detached: false,
    detachReason: "automatic_template_binding_is_disabled_in_basic_intake_v1",
    analysis: nextAnalysis,
  });
}
