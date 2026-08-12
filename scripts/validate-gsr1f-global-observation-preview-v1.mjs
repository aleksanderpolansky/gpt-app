import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "lib/ai/openaiClient.ts",
  "lib/reality/globalObservationPilot.ts",
  "src/app/api/ai/reality/global-observation-preview/route.ts",
  "docs/reality-core/GSR1_OPENAI_PILOT_SAFETY_CONTRACT_V1.md",
  "supabase/manual-applied/20260811_gsr1c_global_aliases_recognition_v3.sql",
  "supabase/manual-applied/20260811_gsr1d_global_runtime_bridge_ai_budget_v1.sql",
  "supabase/manual-applied/20260811_gsr1e_openai_pilot_price_refresh_budget_hardening_v1.sql",
];

const checks = [];

function check(name, passed, detail = null) {
  checks.push({ name, passed: Boolean(passed), detail });
}

for (const file of requiredFiles) {
  check(`file:${file}`, fs.existsSync(path.resolve(file)), null);
}

const client = fs.readFileSync("lib/ai/openaiClient.ts", "utf8");
const pilot = fs.readFileSync(
  "lib/reality/globalObservationPilot.ts",
  "utf8",
);
const route = fs.readFileSync(
  "src/app/api/ai/reality/global-observation-preview/route.ts",
  "utf8",
);

check(
  "client_per_request_retry_control",
  client.includes("maxRetries?: number") &&
    client.includes("{ maxRetries }"),
);
check(
  "client_per_request_timeout_control",
  client.includes("requestTimeoutMs?: number") &&
    client.includes("{ timeout: requestTimeoutMs }"),
);
check(
  "client_abort_signal_control",
  client.includes("signal?: AbortSignal") &&
    client.includes("{ signal }"),
);
check(
  "client_store_control",
  client.includes("store?: boolean"),
);

check(
  "pilot_env_gate",
  pilot.includes('GSR1_OPENAI_PILOT_ENABLED !== "true"'),
);
check(
  "pilot_nano_only",
  pilot.includes('const PILOT_MODEL_TIER = "nano"'),
);
check(
  "pilot_two_provider_calls",
  pilot.includes("const MAX_PROVIDER_CALLS = 2"),
);
check(
  "pilot_no_automatic_retry",
  pilot.includes("maxRetries: 0"),
);
check(
  "pilot_store_false",
  pilot.includes("store: false"),
);
check(
  "pilot_route_deadline",
  pilot.includes("const OPERATION_DEADLINE_MS = 55_000"),
);
check(
  "pilot_provider_timeout",
  pilot.includes("const PROVIDER_CALL_TIMEOUT_MS = 25_000"),
);
check(
  "pilot_budget_preflight",
  pilot.includes('"preflight_ai_pilot_call_budget_v1"'),
);
check(
  "pilot_exact_recognition",
  pilot.includes('"recognize_global_value_object_text_v1"'),
);
check(
  "pilot_bounded_candidates",
  pilot.includes('"get_global_value_object_leaf_candidates_v1"'),
);
check(
  "pilot_candidate_bound_10",
  pilot.includes("candidateCount > 10") &&
    pilot.includes("boundedCandidates.length > 10"),
);
check(
  "preview_does_not_call_fact_writer",
  !pilot.includes("attach_global_observation_facts_gsr1_v1"),
);
check(
  "preview_usage_audit",
  pilot.includes('.from("ai_usage_events")') &&
    pilot.includes("actual_provider_cost_usd"),
);
check(
  "route_uses_active_actor_context",
  route.includes("resolveActiveActorContext"),
);

const failed = checks.filter((item) => !item.passed);

console.log(
  JSON.stringify(
    {
      check: "ARCTOR_GSR1F_GLOBAL_OBSERVATION_PREVIEW_RUNTIME_V1",
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
