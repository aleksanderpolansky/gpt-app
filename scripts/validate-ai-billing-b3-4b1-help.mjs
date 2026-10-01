import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const HELP = "src/lib/help/helpTranslation.server.ts";
const ROUTE = "src/app/api/admin/help-system/route.ts";
const GATEWAY = "src/lib/ai-billing/gateway.server.ts";
const BOUNDARY = "config/ai-provider-boundary.json";

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`B3_4B1_VALIDATOR_FILE_MISSING:${rel}`);
  }
  return fs.readFileSync(full, "utf8");
}

const help = read(HELP);
const route = read(ROUTE);
const gateway = read(GATEWAY);
const boundary = JSON.parse(read(BOUNDARY));

const remaining = boundary.legacyWrapperExceptions ?? [];

const checks = [
  [
    "HELP_DIRECT_WRAPPER_REMOVED",
    !/\brunAiJson(?:WithUsageMetadata)?(?:<[^>\n]+>)?\s*\(/.test(help),
  ],
  [
    "HELP_USES_UNIFIED_GATEWAY",
    help.includes("runBillableAiJson<HelpTranslations>"),
  ],
  [
    "HELP_OPERATION_KIND_CONTENT_LOCALIZATION",
    help.includes(
      'const HELP_TRANSLATION_OPERATION_KIND = "content_localization" as const;',
    ) &&
      help.includes("operationKind: HELP_TRANSLATION_OPERATION_KIND"),
  ],
  [
    "HELP_PRO_TIER_PRESERVED",
    help.includes('const HELP_TRANSLATION_MODEL_TIER = "pro" as const;') &&
      help.includes('getNavigatorModelDefinition("pro")'),
  ],
  [
    "HELP_MAX_OUTPUT_PRESERVED",
    help.includes("HELP_TRANSLATION_MAX_OUTPUT_TOKENS = 16_000") &&
      help.includes("HELP_TRANSLATION_OUTPUT_TOKEN_CEILING = 18_000"),
  ],
  [
    "HELP_TIMEOUT_RETRY_STORE_PRESERVED",
    help.includes("HELP_TRANSLATION_REQUEST_TIMEOUT_MS = 90_000") &&
      help.includes("maxRetries: 0") &&
      help.includes("store: false"),
  ],
  [
    "HELP_STRUCTURED_OUTPUT_PRESERVED",
    help.includes('name: "arctor_help_translation_v1"') &&
      help.includes("schema: TRANSLATION_SCHEMA") &&
      help.includes("strict: true"),
  ],
  [
    "HELP_CONSERVATIVE_ESTIMATE",
    help.includes("Buffer.byteLength(") &&
      help.includes("estimatedInputTokens") &&
      help.includes("preflightSafetyMultiplier: 1.25"),
  ],
  [
    "HELP_BILLING_TRACE_RETURNED",
    help.includes("usageEventId: response.billing.usageEventId") &&
      help.includes("walletDebitEur: response.billing.walletDebitEur") &&
      help.includes(
        "requestIdempotencyKey: response.billing.requestIdempotencyKey",
      ),
  ],
  [
    "ROUTE_AUTH_ADMIN_PAYS",
    route.includes("billingUserId: guard.appUser.id"),
  ],
  [
    "ROUTE_FRESH_SAVE_IDEMPOTENCY",
    route.includes("randomUUID") &&
      route.includes(
        "help-translation:${helpKey}:${blockKind}:${randomUUID()}",
      ),
  ],
  [
    "ROUTE_CONTEXT_PASSED",
    route.includes("helpKey,") && route.includes("blockKind,"),
  ],
  [
    "GATEWAY_TYPE_HAS_CONTENT_LOCALIZATION",
    gateway.includes('| "content_localization"'),
  ],
  [
    "HELP_BOUNDARY_EXCEPTION_REMOVED",
    !remaining.some((entry) => entry.path === HELP),
  ],
  [
    "SIX_LEGACY_WRAPPERS_REMAIN",
    remaining.length === 6,
  ],
  [
    "OTHER_LEGACY_WRAPPERS_PRESERVED",
    [
      "lib/reality/globalObservationPilot.ts",
      "src/lib/activity/activity-basic-intake-analysis.server.ts",
      "src/lib/activity/typical-activity-template-matcher.server.ts",
      "src/lib/ai/activitySemanticReviewA31.server.ts",
      "src/lib/goal-world/intake/goalIntakeRuntime.server.ts",
      "src/lib/localization/contentLocalization.server.ts",
    ].every((target) => remaining.some((entry) => entry.path === target)),
  ],
];

let passed = 0;

for (const [name, ok] of checks) {
  console.log(`${name}=${ok ? "PASS" : "FAIL"}`);
  if (ok) passed += 1;
}

console.log(
  `B3_4B1_HELP_VALIDATOR=${
    passed === checks.length ? "PASS" : "FAIL"
  }_${passed}_${checks.length}`,
);

if (passed !== checks.length) {
  process.exit(1);
}
