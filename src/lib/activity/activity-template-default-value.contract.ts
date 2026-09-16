export const ACTIVITY_TEMPLATE_MISSING_VALUE_POLICY_CODES = [
  "no_fact",
  "ask_user",
  "actor_typical",
  "system_typical",
  "actor_then_system",
] as const;

export type ActivityTemplateMissingValuePolicyCode =
  (typeof ACTIVITY_TEMPLATE_MISSING_VALUE_POLICY_CODES)[number];

export const ACTIVITY_TEMPLATE_VALUE_SOURCE_CODES = [
  "explicit_user",
  "external_measurement",
  "manual_measurement",
  "actor_typical",
  "system_typical",
] as const;

export type ActivityTemplateValueSourceCode =
  (typeof ACTIVITY_TEMPLATE_VALUE_SOURCE_CODES)[number];

export const ACTIVITY_TEMPLATE_VALUE_RESOLUTION_PRECEDENCE = [
  "explicit_user",
  "external_measurement",
  "manual_measurement",
  "actor_typical",
  "system_typical",
] as const satisfies readonly ActivityTemplateValueSourceCode[];

export type ActivityTemplateParameterDefaultPolicyV1 = {
  parameterDefinitionId: string;
  valueObjectId: string;
  missingValuePolicyCode: ActivityTemplateMissingValuePolicyCode;
};

export type ActivityTemplateResolvedValueProvenanceV1 = {
  sourceCode: ActivityTemplateValueSourceCode;
  templateId: string;
  parameterDefinitionId: string;
  valueObjectId: string;
  sourceRecordId: string | null;
};

export const ACTIVITY_TEMPLATE_DEFAULT_VALUE_CONTRACT_V1 = {
  contract: "ARCTOR_ACTIVITY_TEMPLATE_DEFAULT_VALUE_POLICY_V1",
  factCreationRule:
    "A concrete fact requires an explicit/measured value or a permitted resolved typical value.",
  typicalValueIsNotFactUntilApplied: true,
  explicitValueOverridesTypicalValue: true,
  executorEnabled: false,
} as const;
