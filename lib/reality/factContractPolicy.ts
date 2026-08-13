export type AiFactValueType = "numeric" | "text" | "boolean";

export type AiFactParameterContract = {
  parameterCode: string;
  valueTypeCode: string;
  allowedUnitCodes: string[];
};

export type NormalizedAiFact = {
  parameterCode: string;
  unit: string;
  valueType: AiFactValueType;
  valueNumeric: number | null;
  valueText: string | null;
  valueBoolean: boolean | null;
  rawFragment: string;
};

export type AiFactNormalizationRejectionReason =
  | "ROW_INVALID"
  | "PARAMETER_NOT_ALLOWED"
  | "UNIT_NOT_ALLOWED"
  | "EVIDENCE_INVALID"
  | "CONTRACT_VALUE_TYPE_UNSUPPORTED"
  | "EXPECTED_VALUE_MISSING";

export type AiFactNormalizationResult =
  | {
      accepted: true;
      fact: NormalizedAiFact;
      normalizationApplied: boolean;
    }
  | {
      accepted: false;
      reason: AiFactNormalizationRejectionReason;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableText(value: unknown): string | null {
  const text = asText(value);
  return text || null;
}

function asFiniteNumber(value: unknown): number | null {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(numberValue) ? numberValue : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function containsFragment(source: string, fragment: string) {
  return source.toLocaleLowerCase().includes(fragment.toLocaleLowerCase());
}

export function normalizeAiFactAgainstParameterContract(input: {
  rawFact: unknown;
  sourceFragment: string;
  contract: AiFactParameterContract | null;
}): AiFactNormalizationResult {
  const row = asRecord(input.rawFact);

  if (!row) {
    return { accepted: false, reason: "ROW_INVALID" };
  }

  const parameterCode = asText(row.parameterCode);
  const unit = asText(row.unit);
  const rawFragment = asText(row.rawFragment);
  const modelValueType = asText(row.valueType);
  const contract = input.contract;

  if (!contract || parameterCode !== contract.parameterCode) {
    return { accepted: false, reason: "PARAMETER_NOT_ALLOWED" };
  }

  if (!contract.allowedUnitCodes.includes(unit)) {
    return { accepted: false, reason: "UNIT_NOT_ALLOWED" };
  }

  if (
    !rawFragment ||
    !containsFragment(input.sourceFragment, rawFragment)
  ) {
    return { accepted: false, reason: "EVIDENCE_INVALID" };
  }

  if (!(["numeric", "text", "boolean"] as string[]).includes(contract.valueTypeCode)) {
    return { accepted: false, reason: "CONTRACT_VALUE_TYPE_UNSUPPORTED" };
  }

  const expectedValueType = contract.valueTypeCode as AiFactValueType;
  const valueNumeric = asFiniteNumber(row.valueNumeric);
  const valueText = asNullableText(row.valueText);
  const valueBoolean = asBoolean(row.valueBoolean);

  if (expectedValueType === "numeric") {
    if (valueNumeric === null) {
      return { accepted: false, reason: "EXPECTED_VALUE_MISSING" };
    }

    return {
      accepted: true,
      fact: {
        parameterCode,
        unit,
        valueType: "numeric",
        valueNumeric,
        valueText: null,
        valueBoolean: null,
        rawFragment,
      },
      normalizationApplied:
        modelValueType !== "numeric" ||
        valueText !== null ||
        valueBoolean !== null,
    };
  }

  if (expectedValueType === "text") {
    if (valueText === null) {
      return { accepted: false, reason: "EXPECTED_VALUE_MISSING" };
    }

    return {
      accepted: true,
      fact: {
        parameterCode,
        unit,
        valueType: "text",
        valueNumeric: null,
        valueText,
        valueBoolean: null,
        rawFragment,
      },
      normalizationApplied:
        modelValueType !== "text" ||
        valueNumeric !== null ||
        valueBoolean !== null,
    };
  }

  if (valueBoolean === null) {
    return { accepted: false, reason: "EXPECTED_VALUE_MISSING" };
  }

  return {
    accepted: true,
    fact: {
      parameterCode,
      unit,
      valueType: "boolean",
      valueNumeric: null,
      valueText: null,
      valueBoolean,
      rawFragment,
    },
    normalizationApplied:
      modelValueType !== "boolean" ||
      valueNumeric !== null ||
      valueText !== null,
  };
}
