import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`VALIDATION_FAILED:${message}`);
  }
}

const [
  catalogPath,
  listRoutePath,
  detailRoutePath,
] = process.argv.slice(2);

const catalog = read(catalogPath);
const listRoute = read(listRoutePath);
const detailRoute = read(detailRoutePath);

assert(
  catalog.includes('kind: "typical_activity"') &&
    catalog.includes('scope: "system"') &&
    catalog.includes('catalogVersion: "reality_model_v1"') &&
    catalog.includes('.eq("template_scope", "system")') &&
    catalog.includes(
      '.contains("default_metadata_json", ARCTOR_TYPICAL_ACTIVITY_METADATA_V1)',
    ),
  "canonical_metadata_contract_present",
);

assert(
  listRoute.includes("loadSystemTypicalActivityCatalogV1") &&
    listRoute.includes("canonicalCatalog") &&
    listRoute.includes("canonicalTemplateIds") &&
    listRoute.includes(".in(") &&
    listRoute.includes('"id"') &&
    listRoute.includes("canonicalTemplateIds") &&
    listRoute.includes(
      "SYSTEM_TYPICAL_ACTIVITY_CATALOG_DETAIL_MISMATCH",
    ),
  "system_list_uses_shared_catalog",
);

assert(
  !listRoute.includes('"template_scope"') &&
    !listRoute.includes('"owner_user_id"') &&
    !listRoute.includes('"owner_actor_id"'),
  "system_list_has_no_parallel_scope_definition",
);

assert(
  detailRoute.includes("loadSystemTypicalActivityCatalogV1") &&
    detailRoute.includes("canonicalTemplate") &&
    detailRoute.includes("row.id === id") &&
    detailRoute.includes(
      '"System typical activity not found"',
    ),
  "system_detail_requires_shared_catalog_membership",
);

assert(
  !detailRoute.includes('"template_scope"') &&
    !detailRoute.includes('"owner_user_id"') &&
    !detailRoute.includes('"owner_actor_id"'),
  "system_detail_has_no_parallel_scope_definition",
);

for (const forbidden of [
  "Confirmed purchase",
  "Confirmed sale",
  "Gift certificate",
  "German marketing handwriting practice",
  "Knee training health practice",
  "AI Navigator manual activity",
]) {
  assert(
    !catalog.includes(forbidden) &&
      !listRoute.includes(forbidden) &&
      !detailRoute.includes(forbidden),
    `no_name_blacklist_${forbidden}`,
  );
}

for (const mutation of [
  ".insert(",
  ".update(",
  ".upsert(",
  ".delete(",
]) {
  assert(
    !listRoute.includes(mutation) &&
      !detailRoute.includes(mutation),
    `read_only_${mutation}`,
  );
}

console.log(
  "ARCTOR_E02C1_TYPICAL_ACTIVITY_CATALOG_CONTRACT_VALIDATION: PASS",
);