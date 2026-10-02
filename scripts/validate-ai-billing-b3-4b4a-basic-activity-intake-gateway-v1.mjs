import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targetPath = "src/lib/activity/activity-basic-intake-analysis.server.ts";
const policyPath = "config/ai-provider-boundary.json";
const intakeRoutePath = "src/app/api/activity/intake-analysis/route.ts";
const quickRoutePath = "src/app/api/activity/quick-capture/route.ts";

const checks = [];
const check = (name, passed, detail = "") => {
  checks.push({ name, passed: Boolean(passed), detail });
};

const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));
const has = (source, ...needles) => needles.every((needle) => source.includes(needle));
const lacks = (source, ...needles) => needles.every((needle) => !source.includes(needle));

for (const rel of [targetPath, policyPath, intakeRoutePath, quickRoutePath]) {
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
const intakeRoute = read(intakeRoutePath);
const quickRoute = read(quickRoutePath);

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
    "BASIC_INTAKE_BUDGET_PREFLIGHT",
    "BASIC_INTAKE_BUDGET_BLOCKED",
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
    "estimatedInputTokens",
    "estimatedOutputTokens: MAX_OUTPUT_TOKENS",
    "preflightSafetyMultiplier: 1.25",
  ),
);
check(
  "GATEWAY_IDEMPOTENCY",
  has(
    source,
    'requestIdempotencyKey: `basic-activity-intake:${operationId}`',
  ),
);
check(
  "PROVIDER_CONFIG_PRESERVED",
  has(
    source,
    "const MAX_RETRIES = 0",
    "const MAX_OUTPUT_TOKENS = 900",
    "const REQUEST_TIMEOUT_MS = 20_000",
    "store: false",
    'reasoningEffort: "low"',
    "outputTokenCeiling: MAX_OUTPUT_TOKENS",
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
  "MANIFEST_CREATED_BEFORE_USAGE_BIND",
  has(source, "aiUsageEventId: null"),
);
check(
  "NO_OBSOLETE_PRICE_AUTO_SEED",
  lacks(
    source,
    "refreshNanoPriceSnapshotWithinVerifiedLease",
    "ARCTOR_BASIC_INTAKE_NANO_PRICE_REFRESH_V1",
    "NAVIGATOR_MODEL_AUTO_SEED_EXPIRES_AT",
    "NAVIGATOR_MODEL_CATALOG_VERIFIED_AT",
  ),
);
check(
  "FAILURE_OBSERVABILITY_PRESERVED",
  has(
    source,
    'providerCallStarted = true',
    "postProviderBillingFailure",
    "providerAttemptedBillingFailure",
    'gatewayFailureCode.startsWith("AI_BILLING_")',
    'resolvedFailureStage',
  ),
);
check(
  "NO_FACT_WRITE",
  lacks(source, '.from("activity_object_facts")', "insert into activity_object_facts"),
);
check(
  "NO_AUTOMATIC_TEMPLATE_BINDING",
  lacks(source, "apply_activity_template_match_v2", "activity_template_id:"),
);
check(
  "INTAKE_ROUTE_CALLER_PRESERVED",
  has(intakeRoute, "analyzeBasicActivityIntakeV1"),
);
check(
  "QUICK_CAPTURE_CALLER_PRESERVED",
  has(
    quickRoute,
    "analyzeBasicActivityIntakeV1",
    "markBasicActivityIntakeFailureV1",
  ),
);

const legacyWrapperExceptions = Array.isArray(policy.legacyWrapperExceptions)
  ? policy.legacyWrapperExceptions
  : [];
const boundaryEntry = legacyWrapperExceptions.find(
  (item) => item?.path === targetPath,
);
check("BOUNDARY_EXCEPTION_REMOVED", !boundaryEntry);

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

const lines = source.replace(/\r\n/g, "\n").split("\n");
check(
  "TEXT_NO_TRAILING_WHITESPACE",
  !lines.some((line) => /[ \t]+$/.test(line)),
);
check(
  "TEXT_SINGLE_FINAL_NEWLINE",
  source.endsWith("\n") && !source.endsWith("\n\n"),
);

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
  console.error("B3_4B4A_BASIC_ACTIVITY_INTAKE_GATEWAY_VALIDATOR=FAIL");
  process.exit(1);
}

console.log("BILLING_USER=input.appUserId");
console.log("OPERATION_KIND=semantic_intake");
console.log("MODEL_TIER=nano");
console.log("AUDIT_BINDING=analysis_execution+context_manifest");
console.log("LEGACY_ACCOUNTING_REMOVED=TRUE");
console.log("DB_MIGRATION_REQUIRED=FALSE");
console.log("B3_4B4A_BASIC_ACTIVITY_INTAKE_GATEWAY_VALIDATOR=PASS");
