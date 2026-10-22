import { supabase } from "../../../lib/supabase";
import { ACTOR_SCOPED_RULE_CONTRACT, SCOPED_RULE_CODE_RE, type ActorScopedRuleDocumentV1 } from "./actorScopedRulesV1";

export type ScopedRuleActor = { appUserId: string; actorId: string };

type StoredRule = {
  rule_code: string; current_revision: number; status: "draft" | "disabled";
  document_json: ActorScopedRuleDocumentV1; created_at: string; updated_at: string;
};

export async function readActorScopedRuleCatalog(actor: ScopedRuleActor, code: string | null) {
  let query = supabase.from("actor_ai_scoped_rules_v1")
    .select("rule_code,current_revision,status,document_json,created_at,updated_at")
    .eq("owner_user_id", actor.appUserId).eq("owner_actor_id", actor.actorId)
    .order("updated_at", { ascending: false }).limit(50);
  if (code) query = query.eq("rule_code", code);
  const { data, error } = await query;
  if (error) throw new Error("P32_RULE_CATALOG_UNAVAILABLE");
  const rules = (data ?? []) as StoredRule[];

  let history: Array<{ revision: number; action_code: string; document_json: ActorScopedRuleDocumentV1; created_at: string }> = [];
  if (code && SCOPED_RULE_CODE_RE.test(code)) {
    const { data: rows, error: historyError } = await supabase.from("actor_ai_scoped_rule_revisions_v1")
      .select("revision,action_code,document_json,created_at")
      .eq("owner_user_id", actor.appUserId).eq("owner_actor_id", actor.actorId)
      .eq("rule_code", code).order("revision", { ascending: false }).limit(30);
    if (historyError) throw new Error("P32_RULE_HISTORY_UNAVAILABLE");
    history = (rows ?? []) as typeof history;
  }
  return { contract: ACTOR_SCOPED_RULE_CONTRACT, rules, history, truncated: !code && rules.length === 50,
    runtimeActivation: false, rawActivityWrites: false, factWrites: false, aiCalls: false };
}

export async function saveActorScopedRule(params: {
  actor: ScopedRuleActor; ruleCode: string; expectedRevision: number;
  action: "save" | "disable"; document: ActorScopedRuleDocumentV1 | null;
}) {
  const { data, error } = await supabase.rpc("arctor_actor_scoped_rule_save_v1", {
    p_owner_user_id: params.actor.appUserId,
    p_owner_actor_id: params.actor.actorId,
    p_rule_code: params.ruleCode,
    p_expected_revision: params.expectedRevision,
    p_action: params.action,
    p_document: params.document,
  });
  if (error) {
    if (error.code === "P0001") throw new Error("P32_REVISION_CONFLICT");
    if (error.code === "PGRST202" || error.code === "42883" || error.code === "42P01")
      throw new Error("P32_SQL_INSTALL_REQUIRED");
    throw new Error("P32_RULE_SAVE_FAILED");
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { ruleCode: params.ruleCode, revision: row?.saved_revision ?? null, status: row?.saved_status ?? "draft",
    runtimeActivation: false, rawActivityWrites: false, factWrites: false, aiCalls: false };
}
