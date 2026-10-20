/** Strict dry-run of rule routing. Never records an activity, calls AI or changes balances. */
export type PreviewRuleKind = "activity_phrase" | "publication_price_marker";
export type GovernanceRuleDraftV1 = {
  version: "ai_governance_rule_draft_v1";
  kind: PreviewRuleKind;
  ownerScope: "platform" | "personal";
  locale: "ru" | "pl" | "uk" | "en" | "de" | "es" | "cs";
  inputMode: "voice_command" | "text_activity" | "feed_post";
  matchMode: "exact_phrase" | "contains_phrase";
  phrase: string;
  proposedOutput: string;
};
export type GovernancePreviewV1 = {
  matched: boolean;
  status: "matched_simulation_only" | "no_match" | "invalid_rule";
  reason: string;
  proposedOutput: string | null;
  wouldWriteToDatabase: false;
  wouldCallModel: false;
  wouldChargeAiEur: false;
};
const INVALID = (reason: string): GovernancePreviewV1 => ({
  matched: false, status: "invalid_rule", reason, proposedOutput: null,
  wouldWriteToDatabase: false, wouldCallModel: false, wouldChargeAiEur: false,
});
export function previewGovernanceRuleV1(rule: GovernanceRuleDraftV1, input: {
  text: string; domain: "personal_activities" | "publications"; inputMode: GovernanceRuleDraftV1["inputMode"];
  locale: GovernanceRuleDraftV1["locale"];
}): GovernancePreviewV1 {
  if (rule.version !== "ai_governance_rule_draft_v1") return INVALID("Unsupported version");
  if (!rule.phrase.trim() || !rule.proposedOutput.trim() || rule.phrase.length > 120 || rule.proposedOutput.length > 600)
    return INVALID("Missing or oversized phrase / proposed output");
  if (rule.kind === "activity_phrase" && input.domain !== "personal_activities") {
    return {matched:false, status:"no_match", reason:"Domain isolation: not an activity", proposedOutput:null,
      wouldWriteToDatabase:false, wouldCallModel:false, wouldChargeAiEur:false};
  }
  if (rule.kind === "publication_price_marker" && input.domain !== "publications") {
    return {matched:false, status:"no_match", reason:"Domain isolation: not a publication", proposedOutput:null,
      wouldWriteToDatabase:false, wouldCallModel:false, wouldChargeAiEur:false};
  }
  if (rule.kind === "activity_phrase" && rule.inputMode === "feed_post") return INVALID("Activity rule cannot target feed_post");
  if (rule.kind === "publication_price_marker" && rule.inputMode !== "feed_post") return INVALID("Price marker must target feed_post");
  const normal = (text: string) => text.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase(rule.locale);
  const source = normal(input.text);
  const phrase = normal(rule.phrase);
  const matched = rule.inputMode === input.inputMode && rule.locale === input.locale &&
    (rule.matchMode === "exact_phrase" ? source === phrase : source.includes(phrase));
  return {
    matched, status: matched ? "matched_simulation_only" : "no_match",
    reason: matched ? "Matched in sandbox. Result is a proposal, not a confirmed fact." : "Phrase, language or input mode did not match.",
    proposedOutput: matched ? rule.proposedOutput : null,
    wouldWriteToDatabase: false, wouldCallModel: false, wouldChargeAiEur: false,
  };
}
export const GOVERNANCE_SAMPLE_ACTIVITY_RULE_V1: GovernanceRuleDraftV1 = {
  version: "ai_governance_rule_draft_v1",kind:"activity_phrase",ownerScope:"personal",locale:"ru",
  inputMode:"voice_command", matchMode:"exact_phrase",phrase:"один",
  proposedOutput:"Заявленная активность: 12 подтягиваний с отягощением 15 кг (только предложение, без записи факта)",
};
export const GOVERNANCE_SAMPLE_PRICE_RULE_V1: GovernanceRuleDraftV1 = {
  version:"ai_governance_rule_draft_v1",kind:"publication_price_marker",ownerScope:"platform",locale:"ru",
  inputMode:"feed_post",matchMode:"contains_phrase",phrase:"за килограмм",
  proposedOutput:"Предложить детерминированному парсеру проверить цену за единицу; не считать сумму моделью.",
};
