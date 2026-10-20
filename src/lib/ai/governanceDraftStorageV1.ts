import { previewGovernanceRuleV1, type GovernanceRuleDraftV1 } from "@/lib/ai/governanceRulePreviewV1";

export const GOVERNANCE_DRAFT_PREFIX = "governance_draft__";
export const GOVERNANCE_DRAFT_CONTRACT = "ARCTOR_AI_GOVERNANCE_DRAFT_STORAGE_V1";
export const GOVERNANCE_DRAFT_LOCALES = ["ru", "pl", "uk", "en", "de", "es", "cs"] as const;
export const GOVERNANCE_DRAFT_CODE = /^[a-z][a-z0-9_]{2,48}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function validateGovernanceDraftDocument(raw: unknown): GovernanceRuleDraftV1 | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== "ai_governance_rule_draft_v1") return null;
  if (raw.kind !== "activity_phrase" && raw.kind !== "publication_price_marker") return null;
  if (raw.ownerScope !== "platform" && raw.ownerScope !== "personal") return null;
  if (!(GOVERNANCE_DRAFT_LOCALES as readonly unknown[]).includes(raw.locale)) return null;
  if (raw.inputMode !== "voice_command" && raw.inputMode !== "text_activity" && raw.inputMode !== "feed_post") return null;
  if (raw.matchMode !== "exact_phrase" && raw.matchMode !== "contains_phrase") return null;
  if (typeof raw.phrase !== "string" || typeof raw.proposedOutput !== "string") return null;
  const draft: GovernanceRuleDraftV1 = {
    version: "ai_governance_rule_draft_v1", kind: raw.kind, ownerScope: raw.ownerScope,
    locale: raw.locale as GovernanceRuleDraftV1["locale"], inputMode: raw.inputMode,
    matchMode: raw.matchMode, phrase: raw.phrase, proposedOutput: raw.proposedOutput,
  };
  const domain = draft.kind === "activity_phrase" ? "personal_activities" : "publications";
  const preview = previewGovernanceRuleV1(draft, {
    text: draft.phrase, domain, inputMode: draft.inputMode, locale: draft.locale,
  });
  if (preview.status === "invalid_rule") return null;
  // This is a frozen description only. It cannot be activated by the draft store.
  return draft;
}

export function governanceDraftStorageCode(code: string) {
  return GOVERNANCE_DRAFT_PREFIX + code;
}
