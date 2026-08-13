import { createHash } from "node:crypto";

import { supabase } from "../supabase";

type JsonRecord = Record<string, unknown>;

type AiAnalysisExecutionCreateInput = {
  appUserId: string;
  actorId?: string | null;
  externalOperationId?: string | null;
  surfaceCode: string;
  operationKind: string;
  localeCode?: string | null;
  timeZone?: string | null;
  inputText: string;
  metadata?: JsonRecord;
};

type AiContextManifestCreateInput = {
  analysisExecutionId: string;
  stageCode: string;
  stageSequence: number;
  aiUsageEventId?: string | null;
  protocolCode: string;
  protocolVersion: string;
  schemaName: string;
  schemaVersion?: string | null;
  schema: Record<string, unknown>;
  systemPrompt: string;
  requestPayload: unknown;
  provider: string;
  modelName: string;
  modelTier?: string | null;
  storeProviderState: boolean;
  maxRetries: number;
  maxOutputTokens?: number | null;
  instructionRefs?: unknown[];
  retrievalSnapshot?: JsonRecord;
  toolPermissions?: unknown[];
  modelConfig?: JsonRecord;
  contextMetadata?: JsonRecord;
};

function normalizeForHash(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      return null;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeForHash);
  }

  return Object.fromEntries(
    Object.entries(value as JsonRecord)
      .filter(([, entryValue]) => typeof entryValue !== "undefined")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, normalizeForHash(entryValue)]),
  );
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashCanonicalJson(value: unknown): string {
  return sha256Text(JSON.stringify(normalizeForHash(value)));
}

function codeCommitSha() {
  const value =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim().toLowerCase() ||
    process.env.GIT_COMMIT_SHA?.trim().toLowerCase() ||
    "";

  return /^[0-9a-f]{7,64}$/.test(value) ? value : null;
}

function failureCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code.trim();
    if (code) {
      return code.slice(0, 120);
    }
  }

  if (error instanceof Error && error.name.trim()) {
    return error.name.trim().slice(0, 120);
  }

  return "AI_ANALYSIS_FAILED";
}

export async function createAiAnalysisExecution(
  input: AiAnalysisExecutionCreateInput,
) {
  const { data, error } = await supabase
    .from("ai_analysis_executions")
    .insert({
      app_user_id: input.appUserId,
      actor_id: input.actorId || null,
      external_operation_id: input.externalOperationId || null,
      surface_code: input.surfaceCode,
      operation_kind: input.operationKind,
      locale_code: input.localeCode || null,
      time_zone: input.timeZone || null,
      input_hash: sha256Text(input.inputText),
      status: "started",
      metadata_json: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(
      `AI_CONTEXT_EXECUTION_CREATE_FAILED: ${error?.message ?? "missing id"}`,
    );
  }

  return data.id as string;
}

export async function completeAiAnalysisExecution(executionId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("ai_analysis_executions")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
      error_code: null,
      error_message: null,
    })
    .eq("id", executionId);

  if (error) {
    throw new Error(`AI_CONTEXT_EXECUTION_COMPLETE_FAILED: ${error.message}`);
  }
}

export async function failAiAnalysisExecution(
  executionId: string,
  errorValue: unknown,
) {
  const now = new Date().toISOString();
  const safeCode = failureCode(errorValue);

  await supabase
    .from("ai_analysis_executions")
    .update({
      status: "failed",
      completed_at: now,
      updated_at: now,
      error_code: safeCode,
      error_message: safeCode,
    })
    .eq("id", executionId);
}

export async function createAiContextManifest(
  input: AiContextManifestCreateInput,
) {
  const requestHash = hashCanonicalJson({
    systemPrompt: input.systemPrompt,
    requestPayload: input.requestPayload,
    schemaName: input.schemaName,
    schemaVersion: input.schemaVersion ?? null,
    schema: input.schema,
    provider: input.provider,
    modelName: input.modelName,
    modelTier: input.modelTier ?? null,
    storeProviderState: input.storeProviderState,
    maxRetries: input.maxRetries,
    maxOutputTokens: input.maxOutputTokens ?? null,
  });

  const { data, error } = await supabase
    .from("ai_context_manifests")
    .insert({
      analysis_execution_id: input.analysisExecutionId,
      stage_code: input.stageCode,
      stage_sequence: input.stageSequence,
      ai_usage_event_id: input.aiUsageEventId || null,
      manifest_version: 1,
      protocol_code: input.protocolCode,
      protocol_version: input.protocolVersion,
      code_commit_sha: codeCommitSha(),
      schema_name: input.schemaName,
      schema_version: input.schemaVersion || null,
      schema_hash: hashCanonicalJson(input.schema),
      system_prompt_hash: sha256Text(input.systemPrompt),
      request_hash: requestHash,
      response_hash: null,
      provider: input.provider,
      model_name: input.modelName,
      model_tier: input.modelTier || null,
      store_provider_state: input.storeProviderState,
      max_retries: input.maxRetries,
      max_output_tokens: input.maxOutputTokens ?? null,
      instruction_refs_json: input.instructionRefs ?? [],
      retrieval_snapshot_json: input.retrievalSnapshot ?? {},
      tool_permissions_json: input.toolPermissions ?? [],
      model_config_json: input.modelConfig ?? {},
      validator_result_json: {},
      context_metadata_json: {
        hashContract: "sha256_canonical_json_v1",
        ...(input.contextMetadata ?? {}),
      },
      status: "prepared",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(
      `AI_CONTEXT_MANIFEST_CREATE_FAILED: ${error?.message ?? "missing id"}`,
    );
  }

  return data.id as string;
}

export async function markAiContextManifestProviderCompleted(
  manifestId: string,
  responseText: string,
) {
  const { error } = await supabase
    .from("ai_context_manifests")
    .update({
      response_hash: sha256Text(responseText),
      status: "provider_completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", manifestId);

  if (error) {
    throw new Error(`AI_CONTEXT_MANIFEST_PROVIDER_UPDATE_FAILED: ${error.message}`);
  }
}

export async function markAiContextManifestValidated(
  manifestId: string,
  validatorResult: JsonRecord,
) {
  const { error } = await supabase
    .from("ai_context_manifests")
    .update({
      validator_result_json: validatorResult,
      status: "validated",
      updated_at: new Date().toISOString(),
    })
    .eq("id", manifestId);

  if (error) {
    throw new Error(`AI_CONTEXT_MANIFEST_VALIDATE_UPDATE_FAILED: ${error.message}`);
  }
}

export async function markAiContextManifestFailed(
  manifestId: string,
  errorValue: unknown,
) {
  const safeCode = failureCode(errorValue);

  await supabase
    .from("ai_context_manifests")
    .update({
      validator_result_json: {
        passed: false,
        failureCode: safeCode,
      },
      status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", manifestId);
}
