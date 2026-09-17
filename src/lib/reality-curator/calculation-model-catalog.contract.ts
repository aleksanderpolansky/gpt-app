import {
  FORMULA_EXPRESSION_LANGUAGE,
  isFormulaExpressionNodeV1,
  type FormulaExpressionNodeV1,
} from "./formula-rule-registry.contract";

export const CALCULATION_MODEL_CATALOG_CONTRACT =
  "ARCTOR_CALCULATION_MODEL_CATALOG_V1" as const;

export const CALCULATION_MODEL_SCOPES = [
  "system",
  "user",
  "organization",
] as const;

export const CALCULATION_MODEL_VISIBILITIES = [
  "private",
  "shared",
  "public",
] as const;

export const CALCULATION_MODEL_SERIES_STATUSES = [
  "active",
  "inactive",
  "archived",
] as const;

export const CALCULATION_MODEL_VERSION_STATUSES = [
  "draft",
  "testing",
  "published",
  "disabled",
  "superseded",
  "archived",
] as const;

export type CalculationModelScope =
  (typeof CALCULATION_MODEL_SCOPES)[number];

export type CalculationModelVisibility =
  (typeof CALCULATION_MODEL_VISIBILITIES)[number];

export type CalculationModelSeriesStatus =
  (typeof CALCULATION_MODEL_SERIES_STATUSES)[number];

export type CalculationModelVersionStatus =
  (typeof CALCULATION_MODEL_VERSION_STATUSES)[number];

export type CalculationModelInputV1 = {
  key: string;
  title?: string | null;
  description?: string | null;
  valueType:
    | "number"
    | "integer"
    | "boolean"
    | "text";
  unitCode?: string | null;
  required: boolean;
};

export type CalculationModelOutputV1 = {
  valueType:
    | "number"
    | "integer"
    | "boolean"
    | "text";
  unitCode?: string | null;
  title?: string | null;
  description?: string | null;
};

export type CalculationModelVersionContractV1 = {
  contract:
    typeof CALCULATION_MODEL_CATALOG_CONTRACT;

  expressionLanguage:
    typeof FORMULA_EXPRESSION_LANGUAGE;

  inputs:
    CalculationModelInputV1[];

  expression:
    FormulaExpressionNodeV1;

  output:
    CalculationModelOutputV1;

  applicability:
    Record<string, unknown>;

  evidence:
    Record<string, unknown>;
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function text(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export function normalizeCalculationModelVersionContractV1(
  value: unknown,
):
  | CalculationModelVersionContractV1
  | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.contract !==
      CALCULATION_MODEL_CATALOG_CONTRACT ||
    value.expressionLanguage !==
      FORMULA_EXPRESSION_LANGUAGE
  ) {
    return null;
  }

  if (
    !Array.isArray(value.inputs) ||
    value.inputs.length > 128
  ) {
    return null;
  }

  const keys =
    new Set<string>();

  const inputs:
    CalculationModelInputV1[] = [];

  for (const raw of value.inputs) {
    if (!isRecord(raw)) {
      return null;
    }

    const key =
      text(raw.key);

    if (
      !key ||
      keys.has(key)
    ) {
      return null;
    }

    const valueType =
      text(raw.valueType);

    if (
      ![
        "number",
        "integer",
        "boolean",
        "text",
      ].includes(valueType)
    ) {
      return null;
    }

    if (
      typeof raw.required !==
      "boolean"
    ) {
      return null;
    }

    keys.add(key);

    inputs.push({
      key,
      title:
        text(raw.title) ||
        null,
      description:
        text(raw.description) ||
        null,
      valueType:
        valueType as
          CalculationModelInputV1["valueType"],
      unitCode:
        text(raw.unitCode) ||
        null,
      required:
        raw.required,
    });
  }

  if (
    !isFormulaExpressionNodeV1(
      value.expression,
    )
  ) {
    return null;
  }

  if (!isRecord(value.output)) {
    return null;
  }

  const outputType =
    text(
      value.output.valueType,
    );

  if (
    ![
      "number",
      "integer",
      "boolean",
      "text",
    ].includes(outputType)
  ) {
    return null;
  }

  if (
    !isRecord(value.applicability) ||
    !isRecord(value.evidence)
  ) {
    return null;
  }

  return {
    contract:
      CALCULATION_MODEL_CATALOG_CONTRACT,

    expressionLanguage:
      FORMULA_EXPRESSION_LANGUAGE,

    inputs,

    expression:
      value.expression,

    output: {
      valueType:
        outputType as
          CalculationModelOutputV1["valueType"],

      unitCode:
        text(
          value.output.unitCode,
        ) ||
        null,

      title:
        text(
          value.output.title,
        ) ||
        null,

      description:
        text(
          value.output.description,
        ) ||
        null,
    },

    applicability:
      value.applicability,

    evidence:
      value.evidence,
  };
}