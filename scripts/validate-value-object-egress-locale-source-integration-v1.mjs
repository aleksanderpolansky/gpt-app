#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.cwd());
const release = "ARCTOR_VALUE_OBJECT_EGRESS_LOCALE_SOURCE_INTEGRATION_V1";

const checks = [];

function check(name, passed, detail = null) {
  checks.push({ check: name, passed: Boolean(passed), detail });
}

function read(relative) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

const api = read("src/app/api/value-objects/route.ts");
const list = read("src/components/workspace/value-objects/actual-value-objects-list.tsx");
const detail = read("src/app/value-objects/[id]/page.tsx");
const fullCard = read("src/components/workspace/value-objects/value-object-full-card-panel.tsx");
const editor = read("src/components/workspace/value-objects/value-object-semantic-definition-editor.tsx");
const editApi = read("src/app/api/value-objects/[id]/ontology-definition/route.ts");
const recovery = read("docs/recovery/ARCTOR_VALUE_OBJECT_EGRESS_LOCALE_SOURCE_INTEGRATION_RU_20260824.md");
const evidence = read("docs/recovery/evidence/HELP_FILES/ARCTOR_VALUE_OBJECT_EGRESS_LOCALE_SOURCE_INTEGRATION_EVIDENCE.json");

check("01_value_objects_api_present", Boolean(api));
check("02_catalog_uses_narrow_actor_rpc", api?.includes("read_actor_value_object_catalog_localized_v1"));
check("03_catalog_no_eager_ai_localization", api?.includes("persistHumanLocalizedEntityContent") && !api?.includes("localizeEntityContent("));
check("04_catalog_no_backfill_flag", !api?.includes("localizationBackfillNeeded"));
check("05_client_backfill_removed", Boolean(list) && !list.includes("/api/value-objects/localization/backfill"));
check("06_catalog_detail_prefetch_disabled", list?.includes("prefetch={false}"));
check("07_detail_uses_narrow_tree_rpc", detail?.includes("read_actor_value_object_tree_localized_v1"));
check("08_detail_parallelizes_secondary_reads", detail?.includes("[ownerPresentation, organizationLocation, treeNodes, criteriaData]") && detail.includes("await Promise.all(["));
check("09_detail_actor_tree_no_metadata_localization", Boolean(detail) && !detail.includes("fallback: { title: node.title }"));
check("10_detail_prefetch_disabled", (detail?.match(/prefetch=\{false\}/g) ?? []).length >= 3);
check("11_nonleaf_standards_guard", fullCard?.includes('initialNodeRoleCode === "leaf"') && fullCard.includes("Promise.resolve(null)"));
check(
  "12_editor_sends_locale",
  (editor?.match(/\r?\n\s*locale,\r?\n/g) ?? []).length >= 2,
  "line-ending agnostic: locale must be present in both editor save payloads",
);
check("13_edit_api_locale_allowlist", editApi?.includes("CONTENT_LOCALES"));
check("14_edit_api_uses_locale_wrapper", editApi?.includes("edit_value_object_localized_definition_v1"));
check("15_edit_api_sends_locale_rpc_arg", editApi?.includes("p_locale: locale"));
check(
  "16_request_hash_includes_locale",
  /patch,\r?\n\s*locale,/.test(editApi ?? ""),
  "line-ending agnostic: locale is part of idempotency/request hash input",
);
check("17_recovery_present", Boolean(recovery));
check("18_recovery_evidence_placeholder_present", recovery?.includes("__ARCTOR_VO_EGRESS_LOCALE_SOURCE_EVIDENCE__"));
check("19_evidence_json_present", Boolean(evidence));

let parsedEvidence = null;
try {
  parsedEvidence = evidence ? JSON.parse(evidence) : null;
} catch {}
check("20_evidence_json_valid", Boolean(parsedEvidence));
check("21_evidence_baseline_locked", parsedEvidence?.baseline === "7d56b66ba989eccaabc07ba86ed1616919629d08");
check("22_db_postcheck_recorded", parsedEvidence?.dbFoundation?.allPass === true && parsedEvidence?.dbFoundation?.passed === 25);
check("23_no_source_auto_backfill", !list?.includes("localizationBackfillNeeded"));
check("24_global_localization_catalog_preserved", api?.includes("localizeGlobalSystemValueObject"));
check(
  "25_actor_catalog_metadata_envelope_not_returned",
  api?.includes("read_actor_value_object_catalog_localized_v1") &&
    api.includes("public_image_url") &&
    api.includes("metadata_json: publicImageUrl") &&
    !api.includes("metadata_json: row.metadata_json"),
  "actor RPC returns narrow fields; source may synthesize only minimal public image metadata for existing UI compatibility",
);
check("26_human_edit_does_not_trigger_translation", api?.includes("persistHumanLocalizedEntityContent"));
check("27_leaf_standards_endpoint_retained", fullCard?.includes("/standards"));
check("28_existing_p2c_api_contract_still_present", editApi?.includes("normalizeEditRequest"));
check("29_locale_added_to_idempotency_hash", editApi?.includes("locale: string"));
check("30_release_recovery_path", recovery?.includes("ARCTOR_VALUE_OBJECT_EGRESS_LOCALE_SOURCE_INTEGRATION_V1"));
check(
  "31_actor_catalog_rpc_row_explicitly_typed",
  api?.includes(
    "const ownedValueObjects = (ownedResult.data ?? []).map((row: Record<string, unknown>) => {",
  ),
  "guards TS7006 from production V2 attempt",
);
check(
  "32_detail_criteria_declared_once",
  (detail?.match(/const criteria =/g) ?? []).length === 1,
  "guards TS2451 duplicate criteria declaration from production V2 attempt",
);
check(
  "33_obsolete_actor_localization_helpers_removed",
  Boolean(api) &&
    !api.includes("readLocalizedContentEnvelope") &&
    !api.includes("localizeActorOwnedObservationObject"),
  "guards the two no-unused-vars warnings found by production V3 ESLint",
);
check(
  "34_full_card_effect_dependency_complete",
  fullCard?.includes(
    "}, [valueObjectId, locale, initialNodeRoleCode]);",
  ),
  "guards react-hooks/exhaustive-deps warning found by production V3 ESLint",
);

const failed = checks.filter((item) => !item.passed);
const result = {
  release,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

console.log(JSON.stringify(result, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
