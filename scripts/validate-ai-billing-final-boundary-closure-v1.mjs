import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const policy = JSON.parse(
  fs.readFileSync(
    path.join(root, "config/ai-provider-boundary.json"),
    "utf8",
  ),
);

const expectedDormant = new Set([
  "src/lib/activity/typical-activity-template-matcher.server.ts",
  "src/lib/goal-world/intake/goalIntakeRuntime.server.ts",
]);

const actualDormant = new Set(
  (policy.legacyWrapperExceptions ?? [])
    .filter((item) => item?.status === "dormant_deferred")
    .map((item) => item.path),
);

const checks = [];
const check = (name, pass) =>
  checks.push({ name, pass: Boolean(pass) });

check(
  "BOUNDARY_CONTRACT_V1_3",
  policy.contract === "ARCTOR_AI_PROVIDER_BOUNDARY_B2_4_V1_3",
);

check(
  "DIRECT_PROVIDER_EXCEPTIONS_ZERO",
  Array.isArray(policy.legacyDirectProviderExceptions) &&
    policy.legacyDirectProviderExceptions.length === 0,
);

check(
  "BACKGROUND_GATEWAY_ALLOWLIST_EXACT",
  Array.isArray(policy.backgroundProviderWrapperAllowedFiles) &&
    policy.backgroundProviderWrapperAllowedFiles.length === 1 &&
    policy.backgroundProviderWrapperAllowedFiles[0] ===
      "src/lib/ai-billing/backgroundGateway.server.ts",
);

check(
  "DORMANT_EXCEPTION_COUNT_TWO",
  actualDormant.size === 2,
);

check(
  "DORMANT_TYPICAL_ACTIVITY_MATCHER_RETAINED",
  actualDormant.has(
    "src/lib/activity/typical-activity-template-matcher.server.ts",
  ),
);

check(
  "DORMANT_GOAL_INTAKE_RETAINED",
  actualDormant.has(
    "src/lib/goal-world/intake/goalIntakeRuntime.server.ts",
  ),
);

check(
  "NO_OTHER_LEGACY_WRAPPER_EXCEPTION",
  [...actualDormant].every((path) => expectedDormant.has(path)) &&
    [...expectedDormant].every((path) => actualDormant.has(path)),
);

const backgroundGateway = fs.readFileSync(
  path.join(root, "src/lib/ai-billing/backgroundGateway.server.ts"),
  "utf8",
);

check(
  "BACKGROUND_GATEWAY_OWNS_PROVIDER_TRANSPORT",
  backgroundGateway.includes("createAiBackgroundResponse") &&
    backgroundGateway.includes("retrieveAiBackgroundResponse") &&
    backgroundGateway.includes("cancelAiBackgroundResponse"),
);

check(
  "BACKGROUND_GATEWAY_OWNS_RESERVE_SETTLE",
  backgroundGateway.includes("reserveAiUsageRequest") &&
    backgroundGateway.includes("settleReservedAiUsageDebit") &&
    backgroundGateway.includes("releaseAiUsageReservation"),
);

const channelServer = fs.readFileSync(
  path.join(root, "src/lib/ai-channels/server.ts"),
  "utf8",
);

check(
  "AI_CHANNELS_USE_BACKGROUND_BILLING_GATEWAY",
  channelServer.includes("startBillableAiBackgroundResponse") &&
    channelServer.includes("pollBillableAiBackgroundResponse") &&
    channelServer.includes("cancelBillableAiBackgroundProvider"),
);

check(
  "AI_CHANNELS_DO_NOT_CALL_RAW_BACKGROUND_PROVIDER",
  !channelServer.includes("createAiBackgroundResponse") &&
    !channelServer.includes("retrieveAiBackgroundResponse") &&
    !channelServer.includes("cancelAiBackgroundResponse"),
);

const failed = checks.filter((item) => !item.pass);

for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}`);
}

console.log(
  `SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`,
);

if (failed.length > 0) {
  console.error("AI_BILLING_FINAL_BOUNDARY_CLOSURE_VALIDATOR=FAIL");
  process.exit(1);
}

console.log("ACTIVE_DIRECT_PROVIDER_EXCEPTIONS=0");
console.log("DORMANT_LEGACY_WRAPPER_EXCEPTIONS=2");
console.log("BACKGROUND_PROVIDER_GATEWAY=ENFORCED");
console.log("AI_CHANNEL_BACKGROUND_BILLING=ENFORCED");
console.log("AI_BILLING_FINAL_BOUNDARY_CLOSURE_VALIDATOR=PASS");
