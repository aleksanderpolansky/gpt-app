/** P3.2 descriptive, actor-owned rules. NOT a runtime executor. */
export const ACTOR_SCOPED_RULE_CONTRACT = "ARCTOR_ACTOR_SCOPED_RULE_P32_V1" as const;
export const ACTOR_SCOPED_RULE_VERSION = "arctor_actor_scoped_rule_v1" as const;
export const SCOPED_RULE_LANGUAGES = ["ru", "pl", "uk", "en", "de", "es", "cs"] as const;
export const SCOPED_RULE_INPUT_MODES = ["text_activity", "voice_command"] as const;
export const SCOPED_RULE_MATCH_TYPES = ["exact_phrase", "lexeme_set"] as const;
export const SCOPED_RULE_CODE_RE = /^[a-z][a-z0-9_]{2,47}$/;

export type ScopedRuleLocale = (typeof SCOPED_RULE_LANGUAGES)[number];
export type ScopedRuleInputMode = (typeof SCOPED_RULE_INPUT_MODES)[number];
export type ScopedRuleMatchType = (typeof SCOPED_RULE_MATCH_TYPES)[number];

export type ActorScopedRuleDocumentV1 = {
  version: typeof ACTOR_SCOPED_RULE_VERSION;
  domainCode: "personal_activities";
  surfaceCode: "activity_quick_capture";
  eventType: "raw_activity_submitted";
  localeCode: ScopedRuleLocale;
  inputMode: ScopedRuleInputMode;
  matcher: { type: ScopedRuleMatchType; lexemes: string[] };
  actionCode: "expand_raw_activity_text";
  expandedText: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isEnum<T extends string>(v: unknown, values: readonly T[]): v is T {
  return typeof v === "string" && values.some((item) => item === v);
}
const hasControl = (v: string) => /[\u0000-\u001F\u007F]/u.test(v);

export function validateActorScopedRuleV1(value: unknown): ActorScopedRuleDocumentV1 | null {
  if (!isRecord(value) || !isRecord(value.matcher)) return null;
  if (value.version !== ACTOR_SCOPED_RULE_VERSION || value.domainCode !== "personal_activities" ||
      value.surfaceCode !== "activity_quick_capture" || value.eventType !== "raw_activity_submitted" ||
      value.actionCode !== "expand_raw_activity_text") return null;
  if (!isEnum(value.localeCode, SCOPED_RULE_LANGUAGES) ||
      !isEnum(value.inputMode, SCOPED_RULE_INPUT_MODES) ||
      !isEnum(value.matcher.type, SCOPED_RULE_MATCH_TYPES)) return null;
  if (!Array.isArray(value.matcher.lexemes) || value.matcher.lexemes.length < 1 || value.matcher.lexemes.length > 8) return null;
  const lexemes = value.matcher.lexemes;
  if (!lexemes.every((x): x is string => typeof x === "string" && x.length >= 1 && x.length <= 80 &&
      x === x.trim() && !hasControl(x))) return null;
  if (new Set(lexemes.map((x) => x.toLocaleLowerCase())).size !== lexemes.length) return null;
  if (value.matcher.type === "exact_phrase" && lexemes.length !== 1) return null;
  if (typeof value.expandedText !== "string" || value.expandedText.length < 1 ||
      value.expandedText.length > 600 || value.expandedText !== value.expandedText.trim() ||
      hasControl(value.expandedText)) return null;
  return {
    version: ACTOR_SCOPED_RULE_VERSION,
    domainCode: "personal_activities", surfaceCode: "activity_quick_capture",
    eventType: "raw_activity_submitted", localeCode: value.localeCode,
    inputMode: value.inputMode, matcher: { type: value.matcher.type, lexemes: [...lexemes] },
    actionCode: "expand_raw_activity_text", expandedText: value.expandedText,
  };
}

export function createExampleScopedRuleV1(): ActorScopedRuleDocumentV1 {
  return {
    version: ACTOR_SCOPED_RULE_VERSION, domainCode: "personal_activities",
    surfaceCode: "activity_quick_capture", eventType: "raw_activity_submitted",
    localeCode: "ru", inputMode: "text_activity",
    matcher: { type: "exact_phrase", lexemes: ["один"] },
    actionCode: "expand_raw_activity_text",
    expandedText: "12 подтягиваний с дополнительным весом 15 кг",
  };
}
