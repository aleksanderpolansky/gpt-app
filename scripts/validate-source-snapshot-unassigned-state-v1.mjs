import fs from "node:fs";

const ui = fs.readFileSync("src/app/activity-templates/source-snapshot-settings.tsx", "utf8");
const server = fs.readFileSync("src/lib/activity/source-snapshot-resolution.server.ts", "utf8");
const snapshotRoute = fs.readFileSync("src/app/api/activity/facts/snapshots/route.ts", "utf8");
const authoring = fs.readFileSync("src/lib/reality-curator/direct-system-typical-activity-authoring.server.ts", "utf8");
const behavior = fs.readFileSync("scripts/validate-source-from-snapshot-v1.cjs", "utf8");

const checks = [
  ["authoring selector uses assignment-independent state leaf catalog",
    ui.includes("body.stateLeaves") && ui.includes("StateLeafOption") && !ui.includes("body.options as Option[]")],
  ["authoring selector verifies selected parameter remains active",
    ui.includes("body.parameterOptions") && ui.includes("option.parameterDefinitionId === parameterId")],
  ["authoring UI no longer asks curator to assign parameter to source state",
    !ui.includes("Назначьте параметр объекту состояния") && !ui.includes("Assign the parameter to a state object")],
  ["authoring UI explains runtime snapshot lookup and no assignment requirement",
    ui.includes("Системное назначение ОН ↔ параметр не требуется") && ui.includes("A system object ↔ parameter assignment is not required")],
  ["snapshot binding validation checks source state leaf and numeric parameter only",
    server.includes("const [object, definition] = await Promise.all") &&
    server.includes("SOURCE_SNAPSHOT_ACTIVE_STATE_LEAF_AND_PARAMETER_REQUIRED") &&
    !server.includes('from("value_object_parameter_assignments")')],
  ["runtime snapshot resolver reads actual confirmed personal facts by object and parameter",
    server.includes('from("activity_object_facts")') &&
    server.includes('.eq("fact_role_code", "snapshot")') &&
    server.includes('.eq("fact_status", "confirmed")') &&
    server.includes('.eq("value_object_id", input.resolution.snapshotValueObjectId!)') &&
    server.includes('.eq("parameter_definition_id", input.parameterDefinitionId)') &&
    server.includes('.lte("effective_at", input.effectiveAt)')],
  ["snapshot API already exposes all active state leaves independently of assignments",
    snapshotRoute.includes("async function stateLeafSnapshotCatalog") &&
    snapshotRoute.includes("stateLeaves: catalog.leafOptions") &&
    snapshotRoute.includes('.eq("root_value_object_id", STATES_AND_NEEDS_ROOT_ID)')],
  ["direct system authoring still validates snapshot source semantics",
    authoring.includes("await validateSnapshotBindings(mappings);")],
  ["behavior fixture proves source snapshot has no system assignment",
    behavior.includes("assignment-target") &&
    behavior.includes("tables.value_object_parameter_assignments.some((row)=>row.value_object_id===ids.state),false") &&
    !behavior.includes("value_object_parameter_assignments:[ids.target,ids.state].map")],
  ["source-from-snapshot behavior tests still cover explicit precedence and missing snapshot",
    behavior.includes("explicit value wins over snapshot") &&
    behavior.includes("missing snapshot blocks all writes")],
];

let passed = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
  } else {
    passed += 1;
    console.log(`PASS ${label}`);
  }
}
if (!process.exitCode) console.log(`VALIDATOR=PASS_${passed}_${checks.length}`);
