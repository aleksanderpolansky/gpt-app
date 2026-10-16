/** Small, read-only, browser-safe projection of the P2.5 routing evidence. */
export const ADM4B2_P25_EVIDENCE_CONTRACT = "ARCTOR_ADM4B2_P25_EVIDENCE_V1" as const;

export type PublicMeasurementP25 = {
  parameter: string;
  value: string;
  unit: string;
  qualifier: string | null;
  fragment: string;
};
export type PublicBindingP25 = {
  parameter: string;
  targetBranch: string;
  valueStatus: string;
  value: string | null;
  valueOrigin: "text" | "profile_default" | "not_prepared";
  valueExplanation: string;
  matchedMeasurements: number;
  leafStatus: "candidate" | "technical_proposal" | "not_found";
  leafExplanation: string;
  candidateCount: number;
};
export type CommercialP25Evidence = {
  contract: typeof ADM4B2_P25_EVIDENCE_CONTRACT;
  analysisCompleted: boolean;
  extractedMeasurements: PublicMeasurementP25[];
  reportedMeasurementCount: number | null;
  profileCheck: "checked" | "unavailable";
  profileFailureCode: string | null;
  bindings: PublicBindingP25[];
  conclusion: string;
};

type InputMeasurement = {
  parameterCode?: unknown; valueNumeric?: unknown; valueText?: unknown;
  unit?: unknown; qualifier?: unknown; rawFragment?: unknown;
};
type InputBinding = {
  parameterCode: string;
  intermediateTitle: string | null;
  valueStatus: string;
  preparedValue: { valueNumeric: number; unit: string; origin: string } | null;
  valueReason: string | null;
  measurements: unknown[];
  selectedLeafValueObjectId: string | null;
  adminNominatedLeafId: string | null;
  technicalRepresentative: {status: string; reason?: string | null} | null;
  leafEvidenceIssue: string | null;
  targetResolutionReason: string;
  exactTextCandidates: unknown[];
};
const s = (value: unknown, length = 150): string => typeof value === "string" ? value.trim().slice(0, length) : "";
const valueIssue = (reason: string | null, status: string): string => {
  switch (reason) {
    case "P25_3_NO_EXPLICIT_VALUE_AND_NO_STORED_DEFAULT": return "В исходном анализе нет значения для этого параметра, и в профиле нет допустимого значения по умолчанию.";
    case "P25_3_EXPLICIT_PARAMETER_SHARED_BY_MULTIPLE_TARGETS_NEEDS_BINDING": return "Одно извлечённое значение относится к нескольким ветвям. Требуется уточнить, какой именно ОН оно описывает.";
    case "P25_3_EXPLICIT_MEASUREMENT_INVALID_OR_UNIT_NOT_ALLOWED": return "Извлечённое значение или его единица измерения не подходит для этого параметра.";
    case "P25_3_MULTIPLE_DIFFERENT_EXPLICIT_VALUES": return "Извлечено несколько различных значений одного параметра. Необходимо выбрать правильное.";
    case "P25_3_STORED_DEFAULT_CONTRACT_OR_UNIT_INVALID": return "Значение по умолчанию в профиле не прошло проверку формата или единицы измерения.";
  }
  if (status === "missing") return "Подходящее значение не обнаружено.";
  if (status === "ambiguous") return "Есть несколько возможных значений; требуется проверка.";
  if (status === "invalid") return "Значение не прошло проверку.";
  return `Требуется уточнение назначения параметра${reason ? ` (код ${s(reason, 90)})` : ""}.`;
};
const format = (value: unknown) => typeof value === "number" && Number.isFinite(value)
  ? String(value) : s(value, 60);

export function buildCommercialP25EvidenceV1(input: {
  completed: boolean;
  measurements: unknown;
  bindings: InputBinding[] | null;
  failureCode: string | null;
}): CommercialP25Evidence {
  const source = Array.isArray(input.measurements) ? input.measurements : null;
  const extractedMeasurements: PublicMeasurementP25[] = (source ?? []).slice(0, 30).map((value: unknown) => {
    const item = value && typeof value === "object" && !Array.isArray(value)
      ? value as InputMeasurement : {};
    return {
      parameter: s(item.parameterCode, 60) || "не определён",
      value: format(item.valueNumeric) || format(item.valueText) || "нет значения",
      unit: s(item.unit, 30), qualifier: s(item.qualifier, 100) || null,
      fragment: s(item.rawFragment, 200),
    };
  });
  const bindings: PublicBindingP25[] = (input.bindings ?? []).slice(0, 25).map(binding => {
    const prepared = binding.preparedValue;
    const valueOrigin = !prepared ? "not_prepared" as const
      : prepared.origin === "source_explicit" ? "text" as const : "profile_default" as const;
    const technical = binding.technicalRepresentative?.status === "proposed";
    const candidate = Boolean(binding.selectedLeafValueObjectId || binding.adminNominatedLeafId);
    const leafStatus = candidate ? "candidate" as const : technical ? "technical_proposal" as const : "not_found" as const;
    const valueExplanation = prepared
      ? valueOrigin === "text" ? "Значение подготовлено из исходного текста."
        : "Значение взято из действующего профиля; это не извлечение из объявления."
      : valueIssue(binding.valueReason, binding.valueStatus);
    const leafExplanation = candidate ? "Есть предварительный кандидат листового ОН. Подтверждение человеком ещё требуется."
      : technical ? "Предложен технический представитель; подтвердить его назначение должен администратор."
        : (s(binding.leafEvidenceIssue, 120) || s(binding.targetResolutionReason, 120) || "Листовой ОН не выбран.");
    return {
      parameter: s(binding.parameterCode, 60), targetBranch: s(binding.intermediateTitle, 140) || "Ветвь без названия",
      valueStatus: s(binding.valueStatus, 30), value: prepared ? `${prepared.valueNumeric} ${s(prepared.unit, 24)}`.trim() : null,
      valueOrigin, valueExplanation, matchedMeasurements: Array.isArray(binding.measurements) ? binding.measurements.length : 0,
      leafStatus, leafExplanation, candidateCount: Array.isArray(binding.exactTextCandidates) ? binding.exactTextCandidates.length : 0,
    };
  });
  const extracted = bindings.filter(b => b.valueOrigin === "text").length;
  const defaults = bindings.filter(b => b.valueOrigin === "profile_default").length;
  const notReady = bindings.filter(b => b.valueOrigin === "not_prepared").length;
  const rawPrice = extractedMeasurements.some(m => /^(?:price|money_value|money|currency|cost)$/i.test(m.parameter));
  let conclusion: string;
  if (input.bindings === null) {
    conclusion = `Данные маршрутов пока не проверены (${s(input.failureCode, 100) || "причина не получена"}). Нельзя утверждать, что параметры и ОН готовы.`;
  } else {
    conclusion = `По ${bindings.length} связям профиля: из текста подготовлено ${extracted}, из значений профиля — ${defaults}, не подготовлено — ${notReady}. `;
    conclusion += rawPrice && extracted === 0
      ? "В результатах анализа есть ценовое измерение, но оно не подготовлено ни для одной связи профиля. Проверьте код параметра, единицу и назначение к ветви ОН."
      : !rawPrice && extracted === 0
        ? "Среди возвращённых измерений нет параметра цены. Проверьте, как базовый анализ распознал цену в тексте; наличие числа в объявлении само по себе не подтверждает извлечение."
        : "Проверьте каждую строку ниже: извлечённое измерение и подготовленный факт — разные этапы.";
  }
  return { contract: ADM4B2_P25_EVIDENCE_CONTRACT, analysisCompleted: input.completed,
    extractedMeasurements, reportedMeasurementCount: source?.length ?? null,
    profileCheck: input.bindings === null ? "unavailable" : "checked", profileFailureCode: s(input.failureCode, 100) || null,
    bindings, conclusion };
}
