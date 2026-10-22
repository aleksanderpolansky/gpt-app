/** ARCTor MVP3 P3.3: pure, deterministic, preview-only interpreter for P3.2 documents. */
import {
  validateActorScopedRuleV1,
  type ActorScopedRuleDocumentV1,
} from "./actorScopedRulesV1";

export const P33_SIMULATION_CONTRACT = "ARCTOR_ACTOR_SCOPED_RULE_P33_SIMULATION_V1" as const;

export type P33Input = {
  text: string;
  domainCode: string;
  surfaceCode: string;
  eventType: string;
  localeCode: string;
  inputMode: string;
};

export type P33Reason =
  | "MATCH_PREVIEW_ONLY"
  | "RULE_DISABLED"
  | "INVALID_RULE"
  | "EMPTY_TEXT"
  | "WRONG_DOMAIN"
  | "WRONG_SURFACE"
  | "WRONG_EVENT"
  | "WRONG_LOCALE"
  | "WRONG_INPUT_MODE"
  | "NO_MATCH";

export type P33Decision = {
  previewMatch: boolean;
  reason: P33Reason;
  proposedRawActivity: string | null;
};

function normalized(value: string): string {
  // Whole-input matching; no substring search, punctuation stripping, or negation guessing.
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

export function evaluateScopedRulePreview(
  document: ActorScopedRuleDocumentV1,
  status: "draft" | "disabled",
  input: P33Input,
): P33Decision {
  const rule = validateActorScopedRuleV1(document);
  const no = (reason: P33Reason): P33Decision => ({
    previewMatch: false, reason, proposedRawActivity: null,
  });
  if (!rule) return no("INVALID_RULE");
  if (status === "disabled") return no("RULE_DISABLED");
  if (!input.text.trim()) return no("EMPTY_TEXT");
  if (input.domainCode !== rule.domainCode) return no("WRONG_DOMAIN");
  if (input.surfaceCode !== rule.surfaceCode) return no("WRONG_SURFACE");
  if (input.eventType !== rule.eventType) return no("WRONG_EVENT");
  if (input.localeCode !== rule.localeCode) return no("WRONG_LOCALE");
  if (input.inputMode !== rule.inputMode) return no("WRONG_INPUT_MODE");
  const candidate = normalized(input.text);
  // Both P3.2 match types use *whole phrase* semantics. In lexeme_set,
  // lexemes are alternatives; this is not a substring/keyword matcher.
  if (!rule.matcher.lexemes.some((item) => normalized(item) === candidate)) return no("NO_MATCH");
  return {
    previewMatch: true,
    reason: "MATCH_PREVIEW_ONLY",
    proposedRawActivity: rule.expandedText,
  };
}

export type P33Fixture = P33Input & { label: string; expectedMatch: boolean };

/** Build repeatable, user-neutral fixtures from any saved P3.2 rule. */
export function createScopedRuleFixtures(document: ActorScopedRuleDocumentV1): P33Fixture[] {
  const rule = validateActorScopedRuleV1(document);
  if (!rule) return [];
  const phrase = rule.matcher.lexemes[0];
  const base: P33Input = {
    text: phrase,
    domainCode: rule.domainCode,
    surfaceCode: rule.surfaceCode,
    eventType: rule.eventType,
    localeCode: rule.localeCode,
    inputMode: rule.inputMode,
  };
  const fixture = (label: string, expectedMatch: boolean, patch: Partial<P33Input> = {}): P33Fixture =>
    ({ label, expectedMatch, ...base, ...patch });
  const otherLocale = (["ru", "pl", "uk", "en", "de", "es", "cs"] as const)
    .find((locale) => locale !== rule.localeCode) ?? "en";
  const otherMode = rule.inputMode === "text_activity" ? "voice_command" : "text_activity";
  const rows = [
    fixture("exact_input", true),
    fixture("surrounding_whitespace", true, { text: `  ${phrase}  ` }),
    fixture("different_case", true, { text: phrase.toLocaleUpperCase() }),
    fixture("extra_word", false, { text: `${phrase} ещё` }),
    fixture("prefix_negation", false, { text: `не ${phrase}` }),
    fixture("suffix_numeric", false, { text: `${phrase} 2 кг` }),
    fixture("punctuation", false, { text: `${phrase}.` }),
    fixture("multi_event_input", false, { text: `${phrase}; другое действие` }),
    fixture("empty_input", false, { text: "" }),
    fixture("other_locale", false, { localeCode: otherLocale }),
    fixture("other_input_mode", false, { inputMode: otherMode }),
    fixture("other_domain", false, { domainCode: "publications" }),
    fixture("other_surface", false, { surfaceCode: "feed" }),
    fixture("other_event", false, { eventType: "publication_submitted" }),
  ];
  if (rule.matcher.lexemes.length > 1) {
    rows.push(fixture("second_lexeme", true, { text: rule.matcher.lexemes[1] }));
  }
  return rows;
}
