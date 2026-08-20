import fs from "node:fs";
import crypto from "node:crypto";

const checks = [];

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` :: ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
  console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ""}`);
}

function expectContains(name, path, values) {
  const text = read(path);
  const missing = values.filter((value) => !text.includes(value));
  if (missing.length === 0) pass(name, path);
  else fail(name, `${path} missing=${missing.join(" | ")}`);
}

function expectNotContains(name, path, values) {
  const text = read(path);
  const found = values.filter((value) => text.includes(value));
  if (found.length === 0) pass(name, path);
  else fail(name, `${path} forbidden=${found.join(" | ")}`);
}

const nav = "src/components/app-shell/global-navigation.tsx";
expectContains("normal user gets My AI instructions + Uploaded files", nav, [
  'navigation.myAiInstructions',
  'localeHref("/settings/ai-processing")',
  'navigation.uploadedFiles',
  'localeHref("/uploaded-files")',
]);
expectNotContains("V5 keeps V4 legacy navigation cleanup", nav, [
  "type SidebarOrganizationsResponse",
  "type OrganizationCreateResponse",
  "function getDraftOrganizationName",
  "function BusinessOrganizationTreeItem",
  "function getOrganizationInitial",
  "function getOrganizationLocationLabel",
]);
expectContains("V5 keeps V4 navigation image lint policy", nav, [
  'import Image from "next/image"',
  '<Image',
  'eslint-disable-next-line @next/next/no-img-element',
  'Arbitrary user/profile media URLs are intentionally rendered as-is',
]);

expectContains("admin navigation is server-probed and conditional", nav, [
  'fetch("/api/admin/navigation"',
  "showAdminNavigation",
  'navigation.systemAiInstructions',
  'localeHref("/admin/ai-instructions")',
  'navigation.adminUsers',
  'localeHref("/admin/users")',
  'navigation.adminAiBilling',
  'localeHref("/admin/ai-billing")',
  'navigation.helpSystem',
  'localeHref("/admin/help-system")',
]);

expectContains("admin navigation API uses platform guard", "src/app/api/admin/navigation/route.ts", [
  "requirePlatformAdmin",
  'allowedRoles: ["owner", "admin", "viewer"]',
]);

expectContains("admin help route is guarded and translate-first", "src/app/api/admin/help-system/route.ts", [
  'allowedRoles: ["owner", "admin"]',
  "translateHelpBlockAllLocales",
  "writeHelpContentRevision",
  "findHelpRegistryEntry",
]);
{
  const text = read("src/app/api/admin/help-system/route.ts");
  const translateAt = text.indexOf("translateHelpBlockAllLocales");
  const writeAt = text.indexOf("writeHelpContentRevision({");
  if (translateAt >= 0 && writeAt > translateAt) pass("help save translates before DB write");
  else fail("help save translates before DB write", `${translateAt}<${writeAt}`);
}


expectContains("admin source locale is validated, not silently coerced", "src/app/api/admin/help-system/route.ts", [
  "isLocaleCode",
  "HELP_SOURCE_LOCALE_INVALID",
]);
expectContains("admin drafts are locale-scoped and invalidated after all-locale regeneration", "src/app/admin/help-system/help-system-client.tsx", [
  "function draftKey",
  "draftKey(entry.helpKey, kind, locale)",
  "unsaved draft for this same WHAT/WHY block is now stale",
]);

expectContains("help translation always uses frontier pro slot", "src/lib/help/helpTranslation.server.ts", [
  'getNavigatorModelDefinition("pro")',
  "reasoningEffort: frontier.reasoningEffort",
  "maxRetries: 0",
  "store: false",
  "fresh_all_locales_on_every_admin_save",
  "translations[input.sourceLocale] = sourceText",
]);
expectContains("help translation schema requires seven locales", "src/lib/help/helpTranslation.server.ts", [
  '"ru"',
  '"pl"',
  '"en"',
  '"es"',
  '"uk"',
  '"de"',
  '"cs"',
  "strict: true",
]);

expectContains("help storage revision RPC", "src/lib/help/helpStore.server.ts", [
  'rpc("upsert_platform_help_content_v1"',
  "platform_help_content_current",
]);

expectContains("help migration has current+history+RLS+service boundary", "supabase/manual-applied/20260820_help_files_system_v1.sql", [
  "create table if not exists public.platform_help_content_current",
  "create table if not exists public.platform_help_content_history",
  "enable row level security",
  "revoke all on table public.platform_help_content_current from anon, authenticated",
  "grant select, insert, update, delete on table public.platform_help_content_current to service_role",
  "create or replace function public.upsert_platform_help_content_v1",
  "security definer",
  "set search_path = public, pg_temp",
]);
expectContains("migration enforces all seven translation keys", "supabase/manual-applied/20260820_help_files_system_v1.sql", [
  "translations_json ?& array['ru','pl','en','es','uk','de','cs']",
]);
expectContains("migration serializes block revisions and validates string translations", "supabase/manual-applied/20260820_help_files_system_v1.sql", [
  "pg_advisory_xact_lock",
  "hashtextextended",
  "jsonb_typeof(translations_json->'ru') = 'string'",
  "jsonb_typeof(p_translations_json->'cs') <> 'string'",
]);

expectContains("help registry generator excludes admin/api/debug user routes", "scripts/generate-help-registry-v1.mjs", [
  '"/admin"',
  '"/api"',
  '"/activity/debug"',
  '"/project-knowledge"',
  "HELP_REGISTRY_DUPLICATE_KEYS",
]);
expectContains("help registry keys are resilient to unrelated heading insertion", "scripts/generate-help-registry-v1.mjs", [
  "stableFingerprint",
  "headingFingerprintCounts",
  "content fingerprint keeps",
]);
expectContains("help runtime matches dynamic route patterns", "src/lib/help/helpRegistry.ts", [
  "routePatternMatches",
  'part.startsWith("[...")',
  'part.startsWith("[[...")',
]);
expectContains("help marker location uses registry metadata instead of concrete URL key reconstruction", "src/components/help/global-help-layer.tsx", [
  "findTargetForEntry",
  "dynamic routes such as /offers/[id]",
]);

{
  const generated = read("src/data/help/helpRegistry.generated.ts");
  const match = generated.match(/"total":\s*(\d+)/);
  const pages = generated.match(/"pages":\s*(\d+)/);
  const total = match ? Number(match[1]) : 0;
  const pageCount = pages ? Number(pages[1]) : 0;
  if (total >= 200 && pageCount >= 80) pass("help registry has broad current-source coverage", `total=${total} pages=${pageCount}`);
  else fail("help registry has broad current-source coverage", `total=${total} pages=${pageCount}`);
}

expectContains("global help layer has i/? + desktop/mobile presentation", "src/components/help/global-help-layer.tsx", [
  "data-arctor-help-host",
  'active.kind === "what" ? "i" : "?"',
  "md:inset-x-auto",
  "bottom-3",
  "createPortal",
]);
expectContains("help API returns only populated localized entries", "src/app/api/help/route.ts", [
  "getHelpEntriesForRoute",
  "translations[locale]",
  "if (!whatText && !whyText) return null",
]);

expectContains("V5 uploaded-files route imports root lib at correct depth", "src/app/api/uploaded-files/route.ts", [
  'from "../../../../lib/activity/activityUserContext"',
  'from "../../../../lib/supabase"',
]);
expectNotContains("V5 uploaded-files route rejects V4 over-deep imports", "src/app/api/uploaded-files/route.ts", [
  'from "../../../../../lib/activity/activityUserContext"',
  'from "../../../../../lib/supabase"',
]);
expectContains("V5 uploaded-files open route imports root lib at correct depth", "src/app/api/uploaded-files/open/route.ts", [
  'from "../../../../../lib/activity/activityUserContext"',
  'from "../../../../../lib/supabase"',
]);
expectNotContains("V5 uploaded-files open route rejects V4 over-deep imports", "src/app/api/uploaded-files/open/route.ts", [
  'from "../../../../../../lib/activity/activityUserContext"',
  'from "../../../../../../lib/supabase"',
]);

expectContains("uploaded files page exists and is private-evidence aware", "src/app/api/uploaded-files/route.ts", [
  "raw_activity_signals",
  "activity-evidence-media-v1",
  "previewHref",
  "relatedActivityEventId",
]);
expectContains("uploaded file viewer never accepts arbitrary storage path", "src/app/api/uploaded-files/open/route.ts", [
  'url.searchParams.get("signalId")',
  '.eq("user_id", appUser.id)',
  "expectedPrefix",
  "FILE_REFERENCE_OWNERSHIP_MISMATCH",
  "createHash(\"sha256\")",
  "FILE_INTEGRITY_CHECK_FAILED",
  '"Cache-Control": "private, no-store, max-age=0"',
]);
expectNotContains("uploaded file viewer query has no storagePath parameter", "src/app/api/uploaded-files/open/route.ts", [
  'searchParams.get("storagePath")',
  'searchParams.get("bucket")',
]);
expectContains("uploaded file response supports Unicode filename safely", "src/app/api/uploaded-files/open/route.ts", [
  "contentDispositionFilename",
  "filename*=UTF-8''",
  "encodedUtf8",
]);
expectContains("uploaded files UX is seven-locale and corporate", "src/app/uploaded-files/uploaded-files-client.tsx", [
  "Uploaded files",
  "Przesłane pliki",
  "Загруженные файлы",
  "Завантажені файли",
  "Hochgeladene Dateien",
  "Archivos subidos",
  "Nahrané soubory",
  "#3b6ef8",
]);

expectContains("global shell mounts help layer", "src/components/app-shell/global-app-shell.tsx", [
  "GlobalHelpLayer",
  "<GlobalHelpLayer />",
]);

expectContains("navigation i18n includes new user/admin links", "src/i18n/messages/navigation.ts", [
  '"navigation.uploadedFiles"',
  '"navigation.adminUsers"',
  '"navigation.adminAiBilling"',
  '"navigation.helpSystem"',
]);

expectContains("recovery current state includes fresh-translation rule", "docs/recovery/ARCTOR_CURRENT_STATE_RU.md", [
  "HELP + FILES SYSTEM V1",
  "каждое сохранение администратором",
  "полностью регенерирует ru/pl/en/es/uk/de/cs",
]);
expectContains("recovery decisions include explicit contrast with CONTENT-L10", "docs/recovery/ARCTOR_DECISIONS_AND_FAILURES_RU.md", [
  "D-HELP-01",
  "help content не является обычным localized content",
  "ВСЕ 7 переводов создаются заново",
]);
expectContains("restore guide includes re-edit acceptance", "docs/recovery/ARCTOR_RESTORE_FROM_ZERO_RU.md", [
  "HELP + FILES SYSTEM V1",
  "ВСЕ 7 translations создаются заново",
]);
expectContains("checkpoint manifest points to HELP_FILES_SYSTEM_V1", "docs/recovery/CHECKPOINT_MANIFEST.json", [
  "v5_import_depth_hotfix_coded_manual_db_already_applied_awaiting_production_release",
  "fresh_all_7_locales_on_every_admin_save",
  "gpt-5.6-sol",
]);

const evidencePath = "docs/recovery/evidence/HELP_FILES/ARCTOR_HELP_FILES_SYSTEM_V1_EVIDENCE.json";
const evidenceText = read(evidencePath).replace(/\r\n/g, "\n");
const evidenceHash = crypto.createHash("sha256").update(evidenceText, "utf8").digest("hex");
const index = read("docs/recovery/evidence/EVIDENCE_INDEX.json");
if (index.includes(evidencePath) && index.includes(evidenceHash)) {
  pass("recovery evidence indexed with canonical hash", evidenceHash);
} else {
  fail("recovery evidence indexed with canonical hash", evidenceHash);
}

expectContains("recovery records V1-V4 safe failures and V5 import-depth correction", "docs/recovery/ARCTOR_DECISIONS_AND_FAILURES_RU.md", [
  "F-HELP-01",
  "F-HELP-02",
  "DB_PREFLIGHT_DRY_RUN_UNEXPECTED_PENDING_MIGRATIONS",
  "supabase/manual-applied/20260820_help_files_system_v1.sql",
  "F-HELP-03",
  "ESLINT_CHANGED_TS_MAX_WARNINGS_0",
  "F-HELP-04",
  "BUILD_FAILED",
  "module import depth",
]);

expectNotContains("canonical leaf routing implementation not touched by new source files", "src/lib/help/helpTranslation.server.ts", [
  "candidate leaf",
  "recognition profile",
  "activitySemanticReviewA31",
]);

const failed = checks.filter((item) => !item.ok);
console.log(`SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`);
if (failed.length > 0) process.exit(1);
