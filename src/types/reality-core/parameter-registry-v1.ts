/**
 * ARCTor Reality Core R1-2 parameter registry.
 * This is a technical dictionary, not a user-facing domain entity.
 */

import type {
  AggregationMethod,
  WindowCode,
} from "./reality-core-contracts-v1";

export const PARAMETER_REGISTRY_VERSION = "parameter-registry-v1" as const;

export type ParameterValueType = "numeric" | "text" | "boolean" | "timestamp";
export type ParameterDimension =
  | "time"
  | "distance"
  | "count"
  | "volume"
  | "mass"
  | "energy"
  | "money"
  | "rate"
  | "score"
  | "temperature"
  | "text"
  | "boolean"
  | "timestamp";

export interface ParameterDefinition {
  readonly code: string;
  readonly labelRu: string;
  readonly dimension: ParameterDimension;
  readonly valueType: ParameterValueType;
  readonly canonicalUnit: string;
  readonly allowedUnits: readonly string[];
  readonly aggregationMethod: AggregationMethod;
  readonly defaultWindow: WindowCode;
  readonly allowNegative: boolean;
  readonly conversionVersion: typeof PARAMETER_REGISTRY_VERSION;
  readonly notesRu: string;
}

export const UNIT_CONVERSIONS_TO_CANONICAL: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = {
  minute: { second: 1 / 60, minute: 1, hour: 60 },
  meter: { meter: 1, kilometer: 1000 },
  liter: { milliliter: 0.001, liter: 1 },
  kilogram: { gram: 0.001, kilogram: 1 },
  kcal: { kcal: 1, kilojoule: 1 / 4.184 },
  beat_per_minute: { beat_per_minute: 1 },
  repetition: { repetition: 1 },
  set: { set: 1 },
  step: { step: 1 },
  count: { count: 1 },
  score_0_10: { score_0_10: 1 },
  pln: { pln: 1 },
  eur: { eur: 1 },
  usd: { usd: 1 },
  kilometer_per_hour: { kilometer_per_hour: 1 },
  celsius: { celsius: 1 },
  boolean: { boolean: 1 },
  text: { text: 1 },
  timestamp: { timestamp: 1 },
};

export const PARAMETER_REGISTRY_V1 = {
  duration: {
    code: "duration",
    labelRu: "Продолжительность",
    dimension: "time",
    valueType: "numeric",
    canonicalUnit: "minute",
    allowedUnits: ["second", "minute", "hour"],
    aggregationMethod: "sum",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Продолжительность активности или её части.",
  },
  distance: {
    code: "distance",
    labelRu: "Расстояние",
    dimension: "distance",
    valueType: "numeric",
    canonicalUnit: "meter",
    allowedUnits: ["meter", "kilometer"],
    aggregationMethod: "sum",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Пройденное, пробежанное или перемещённое расстояние.",
  },
  step_count: {
    code: "step_count",
    labelRu: "Количество шагов",
    dimension: "count",
    valueType: "numeric",
    canonicalUnit: "step",
    allowedUnits: ["step"],
    aggregationMethod: "sum",
    defaultWindow: "day",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Шаги за событие или период.",
  },
  repetition_count: {
    code: "repetition_count",
    labelRu: "Количество повторений",
    dimension: "count",
    valueType: "numeric",
    canonicalUnit: "repetition",
    allowedUnits: ["repetition"],
    aggregationMethod: "sum",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Повторения упражнения.",
  },
  set_count: {
    code: "set_count",
    labelRu: "Количество подходов",
    dimension: "count",
    valueType: "numeric",
    canonicalUnit: "set",
    allowedUnits: ["set"],
    aggregationMethod: "sum",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Подходы упражнения.",
  },
  liquid_volume: {
    code: "liquid_volume",
    labelRu: "Объём жидкости",
    dimension: "volume",
    valueType: "numeric",
    canonicalUnit: "liter",
    allowedUnits: ["milliliter", "liter"],
    aggregationMethod: "sum",
    defaultWindow: "day",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Выпитый, использованный или переданный объём жидкости.",
  },
  body_mass: {
    code: "body_mass",
    labelRu: "Масса тела",
    dimension: "mass",
    valueType: "numeric",
    canonicalUnit: "kilogram",
    allowedUnits: ["gram", "kilogram"],
    aggregationMethod: "latest",
    defaultWindow: "day",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Измеренная масса тела на момент наблюдения.",
  },
  object_mass: {
    code: "object_mass",
    labelRu: "Масса объекта",
    dimension: "mass",
    valueType: "numeric",
    canonicalUnit: "kilogram",
    allowedUnits: ["gram", "kilogram"],
    aggregationMethod: "latest",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Масса товара, груза, упражнения или иного объекта.",
  },
  energy_intake: {
    code: "energy_intake",
    labelRu: "Полученная энергия",
    dimension: "energy",
    valueType: "numeric",
    canonicalUnit: "kcal",
    allowedUnits: ["kcal", "kilojoule"],
    aggregationMethod: "sum",
    defaultWindow: "day",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Энергия, полученная с пищей и напитками.",
  },
  energy_expenditure: {
    code: "energy_expenditure",
    labelRu: "Потраченная энергия",
    dimension: "energy",
    valueType: "numeric",
    canonicalUnit: "kcal",
    allowedUnits: ["kcal", "kilojoule"],
    aggregationMethod: "sum",
    defaultWindow: "day",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Расчётный или измеренный расход энергии.",
  },
  energy_balance: {
    code: "energy_balance",
    labelRu: "Энергетический баланс",
    dimension: "energy",
    valueType: "numeric",
    canonicalUnit: "kcal",
    allowedUnits: ["kcal", "kilojoule"],
    aggregationMethod: "sum",
    defaultWindow: "day",
    allowNegative: true,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Производный параметр: intake - expenditure. Отрицательное значение допустимо.",
  },
  monetary_amount_pln: {
    code: "monetary_amount_pln",
    labelRu: "Денежная сумма PLN",
    dimension: "money",
    valueType: "numeric",
    canonicalUnit: "pln",
    allowedUnits: ["pln"],
    aggregationMethod: "sum",
    defaultWindow: "event",
    allowNegative: true,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Платёж, доход, возврат или стоимость в PLN. Знак зависит от способа записи.",
  },
  heart_rate: {
    code: "heart_rate",
    labelRu: "Частота сердечных сокращений",
    dimension: "rate",
    valueType: "numeric",
    canonicalUnit: "beat_per_minute",
    allowedUnits: ["beat_per_minute"],
    aggregationMethod: "average",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Средний, минимальный или максимальный пульс должен различаться отдельным context field или parameter code расширения.",
  },
  pain_intensity: {
    code: "pain_intensity",
    labelRu: "Интенсивность боли",
    dimension: "score",
    valueType: "numeric",
    canonicalUnit: "score_0_10",
    allowedUnits: ["score_0_10"],
    aggregationMethod: "latest",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Субъективная интенсивность боли от 0 до 10.",
  },
  state_score: {
    code: "state_score",
    labelRu: "Оценка состояния",
    dimension: "score",
    valueType: "numeric",
    canonicalUnit: "score_0_10",
    allowedUnits: ["score_0_10"],
    aggregationMethod: "latest",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Общая субъективная оценка, пока специализированного parameter_code нет.",
  },
  speed: {
    code: "speed",
    labelRu: "Скорость",
    dimension: "rate",
    valueType: "numeric",
    canonicalUnit: "kilometer_per_hour",
    allowedUnits: ["kilometer_per_hour"],
    aggregationMethod: "average",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Средняя скорость движения.",
  },
  temperature: {
    code: "temperature",
    labelRu: "Температура",
    dimension: "temperature",
    valueType: "numeric",
    canonicalUnit: "celsius",
    allowedUnits: ["celsius"],
    aggregationMethod: "latest",
    defaultWindow: "event",
    allowNegative: true,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Температура тела, среды или объекта; контекст задаётся связью с ЦО/ОН.",
  },
  observed_text: {
    code: "observed_text",
    labelRu: "Текстовое наблюдение",
    dimension: "text",
    valueType: "text",
    canonicalUnit: "text",
    allowedUnits: ["text"],
    aggregationMethod: "none",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Нейтральное текстовое наблюдение, которое ещё не нормализовано в специальный параметр.",
  },
  boolean_state: {
    code: "boolean_state",
    labelRu: "Логическое состояние",
    dimension: "boolean",
    valueType: "boolean",
    canonicalUnit: "boolean",
    allowedUnits: ["boolean"],
    aggregationMethod: "latest",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Да/нет, выполнено/не выполнено, присутствует/отсутствует.",
  },
  observed_at: {
    code: "observed_at",
    labelRu: "Момент наблюдения",
    dimension: "timestamp",
    valueType: "timestamp",
    canonicalUnit: "timestamp",
    allowedUnits: ["timestamp"],
    aggregationMethod: "latest",
    defaultWindow: "event",
    allowNegative: false,
    conversionVersion: PARAMETER_REGISTRY_VERSION,
    notesRu: "Временная отметка как значение параметра, когда она является наблюдаемым содержанием.",
  },
} as const satisfies Readonly<Record<string, ParameterDefinition>>;

export type ParameterCode = keyof typeof PARAMETER_REGISTRY_V1;

export function getParameterDefinition(code: string): ParameterDefinition | null {
  return Object.prototype.hasOwnProperty.call(PARAMETER_REGISTRY_V1, code)
    ? PARAMETER_REGISTRY_V1[code as ParameterCode]
    : null;
}

export function convertToCanonicalUnit(
  code: string,
  value: number,
  unitCode: string,
): number {
  const definition = getParameterDefinition(code);
  if (!definition) {
    throw new Error(`Unknown parameter_code: ${code}`);
  }
  if (definition.valueType !== "numeric") {
    throw new Error(`Parameter ${code} is not numeric.`);
  }
  if (!definition.allowedUnits.includes(unitCode)) {
    throw new Error(`Unit ${unitCode} is not allowed for parameter ${code}.`);
  }
  const conversionMap = UNIT_CONVERSIONS_TO_CANONICAL[definition.canonicalUnit];
  const multiplier = conversionMap?.[unitCode];
  if (multiplier === undefined) {
    throw new Error(
      `No ${PARAMETER_REGISTRY_VERSION} conversion from ${unitCode} to ${definition.canonicalUnit}.`,
    );
  }
  const converted = value * multiplier;
  if (!definition.allowNegative && converted < 0) {
    throw new Error(`Parameter ${code} does not allow negative values.`);
  }
  return converted;
}
