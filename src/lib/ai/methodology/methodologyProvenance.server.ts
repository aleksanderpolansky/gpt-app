import { supabase } from "../../../../lib/supabase";
import {
  AI_PROCESSING_INSTRUCTION_DEFINITIONS,
  type AiProcessingInstructionCode,
  type AiProcessingLocale,
} from "../processingInstructions.server";
import type {
  PublicMethodologyTrace,
  RuntimeMethodologyKnowledgeRef,
  RuntimeMethodologyRuleRef,
} from "./methodologyContext.server";

type JsonRecord = Record<string, unknown>;

type SystemInstructionSnapshot = {
  code: string;
  source: string;
  localeCode: string;
  revision: number | null;
  instructionText: string;
  revisionCreatedAt: string | null;
};

type ActorInstructionSnapshot = {
  source: string;
  sourceLocale: string | null;
  revision: number | null;
  instructionText: string | null;
  revisionCreatedAt: string | null;
};

type PersistResult = {
  inserted: boolean;
  disposition: "inserted" | "already_recorded";
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function asPositiveInteger(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function instructionDefinition(code: string) {
  return AI_PROCESSING_INSTRUCTION_DEFINITIONS.find(
    (definition) => definition.code === code,
  );
}

function parseRuleRefs(value: unknown): RuntimeMethodologyRuleRef[] {
  return asArray(value).map((item) => {
    const record = asRecord(item);

    if (!record) {
      throw new Error("P5B2B_METHODOLOGY_RULE_REF_INVALID");
    }

    const registryCode = asString(record.registryCode);
    const ruleCode = asString(record.ruleCode);
    const version =
      typeof record.version === "number" ||
      typeof record.version === "string" ||
      record.version === null
        ? record.version
        : null;

    if (!registryCode || !ruleCode) {
      throw new Error("P5B2B_METHODOLOGY_RULE_REF_INVALID");
    }

    return {
      registryCode,
      ruleCode,
      version,
    };
  });
}

function parseKnowledgeRefs(
  value: unknown,
): RuntimeMethodologyKnowledgeRef[] {
  return asArray(value).map((item) => {
    const record = asRecord(item);

    if (!record) {
      throw new Error("P5B2B_METHODOLOGY_KNOWLEDGE_REF_INVALID");
    }

    const packageCode = asString(record.packageCode);
    const version =
      typeof record.version === "number" ||
      typeof record.version === "string"
        ? record.version
        : null;

    if (!packageCode || version === null) {
      throw new Error("P5B2B_METHODOLOGY_KNOWLEDGE_REF_INVALID");
    }

    return {
      packageCode,
      version,
    };
  });
}

export function parseActivityMethodologyTraceP5b2(
  value: unknown,
): PublicMethodologyTrace {
  const trace = asRecord(value);

  if (!trace) {
    throw new Error("P5B2B_METHODOLOGY_TRACE_MISSING");
  }

  const protocol = asRecord(trace.protocol);
  const outputSchema = asRecord(trace.outputSchema);
  const traceSchema = asRecord(trace.traceSchema);
  const bindingVersion = asPositiveInteger(trace.bindingVersion);

  if (
    trace.runtimeCode !== "activity_semantic_preview" ||
    !bindingVersion ||
    !protocol ||
    !outputSchema ||
    !traceSchema
  ) {
    throw new Error("P5B2B_METHODOLOGY_TRACE_INVALID");
  }

  const protocolCode = asString(protocol.code);
  const protocolVersion = asPositiveInteger(protocol.version);
  const protocolSha = asString(protocol.sha256);

  const outputSchemaCode = asString(outputSchema.code);
  const outputSchemaVersion = asPositiveInteger(outputSchema.version);
  const outputSchemaSha = asString(outputSchema.sha256);

  const traceSchemaCode = asString(traceSchema.code);
  const traceSchemaVersion = asPositiveInteger(traceSchema.version);
  const traceSchemaSha = asString(traceSchema.sha256);

  if (
    !protocolCode ||
    !protocolVersion ||
    !protocolSha ||
    !outputSchemaCode ||
    !outputSchemaVersion ||
    !outputSchemaSha ||
    !traceSchemaCode ||
    !traceSchemaVersion ||
    !traceSchemaSha
  ) {
    throw new Error("P5B2B_METHODOLOGY_TRACE_VERSION_REF_INVALID");
  }

  const systemInstructions = asArray(trace.systemInstructions).map(
    (item) => {
      const instruction = asRecord(item);

      if (!instruction) {
        throw new Error(
          "P5B2B_METHODOLOGY_SYSTEM_INSTRUCTION_REF_INVALID",
        );
      }

      const code = asString(instruction.code);
      const source = asString(instruction.source);
      const localeCode = asString(instruction.localeCode);
      const revision =
        instruction.revision === null
          ? null
          : asPositiveInteger(instruction.revision);

      if (
        !code ||
        !source ||
        !localeCode ||
        (instruction.revision !== null && revision === null)
      ) {
        throw new Error(
          "P5B2B_METHODOLOGY_SYSTEM_INSTRUCTION_REF_INVALID",
        );
      }

      return {
        code,
        source,
        localeCode,
        revision,
      };
    },
  );

  let actorInstruction: PublicMethodologyTrace["actorInstruction"] = null;

  if (trace.actorInstruction !== null && trace.actorInstruction !== undefined) {
    const actor = asRecord(trace.actorInstruction);

    if (!actor) {
      throw new Error(
        "P5B2B_METHODOLOGY_ACTOR_INSTRUCTION_REF_INVALID",
      );
    }

    const source = asString(actor.source);
    const sourceLocale =
      actor.sourceLocale === null ? null : asString(actor.sourceLocale);
    const revision =
      actor.revision === null ? null : asPositiveInteger(actor.revision);

    if (
      !source ||
      (actor.sourceLocale !== null && !sourceLocale) ||
      (actor.revision !== null && revision === null)
    ) {
      throw new Error(
        "P5B2B_METHODOLOGY_ACTOR_INSTRUCTION_REF_INVALID",
      );
    }

    actorInstruction = {
      source,
      sourceLocale,
      revision,
    };
  }

  return {
    runtimeCode: "activity_semantic_preview",
    bindingVersion,
    protocol: {
      code: protocolCode,
      version: protocolVersion,
      sha256: protocolSha,
    },
    outputSchema: {
      code: outputSchemaCode,
      version: outputSchemaVersion,
      sha256: outputSchemaSha,
    },
    traceSchema: {
      code: traceSchemaCode,
      version: traceSchemaVersion,
      sha256: traceSchemaSha,
    },
    systemInstructions,
    actorInstruction,
    deterministicRules: parseRuleRefs(trace.deterministicRules),
    knowledgePackages: parseKnowledgeRefs(trace.knowledgePackages),
  };
}

async function resolveSystemInstructionSnapshot(
  item: PublicMethodologyTrace["systemInstructions"][number],
): Promise<SystemInstructionSnapshot> {
  const definition = instructionDefinition(item.code);

  if (!definition) {
    throw new Error(
      `P5B2B_SYSTEM_INSTRUCTION_CODE_UNKNOWN: ${item.code}`,
    );
  }

  if (item.source === "code_default") {
    if (item.revision !== null) {
      throw new Error(
        `P5B2B_CODE_DEFAULT_REVISION_INVALID: ${item.code}`,
      );
    }

    return {
      code: item.code,
      source: item.source,
      localeCode: item.localeCode,
      revision: null,
      instructionText: definition.defaultText,
      revisionCreatedAt: null,
    };
  }

  if (
    (item.source !== "db_locale" && item.source !== "db_global") ||
    item.revision === null
  ) {
    throw new Error(
      `P5B2B_SYSTEM_INSTRUCTION_SOURCE_INVALID: ${item.code}`,
    );
  }

  const { data, error } = await supabase
    .from("ai_processing_instruction_revisions")
    .select(
      "instruction_code,locale_code,revision,instruction_text,created_at",
    )
    .eq("instruction_code", item.code)
    .eq("locale_code", item.localeCode)
    .eq("revision", item.revision)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `P5B2B_SYSTEM_INSTRUCTION_REVISION_READ_FAILED: ${error.message}`,
    );
  }

  const row = asRecord(data);
  const instructionText = asString(row?.instruction_text);

  if (!row || !instructionText) {
    throw new Error(
      `P5B2B_SYSTEM_INSTRUCTION_REVISION_NOT_FOUND: ${item.code}@${item.revision}`,
    );
  }

  return {
    code: item.code,
    source: item.source,
    localeCode: item.localeCode,
    revision: item.revision,
    instructionText,
    revisionCreatedAt: asString(row.created_at),
  };
}

async function resolveActorInstructionSnapshot(params: {
  ownerUserId: string;
  ownerActorId: string;
  trace: PublicMethodologyTrace["actorInstruction"];
}): Promise<ActorInstructionSnapshot> {
  const item = params.trace;

  if (!item) {
    return {
      source: "none",
      sourceLocale: null,
      revision: null,
      instructionText: null,
      revisionCreatedAt: null,
    };
  }

  if (
    (item.source !== "personal_exact" &&
      item.source !== "personal_global") ||
    !item.sourceLocale ||
    item.revision === null
  ) {
    throw new Error("P5B2B_ACTOR_INSTRUCTION_SOURCE_INVALID");
  }

  const { data, error } = await supabase
    .from("actor_ai_processing_preference_revisions")
    .select(
      "owner_user_id,owner_actor_id,locale_code,revision,instruction_text,action_code,created_at",
    )
    .eq("owner_user_id", params.ownerUserId)
    .eq("owner_actor_id", params.ownerActorId)
    .eq("locale_code", item.sourceLocale)
    .eq("revision", item.revision)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `P5B2B_ACTOR_INSTRUCTION_REVISION_READ_FAILED: ${error.message}`,
    );
  }

  const row = asRecord(data);
  const instructionText = asString(row?.instruction_text);

  if (
    !row ||
    row.action_code !== "save_custom" ||
    !instructionText
  ) {
    throw new Error(
      `P5B2B_ACTOR_INSTRUCTION_REVISION_NOT_FOUND: ${item.sourceLocale}@${item.revision}`,
    );
  }

  return {
    source: item.source,
    sourceLocale: item.sourceLocale,
    revision: item.revision,
    instructionText,
    revisionCreatedAt: asString(row.created_at),
  };
}

export async function persistActivityAiProcessingProvenanceP5b2(params: {
  ownerUserId: string;
  ownerActorId: string;
  semanticEnrichmentRunId: string;
  aiUsageEventId: string | null;
  provider: string | null;
  modelName: string | null;
  methodologyTrace: unknown;
}): Promise<PersistResult> {
  const methodologyTrace = parseActivityMethodologyTraceP5b2(
    params.methodologyTrace,
  );

  const systemInstructionSnapshot = await Promise.all(
    methodologyTrace.systemInstructions.map((item) =>
      resolveSystemInstructionSnapshot(item),
    ),
  );

  const actorInstructionSnapshot =
    await resolveActorInstructionSnapshot({
      ownerUserId: params.ownerUserId,
      ownerActorId: params.ownerActorId,
      trace: methodologyTrace.actorInstruction,
    });

  const externalSourceSnapshot = methodologyTrace.knowledgePackages.map(
    (item) => ({
      sourceType: "knowledge_package",
      packageCode: item.packageCode,
      version: item.version,
    }),
  );

  const { error } = await supabase
    .from("activity_ai_processing_provenance")
    .insert({
      semantic_enrichment_run_id: params.semanticEnrichmentRunId,
      owner_user_id: params.ownerUserId,
      owner_actor_id: params.ownerActorId,
      ai_usage_event_id: params.aiUsageEventId,
      provider: params.provider,
      model_name: params.modelName,
      system_instruction_snapshot_json: systemInstructionSnapshot,
      actor_instruction_snapshot_json: actorInstructionSnapshot,
      external_source_snapshot_json: externalSourceSnapshot,
      inference_assumptions_json: [],
      methodology_trace_json: methodologyTrace,
    });

  if (!error) {
    return {
      inserted: true,
      disposition: "inserted",
    };
  }

  if (error.code === "23505") {
    return {
      inserted: false,
      disposition: "already_recorded",
    };
  }

  throw new Error(
    `P5B2B_PROCESSING_PROVENANCE_INSERT_FAILED: ${error.message}`,
  );
}
