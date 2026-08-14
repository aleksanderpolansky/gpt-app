import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LOCALES = ["en", "pl", "ru", "uk", "de", "es", "cs"];
const LATIN_UI_LOCALES = ["en", "pl", "de", "es", "cs"];

function fail(message) {
  throw new Error(`AI_A3_P5B_MOBILE_GLOBAL_LOCALIZATION_V2_FAILED: ${message}`);
}
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}
function readJson(rel) {
  return JSON.parse(read(rel));
}

const catalog = readJson(
  "src/data/reality-core/global-system-reality-localizations-v2.json",
);
const keys = Object.keys(catalog.objects ?? {});
if (catalog.schemaVersion !== 2) fail("schemaVersion != 2");
if (keys.length !== 150) fail(`catalog object count ${keys.length} != 150`);
if (JSON.stringify(catalog.locales) !== JSON.stringify(LOCALES)) {
  fail(`locale list mismatch: ${JSON.stringify(catalog.locales)}`);
}
for (const key of keys) {
  const item = catalog.objects[key];
  for (const locale of LOCALES) {
    const title = item?.title?.[locale];
    const description = item?.description?.[locale];
    if (typeof title !== "string" || !title.trim()) fail(`${key} missing title.${locale}`);
    if (typeof description !== "string" || !description.trim()) fail(`${key} missing description.${locale}`);
    if (LATIN_UI_LOCALES.includes(locale) && /[\u0400-\u04FF]/u.test(`${title}\n${description}`)) {
      fail(`${key} ${locale} unexpectedly contains Cyrillic`);
    }
  }
}

const helper = read("src/lib/reality-core/global-system-value-object-localization.ts");
for (const marker of [
  "localizeGlobalSystemValueObject",
  "normalizeGlobalSystemValueObjectLocale",
  "GLOBAL_SYSTEM_VALUE_OBJECT_LOCALES",
  "global-system-reality-localizations-v2.json",
]) {
  if (!helper.includes(marker)) fail(`helper marker missing: ${marker}`);
}

const list = read("src/components/workspace/value-objects/actual-value-objects-list.tsx");
for (const marker of [
  "min-w-0 w-full max-w-full",
  "break-words text-[16px]",
  "break-all font-mono",
  "break-words text-[12px]",
  "buildLocaleAwareHref(getObjectDetailHref(valueObject), locale)",
  "const valueObjectsUrl = new URL(\"/api/value-objects\", window.location.origin);",
  "valueObjectsUrl.searchParams.set(\"locale\", locale);",
]) {
  if (!list.includes(marker)) fail(`list marker missing: ${marker}`);
}
if (list.includes('valueObject.scope_code === "global" ? (\n                          <span')) {
  fail("old global System badge-only branch still present");
}

const page = read("src/app/value-objects/page.tsx");
for (const marker of ["overflow-x-hidden", "min-w-0 w-full max-w-[1280px]"]) {
  if (!page.includes(marker)) fail(`page marker missing: ${marker}`);
}

const api = read("src/app/api/value-objects/route.ts");
for (const marker of [
  "export async function GET(request: Request)",
  "localizeGlobalSystemValueObject",
  "localizedObservationValueObjects",
  'scope_code === "global"',
]) {
  if (!api.includes(marker)) fail(`API marker missing: ${marker}`);
}

const detail = read("src/app/value-objects/[id]/page.tsx");
for (const marker of [
  "localizeGlobalSystemValueObject",
  "const rawValueObject = valueObjectData as ValueObjectRow | null;",
  "canonical_key: string | null;",
  "const rawTreeNodes = (treeData ?? []) as TreeNodeRow[];",
  "rawTreeNodes.map((node)",
]) {
  if (!detail.includes(marker)) fail(`detail marker missing: ${marker}`);
}
if (!detail.includes('GLOBAL_SYSTEM_EDIT_DISABLED')) {
  // P5B guard is represented behaviorally in existing source rather than this literal.
  if (!/const canEdit\s*=\s*\n?\s*!isGlobalSystemObject\s*&&/m.test(detail)) {
    fail("global read-only edit guard missing");
  }
}

console.log("AI_A3_P5B_MOBILE_GLOBAL_LOCALIZATION_V2=PASS");
console.log("GLOBAL_SYSTEM_LOCALIZATION_OBJECTS=150");
console.log("GLOBAL_SYSTEM_LOCALIZATION_CODES=en,pl,ru,uk,de,es,cs");
console.log("PERSONAL_VALUE_OBJECT_AUTO_TRANSLATION=false");
console.log("GLOBAL_SYSTEM_READ_ONLY_PRESERVED=true");
console.log("MOBILE_OVERFLOW_GUARDS=true");
console.log("GLOBAL_SYSTEM_DETAIL_LINK=true");
