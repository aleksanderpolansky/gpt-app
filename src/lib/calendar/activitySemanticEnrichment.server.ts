import { supabase } from "../../../lib/supabase";
import {
  normalizeCalendarAiRuleLocale,
  readEffectiveCalendarAiRules,
} from "@/lib/calendar/aiInterpretationRules.server";
import {
  persistActivityAiProcessingProvenanceP5b2,
} from "@/lib/ai/methodology/methodologyProvenance.server";

type JsonRecord = Record<string, unknown>;

type EnrichmentRunRpcPayload = {
  ok?: boolean;
  disposition?: string;
  claimed?: boolean;
  run?: JsonRecord;
};

type Cux4RunStatus =
  | "pending"
  | "processing"
  | "processed"
  | "needs_clarification"
  | "failed"
  | "cancelled";

export type ActivitySemanticEnrichmentRunCreateResultCux4 = {
  runId: string;
  status: Cux4RunStatus;
  disposition: string | null;
};

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeRunStatus(value: unknown): Cux4RunStatus {
  return value === "pending" ||
    value === "processing" ||
    value === "processed" ||
    value === "needs_clarification" ||
    value === "failed" ||
    value === "cancelled"
    ? value
    : "pending";
}

function normalizeRpcPayload(value: unknown): EnrichmentRunRpcPayload {
  const payload = asRecord(value);

  return {
    ok: payload.ok === true,
    disposition: asString(payload.disposition) ?? undefined,
    claimed:
      typeof payload.claimed === "boolean"
        ? payload.claimed
        : undefined,
    run: asRecord(payload.run),
  };
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  return {
    message: "Unknown CUX4 semantic enrichment error.",
  };
}

export async function createActivitySemanticEnrichmentRunCux4(params: {
  ownerUserId: string;
  ownerActorId: string;
  activityEventId: string;
  requestKey: string;
  sourceLocale: string;
  sourceText: string;
  protectedFieldCodes: string[];
  inputSnapshot: JsonRecord;
}): Promise<ActivitySemanticEnrichmentRunCreateResultCux4> {
  const sourceText = params.sourceText.trim().slice(0, 4000);

  if (!sourceText) {
    throw new Error("CUX4 source text is required.");
  }

  const { data, error } = await supabase.rpc(
    "create_activity_semantic_enrichment_run_cux4_v1",
    {
      p_owner_user_id: params.ownerUserId,
      p_owner_actor_id: params.ownerActorId,
      p_activity_event_id: params.activityEventId,
      p_request_key: params.requestKey.slice(0, 200),
      p_source_locale: normalizeCalendarAiRuleLocale(
        params.sourceLocale,
      ),
      p_source_text: sourceText,
      p_requested_fields_json: {
        activityTitle: true,
        schedule: true,
        categories: true,
        valueObjectCandidates: true,
        factPreviews: true,
      },
      p_protected_field_codes: params.protectedFieldCodes,
      p_input_snapshot_json: params.inputSnapshot,
    },
  );

  if (error) {
    throw new Error(
      `CUX4_CREATE_RUN_FAILED: ${error.message}`,
    );
  }

  const payload = normalizeRpcPayload(data);
  const runId = asString(payload.run?.id);

  if (!payload.ok || !runId) {
    throw new Error(
      "CUX4_CREATE_RUN_INVALID_RESPONSE",
    );
  }

  return {
    runId,
    status: normalizeRunStatus(payload.run?.status),
    disposition: payload.disposition ?? null,
  };
}

async function claimActivitySemanticEnrichmentRunRpcCux4(params: {
  ownerUserId: string;
  ownerActorId: string;
  runId: string;
}) {
  const { data, error } = await supabase.rpc(
    "claim_activity_semantic_enrichment_run_cux4_v1",
    {
      p_owner_user_id: params.ownerUserId,
      p_owner_actor_id: params.ownerActorId,
      p_run_id: params.runId,
    },
  );

  if (error) {
    throw new Error(
      `CUX4_CLAIM_RUN_FAILED: ${error.message}`,
    );
  }

  return normalizeRpcPayload(data);
}

export async function claimActivitySemanticEnrichmentRunCux4(params: {
  ownerUserId: string;
  ownerActorId: string;
  runId: string;
}) {
  const claim = await claimActivitySemanticEnrichmentRunRpcCux4(params);

  return {
    claimed: claim.claimed === true,
    status: normalizeRunStatus(claim.run?.status),
    disposition: claim.disposition ?? null,
  };
}

async function finishActivitySemanticEnrichmentRunCux4(params: {
  ownerUserId: string;
  ownerActorId: string;
  runId: string;
  finalStatus: "processed" | "needs_clarification" | "failed";
  resultJson?: JsonRecord | null;
  errorJson?: JsonRecord | null;
}) {
  const { data, error } = await supabase.rpc(
    "finish_activity_semantic_enrichment_run_cux4_v1",
    {
      p_owner_user_id: params.ownerUserId,
      p_owner_actor_id: params.ownerActorId,
      p_run_id: params.runId,
      p_final_status: params.finalStatus,
      p_result_json: params.resultJson ?? null,
      p_error_json: params.errorJson ?? null,
    },
  );

  if (error) {
    throw new Error(
      `CUX4_FINISH_RUN_FAILED: ${error.message}`,
    );
  }

  return normalizeRpcPayload(data);
}

function getClarificationCount(payload: JsonRecord) {
  const counters = asRecord(payload.counters);
  const missing = asNumber(counters.missing) ?? 0;
  const fields = Array.isArray(payload.fields)
    ? payload.fields
    : [];
  const missingFields = fields.filter((field) => {
    return asString(asRecord(field).status) === "missing";
  }).length;

  return Math.max(missing, missingFields);
}

export async function processActivitySemanticEnrichmentRunCux4(
  params: {
    ownerUserId: string;
    ownerActorId: string;
    runId: string;
    previewUrl: string;
    sourceLocale: string;
    sourceText: string;
    alreadyClaimed?: boolean;
  },
) {
  try {
    if (params.alreadyClaimed !== true) {
      const claim = await claimActivitySemanticEnrichmentRunCux4({
        ownerUserId: params.ownerUserId,
        ownerActorId: params.ownerActorId,
        runId: params.runId,
      });

      if (claim.claimed !== true) {
        return;
      }
    }

    const locale = normalizeCalendarAiRuleLocale(
      params.sourceLocale,
    );
    const rules = await readEffectiveCalendarAiRules(
      params.ownerUserId,
      locale,
    );
    const response = await fetch(params.previewUrl, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        text: params.sourceText,
        locale,
        source: "calendar_cux4_background",
        mode: "preview_only",
        temporalDirection: "future",
        write: false,
        testRule: true,
        personalRulesOverride: rules.effectiveText,
      }),
    });
    const payload = asRecord(
      await response.json().catch(() => null),
    );

    if (!response.ok || payload.ok !== true) {
      throw new Error(
        asString(payload.error) ??
          `CUX4 semantic preview failed: ${response.status}`,
      );
    }

    const provenance = await persistActivityAiProcessingProvenanceP5b2({
      ownerUserId: params.ownerUserId,
      ownerActorId: params.ownerActorId,
      semanticEnrichmentRunId: params.runId,
      aiUsageEventId: null,
      provider: payload.modelBacked === true ? "openai" : null,
      modelName: asString(payload.modelName),
      methodologyTrace: payload.methodologyTrace,
    });

    const resultJson: JsonRecord = {
      ...payload,
      cux4: {
        mode: "background_required_activity_container",
        rulesSource: rules.source,
        rulesLocale: rules.locale,
        rulesFallbackLocale: rules.fallbackLocale,
        rulesVersion: rules.ruleVersion,
        processingProvenanceDisposition: provenance.disposition,
      },
    };
    const finalStatus =
      getClarificationCount(payload) > 0
        ? "needs_clarification"
        : "processed";

    await finishActivitySemanticEnrichmentRunCux4({
      ownerUserId: params.ownerUserId,
      ownerActorId: params.ownerActorId,
      runId: params.runId,
      finalStatus,
      resultJson,
    });
  } catch (error) {
    try {
      await finishActivitySemanticEnrichmentRunCux4({
        ownerUserId: params.ownerUserId,
        ownerActorId: params.ownerActorId,
        runId: params.runId,
        finalStatus: "failed",
        errorJson: normalizeError(error),
      });
    } catch {
      // The canonical activity already exists. A secondary finish failure
      // must not create an unhandled background rejection.
    }
  }
}
