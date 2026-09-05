import fs from "node:fs";
import { argv, stdout } from "node:process";

function read(path) {
  return fs.readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
}
function assert(condition, label) {
  if (!condition) throw new Error(`VALIDATION_FAILED:${label}`);
}

const [routePath, uiPath] = argv.slice(2);
if (!routePath || !uiPath) throw new Error("Usage: validator <route.ts> <ui.tsx>");
const route = read(routePath);
const ui = read(uiPath);

assert(route.includes('reality-curator-object-bootstrap-v1-6-system-only'), "route_marker");
assert(!route.includes("privateParentsResult"), "no_private_parent_query");
assert(!route.includes("privateLeavesResult"), "no_private_leaf_query");
assert(!route.includes("createPrivateObject"), "no_private_creation_function");
assert(!route.includes('.eq("scope_code", "actor")'), "no_actor_scope_value_object_query");
assert(
  route.includes('if (scope !== "system")') &&
    route.includes("CURATOR_OBJECT_SYSTEM_SCOPE_REQUIRED"),
  "system_scope_fail_closed",
);
assert(
  route.includes('.eq("scope_code", "global")') &&
    route.includes('.is("owner_user_id", null)') &&
    route.includes('.is("owner_actor_id", null)') &&
    route.includes('.eq("origin_type_code", "system_model")'),
  "system_identity_contract",
);
assert(
  route.includes('existingLeaves: systemLeaves.map((row) => toOption(row, locale))'),
  "existing_leaves_system_only",
);
assert(
  route.includes('.eq("status", "active")') &&
    route.includes('.eq("ontology_node_role_code", "leaf")'),
  "existing_leaf_active_leaf_gate",
);
assert(
  route.includes('const existing = await readAllowedExistingLeaf(selectedValueObjectId);'),
  "decision_backend_system_leaf_gate",
);
assert(
  route.includes("Selected leaf is not an active System observation-object leaf"),
  "decision_rejects_non_system_leaf",
);
assert(
  route.includes('systemOwnerless: true') &&
    route.includes('privateOwnerAppUserId: null') &&
    route.includes('privateOwnerActorId: null'),
  "system_creation_metadata",
);
assert(route.includes("async function chooseGenericKind("), "choose_generic_kind_preserved");
assert(
  (route.match(/let created: \{ valueObjectId:/g) ?? []).length === 0,
  "obsolete_created_let_removed",
);
assert(
  (route.match(/const created = await createSystemObject\(/g) ?? []).length === 1,
  "created_const_exactly_once",
);
assert(
  (route.match(/let resultSummaryRu: string;/g) ?? []).length === 0 &&
    (route.match(/let resultSummaryEn: string;/g) ?? []).length === 0,
  "obsolete_summary_lets_removed",
);
assert(
  (route.match(/const resultSummaryRu =/g) ?? []).length === 1 &&
    (route.match(/const resultSummaryEn =/g) ?? []).length === 1,
  "summary_consts_exactly_once",
);

assert(!ui.includes("setScope("), "ui_no_scope_switcher");
assert(!ui.includes("state?.privateParents"), "ui_no_private_parents");
assert(
  ui.includes('const scope: ScopeCode = "system";'),
  "ui_system_scope_constant",
);
assert(
  ui.includes('{existingLeaves.map((item) => <option key={item.id} value={item.id}>{item.title} · {copy.system}</option>)}'),
  "ui_existing_leaf_system_label",
);
assert(
  ui.includes('scope: "system"') &&
    !ui.includes('scope === "private" ? ('),
  "ui_creation_system_only",
);
assert(
  ui.includes("В этом процессе куратора доступны только системные ОН."),
  "ru_system_only_explanation",
);
assert(
  ui.includes("У цьому процесі куратора доступні лише системні об’єкти спостереження."),
  "uk_system_only_explanation",
);

stdout.write("ARCTOR_CURATOR_SYSTEM_OBJECTS_ONLY_V1_0_4_VALIDATION: PASS\n");
