import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  gateway: path.join(root, "src/lib/ai-billing/gateway.server.ts"),
  runtime: path.join(root, "src/lib/ai-billing/runtime.ts"),
  migration: path.join(
    root,
    "supabase/migrations/20260930163000_ai_billing_b2_2_reservation_idempotency.sql",
  ),
  apiTest: path.join(root, "src/app/api/test/route.ts"),
  provider: path.join(root, "lib/ai/openaiClient.ts"),
  b1Migration: path.join(
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
const migration = read(files.migration);
const apiTest = read(files.apiTest);
const provider = read(files.provider);
const b1Migration = read(files.b1Migration);

const checks = [
  [
    "B2_2_GATEWAY_CONTRACT",
    gateway.includes("ARCTOR_AI_BILLING_GATEWAY_B2_2_RESERVATION_IDEMPOTENCY_V1"),
  ],
  [
    "REQUEST_IDEMPOTENCY_REQUIRED",
    gateway.includes("requestIdempotencyKey: string") &&
      gateway.includes("AiBillingRequestAlreadyAcquiredError"),
  ],
  [
    "REQUEST_FINGERPRINT_SHA256",
    gateway.includes('createHash("sha256")') &&
      gateway.includes("requestFingerprint(input)"),
  ],
  [
    "PROVIDER_IDEMPOTENCY_KEY",
    gateway.includes("providerRequestIdempotencyKey") &&
      gateway.includes("idempotencyKey: providerRequestIdempotencyKey") &&
      provider.includes("idempotencyKey?: string") &&
      provider.includes("{ idempotencyKey: idempotencyKey.trim() }"),
  ],
  [
    "RESERVE_BEFORE_PROVIDER",
    gateway.indexOf("reserveAiUsageRequest({") <
      gateway.indexOf("runAiJsonWithUsageMetadata<T>({"),
  ],
  [
    "PROVIDER_FAILURE_RELEASES",
    gateway.includes("releaseAiUsageReservation({") &&
      gateway.includes("PROVIDER_FAILED_AND_RESERVATION_RELEASE_FAILED"),
  ],
  [
    "POST_PROVIDER_FAILURE_HOLDS_RESERVATION",
    gateway.includes("reservationIntentionallyHeld: true"),
  ],
  [
    "RESERVED_ATOMIC_SETTLEMENT",
    gateway.includes("settleReservedAiUsageDebit({"),
  ],
  [
    "NO_DIRECT_PROVIDER_BYPASS_IN_GATEWAY",
    !gateway.includes("new OpenAI") && !gateway.includes("responses.create"),
  ],
  [
    "RUNTIME_RESERVE_RPC",
    runtime.includes('supabase.rpc("reserve_ai_usage_request_v1"') ||
      runtime.includes('"reserve_ai_usage_request_v1",'),
  ],
  [
    "RUNTIME_RELEASE_RPC",
    runtime.includes('"release_ai_usage_reservation_v1"'),
  ],
  [
    "RUNTIME_RESERVED_SETTLE_RPC",
    runtime.includes('"settle_reserved_ai_usage_v1"'),
  ],
  [
    "DB_IDEMPOTENCY_UNIQUE_INDEX",
    migration.includes("ai_usage_events_request_idempotency_unique_idx"),
  ],
  [
    "DB_RESERVATION_COLUMN",
    migration.includes("reservation_eur numeric(14,6)"),
  ],
  [
    "DB_RESERVE_RPC",
    migration.includes("create or replace function public.reserve_ai_usage_request_v1"),
  ],
  [
    "DB_RELEASE_RPC",
    migration.includes("create or replace function public.release_ai_usage_reservation_v1"),
  ],
  [
    "DB_RESERVED_SETTLEMENT_RPC",
    migration.includes("create or replace function public.settle_reserved_ai_usage_v1"),
  ],
  [
    "LEDGER_RESERVE_RELEASE_DEBIT",
    migration.includes("'reserve'") &&
      migration.includes("'release'") &&
      migration.includes("'debit'") &&
      migration.includes("'ai_reserve:'") &&
      migration.includes("'ai_release:'") &&
      migration.includes("'ai_usage:'"),
  ],
  [
    "SERVICE_ROLE_ONLY",
    migration.includes("from public, anon, authenticated") &&
      migration.includes("to service_role"),
  ],
  [
    "B1_SETTLEMENT_PRESERVED",
    b1Migration.includes("create or replace function public.settle_ai_usage_debit_v1"),
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

console.log(
  `VALIDATOR=${passed === checks.length ? "PASS" : "FAIL"}_${passed}_${checks.length}`,
);

if (passed !== checks.length) {
  process.exit(1);
}
