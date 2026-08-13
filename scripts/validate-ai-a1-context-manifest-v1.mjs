import fs from "node:fs";

const checks = [];

function check(name, passed, detail = null) {
  checks.push({ name, passed: Boolean(passed), detail });
}

const requiredFiles = [
  "lib/ai/contextManifest.ts",
  "lib/reality/globalObservationPilot.ts",
  "supabase/manual-applied/20260812_ai_a1_context_manifest_foundation_v1.sql",
  "supabase/diagnostics/20260812_ai_a1_context_manifest_runtime_postcheck_READONLY.sql",
  "docs/reality-core/ARCTOR_AI_ARCHITECTURE_LOCK_V1_RU.md",
  "docs/recovery/specs/ARCTOR_AI_A0_REUSE_ALTER_CREATE_V1_RU.md",
];

for (const file of requiredFiles) {
  check(`file:${file}`, fs.existsSync(file), null);
}

const helper = fs.readFileSync("lib/ai/contextManifest.ts", "utf8");
const pilot = fs.readFileSync("lib/reality/globalObservationPilot.ts", "utf8");
const sql = fs.readFileSync(
  "supabase/manual-applied/20260812_ai_a1_context_manifest_foundation_v1.sql",
  "utf8",
);
const architecture = fs.readFileSync(
  "docs/reality-core/ARCTOR_AI_ARCHITECTURE_LOCK_V1_RU.md",
  "utf8",
);

check(
  "execution_table_contract_recorded",
  sql.includes("create table if not exists public.ai_analysis_executions") &&
    sql.includes("input_hash text not null") &&
    !sql.includes("raw_message_text text") &&
    !sql.includes("system_prompt_text text"),
);

check(
  "manifest_table_contract_recorded",
  sql.includes("create table if not exists public.ai_context_manifests") &&
    sql.includes("system_prompt_hash text not null") &&
    sql.includes("request_hash text not null") &&
    sql.includes("retrieval_snapshot_json jsonb not null"),
);

check(
  "usage_event_link_recorded",
  sql.includes("add column if not exists analysis_execution_id uuid") &&
    sql.includes("ai_usage_events_analysis_execution_id_v1_fkey"),
);

check(
  "manifest_helper_hashes_raw_input",
  helper.includes("input_hash: sha256Text(input.inputText)") &&
    !helper.includes("raw_message_text:") &&
    !helper.includes("system_prompt_text:"),
);

check(
  "manifest_helper_hashes_request_and_response",
  helper.includes("requestHash = hashCanonicalJson") &&
    helper.includes("response_hash: sha256Text(responseText)"),
);

check(
  "pilot_creates_one_analysis_execution",
  pilot.includes("createAiAnalysisExecution({") &&
    pilot.includes('surfaceCode: "global_observation_preview"') &&
    pilot.includes('operationKind: "activity_semantic_intake"'),
);

check(
  "pilot_links_usage_to_execution",
  pilot.includes("analysis_execution_id: input.analysisExecutionId"),
);

check(
  "pilot_records_stage1_manifest",
  pilot.includes('stage: "domain_facet_routing"') &&
    pilot.includes("stageSequence: 1") &&
    pilot.includes('code: "GSR1_ROUTING_STAGE1"'),
);

check(
  "pilot_records_stage2_manifest",
  pilot.includes('stage: "leaf_parameter_selection"') &&
    pilot.includes("stageSequence: 2") &&
    pilot.includes('code: "GSR1_ROUTING_STAGE2"'),
);

check(
  "candidate_snapshot_contains_ids_and_allowed_parameters",
  pilot.includes("valueObjectId: candidate.valueObjectId") &&
    pilot.includes("canonicalKey: candidate.canonicalKey") &&
    pilot.includes("allowedParameterCodes: candidate.parameters.map"),
);

check(
  "manifest_snapshot_does_not_copy_source_fragment",
  !pilot.includes("retrievalSnapshot: {\n        sourceFragment"),
);

check(
  "provider_state_store_false_preserved",
  pilot.includes("store: false") &&
    pilot.includes("storeProviderState: false"),
);

check(
  "automatic_retries_zero_preserved",
  pilot.includes("maxRetries: 0") &&
    pilot.includes("automaticProviderRetries: 0"),
);

check(
  "provider_failure_field_is_sanitized",
  pilot.includes(
    'error_message: "OpenAI provider call failed; raw provider output is not stored in this field."',
  ),
);

check(
  "manifest_validation_is_recorded",
  pilot.includes("markAiContextManifestValidated(routingCall.contextManifestId") &&
    pilot.includes("markAiContextManifestValidated(selectionCall.contextManifestId"),
);

check(
  "analysis_execution_success_and_failure_are_recorded",
  pilot.includes("completeAiAnalysisExecution(analysisExecutionId)") &&
    pilot.includes("failAiAnalysisExecution(analysisExecutionId, error)"),
);

check(
  "existing_preview_fact_write_boundary_preserved",
  pilot.includes("dbFactWriteExecuted: false") &&
    !pilot.includes("attach_global_observation_facts_gsr1_v1"),
);

check(
  "architecture_lock_arctor_owns_memory",
  architecture.includes("ARCTor owns the memory") &&
    architecture.includes("OpenAI") &&
    architecture.includes("Data Capital"),
);

const failed = checks.filter((item) => !item.passed);

console.log(
  JSON.stringify(
    {
      check: "ARCTOR_AI_A1_CONTEXT_MANIFEST_FOUNDATION_V1",
      passed: failed.length === 0,
      total: checks.length,
      failed,
      checks,
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exit(1);
}
