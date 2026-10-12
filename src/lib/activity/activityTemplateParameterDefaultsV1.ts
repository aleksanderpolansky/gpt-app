/**
 * Generic read/validation of literal parameter defaults authored in a system
 * typical-activity profile. This module deliberately has no knowledge of
 * activity kind, actor, geographic entity, retailer, product, or fact count.
 * It produces preliminary VALUES only. It never selects an observation object
 * and never writes a fact.
 */
export const ARCTOR_TEMPLATE_DEFAULT_LITERAL_V1 = "ARCTOR_DEFAULT_LITERAL_VALUE_V1" as const;

type JsonRecord = Record<string, unknown>;
function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord : {};
}
function string(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export type TemplateParameterDefinitionV1 = {
  parameter_code: string;
  dimension_code: string;
  value_type_code: string;
  canonical_unit_code: string;
  allowed_unit_codes: unknown;
  allow_negative: boolean | null;
};
export type TemplateMeasurementV1 = {
  parameterCode: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string;
  qualifier: string | null;
  rawFragment: string;
};
export type TemplatePreparedValueV1 = {
  origin: "source_explicit" | "template_default";
  valueNumeric: number;
  unit: string;
  rawFragment: string | null;
  defaultContract: typeof ARCTOR_TEMPLATE_DEFAULT_LITERAL_V1 | null;
};
export type TemplateValueResolutionV1 = {
  status: "explicit" | "default" | "missing" | "ambiguous" | "invalid";
  preparedValue: TemplatePreparedValueV1 | null;
  matchingMeasurements: TemplateMeasurementV1[];
  reason: string | null;
  hasStoredDefault: boolean;
};

function allowedUnits(def: TemplateParameterDefinitionV1): string[] {
  const raw = def.allowed_unit_codes;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string")
    .map((v) => v.toLowerCase().trim());
}
function numericOkay(value: number, def: TemplateParameterDefinitionV1): boolean {
  return Number.isFinite(value) && (def.allow_negative === true || value >= 0);
}
function sameValue(a: TemplatePreparedValueV1, b: TemplatePreparedValueV1): boolean {
  return a.unit === b.unit && a.valueNumeric === b.valueNumeric;
}

/**
 * Defaults apply only if there was no explicit candidate for this parameter.
 * Explicit invalid or conflicting values block the fallback: never silently
 * hide incorrect source data behind a template default.
 */
export function resolveTemplateParameterValueV1(input: {
  definition: TemplateParameterDefinitionV1;
  profileParameterMetadata: unknown;
  measurements: TemplateMeasurementV1[];
}): TemplateValueResolutionV1 {
  const { definition } = input;
  const allowed = allowedUnits(definition);
  const code = string(definition.parameter_code).toLowerCase();
  const dimension = string(definition.dimension_code).toLowerCase();
  const measurementMatches = input.measurements.filter((m) => {
    const measuredCode = string(m.parameterCode).toLowerCase();
    return measuredCode === code || (dimension !== "" && measuredCode === dimension);
  });
  const defaultJson = record(record(input.profileParameterMetadata).defaultLiteralValueV1);
  const hasStoredDefault = Object.keys(defaultJson).length > 0;
  const base = {matchingMeasurements: measurementMatches, hasStoredDefault};
  if (definition.value_type_code !== "numeric") {
    return { ...base, status:"invalid", preparedValue:null,
      reason:"P25_3_ONLY_NUMERIC_PREVIEW_SUPPORTED_NO_FACT_WRITE" };
  }
  if (measurementMatches.length > 0) {
    const explicit: TemplatePreparedValueV1[] = [];
    for (const m of measurementMatches) {
      const unit = m.unit.toLowerCase().trim();
      if (m.valueNumeric === null || !numericOkay(m.valueNumeric, definition) ||
          !allowed.includes(unit)) {
        return {...base, status:"invalid", preparedValue:null,
          reason:"P25_3_EXPLICIT_MEASUREMENT_INVALID_OR_UNIT_NOT_ALLOWED"};
      }
      explicit.push({origin:"source_explicit",valueNumeric:m.valueNumeric,
        unit,rawFragment:m.rawFragment,defaultContract:null});
    }
    const first = explicit[0];
    if (explicit.some((entry) => !sameValue(first,entry))) {
      return {...base,status:"ambiguous",preparedValue:null,
        reason:"P25_3_MULTIPLE_DIFFERENT_EXPLICIT_VALUES"};
    }
    return {...base,status:"explicit",preparedValue:first,reason:null};
  }
  if (!hasStoredDefault) {
    return {...base,status:"missing",preparedValue:null,
      reason:"P25_3_NO_EXPLICIT_VALUE_AND_NO_STORED_DEFAULT"};
  }
  const value = defaultJson.valueNumeric;
  const unit = string(defaultJson.unitCode).toLowerCase();
  if (defaultJson.contract !== ARCTOR_TEMPLATE_DEFAULT_LITERAL_V1 ||
      defaultJson.valueTypeCode !== "numeric" ||
      defaultJson.useWhenMissing !== true ||
      typeof value !== "number" || !numericOkay(value,definition) ||
      unit === "" || !allowed.includes(unit) ||
      unit !== string(definition.canonical_unit_code).toLowerCase()) {
    return {...base,status:"invalid",preparedValue:null,
      reason:"P25_3_STORED_DEFAULT_CONTRACT_OR_UNIT_INVALID"};
  }
  return {...base,status:"default",preparedValue:{
    origin:"template_default",valueNumeric:value,unit,rawFragment:null,
    defaultContract:ARCTOR_TEMPLATE_DEFAULT_LITERAL_V1},reason:null};
}
