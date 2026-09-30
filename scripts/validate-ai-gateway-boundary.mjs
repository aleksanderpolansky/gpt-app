import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const policyPath = path.join(root, "config/ai-provider-boundary.json");

if (!fs.existsSync(policyPath)) {
  throw new Error("AI_PROVIDER_BOUNDARY_POLICY_MISSING");
}

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));

if (policy.contract !== "ARCTOR_AI_PROVIDER_BOUNDARY_B2_4_V1_2") {
  throw new Error("AI_PROVIDER_BOUNDARY_POLICY_CONTRACT_INVALID");
}

function normalizePath(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const result = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...walk(full));
      continue;
    }

    if (entry.isFile() && /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      result.push(full);
    }
  }

  return result;
}

const files = [
  ...walk(path.join(root, "lib")),
  ...walk(path.join(root, "src")),
].sort();

const transportFiles = new Set(policy.transportFiles ?? []);
const directLegacy = new Map(
  (policy.legacyDirectProviderExceptions ?? []).map((item) => [
    item.path,
    item,
  ]),
);
const gatewayWrapperAllowed = new Set(
  policy.gatewayWrapperAllowedFiles ?? [],
);
const wrapperLegacy = new Map(
  (policy.legacyWrapperExceptions ?? []).map((item) => [
    item.path,
    item,
  ]),
);

const directProviderFiles = new Set();
const wrapperFiles = new Set();
const findings = [];

const runtimeImportRe =
  /(^|\n)\s*import\s+OpenAI\s+from\s+["']openai["'];?/m;
const requireOpenAiRe =
  /\brequire\s*\(\s*["']openai["']\s*\)/;
const newOpenAiRe = /\bnew\s+OpenAI\s*\(/;
const responsesRuntimeRe =
  /\.\s*responses\s*\.\s*(?:create|retrieve|cancel|delete)\s*\(/;

// Existing wrapper topology is also frozen. This catches both the usage-aware
// wrapper and the older runAiJson wrapper because both ultimately reach the
// provider transport.
const wrapperUseRe =
  /\brunAiJson(?:WithUsageMetadata)?(?:<[^>\n]+>)?\s*\(/;

for (const file of files) {
  const rel = normalizePath(file);
  const source = fs.readFileSync(file, "utf8");

  const hasDirectProvider =
    runtimeImportRe.test(source) ||
    requireOpenAiRe.test(source) ||
    newOpenAiRe.test(source) ||
    responsesRuntimeRe.test(source);

  if (hasDirectProvider) {
    directProviderFiles.add(rel);

    if (!transportFiles.has(rel) && !directLegacy.has(rel)) {
      findings.push({
        kind: "UNAPPROVED_DIRECT_PROVIDER",
        path: rel,
      });
    }
  }

  if (wrapperUseRe.test(source)) {
    wrapperFiles.add(rel);

    if (!gatewayWrapperAllowed.has(rel) && !wrapperLegacy.has(rel)) {
      findings.push({
        kind: "UNAPPROVED_PROVIDER_WRAPPER_CALL",
        path: rel,
      });
    }
  }
}

const expectedDirectFiles = new Set([
  ...transportFiles,
  ...directLegacy.keys(),
]);

for (const expected of expectedDirectFiles) {
  if (!directProviderFiles.has(expected)) {
    findings.push({
      kind: "EXPECTED_DIRECT_PROVIDER_FILE_NOT_DETECTED",
      path: expected,
    });
  }
}

for (const actual of directProviderFiles) {
  if (!expectedDirectFiles.has(actual)) {
    findings.push({
      kind: "DIRECT_PROVIDER_FILE_NOT_IN_POLICY",
      path: actual,
    });
  }
}

const expectedWrapperFiles = new Set([
  ...gatewayWrapperAllowed,
  ...wrapperLegacy.keys(),
]);

for (const expected of expectedWrapperFiles) {
  if (!wrapperFiles.has(expected)) {
    findings.push({
      kind: "EXPECTED_WRAPPER_FILE_NOT_DETECTED",
      path: expected,
    });
  }
}

for (const actual of wrapperFiles) {
  if (!expectedWrapperFiles.has(actual)) {
    findings.push({
      kind: "WRAPPER_FILE_NOT_IN_POLICY",
      path: actual,
    });
  }
}

const apiTestPath = path.join(root, "src/app/api/test/route.ts");
const apiTest = fs.readFileSync(apiTestPath, "utf8");

for (const marker of [
  "RunAiJsonUsageMetadata",
  "UsageEventRow",
  "UsageDebitSettlement",
  "calculateActualCostEur",
  "toLedgerDebitAmountEur",
  "insertUsageEvent",
  "markUsageEventDebitFailed",
  "settleAiUsageDebit",
]) {
  if (apiTest.includes(marker)) {
    findings.push({
      kind: "API_TEST_LEGACY_SETTLEMENT_REMAINS",
      path: "src/app/api/test/route.ts",
      marker,
    });
  }
}

for (const marker of [
  "calculateEstimatedCostEur",
  "buildBillingPreflight",
  "runBillableAiJson<ChatAiResponse>",
]) {
  if (!apiTest.includes(marker)) {
    findings.push({
      kind: "API_TEST_REQUIRED_GATEWAY_COMPAT_MARKER_MISSING",
      path: "src/app/api/test/route.ts",
      marker,
    });
  }
}

if (
  apiTest.includes('from "openai"') ||
  apiTest.includes("new OpenAI(") ||
  apiTest.includes(".responses.create(")
) {
  findings.push({
    kind: "API_TEST_DIRECT_PROVIDER_CALL",
    path: "src/app/api/test/route.ts",
  });
}

const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);

if (
  packageJson.scripts?.prebuild !==
  "node scripts/validate-ai-gateway-boundary.mjs"
) {
  findings.push({
    kind: "PREBUILD_GATE_MISSING",
    path: "package.json",
  });
}

if (
  packageJson.scripts?.["validate:ai-gateway-boundary"] !==
  "node scripts/validate-ai-gateway-boundary.mjs"
) {
  findings.push({
    kind: "VALIDATOR_SCRIPT_MISSING",
    path: "package.json",
  });
}

console.log(`CONTRACT=${policy.contract}`);
console.log(`SCANNED_CODE_FILES=${files.length}`);

console.log(`DIRECT_PROVIDER_FILES=${directProviderFiles.size}`);
for (const file of [...directProviderFiles].sort()) {
  if (transportFiles.has(file)) {
    console.log(`DIRECT_TRANSPORT=${file}`);
  } else {
    const exception = directLegacy.get(file);
    console.log(
      `LEGACY_DIRECT_EXCEPTION=${file}|NEXT=${exception?.nextStage ?? "UNKNOWN"}`,
    );
  }
}

console.log(`WRAPPER_FILES=${wrapperFiles.size}`);
for (const file of [...wrapperFiles].sort()) {
  if (gatewayWrapperAllowed.has(file)) {
    console.log(`WRAPPER_GATEWAY_ALLOWED=${file}`);
  } else {
    const exception = wrapperLegacy.get(file);
    console.log(
      `LEGACY_WRAPPER_EXCEPTION=${file}|NEXT=${exception?.nextStage ?? "UNKNOWN"}`,
    );
  }
}

console.log(`UNAPPROVED_BYPASS_FINDINGS=${findings.length}`);

for (const finding of findings) {
  console.error(`FAIL=${JSON.stringify(finding)}`);
}

if (findings.length > 0) {
  console.error("AI_GATEWAY_BOUNDARY_VALIDATOR=FAIL");
  process.exit(1);
}

console.log("API_TEST_LEGACY_SETTLEMENT=0");
console.log("DIRECT_PROVIDER_TOPOLOGY_FROZEN=TRUE");
console.log("WRAPPER_TOPOLOGY_FROZEN=TRUE");
console.log("AI_GATEWAY_BOUNDARY_VALIDATOR=PASS");
