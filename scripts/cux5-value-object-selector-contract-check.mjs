import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  selector: path.join(
    root,
    "src/components/activity/pp1/planned-target-selector.tsx",
  ),
  api: path.join(
    root,
    "src/app/api/value-objects/selector/route.ts",
  ),
  doc: path.join(
    root,
    "docs/CUX5_SCALABLE_VALUE_OBJECT_SELECTOR_RU_20260728.md",
  ),
};

const content = Object.fromEntries(
  Object.entries(files).map(([key, filePath]) => [
    key,
    fs.readFileSync(filePath, "utf8"),
  ]),
);


const checks = [
  ["selector client component", content.selector.includes('"use client";')],
  ["selector public export preserved", content.selector.includes("export function PlannedTargetSelectorPp1")],
  ["selectedIds prop preserved", content.selector.includes("selectedIds: string[]")],
  ["onChange IDs preserved", content.selector.includes("onChange: (ids: string[]) => void")],
  ["selector API used", content.selector.includes("/api/value-objects/selector")],
  ["branch policy API used", content.selector.includes("/api/value-object-branch-policies")],
  ["branch policy localization used", content.selector.includes("resolveValueObjectBranchPolicyTitle")],
  ["query state present", content.selector.includes("const [query, setQuery]")],
  ["query debounce present", content.selector.includes("setDebouncedQuery")],
  ["branch filter present", content.selector.includes("branchFilter")],
  ["level filter present", content.selector.includes("levelFilter")],
  ["root filter present", content.selector.includes('<option value="root">')],
  ["intermediate filter present", content.selector.includes('<option value="intermediate">')],
  ["leaf filter present", content.selector.includes('<option value="leaf">')],
  ["all tab present", content.selector.includes('"all", "recent", "favorite"')],
  ["recent state present", content.selector.includes("recentIds")],
  ["favorite state present", content.selector.includes("favoriteIds")],
  ["actor-scoped storage present", content.selector.includes("arctor:cux5:${scope.actorId}")],
  ["favorite local key present", content.selector.includes('persistPreference("favorites"')],
  ["recent local key present", content.selector.includes('persistPreference("recent"')],
  ["selected chips present", content.selector.includes("selectedOptions.map")],
  ["multiple select append present", content.selector.includes("onChange([...selectedIds, id])")],
  ["selected remove present", content.selector.includes("selectedIds.filter")],
  ["full path rendered", content.selector.includes("option.pathText")],
  ["level badge rendered", content.selector.includes("getLevelLabel(copy, option.level)")],
  ["scope rendered", content.selector.includes("{copy.scope}: {scope.displayName}")],
  ["controlled create panel present", content.selector.includes("createOpen")],
  ["root create mode present", content.selector.includes('"root_draft_v3"')],
  ["intermediate create mode present", content.selector.includes('"intermediate_draft_v3"')],
  ["leaf create mode present", content.selector.includes('"leaf_draft_v3"')],
  ["root branch required", content.selector.includes("createBranchTypeCode")],
  ["parent selection required", content.selector.includes("selectedParentId")],
  ["existing create API preserved", content.selector.includes('fetch("/api/value-objects"')],
  ["created object selected", content.selector.includes("created.id")],
  ["full editor link present", content.selector.includes("createdEditorHref")],
  ["seven locales present", ["en", "pl", "ru", "uk", "de", "es", "cs"].every((locale) => content.selector.includes(`  ${locale}: {`))],

  ["API force dynamic", content.api.includes('export const dynamic = "force-dynamic"')],
  ["API active actor resolver", content.api.includes("resolveActiveActorContext")],
  ["API auth session", content.api.includes("auth0.getSession")],
  ["API ownership user filter", content.api.includes('.eq("owner_user_id", actorContext.appUserId)')],
  ["API ownership actor filter", content.api.includes('.eq("owner_actor_id", actorContext.actorId)')],
  ["API draft active status filter", content.api.includes('.in("status", ["draft", "active"])')],
  ["API branch filter", content.api.includes("branchTypeCode")],
  ["API level filter", content.api.includes("normalizeLevel")],
  ["API root classifier", content.api.includes('row.node_role_code === "structural"') && content.api.includes("row.parent_value_object_id === null")],
  ["API intermediate classifier", content.api.includes("row.parent_value_object_id !== null")],
  ["API leaf classifier", content.api.includes('row.node_role_code === "activity_leaf"')],
  ["API aliases metadata", content.api.includes("metadata.aliases")],
  ["API aliases identity", content.api.includes("identity.aliases")],
  ["API full path builder", content.api.includes("function buildPath")],
  ["API cycle guard", content.api.includes("visited.has(current.id)")],
  ["API path search", content.api.includes("item.pathText")],
  ["API pinned IDs", content.api.includes("pinnedIds")],
  ["API result limit", content.api.includes("MAX_RESULT_LIMIT")],
  ["API source safety limit", content.api.includes("SOURCE_ROW_LIMIT")],
  ["API active profile label", content.api.includes("actor_public_profiles")],
  ["API no-store", content.api.includes('"Cache-Control": "no-store"')],

  ["doc states no primary invention", content.doc.includes("не вводит «главный» и «дополнительный» planned target")],
  ["doc states AI deferred", content.doc.includes("будущий блок AN3")],
  ["doc states no DB migration", content.doc.includes("Миграции базы отсутствуют")],
  ["doc preserves planned target", content.doc.includes("plannedTargetValueObjectIds")],

  ["no AI suggestion implementation in selector", !/candidateValueObject|suggestedValueObject|AI suggestions/i.test(content.selector)],
  ["no background AI implementation in API", !/semantic_enrichment|Impact Rule|after\(/i.test(content.api)],
];

const failures = checks.filter(([, passed]) => !passed);

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

console.log("");
console.log(`CUX5 selector contract checks: ${checks.length - failures.length}/${checks.length}`);

if (failures.length > 0) {
  process.exitCode = 1;
}
