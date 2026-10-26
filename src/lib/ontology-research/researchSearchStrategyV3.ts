/** ONTO-AI.3: bounded, deterministic search options. Does not execute AI or write data. */
import { scoreContextCandidate } from "@/lib/ontology-research/contextSearchV2";

export type OntoResearchSearchOptions = {
  allLocales: boolean;
  includePaths: boolean;
  includeDefinitions: boolean;
  includeTemplates: boolean;
  maxOnMatches: 15 | 35 | 100;
  extraTerms: string[];
};
export const DEFAULT_SEARCH_OPTIONS: OntoResearchSearchOptions = {
  allLocales: true,
  includePaths: true,
  includeDefinitions: true,
  includeTemplates: true,
  maxOnMatches: 35,
  extraTerms: [],
};
export const DEFAULT_ONTO_SEARCH_SCRIPT = [
  "Исследуй существующую онтологию ARCTor до предложения новых объектов наблюдения (ОН).",
  "Проверь точные совпадения, синонимы, локализации семи языков, возможные омонимы,",
  "названия в других ветвях, смысловые аналоги, отношения и типовые активности.",
  "Разделяй измерение продолжительности сна и субъективную оценку качества сна:",
  "для них могут требоваться разные типовые активности.",
  "В каждом подтверждённом совпадении указывай UUID и полный путь исключительно из переданного каталога.",
  "Если объект не найден в ограниченной выдаче, это НЕ доказывает его отсутствие.",
  "Сформулируй дополнительные короткие поисковые выражения по одному на строку в массиве nextSteps",
  "строго в формате [SEARCH] термин (например: [SEARCH] восстановление после сна).",
  "Отдельно обозначь неопределённости; не создавай и не изменяй никаких данных.",
].join("\n");
export function normalizeExtraTerms(value: string | string[]): string[] {
  const source = Array.isArray(value) ? value.join("\n") : value;
  const unique = new Set<string>();
  for (const term of source.split(/[\n;]+/)) {
    const normalized = term.trim().replace(/\s+/g, " ");
    if (normalized.length < 2 || normalized.length > 90) continue;
    unique.add(normalized);
    if (unique.size === 6) break;
  }
  return [...unique];
}
export function parseSearchOptions(params: URLSearchParams): OntoResearchSearchOptions {
  function flag(name: string, fallback: boolean): boolean {
    const raw = params.get(name);
    if (raw === null) return fallback;
    if (raw !== "0" && raw !== "1") throw new Error(`INVALID_SEARCH_OPTION_${name}`);
    return raw === "1";
  }
  const n = params.get("onLimit") ?? "35";
  if (n !== "15" && n !== "35" && n !== "100") throw new Error("INVALID_SEARCH_LIMIT");
  const extras = params.get("terms") ?? "";
  if (extras.length > 650) throw new Error("SEARCH_EXTRA_TERMS_TOO_LONG");
  return {
    allLocales: flag("allLocales", true),
    includePaths: flag("paths", true),
    includeDefinitions: flag("definitions", true),
    includeTemplates: flag("templates", true),
    maxOnMatches: Number(n) as 15 | 35 | 100,
    extraTerms: normalizeExtraTerms(extras),
  };
}
export function searchOptionParams(options: OntoResearchSearchOptions): URLSearchParams {
  const params = new URLSearchParams({
    allLocales: options.allLocales ? "1" : "0",
    paths: options.includePaths ? "1" : "0",
    definitions: options.includeDefinitions ? "1" : "0",
    templates: options.includeTemplates ? "1" : "0",
    onLimit: String(options.maxOnMatches),
  });
  if (options.extraTerms.length) params.set("terms", options.extraTerms.join("\n"));
  return params;
}
export function scoreSearchCandidate(input: {
  terms: string[];
  titles: string[];
  paths?: string[];
  extra?: string[];
}): number {
  return Math.max(0, ...input.terms.slice(0, 7).map(query => scoreContextCandidate({
    query, titles: input.titles, paths: input.paths, extra: input.extra,
  })));
}
export function suggestedSearchQueries(result: unknown): string[] {
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  const steps = (result as Record<string, unknown>).nextSteps;
  if (!Array.isArray(steps)) return [];
  const lines = steps.filter((x): x is string => typeof x === "string").flatMap(s => {
    const match = /^\s*\[(?:SEARCH|ПОИСК)\]\s*(.+)$/i.exec(s);
    return match ? [match[1]] : [];
  });
  return normalizeExtraTerms(lines);
}
