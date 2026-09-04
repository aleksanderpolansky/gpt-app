import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
}
function assert(condition, message) {
  if (!condition) throw new Error(`VALIDATION_FAILED:${message}`);
}

const [
  catalogPath,
  analyzerPath,
  curatorRoutePath,
  curatorClientPath,
  workPanelPath,
  processingLogPath,
] = process.argv.slice(2);

const catalog = read(catalogPath);
const analyzer = read(analyzerPath);
const route = read(curatorRoutePath);
const client = read(curatorClientPath);
const workPanel = read(workPanelPath);
const processing = read(processingLogPath);

assert(
  catalog.includes('kind: "typical_activity"') &&
    catalog.includes('scope: "system"') &&
    catalog.includes('.eq("template_scope", "system")') &&
    catalog.includes('.contains("default_metadata_json", ARCTOR_TYPICAL_ACTIVITY_METADATA_V1)'),
  "shared_system_catalog_contract",
);
assert(
  catalog.includes("updated_at: string;") &&
    catalog.includes("SYSTEM_TYPICAL_ACTIVITY_CATALOG_INVALID_UPDATED_AT") &&
    catalog.includes("updated_at: updatedAt"),
  "catalog_updated_at_matches_activity_template_contract",
);
assert(
  analyzer.includes("loadSystemTypicalActivityCatalogV1") &&
    !analyzer.includes('.eq("template_scope", "user")') &&
    analyzer.includes('.eq("scope_code", "global")') &&
    analyzer.includes("objectIds.every"),
  "ai_uses_global_system_typical_catalog_and_system_objects_only",
);
assert(
  route.includes("loadSystemTypicalActivityCatalogV1") &&
    route.includes("ARCTOR_SYSTEM_TYPICAL_ACTIVITY_CATALOG_V1") &&
    !route.includes('.from("activity_templates")'),
  "curator_uses_same_shared_catalog",
);
for (const forbidden of [
  "Confirmed purchase",
  "Confirmed sale",
  "Gift certificate",
  "German marketing handwriting practice",
  "Knee training health practice",
  "AI Navigator manual activity",
]) {
  assert(!catalog.includes(forbidden) && !route.includes(forbidden), `no_name_blacklist_${forbidden}`);
}
assert(
  client.includes('technicalDetails: "Технические детали"') &&
    client.includes('<details className="group mt-4') &&
    client.includes("<Meta label={copy.analysisMode}"),
  "technical_details_collapsed",
);
assert(
  workPanel.includes('loadActivities: "Показать существующие типовые активности"'),
  "explicit_typical_activity_button",
);
assert(
  processing.includes('const eventsTitle = isRu ? "События" : "Events"') &&
    processing.includes('<details className="group mt-3') &&
    processing.includes("orderedBlocks") &&
    processing.includes("orderedEvents") &&
    processing.includes("right.id.localeCompare(left.id)"),
  "events_collapsed_newest_first_deterministic",
);
assert(
  !catalog.includes("commercial_activity_template"),
  "commercial_workflow_not_reclassified_as_typical_activity",
);

console.log("ARCTOR_TYPICAL_ACTIVITY_CATALOG_SCOPE_AND_CURATOR_UX_V1_VALIDATION: PASS");
