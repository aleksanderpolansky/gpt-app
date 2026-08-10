import activitySemanticPreviewSchema from "./schemas/activity-semantic-preview-model-output.v1.schema.json";
import navigatorChatSchema from "./schemas/navigator-chat-output.v1.schema.json";
import type { MethodologyRuntimeCode } from "./methodologyRegistry";

export type RuntimeStructuredOutputContract = {
  readonly name: string;
  readonly schema: Record<string, unknown>;
  readonly strict: true;
};

function sanitizeSchemaForOpenAi(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const { $schema: _schemaDialect, $id: _schemaId, ...rest } = schema;
  return rest;
}

const RUNTIME_STRUCTURED_OUTPUTS: Record<
  MethodologyRuntimeCode,
  RuntimeStructuredOutputContract
> = {
  navigator_chat: {
    name: "arctor_navigator_chat_output_v1",
    schema: sanitizeSchemaForOpenAi(
      navigatorChatSchema as Record<string, unknown>,
    ),
    strict: true,
  },
  activity_semantic_preview: {
    name: "arctor_activity_semantic_preview_output_v1",
    schema: sanitizeSchemaForOpenAi(
      activitySemanticPreviewSchema as Record<string, unknown>,
    ),
    strict: true,
  },
};

export function getRuntimeStructuredOutputContract(
  runtimeCode: MethodologyRuntimeCode,
): RuntimeStructuredOutputContract {
  return RUNTIME_STRUCTURED_OUTPUTS[runtimeCode];
}
