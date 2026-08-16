import {
  AI_PROCESSING_INSTRUCTION_DEFINITIONS,
  immutableGuardForRuntime,
  normalizeAiProcessingLocale,
  readActorProcessingResolution,
  readSystemInstructionResolution,
  type AiProcessingLocale,
  type AiProcessingRuntime,
} from "./processingInstructions.server";
import {
  hashCanonicalJson,
  sha256Text,
} from "../../../lib/ai/contextManifest";

type JsonRecord = Record<string, unknown>;

const CONTEXT_PACK_VERSION = "ARCTOR_RUNTIME_CONTEXT_PACK_V1";
const MAX_SYSTEM_PROMPT_CHARS = 120_000;
const MAX_REQUEST_PAYLOAD_BYTES = 256_000;
const MAX_RETRIEVAL_SNAPSHOT_BYTES = 160_000;
const MAX_TOOL_PERMISSIONS = 32;
const MAX_EMBEDDED_INSTRUCTION_REFS = 32;
const MAX_CANDIDATES_PER_ARRAY = 20;

export type RuntimeContextDataUseSnapshotV1 = {
  readonly purposeCodes: readonly ["service_delivery"];
  readonly trainingAllowed: false;
  readonly researchAllowed: false;
  readonly exportAllowed: false;
  readonly source: "runtime_default_until_ai_a4";
};

export type RuntimeContextCompilerInputV1 = {
  readonly appUserId: string;
  readonly actorId: string;
  readonly runtimeCode: AiProcessingRuntime;
  readonly locale: unknown;
  readonly timeZone: string;
  readonly stageCode: string;
  readonly stageSequence: number;
  readonly protocolCode: string;
  readonly protocolVersion: string;
  readonly schemaName: string;
  readonly schemaVersion?: string | null;
  readonly schema: Record<string, unknown>;
  readonly provider: string;
  readonly modelName: string;
  readonly modelTier?: string | null;
  readonly storeProviderState: boolean;
  readonly maxRetries: number;
  readonly maxOutputTokens?: number | null;
  readonly modelConfig?: JsonRecord;
  readonly embeddedSystemPrompt: string;
  readonly requestPayload: unknown;
  readonly retrievalSnapshot?: JsonRecord;
  readonly embeddedInstructionRefs?: readonly unknown[];
  readonly toolPermissions?: readonly unknown[];
  readonly contextMetadata?: JsonRecord;
};

export type RuntimeContextPackV1 = {
  readonly version: typeof CONTEXT_PACK_VERSION;
  readonly systemPrompt: string;
  readonly requestPayload: unknown;
  readonly instructionRefs: unknown[];
  readonly retrievalSnapshot: JsonRecord;
  readonly toolPermissions: unknown[];
  readonly contextMetadata: JsonRecord;
  readonly protocolHash: string;
  readonly schemaHash: string;
  readonly systemPromptHash: string;
  readonly requestPayloadHash: string;
  readonly retrievalSnapshotHash: string;
  readonly toolPermissionsHash: string;
  readonly instructionRefsHash: string;
  readonly actorBindingHash: string;
  readonly contextPackHash: string;
  readonly dataUse: RuntimeContextDataUseSnapshotV1;
  readonly localeCode: AiProcessingLocale;
  readonly timeZone: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function ensureText(value: string, code: string, maxLength: number): string {
  const normalized = value.replace(/\u0000/g, "").trim();
  if (!normalized) {
    throw new Error(`${code}_REQUIRED`);
  }
  if (normalized.length > maxLength) {
    throw new Error(`${code}_TOO_LONG`);
  }
  return normalized;
}

function ensureTimeZone(value: string): string {
  const normalized = ensureText(value, "RUNTIME_CONTEXT_TIME_ZONE", 120);
  try {
    new Intl.DateTimeFormat("en", { timeZone: normalized }).format(new Date());
    return normalized;
  } catch {
    throw new Error("RUNTIME_CONTEXT_TIME_ZONE_INVALID");
  }
}

function canonicalByteLength(value: unknown): number {
  const serialized = JSON.stringify(value) ?? "null";
  return new TextEncoder().encode(serialized).byteLength;
}

function assertBoundedCandidateArrays(value: unknown, path = "retrievalSnapshot"): void {
  if (Array.isArray(value)) {
    if (path.toLowerCase().endsWith("candidates") && value.length > MAX_CANDIDATES_PER_ARRAY) {
      throw new Error(
        `RUNTIME_CONTEXT_CANDIDATE_ARRAY_TOO_LARGE:${path}:${value.length}`,
      );
    }
    value.forEach((entry, index) =>
      assertBoundedCandidateArrays(entry, `${path}[${index}]`),
    );
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    assertBoundedCandidateArrays(entry, `${path}.${key}`);
  }
}

function buildSystemInstructionRef(input: {
  code: string;
  source: string;
  localeCode: string;
  instructionSetId: string | null;
  revision: number | null;
  updatedAt: string | null;
  text: string;
}) {
  return {
    kind: "system_processing_instruction",
    code: input.code,
    source: input.source,
    localeCode: input.localeCode,
    instructionSetId: input.instructionSetId,
    revision: input.revision,
    updatedAt: input.updatedAt,
    textHash: sha256Text(input.text),
  };
}

function buildActorInstructionRef(input: {
  source: string;
  sourceLocale: string | null;
  preferenceId: string | null;
  revision: number | null;
  updatedAt: string | null;
  text: string;
}) {
  return {
    kind: "actor_processing_instruction",
    trust: "untrusted_user_guidance",
    source: input.source,
    sourceLocale: input.sourceLocale,
    preferenceId: input.preferenceId,
    revision: input.revision,
    updatedAt: input.updatedAt,
    textHash: sha256Text(input.text),
  };
}

function withRuntimeEnvelope(input: {
  requestPayload: unknown;
  localeCode: AiProcessingLocale;
  timeZone: string;
  actorInstructionText: string | null;
  dataUse: RuntimeContextDataUseSnapshotV1;
}) {
  const runtimeEnvelope = {
    version: CONTEXT_PACK_VERSION,
    localeCode: input.localeCode,
    timeZone: input.timeZone,
    dataUse: input.dataUse,
    actorGuidance: input.actorInstructionText
      ? {
          trust: "untrusted_user_guidance",
          text: input.actorInstructionText,
        }
      : null,
  };

  return isRecord(input.requestPayload)
    ? {
        ...input.requestPayload,
        __arctorRuntimeContext: runtimeEnvelope,
      }
    : {
        task: input.requestPayload,
        __arctorRuntimeContext: runtimeEnvelope,
      };
}

export async function compileRuntimeContextPackV1(
  input: RuntimeContextCompilerInputV1,
): Promise<RuntimeContextPackV1> {
  const appUserId = ensureText(input.appUserId, "RUNTIME_CONTEXT_APP_USER_ID", 120);
  const actorId = ensureText(input.actorId, "RUNTIME_CONTEXT_ACTOR_ID", 120);
  const stageCode = ensureText(input.stageCode, "RUNTIME_CONTEXT_STAGE_CODE", 100);
  const protocolCode = ensureText(input.protocolCode, "RUNTIME_CONTEXT_PROTOCOL_CODE", 120);
  const protocolVersion = ensureText(
    input.protocolVersion,
    "RUNTIME_CONTEXT_PROTOCOL_VERSION",
    120,
  );
  const schemaName = ensureText(input.schemaName, "RUNTIME_CONTEXT_SCHEMA_NAME", 120);
  const embeddedSystemPrompt = ensureText(
    input.embeddedSystemPrompt,
    "RUNTIME_CONTEXT_EMBEDDED_SYSTEM_PROMPT",
    80_000,
  );
  const timeZone = ensureTimeZone(input.timeZone);
  const localeCode = normalizeAiProcessingLocale(input.locale);

  if (!Number.isInteger(input.stageSequence) || input.stageSequence < 1) {
    throw new Error("RUNTIME_CONTEXT_STAGE_SEQUENCE_INVALID");
  }
  if (!Number.isInteger(input.maxRetries) || input.maxRetries < 0) {
    throw new Error("RUNTIME_CONTEXT_MAX_RETRIES_INVALID");
  }
  if (
    input.maxOutputTokens !== null &&
    input.maxOutputTokens !== undefined &&
    (!Number.isInteger(input.maxOutputTokens) || input.maxOutputTokens < 0)
  ) {
    throw new Error("RUNTIME_CONTEXT_MAX_OUTPUT_TOKENS_INVALID");
  }

  const embeddedInstructionRefs = [...(input.embeddedInstructionRefs ?? [])];
  if (embeddedInstructionRefs.length > MAX_EMBEDDED_INSTRUCTION_REFS) {
    throw new Error("RUNTIME_CONTEXT_EMBEDDED_INSTRUCTION_REFS_TOO_MANY");
  }

  const toolPermissions = [...(input.toolPermissions ?? [])];
  if (toolPermissions.length > MAX_TOOL_PERMISSIONS) {
    throw new Error("RUNTIME_CONTEXT_TOOL_PERMISSIONS_TOO_MANY");
  }

  const retrievalSnapshot = input.retrievalSnapshot ?? {};
  assertBoundedCandidateArrays(retrievalSnapshot);
  if (canonicalByteLength(retrievalSnapshot) > MAX_RETRIEVAL_SNAPSHOT_BYTES) {
    throw new Error("RUNTIME_CONTEXT_RETRIEVAL_SNAPSHOT_TOO_LARGE");
  }

  const runtimeDefinitions = AI_PROCESSING_INSTRUCTION_DEFINITIONS.filter(
    (definition) => definition.runtimeTargets.some((runtimeCode) => runtimeCode === input.runtimeCode),
  );
  const systemInstructions = await Promise.all(
    runtimeDefinitions.map((definition) =>
      readSystemInstructionResolution(definition.code, localeCode),
    ),
  );
  const actorInstruction = await readActorProcessingResolution({
    ownerUserId: appUserId,
    ownerActorId: actorId,
    localeCode,
  });

  const immutableGuard = immutableGuardForRuntime(input.runtimeCode);
  const systemPrompt = [
    immutableGuard,
    ...systemInstructions.map(
      (instruction) => `[${instruction.code}] ${instruction.text}`,
    ),
    `[embedded:${stageCode}] ${embeddedSystemPrompt}`,
  ].join("\n\n");

  if (systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS) {
    throw new Error("RUNTIME_CONTEXT_SYSTEM_PROMPT_TOO_LARGE");
  }

  const dataUse: RuntimeContextDataUseSnapshotV1 = {
    purposeCodes: ["service_delivery"],
    trainingAllowed: false,
    researchAllowed: false,
    exportAllowed: false,
    source: "runtime_default_until_ai_a4",
  };

  const requestPayload = withRuntimeEnvelope({
    requestPayload: input.requestPayload,
    localeCode,
    timeZone,
    actorInstructionText: actorInstruction.text,
    dataUse,
  });

  if (canonicalByteLength(requestPayload) > MAX_REQUEST_PAYLOAD_BYTES) {
    throw new Error("RUNTIME_CONTEXT_REQUEST_PAYLOAD_TOO_LARGE");
  }

  const systemInstructionRefs = systemInstructions.map(buildSystemInstructionRef);
  const actorInstructionRefs = actorInstruction.text
    ? [
        buildActorInstructionRef({
          source: actorInstruction.source,
          sourceLocale: actorInstruction.sourceLocale,
          preferenceId: actorInstruction.preferenceId,
          revision: actorInstruction.revision,
          updatedAt: actorInstruction.updatedAt,
          text: actorInstruction.text,
        }),
      ]
    : [];
  const instructionRefs = [
    ...embeddedInstructionRefs,
    ...systemInstructionRefs,
    ...actorInstructionRefs,
  ];

  const schemaHash = hashCanonicalJson(input.schema);
  const systemPromptHash = sha256Text(systemPrompt);
  const requestPayloadHash = hashCanonicalJson(requestPayload);
  const retrievalSnapshotHash = hashCanonicalJson(retrievalSnapshot);
  const toolPermissionsHash = hashCanonicalJson(toolPermissions);
  const instructionRefsHash = hashCanonicalJson(instructionRefs);
  const actorBindingHash = hashCanonicalJson({ appUserId, actorId });
  const protocolHash = hashCanonicalJson({
    stageCode,
    stageSequence: input.stageSequence,
    protocolCode,
    protocolVersion,
    embeddedSystemPromptHash: sha256Text(embeddedSystemPrompt),
    schemaName,
    schemaVersion: input.schemaVersion ?? null,
    schemaHash,
  });
  const contextPackHash = hashCanonicalJson({
    version: CONTEXT_PACK_VERSION,
    runtimeCode: input.runtimeCode,
    localeCode,
    timeZone,
    stageCode,
    stageSequence: input.stageSequence,
    protocolCode,
    protocolVersion,
    protocolHash,
    schemaName,
    schemaVersion: input.schemaVersion ?? null,
    schemaHash,
    systemPromptHash,
    requestPayloadHash,
    retrievalSnapshotHash,
    toolPermissionsHash,
    instructionRefsHash,
    actorBindingHash,
    provider: input.provider,
    modelName: input.modelName,
    modelTier: input.modelTier ?? null,
    storeProviderState: input.storeProviderState,
    maxRetries: input.maxRetries,
    maxOutputTokens: input.maxOutputTokens ?? null,
    modelConfig: input.modelConfig ?? {},
    dataUse,
  });

  return {
    version: CONTEXT_PACK_VERSION,
    systemPrompt,
    requestPayload,
    instructionRefs,
    retrievalSnapshot,
    toolPermissions,
    contextMetadata: {
      ...(input.contextMetadata ?? {}),
      operationalInstructionLayerApplied: true,
      rawInputPersistedInManifest: false,
      runtimeContextCompiler: {
        version: CONTEXT_PACK_VERSION,
        contextPackHash,
        protocolHash,
        schemaHash,
        systemPromptHash,
        requestPayloadHash,
        retrievalSnapshotHash,
        toolPermissionsHash,
        instructionRefsHash,
        actorBindingHash,
        runtimeCode: input.runtimeCode,
        localeCode,
        timeZone,
        systemInstructionCount: systemInstructions.length,
        actorInstructionApplied: Boolean(actorInstruction.text),
        actorInstructionTrust: "untrusted_user_guidance",
        dataUse,
      },
    },
    protocolHash,
    schemaHash,
    systemPromptHash,
    requestPayloadHash,
    retrievalSnapshotHash,
    toolPermissionsHash,
    instructionRefsHash,
    actorBindingHash,
    contextPackHash,
    dataUse,
    localeCode,
    timeZone,
  };
}
