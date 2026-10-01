import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const gatewayPath = "src/lib/ai-billing/gateway.server.ts";

const full = path.join(root, gatewayPath);
if (!fs.existsSync(full)) {
  throw new Error(`B3_2_1_VALIDATOR_FILE_MISSING:${gatewayPath}`);
}

const source = fs.readFileSync(full, "utf8");

const checks = [
  [
    "SUCCESS_TOKEN_COST_RECORDED",
    source.includes("provider_token_cost_eur: input.actualCostEur"),
  ],
  [
    "SUCCESS_TOOL_CALLS_ZERO",
    source.includes("provider_tool_calls: 0"),
  ],
  [
    "SUCCESS_TOOL_COST_ZERO",
    source.includes("provider_tool_cost_eur: 0"),
  ],
  [
    "FAILURE_TOKEN_COST_RECORDED_WHEN_KNOWN",
    source.includes("provider_token_cost_eur: input.actualCostEur ?? null"),
  ],
  [
    "FAILURE_TOOL_COST_CONDITIONAL_ZERO",
    source.includes(
      "input.actualCostEur === undefined || input.actualCostEur === null ? null : 0",
    ),
  ],
  [
    "ACTUAL_COST_CALCULATION_UNCHANGED",
    source.includes("actualCostEur = calculateAiUsageCostEur({"),
  ],
  [
    "SETTLEMENT_UNCHANGED",
    source.includes("settlement = await settleReservedAiUsageDebit({"),
  ],
  [
    "GATEWAY_CONTRACT_UNCHANGED",
    source.includes(
      'ARCTOR_AI_BILLING_GATEWAY_B2_2_RESERVATION_IDEMPOTENCY_V1',
    ),
  ],
];

let passCount = 0;

for (const [name, ok] of checks) {
  console.log(`${name}=${ok ? "PASS" : "FAIL"}`);
  if (ok) passCount += 1;
}

console.log(
  `B3_2_1_VALIDATOR=${passCount === checks.length ? "PASS" : "FAIL"}_${passCount}_${checks.length}`,
);

if (passCount !== checks.length) {
  process.exit(1);
}
