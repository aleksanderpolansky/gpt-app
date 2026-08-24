import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let total = 0;
let passed = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function check(name, condition, detail = "") {
  total += 1;
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}${detail ? `: ${detail}` : ""}`);
  } else {
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  }
}

const paths = {
  packageJson: "package.json",
  packageLock: "package-lock.json",
  actual: "src/components/workspace/value-objects/actual-value-objects-list.tsx",
  catalog: "src/components/workspace/value-objects/value-object-catalog-views.tsx",
  map: "src/components/workspace/value-objects/value-object-mind-map.tsx",
  preview: "src/app/api/value-objects/[id]/tree-restructure/preview/route.ts",
  apply: "src/app/api/value-objects/[id]/tree-restructure/apply/route.ts",
  types: "src/types/value-object-tree-restructure.ts",
  recoveryV1: "docs/recovery/ARCTOR_VO_MIND_MAP_V1_AUTHORING_RU.md",
  evidenceV1: "docs/recovery/evidence/HELP_FILES/ARCTOR_VO_MIND_MAP_V1_AUTHORING_EVIDENCE.json",
  recoveryV11: "docs/recovery/ARCTOR_VO_MIND_MAP_V1_1_CONTROLLED_REPARENT_RU.md",
  evidenceV11: "docs/recovery/evidence/HELP_FILES/ARCTOR_VO_MIND_MAP_V1_1_CONTROLLED_REPARENT_EVIDENCE.json",
};

for (const relativePath of Object.values(paths)) {
  check(`FILE_EXISTS:${relativePath}`, fs.existsSync(path.join(root, relativePath)));
}

const packageJson = read(paths.packageJson);
const packageLock = read(paths.packageLock);
const actual = read(paths.actual);
const catalog = read(paths.catalog);
const map = read(paths.map);
const preview = read(paths.preview);
const apply = read(paths.apply);
const types = read(paths.types);
const recoveryV1 = read(paths.recoveryV1);
const evidenceV1 = read(paths.evidenceV1);
const recoveryV11 = read(paths.recoveryV11);
const evidenceV11 = read(paths.evidenceV11);

check("XYFLOW_DEPENDENCY_RETAINED", JSON.parse(packageJson).dependencies?.["@xyflow/react"] === "12.11.3");
check("XYFLOW_LOCK_RETAINED", packageLock.includes('"node_modules/@xyflow/react"'));
check("MAP_REACT_FLOW_RETAINED", map.includes("<ReactFlow<MindMapNode, Edge>"));
check("MAP_PROVIDER_RETAINED", map.includes("<ReactFlowProvider>"));
check("MAP_ATTRIBUTION_VISIBLE", map.includes('attributionPosition="bottom-right"'));
check("MAP_NO_PRO_OPTIONS", !map.includes("proOptions") && !map.includes("hideAttribution"));

check("VERTICAL_TARGET_HANDLE_TOP", map.includes("position={Position.Top}"));
check("VERTICAL_SOURCE_HANDLE_BOTTOM", map.includes("position={Position.Bottom}"));
check("VERTICAL_NEXT_X", map.includes("let nextX = 0"));
check("VERTICAL_DEPTH_IS_Y", map.includes("y: depth * (NODE_HEIGHT + LEVEL_GAP)"));
check("VERTICAL_X_FROM_SIBLING_LAYOUT", map.includes("const childXs: number[] = []"));
check("HORIZONTAL_DEPTH_LAYOUT_REMOVED", !map.includes("x: depth * (NODE_WIDTH + LEVEL_GAP)"));
check("VERTICAL_ROOT_GAP", map.includes("nextX += ROOT_GAP"));

check("REPARENT_USE_NODES_STATE", map.includes("useNodesState<MindMapNode>"));
check("REPARENT_DRAG_STOP_HANDLER", map.includes("onNodeDragStop"));
check("REPARENT_NODES_DRAGGABLE", map.includes("nodesDraggable"));
check("REPARENT_NODE_PER_NODE_GUARD", map.includes("draggable: canReparent(valueObject)"));
check("REPARENT_ROOT_DISABLED", map.includes('role !== "root"'));
check("REPARENT_PRIVATE_USER_DECLARED_ONLY", map.includes('valueObject.origin_type_code === "user_declared"'));
check("REPARENT_GLOBAL_DISABLED", map.includes('valueObject.scope_code !== "global"'));
check("REPARENT_COMMERCIAL_DISABLED", map.includes('valueObject.usage_scope !== "commercial"'));
check("REPARENT_LEAF_TARGET_INTERMEDIATE_ONLY", map.includes('sourceRole === "leaf"') && map.includes('candidate.data.role === "intermediate"'));
check("REPARENT_INTERMEDIATE_TARGET_ROOT_OR_INTERMEDIATE", map.includes('candidate.data.role === "root"') && map.includes('candidate.data.role === "intermediate"'));
check("REPARENT_SELF_BLOCKED", map.includes("candidate.id === node.id"));
check("REPARENT_TARGET_ID_NARROWED_FROM_FLOW_NODE", map.includes("const targetId = targetNode.id"));
check("REPARENT_TARGET_PATH_USES_REQUIRED_STRING_ID", map.includes("buildLocalizedPath(valueObjectsById, targetId)"));
check("REPARENT_SOURCE_ID_USES_REQUIRED_NODE_ID", map.includes("sourceId: node.id"));
check("REPARENT_NEW_PARENT_ID_USES_REQUIRED_TARGET_ID", map.includes("newParentId: targetId"));
check("REPARENT_OPTIONAL_TARGET_ID_PATH_REMOVED", !map.includes("buildLocalizedPath(valueObjectsById, targetObject.id)"));
check("REPARENT_CURRENT_PARENT_NOOP", map.includes("sourceObject.parent_value_object_id === targetId"));
check("REPARENT_DESCENDANT_BLOCKED", map.includes("isDescendantOf") && map.includes("target.newParentId, target.sourceId"));
check("REPARENT_SNAP_BACK_BEFORE_PREVIEW", map.includes("setFlowNodes(graph.nodes)"));

check("REPARENT_PREVIEW_ENDPOINT", map.includes("/tree-restructure/preview"));
check("REPARENT_APPLY_ENDPOINT", map.includes("/tree-restructure/apply"));
check("REPARENT_MODE", map.includes('mode: "reparent"'));
check("REPARENT_PAYLOAD", map.includes("newParentValueObjectId: target.newParentId") || map.includes("newParentValueObjectId: reparentTarget.newParentId"));
check("REPARENT_PREVIEW_HASH", map.includes("previewHash: reparentPreview.previewHash"));
check("REPARENT_IDEMPOTENCY", map.includes('createIdempotencyKey("mind-map-reparent")'));
check("REPARENT_PREVIEW_WARNINGS", map.includes("reparentPreview.warnings"));
check("REPARENT_AFFECTED_COUNT", map.includes("reparentPreview.affectedNodes.length"));
check("REPARENT_CONFIRM_REQUIRED", map.includes("reparentCopy.confirm") && map.includes("applyReparent"));
check("REPARENT_CALLBACK_MAP", map.includes("onValueObjectReparented?.("));
check("REPARENT_CALLBACK_CATALOG", catalog.includes("onValueObjectReparented={onValueObjectReparented}"));
check("REPARENT_CALLBACK_ACTUAL_LIST", actual.includes("onValueObjectReparented={(movedId, newParentId)"));
check("REPARENT_CLIENT_STATE_UPDATE", actual.includes("parent_value_object_id: newParentId"));

check("NO_DIRECT_PARENT_UPDATE", !map.includes(".update({ parent_value_object_id") && !map.includes('supabase.from("value_objects").update'));
check("NO_NEW_REPARENT_API", !map.includes("/api/value-objects/reparent"));
check("NO_DB_SCHEMA_CHANGE", recoveryV11.includes("DB schema change: NONE"));
check("NO_AUTO_HISTORICAL_RECALC", recoveryV11.includes("не запускает автоматический полный пересчёт прошлой истории"));
check("HISTORICAL_RECALC_SEPARATE_BUDGETED_OPERATION", recoveryV11.includes("отдельная платная операция") && recoveryV11.includes("жёсткого token cap"));

check("PREVIEW_RPC_RETAINED", preview.includes('"preview_value_object_tree_restructure_v1"'));
check("APPLY_RPC_RETAINED", apply.includes('"apply_value_object_tree_restructure_v1"'));
check("APPLY_REQUEST_HASH_RETAINED", apply.includes('createHash("sha256")'));
check("APPLY_PREVIEW_HASH_REQUIRED", apply.includes("previewHash and idempotencyKey are required"));
check("REPARENT_TYPE_RETAINED", types.includes("export type ReparentTreePayload"));
check("REPARENT_TYPE_PARENT_FIELD", types.includes("newParentValueObjectId: string | null"));

const legacyIntermediateCreateSurface = map.includes(
  "/value-objects/${id}/new-intermediate",
);
const legacyLeafCreateSurface = map.includes("/value-objects/${id}/new-leaf");
const inlineIntermediateCreateSurface =
  map.includes('fetch("/api/value-objects"') &&
  map.includes('"intermediate_branch_active_v4"') &&
  map.includes(
    'data.onCreateRequest(id, data.title, data.role, "intermediate")',
  ) &&
  map.includes("onValueObjectCreated?.(createdValueObject)");
const inlineLeafCreateSurface =
  map.includes('fetch("/api/value-objects"') &&
  map.includes('"leaf_branch_active_v4"') &&
  map.includes('data.onCreateRequest(id, data.title, data.role, "leaf")') &&
  map.includes('role === "leaf" && parentRole !== "intermediate"') &&
  map.includes("onValueObjectCreated?.(createdValueObject)");

check(
  "CREATE_INTERMEDIATE_RETAINED",
  legacyIntermediateCreateSurface || inlineIntermediateCreateSurface,
);
check(
  "CREATE_LEAF_RETAINED",
  legacyLeafCreateSurface || inlineLeafCreateSurface,
);
check("DELETE_RETAINED", map.includes('method: "DELETE"'));
check("DELETE_SERVER_BLOCKER_RETAINED", map.includes("payload?.blocker?.table"));
check("COLLAPSE_RETAINED", map.includes("toggleCollapsed"));
check("OPEN_CARD_RETAINED", map.includes("buildLocaleAwareHref(`/value-objects/${id}`"));
check("NODES_CONNECT_DISABLED", map.includes("nodesConnectable={false}"));

for (const locale of ["en", "pl", "ru", "uk", "de", "es", "cs"]) {
  const count = (map.match(new RegExp(`\\n  ${locale}: \\{`, "g")) ?? []).length;
  check(`REPARENT_LOCALE_${locale.toUpperCase()}`, count >= 2, `blocks=${count}`);
}

check("RECOVERY_V1_RUNTIME_CLOSED", recoveryV1.includes("Runtime closure V1") && recoveryV1.includes("CLOSED / PASS"));
check("EVIDENCE_V1_RUNTIME_PASS", evidenceV1.includes('"runtimeEvidencePending": false') && evidenceV1.includes('"status": "PASS"'));
check("EVIDENCE_V1_DESTRUCTIVE_DELETE_NOT_REQUIRED", evidenceV1.includes('"destructiveDeleteExecuted": false'));
check("RECOVERY_V11_BASELINE", recoveryV11.includes("b3fab10e35fbbf80282d486de022ab7b224314fb"));
check("RECOVERY_V11_VERTICAL", recoveryV11.includes("roots находятся сверху"));
check("RECOVERY_V11_PREVIEW_APPLY", recoveryV11.includes("preview") && recoveryV11.includes("apply"));
check("RECOVERY_V11_ROOT_DRAG_DISABLED", recoveryV11.includes("Root в V1.1 не перетаскивается"));
check("RECOVERY_V11_LEAF_TARGET_RULE", recoveryV11.includes("source=`leaf`") && recoveryV11.includes("только `intermediate`"));
check("EVIDENCE_V11_VERTICAL", evidenceV11.includes('"direction": "top-to-bottom"'));
check("EVIDENCE_V11_DIRECT_PARENT_FALSE", evidenceV11.includes('"directParentUpdate": false'));
check("EVIDENCE_V11_ROOT_REPARENT_FALSE", evidenceV11.includes('"rootReparent": false'));
check("EVIDENCE_V11_HISTORY_FALSE", evidenceV11.includes('"historicalRecalculation": false'));
check("RECOVERY_V11_V1_TYPECHECK_FAILURE_RECORDED", recoveryV11.includes("optional `targetObject.id`") && recoveryV11.includes("rollback к `b3fab10e35fbbf80282d486de022ab7b224314fb`"));
check("EVIDENCE_V11_V1_FAIL_BEFORE_COMMIT", evidenceV11.includes('"status": "FAIL_BEFORE_COMMIT"') && evidenceV11.includes('"rollback": "PASS"'));
check("EVIDENCE_V11_V2_TARGET_ID_FIX", evidenceV11.includes('"revision": "V2_TARGET_ID_NARROWING"') && evidenceV11.includes('"targetIdSource": "targetNode.id"'));

console.log(`SUMMARY total=${total} passed=${passed} failed=${total - passed}`);
process.exit(total === passed ? 0 : 1);
