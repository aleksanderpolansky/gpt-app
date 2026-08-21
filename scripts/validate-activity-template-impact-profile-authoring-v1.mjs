import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const has = (rel, ...needles) => needles.every((needle) => read(rel).includes(needle));
const lacks = (rel, ...needles) => needles.every((needle) => !read(rel).includes(needle));
const check = (name, passed, detail = "") => checks.push({ name, passed: Boolean(passed), detail });

const sql = "supabase/manual-applied/20260821_activity_template_impact_profile_authoring_v1.sql";
const post = "supabase/diagnostics/20260821_activity_template_impact_profile_authoring_v1_postcheck_READONLY.sql";
const rollback = "supabase/rollbacks/20260821_activity_template_impact_profile_authoring_v1_ROLLBACK.sql";
const api = "src/app/api/activity-template-impact-profiles/route.ts";
const detailApi = "src/app/api/activity-template-impact-profiles/[id]/route.ts";
const ui = "src/app/activity-templates/activity-template-impact-profile-editor.tsx";
const page = "src/app/activity-templates/page.tsx";
const contract = "src/lib/activity-template-impact-profile-contract.ts";
const recovery = "docs/recovery/ARCTOR_ACTIVITY_TEMPLATE_IMPACT_PROFILE_AUTHORING_V1_RU.md";
const evidence = "docs/recovery/evidence/HELP_FILES/ARCTOR_ACTIVITY_TEMPLATE_IMPACT_PROFILE_AUTHORING_V1_EVIDENCE.json";

for (const file of [sql, post, rollback, api, detailApi, ui, page, contract, recovery, evidence]) {
  check(`FILE_EXISTS:${file}`, fs.existsSync(path.join(root, file)));
}

check("SCHEMA_REUSES_ACTIVITY_TEMPLATES", has(sql, "references public.activity_templates(id)", "activity_template_impact_profiles_v1"));
check("SCHEMA_VERSIONED_PROFILE", has(sql, "version_no integer not null", "idx_atip_v1_one_active_profile", "status = 'active'"));
check("SCHEMA_PROCESS_PARAMETER_ALWAYS", has(sql, "'process_count', 'Количество процессов'", "Every linked object always receives one virtual process"));
check("SCHEMA_EVENT_PARAMETERS_CONTROLLED", has(sql, "parameter_code in ('process_count','repetition_count','distance_m','duration_seconds')"));
check("SCHEMA_ROUTES_CONTROLLED", has(sql, "aggregation_code in ('copy','count','sum','max','min','avg')"));
check("SCHEMA_NO_ARBITRARY_FORMULA", lacks(sql, "formula_expression", "EXECUTE format", "eval("));
check("SCHEMA_BIDIRECTIONAL_INDEXES", has(sql, "idx_atipol_v1_profile_target", "idx_atipol_v1_target_profile"));
check("SCHEMA_PROFILE_SNAPSHOT_ON_EVENT", has(sql, "impact_profile_id uuid", "trg_activity_events_impact_profile_v1"));
check("SCHEMA_NO_HISTORY_BACKFILL", lacks(sql, "update public.activity_events set impact_profile_id", "insert into public.activity_object_facts"));
check("SCHEMA_VIRTUAL_OBJECT_VIEW", has(sql, "activity_event_profile_object_contributions_v1", "1::numeric as process_count"));
check("SCHEMA_VIRTUAL_PARAMETER_VIEW", has(sql, "activity_event_virtual_parameter_contributions_v1", "target_parameter_code", "value_numeric"));
check("SCHEMA_EVENT_METADATA_REPETITIONS", has(sql, "repetition_count", "repetitionCount", "reps"));
check("SCHEMA_EVENT_METADATA_DISTANCE", has(sql, "distance_m", "distanceM"));
check("SCHEMA_DURATION_FALLBACK", has(sql, "e.duration_minutes::numeric * 60"));
check("SCHEMA_ATOMIC_SAVE_RPC", has(sql, "save_activity_template_impact_profile_v1", "security definer", "for update"));
check("SCHEMA_TARGET_ACCESS_GUARD", has(sql, "ontology_node_role_code = 'leaf'", "vo.scope_code = 'global'", "vo.scope_code = 'actor'"));
check("SCHEMA_MAX_500_OBJECTS", has(sql, "jsonb_array_length(p_links) > 500"));
check("SCHEMA_SERVICE_ROLE_BOUNDARY", has(sql, "revoke all on table public.activity_template_impact_profiles_v1 from public, anon, authenticated", "grant execute on function public.save_activity_template_impact_profile_v1"));
check("POSTCHECK_READONLY", lacks(post, "insert into", "update ", "delete from", "drop ", "alter table"));
check("POSTCHECK_ALLPASS", has(post, "'allPass', bool_and(passed)", "20_anon_rpc_blocked"));
check("ROLLBACK_NO_TEMPLATE_DELETE", lacks(rollback, "delete from public.activity_templates"));
check("ROLLBACK_LAYER_ONLY", has(rollback, "drop table if exists public.activity_template_impact_profiles_v1", "drop column if exists impact_profile_id"));

check("API_AUTH_CONTEXT", has(api, "getActivityUserContext", "personActor.id"));
check("API_MINIMAL_TEMPLATE_SELECT", has(api, '.select("id,title,description,template_group,default_duration_minutes,status,is_active,updated_at")'));
check("API_NO_METADATA_HYDRATION", lacks(api, '.select("*")', "metadata_json"));
check("API_ATOMIC_RPC", has(api, 'supabase.rpc("save_activity_template_impact_profile_v1"'));
check("DETAIL_API_ATOMIC_RPC", has(detailApi, 'supabase.rpc("save_activity_template_impact_profile_v1"'));
check("DETAIL_API_NO_OBJECT_METADATA", lacks(detailApi, "metadata_json"));

check("CONTRACT_PROCESS_ALWAYS", has(contract, 'parameterMap.set("process_count"', 'routes.unshift({', 'aggregationCode: "count"'));
check("CONTRACT_MAX_LINKS", has(contract, "rawLinks.length > 500"));
check("CONTRACT_NO_EVAL", lacks(contract, "eval(", "Function("));

check("UI_TEMPLATE_CARD", has(ui, "Типовые активности и связи с ЦО/ОН", "ActivityTemplateImpactProfileEditor"));
check("UI_SHORT_HELP_TEXT", has(ui, "nameHelp", "eventParametersHelp", "linkedObjectsHelp", "routesHelp", "dynamicsHelp"));
check("UI_OBJECT_SELECTOR_NO_AI", has(ui, "/api/value-objects/selector", 'includeGlobal: "1"'));
check("UI_PARAMETER_TOGGLES", has(ui, "repetition_count", "distance_m", "duration_seconds"));
check("UI_ROUTING_TABLE", has(ui, "targetParameterCode", "aggregationCode", "AGGREGATIONS"));
check("UI_DYNAMICS_REUSES_EXISTING_API", has(ui, "/analytics-profile", "refreshPeriodDays", "inactivityDelta", "trendWindowDays"));
check("UI_DOUBLE_COUNT_WARNING", has(ui, "двойного счёта", "virtual contributions"));
check("UI_SEVEN_LOCALES", has(page, '"en" | "pl" | "ru" | "uk" | "de" | "es" | "cs"') && has(ui, "COPY.pl", "COPY.de", "COPY.es", "COPY.cs"));
check("UI_NO_AI_CALL", lacks(ui, "/api/ai/", "OpenAI", "anthropic"));
check("UI_SEARCH_EFFECT_NO_SYNC_SETSTATE", has(ui, "if (query.length < 2) return;", "if (next.trim().length < 2) setSearchResults([]);") && lacks(ui, "if (query.length < 2) { setSearchResults([]); return; }"));
check("RECOVERY_LOCKS_O1_WRITE", has(recovery, "O(1)", "виртуаль"));
check("RECOVERY_RUNTIME_BOUNDARY", has(recovery, "двойного счёта", "следующим"));
check("EVIDENCE_NO_PROD_ANALYSIS", has(evidence, '"production_supabase_used_for_analysis": false'));

const failed = checks.filter((item) => !item.passed);
for (const item of checks) {
  console.log(`${item.passed ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` :: ${item.detail}` : ""}`);
}
console.log(`SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`);
if (failed.length > 0) process.exit(1);
