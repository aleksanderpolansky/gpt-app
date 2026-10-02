import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targetPath = "src/lib/ai/activitySemanticReviewA31.server.ts";
const policyPath = "config/ai-provider-boundary.json";
const routePath = "src/app/api/activity/review-analysis/route.ts";

const checks = [];
const check = (name, passed, detail = "") => {
  checks.push({ name, passed: Boolean(passed), detail });
};

const file = (rel) => path.join(root, rel);
const exists = (rel) => fs.existsSync(file(rel));
const read = (rel) => fs.readFileSync(file(rel), "utf8");
const has = (source, ...needles) =>
  needles.every((needle) => source.includes(needle));
const lacks = (source, ...needles) =>
  needles.every((needle) => !source.includes(needle));

for (const rel of [targetPath, policyPath, routePath]) {
  check(`FILE_EXISTS:${rel}`, exists(rel));
}

if (checks.some((item) => !item.passed)) {
  for (const item of checks) {
    console.log(`${item.passed ? "PASS" : "FAIL"} ${item.name}`);
  }
  process.exit(1);
}

const source = read(targetPath);
const policy = JSON.parse(read(policyPath));
const route = read(routePath);

check(
  "GATEWAY_SINGLE_CALL",
  (source.match(/runBillableAiJson<ModelOutput>\s*\(/g) ?? []).length === 1,
);
check(
  "NO_LOW_LEVEL_PROVIDER_WRAPPER",
  lacks(source, "runAiJsonWithUsageMetadata", "RunAiJsonUsageMetadata"),
);
check(
  "NO_LEGACY_PILOT_PREFLIGHT",
  lacks(
    source,
    "preflight_ai_pilot_call_budget_v1",
    "reserveBudget(",
    "AI_A3_1_SEMANTIC_REVIEW_BUDGET_PREFLIGHT",
    "AI_A3_1_SEMANTIC_REVIEW_BUDGET_BLOCKED",
  ),
);
check(
  "NO_LOCAL_USAGE_ACCOUNTING",
  lacks(
    source,
    '.from("ai_usage_events")',
    "createUsageEvent(",
    "finalizeUsage(",
    "markUsageFailed(",
    "actual_provider_cost_usd",
    "walletDebited: false",
  ),
);
check(
  "EXPLICIT_BILLING_USER",
  has(
    source,
    "billingUserId: input.appUserId",
    'billingPolicy: "explicit_user_id"',
  ),
);
check(
  "GATEWAY_OPERATION",
  has(
    source,
    'operationKind: "semantic_intake"',
    "routePath: ROUTE_PATH",
    "tierCode: model.tierCode",
    "modelName: model.modelName",
  ),
);
check(
  "GATEWAY_ESTIMATE",
  has(
    source,
    "estimatedInputTokens: budgetInputTokenUpperBound",
    "estimatedOutputTokens: MAX_OUTPUT_TOKENS",
    "preflightSafetyMultiplier: 1.25",
  ),
);
check(
  "GATEWAY_IDEMPOTENCY",
  has(
    source,
    'requestIdempotencyKey: `activity-semantic-review:${operationId}`',
  ),
);
check(
  "STANDARD_MODEL_POLICY_PRESERVED",
  has(
    source,
    'getNavigatorModelDefinition("standard")',
    'tierCode: "standard"',
    'modelTierPolicy: "standard_required_no_nano_fallback"',
  ),
);
check(
  "PROVIDER_CONFIG_PRESERVED",
  has(
    source,
    "const MAX_RETRIES = 0",
    "const MAX_OUTPUT_TOKENS = 2800",
    "const REQUEST_TIMEOUT_MS = 30_000",
    "store: false",
    'reasoningEffort: "low"',
    "outputTokenCeiling: MAX_OUTPUT_TOKENS",
    "userImageDataUrl",
  ),
);
check(
  "PRICE_SNAPSHOT_GUARD_PRESERVED",
  has(
    source,
    "ensureNavigatorPriceSnapshotV1",
    "maxAgeHours: 72",
  ),
);
check(
  "OBSOLETE_PRICE_LEASE_REMOVED",
  lacks(
    source,
    "refreshStandardPriceSnapshotWithinVerifiedLease",
    "STANDARD_PRICE_REFRESH_VERIFIED_AT",
    "STANDARD_PRICE_REFRESH_EXPIRES_AT",
    "STANDARD_PRICE_SOURCE_URL",
    "ARCTOR_A3_1_STANDARD_PRICE_REFRESH_V1",
  ),
);
check(
  "AUDIT_EXECUTION_PRESERVED",
  has(
    source,
    "createAiAnalysisExecution",
    "completeAiAnalysisExecution",
    "failAiAnalysisExecution",
    "analysisExecutionId",
  ),
);
check(
  "CONTEXT_MANIFEST_PRESERVED",
  has(
    source,
    "createAiContextManifest",
    "markAiContextManifestProviderCompleted",
    "markAiContextManifestValidated",
    "markAiContextManifestFailed",
    "contextManifestId: manifestId",
  ),
);
check(
  "MANIFEST_CREATED_BEFORE_GATEWAY_BIND",
  has(source, "aiUsageEventId: null"),
);
check(
  "REVIEW_FIRST_SEMANTICS_PRESERVED",
  has(
    source,
    "readExistingDraft",
    "activity_semantic_review_drafts_a31",
    "serverLeafResolutionRequired: true",
    "factsWritten: false",
    "residualMode",
  ),
);
check(
  "NO_DIRECT_FACT_WRITE",
  lacks(
    source,
    '.from("activity_object_facts")',
    "insert into activity_object_facts",
  ),
);
check(
  "ACTIVE_ROUTE_CALLER_PRESERVED",
  has(
    route,
    'from "@/lib/ai/activitySemanticReviewA31.server"',
    "analyzeActivityForSemanticReviewA31",
    "activityEventId",
  ),
);
check(
  "ROUTE_BALANCE_BLOCK_STATUS_PRESERVED",
  has(
    route,
    'message.includes("BUDGET_BLOCKED")',
    'message.includes("AI_CREDIT_WALLET_INSUFFICIENT")',
    'message.includes("AI_BILLING_INSUFFICIENT_BALANCE")',
    "? 429",
  ),
);

const legacy = Array.isArray(policy.legacyWrapperExceptions)
  ? policy.legacyWrapperExceptions
  : [];

check(
  "A31_BOUNDARY_EXCEPTION_REMOVED",
  !legacy.some((item) => item?.path === targetPath),
);
check(
  "DORMANT_TEMPLATE_MATCHER_EXCEPTION_RETAINED",
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
  "GLOBAL_OBSERVATION_EXCEPTION_RETAINED",
  legacy.some(
    (item) => item?.path === "lib/reality/globalObservationPilot.ts",
  ),
);

const directExceptions = Array.isArray(policy.legacyDirectProviderExceptions)
  ? policy.legacyDirectProviderExceptions
  : [];
check(
  "NO_DIRECT_PROVIDER_EXCEPTION_ADDED",
  !directExceptions.some((item) => item?.path === targetPath),
);

const gatewayAllowed = Array.isArray(policy.gatewayWrapperAllowedFiles)
  ? policy.gatewayWrapperAllowedFiles
  : [];
check(
  "NO_LOW_LEVEL_WRAPPER_ALLOWLIST_ADDED",
  !gatewayAllowed.includes(targetPath),
);

for (const [name, content] of [
  ["TARGET", source],
  ["ROUTE", route],
]) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  check(
    `${name}_NO_TRAILING_WHITESPACE`,
    !lines.some((line) => /[ \t]+$/.test(line)),
  );
  check(
    `${name}_SINGLE_FINAL_NEWLINE`,
    content.endsWith("\n") && !content.endsWith("\n\n"),
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
  `SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`,
);

if (failed.length > 0) {
  console.error("B3_4B4C_ACTIVITY_SEMANTIC_REVIEW_GATEWAY_VALIDATOR=FAIL");
  process.exit(1);
}

console.log("BILLING_USER=input.appUserId");
console.log("OPERATION_KIND=semantic_intake");
console.log("MODEL_TIER=standard");
console.log("ROUTE=/api/activity/review-analysis");
console.log("AUDIT_BINDING=analysis_execution+context_manifest");
console.log("LEGACY_ACCOUNTING_REMOVED=TRUE");
console.log("TYPICAL_ACTIVITY_MATCHER=DORMANT_DEFERRED");
console.log("DB_MIGRATION_REQUIRED=FALSE");
console.log("B3_4B4C_ACTIVITY_SEMANTIC_REVIEW_GATEWAY_VALIDATOR=PASS");
