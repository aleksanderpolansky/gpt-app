import {
  REALITY_CORE_CONTRACT_VERSION,
  type AggregationMethod,
  type WindowCode,
} from "@/types/reality-core/reality-core-contracts-v1";
import {
  PARAMETER_REGISTRY_VERSION,
  convertToCanonicalUnit,
  getParameterDefinition,
  type ParameterCode,
  type ParameterValueType,
} from "@/types/reality-core/parameter-registry-v1";

export type RealityCoreLegacyFactInput = {
  readonly localFactId: string;
  readonly semanticObjectKey: string;
  readonly semanticObjectLabel: string;
  readonly legacyMeasureType: string | null;
  readonly legacyUnit: string | null;
  readonly valueNumeric: number | null;
  readonly valueText: string | null;
  readonly valueBoolean: boolean | null;
};

export type RealityCoreNormalizedFact = {
  readonly ok: true;
  readonly localFactId: string;
  readonly contractVersion: typeof REALITY_CORE_CONTRACT_VERSION;
  readonly registryVersion: typeof PARAMETER_REGISTRY_VERSION;
  readonly parameterCode: ParameterCode;
  readonly parameterLabelRu: string;
  readonly valueType: ParameterValueType;
  readonly canonicalUnitCode: string;
  readonly canonicalValueNumeric: number | null;
  readonly canonicalValueText: string | null;
  readonly canonicalValueBoolean: boolean | null;
  readonly aggregationMethod: AggregationMethod;
  readonly defaultWindow: WindowCode;
  readonly source: {
    readonly legacyMeasureType: string | null;
    readonly legacyUnit: string | null;
  };
  readonly warnings: readonly string[];
};

export type RealityCoreNormalizationFailure = {
  readonly ok: false;
  readonly localFactId: string;
  readonly contractVersion: typeof REALITY_CORE_CONTRACT_VERSION;
  readonly registryVersion: typeof PARAMETER_REGISTRY_VERSION;
  readonly errorCode:
    | "REALITY_CORE_PARAMETER_MAPPING_FAILED"
    | "REALITY_CORE_PARAMETER_DEFINITION_MISSING"
    | "REALITY_CORE_VALUE_TYPE_MISMATCH"
    | "REALITY_CORE_UNIT_NOT_ALLOWED"
    | "REALITY_CORE_CANONICAL_CONVERSION_FAILED";
  readonly errorMessage: string;
  readonly source: {
    readonly legacyMeasureType: string | null;
    readonly legacyUnit: string | null;
    readonly semanticObjectKey: string;
    readonly semanticObjectLabel: string;
  };
};

export type RealityCoreFactNormalizationResult =
  | RealityCoreNormalizedFact
  | RealityCoreNormalizationFailure;

export type RealityCoreNormalizationPreview = {
  readonly contractVersion: typeof REALITY_CORE_CONTRACT_VERSION;
  readonly registryVersion: typeof PARAMETER_REGISTRY_VERSION;
  readonly ok: boolean;
  readonly normalizedCount: number;
  readonly failedCount: number;
  readonly items: readonly RealityCoreFactNormalizationResult[];
  readonly errors: readonly {
    readonly localFactId: string;
    readonly errorCode: RealityCoreNormalizationFailure["errorCode"];
    readonly errorMessage: string;
  }[];
  readonly dbWriteExecuted: false;
};

const UNIT_ALIASES: Readonly<Record<string, string>> = {
  score: "score_0_10",
  km_per_hour: "kilometer_per_hour",
  role: "text",
  tag: "text",
};

function normalizeToken(value: string | null): string {
  return (value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9а-яёіїєґ_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function semanticHaystack(input: RealityCoreLegacyFactInput): string {
  return normalizeToken(
    `${input.semanticObjectKey} ${input.semanticObjectLabel}`,
  );
}

function normalizeLegacyUnit(unit: string | null): string | null {
  const normalized = normalizeToken(unit);
  if (!normalized) {
    return null;
  }

  return UNIT_ALIASES[normalized] ?? normalized;
}

function resolveMoneyParameter(unitCode: string | null): ParameterCode | null {
  if (unitCode === "pln") {
    return "monetary_amount_pln";
  }
  if (unitCode === "eur") {
    return "monetary_amount_eur";
  }
  if (unitCode === "usd") {
    return "monetary_amount_usd";
  }
  return null;
}

function resolveEnergyParameter(haystack: string): ParameterCode {
  if (
    /(balance|баланс|saldo|bilans|deficit|дефицит|nadwyzka|surplus)/i.test(
      haystack,
    )
  ) {
    return "energy_balance";
  }

  if (
    /(intake|consum|meal|food|eat|eaten|calorie_in|получ|съел|еда|питани|spoży|zjed|posił)/i.test(
      haystack,
    )
  ) {
    return "energy_intake";
  }

  if (
    /(expenditure|burn|spent|calorie_out|потрат|расход|сжег|spal|wydatek)/i.test(
      haystack,
    )
  ) {
    return "energy_expenditure";
  }

  return "energy_amount";
}

function resolveMassParameter(haystack: string): ParameterCode {
  return /(body|weight|body_mass|вес|масса_тела|waga|masa_ciała)/i.test(
    haystack,
  )
    ? "body_mass"
    : "object_mass";
}

function resolveParameterCode(
  input: RealityCoreLegacyFactInput,
  unitCode: string | null,
): ParameterCode | null {
  const measureType = normalizeToken(input.legacyMeasureType);
  const haystack = semanticHaystack(input);

  if (measureType === "duration") {
    return "duration";
  }
  if (measureType === "distance") {
    return "distance";
  }
  if (measureType === "volume") {
    return "liquid_volume";
  }
  if (measureType === "mass") {
    return resolveMassParameter(haystack);
  }
  if (measureType === "money") {
    return resolveMoneyParameter(unitCode);
  }
  if (measureType === "energy") {
    return resolveEnergyParameter(haystack);
  }
  if (measureType === "repetitions") {
    return unitCode === "set" ? "set_count" : "repetition_count";
  }
  if (measureType === "state_score") {
    return "state_score";
  }
  if (measureType === "state_text") {
    return "observed_text";
  }
  if (measureType === "boolean_state") {
    return "boolean_state";
  }
  if (measureType === "role" || measureType === "context_tag") {
    return "observed_text";
  }
  if (measureType === "state") {
    if (unitCode === "score_0_10") {
      return "state_score";
    }
    if (unitCode === "boolean") {
      return "boolean_state";
    }
    return "observed_text";
  }
  if (measureType === "context" || measureType === "role") {
    return "observed_text";
  }
  if (measureType === "derived" || measureType === "derived_metric") {
    if (unitCode === "kilometer_per_hour") {
      return "speed";
    }
    if (unitCode === "kcal") {
      return resolveEnergyParameter(haystack);
    }
    if (unitCode === "score_0_10") {
      return "state_score";
    }
    if (unitCode === "boolean") {
      return "boolean_state";
    }
    if (unitCode === "text") {
      return "observed_text";
    }
  }

  if (unitCode === "second" || unitCode === "minute" || unitCode === "hour") {
    return "duration";
  }
  if (unitCode === "meter" || unitCode === "kilometer") {
    return "distance";
  }
  if (unitCode === "step") {
    return "step_count";
  }
  if (unitCode === "repetition") {
    return "repetition_count";
  }
  if (unitCode === "set") {
    return "set_count";
  }
  if (unitCode === "count") {
    return "observation_count";
  }
  if (unitCode === "milliliter" || unitCode === "liter") {
    return "liquid_volume";
  }
  if (unitCode === "gram" || unitCode === "kilogram") {
    return resolveMassParameter(haystack);
  }
  if (unitCode === "kcal" || unitCode === "kilojoule") {
    return resolveEnergyParameter(haystack);
  }
  if (unitCode === "pln" || unitCode === "eur" || unitCode === "usd") {
    return resolveMoneyParameter(unitCode);
  }
  if (unitCode === "score_0_10") {
    return "state_score";
  }
  if (unitCode === "kilometer_per_hour") {
    return "speed";
  }
  if (unitCode === "boolean") {
    return "boolean_state";
  }
  if (unitCode === "text") {
    return "observed_text";
  }

  if (input.valueBoolean !== null) {
    return "boolean_state";
  }
  if (input.valueText !== null) {
    return "observed_text";
  }

  return null;
}

function failure(
  input: RealityCoreLegacyFactInput,
  errorCode: RealityCoreNormalizationFailure["errorCode"],
  errorMessage: string,
): RealityCoreNormalizationFailure {
  return {
    ok: false,
    localFactId: input.localFactId,
    contractVersion: REALITY_CORE_CONTRACT_VERSION,
    registryVersion: PARAMETER_REGISTRY_VERSION,
    errorCode,
    errorMessage,
    source: {
      legacyMeasureType: input.legacyMeasureType,
      legacyUnit: input.legacyUnit,
      semanticObjectKey: input.semanticObjectKey,
      semanticObjectLabel: input.semanticObjectLabel,
    },
  };
}

export function normalizeLegacyActivityFactToRealityCore(
  input: RealityCoreLegacyFactInput,
): RealityCoreFactNormalizationResult {
  const unitCode = normalizeLegacyUnit(input.legacyUnit);
  const parameterCode = resolveParameterCode(input, unitCode);

  if (!parameterCode) {
    return failure(
      input,
      "REALITY_CORE_PARAMETER_MAPPING_FAILED",
      `Cannot map legacy measure_type=${input.legacyMeasureType ?? "null"} unit=${input.legacyUnit ?? "null"} to parameter_code.`,
    );
  }

  const definition = getParameterDefinition(parameterCode);
  if (!definition) {
    return failure(
      input,
      "REALITY_CORE_PARAMETER_DEFINITION_MISSING",
      `Parameter definition is missing for ${parameterCode}.`,
    );
  }

  if (!unitCode || !definition.allowedUnits.includes(unitCode)) {
    return failure(
      input,
      "REALITY_CORE_UNIT_NOT_ALLOWED",
      `Unit ${unitCode ?? "null"} is not allowed for parameter ${parameterCode}.`,
    );
  }

  if (definition.valueType === "numeric") {
    if (input.valueNumeric === null || !Number.isFinite(input.valueNumeric)) {
      return failure(
        input,
        "REALITY_CORE_VALUE_TYPE_MISMATCH",
        `Parameter ${parameterCode} requires one numeric value.`,
      );
    }

    try {
      return {
        ok: true,
        localFactId: input.localFactId,
        contractVersion: REALITY_CORE_CONTRACT_VERSION,
        registryVersion: PARAMETER_REGISTRY_VERSION,
        parameterCode,
        parameterLabelRu: definition.labelRu,
        valueType: definition.valueType,
        canonicalUnitCode: definition.canonicalUnit,
        canonicalValueNumeric: convertToCanonicalUnit(
          parameterCode,
          input.valueNumeric,
          unitCode,
        ),
        canonicalValueText: null,
        canonicalValueBoolean: null,
        aggregationMethod: definition.aggregationMethod,
        defaultWindow: definition.defaultWindow,
        source: {
          legacyMeasureType: input.legacyMeasureType,
          legacyUnit: input.legacyUnit,
        },
        warnings: [],
      };
    } catch (error) {
      return failure(
        input,
        "REALITY_CORE_CANONICAL_CONVERSION_FAILED",
        error instanceof Error ? error.message : "Canonical conversion failed.",
      );
    }
  }

  if (definition.valueType === "text") {
    if (input.valueText === null) {
      return failure(
        input,
        "REALITY_CORE_VALUE_TYPE_MISMATCH",
        `Parameter ${parameterCode} requires one text value.`,
      );
    }

    return {
      ok: true,
      localFactId: input.localFactId,
      contractVersion: REALITY_CORE_CONTRACT_VERSION,
      registryVersion: PARAMETER_REGISTRY_VERSION,
      parameterCode,
      parameterLabelRu: definition.labelRu,
      valueType: definition.valueType,
      canonicalUnitCode: definition.canonicalUnit,
      canonicalValueNumeric: null,
      canonicalValueText: input.valueText,
      canonicalValueBoolean: null,
      aggregationMethod: definition.aggregationMethod,
      defaultWindow: definition.defaultWindow,
      source: {
        legacyMeasureType: input.legacyMeasureType,
        legacyUnit: input.legacyUnit,
      },
      warnings: [],
    };
  }

  if (definition.valueType === "boolean") {
    if (input.valueBoolean === null) {
      return failure(
        input,
        "REALITY_CORE_VALUE_TYPE_MISMATCH",
        `Parameter ${parameterCode} requires one boolean value.`,
      );
    }

    return {
      ok: true,
      localFactId: input.localFactId,
      contractVersion: REALITY_CORE_CONTRACT_VERSION,
      registryVersion: PARAMETER_REGISTRY_VERSION,
      parameterCode,
      parameterLabelRu: definition.labelRu,
      valueType: definition.valueType,
      canonicalUnitCode: definition.canonicalUnit,
      canonicalValueNumeric: null,
      canonicalValueText: null,
      canonicalValueBoolean: input.valueBoolean,
      aggregationMethod: definition.aggregationMethod,
      defaultWindow: definition.defaultWindow,
      source: {
        legacyMeasureType: input.legacyMeasureType,
        legacyUnit: input.legacyUnit,
      },
      warnings: [],
    };
  }

  return failure(
    input,
    "REALITY_CORE_VALUE_TYPE_MISMATCH",
    `Timestamp parameter ${parameterCode} is not supported by the legacy save-gate adapter.`,
  );
}

export function buildRealityCoreNormalizationPreview(
  items: readonly RealityCoreFactNormalizationResult[],
): RealityCoreNormalizationPreview {
  const errors = items
    .filter((item): item is RealityCoreNormalizationFailure => !item.ok)
    .map((item) => ({
      localFactId: item.localFactId,
      errorCode: item.errorCode,
      errorMessage: item.errorMessage,
    }));

  return {
    contractVersion: REALITY_CORE_CONTRACT_VERSION,
    registryVersion: PARAMETER_REGISTRY_VERSION,
    ok: errors.length === 0,
    normalizedCount: items.length - errors.length,
    failedCount: errors.length,
    items,
    errors,
    dbWriteExecuted: false,
  };
}
