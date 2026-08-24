import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let total = 0;
let passed = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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

const files = [
  "src/components/workspace/value-objects/actual-value-objects-list.tsx",
  "src/components/workspace/value-objects/value-object-catalog-views.tsx",
  "src/components/workspace/value-objects/value-object-mind-map.tsx",
  "src/app/api/value-objects/route.ts",
  "src/app/value-objects/[id]/new-intermediate/intermediate-create-form.tsx",
  "src/app/value-objects/[id]/new-leaf/leaf-create-form.tsx",
  "src/app/api/value-objects/[id]/tree-restructure/preview/route.ts",
  "src/app/api/value-objects/[id]/tree-restructure/apply/route.ts",
  "scripts/validate-vo-mind-map-v1-1-controlled-reparent.mjs",
  "docs/recovery/ARCTOR_VO_MIND_MAP_V1_1_CONTROLLED_REPARENT_RU.md",
  "docs/recovery/evidence/HELP_FILES/ARCTOR_VO_MIND_MAP_V1_1_CONTROLLED_REPARENT_EVIDENCE.json",
  "docs/recovery/ARCTOR_VO_MIND_MAP_V1_2_FAST_AUTHORING_RU.md",
  "docs/recovery/evidence/HELP_FILES/ARCTOR_VO_MIND_MAP_V1_2_FAST_AUTHORING_EVIDENCE.json",
];
for (const file of files) check(`FILE_EXISTS:${file}`, exists(file));

const actual = read(files[0]);
const catalog = read(files[1]);
const map = read(files[2]);
const api = read(files[3]);
const intermediateForm = read(files[4]);
const leafForm = read(files[5]);
const v11Validator = read(files[8]);
const recoveryV11 = read(files[9]);
const evidenceV11 = read(files[10]);
const recoveryV12 = read(files[11]);
const evidenceV12 = read(files[12]);

check("FAST_COPY_PRESENT", map.includes("const FAST_CREATE_COPY"));
check("FAST_ROLE_TYPE", map.includes('type FastCreateRole = "intermediate" | "leaf"'));
check("FAST_TARGET_TYPE", map.includes("type FastCreateTarget"));
check("FAST_RESPONSE_TYPE", map.includes("type FastCreateResponse"));
check("FAST_MODAL_PRESENT", map.includes('aria-labelledby="mind-map-fast-create-title"'));
check("FAST_PARENT_SHOWN", map.includes("{createTarget.parentTitle}"));
check("FAST_TYPE_SWITCH", map.includes('selectCreateRole("intermediate")') && map.includes('selectCreateRole("leaf")'));
check("FAST_ROOT_LEAF_FAIL_CLOSED", map.includes('role === "leaf" && parentRole !== "intermediate"'));
check("FAST_ROOT_MODAL_LEAF_HIDDEN", map.includes('createTarget.parentRole === "intermediate"'));
check("FAST_NAME_FIELD", map.includes("value={createTitle}") && map.includes("maxLength={180}"));
check("FAST_DESCRIPTION_FIELD", map.includes("value={createDescription}") && map.includes("maxLength={4000}"));
check("FAST_NAME_REQUIRED", map.includes("fastCreateCopy.nameRequired"));
check("FAST_DOUBLE_SUBMIT_GUARD", map.includes("createPending || createResult?.ok"));
check("FAST_CREATE_PENDING_DISABLED", map.includes("disabled={createPending || !createTitle.trim()}"));
check("FAST_POST_EXISTING_API", map.includes('fetch("/api/value-objects"'));
check("FAST_POST_METHOD", map.includes('method: "POST"'));
check("FAST_INTERMEDIATE_MODE", map.includes('"intermediate_branch_active_v4"'));
check("FAST_LEAF_MODE", map.includes('"leaf_branch_active_v4"'));
check("FAST_PARENT_PAYLOAD", map.includes("parentValueObjectId: createTarget.parentId"));
check("FAST_LOCALE_PAYLOAD", map.includes("locale,"));
check("FAST_IDEMPOTENCY_PREFIX", map.includes('createIdempotencyKey("mind-map-fast-create")'));
check("FAST_RESPONSE_REQUIRES_ID", map.includes("const createdId = payload?.valueObject?.id"));
check("FAST_NO_FAKE_ON_ERROR", map.includes("if (!response.ok || payload?.ok !== true || !payload.redirectUrl || !createdId)"));
check("FAST_CREATED_STATE", map.includes("setCreateResult(payload)"));
check("FAST_PARENT_AUTO_EXPAND", map.includes("next.delete(createTarget.parentId)"));
check("FAST_SHARED_CALLBACK", map.includes("onValueObjectCreated?.(createdValueObject)"));
check("FAST_SUCCESS_OPEN_OBJECT", map.includes("createResult.redirectUrl") && map.includes("fastCreateCopy.openObject"));
check("FAST_SUCCESS_CONTINUE_MAP", map.includes("fastCreateCopy.close"));
check("FAST_NODE_MENU_BUTTONS", map.includes("data.onCreateRequest(id, data.title, data.role, \"intermediate\")") && map.includes("data.onCreateRequest(id, data.title, data.role, \"leaf\")"));
check("FAST_OLD_PAGE_LINKS_REMOVED_FROM_MAP", !map.includes("intermediateHref:") && !map.includes("leafHref:"));
check("FAST_NO_NEW_CREATE_ENDPOINT", !map.includes("/fast-create") && !map.includes("/map-create"));
check("FAST_NO_DIRECT_SUPABASE", !map.includes('supabase.from("value_objects")') && !map.includes("createClient("));

check("CALLBACK_MAP_EXPORT", map.includes("onValueObjectCreated?: (createdValueObject: MindMapValueObject) => void"));
check("CALLBACK_MAP_CANVAS", map.includes("onValueObjectCreated={onValueObjectCreated}"));
check("CALLBACK_CATALOG_TYPE", catalog.includes("onValueObjectCreated?: (createdValueObject: ValueObjectPayload) => void"));
check("CALLBACK_CATALOG_DESTRUCTURE", catalog.includes("onValueObjectCreated,"));
check("CALLBACK_CATALOG_MAP", catalog.includes("onValueObjectCreated={onValueObjectCreated}"));
check("CALLBACK_ACTUAL_LIST", actual.includes("onValueObjectCreated={(createdValueObject) =>"));
check("CALLBACK_ACTUAL_NO_DUP", actual.includes("valueObject.id === createdValueObject.id"));
check("CALLBACK_ACTUAL_APPEND", actual.includes("[...current, createdValueObject]"));

check("SERVER_INTERMEDIATE_MODE_RETAINED", api.includes("intermediate_branch_active_v4"));
check("SERVER_LEAF_MODE_RETAINED", api.includes("leaf_branch_active_v4"));
check("SERVER_PARENT_GUARD_RETAINED", api.includes("Children can be created only under an ontology-ready owned root or intermediate observation object"));
check("SERVER_LEAF_INTERMEDIATE_GUARD", api.includes("VO_AUTHORING_LEAF_REQUIRES_INTERMEDIATE_BRANCH"));
check("SERVER_CREATE_LOCALIZATION_RETAINED", api.includes("localizeCreatedObservationObject"));
check("SERVER_CREATE_RETURNS_VALUE_OBJECT", api.includes("valueObject: created.card.valueObject"));
check("SERVER_CREATE_RETURNS_REDIRECT", api.includes("redirectUrl: buildValueObjectDetailUrl"));
check("FULL_INTERMEDIATE_FORM_CONTRACT_RETAINED", intermediateForm.includes('creationMode: "intermediate_branch_active_v4"'));
check("FULL_LEAF_FORM_CONTRACT_RETAINED", leafForm.includes('creationMode: "leaf_branch_active_v4"'));
check(
  "V11_CREATE_REGRESSION_FORWARD_COMPAT_INTERMEDIATE",
  v11Validator.includes("const legacyIntermediateCreateSurface") &&
    v11Validator.includes("const inlineIntermediateCreateSurface") &&
    v11Validator.includes(
      "legacyIntermediateCreateSurface || inlineIntermediateCreateSurface",
    ),
);
check(
  "V11_CREATE_REGRESSION_FORWARD_COMPAT_LEAF",
  v11Validator.includes("const legacyLeafCreateSurface") &&
    v11Validator.includes("const inlineLeafCreateSurface") &&
    v11Validator.includes("legacyLeafCreateSurface || inlineLeafCreateSurface"),
);

check("V11_VERTICAL_RETAINED", map.includes("Position.Top") && map.includes("Position.Bottom") && map.includes("y: depth * (NODE_HEIGHT + LEVEL_GAP)"));
check("V11_REPARENT_PREVIEW_RETAINED", map.includes("/tree-restructure/preview"));
check("V11_REPARENT_APPLY_RETAINED", map.includes("/tree-restructure/apply"));
check("V11_PREVIEW_HASH_RETAINED", map.includes("previewHash: reparentPreview.previewHash"));
check("V11_NO_DIRECT_PARENT_UPDATE", !map.includes(".update({ parent_value_object_id") && !map.includes('supabase.from("value_objects").update'));
check("V11_ROOT_DRAG_DISABLED", map.includes('role !== "root"'));
check("V11_LEAF_TARGET_RULE", map.includes('sourceRole === "leaf"') && map.includes('candidate.data.role === "intermediate"'));
check("V1_DELETE_RETAINED", map.includes('method: "DELETE"') && map.includes("canRequestDelete"));
check("V0_COLLAPSE_RETAINED", map.includes("toggleCollapsed") && map.includes("collapsedIds"));
check("V0_OPEN_RETAINED", map.includes("data.href") && map.includes("data.openLabel"));
check("NODES_CONNECT_DISABLED", map.includes("nodesConnectable={false}"));

for (const locale of ["en", "pl", "ru", "uk", "de", "es", "cs"]) {
  const pattern = new RegExp(`\\n  ${locale}: \\{([\\s\\S]*?)\\n  \\},`, "g");
  const blocks = [...map.matchAll(pattern)];
  check(`FAST_LOCALE_${locale.toUpperCase()}`, blocks.length >= 3, `blocks=${blocks.length}`);
}

check("RECOVERY_V11_RUNTIME_CLOSED", recoveryV11.includes("Runtime closure V1.1") && recoveryV11.includes("1670e9067b3c46a4ae37da44c11a3862aa19590d"));
check("RECOVERY_V11_FORWARD_REVERSE", recoveryV11.includes("forward") && recoveryV11.includes("reverse") && recoveryV11.includes("исходная правильная ветвь полностью восстановлена"));
check("EVIDENCE_V11_RUNTIME_FALSE", evidenceV11.includes('"runtimeEvidencePending": false'));
check("EVIDENCE_V11_FORWARD", evidenceV11.includes('"forwardApply": true'));
check("EVIDENCE_V11_REVERSE", evidenceV11.includes('"reverseApply": true'));
check("EVIDENCE_V11_RESTORED", evidenceV11.includes('"finalStructureRestored": true'));
check("RECOVERY_V12_BASELINE", recoveryV12.includes("1670e9067b3c46a4ae37da44c11a3862aa19590d"));
check("RECOVERY_V12_EXISTING_POST", recoveryV12.includes("POST /api/value-objects") && recoveryV12.includes("не вводит новый endpoint/RPC"));
check("RECOVERY_V12_MODES", recoveryV12.includes("intermediate_branch_active_v4") && recoveryV12.includes("leaf_branch_active_v4"));
check("RECOVERY_V12_SHARED_STATE", recoveryV12.includes("единый `valueObjects` state"));
check("RECOVERY_V12_NO_DB", recoveryV12.includes("DB schema change: NONE"));
check("EVIDENCE_V12_PENDING", evidenceV12.includes('"runtimeEvidencePending": true'));
check("EVIDENCE_V12_NO_NEW_API", evidenceV12.includes('"newWriteApi": false'));
check("EVIDENCE_V12_SHARED_STATE", evidenceV12.includes('"immediateSharedClientState": true'));
check("EVIDENCE_V12_SEVEN_LOCALES", evidenceV12.includes('"cs"'));

console.log(`SUMMARY total=${total} passed=${passed} failed=${total - passed}`);
if (passed !== total) process.exit(1);
