import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const targetPath = "lib/reality/globalObservationPilot.ts";
const routePath =
  "src/app/api/ai/reality/global-observation-preview/route.ts";
const policyPath = "config/ai-provider-boundary.json";
const legacyValidatorPath =
  "scripts/validate-gsr1f-global-observation-preview-v1.mjs";

const checks = [];
const check = (name, passed, detail = "") => {
  checks.push({ name, passed: Boolean(passed), detail });
};

for (const rel of [
  targetPath,
  routePath,
  policyPath,
  legacyValidatorPath,
]) {
  check(`FILE_EXISTS:${rel}`, fs.existsSync(path.join(root, rel)));
}

if (checks.some((item) => !item.passed)) {
  for (const item of checks) {
    console.log(`${item.passed ? "PASS" : "FAIL"} ${item.name}`);
  }
  process.exit(1);
}

const pilot = fs.readFileSync(path.join(root, targetPath), "utf8");
const route = fs.readFileSync(path.join(root, routePath), "utf8");
const policy = JSON.parse(
  fs.readFileSync(path.join(root, policyPath), "utf8"),
);
const legacyValidator = fs.readFileSync(
  path.join(root, legacyValidatorPath),
  "utf8",
);

const count = (source, re) => (source.match(re) ?? []).length;
const has = (source, ...needles) =>
  needles.every((needle) => source.includes(needle));
const lacks = (source, ...needles) =>
  needles.every((needle) => !source.includes(needle));

check(
  "ACTIVE_ROUTE_CALLER_PRESERVED",
  has(
    route,
    "runGlobalObservationPreview",
    "resolveActiveActorContext",
    "appUserId: actorContext.appUserId",
  ),
);

check(
  "UNIFIED_GATEWAY_IMPORTED",
  has(
    pilot,
    "runBillableAiJson",
    "BillableAiJsonResult",
    "readActiveModelPriceSnapshot",
    "AiPriceSnapshot",
  ),
);

check(
  "SINGLE_GATEWAY_HELPER_CALL",
  count(pilot, /runBillableAiJson<T>\s*\(/g) === 1,
);

check(
  "LEGACY_PROVIDER_WRAPPER_REMOVED",
  lacks(
    pilot,
    "runAiJsonWithUsageMetadata",
    "RunAiJsonUsageMetadata",
  ),
);

check(
  "LEGACY_PILOT_PREFLIGHT_REMOVED",
  lacks(
    pilot,
    "preflight_ai_pilot_call_budget_v1",
    "reserveBudget(",
  ),
);

check(
  "LEGACY_USAGE_ACCOUNTING_REMOVED",
  lacks(
    pilot,
    '.from("ai_usage_events")',
    "createUsageEvent(",
    "finalizeUsageEvent(",
    "markUsageFailed(",
    "walletDebited: false",
  ),
);

check(
  "EXPLICIT_PAYER",
  has(
    pilot,
    "billingUserId: input.appUserId",
    'billingPolicy: "explicit_user_id"',
  ),
);

check(
  "STAGE_SPECIFIC_IDEMPOTENCY",
  has(
    pilot,
    "`global-observation:${input.operationId}:${input.stageSequence}:${input.stage}`",
  ),
);

check(
  "GATEWAY_OPERATION_AND_ROUTE",
  has(
    pilot,
    'operationKind: "semantic_intake"',
    "routePath: ROUTE_PATH",
    "tierCode: PILOT_MODEL_TIER",
    "modelName: input.model",
  ),
);

check(
  "NANO_POLICY_PRESERVED",
  has(
    pilot,
    'const PILOT_MODEL_TIER = "nano"',
    "getNanoPilotModel",
  ),
);

check(
  "TWO_STAGE_RUNTIME_PRESERVED",
  count(pilot, /runBudgetedJsonCall<RoutingOutput>\s*\(/g) === 1 &&
    count(pilot, /runBudgetedJsonCall<SelectionOutput>\s*\(/g) === 1 &&
    has(
      pilot,
      'stage: "domain_facet_routing"',
      "stageSequence: 1",
      'schemaName: "arctor_gsr1_routing_v2"',
      'stage: "leaf_parameter_selection"',
      "stageSequence: 2",
      'schemaName: "arctor_gsr1_leaf_parameter_selection_v2"',
    ),
);

check(
  "SHARED_OPERATION_BUDGET_STATE",
  has(
    pilot,
    "const budgetState: PilotBudgetState",
    "providerCallsUsed: 0",
    "operationReservedMaxCostUsd: 0",
    "budgetState,",
  ) &&
    count(pilot, /\r?\n\s+budgetState,\r?\n\s+\}\);/g) >= 2,
);

check(
  "USD_HARD_CAP_PRESERVED",
  has(
    pilot,
    "const HARD_CAP_USD = 0.1",
    "calculateProviderCostUsd",
    "preparePilotGatewayBudget",
    "AI_BUDGET_BLOCKED_HARD_COST_CAP_EXCEEDED",
    "pilotHardCapUsd: HARD_CAP_USD",
    "pilotOperationReservedMaxCostUsd",
  ),
);

check(
  "USD_CAP_FAILS_CLOSED_ON_NON_USD_PRICE",
  has(
    pilot,
    'pricingCurrency.toUpperCase() !== "USD"',
    "AI_PILOT_HARD_CAP_PRICE_CURRENCY_INVALID",
  ),
);

check(
  "PROVIDER_CALL_LIMIT_PRESERVED",
  has(
    pilot,
    "const MAX_PROVIDER_CALLS = 2",
    "AI_BUDGET_BLOCKED_MAX_PROVIDER_CALLS",
    "input.budgetState.providerCallsUsed >= MAX_PROVIDER_CALLS",
  ),
);

check(
  "ROUTING_OUTPUT_LIMIT_PRESERVED",
  has(
    pilot,
    "const ROUTING_MAX_OUTPUT_TOKENS = 500",
    "maxOutputTokens: ROUTING_MAX_OUTPUT_TOKENS",
  ),
);

check(
  "SELECTION_OUTPUT_LIMIT_PRESERVED",
  has(
    pilot,
    "const SELECTION_MAX_OUTPUT_TOKENS = 900",
    "maxOutputTokens: SELECTION_MAX_OUTPUT_TOKENS",
  ),
);

check(
  "INPUT_OUTPUT_CEILINGS_PRESERVED",
  has(
    pilot,
    "const PILOT_INPUT_TOKEN_CEILING = 20_000",
    "const PILOT_OUTPUT_TOKEN_CEILING = 4_000",
    "estimatedInputTokens > PILOT_INPUT_TOKEN_CEILING",
    "outputTokenCeiling: PILOT_OUTPUT_TOKEN_CEILING",
  ),
);

check(
  "TIMEOUTS_PRESERVED",
  has(
    pilot,
    "const OPERATION_DEADLINE_MS = 55_000",
    "const PROVIDER_CALL_TIMEOUT_MS = 25_000",
    "requestTimeoutMs: PROVIDER_CALL_TIMEOUT_MS",
    "signal: input.signal",
  ),
);

check(
  "NO_RETRIES_AND_STORE_FALSE",
  has(
    pilot,
    "maxRetries: 0",
    "store: false",
    'reasoningEffort: "none"',
  ),
);

check(
  "CONTEXT_MANIFEST_CREATED_BEFORE_GATEWAY",
  has(
    pilot,
    "const contextManifestId = await createAiContextManifest",
    "aiUsageEventId: null",
    "contextManifestId,",
    "markAiContextManifestProviderCompleted",
    "markAiContextManifestValidated",
    "markAiContextManifestFailed",
  ),
);

check(
  "SHARED_ANALYSIS_EXECUTION_PRESERVED",
  has(
    pilot,
    "createAiAnalysisExecution",
    "completeAiAnalysisExecution",
    "failAiAnalysisExecution",
    'surfaceCode: "global_observation_preview"',
    'operationKind: "activity_semantic_intake"',
  ),
);

check(
  "PREVIEW_ONLY_NO_FACT_WRITE_PRESERVED",
  has(
    pilot,
    "previewOnly: true",
    "dbFactWriteExecuted: false",
  ) &&
    !pilot.includes("attach_global_observation_facts_gsr1_v1"),
);

check(
  "ACTUAL_PROVIDER_USD_SAFETY_METRIC_PRESERVED",
  has(
    pilot,
    "actualProviderCostUsd",
    "calculateProviderCostUsd",
    "reservedMaximumProviderCostUsd",
  ),
);

check(
  "GATEWAY_BILLING_ERROR_REMAP",
  has(
    pilot,
    "remapGatewayBillingError",
    "AI_BILLING_INSUFFICIENT_BALANCE",
    "AI_BILLING_REQUEST_ALREADY_ACQUIRED",
  ),
);

const legacy = Array.isArray(policy.legacyWrapperExceptions)
  ? policy.legacyWrapperExceptions
  : [];

check(
  "GLOBAL_OBSERVATION_BOUNDARY_EXCEPTION_REMOVED",
  !legacy.some((item) => item?.path === targetPath),
);

check(
  "DORMANT_TYPICAL_MATCHER_EXCEPTION_RETAINED",
  legacy.some(
    (item) =>
      item?.path ===
      "src/lib/activity/typical-activity-template-matcher.server.ts",
  ),
);

check(
  "DORMANT_GOAL_INTAKE_EXCEPTION_RETAINED",
  legacy.some(
    (item) =>
      item?.path ===
      "src/lib/goal-world/intake/goalIntakeRuntime.server.ts",
  ),
);

check(
  "LEGACY_VALIDATOR_UPDATED_FOR_GATEWAY",
  has(
    legacyValidator,
    "pilot_gateway_billing_with_local_hard_cap",
    "preview_gateway_usage_audit",
  ) &&
    !legacyValidator.includes(
      '"pilot_budget_preflight"',
    ) &&
    !legacyValidator.includes(
      '"preview_usage_audit"',
    ),
);

for (const [name, content] of [
  ["PILOT", pilot],
  ["ROUTE", route],
  ["LEGACY_VALIDATOR", legacyValidator],
]) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  check(
    `${name}_NO_TRAILING_WHITESPACE`,
    !lines.some((line) => /[ \t]+$/.test(line)),
  );
}

const failed = checks.filter((item) => !item.passed);

for (const item of checks) {
  console.log(
    `${item.passed ? "PASS" : "FAIL"} ${item.name}${
      item.detail ? ` ${item.detail}` : ""
    }`,
  );
}

console.log(
  `SUMMARY total=${checks.length} passed=${
    checks.length - failed.length
  } failed=${failed.length}`,
);

if (failed.length > 0) {
  console.error(
    "B3_4B4D_GLOBAL_OBSERVATION_GATEWAY_VALIDATOR=FAIL",
  );
  process.exit(1);
}

console.log("ACTIVE_ROUTE=/api/ai/reality/global-observation-preview");
console.log("BILLING_USER=actorContext.appUserId->input.appUserId");
console.log("MODEL_TIER=nano");
console.log("MAX_PROVIDER_CALLS=2");
console.log("HARD_CAP_USD=0.1");
console.log("LEGACY_ACCOUNTING_REMOVED=TRUE");
console.log("BOUNDARY_EXCEPTION_REMOVED=TRUE");
console.log("DORMANT_EXCEPTIONS_RETAINED=2");
console.log("DB_MIGRATION_REQUIRED=FALSE");
console.log(
  "B3_4B4D_GLOBAL_OBSERVATION_GATEWAY_VALIDATOR=PASS",
);
