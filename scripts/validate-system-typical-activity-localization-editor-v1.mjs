import fs from "node:fs";
import path from "node:path";

const repo = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const catalogPath = path.join(repo, "src/app/activity-templates/system-activity-template-catalog.tsx");
const routePath = path.join(repo, "src/app/api/activity-template-impact-profiles/system/[id]/route.ts");

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`MISSING_FILE:${file}`);
  return fs.readFileSync(file, "utf8");
}

const catalog = read(catalogPath);
const route = read(routePath);
const checks = [];
function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
}

check("route exports PATCH localization editor", route.includes("export async function PATCH("));
check("PATCH is protected by platform admin guard", route.includes("await requirePlatformAdmin()") && route.includes("platformAdminErrorResponse("));
check("seven supported locales are explicit", ["\"en\"", "\"pl\"", "\"ru\"", "\"uk\"", "\"de\"", "\"es\"", "\"cs\""].every(x => route.includes(x)));
check("localization writes curatorSystemMaterializationV1.localizations", route.includes("curatorSystemMaterializationV1") && route.includes("nextLocalizations"));
check("human admin audit contract is persisted", route.includes("ARCTOR_SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_EDIT_V1") && route.includes("human_admin") && route.includes("confirmed"));
check("optimistic concurrency uses expectedUpdatedAt", route.includes("expectedUpdatedAt") && route.includes("SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_CONFLICT"));
check("English edit updates canonical columns only in en branch", route.includes('if (locale === "en")') && route.includes("updatePayload.title") && route.includes("updatePayload.short_title"));
check("recognition aliases are preserved and extended", route.includes("recognitionAliases") && route.includes("uniqueAliases"));
check("PATCH reports no profile/parameter/routing/OpenAI writes", route.includes("profileWriteExecuted:\n            false") && route.includes("parameterWriteExecuted:\n            false") && route.includes("routingWriteExecuted:\n            false") && route.includes("openAiCallExecuted:\n            false"));
check("GET exposes fallback and available-locale state", route.includes("hasRequestedLocalization") && route.includes("fallbackUsed") && route.includes("availableLocales"));
check("catalog contains manual localization editor", catalog.includes("LOCALIZATION_EDITOR_COPY") && catalog.includes("saveLocalization") && catalog.includes("Редактировать локализацию"));
check("catalog shows explicit English fallback state", catalog.includes("fallbackUsed") && catalog.includes("fallbackBody") && catalog.includes("canonicalHint"));
check("editor copy exists for all seven locales", ["en:", "pl:", "ru:", "uk:", "de:", "es:", "cs:"].every(x => catalog.includes(x)));
check("corporate ARCTor blue is used", catalog.includes("#3b6ef8") && catalog.includes("#eef3ff") && catalog.includes("#1a1d2e"));
check("corporate card geometry is used", catalog.includes("rounded-[18px]") && catalog.includes("border-black/[0.07]") && catalog.includes("shadow-sm"));
check("no automatic translation call added", !route.includes("generateLocalizedContentBatch") && !catalog.includes("generateLocalizedContentBatch") && !route.includes("openai"));

const failed = checks.filter(x => !x.ok);
console.log(`VALIDATOR=${failed.length === 0 ? "PASS" : "FAIL"}_${checks.length - failed.length}_${checks.length}`);
if (failed.length) process.exit(1);
