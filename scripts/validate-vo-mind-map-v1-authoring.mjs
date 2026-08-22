import fs from "node:fs";

const checks = [];
function check(name, passed) {
  checks.push({ name, passed: Boolean(passed) });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
}
function read(path) {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
const catalog = read(
  "src/components/workspace/value-objects/value-object-catalog-views.tsx",
);
const actualList = read(
  "src/components/workspace/value-objects/actual-value-objects-list.tsx",
);
const map = read(
  "src/components/workspace/value-objects/value-object-mind-map.tsx",
);
const recoveryV0 = read("docs/recovery/ARCTOR_VO_MIND_MAP_V0_READONLY_RU.md");
const recoveryV1 = read("docs/recovery/ARCTOR_VO_MIND_MAP_V1_AUTHORING_RU.md");
const evidence = read(
  "docs/recovery/evidence/HELP_FILES/ARCTOR_VO_MIND_MAP_V1_AUTHORING_EVIDENCE.json",
);

for (const path of [
  "src/components/workspace/value-objects/value-object-catalog-views.tsx",
  "src/components/workspace/value-objects/actual-value-objects-list.tsx",
  "src/components/workspace/value-objects/value-object-mind-map.tsx",
  "scripts/validate-vo-mind-map-v1-authoring.mjs",
  "docs/recovery/ARCTOR_VO_MIND_MAP_V0_READONLY_RU.md",
  "docs/recovery/ARCTOR_VO_MIND_MAP_V1_AUTHORING_RU.md",
  "docs/recovery/evidence/HELP_FILES/ARCTOR_VO_MIND_MAP_V1_AUTHORING_EVIDENCE.json",
]) {
  check(`FILE_EXISTS:${path}`, fs.existsSync(path));
}

check(
  "XYFLOW_DEPENDENCY_RETAINED",
  packageJson.dependencies?.["@xyflow/react"] === "12.11.3",
);
check(
  "XYFLOW_LOCK_RETAINED",
  packageLock.packages?.["node_modules/@xyflow/react"]?.version === "12.11.3",
);

check("MAP_REACT_FLOW_RETAINED", map.includes("<ReactFlow<MindMapNode, Edge>"));
check("MAP_PROVIDER_RETAINED", map.includes("<ReactFlowProvider>"));
check("MAP_REAL_PARENT_LINK_RETAINED", map.includes("valueObject.parent_value_object_id"));
check("MAP_STRUCTURAL_EDGE_RETAINED", map.includes("structural-${id}-${child.id}"));
check("MAP_DRAG_STILL_DISABLED", map.includes("nodesDraggable={false}"));
check("MAP_CONNECT_STILL_DISABLED", map.includes("nodesConnectable={false}"));
check("MAP_ATTRIBUTION_VISIBLE", map.includes('attributionPosition="bottom-right"'));
check("MAP_NO_PRO_OPTIONS", !map.includes("proOptions") && !map.includes("hideAttribution"));
check("MAP_COLLAPSE_RETAINED", map.includes("collapsedIds") && map.includes("toggleCollapsed"));
check("MAP_OPEN_CARD_RETAINED", map.includes("/value-objects/${id}"));
check("MAP_SEVEN_LOCALES", ["en", "pl", "ru", "uk", "de", "es", "cs"].every((locale) => map.includes(`${locale}: {`)));
check("MAP_CORPORATE_STYLE", map.includes("#3b6ef8") && map.includes("#eef2ff"));

check("AUTHORING_BANNER", map.includes('authoring: "Map authoring"'));
check("AUTHORING_PLUS_ICON", map.includes("<Plus size={14}"));
check("AUTHORING_ROOT_INTERMEDIATE", map.includes('canAddIntermediate: role === "root" || role === "intermediate"'));
check("AUTHORING_INTERMEDIATE_LEAF", map.includes('canAddLeaf: role === "intermediate"'));
check("AUTHORING_NEW_INTERMEDIATE_ROUTE", map.includes("/value-objects/${id}/new-intermediate"));
check("AUTHORING_NEW_LEAF_ROUTE", map.includes("/value-objects/${id}/new-leaf"));
check("AUTHORING_USES_EXISTING_FORMS", !map.includes('method: "POST"') && !map.includes('method: "PATCH"') && !map.includes('method: "PUT"'));

check("DELETE_EXISTING_API", map.includes('method: "DELETE"') && map.includes("/api/value-objects/${encodeURIComponent(deleteTarget.id)}"));
check("DELETE_SCOPE_GLOBAL_HIDDEN", map.includes('valueObject.scope_code !== "global"'));
check("DELETE_COMMERCIAL_HIDDEN", map.includes('valueObject.usage_scope !== "commercial"'));
check("DELETE_USER_DECLARED_ONLY", map.includes('valueObject.origin_type_code === "user_declared"'));
check("DELETE_INITIAL_VERSION_ONLY", map.includes("(valueObject.definition_version ?? 1) === 1"));
check("DELETE_SERVER_BLOCKER_SURFACED", map.includes("payload?.blocker?.table") && map.includes("copy.technicalDependency"));
check("DELETE_CALLBACK_TO_CATALOG", map.includes("onValueObjectDeleted?.(deleteTarget.id)"));
check("DELETE_ACTUAL_LIST_STATE_UPDATE", actualList.includes("valueObject.id !== deletedId"));
check("DELETE_CALLBACK_PROP_CHAIN", catalog.includes("onValueObjectDeleted={onValueObjectDeleted}") && actualList.includes("onValueObjectDeleted={(deletedId) =>"));

check("CATALOG_DEFINITION_VERSION_PASSED", catalog.includes("definition_version?: number | null;"));
check("CATALOG_MAP_MODE_RETAINED", catalog.includes('type ViewMode = "tree" | "cards" | "map";'));
check("CATALOG_TREE_DEFAULT_RETAINED", catalog.includes('useState<ViewMode>("tree")'));
check("CATALOG_FILTER_REUSE_RETAINED", catalog.includes("visibleIds.has(valueObject.id)"));

check("NO_DIRECT_PARENT_UPDATE", !map.includes('parent_value_object_id:') && !map.includes('.update({ parent_value_object_id'));
check("NO_REPARENT_API_CALL", !map.includes("tree-restructure/preview") && !map.includes("tree-restructure/apply"));
check("NO_DB_SCHEMA_CHANGE", recoveryV1.includes("DB schema change: NONE") && evidence.includes('"dbSchemaChange": false'));

check("RECOVERY_V0_RUNTIME_CLOSED", recoveryV0.includes("Runtime closure V0") && recoveryV0.includes("911d8c0f0dbb658f07fc47328cac5db760c26ed7"));
check("RECOVERY_V1_BASELINE", recoveryV1.includes("911d8c0f0dbb658f07fc47328cac5db760c26ed7"));
check("RECOVERY_V1_CONTROLLED_FORMS", recoveryV1.includes("new-intermediate") && recoveryV1.includes("new-leaf"));
check("RECOVERY_V1_DELETE_GUARD", recoveryV1.includes("Guarded Delete") && recoveryV1.includes("fail-closed"));
check("RECOVERY_NEXT_REPARENT", recoveryV1.includes("Mind Map V1.1 controlled reparent"));
check("EVIDENCE_V0_PASS", evidence.includes('"status": "PASS"') && evidence.includes('"commit": "911d8c0f0dbb658f07fc47328cac5db760c26ed7"'));
check("EVIDENCE_RUNTIME_PENDING", evidence.includes('"runtimeEvidencePending": true'));
check("EVIDENCE_DIRECT_PARENT_UPDATE_FALSE", evidence.includes('"directParentUpdate": false'));

const failed = checks.filter((item) => !item.passed);
console.log(
  `SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`,
);
if (failed.length > 0) process.exit(1);
