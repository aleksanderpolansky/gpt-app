#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const pilotPath = path.join(repo, "lib", "reality", "globalObservationPilot.ts");
const policyPath = path.join(repo, "lib", "reality", "factContractPolicy.ts");

for (const file of [pilotPath, policyPath]) {
  if (!fs.existsSync(file)) {
    console.error(`MISSING_FILE=${file}`);
    process.exit(1);
  }
}

const pilot = fs.readFileSync(pilotPath, "utf8").replace(/\r\n/g, "\n");
const policy = fs.readFileSync(policyPath, "utf8").replace(/\r\n/g, "\n");

const checks = [
  ["01_policy_export", policy.includes("export function normalizeAiFactAgainstParameterContract")],
  ["02_policy_server_contract_type", policy.includes("valueTypeCode: string") && policy.includes("allowedUnitCodes: string[]")],
  ["03_policy_numeric_server_authority", policy.includes('expectedValueType === "numeric"') && policy.includes('valueType: "numeric"')],
  ["04_policy_text_server_authority", policy.includes('expectedValueType === "text"') && policy.includes('valueType: "text"')],
  ["05_policy_boolean_server_authority", policy.includes('valueType: "boolean"')],
  ["06_policy_rejects_missing_expected_value", policy.includes('reason: "EXPECTED_VALUE_MISSING"')],
  ["07_policy_preserves_evidence_guard", policy.includes("containsFragment(input.sourceFragment, rawFragment)")],
  ["08_policy_preserves_unit_guard", policy.includes("contract.allowedUnitCodes.includes(unit)")],
  ["09_pilot_imports_policy", pilot.includes('from "./factContractPolicy"')],
  ["10_pilot_drops_invalid_optional_fact", pilot.includes("FACT_DROPPED:")],
  ["11_pilot_normalizes_extra_value_fields", pilot.includes("FACT_VALUE_NORMALIZED_TO_SERVER_CONTRACT:")],
  ["12_none_selection_drops_fact_without_fallback", pilot.includes("FACTS_DROPPED_WITHOUT_SELECTED_LEAF:")],
  ["13_old_fact_value_abort_removed", !pilot.includes("AI_FACT_VALUE_CONTRACT_INVALID")],
  ["14_old_fact_parameter_abort_removed", !pilot.includes("AI_FACT_PARAMETER_OR_EVIDENCE_INVALID")],
  ["15_selection_key_guard_preserved", pilot.includes("AI_SELECTION_KEY_CONTRACT_FAILED")],
  ["16_unresolved_selection_guard_preserved", pilot.includes("AI_SELECTION_UNRESOLVED_GROUP_BYPASS_BLOCKED")],
  ["17_fact_status_still_proposed", pilot.includes('factStatus: "proposed"')],
  ["18_fact_warnings_returned", pilot.includes("...factValidationWarnings")],
  ["19_provider_call_cap_preserved", pilot.includes("const MAX_PROVIDER_CALLS = 2")],
  ["20_preview_write_boundary_preserved", pilot.includes("dbFactWriteExecuted: false") || pilot.includes("dbFactWriteExecuted:false")],
  ["21_typescript_filter_predicate_safe", pilot.includes(".filter((fact): fact is NonNullable<typeof fact> => fact !== null)")],
  ["22_old_invalid_type_predicate_absent", !pilot.includes(".filter((fact): fact is ProposedFact => fact !== null)")],
];

let failed = 0;
for (const [name, passed] of checks) {
  console.log(`${name}=${passed ? "PASS" : "FAIL"}`);
  if (!passed) failed += 1;
}
console.log(`SUMMARY=${checks.length - failed}/${checks.length}`);
if (failed) process.exit(1);
