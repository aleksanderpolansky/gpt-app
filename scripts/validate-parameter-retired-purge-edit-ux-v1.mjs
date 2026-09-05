import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
}
function assert(condition, label) {
  if (!condition) throw new Error(`VALIDATION_FAILED:${label}`);
}

const [routePath, catalogPath, purgePath] = process.argv.slice(2);
const route = read(routePath);
const catalog = read(catalogPath);
const purge = read(purgePath);

for (const marker of [
  "factCapturePreferenceCount",
  "activityEventMeasureCount",
  "activityObjectFactCount",
]) {
  assert(route.includes(marker), `route_usage_${marker}`);
}
for (const table of [
  "fact_capture_precision_preferences",
  "activity_event_measures",
  "activity_object_facts",
]) {
  assert(route.includes(`.from("${table}")`), `route_reference_${table}`);
}
assert(route.includes("export async function DELETE(request: Request)"), "delete_endpoint");
assert(route.includes('current.parameter_code === "process_count"'), "process_count_protected");
assert(route.includes('current.status !== "retired"'), "active_delete_blocked");
assert(route.includes("PARAMETER_IN_USE_CANNOT_DELETE"), "delete_usage_gate");
assert(route.includes("PARAMETER_DELETE_BLOCKED_BY_REFERENCE"), "fk_delete_gate");

assert(catalog.includes("useRef"), "edit_form_ref");
assert(catalog.includes("scrollIntoView"), "edit_scroll_visible");
assert(catalog.includes('method: "DELETE"'), "delete_ui_call");
assert(
  catalog.includes('item.status === "retired" && item.usageCount === 0'),
  "delete_ui_zero_use_only",
);
assert(catalog.includes("DELETE_COPY"), "delete_localization");

for (const table of [
  "value_object_parameter_assignments",
  "activity_template_profile_parameters_v2",
  "fact_capture_precision_preferences",
  "activity_event_measures",
  "activity_object_facts",
]) {
  assert(purge.includes(`"${table}"`), `purge_checks_${table}`);
}
assert(purge.includes('{ count: "exact", head: true }'), "purge_exact_reference_counts");
assert(purge.includes("durationContractCompatible"), "duration_contract_gate");
assert(purge.includes("durationPreservedForReuse: true"), "duration_preserved");
assert(purge.includes('.neq("parameter_code", "duration")'), "duration_excluded_from_delete");
assert(purge.includes('.eq("scope_code", "system")'), "purge_system_only");
assert(purge.includes('.eq("status", "retired")'), "purge_retired_only");
assert(purge.includes('.neq("parameter_code", "process_count")'), "purge_process_count_excluded");
assert(purge.includes('parameter_code", "count"'), "active_count_preflight");
assert(purge.includes("PURGE_BLOCKED_BY_FOREIGN_KEY"), "unknown_fk_fail_closed");
assert(!purge.includes("SUPABASE_SERVICE_ROLE_KEY="), "no_embedded_service_key");

console.log("ARCTOR_PARAMETER_RETIRED_PURGE_EDIT_UX_V1_0_3_VALIDATION: PASS");
