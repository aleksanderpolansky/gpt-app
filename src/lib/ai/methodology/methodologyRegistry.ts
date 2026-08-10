export type MethodologyRuntimeCode =
  | "navigator_chat"
  | "activity_semantic_preview";

export type MethodologyVersionRef = {
  readonly code: string;
  readonly version: number;
  readonly sha256: string;
  readonly sourcePath: string;
};

export type RuntimeMethodologyBinding = {
  readonly runtimeCode: MethodologyRuntimeCode;
  readonly bindingVersion: number;
  readonly protocol: MethodologyVersionRef;
  readonly outputSchema: MethodologyVersionRef;
  readonly traceSchema: MethodologyVersionRef;
  readonly editableInstructionStoreCode: "ai_processing_instruction_sets";
  readonly personalContextStoreCode: "actor_ai_processing_preferences";
  readonly deterministicRuleRegistryCodes: readonly string[];
  readonly knowledgePackageCodes: readonly string[];
};

export const ARCTOR_AI_RUNTIME_CORE_PROTOCOL: MethodologyVersionRef = {
  code: "arctor_ai_runtime_core",
  version: 1,
  sha256: "CA86813D3493DF764AEC0C95070B282F3964303EA59AB600BDBA0A26F83B5163",
  sourcePath:
    "docs/goal-world/protocols/ARCTOR_AI_RUNTIME_CORE_PROTOCOL_V1.md",
} as const;

export const AI_METHODOLOGY_TRACE_SCHEMA: MethodologyVersionRef = {
  code: "ai_methodology_trace",
  version: 1,
  sha256: "CE3650CF86B3879E2B68CD139C4C736D277AFEC82FB42A1F5B7C7DB5BAF35328",
  sourcePath:
    "src/lib/ai/methodology/schemas/ai-methodology-trace.v1.schema.json",
} as const;

export const NAVIGATOR_CHAT_OUTPUT_SCHEMA: MethodologyVersionRef = {
  code: "navigator_chat_output",
  version: 1,
  sha256: "AE0DD9E042FF3F2617785F45556BC553EB239FB53B9FE620ADE7C440EAED10EF",
  sourcePath:
    "src/lib/ai/methodology/schemas/navigator-chat-output.v1.schema.json",
} as const;

export const ACTIVITY_SEMANTIC_PREVIEW_MODEL_OUTPUT_SCHEMA:
  MethodologyVersionRef = {
  code: "activity_semantic_preview_model_output",
  version: 1,
  sha256: "427F9CE0B52BF526FB876F327B70A4BAC7638EE6F44F753A499CE1C6F454435F",
  sourcePath:
    "src/lib/ai/methodology/schemas/activity-semantic-preview-model-output.v1.schema.json",
} as const;

export const RUNTIME_METHODOLOGY_BINDINGS:
  readonly RuntimeMethodologyBinding[] = [
  {
    runtimeCode: "navigator_chat",
    bindingVersion: 1,
    protocol: ARCTOR_AI_RUNTIME_CORE_PROTOCOL,
    outputSchema: NAVIGATOR_CHAT_OUTPUT_SCHEMA,
    traceSchema: AI_METHODOLOGY_TRACE_SCHEMA,
    editableInstructionStoreCode: "ai_processing_instruction_sets",
    personalContextStoreCode: "actor_ai_processing_preferences",
    deterministicRuleRegistryCodes: [],
    knowledgePackageCodes: [],
  },
  {
    runtimeCode: "activity_semantic_preview",
    bindingVersion: 1,
    protocol: ARCTOR_AI_RUNTIME_CORE_PROTOCOL,
    outputSchema: ACTIVITY_SEMANTIC_PREVIEW_MODEL_OUTPUT_SCHEMA,
    traceSchema: AI_METHODOLOGY_TRACE_SCHEMA,
    editableInstructionStoreCode: "ai_processing_instruction_sets",
    personalContextStoreCode: "actor_ai_processing_preferences",
    deterministicRuleRegistryCodes: ["calendar_ai_rule_preferences"],
    knowledgePackageCodes: [],
  },
] as const;

export function getRuntimeMethodologyBinding(
  runtimeCode: MethodologyRuntimeCode,
): RuntimeMethodologyBinding {
  const binding = RUNTIME_METHODOLOGY_BINDINGS.find(
    (item) => item.runtimeCode === runtimeCode,
  );

  if (!binding) {
    throw new Error(
      `AI_METHODOLOGY_RUNTIME_BINDING_NOT_FOUND: ${runtimeCode}`,
    );
  }

  return binding;
}
