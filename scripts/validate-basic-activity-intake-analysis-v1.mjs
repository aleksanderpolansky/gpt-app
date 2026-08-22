import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
const check = (name, passed, detail = "") =>
  checks.push({ name, passed: Boolean(passed), detail });
const file = (rel) => path.join(root, rel);
const exists = (rel) => fs.existsSync(file(rel));
const read = (rel) => fs.readFileSync(file(rel), "utf8");
const has = (rel, ...needles) => needles.every((needle) => read(rel).includes(needle));
const lacks = (rel, ...needles) => needles.every((needle) => !read(rel).includes(needle));

const analyzer = "src/lib/activity/activity-basic-intake-analysis.server.ts";
const api = "src/app/api/activity/intake-analysis/route.ts";
const card = "src/components/activity/activity-basic-intake-analysis-card.tsx";
const validator = "scripts/validate-basic-activity-intake-analysis-v1.mjs";
const recovery = "docs/recovery/ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1_RU.md";
const evidence = "docs/recovery/evidence/HELP_FILES/ARCTOR_BASIC_ACTIVITY_INTAKE_ANALYSIS_V1_EVIDENCE.json";
const newFiles = [analyzer, api, card, validator, recovery, evidence];

for (const rel of newFiles) check(`FILE_EXISTS:${rel}`, exists(rel));

for (const rel of newFiles.filter(exists)) {
  const content = read(rel);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const trailing = lines.some((line) => /[ \t]+$/.test(line));
  const singleFinalNewline = content.endsWith("\n") && !content.endsWith("\n\n");
  check(`TEXT_NO_TRAILING_WHITESPACE:${rel}`, !trailing);
  check(`TEXT_SINGLE_FINAL_NEWLINE:${rel}`, singleFinalNewline);
}

check("ANALYZER_NANO_ONLY", has(analyzer, 'const MODEL_TIER = "nano"') && lacks(analyzer, 'MODEL_TIER = "standard"'));
check("ANALYZER_ONE_PROVIDER_CALL", (read(analyzer).match(/runAiJsonWithUsageMetadata</g) ?? []).length === 1);
check("ANALYZER_NO_RETRIES", has(analyzer, "const MAX_RETRIES = 0"));
check("ANALYZER_PROVIDER_STORE_FALSE", has(analyzer, "store: false"));
check("ANALYZER_MAX_24_CANDIDATES", has(analyzer, "const MAX_CANDIDATES_SENT = 24"));
check("ANALYZER_STRICT_MATCH_THRESHOLD", has(analyzer, "TEMPLATE_MATCH_CONFIDENCE_THRESHOLD = 0.9"));
check("ANALYZER_MAX_5_DISPLAY_MATCHES", has(analyzer, "const MAX_TEMPLATE_MATCHES = 5"));
check("ANALYZER_EXPLICIT_MEASUREMENT_FRAGMENT", has(analyzer, "normalizedSource.includes(rawFragment.toLocaleLowerCase())"));
check("ANALYZER_MEASUREMENT_TYPES", has(analyzer, '"duration"', '"distance"', '"repetitions"', '"mass"', '"money"', '"heart_rate"'));
check("ANALYZER_ACTIVITY_TEMPLATES_ONLY", has(analyzer, '.from("activity_templates")', '.select("id,title,short_title,template_group,updated_at")'));
check("ANALYZER_NO_OBJECT_CATALOG", lacks(analyzer, '.from("value_objects")', "get_global_value_object", "activity_object_facts"));
check("ANALYZER_NO_TEMPLATE_APPLY_RPC", lacks(analyzer, "apply_activity_template_match_v2", "activity_template_id:"));
check("ANALYZER_NO_IMPACT_PROFILE_LOAD", lacks(analyzer, "activity_template_impact_profiles_v1", "activity_template_profile_object_links_v1"));
check("ANALYZER_BUDGET_PREFLIGHT", has(analyzer, 'supabase.rpc("preflight_ai_pilot_call_budget_v1"'));
check("ANALYZER_USAGE_ACCOUNTING", has(analyzer, '.from("ai_usage_events")', "actual_provider_cost_usd"));
check("ANALYZER_CONTEXT_MANIFEST", has(analyzer, "createAiContextManifest", "markAiContextManifestValidated"));
check("ANALYZER_STORE_IN_EXISTING_SIGNAL", has(analyzer, '.from("raw_activity_signals")', "basicIntakeAnalysisV1"));
check("ANALYZER_FAILURE_STATE_HELPER", has(analyzer, "markBasicActivityIntakeFailureV1", 'status: "failed"'));
check("ANALYZER_NO_NEW_DB_TABLE", lacks(analyzer, "create table", "alter table"));
check("ANALYZER_PROMPT_NO_WEAK_MATCH", has(analyzer, "Do NOT return a merely similar, broader, adjacent, or vaguely plausible activity"));
check("ANALYZER_PROMPT_NO_VO_EFFECTS", has(analyzer, "Never infer observation objects, value objects, health effects"));

check("API_AUTH_CONTEXT", has(api, "getActivityUserContext", "appUser", "personActor"));
check("API_MAX_50", has(api, "const MAX_EVENT_IDS = 50"));
check("API_MINIMAL_SIGNAL_SELECT", has(api, '"output_event_id,normalized_preview_json,processing_status,updated_at"'));
check("API_NO_SIGNAL_METADATA_HYDRATION", lacks(api, "metadata_json", '.select("*")'));
check("API_READ_ONLY", lacks(api, ".insert(", ".update(", ".delete(", ".upsert("));
check("API_ONLY_MANUAL_CHAT", has(api, '.eq("source_type", "manual_chat")'));

check("CARD_NO_POLLING", lacks(card, "setInterval", "setTimeout", "router.refresh", "location.reload"));
check("CARD_ONE_BATCH_ENDPOINT", has(card, "/api/activity/intake-analysis?", "activityEventIds"));
check("CARD_NO_ACTION_BUTTONS", lacks(card, "Сохранить связи", "Дополнительный анализ", "saveLinks", "additionalAnalysis"));
check("CARD_NO_MATCH_COPY", has(card, "Подходящая типовая активность не найдена."));
check("CARD_ALL_TEMPLATES_LINK", has(card, 'analysis.typicalActivitiesHref || "/activity-templates"'));
check("CARD_CANDIDATE_COPY", has(card, "Активность может соответствовать следующим типовым активностям:"));
check("CARD_STATUS_LABELS", has(card, "Завершенная активность", "Планируемая активность"));
check("CARD_SEVEN_LOCALES", ["ru", "pl", "en", "es", "uk", "de", "cs"].every((locale) => read(card).includes(`${locale}: {`)));

check("RECOVERY_SCOPE_LOCK", has(recovery, "не проектирует и не реализует действия", "не назначает `activity_template_id` автоматически", "не запускает A3.1 Standard review автоматически"));
check("RECOVERY_RIGHT_RAIL_COPY", has(recovery, "Активность зафиксирована. Активность доступна для анализа в Журнале активностей."));
check("RECOVERY_NO_NOTIFICATION", has(recovery, "Дополнительных уведомлений о завершении фонового анализа"));
check("RECOVERY_RESET_DEFERRED", has(recovery, "clean-start reset остаётся отдельным будущим этапом"));
check("RECOVERY_V1_LINT_FAILURE_RECORDED", has(recovery, "V1 source-run", "react-hooks/set-state-in-effect", "ROLLBACK=PASS"));
check("EVIDENCE_NO_PROD_ANALYSIS", has(evidence, '"production_supabase_used_for_analysis": false'));
check("EVIDENCE_NO_DB_CHANGE", has(evidence, '"db_schema_change": false'));

const quick = "src/app/api/activity/quick-capture/route.ts";
const provider = "src/components/app-shell/ai-navigator-provider.tsx";
const journal = "src/app/activity-today/page.tsx";
const navigation = "src/components/app-shell/global-navigation.tsx";
const navigationI18n = "src/i18n/messages/navigation.ts";
const postPatchAvailable = [quick, provider, journal, navigation, navigationI18n].every(exists);

if (postPatchAvailable) {
  check("QUICK_BASIC_ANALYZER_IMPORT", has(quick, "analyzeBasicActivityIntakeV1"));
  check("QUICK_BACKGROUND_AFTER", has(quick, "after(async () =>", "scheduleBackgroundBasicIntakeAnalysis"));
  check("QUICK_BACKGROUND_FAILURE_RECORDED", has(quick, "markBasicActivityIntakeFailureV1"));
  check("QUICK_NO_AUTO_TEMPLATE_MATCH", lacks(quick, "matchActivityToTypicalTemplateV1", "resolveTypicalTemplateReviewPlan"));
  check("QUICK_NO_AUTO_A31", lacks(quick, "analyzeActivityForSemanticReviewA31", "scheduleBackgroundSemanticReview"));
  check("QUICK_NO_OLD_REVIEW_REQUIRED", has(quick, "quickCaptureReviewRequired: false", "requiresHumanReview: false"));
  check("QUICK_JOURNAL_HREF", has(quick, 'const reviewHref = "/activity-today"'));
  check("QUICK_NO_FACT_WRITE", lacks(quick, "activity_object_facts", "facts/save-gate"));

  check("PROVIDER_EXACT_RU_ACK", has(provider, "Активность зафиксирована. Активность доступна для анализа в Журнале активностей."));
  check("PROVIDER_NO_ACTIVITY_AUTO_NAV", lacks(provider, "router.push(result.href)", "const router = useRouter()"));
  check("PROVIDER_NO_SUCCESS_ACTION", has(provider, "action: undefined"));

  check("JOURNAL_IMPORT_ANALYSIS_CARD", has(journal, "ActivityBasicIntakeAnalysisCard", "useActivityBasicIntakeAnalyses"));
  check("JOURNAL_LIFECYCLE_BADGE", has(journal, "ActivityLifecycleBadge", 'activityRoleCode === "planned"'));
  check("JOURNAL_ANALYSIS_MAP", has(journal, "basicIntakeAnalysesByActivityId"));
  check("JOURNAL_LINT_SAFE_LOCALE_SYNC", has(journal, "ARCTOR_ACTIVITY_TODAY_LINT_SAFE_LOCALE_SYNC_V1", "window.setTimeout(updateLocale, 0)", 'window.addEventListener("popstate", updateLocale)'));
  check("JOURNAL_LINT_SAFE_MUTUAL_EMPTY", has(journal, "ARCTOR_ACTIVITY_TODAY_LINT_SAFE_MUTUAL_LINK_EMPTY_V1") && lacks(journal, "setMutualLinksByActivityId({});\n      return;"));
  check("JOURNAL_LINT_SAFE_AUTO_OPEN", has(journal, "ARCTOR_ACTIVITY_TODAY_LINT_SAFE_AUTO_OPEN_REF_V1", "autoOpenHandledRef.current") && lacks(journal, "setAutoOpenHandled"));

  check("NAV_TYPICAL_ACTIVE", has(navigation, 'currentPathname === "/activity-templates"', 'label={t("navigation.typicalActivities")}'));
  check("NAV_TYPICAL_BEFORE_REVIEW", read(navigation).indexOf('navigation.typicalActivities') < read(navigation).indexOf('navigation.requiresReview'));
  check("NAV_I18N_KEY", has(navigationI18n, '"navigation.typicalActivities"'));
  check("NAV_I18N_SEVEN_LOCALES", has(navigationI18n, 'ru: "Типовые активности"', 'pl: "Typowe aktywności"', 'en: "Typical activities"', 'es: "Actividades típicas"', 'uk: "Типові активності"', 'de: "Typische Aktivitäten"', 'cs: "Typické aktivity"'));
}

const failed = checks.filter((item) => !item.passed);
for (const item of checks) {
  console.log(`${item.passed ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` :: ${item.detail}` : ""}`);
}
console.log(`SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);
