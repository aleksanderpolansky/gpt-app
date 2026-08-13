import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const files = {
  page: "src/app/activity-ai-lab/page.tsx",
  feedbackApi: "src/app/api/ai/reality/feedback/route.ts",
  materializeApi: "src/app/api/ai/reality/manual-link-materialize/route.ts",
  selector: "src/app/api/value-objects/selector/route.ts",
  review: "src/app/calendar/activity-review/activity-review-client.tsx",
  migration: "supabase/manual-applied/20260813_ai_a3_p1_data_capital_foundation_v2.sql",
  contract: "docs/reality-core/ARCTOR_AI_A3_P2_FEEDBACK_REVIEW_UX_CONTRACT_V1_RU.md",
  p3LiveEvidence:
    "docs/recovery/evidence/GSR1L/ARCTOR_AI_A2_P3_PRODUCTION_RUNTIME_ACCEPTANCE_20260813.txt",
  a3LiveEvidence:
    "docs/recovery/evidence/AI_A3/ARCTOR_AI_A3_P1_DATA_CAPITAL_LIVE_ACCEPTANCE_20260813.txt",
};

function fail(message) {
  console.error(
    JSON.stringify(
      { validator: "AI_A3_P2", passed: false, error: message },
      null,
      2,
    ),
  );
  process.exit(1);
}

function read(rel) {
  const full = path.join(root, ...rel.split("/"));
  if (!fs.existsSync(full)) fail(`missing file: ${rel}`);
  return fs.readFileSync(full);
}

function normalizedText(buffer) {
  return buffer
    .toString("utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function requireToken(text, token, label = token) {
  if (!text.includes(token)) fail(`missing marker: ${label}`);
}

function forbidToken(text, token, label = token) {
  if (text.includes(token)) fail(`forbidden marker: ${label}`);
}

function countToken(text, token) {
  return text.split(token).length - 1;
}

let ts;
try {
  const require = createRequire(import.meta.url);
  ts = require("typescript");
} catch (error) {
  fail(
    `typescript package unavailable: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}

function syntaxCheck(source, rel, jsx = false) {
  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  };
  if (jsx) compilerOptions.jsx = ts.JsxEmit.ReactJSX;

  const transpiled = ts.transpileModule(source, {
    compilerOptions,
    reportDiagnostics: true,
    fileName: rel,
  });

  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );

  if (errors.length > 0) {
    fail(
      `${rel} TypeScript diagnostics: ${errors
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
        )
        .join(" | ")}`,
    );
  }
}

const page = normalizedText(read(files.page));
const feedbackApi = normalizedText(read(files.feedbackApi));
const materializeApi = normalizedText(read(files.materializeApi));
const selector = normalizedText(read(files.selector));
const review = normalizedText(read(files.review));
const migrationBuffer = read(files.migration);
const migration = normalizedText(migrationBuffer);
const contract = normalizedText(read(files.contract));
const p3Evidence = normalizedText(read(files.p3LiveEvidence));
const a3Evidence = normalizedText(read(files.a3LiveEvidence));

for (const [rel, source, jsx] of [
  [files.page, page, true],
  [files.feedbackApi, feedbackApi, false],
  [files.materializeApi, materializeApi, false],
  [files.selector, selector, false],
  [files.review, review, true],
]) {
  if (source.startsWith("\ufeff")) fail(`unexpected BOM in ${rel}`);
  if (source.includes("\u0000")) fail(`NUL byte in ${rel}`);
  syntaxCheck(source, rel, jsx);
}

const migrationNormalizedSha = sha256(Buffer.from(migration, "utf8"));
if (
  migrationNormalizedSha !==
  "1ba4295aba98abd3a3f2d1abc60e5bab34574d6272f1a15162021e9e2b38aab8"
) {
  fail(`AI-A3-P1 migration normalized SHA mismatch: ${migrationNormalizedSha}`);
}

for (const marker of [
  "create table public.ai_feedback_events",
  "create table public.ai_feedback_corrections",
  "create table public.ai_feedback_outcomes",
  "ai_feedback_events_client_user_v1_unique",
  "ai_feedback_events_manual_link_shape_v1_check",
  "enforce_ai_feedback_event_v1",
  "enforce_ai_feedback_correction_v1",
  "grant select, insert on table public.ai_feedback_events to service_role",
]) {
  requireToken(migration, marker);
}

for (const marker of [
  'const SURFACE_CODE = "activity_ai_lab";',
  'const EXECUTION_SURFACE_CODE = "global_observation_preview";',
  'const EXECUTION_OPERATION_KIND = "activity_semantic_intake";',
  '"manual_leaf_link"',
  '"manual_link_added"',
  '"confirmed"',
  '"rejected"',
  '"commented"',
  '.from("ai_analysis_executions")',
  '.eq("external_operation_id", operationId)',
  '.eq("app_user_id", actorContext.appUserId)',
  '.eq("actor_id", actorContext.actorId)',
  'executionData.status !== "completed"',
  '.from("ai_feedback_events")',
  '.insert(insertRow)',
  'insertError?.code !== "23505"',
  'clientFeedbackId was already used for different feedback',
  'commented feedback requires explanationText',
  'ARCTOR_AI_A3_P2_FEEDBACK_REVIEW_UX_V1',
]) {
  requireToken(feedbackApi, marker);
}
forbidToken(feedbackApi, '.update(');
forbidToken(feedbackApi, '.delete(');
forbidToken(feedbackApi, '.from("ai_feedback_corrections")');

for (const marker of [
  'const MAX_FEEDBACK_IDS = 24;',
  '.from("activity_events")',
  '.eq("user_id", actorContext.appUserId)',
  '.eq("acting_as_actor_id", actorContext.actorId)',
  '.from("ai_analysis_executions")',
  '.eq("external_operation_id", operationId)',
  '.eq("status", "completed")',
  '.from("ai_feedback_events")',
  '.eq("target_kind", "manual_leaf_link")',
  '.eq("verdict_code", "manual_link_added")',
  '.eq("analysis_execution_id", execution.id)',
  '.from("activity_value_object_links")',
  '.upsert(rows, {',
  'onConflict: "activity_event_id,value_object_id,link_type"',
  'ignoreDuplicates: true',
  'link_type: "semantic_exposure"',
  'provenance_code: "manual"',
  'semantic_match_method_code: "user_confirmed"',
  'feedbackEventId: feedback.id',
]) {
  requireToken(materializeApi, marker);
}
forbidToken(materializeApi, '.delete(');

for (const marker of [
  'url.searchParams.get("includeGlobal")',
  'if (includeGlobal) {',
  '.eq("scope_code", "global")',
  '.eq("status", "active")',
  'row.ontology_node_role_code === "leaf"',
  'const item = toSelectorItem(row, byId, includeGlobal);',
  'canonicalKey: asString(row.canonical_key)',
  'scopeCode: asString(row.scope_code)',
]) {
  requireToken(selector, marker);
}
requireToken(selector, 'return value === "1" || value === "true";');

for (const marker of [
  'aria-label="Подтвердить"',
  'aria-label="Отклонить"',
  'aria-label="Добавить объяснение"',
  'aria-label="Почему система так решила"',
  'verdictCode: "manual_link_added"',
  'targetKind: "manual_leaf_link"',
  '"/api/ai/reality/feedback"',
  'includeGlobal: "1"',
  'level: "leaf"',
  '+ Добавить связь с ЦО',
  'manualFeedbackIds',
  'analysisOperationId',
  'semantic_exposure',
  'Покупка содержит пищевые товары',
  'Возможная связь с обеспечением семьи',
]) {
  requireToken(page, marker);
}
forbidToken(page, "ai_feedback_corrections");

for (const marker of [
  'searchParams.get("analysisOperationId")',
  'searchParams.get("manualFeedbackIds")',
  '"/api/ai/reality/manual-link-materialize"',
  'activityEventId,',
  'operationId: analysisOperationId',
  'feedbackEventIds: manualFeedbackIds',
  'manualLeafFeedbackIntentCount: manualFeedbackIds.length',
  'Ручные связи с ЦО',
]) {
  requireToken(review, marker);
}

const materializePos = review.indexOf('"/api/ai/reality/manual-link-materialize"');
const saveFactsPos = review.indexOf("await saveFactsForActivityContainer({");
if (materializePos < 0 || saveFactsPos < 0 || materializePos > saveFactsPos) {
  fail("manual link materialization must happen after activity creation and before fact save-gate");
}

for (const marker of [
  "STOKROTKA=PASS",
  "GENERIC_SLEEP_UNRESOLVED=PASS",
  "EXPLICIT_FAMILY_PURCHASE=PASS",
  "P3_RESULT=PASS",
]) {
  requireToken(p3Evidence, marker);
}

for (const marker of [
  "AI_A3_P1_LIVE_ACCEPTANCE=20/20_PASS",
  "01_tables_exist=true",
  "20_correction_insert_guard_ready=true",
  "MIGRATION_SHA256=1ba4295aba98abd3a3f2d1abc60e5bab34574d6272f1a15162021e9e2b38aab8",
]) {
  requireToken(a3Evidence, marker);
}

for (const marker of [
  "AI_A3_P2_FEEDBACK_REVIEW_UX_V1",
  "manual_leaf_link",
  "manual_link_added",
  "semantic_exposure",
  "user_confirmed",
  "append-only",
  "includeGlobal=1",
  "не вызывают OpenAI",
]) {
  requireToken(contract, marker);
}

if (countToken(page, 'fetch("/api/ai/reality/feedback"') !== 2) {
  fail("expected exactly two UI feedback POST call sites: trace review + manual leaf intent");
}

console.log(
  JSON.stringify(
    {
      validator: "AI_A3_P2",
      passed: true,
      checks: {
        typescriptSyntax: "PASS",
        dataCapitalMigrationSha: "PASS",
        feedbackAppendOnlyApi: "PASS",
        feedbackIdempotency: "PASS",
        manualLeafSelectorOptInGlobal: "PASS",
        manualLeafIntent: "PASS",
        materializationOwnershipAndExecutionBinding: "PASS",
        semanticExposureUserConfirmed: "PASS",
        activityReviewCarryOver: "PASS",
        p3ProductionEvidence: "PASS",
        aiA3P1LiveEvidence: "PASS",
      },
    },
    null,
    2,
  ),
);
