import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  route: path.join(root, "src/app/api/test/route.ts"),
  gateway: path.join(root, "src/lib/ai-billing/gateway.server.ts"),
  runtime: path.join(root, "src/lib/ai-billing/runtime.ts"),
  provider: path.join(root, "lib/ai/openaiClient.ts"),
};

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`MISSING_FILE:${path.relative(root, file)}`);
  return fs.readFileSync(file, "utf8");
}

const route = read(files.route);
const gateway = read(files.gateway);
const runtime = read(files.runtime);
const provider = read(files.provider);

const checks = [
  ["ROUTE_USES_UNIFIED_GATEWAY", route.includes("runBillableAiJson<ChatAiResponse>")],
  ["ROUTE_IMPORTS_GATEWAY", route.includes('from "@/lib/ai-billing/gateway.server"')],
  ["ROUTE_NO_DIRECT_PROVIDER_CALL", !route.includes("runAiJsonWithUsageMetadata<ChatAiResponse>")],
  ["ROUTE_NO_DIRECT_PROVIDER_IMPORT", !route.includes('import { runAiJsonWithUsageMetadata } from "../../../../lib/ai/openaiClient";')],
  ["ROUTE_NO_LEGACY_SETTLEMENT_EXECUTION", !route.includes("await settleAiUsageDebit({")],
  ["BILLING_USER_IS_APP_USER", route.includes("billingUserId: appUser.id")],
  ["ROUTE_PATH_BOUND", route.includes('routePath: "/api/test"')],
  ["OPERATION_BOUND", route.includes('operationKind: "chat_message"')],
  ["REQUEST_IDEMPOTENCY_RESOLVED", route.includes("resolveRequestIdempotencyKey(request, body)") && route.includes('request.headers.get("idempotency-key")') && route.includes("crypto.randomUUID()")],
  ["REQUEST_IDEMPOTENCY_PASSED", route.includes("requestIdempotencyKey,") && route.includes("runBillableAiJson<ChatAiResponse>")],
  ["ESTIMATES_PASSED_TO_GATEWAY", route.includes("estimatedInputTokens: preflightResult.preflight.estimatedInputTokens") && route.includes("estimatedOutputTokens: preflightResult.preflight.estimatedOutputTokens") && route.includes("preflightSafetyMultiplier: PREFLIGHT_COST_SAFETY_MULTIPLIER")],
  ["PROVIDER_REQUEST_PRESERVED", route.includes("providerRequest: {") && route.includes("structuredOutput: methodologyContext.structuredOutput") && route.includes("userImageDataUrl: chatImage?.dataUrl ?? null")],
  ["RESPONSE_EXPOSES_GATEWAY_EVIDENCE", route.includes("requestIdempotencyKey: aiCall.billing.requestIdempotencyKey") && route.includes("reserveLedgerId: aiCall.billing.reserveLedgerId") && route.includes("releaseLedgerId: aiCall.billing.releaseLedgerId") && route.includes("debitLedgerId: aiCall.billing.debitLedgerId")],
  ["DUPLICATE_REQUEST_HANDLED", route.includes("AiBillingRequestAlreadyAcquiredError") && route.includes('"duplicate_request"')],
  ["B2_2_GATEWAY_PRESENT", gateway.includes("ARCTOR_AI_BILLING_GATEWAY_B2_2_RESERVATION_IDEMPOTENCY_V1") && gateway.includes("reserveAiUsageRequest({") && gateway.includes("settleReservedAiUsageDebit({")],
  ["B2_2_RUNTIME_PRESENT", runtime.includes('"reserve_ai_usage_request_v1"') && runtime.includes('"release_ai_usage_reservation_v1"') && runtime.includes('"settle_reserved_ai_usage_v1"')],
  ["PROVIDER_LEVEL_IDEMPOTENCY_PRESENT", provider.includes("idempotencyKey?: string") && provider.includes("{ idempotencyKey: idempotencyKey.trim() }")],
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
if (passed !== checks.length) process.exit(1);
