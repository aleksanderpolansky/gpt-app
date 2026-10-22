/** MVP3 P3.4: scoped deterministic rule, restricted to explicit Quick Capture confirmation. */
import { readActorScopedRuleCatalog, type ScopedRuleActor } from "./actorScopedRules.server";
import { evaluateScopedRulePreview } from "./actorScopedRuleSimulatorV1";
import { SCOPED_RULE_CODE_RE, validateActorScopedRuleV1 } from "./actorScopedRulesV1";

export const P34_SCOPED_CAPTURE_CONTRACT = "ARCTOR_P34_ACTOR_SCOPED_ACTIVITY_CONFIRM_V1" as const;
export type P34RuleSelection = { ruleCode: string; expectedRevision: number; inputMode: "text_activity" };

export function parseP34RuleSelection(value: unknown): P34RuleSelection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(",") !== "expectedRevision,inputMode,ruleCode") return null;
  if (typeof v.ruleCode !== "string" || !SCOPED_RULE_CODE_RE.test(v.ruleCode)) return null;
  if (!Number.isInteger(v.expectedRevision) || (v.expectedRevision as number) < 1 || (v.expectedRevision as number) > 1000000) return null;
  if (v.inputMode !== "text_activity") return null;
  return { ruleCode: v.ruleCode, expectedRevision: v.expectedRevision as number, inputMode: "text_activity" };
}

export async function resolveP34ConfirmedActivity(input: {
  actor: ScopedRuleActor;
  originalText: string;
  locale: string;
  selection: P34RuleSelection;
}) {
  const { rules } = await readActorScopedRuleCatalog(input.actor, input.selection.ruleCode);
  const row = rules.find((r) => r.rule_code === input.selection.ruleCode);
  if (!row) throw new Error("P34_RULE_NOT_FOUND_FOR_ACTIVE_ACTOR");
  if (row.current_revision !== input.selection.expectedRevision) throw new Error("P34_REVISION_CHANGED");
  if (row.status !== "draft") throw new Error("P34_RULE_DISABLED");
  const rule = validateActorScopedRuleV1(row.document_json);
  if (!rule) throw new Error("P34_INVALID_STORED_RULE");
  const decision = evaluateScopedRulePreview(rule, row.status, {
    text: input.originalText,
    localeCode: input.locale,
    inputMode: input.selection.inputMode,
    domainCode: "personal_activities",
    surfaceCode: "activity_quick_capture",
    eventType: "raw_activity_submitted",
  });
  if (!decision.previewMatch || !decision.proposedRawActivity) throw new Error("P34_RULE_DOES_NOT_MATCH");
  return {
    expandedText: decision.proposedRawActivity,
    provenance: {
      contract: P34_SCOPED_CAPTURE_CONTRACT,
      ruleCode: row.rule_code,
      ruleRevision: row.current_revision,
      inputMode: input.selection.inputMode,
      source: "user_confirmed_scoped_rule",
      originalUserText: input.originalText,
      matchReason: decision.reason,
      ruleScope: "active_actor_personal_activities",
    },
  };
}
