import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const policyPath = path.join(root, "config/ai-provider-boundary.json");

if (!fs.existsSync(policyPath)) {
  throw new Error("AI_PROVIDER_BOUNDARY_POLICY_MISSING");
}

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));

if (policy.contract !== "ARCTOR_AI_PROVIDER_BOUNDARY_B2_4_V1_3") {
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

const fileByRelativePath = new Map(
  files.map((file) => [normalizePath(file), file]),
);
const codeFileSet = new Set(fileByRelativePath.keys());

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
const backgroundProviderWrapperAllowed = new Set(
  policy.backgroundProviderWrapperAllowedFiles ?? [],
);
const wrapperLegacy = new Map(
  (policy.legacyWrapperExceptions ?? []).map((item) => [
    item.path,
    item,
  ]),
);

const directProviderFiles = new Set();
const wrapperFiles = new Set();
const backgroundProviderWrapperFiles = new Set();
const findings = [];

const runtimeImportRe =
  /(^|\n)\s*import\s+OpenAI\s+from\s+["']openai["'];?/m;
const requireOpenAiRe =
  /\brequire\s*\(\s*["']openai["']\s*\)/;
const newOpenAiRe = /\bnew\s+OpenAI\s*\(/;
const responsesRuntimeRe =
  /\.\s*responses\s*\.\s*(?:create|retrieve|cancel|delete)\s*\(/;

// Existing synchronous wrapper topology is frozen.
const wrapperUseRe =
  /\brunAiJson(?:WithUsageMetadata)?(?:<[^>\n]+>)?\s*\(/;

// Background provider transport is intentionally separate from the synchronous
// JSON wrapper. Only the central background billing gateway may call these
// provider transport helpers.
const openAiClientImportRe =
  /\bfrom\s+["'][^"']*openaiClient["']/;
const backgroundProviderSymbolRe =
  /\b(?:createAiBackgroundResponse|retrieveAiBackgroundResponse|cancelAiBackgroundResponse)\b/;

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

  const hasBackgroundProviderWrapper =
    !transportFiles.has(rel) &&
    openAiClientImportRe.test(source) &&
    backgroundProviderSymbolRe.test(source);

  if (hasBackgroundProviderWrapper) {
    backgroundProviderWrapperFiles.add(rel);

    if (!backgroundProviderWrapperAllowed.has(rel)) {
      findings.push({
        kind: "UNAPPROVED_BACKGROUND_PROVIDER_WRAPPER_CALL",
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

for (const expected of backgroundProviderWrapperAllowed) {
  if (!backgroundProviderWrapperFiles.has(expected)) {
    findings.push({
      kind: "EXPECTED_BACKGROUND_PROVIDER_WRAPPER_FILE_NOT_DETECTED",
      path: expected,
    });
  }
}

for (const actual of backgroundProviderWrapperFiles) {
  if (!backgroundProviderWrapperAllowed.has(actual)) {
    findings.push({
      kind: "BACKGROUND_PROVIDER_WRAPPER_FILE_NOT_IN_POLICY",
      path: actual,
    });
  }
}

// ---------------------------------------------------------------------------
// API route reachability gate.
//
// Dormant legacy wrappers may remain in source temporarily, but no active API
// route may import/reach them. This converts "dormant/deferred" from a comment
// into an enforced invariant.
// ---------------------------------------------------------------------------

function importSpecs(source) {
  const specs = new Set();

  for (const match of source.matchAll(
    /\bimport\s+(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g,
  )) {
    specs.add(match[1]);
  }

  for (const match of source.matchAll(
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  )) {
    specs.add(match[1]);
  }

  for (const match of source.matchAll(
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  )) {
    specs.add(match[1]);
  }

  return [...specs];
}

function resolveInternalImport(fromRel, spec) {
  if (!spec) return null;

  let baseRel = null;

  if (spec.startsWith("@/")) {
    baseRel = `src/${spec.slice(2)}`;
  } else if (spec.startsWith(".")) {
    baseRel = path
      .relative(
        root,
        path.resolve(
          path.dirname(path.join(root, fromRel)),
          spec,
        ),
      )
      .replaceAll("\\", "/");
  } else {
    return null;
  }

  const candidates = [
    baseRel,
    `${baseRel}.ts`,
    `${baseRel}.tsx`,
    `${baseRel}.js`,
    `${baseRel}.jsx`,
    `${baseRel}.mjs`,
    `${baseRel}.cjs`,
    `${baseRel}/index.ts`,
    `${baseRel}/index.tsx`,
    `${baseRel}/index.js`,
    `${baseRel}/index.jsx`,
    `${baseRel}/index.mjs`,
    `${baseRel}/index.cjs`,
  ];

  return candidates.find((candidate) => codeFileSet.has(candidate)) ?? null;
}

const importGraph = new Map();

for (const [rel, file] of fileByRelativePath.entries()) {
  const source = fs.readFileSync(file, "utf8");
  const deps = new Set();

  for (const spec of importSpecs(source)) {
    const resolved = resolveInternalImport(rel, spec);
    if (resolved) deps.add(resolved);
  }

  importGraph.set(rel, [...deps]);
}

function reachableFrom(start) {
  const seen = new Set();
  const stack = [start];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || seen.has(current)) continue;

    seen.add(current);

    for (const dep of importGraph.get(current) ?? []) {
      if (!seen.has(dep)) stack.push(dep);
    }
  }

  return seen;
}

const apiRoutes = [...codeFileSet]
  .filter(
    (rel) =>
      rel.startsWith("src/app/api/") &&
      /\/route\.(?:ts|tsx|js|jsx)$/.test(rel),
  )
  .sort();

const legacyRouteReachability = [];

for (const route of apiRoutes) {
  const reachable = reachableFrom(route);

  for (const [legacyPath, exception] of wrapperLegacy.entries()) {
    if (!reachable.has(legacyPath)) continue;

    legacyRouteReachability.push({
      route,
      legacyPath,
      exception,
    });

    findings.push({
      kind: "API_ROUTE_REACHES_LEGACY_WRAPPER_EXCEPTION",
      path: route,
      legacyPath,
    });
  }
}

for (const [legacyPath, exception] of wrapperLegacy.entries()) {
  if (exception?.status !== "dormant_deferred") {
    findings.push({
      kind: "LEGACY_WRAPPER_EXCEPTION_NOT_MARKED_DORMANT",
      path: legacyPath,
    });
  }

  const activeRouteCallers = legacyRouteReachability.filter(
    (row) => row.legacyPath === legacyPath,
  );

  if (activeRouteCallers.length > 0) {
    findings.push({
      kind: "DORMANT_LEGACY_WRAPPER_HAS_ACTIVE_API_CALLER",
      path: legacyPath,
      callers: activeRouteCallers.map((row) => row.route),
    });
  }
}

// ---------------------------------------------------------------------------
// Existing /api/test anti-regression checks.
// ---------------------------------------------------------------------------

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
      `LEGACY_WRAPPER_EXCEPTION=${file}|STATUS=${exception?.status ?? "UNKNOWN"}|NEXT=${exception?.nextStage ?? "UNKNOWN"}`,
    );
  }
}

console.log(
  `BACKGROUND_PROVIDER_WRAPPER_FILES=${backgroundProviderWrapperFiles.size}`,
);
for (const file of [...backgroundProviderWrapperFiles].sort()) {
  console.log(`BACKGROUND_PROVIDER_GATEWAY_ALLOWED=${file}`);
}

console.log(`API_ROUTE_COUNT=${apiRoutes.length}`);
console.log(
  `API_ROUTES_REACHING_LEGACY_EXCEPTION=${legacyRouteReachability.length}`,
);

for (const [legacyPath] of wrapperLegacy.entries()) {
  const callers = legacyRouteReachability
    .filter((row) => row.legacyPath === legacyPath)
    .map((row) => row.route);

  console.log(
    `DORMANT_EXCEPTION=${legacyPath}|ACTIVE_API_ROUTE_CALLERS=${callers.length}|CALLERS=${callers.join(",") || "NONE"}`,
  );
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
console.log("SYNC_WRAPPER_TOPOLOGY_FROZEN=TRUE");
console.log("BACKGROUND_PROVIDER_TOPOLOGY_FROZEN=TRUE");
console.log("DORMANT_LEGACY_WRAPPERS_HAVE_ACTIVE_API_CALLERS=FALSE");
console.log("AI_GATEWAY_BOUNDARY_VALIDATOR=PASS");
