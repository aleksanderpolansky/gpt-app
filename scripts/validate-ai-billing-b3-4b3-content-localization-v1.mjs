import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`B3_4B3_VALIDATOR_FILE_MISSING:${rel}`);
  }
  return fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n");
}

const target = read(
  "src/lib/localization/contentLocalization.server.ts",
);
const gateway = read("src/lib/ai-billing/gateway.server.ts");
const boundary = JSON.parse(
  read("config/ai-provider-boundary.json"),
);

const remaining = boundary.legacyWrapperExceptions ?? [];

const checks = [
  [
    "LEGACY_PROVIDER_WRAPPER_REMOVED",
    !/\brunAiJsonWithUsageMetadata\s*</.test(target) &&
      !/\brunAiJsonWithUsageMetadata\s*\(/.test(target),
  ],
  [
    "UNIFIED_GATEWAY_PRESENT",
    target.includes("runBillableAiJson<TranslationOutput>"),
  ],
  [
    "EXPLICIT_INPUT_USER_PAYS",
    target.includes("billingUserId: input.userId"),
  ],
  [
    "CONTENT_LOCALIZATION_OPERATION_KIND",
    target.includes('operationKind: "content_localization"'),
  ],
  [
    "NANO_TIER_PRESERVED",
    target.includes('const MODEL_TIER = "nano" as const;') &&
      target.includes("tierCode: MODEL_TIER"),
  ],
  [
    "PRICE_SNAPSHOT_REFRESH_PRESERVED",
    target.includes("ensureNavigatorPriceSnapshotV1({") &&
      target.includes("maxAgeHours: 72"),
  ],
  [
    "CONSERVATIVE_INPUT_ESTIMATE_PRESERVED",
    target.includes("Buffer.byteLength(serialized, \"utf8\") + 1_024") &&
      target.includes("MAX_ESTIMATED_INPUT_TOKENS = 20_000"),
  ],
  [
    "PROVIDER_CONFIG_PRESERVED",
    target.includes('reasoningEffort: "none"') &&
      target.includes("maxRetries: 0") &&
      target.includes("requestTimeoutMs: REQUEST_TIMEOUT_MS") &&
      target.includes("maxOutputTokens: MAX_OUTPUT_TOKENS") &&
      target.includes("outputTokenCeiling: MAX_OUTPUT_TOKENS") &&
      target.includes("store: false"),
  ],
  [
    "STRICT_SCHEMA_PRESERVED",
    target.includes('name: "arctor_content_localization_v1"') &&
      target.includes("strict: true") &&
      target.includes("schema,"),
  ],
  [
    "STABLE_CONTENT_IDEMPOTENCY_KEY",
    target.includes("buildContentLocalizationRequestIdempotencyKey") &&
      target.includes('return `content-localization:${digest}`'),
  ],
  [
    "LEGACY_RESERVE_REMOVED",
    !target.includes("async function reserveBudget(") &&
      !target.includes("preflight_ai_pilot_call_budget_v1"),
  ],
  [
    "LEGACY_USAGE_EVENT_CREATE_REMOVED",
    !target.includes("async function createUsageEvent(") &&
      !target.includes("pilot_budget_reservation_id"),
  ],
  [
    "LEGACY_USAGE_FINALIZE_REMOVED",
    !target.includes("async function finalizeUsageEvent(") &&
      !target.includes("CONTENT_LOCALIZATION_USAGE_FINALIZE_FAILED"),
  ],
  [
    "LEGACY_USAGE_FAILURE_MARK_REMOVED",
    !target.includes("async function markUsageFailed("),
  ],
  [
    "ANALYSIS_EXECUTION_LIFECYCLE_PRESERVED",
    target.includes("createAiAnalysisExecution({") &&
      target.includes(
        "completeAiAnalysisExecution(localizationExecutionId)",
      ) &&
      target.includes(
        "failAiAnalysisExecution(localizationExecutionId, error)",
      ),
  ],
  [
    "CONTEXT_MANIFEST_LIFECYCLE_PRESERVED",
    target.includes("createAiContextManifest({") &&
      target.includes("markAiContextManifestProviderCompleted(") &&
      target.includes("markAiContextManifestValidated(") &&
      target.includes("markAiContextManifestFailed("),
  ],
  [
    "MANIFEST_CREATED_BEFORE_PROVIDER",
    target.indexOf("contextManifestId = await createAiContextManifest({") >= 0 &&
      target.indexOf("contextManifestId = await createAiContextManifest({") <
        target.indexOf(
          "const response = await runBillableAiJson<TranslationOutput>({",
        ),
  ],
  [
    "GATEWAY_RECEIVES_AUDIT_IDS",
    target.includes("analysisExecutionId: localizationExecutionId") &&
      target.includes("contextManifestId,"),
  ],
  [
    "GATEWAY_BINDS_USAGE_TO_ANALYSIS",
    gateway.includes("async function bindUsageAuditContext") &&
      gateway.includes("analysis_execution_id: analysisExecutionId"),
  ],
  [
    "GATEWAY_BINDS_MANIFEST_TO_USAGE",
    gateway.includes("ai_usage_event_id: input.usageEventId") &&
      gateway.includes(
        "AI_BILLING_GATEWAY_CONTEXT_MANIFEST_BIND_FAILED",
      ),
  ],
  [
    "AUDIT_BINDING_FAILURE_RELEASES_RESERVATION",
    gateway.includes("auditBindingFailed: true") &&
      gateway.includes(
        "AI_BILLING_GATEWAY_AUDIT_BIND_AND_RESERVATION_RELEASE_FAILED",
      ),
  ],
  [
    "BOUNDARY_EXCEPTION_REMOVED",
    !remaining.some(
      (entry) =>
        entry.path ===
        "src/lib/localization/contentLocalization.server.ts",
    ),
  ],
  [
    "FIVE_LEGACY_WRAPPERS_REMAIN",
    remaining.length === 5,
  ],
  [
    "DORMANT_GOAL_INTAKE_STILL_PROTECTED",
    remaining.some(
      (entry) =>
        entry.path ===
        "src/lib/goal-world/intake/goalIntakeRuntime.server.ts",
    ),
  ],
];

let passed = 0;

for (const [name, ok] of checks) {
  console.log(`${name}=${ok ? "PASS" : "FAIL"}`);
  if (ok) passed += 1;
}

console.log(
  `B3_4B3_CONTENT_LOCALIZATION_VALIDATOR=${
    passed === checks.length ? "PASS" : "FAIL"
  }_${passed}_${checks.length}`,
);

if (passed !== checks.length) {
  process.exit(1);
}
