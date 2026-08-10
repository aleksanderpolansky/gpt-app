import {
  resolveCurrentActorAiProcessingContext,
  type AiProcessingLocale,
} from "../processingInstructions.server";
import {
  getRuntimeMethodologyBinding,
  type MethodologyRuntimeCode,
} from "./methodologyRegistry";
import { ARCTOR_AI_RUNTIME_CORE_RUNTIME_INSTRUCTION_V1 } from "./coreProtocolRuntime";

export type RuntimeMethodologyRuleRef = {
  readonly registryCode: string;
  readonly ruleCode: string;
  readonly version: number | string | null;
};

export type RuntimeMethodologyKnowledgeRef = {
  readonly packageCode: string;
  readonly version: number | string;
};

export type PublicMethodologyTrace = {
  readonly runtimeCode: MethodologyRuntimeCode;
  readonly bindingVersion: number;
  readonly protocol: {
    readonly code: string;
    readonly version: number;
    readonly sha256: string;
  };
  readonly outputSchema: {
    readonly code: string;
    readonly version: number;
    readonly sha256: string;
  };
  readonly traceSchema: {
    readonly code: string;
    readonly version: number;
    readonly sha256: string;
  };
  readonly systemInstructions: readonly {
    readonly code: string;
    readonly source: string;
    readonly localeCode: string;
    readonly revision: number | null;
  }[];
  readonly actorInstruction: {
    readonly source: string;
    readonly sourceLocale: string | null;
    readonly revision: number | null;
  } | null;
  readonly deterministicRules: readonly RuntimeMethodologyRuleRef[];
  readonly knowledgePackages: readonly RuntimeMethodologyKnowledgeRef[];
};

export type RuntimeMethodologyContext = {
  readonly runtimeCode: MethodologyRuntimeCode;
  readonly requestedLocale: AiProcessingLocale;
  readonly systemPrompt: string;
  readonly actorInstructionText: string | null;
  readonly processingInstructionContext: {
    readonly runtimeCode: string;
    readonly requestedLocale: string;
    readonly systemInstructions: readonly {
      readonly code: string;
      readonly source: string;
      readonly localeCode: string;
      readonly revision: number | null;
    }[];
    readonly actorInstruction: {
      readonly source: string;
      readonly sourceLocale: string | null;
      readonly revision: number | null;
    } | null;
  };
  readonly methodologyTrace: PublicMethodologyTrace;
};

function assertDeclaredRuleRegistries(
  allowedRegistryCodes: readonly string[],
  rules: readonly RuntimeMethodologyRuleRef[],
) {
  for (const rule of rules) {
    if (!allowedRegistryCodes.includes(rule.registryCode)) {
      throw new Error(
        `AI_METHODOLOGY_RULE_REGISTRY_NOT_BOUND: ${rule.registryCode}`,
      );
    }
  }
}

function assertDeclaredKnowledgePackages(
  allowedPackageCodes: readonly string[],
  packages: readonly RuntimeMethodologyKnowledgeRef[],
) {
  for (const item of packages) {
    if (!allowedPackageCodes.includes(item.packageCode)) {
      throw new Error(
        `AI_METHODOLOGY_KNOWLEDGE_PACKAGE_NOT_BOUND: ${item.packageCode}`,
      );
    }
  }
}

export async function resolveRuntimeMethodologyContext(params: {
  runtimeCode: MethodologyRuntimeCode;
  locale?: unknown;
  deterministicRules?: readonly RuntimeMethodologyRuleRef[];
  knowledgePackages?: readonly RuntimeMethodologyKnowledgeRef[];
}): Promise<RuntimeMethodologyContext> {
  const binding = getRuntimeMethodologyBinding(params.runtimeCode);
  const deterministicRules = params.deterministicRules ?? [];
  const knowledgePackages = params.knowledgePackages ?? [];

  assertDeclaredRuleRegistries(
    binding.deterministicRuleRegistryCodes,
    deterministicRules,
  );
  assertDeclaredKnowledgePackages(
    binding.knowledgePackageCodes,
    knowledgePackages,
  );

  const processingContext = await resolveCurrentActorAiProcessingContext({
    runtimeCode: params.runtimeCode,
    locale: params.locale,
  });

  const methodologyTrace: PublicMethodologyTrace = {
    runtimeCode: binding.runtimeCode,
    bindingVersion: binding.bindingVersion,
    protocol: {
      code: binding.protocol.code,
      version: binding.protocol.version,
      sha256: binding.protocol.sha256,
    },
    outputSchema: {
      code: binding.outputSchema.code,
      version: binding.outputSchema.version,
      sha256: binding.outputSchema.sha256,
    },
    traceSchema: {
      code: binding.traceSchema.code,
      version: binding.traceSchema.version,
      sha256: binding.traceSchema.sha256,
    },
    systemInstructions:
      processingContext.publicMetadata.systemInstructions.map((instruction) => ({
        code: instruction.code,
        source: instruction.source,
        localeCode: instruction.localeCode,
        revision: instruction.revision,
      })),
    actorInstruction: processingContext.publicMetadata.actorInstruction
      ? {
          source: processingContext.publicMetadata.actorInstruction.source,
          sourceLocale:
            processingContext.publicMetadata.actorInstruction.sourceLocale,
          revision:
            processingContext.publicMetadata.actorInstruction.revision,
        }
      : null,
    deterministicRules,
    knowledgePackages,
  };

  const systemPrompt = [
    `[CORE_PROTOCOL ${binding.protocol.code}@${binding.protocol.version} sha256=${binding.protocol.sha256}]`,
    ARCTOR_AI_RUNTIME_CORE_RUNTIME_INSTRUCTION_V1,
    "[EDITABLE_OPERATIONAL_INSTRUCTIONS]",
    processingContext.systemPrompt,
  ].join("\n\n");

  return {
    runtimeCode: binding.runtimeCode,
    requestedLocale: processingContext.requestedLocale,
    systemPrompt,
    actorInstructionText: processingContext.actorInstructionText,
    processingInstructionContext: processingContext.publicMetadata,
    methodologyTrace,
  };
}
