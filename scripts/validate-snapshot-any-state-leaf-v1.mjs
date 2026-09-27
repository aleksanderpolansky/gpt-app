import fs from "node:fs";

const page = fs.readFileSync(
  "src/app/activity-facts/snapshot/page.tsx",
  "utf8",
);
const route = fs.readFileSync(
  "src/app/api/activity/facts/snapshots/route.ts",
  "utf8",
);
const factsPage = fs.readFileSync(
  "src/app/activity-facts/page.tsx",
  "utf8",
);
const migration = fs.readFileSync(
  "supabase/migrations/20260926215000_snapshot_personal_state_leaf_parameter_v1.sql",
  "utf8",
);

const checks = [
  [
    "snapshot link remains available from facts page",
    factsPage.includes('href={`/activity-facts/snapshot?locale=${locale}`}'),
  ],
  [
    "all users receive state-leaf catalog",
    route.includes("stateLeafSnapshotCatalog") &&
      route.includes("stateLeaves: catalog.leafOptions"),
  ],
  [
    "catalog remains States and Needs only",
    route.includes('.eq("root_value_object_id", STATES_AND_NEEDS_ROOT_ID)'),
  ],
  [
    "catalog contains only active global system leaves",
    route.includes('.eq("scope_code", "global")') &&
      route.includes('.eq("origin_type_code", "system_model")') &&
      route.includes('.eq("ontology_node_role_code", "leaf")'),
  ],
  [
    "user can select existing system parameter without assignment",
    page.includes("directParameterDefinitionId") &&
      page.includes("effectiveSelection"),
  ],
  [
    "direct snapshot sends leaf and parameter ids",
    page.includes("valueObjectId: effectiveSelection.valueObjectId") &&
      page.includes("effectiveSelection.parameterDefinitionId"),
  ],
  [
    "assignment id is optional for direct personal snapshot",
    route.includes("(assignmentId && !UUID_RE.test(assignmentId))") &&
      route.includes("assignment?.id ?? null"),
  ],
  [
    "server resolves an existing assignment when pair already exists",
    route.includes("SNAPSHOT_CAPTURE_ASSIGNMENT_RESOLUTION_FAILED"),
  ],
  [
    "direct snapshot metadata is explicit",
    route.includes("direct_state_leaf_parameter_v1") &&
      route.includes("direct_user_selected_state_leaf_parameter_v1"),
  ],
  [
    "admin assignment materializer remains backend-only",
    route.includes("requirePlatformAdmin") &&
      route.includes("materializeSystemParameterAssignmentsV1") &&
      !page.includes("materializeDirectAssignment") &&
      !page.includes('action: "materialize_system_assignment"'),
  ],
  [
    "normal user does not materialize global assignment while saving snapshot",
    !page.includes('action: "materialize_system_assignment",\n          value:'),
  ],
  [
    "parameter titles use shared localization",
    route.includes("getActivityParameterPresentation"),
  ],
  [
    "seven locale UI copy exists",
    ["en", "pl", "ru", "uk", "de", "es", "cs"].every((locale) =>
      page.includes(`${locale}: {`),
    ),
  ],
  [
    "migration keeps old global system-assignment guard as default",
    migration.includes("GSR1D_GLOBAL_FACT_REQUIRES_SYSTEM_PARAMETER_CONTRACT") &&
      migration.includes("GSR1D_GLOBAL_FACT_SYSTEM_PARAMETER_ASSIGNMENT_MISMATCH"),
  ],
  [
    "migration exception is snapshot-only",
    migration.includes("new.fact_role_code='snapshot'") &&
      migration.includes("new.activity_event_id is null") &&
      migration.includes("new.measure_id is null"),
  ],
  [
    "migration exception is States and Needs only",
    migration.includes("ARCTOR_DIRECT_SNAPSHOT_REQUIRES_STATES_AND_NEEDS_LEAF") &&
      migration.includes("6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a"),
  ],
  [
    "migration requires active system numeric parameter",
    migration.includes("ARCTOR_DIRECT_SNAPSHOT_REQUIRES_ACTIVE_SYSTEM_NUMERIC_PARAMETER"),
  ],
  [
    "migration validates direct snapshot unit",
    migration.includes("ARCTOR_DIRECT_SNAPSHOT_UNIT_NOT_ALLOWED"),
  ],
  [
    "personal snapshot save does not invoke admin materialization action",
    !page.includes(
      'body: JSON.stringify({\n          action: "materialize_system_assignment",\n          assignmentId:',
    ) &&
      route.includes(
        'if (action === "materialize_system_assignment")',
      ),
  ],
  [
    "direct snapshot keeps calculation rule empty on fact insert",
    route.includes("calculation_rule_code: null") &&
      route.includes("calculation_rule_version: null"),
  ],
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

if (!process.exitCode) {
  console.log(`VALIDATOR=PASS_${passed}_${checks.length}`);
}
