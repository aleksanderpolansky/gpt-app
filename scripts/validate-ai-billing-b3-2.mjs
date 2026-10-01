import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const TARGET = "lib/organizations/organizationSemanticIntake.ts";
const SEMANTIC_ROUTE = "src/app/api/ai/semantic-intake/organization/route.ts";
const ORGANIZATIONS_ROUTE = "src/app/api/organizations/route.ts";
const BOUNDARY = "config/ai-provider-boundary.json";

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`B3_2_VALIDATOR_FILE_MISSING:${rel}`);
  }
  return fs.readFileSync(full, "utf8");
}

const target = read(TARGET);
const semanticRoute = read(SEMANTIC_ROUTE);
const organizationsRoute = read(ORGANIZATIONS_ROUTE);
const boundary = JSON.parse(read(BOUNDARY));

const checks = [
  [
    "DIRECT_OPENAI_IMPORT_REMOVED",
    !/(^|\n)\s*import\s+OpenAI\s+from\s+["']openai["'];?/m.test(target),
  ],
  [
    "DIRECT_NEW_OPENAI_REMOVED",
    !/\bnew\s+OpenAI\s*\(/.test(target),
  ],
  [
    "DIRECT_RESPONSES_CREATE_REMOVED",
    !/\.responses\.create\s*\(/.test(target),
  ],
  [
    "UNIFIED_GATEWAY_IMPORTED",
    target.includes(
      'import { runBillableAiJson } from "../../src/lib/ai-billing/gateway.server";',
    ),
  ],
  [
    "UNIFIED_GATEWAY_CALLED",
    target.includes("runBillableAiJson<ParsedSemanticOutput>"),
  ],
  [
    "OPERATION_KIND_SEMANTIC_INTAKE",
    target.includes('operationKind: "semantic_intake"'),
  ],
  [
    "NANO_TIER_PRESERVED",
    target.includes('tierCode: "nano"') &&
      target.includes('getNavigatorModelDefinition("nano").modelName'),
  ],
  [
    "MODEL_REASONING_PRESERVED",
    target.includes(
      'reasoningEffort: getNavigatorModelDefinition("nano").reasoningEffort',
    ),
  ],
  [
    "OUTPUT_LIMIT_PRESERVED",
    target.includes(
      "const ORGANIZATION_SEMANTIC_MAX_OUTPUT_TOKENS = 1200",
    ) &&
      target.includes(
        "outputTokenCeiling: ORGANIZATION_SEMANTIC_MAX_OUTPUT_TOKENS",
      ),
  ],
  [
    "SEMANTIC_PARSER_PRESERVED",
    target.includes("tryParseJsonObject(aiCall.outputText)") &&
      target.includes("normalizeParsedOutput("),
  ],
  [
    "RAW_USAGE_PUBLIC_CONTRACT_PRESERVED",
    target.includes("usage: aiCall.usage.rawUsage ?? null"),
  ],
  [
    "FALLBACK_CATEGORY_PRESERVED",
    target.includes("FALLBACK_CATEGORY_SLUG") &&
      target.includes("FALLBACK_CATEGORY_LABEL") &&
      target.includes("usedFallbackCategory"),
  ],
  [
    "PERSISTENCE_FLOW_PRESERVED",
    target.includes("if (persist)") &&
      target.includes("persistSemanticCategory({") &&
      target.includes("replaceExistingAiPrimary"),
  ],
  [
    "EXPLICIT_BILLING_INPUT_REQUIRED",
    target.includes("billingUserId: string;") &&
      target.includes("billingRoutePath: string;") &&
      target.includes("requestIdempotencyKey: string;"),
  ],
  [
    "SEMANTIC_ROUTE_AUTH_PRESERVED",
    semanticRoute.includes("auth0.getSession()") &&
      semanticRoute.includes(".eq(\"created_by_user_id\", input.appUserId)"),
  ],
  [
    "SEMANTIC_ROUTE_BILLING_USER",
    semanticRoute.includes("billingUserId: appUser.id") &&
      semanticRoute.includes(
        'billingRoutePath: "/api/ai/semantic-intake/organization"',
      ),
  ],
  [
    "SEMANTIC_ROUTE_REQUEST_IDEMPOTENCY",
    semanticRoute.includes("randomUUID()") &&
      semanticRoute.includes("organization-semantic:"),
  ],
  [
    "ORGANIZATION_CREATE_ACTOR_CONTEXT_PRESERVED",
    organizationsRoute.includes("resolveActiveActorContext") &&
      organizationsRoute.includes("actorContext.appUserId"),
  ],
  [
    "ORGANIZATION_CREATE_BILLING_USER",
    organizationsRoute.includes("billingUserId: actorContext.appUserId") &&
      organizationsRoute.includes('billingRoutePath: "/api/organizations"'),
  ],
  [
    "ORGANIZATION_CREATE_REQUEST_IDEMPOTENCY",
    organizationsRoute.includes("randomUUID()") &&
      organizationsRoute.includes("organization-create-semantic:"),
  ],
  [
    "TWO_CALL_SITES_REMAIN",
    (
      semanticRoute.match(/runOrganizationSemanticIntake\s*\(/g) ?? []
    ).length === 1 &&
      (
        organizationsRoute.match(/runOrganizationSemanticIntake\s*\(/g) ?? []
      ).length === 1,
  ],
  [
    "B3_2_DIRECT_EXCEPTION_REMOVED",
    !(boundary.legacyDirectProviderExceptions ?? []).some(
      (item) => item?.path === TARGET,
    ),
  ],
  [
    "B3_3_DIRECT_EXCEPTION_PRESERVED",
    (boundary.legacyDirectProviderExceptions ?? []).some(
      (item) =>
        item?.path === "lib/objectAction/suggestionAnalysis.ts" &&
        item?.nextStage === "B3.3",
    ),
  ],
];

let passed = 0;

for (const [name, ok] of checks) {
  console.log(`${name}=${ok ? "PASS" : "FAIL"}`);
  if (ok) passed += 1;
}

console.log(`B3_2_VALIDATOR=${passed === checks.length ? "PASS" : "FAIL"}_${passed}_${checks.length}`);

if (passed !== checks.length) {
  process.exit(1);
}
