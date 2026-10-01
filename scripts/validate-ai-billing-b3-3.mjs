import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const targetPath = "lib/objectAction/suggestionAnalysis.ts";
const routePath = "src/app/api/object-action/suggestions/route.ts";
const gatewayPath = "src/lib/ai-billing/gateway.server.ts";
const boundaryPath = "config/ai-provider-boundary.json";
const dbMigrationPath =
  "supabase/migrations/20261001162000_ai_billing_b3_3_1_object_action_operation_kind.sql";

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`B3_3_VALIDATOR_FILE_MISSING:${rel}`);
  }
  return fs.readFileSync(full, "utf8");
}

const target = read(targetPath);
const route = read(routePath);
const gateway = read(gatewayPath);
const boundary = JSON.parse(read(boundaryPath));
const dbMigration = read(dbMigrationPath);

const checks = [
  [
    "NO_DIRECT_OPENAI_IMPORT",
    !/(^|\n)\s*import\s+OpenAI\s+from\s+["']openai["'];?/m.test(target),
  ],
  ["NO_NEW_OPENAI", !/\bnew\s+OpenAI\s*\(/.test(target)],
  ["NO_DIRECT_RESPONSES_CREATE", !/\.responses\.create\s*\(/.test(target)],
  [
    "USES_UNIFIED_GATEWAY",
    /\brunBillableAiJson<RawAiAnalysisResult>\s*\(/.test(target),
  ],
  [
    "EXPLICIT_OPERATION_KIND",
    target.includes('operationKind: "object_action_suggestion"'),
  ],
  ["NANO_TIER", target.includes('tierCode: "nano"')],
  ["LOW_REASONING", target.includes('reasoningEffort: "low"')],
  [
    "STRICT_JSON_SCHEMA",
    target.includes('name: "object_action_suggestion_analysis"') &&
      target.includes("schema: suggestionAnalysisSchema") &&
      target.includes("strict: true"),
  ],
  [
    "OUTPUT_LIMIT_PRESERVED",
    target.includes("MIN_SUGGESTION_ANALYSIS_MAX_OUTPUT_TOKENS = 800") &&
      target.includes("estimatedOutputTokens: maxOutputTokens") &&
      target.includes("outputTokenCeiling: maxOutputTokens"),
  ],
  [
    "INPUT_ESTIMATION",
    target.includes("estimatedInputTokens") &&
      target.includes("JSON.stringify(userPayload).length"),
  ],
  [
    "BILLING_USER_INPUT_REQUIRED",
    target.includes("billingUserId: string;") &&
      target.includes("billingUserId: input.billingUserId"),
  ],
  [
    "ROUTE_BILLS_INITIATING_ADMIN",
    route.includes("billingUserId: appUser.id"),
  ],
  [
    "ROUTE_IDEMPOTENCY_PER_ANALYSIS_ATTEMPT",
    route.includes(
      "`object-action-suggestion:${suggestion.id}:${randomUUID()}`",
    ),
  ],
  [
    "ROUTE_PERSISTS_BILLING_TRACE",
    route.includes("usageEventId: analysis.aiUsageEventId") &&
      route.includes("providerResponseId: analysis.aiProviderResponseId") &&
      route.includes("walletDebitEur: analysis.aiWalletDebitEur"),
  ],
  [
    "REQUEST_METADATA_LINKS_SUGGESTION",
    target.includes("suggestionRequestId: input.suggestionRequestId") &&
      target.includes('runtimeCode: "object_action_suggestion_analysis"'),
  ],
  [
    "GATEWAY_KIND_ALLOWED",
    gateway.includes('| "object_action_suggestion"'),
  ],
  [
    "DB_KIND_ALLOWED",
    dbMigration.includes("'object_action_suggestion'"),
  ],
  [
    "BOUNDARY_DIRECT_EXCEPTION_REMOVED",
    !(boundary.legacyDirectProviderExceptions ?? []).some(
      (item) => item?.path === targetPath,
    ),
  ],
  [
    "FAILURE_CONTRACT_PRESERVED",
    target.includes('aiStatus: "failed"') &&
      target.includes(
        'rationale: "AI analysis failed. Manual admin review is required."',
      ),
  ],
  [
    "NORMALIZATION_PRESERVED",
    target.includes("normalizeRawAnalysisResult(") &&
      target.includes("normalizeMatchedExistingCategoryId("),
  ],
];

let passed = 0;

for (const [name, ok] of checks) {
  console.log(`${name}=${ok ? "PASS" : "FAIL"}`);
  if (ok) passed += 1;
}

console.log(
  `B3_3_VALIDATOR=${passed === checks.length ? "PASS" : "FAIL"}_${passed}_${checks.length}`,
);

if (passed !== checks.length) {
  process.exit(1);
}
