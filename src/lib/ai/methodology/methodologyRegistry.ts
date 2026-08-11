export type MethodologyRuntimeCode =
  | "navigator_chat"
  | "activity_semantic_preview"
  | "goal_intake";

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
  readonly supportingProtocols: readonly MethodologyVersionRef[];
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

export const GOAL_INTAKE_PROTOCOL: MethodologyVersionRef = {
  code: "goal_intake_protocol",
  version: 1,
  sha256: "47D4FB11C815B95371F6BC2A000F8A89819B9126831F652718B1E6E8EBFBE85C",
  sourcePath:
    "docs/goal-world/P6A_GOAL_INTAKE_PROTOCOL_V1.md",
} as const;

export const REALITY_CONTEXT_SNAPSHOT_PROTOCOL: MethodologyVersionRef = {
  code: "reality_context_snapshot",
  version: 1,
  sha256: "11E25999A91A3EA36C442F0E0819F3F550C19DAF323396FB5233B5B0C50FD38D",
  sourcePath:
    "docs/goal-world/P6A1_REALITY_CONTEXT_SNAPSHOT_PROTOCOL_V1.md",
} as const;

export const AI_METHODOLOGY_TRACE_SCHEMA: MethodologyVersionRef = {
  code: "ai_methodology_trace",
  version: 1,
  sha256: "CE3650CF86B3879E2B68CD139C4C736D277AFEC82FB42A1F5B7C7DB5BAF35328",
  sourcePath:
    "src/lib/ai/methodology/schemas/ai-methodology-trace.v1.schema.json",
} as const;

export const AI_METHODOLOGY_TRACE_SCHEMA_V2: MethodologyVersionRef = {
  code: "ai_methodology_trace",
  version: 2,
  sha256: "A7C7F264A0D5CD7E609A5188343B06B07807C00E35D13CCBA103B537C65EEC33",
  sourcePath:
    "src/lib/ai/methodology/schemas/ai-methodology-trace.v2.schema.json",
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

export const GOAL_INTAKE_DEFINITION_OUTPUT_SCHEMA:
  MethodologyVersionRef = {
  code: "goal_intake_definition",
  version: 1,
  sha256: "D814F94B539E13055C1462564A90676E09598BEB09E9E418B31F293ACA73C845",
  sourcePath:
    "src/lib/goal-world/intake/schemas/goal-intake-definition.v1.schema.json",
} as const;

export const RUNTIME_METHODOLOGY_BINDINGS:
  readonly RuntimeMethodologyBinding[] = [
  {
    runtimeCode: "navigator_chat",
    bindingVersion: 1,
    protocol: ARCTOR_AI_RUNTIME_CORE_PROTOCOL,
    supportingProtocols: [],
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
    supportingProtocols: [],
    outputSchema: ACTIVITY_SEMANTIC_PREVIEW_MODEL_OUTPUT_SCHEMA,
    traceSchema: AI_METHODOLOGY_TRACE_SCHEMA,
    editableInstructionStoreCode: "ai_processing_instruction_sets",
    personalContextStoreCode: "actor_ai_processing_preferences",
    deterministicRuleRegistryCodes: ["calendar_ai_rule_preferences"],
    knowledgePackageCodes: [],
  },
  {
    runtimeCode: "goal_intake",
    bindingVersion: 1,
    protocol: ARCTOR_AI_RUNTIME_CORE_PROTOCOL,
    supportingProtocols: [
      GOAL_INTAKE_PROTOCOL,
      REALITY_CONTEXT_SNAPSHOT_PROTOCOL,
    ],
    outputSchema: GOAL_INTAKE_DEFINITION_OUTPUT_SCHEMA,
    traceSchema: AI_METHODOLOGY_TRACE_SCHEMA_V2,
    editableInstructionStoreCode: "ai_processing_instruction_sets",
    personalContextStoreCode: "actor_ai_processing_preferences",
    deterministicRuleRegistryCodes: [
      "goal_intake_registry",
      "reality_context_policy",
    ],
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
