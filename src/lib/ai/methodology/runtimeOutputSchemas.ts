import activitySemanticPreviewSchema from "./schemas/activity-semantic-preview-model-output.v1.schema.json";
import navigatorChatSchema from "./schemas/navigator-chat-output.v1.schema.json";
import goalIntakeSchema from "../../goal-world/intake/schemas/goal-intake-definition.v1.schema.json";
import type { MethodologyRuntimeCode } from "./methodologyRegistry";

export type RuntimeStructuredOutputContract = {
  readonly name: string;
  readonly schema: Record<string, unknown>;
  readonly strict: true;
};

function inferStrictSchemaTypeFromConst(
  value: unknown,
): "string" | "integer" | "number" | "boolean" | null {
  if (typeof value === "string") {
    return "string";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "number";
  }

  return null;
}

function stripUnsupportedStrictSchemaKeywords(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUnsupportedStrictSchemaKeywords);
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const original =
      value as Record<string, unknown>;

    const normalized = Object.fromEntries(
      Object.entries(original)
        .filter(
          ([key]) =>
            key !== "uniqueItems" &&
            key !== "const",
        )
        .map(([key, child]) => [
          key,
          stripUnsupportedStrictSchemaKeywords(child),
        ]),
    ) as Record<string, unknown>;

    if (
      Object.prototype.hasOwnProperty.call(
        original,
        "const",
      )
    ) {
      const constValue = original.const;
      const inferredType =
        inferStrictSchemaTypeFromConst(constValue);

      if (!normalized.type && inferredType) {
        normalized.type = inferredType;
      }

      normalized.enum = [constValue];
    }

    return normalized;
  }

  return value;
}

function sanitizeSchemaForOpenAi(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const { $schema: _schemaDialect, $id: _schemaId, ...rest } = schema;

  return stripUnsupportedStrictSchemaKeywords(
    rest,
  ) as Record<string, unknown>;
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
  goal_intake: {
    name: "arctor_goal_intake_definition_v1",
    schema: sanitizeSchemaForOpenAi(
      goalIntakeSchema as Record<string, unknown>,
    ),
    strict: true,
  },
};

export function getRuntimeStructuredOutputContract(
  runtimeCode: MethodologyRuntimeCode,
): RuntimeStructuredOutputContract {
  return RUNTIME_STRUCTURED_OUTPUTS[runtimeCode];
}
