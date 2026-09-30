import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  gateway: path.join(root, "src/lib/ai-billing/gateway.server.ts"),
  runtime: path.join(root, "src/lib/ai-billing/runtime.ts"),
  provider: path.join(root, "lib/ai/openaiClient.ts"),
  apiTest: path.join(root, "src/app/api/test/route.ts"),
  migration: path.join(
    root,
    "supabase/migrations/20260930111500_ai_billing_b1_foundation.sql",
  ),
};

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`MISSING_FILE:${path.relative(root, file)}`);
  }
  return fs.readFileSync(file, "utf8");
}

const gateway = read(files.gateway);
const runtime = read(files.runtime);
const provider = read(files.provider);
const apiTest = read(files.apiTest);
const migration = read(files.migration);

const checks = [
  [
    "GATEWAY_CONTRACT",
    gateway.includes("ARCTOR_AI_BILLING_GATEWAY_B2_1_FOUNDATION_V1"),
  ],
  [
    "SERVER_ONLY",
    gateway.includes('import "server-only"'),
  ],
  [
    "USES_PROVIDER_ADAPTER",
    gateway.includes("runAiJsonWithUsageMetadata"),
  ],
  [
    "NO_DIRECT_OPENAI_CLIENT",
    !gateway.includes("new OpenAI") && !gateway.includes("responses.create"),
  ],
  [
    "USES_B1_PRICE_CALCULATOR",
    gateway.includes("calculateAiUsageCostEur"),
  ],
  [
    "USES_B1_PREFLIGHT",
    gateway.includes("requireAiWalletForEstimatedCost"),
  ],
  [
    "USES_B1_ATOMIC_SETTLEMENT",
    gateway.includes("settleAiUsageDebit"),
  ],
  [
    "PREFLIGHT_ALLOWED_EVENT",
    gateway.includes('status: "preflight_allowed"'),
  ],
  [
    "PROVIDER_COMPLETED_EVENT",
    gateway.includes('status: "openai_completed"'),
  ],
  [
    "PROVIDER_FAILED_EVENT",
    gateway.includes('status: "openai_failed"'),
  ],
  [
    "SETTLEMENT_FAILED_EVENT",
    gateway.includes('status: "debit_failed"') &&
      gateway.includes("markPostProviderBillingFailed"),
  ],
  [
    "ACTUAL_PROVIDER_USAGE",
    gateway.includes("providerResult.usage.inputTokens") &&
      gateway.includes("providerResult.usage.cachedInputTokens") &&
      gateway.includes("providerResult.usage.outputTokens") &&
      gateway.includes("providerResult.usage.totalTokens") &&
      gateway.includes("usage: input.usage.rawUsage ?? null"),
  ],
  [
    "B2_2_RESERVATION_NOT_FAKED",
    gateway.includes('reservationMode: "read_only_preflight_b2_1"') &&
      gateway.includes('requestIdempotencyMode: "not_yet_b2_2"'),
  ],
  [
    "B1_SETTLEMENT_RPC_PRESENT",
    runtime.includes('supabase.rpc("settle_ai_usage_debit_v1"') &&
      migration.includes("create or replace function public.settle_ai_usage_debit_v1"),
  ],
  [
    "PROVIDER_USAGE_EXTRACTION_PRESENT",
    provider.includes("extractUsageMetadata") &&
      provider.includes("cachedInputTokens") &&
      provider.includes("totalTokens"),
  ],
  [
    "API_TEST_NOT_MIGRATED_YET",
    apiTest.includes("runAiJsonWithUsageMetadata") &&
      !apiTest.includes("runBillableAiJson"),
  ],
];

let passed = 0;

for (const [name, ok] of checks) {
  if (ok) {
    passed += 1;
    console.log(`${name}=PASS`);
  } else {
    console.error(`${name}=FAIL`);
  }
}

console.log(`VALIDATOR=${passed === checks.length ? "PASS" : "FAIL"}_${passed}_${checks.length}`);

if (passed !== checks.length) {
  process.exit(1);
}
