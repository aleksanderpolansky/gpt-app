export type AiLabFactValueType = "numeric" | "text" | "boolean";

export type AiLabFactMaterializationCandidate = {
  targetKey: string;
  targetValueObjectId: string;
  canonicalKey: string;
  parameterCode: string;
  unit: string;
  valueType: AiLabFactValueType;
  valueNumeric: number | null;
  valueText: string | null;
  valueBoolean: boolean | null;
  rawFragment: string;
  semanticMatchMethodCode: string;
  confidence: number;
  sourceContractCode: string | null;
};

export type AiLabFactMaterializationVerdict =
  | "confirmed"
  | "rejected"
  | "commented"
  | null;

export type AiLabFactWriterRow = {
  canonicalKey: string;
  parameterCode: string;
  unit: string;
  valueNumeric?: number;
  valueText?: string;
  valueBoolean?: boolean;
  rawFragment: string;
  normalizedFragment: string;
  semanticMatchMethodCode: string;
  sourceType: "ai_extraction";
  confidence: number;
  factStatus: "proposed" | "confirmed";
  isUserConfirmed: boolean;
  valueOriginCode: "user_explicit";
  sourceReliabilityCode: "user_reported";
  sourceSnapshotJson: {
    contract: "AI_A3_P5A_ACTIVITY_FACT_MATERIALIZATION_V1";
    targetKey: string;
    analysisOperationId: string;
  };
};

type FactLike = {
  parameterCode?: string | null;
  unit?: string | null;
  valueType?: string | null;
  valueNumeric?: number | null;
  valueText?: string | null;
  valueBoolean?: boolean | null;
  rawFragment?: string | null;
};

type RowLike = {
  segmentId?: string | null;
  sourceFragment?: string | null;
  confidence?: number | null;
  selected?: {
    valueObjectId?: string | null;
    canonicalKey?: string | null;
    semanticMatchMethodCode?: string | null;
  } | null;
  facts?: FactLike[] | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_MATCH_METHODS = new Set([
  "manual",
  "exact_alias",
  "exact_primary_name",
  "rule_based",
  "ai_candidate",
  "user_confirmed",
  "import",
]);
const MAX_FACTS = 20;

function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function finiteConfidence(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : 0.8;
}

function exactFactValue(fact: FactLike):
  | { valueType: "numeric"; valueNumeric: number; valueText: null; valueBoolean: null }
  | { valueType: "text"; valueNumeric: null; valueText: string; valueBoolean: null }
  | { valueType: "boolean"; valueNumeric: null; valueText: null; valueBoolean: boolean }
  | null {
  const hasNumeric = typeof fact.valueNumeric === "number" && Number.isFinite(fact.valueNumeric);
  const hasText = typeof fact.valueText === "string" && fact.valueText.trim().length > 0;
  const hasBoolean = typeof fact.valueBoolean === "boolean";
  const count = Number(hasNumeric) + Number(hasText) + Number(hasBoolean);

  if (count !== 1) return null;

  if (hasNumeric) {
    return {
      valueType: "numeric",
      valueNumeric: fact.valueNumeric as number,
      valueText: null,
      valueBoolean: null,
    };
  }

  if (hasText) {
    return {
      valueType: "text",
      valueNumeric: null,
      valueText: (fact.valueText as string).trim().slice(0, 4000),
      valueBoolean: null,
    };
  }

  return {
    valueType: "boolean",
    valueNumeric: null,
    valueText: null,
    valueBoolean: fact.valueBoolean as boolean,
  };
}

export function buildAiLabFactMaterializationCandidates(
  rows: RowLike[] | null | undefined,
  sourceContractCode: string | null | undefined,
): AiLabFactMaterializationCandidate[] {
  const result: AiLabFactMaterializationCandidate[] = [];
  const seen = new Set<string>();

  (rows ?? []).forEach((row, rowIndex) => {
    const valueObjectId = text(row.selected?.valueObjectId, 80);
    const canonicalKey = text(row.selected?.canonicalKey, 240);
    if (!UUID_RE.test(valueObjectId) || !canonicalKey) return;

    const segmentId = text(row.segmentId, 120) || String(rowIndex + 1);
    const methodRaw = text(row.selected?.semanticMatchMethodCode, 80);
    const semanticMatchMethodCode = SAFE_MATCH_METHODS.has(methodRaw)
      ? methodRaw
      : "ai_candidate";

    (row.facts ?? []).forEach((fact, factIndex) => {
      if (result.length >= MAX_FACTS) return;

      const parameterCode = text(fact.parameterCode, 160);
      const unit = text(fact.unit, 80).toLowerCase();
      const rawFragment = text(fact.rawFragment, 800);
      const value = exactFactValue(fact);
      if (!parameterCode || !unit || !rawFragment || !value) return;

      const targetKey = `segment:${segmentId}:fact:${parameterCode}:${factIndex + 1}`;
      if (seen.has(targetKey)) return;
      seen.add(targetKey);

      result.push({
        targetKey,
        targetValueObjectId: valueObjectId,
        canonicalKey,
        parameterCode,
        unit,
        ...value,
        rawFragment,
        semanticMatchMethodCode,
        confidence: finiteConfidence(row.confidence),
        sourceContractCode: text(sourceContractCode, 180) || null,
      });
    });
  });

  return result;
}

export function normalizeAiLabFactMaterializationCandidates(
  value: unknown,
): AiLabFactMaterializationCandidate[] {
  if (!Array.isArray(value) || value.length > MAX_FACTS) return [];

  const result: AiLabFactMaterializationCandidate[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const targetKey = text(row.targetKey, 240);
    const targetValueObjectId = text(row.targetValueObjectId, 80);
    const canonicalKey = text(row.canonicalKey, 240);
    const parameterCode = text(row.parameterCode, 160);
    const unit = text(row.unit, 80).toLowerCase();
    const rawFragment = text(row.rawFragment, 800);
    const semanticMatchMethodRaw = text(row.semanticMatchMethodCode, 80);
    const semanticMatchMethodCode = SAFE_MATCH_METHODS.has(semanticMatchMethodRaw)
      ? semanticMatchMethodRaw
      : "ai_candidate";
    const sourceContractCode = text(row.sourceContractCode, 180) || null;

    if (
      !targetKey ||
      seen.has(targetKey) ||
      !UUID_RE.test(targetValueObjectId) ||
      !canonicalKey ||
      !parameterCode ||
      !unit ||
      !rawFragment
    ) {
      return [];
    }

    const factLike: FactLike = {
      valueNumeric:
        typeof row.valueNumeric === "number" ? row.valueNumeric : null,
      valueText: typeof row.valueText === "string" ? row.valueText : null,
      valueBoolean:
        typeof row.valueBoolean === "boolean" ? row.valueBoolean : null,
    };
    const exact = exactFactValue(factLike);
    if (!exact) return [];

    const declaredType = text(row.valueType, 20);
    if (declaredType && declaredType !== exact.valueType) return [];

    seen.add(targetKey);
    result.push({
      targetKey,
      targetValueObjectId,
      canonicalKey,
      parameterCode,
      unit,
      ...exact,
      rawFragment,
      semanticMatchMethodCode,
      confidence: finiteConfidence(row.confidence),
      sourceContractCode,
    });
  }

  return result;
}

export function containsEvidenceFragment(sourceText: string, rawFragment: string): boolean {
  const normalize = (input: string) => input.toLocaleLowerCase().replace(/\s+/g, " ").trim();
  const source = normalize(sourceText);
  const fragment = normalize(rawFragment);
  return Boolean(source && fragment && source.includes(fragment));
}

export function buildAiLabFactWriterRows(params: {
  candidates: AiLabFactMaterializationCandidate[];
  verdictsByTargetKey: ReadonlyMap<string, AiLabFactMaterializationVerdict>;
  analysisOperationId: string;
}): AiLabFactWriterRow[] {
  const operationId = text(params.analysisOperationId, 180);

  return params.candidates.flatMap((candidate) => {
    const verdict = params.verdictsByTargetKey.get(candidate.targetKey) ?? null;
    if (verdict === "rejected") return [];

    const confirmed = verdict === "confirmed";
    const row: AiLabFactWriterRow = {
      canonicalKey: candidate.canonicalKey,
      parameterCode: candidate.parameterCode,
      unit: candidate.unit,
      rawFragment: candidate.rawFragment,
      normalizedFragment: candidate.rawFragment.replace(/\s+/g, " ").trim(),
      semanticMatchMethodCode: candidate.semanticMatchMethodCode,
      sourceType: "ai_extraction",
      confidence: candidate.confidence,
      factStatus: confirmed ? "confirmed" : "proposed",
      isUserConfirmed: confirmed,
      valueOriginCode: "user_explicit",
      sourceReliabilityCode: "user_reported",
      sourceSnapshotJson: {
        contract: "AI_A3_P5A_ACTIVITY_FACT_MATERIALIZATION_V1",
        targetKey: candidate.targetKey,
        analysisOperationId: operationId,
      },
    };

    if (candidate.valueType === "numeric" && candidate.valueNumeric !== null) {
      row.valueNumeric = candidate.valueNumeric;
    } else if (candidate.valueType === "text" && candidate.valueText !== null) {
      row.valueText = candidate.valueText;
    } else if (candidate.valueType === "boolean" && candidate.valueBoolean !== null) {
      row.valueBoolean = candidate.valueBoolean;
    } else {
      return [];
    }

    return [row];
  });
}
