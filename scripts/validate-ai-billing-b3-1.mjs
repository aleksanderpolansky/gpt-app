import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`B3_1_FILE_MISSING:${rel}`);
  return fs.readFileSync(full, "utf8");
}

const server = read("src/lib/ai-channels/server.ts");
const contracts = read("src/lib/ai-channels/contracts.ts");
const route = read("src/app/api/ai-channels/route.ts");
const ui = read("src/app/feed/AiChannels.tsx");
const copy = read("src/lib/ai-channels/copy.ts");
const catalog = read("lib/ai/platformModelCatalog.ts");
const boundary = read("config/ai-provider-boundary.json");
const background = read("src/lib/ai-billing/backgroundGateway.server.ts");
const maintenance = read("src/app/api/maintenance/ai-channels/route.ts");
const search = read("src/lib/ai-channels/search.ts");
const migration = read("supabase/migrations/20260930202500_ai_billing_b3_1_ai_channels_gateway.sql");

const policy = JSON.parse(boundary);

const checks = [
  ["SERVER_NO_OPENAI_IMPORT",
    !server.includes("from 'openai'") &&
    !server.includes('from "openai"') &&
    !server.includes("new OpenAI(")],
  ["SERVER_NO_DIRECT_RESPONSES",
    !server.includes(".responses.create(") &&
    !server.includes(".responses.retrieve(") &&
    !server.includes(".responses.cancel(")],
  ["SERVER_USES_BACKGROUND_GATEWAY",
    server.includes("startBillableAiBackgroundResponse") &&
    server.includes("pollBillableAiBackgroundResponse") &&
    server.includes("cancelBillableAiBackgroundProvider")],
  ["OWNER_PAYS",
    server.includes("billingUserId:c.owner_user_id") &&
    server.includes("p_billing_user_id:c.owner_user_id") &&
    server.includes("channelOwnerUserId:c.owner_user_id")],
  ["RUN_BILLING_BIND",
    server.includes("bind_ai_channel_run_billing_v1")],
  ["PROVIDER_BIND",
    server.includes("bind_ai_channel_provider_response_v1")],
  ["REQUEST_IDEMPOTENCY",
    server.includes("ai-channel:${id}:${runId}")],
  ["WEB_SEARCH_RESERVED",
    server.includes("AI_BACKGROUND_WEB_SEARCH_USD_PER_CALL")],
  ["RESERVATION_CALLBACK_CONTEXT_TYPED",
    server.includes("type AiBackgroundReservationContext") &&
    server.includes("billing:AiBackgroundReservationContext")],
  ["SEARCH_REASONING_SDK_COMPAT",
    search.includes("NonNullable<OpenAI.Responses.ResponseCreateParamsNonStreaming['reasoning']>['effort']")],
  ["BACKGROUND_RETRY_IDEMPOTENCY_HARDENED",
    background.includes('event.status === "wallet_debited"') &&
    background.includes("AI_BILLING_BACKGROUND_PREVIOUS_DEBIT_FAILED")],
  ["CHANNEL_EXCEPTION_REMOVED",
    !(policy.legacyDirectProviderExceptions ?? []).some(
      (x) => x.path === "src/lib/ai-channels/server.ts",
    )],
  ["DIRECT_PROVIDER_EXCEPTIONS_NOW_TWO",
    (policy.legacyDirectProviderExceptions ?? []).length === 2],
  ["ALL_FOUR_MODELS_CHANNEL_ENABLED",
    (catalog.match(/aiChannels: true/g) ?? []).length === 4 &&
    !catalog.includes("aiChannels: false")],
  ["CONTRACT_USES_SHARED_CATALOG",
    contracts.includes("ARCTOR_AI_MODEL_CATALOG") &&
    contracts.includes("ARCTOR_AI_MODEL_ORDER") &&
    contracts.includes("gpt-6-astra") === false],
  ["CONTRACT_SUPPORTS_MAX",
    contracts.includes("'low'|'medium'|'high'|'max'")],
  ["PUBLIC_MODEL_SELECTION_NOT_FORCED_TO_DEFAULT",
    route.includes("model:parsed.model??CHANNEL_MODEL") &&
    !route.includes("model:CHANNEL_MODEL,reasoningEffort")],
  ["UI_SHARED_MODEL_SELECTOR",
    ui.includes("{v.model}<select") &&
    ui.includes("CHANNEL_MODEL_OPTIONS.map") &&
    ui.includes("channelReasoningForModel")],
  ["UI_MAX_REASONING",
    ui.includes('<option value="max">max</option>')],
  ["PLATFORM_PAYS_COPY_REMOVED",
    !copy.includes("the platform pays") &&
    !copy.includes("расходы оплачивает платформа") &&
    !copy.includes("koszt ponosi platforma")],
  ["SCHEDULED_OWNER_IDENTITY",
    maintenance.includes("user:c.owner_user_id")],
  ["DB_MODEL_METADATA",
    migration.includes("'aiChannelSelectable',true")],
  ["DB_LEGACY_RUN_PREFLIGHT",
    migration.includes("LEGACY_RUNNING_CHANNELS_PRESENT")],
];

let pass = 0;
for (const [name, ok] of checks) {
  console.log(`${name}=${ok ? "PASS" : "FAIL"}`);
  if (ok) pass += 1;
}

console.log(`B3_1_VALIDATOR=${pass === checks.length ? "PASS" : "FAIL"}_${pass}_${checks.length}`);
if (pass !== checks.length) process.exit(1);
