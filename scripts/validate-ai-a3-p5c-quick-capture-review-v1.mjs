import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const repo = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const checks = [];
function read(rel) { return fs.readFileSync(path.join(repo, rel), "utf8"); }
function must(name, condition, detail = "") {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}: ${detail || "failed"}`);
}
function parseTs(rel) {
  const source = read(rel);
  const kind = rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(rel, source, ts.ScriptTarget.ES2022, true, kind);
  const errors = file.parseDiagnostics ?? [];
  must(`TS_PARSE:${rel}`, errors.length === 0, errors.map((d) => d.messageText).join(" | "));
  return source;
}

const helper = parseTs("src/lib/activity/aiLabQuickCapture.ts");
const durable = parseTs("src/lib/activity/aiLabQuickCaptureDurable.server.ts");
const executor = parseTs("src/lib/ai/processingRuleExecutor.ts");
const durableRoute = parseTs("src/app/api/activity/quick-capture/route.ts");
const lab = parseTs("src/app/activity-ai-lab/page.tsx");
const queueApi = parseTs("src/app/api/activity/review-queue/route.ts");
const queuePage = parseTs("src/app/activity-review/page.tsx");
const nav = parseTs("src/components/app-shell/global-navigation.tsx");
const messages = parseTs("src/i18n/messages/navigation.ts");

must("P5C_CONTRACT", helper.includes("AI_A3_P5C_QUICK_CAPTURE_REVIEW_V1"));
must("P5C_DIRECTION_DEFAULT_PAST", helper.includes('return "past";'));
must("P5C_FUTURE_DETECTION", helper.includes("FUTURE_TEXT_PHRASES") && helper.includes("containsFutureText"));
must("P5C_SEQUENTIAL_PAST_DEFAULT", helper.includes("buildAiLabQuickCaptureSequentialTimings") && helper.includes("for (let index = timings.length - 1; index >= 0; index -= 1)"));
must("P5C_DURABLE_RECEIPT", durable.includes("raw_activity_signals") && durableRoute.includes("createDurableQuickCaptureSignal"));
must("P5C_DURABLE_BACKGROUND", durableRoute.includes("after(async () =>") && durableRoute.includes("maxDuration = 300"));
must("P5C_DURABLE_CLIENT_KEEPALIVE", lab.includes("keepalive: true"));
must("P5C_DURABLE_STATUS_POLL", lab.includes("/api/activity/quick-capture?"));
must("P5C_RULE_EXECUTOR", durable.includes("executeActivityQuickCaptureProcessingRules") && executor.includes("applyActivityQuickCaptureProcessingRules"));
must("P5C_INDEPENDENT_ROW_LOOP", durable.includes("for (let index = 0; index < rows.length; index += 1)"));
must("P5C_AUTO_PERSIST_AFTER_ANALYSIS", durable.includes("storeDurableAnalysis") && durable.includes('path: "/api/activity/events"'));
must("P5C_EVENT_WRITE", durable.includes('path: "/api/activity/events"'));
must("P5C_FACT_MATERIALIZATION", durable.includes('path: "/api/ai/reality/fact-materialize"'));
must("P5C_REVIEW_METADATA", durable.includes("quickCaptureReviewRequired: true") && durable.includes('quickCaptureReviewStatus: "pending"'));
must("P5C_SEQUENCE_METADATA", durable.includes('quickCaptureTemporalSequencePolicy:') && durable.includes("independent_events_named_order_no_invented_breaks"));
must("P5C_SINGLE_REDIRECT_DETAIL", durable.includes("activityEventIds.length === 1") && durable.includes("activityEventId: activityEventIds[0]"));
must("P5C_MULTI_REDIRECT_QUEUE", durable.includes("buildAiLabQuickCaptureReviewHref({ locale })"));
must("P5C_REVIEW_BUTTON", lab.includes("Внести изменения"));
must("P5C_OLD_PRIMARY_BUTTONS_REMOVED", !lab.includes("Сохранить как прошедшую") && !lab.includes(">\n                      Запланировать\n"));
must("P5C_ANALYZE_LABEL", lab.includes("Разобрать активность"));
must("P5C_REVIEW_INIT_EFFECT_DEFERRED", lab.includes("const reviewInitTimer = window.setTimeout(() => {") && lab.includes("window.clearTimeout(reviewInitTimer)"));
must("P5C_MANUAL_PICKER_EFFECT_NO_SYNC_RESET", !lab.includes('if (!open || query.trim().length < 2) {\n      setResults([]);\n      setLoading(false);'));
must("P5C_MANUAL_PICKER_EVENT_RESET", lab.includes("const nextQuery = event.target.value;") && lab.includes("nextQuery.trim().length < 2"));
must("P5C_NO_WRITE_ONLY_CREATED_STATE", !lab.includes("quickCaptureCreated") && !lab.includes("setQuickCaptureCreated"));
must("P5C_NO_CLIENT_PERSIST_LOOP", !lab.includes("async function persistQuickCapture("));
must("P5C_NO_UNUSED_CLIENT_TITLE_HELPER_IMPORT", !lab.includes("  deriveAiLabActivityTitle,"));
must("P5C_DEAD_DIRECT_SAVE_OPENER_REMOVED", !lab.includes("function openDirectSave("));
must("P5C_QUEUE_LOCALE_EFFECT_DEFERRED", queuePage.includes("const localeInitTimer = window.setTimeout(() => {") && queuePage.includes("window.clearTimeout(localeInitTimer)"));
must("P5C_QUEUE_NO_UNUSED_SNAPSHOT_ALIAS", !queueApi.includes("_reviewSnapshot") && queueApi.includes("void reviewSnapshot;"));
must("P5C_QUEUE_OWNER_SCOPE", queueApi.includes('.eq("user_id", appUser.id)') && queueApi.includes('.eq("acting_as_actor_id", personActor.id)'));
must("P5C_QUEUE_PENDING_METADATA", queueApi.includes("quickCaptureReviewRequired") && queueApi.includes('quickCaptureReviewStatus !== "resolved"'));
must("P5C_QUEUE_DETAIL", queueApi.includes("activityEventId") && queueApi.includes("reviewSnapshot"));
must("P5C_QUEUE_PAGE", queuePage.includes("Требуют проверки") && queuePage.includes("buildAiLabQuickCaptureReviewHref"));
must("P5C_QUEUE_HUMAN_DATE", queuePage.includes("formatReviewWhen"));
must("P5C_NAV_CHILD", nav.includes('t("navigation.requiresReview")') && nav.includes('href={localeHref("/activity-review")}'));
must("P5C_NAV_PARENT", nav.includes("ExpandableSidebarLinkItem") && nav.includes("isActivityReviewActive"));
for (const value of ["Требуют проверки", "Wymagają sprawdzenia", "Require review", "Requieren revisión", "Потребують перевірки", "Müssen geprüft werden", "Vyžadují kontrolu"]) {
  must(`I18N:${value}`, messages.includes(value));
}
must("NO_ACTIVITY_PACKAGE_ENTITY", !helper.includes("activity_package") && !queueApi.includes("activity_package") && !durable.includes("activity_package"));
console.log(JSON.stringify({ ok: true, checks }, null, 2));
