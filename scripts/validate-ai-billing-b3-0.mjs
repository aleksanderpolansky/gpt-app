import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  openai: path.join(root, "lib/ai/openaiClient.ts"),
  runtime: path.join(root, "src/lib/ai-billing/runtime.ts"),
  syncGateway: path.join(root, "src/lib/ai-billing/gateway.server.ts"),
  backgroundGateway: path.join(
    root,
    "src/lib/ai-billing/backgroundGateway.server.ts",
  ),
  migration: path.join(
    root,
    "supabase/migrations/20260930195500_ai_billing_b3_0_background_gateway.sql",
  ),
  boundary: path.join(root, "scripts/validate-ai-gateway-boundary.mjs"),
};

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`B3_0_FILE_MISSING:${path.relative(root, file)}`);
  }
  return fs.readFileSync(file, "utf8");
}

const openai = read(files.openai);
const runtime = read(files.runtime);
const syncGateway = read(files.syncGateway);
const background = read(files.backgroundGateway);
const migration = read(files.migration);
const boundary = read(files.boundary);

const checks = [
  [
    "BACKGROUND_TRANSPORT_CREATE",
    openai.includes("export async function createAiBackgroundResponse") &&
      openai.includes("openai.responses.create("),
  ],
  [
    "BACKGROUND_TRANSPORT_RETRIEVE",
    openai.includes("export async function retrieveAiBackgroundResponse") &&
      openai.includes("openai.responses.retrieve("),
  ],
  [
    "BACKGROUND_TRANSPORT_CANCEL",
    openai.includes("export async function cancelAiBackgroundResponse") &&
      openai.includes("openai.responses.cancel("),
  ],
  [
    "BACKGROUND_USAGE_EXTRACTOR",
    openai.includes("export function extractAiResponseUsageMetadata") &&
      openai.includes("export function countAiWebSearchCalls"),
  ],
  [
    "WEB_SEARCH_RATE_FROZEN",
    openai.includes("OPENAI_WEB_SEARCH_USD_PER_CALL = 0.01"),
  ],
  [
    "RUNTIME_FIXED_PROVIDER_COST_CONVERSION",
    runtime.includes("export function convertAiProviderCostToEur"),
  ],
  [
    "SYNC_GATEWAY_AI_CHANNEL_KIND",
    syncGateway.includes('| "ai_channel"'),
  ],
  [
    "BACKGROUND_START_RESERVES",
    background.includes("reserveAiUsageRequest({") &&
      background.includes("startBillableAiBackgroundResponse"),
  ],
  [
    "BACKGROUND_START_PROVIDER_IDEMPOTENCY",
    background.includes("providerRequestIdempotencyKey") &&
      background.includes("createAiBackgroundResponse({"),
  ],
  [
    "BACKGROUND_POLL_SETTLES",
    background.includes("pollBillableAiBackgroundResponse") &&
      background.includes("settleReservedAiUsageDebit({"),
  ],
  [
    "BACKGROUND_FAILURE_RELEASE",
    background.includes("releaseAiUsageReservation({"),
  ],
  [
    "BACKGROUND_UNRESOLVED_HOLDS_RESERVATION",
    background.includes("reservationIntentionallyHeld: true"),
  ],
  [
    "BACKGROUND_TOOL_COST_ACCOUNTING",
    background.includes("OPENAI_WEB_SEARCH_USD_PER_CALL") &&
      background.includes("provider_tool_cost_eur") &&
      background.includes("provider_token_cost_eur"),
  ],
  [
    "NO_DIRECT_OPENAI_IN_BACKGROUND_GATEWAY",
    !background.includes('from "openai"') &&
      !background.includes("new OpenAI(") &&
      !background.includes(".responses.create(") &&
      !background.includes(".responses.retrieve(") &&
      !background.includes(".responses.cancel("),
  ],
  [
    "CHANNEL_RUN_DURABLE_BILLING_LINK",
    migration.includes("billing_user_id uuid") &&
      migration.includes("ai_usage_event_id uuid") &&
      migration.includes("billing_request_idempotency_key text"),
  ],
  [
    "CHANNEL_RUN_BIND_RPC",
    migration.includes("bind_ai_channel_run_billing_v1"),
  ],
  [
    "CHANNEL_PROVIDER_BIND_RPC",
    migration.includes("bind_ai_channel_provider_response_v1"),
  ],
  [
    "TOOL_COST_COLUMNS",
    migration.includes("provider_token_cost_eur") &&
      migration.includes("provider_tool_calls") &&
      migration.includes("provider_tool_cost_eur"),
  ],
  [
    "B2_4_PREBUILD_BOUNDARY_RETAINED",
    boundary.includes("AI_GATEWAY_BOUNDARY_VALIDATOR=PASS"),
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
  `B3_0_VALIDATOR=${passed === checks.length ? "PASS" : "FAIL"}_${passed}_${checks.length}`,
);

if (passed !== checks.length) process.exit(1);
