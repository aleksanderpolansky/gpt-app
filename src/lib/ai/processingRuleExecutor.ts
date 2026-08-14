import type { AiLabQuickCaptureRow } from "@/lib/activity/aiLabQuickCapture";
import type { ProcessingRuleCatalogItem, SafeJson } from "@/lib/ai/processingRuleContract";

export const AI_PROCESSING_RULE_EXECUTOR_CONTRACT =
  "AI_PROCESSING_RULE_EXECUTOR_V1" as const;

export type ProcessingRuleApplication = {
  ruleCode: string;
  revision: number | null;
  source: ProcessingRuleCatalogItem["source"];
  priority: number;
  matcherCode: ProcessingRuleCatalogItem["matcherCode"];
  actionCode: ProcessingRuleCatalogItem["actionCode"];
  segmentId: string;
  targetSegmentId: string | null;
  outcome:
    | "attached"
    | "kept"
    | "dropped"
    | "no_adjacent_semantic_activity";
};

export type ActivityQuickCaptureRuleExecution = {
  contractVersion: typeof AI_PROCESSING_RULE_EXECUTOR_CONTRACT;
  rows: AiLabQuickCaptureRow[];
  applications: ProcessingRuleApplication[];
  activeRuleCodes: string[];
};

type Winner = {
  rule: ProcessingRuleCatalogItem;
  matches: true;
};

const BASE_MEASUREMENT_WORDS = new Set([
  "s", "sec", "second", "seconds", "sek", "sekunda", "sekundy", "sekund", "сек", "секунда", "секунды", "секунд", "секунда", "секунди", "секунд",
  "m", "min", "minute", "minutes", "minuta", "minuty", "minut", "minuto", "minutos", "minuten", "минута", "минуты", "минут", "хвилина", "хвилини", "хвилин",
  "h", "hr", "hour", "hours", "godz", "godzina", "godziny", "godzin", "stunde", "stunden", "hora", "horas", "час", "часа", "часов", "година", "години", "годин",
  "mm", "cm", "m", "km", "мм", "см", "м", "км", "meter", "meters", "metre", "metres", "metr", "metry", "metrow", "metrów", "метр", "метра", "метров", "метри", "метрів",
  "g", "kg", "gram", "grams", "kilogram", "kilograms", "гр", "г", "кг", "грамм", "грамма", "граммов", "грам", "кілограма", "кілограмів",
  "kcal", "cal", "ккал", "кал",
  "rep", "reps", "repeat", "repeats", "раз", "раза", "разів", "powt", "powtorzen", "powtórzeń",
  "zl", "pln", "eur", "usd", "czk", "грн", "uah", "zloty", "zlotych", "zł", "złoty", "złotych", "euro", "dollar", "dollars", "доллар", "доллара", "долларов", "евро", "злотых", "злотого",
  "%", "percent", "procent", "процент", "процента", "процентов",
]);

const BASE_TEMPORAL_WORDS = new Set([
  "today", "tomorrow", "yesterday", "tonight", "morning", "afternoon", "evening", "night", "at", "from", "to", "until", "about", "around",
  "сегодня", "завтра", "вчера", "позавчера", "послезавтра", "утром", "днем", "днём", "вечером", "ночью", "в", "с", "до", "около", "примерно",
  "сьогодні", "завтра", "вчора", "позавчора", "післязавтра", "вранці", "вдень", "увечері", "ввечері", "вночі", "о", "з", "до", "близько", "приблизно",
  "dzisiaj", "dziś", "jutro", "wczoraj", "pojutrze", "rano", "wieczorem", "nocą", "o", "od", "do", "około", "okolo",
  "heute", "morgen", "gestern", "übermorgen", "uebermorgen", "morgens", "abends", "nachts", "um", "von", "bis", "gegen",
  "hoy", "mañana", "ayer", "manana", "pasado", "por", "la", "tarde", "noche", "a", "desde", "hasta", "sobre",
  "dnes", "zítra", "zitra", "včera", "vcera", "pozítří", "pozitri", "ráno", "rano", "večer", "vecer", "v", "od", "do", "kolem",
]);

const CONNECTOR_WORDS = new Set([
  "for", "per", "by", "approximately", "approx", "about", "around", "roughly",
  "за", "на", "по", "около", "примерно", "приблизительно",
  "за", "на", "по", "близько", "приблизно",
  "przez", "za", "na", "około", "okolo", "mniej", "więcej", "wiecej",
  "für", "fuer", "pro", "etwa", "ungefähr", "ungefaehr",
  "por", "durante", "aprox", "aproximadamente",
  "za", "na", "asi", "přibližně", "priblizne",
]);

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[–—−]/g, "-")
    .replace(/(\d),(\d)/g, "$1.$2")
    .trim();
}

function tokenize(value: string) {
  return normalize(value)
    .replace(/([^\p{L}\p{N}:.$€£¥₴₽%+-]+)/gu, " ")
    .split(/\s+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function jsonStringArray(value: SafeJson | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => normalize(item)).filter(Boolean)
    : [];
}

function isNumericToken(value: string) {
  return /^[+-]?\d+(?:\.\d+)?$/u.test(value);
}

function isClockToken(value: string) {
  return /^(?:[01]?\d|2[0-3])[:.]?[0-5]\d$/u.test(value) || /^(?:[01]?\d|2[0-3]):[0-5]\d$/u.test(value);
}

function isDateToken(value: string) {
  return /^(?:20\d{2}-\d{1,2}-\d{1,2}|\d{1,2}[./-]\d{1,2}(?:[./-]20\d{2})?)$/u.test(value);
}

function extendedWords(rule: ProcessingRuleCatalogItem) {
  return new Set([
    ...BASE_MEASUREMENT_WORDS,
    ...jsonStringArray(rule.parameters.words),
    ...jsonStringArray(rule.parameters.units),
  ]);
}

function hasMeasurementSignal(row: AiLabQuickCaptureRow, tokens: string[], rule: ProcessingRuleCatalogItem) {
  const units = extendedWords(rule);
  const factSignal = (row.facts ?? []).some((fact) => {
    const code = normalize(fact.parameterCode ?? "");
    return code === "duration" || code === "duration_minutes" || code === "distance" || code === "count" || code === "amount" || code === "mass" || code === "energy" || code === "money" || code === "price" || code === "cost";
  });
  return factSignal || (tokens.some(isNumericToken) && tokens.some((token) => units.has(token)));
}

function isModifierOnlyMeasurement(row: AiLabQuickCaptureRow, rule: ProcessingRuleCatalogItem) {
  const tokens = tokenize(row.sourceFragment ?? "");
  if (tokens.length === 0 || !hasMeasurementSignal(row, tokens, rule)) return false;
  const units = extendedWords(rule);
  return tokens.every((token) =>
    isNumericToken(token) || units.has(token) || CONNECTOR_WORDS.has(token) || /^[€$£¥₴₽%+-]$/u.test(token),
  );
}

function isModifierOnlyTemporal(row: AiLabQuickCaptureRow, rule: ProcessingRuleCatalogItem) {
  const tokens = tokenize(row.sourceFragment ?? "");
  if (tokens.length === 0) return false;
  const extra = new Set(jsonStringArray(rule.parameters.words));
  const hasSignal = Boolean(row.temporal?.occurredAtRaw?.trim()) ||
    tokens.some((token) => isClockToken(token) || isDateToken(token) || BASE_TEMPORAL_WORDS.has(token) || extra.has(token));
  if (!hasSignal) return false;
  return tokens.every((token) =>
    isNumericToken(token) || isClockToken(token) || isDateToken(token) || BASE_TEMPORAL_WORDS.has(token) || CONNECTOR_WORDS.has(token) || extra.has(token),
  );
}

function isIndependentPredicate(row: AiLabQuickCaptureRow) {
  const tokens = tokenize(row.sourceFragment ?? "");
  if (tokens.length === 0) return false;
  return tokens.some((token) =>
    !isNumericToken(token) &&
    !isClockToken(token) &&
    !isDateToken(token) &&
    !BASE_MEASUREMENT_WORDS.has(token) &&
    !BASE_TEMPORAL_WORDS.has(token) &&
    !CONNECTOR_WORDS.has(token) &&
    !/^[€$£¥₴₽%+-]$/u.test(token),
  );
}

function matchesLexemeSet(row: AiLabQuickCaptureRow, rule: ProcessingRuleCatalogItem) {
  const wanted = new Set(jsonStringArray(rule.parameters.words));
  if (wanted.size === 0) return false;
  return tokenize(row.sourceFragment ?? "").some((token) => wanted.has(token));
}

function matches(row: AiLabQuickCaptureRow, rule: ProcessingRuleCatalogItem) {
  switch (rule.matcherCode) {
    case "modifier_only_measurement":
      return isModifierOnlyMeasurement(row, rule);
    case "modifier_only_temporal":
      return isModifierOnlyTemporal(row, rule);
    case "independent_predicate":
      return isIndependentPredicate(row);
    case "lexeme_set":
      return matchesLexemeSet(row, rule);
    default:
      return false;
  }
}

function winnerFor(row: AiLabQuickCaptureRow, rules: ProcessingRuleCatalogItem[]): Winner | null {
  const matched = rules.filter((rule) => matches(row, rule));
  if (matched.length === 0) return null;
  matched.sort((left, right) => right.priority - left.priority || left.ruleCode.localeCompare(right.ruleCode));
  const topPriority = matched[0].priority;
  const top = matched.filter((rule) => rule.priority === topPriority);
  const actions = new Set(top.map((rule) => rule.actionCode));
  if (actions.size > 1) {
    throw new Error(
      `PROCESSING_RULE_CONFLICT_RUNTIME_BLOCKED:${top.map((rule) => rule.ruleCode).join(",")}`,
    );
  }
  return { rule: top[0], matches: true };
}

function rowSegmentId(row: AiLabQuickCaptureRow, index: number) {
  return row.segmentId?.trim() || `segment-${index + 1}`;
}

function dedupeFacts(rows: AiLabQuickCaptureRow[]) {
  const seen = new Set<string>();
  const result: NonNullable<AiLabQuickCaptureRow["facts"]> = [];
  for (const row of rows) {
    for (const fact of row.facts ?? []) {
      const key = JSON.stringify([
        fact.parameterCode ?? null,
        fact.unit ?? null,
        fact.valueType ?? null,
        fact.valueNumeric ?? null,
        fact.valueText ?? null,
        fact.valueBoolean ?? null,
        fact.rawFragment ?? null,
      ]);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(fact);
      }
    }
  }
  return result;
}

function mergeRows(base: AiLabQuickCaptureRow, attached: Array<{ index: number; row: AiLabQuickCaptureRow }>, baseIndex: number) {
  const ordered = [...attached, { index: baseIndex, row: base }].sort((a, b) => a.index - b.index);
  const sourceFragment = ordered
    .map(({ row }) => row.sourceFragment?.trim() ?? "")
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const temporalSource = ordered.find(({ row }) => row.temporal?.occurredAtRaw?.trim() || row.temporal?.occurredAtIso);
  return {
    ...base,
    sourceFragment: sourceFragment || base.sourceFragment,
    facts: dedupeFacts(ordered.map(({ row }) => row)),
    temporal: temporalSource?.row.temporal ?? base.temporal,
  } satisfies AiLabQuickCaptureRow;
}

function preferredDirection(rule: ProcessingRuleCatalogItem) {
  return typeof rule.parameters.preferredDirection === "string"
    ? rule.parameters.preferredDirection
    : "previous_then_next";
}

export function applyActivityQuickCaptureProcessingRules(input: {
  rows: AiLabQuickCaptureRow[];
  rules: ProcessingRuleCatalogItem[];
}): ActivityQuickCaptureRuleExecution {
  const activeRules = input.rules
    .filter((rule) => rule.status === "active" && rule.runtimeTargets.includes("activity_quick_capture"))
    .sort((left, right) => right.priority - left.priority || left.ruleCode.localeCompare(right.ruleCode));
  const winners = input.rows.map((row) => winnerFor(row, activeRules));
  const semanticIndexes = input.rows
    .map((_, index) => ({ index, winner: winners[index] }))
    .filter(({ winner }) => !winner || winner.rule.actionCode === "keep_independent_activity")
    .map(({ index }) => index);
  const attachments = new Map<number, Array<{ index: number; row: AiLabQuickCaptureRow }>>();
  const dropped = new Set<number>();
  const applications: ProcessingRuleApplication[] = [];

  for (let index = 0; index < input.rows.length; index += 1) {
    const winner = winners[index];
    if (!winner) continue;
    const segmentId = rowSegmentId(input.rows[index], index);
    const action = winner.rule.actionCode;

    if (action === "keep_independent_activity") {
      applications.push({
        ruleCode: winner.rule.ruleCode,
        revision: winner.rule.revision,
        source: winner.rule.source,
        priority: winner.rule.priority,
        matcherCode: winner.rule.matcherCode,
        actionCode: action,
        segmentId,
        targetSegmentId: segmentId,
        outcome: "kept",
      });
      continue;
    }

    if (action === "drop_from_activity_candidates") {
      dropped.add(index);
      applications.push({
        ruleCode: winner.rule.ruleCode,
        revision: winner.rule.revision,
        source: winner.rule.source,
        priority: winner.rule.priority,
        matcherCode: winner.rule.matcherCode,
        actionCode: action,
        segmentId,
        targetSegmentId: null,
        outcome: "dropped",
      });
      continue;
    }

    const previous = [...semanticIndexes].reverse().find((candidate) => candidate < index);
    const next = semanticIndexes.find((candidate) => candidate > index);
    const direction = preferredDirection(winner.rule);
    const targetIndex = direction === "next_then_previous" ? (next ?? previous) : (previous ?? next);

    dropped.add(index);
    if (typeof targetIndex !== "number") {
      applications.push({
        ruleCode: winner.rule.ruleCode,
        revision: winner.rule.revision,
        source: winner.rule.source,
        priority: winner.rule.priority,
        matcherCode: winner.rule.matcherCode,
        actionCode: action,
        segmentId,
        targetSegmentId: null,
        outcome: "no_adjacent_semantic_activity",
      });
      continue;
    }

    const current = attachments.get(targetIndex) ?? [];
    current.push({ index, row: input.rows[index] });
    attachments.set(targetIndex, current);
    applications.push({
      ruleCode: winner.rule.ruleCode,
      revision: winner.rule.revision,
      source: winner.rule.source,
      priority: winner.rule.priority,
      matcherCode: winner.rule.matcherCode,
      actionCode: action,
      segmentId,
      targetSegmentId: rowSegmentId(input.rows[targetIndex], targetIndex),
      outcome: "attached",
    });
  }

  const rows = input.rows
    .map((row, index) => ({ row, index }))
    .filter(({ index }) => !dropped.has(index))
    .map(({ row, index }) => mergeRows(row, attachments.get(index) ?? [], index));

  return {
    contractVersion: AI_PROCESSING_RULE_EXECUTOR_CONTRACT,
    rows,
    applications,
    activeRuleCodes: activeRules.map((rule) => rule.ruleCode),
  };
}
