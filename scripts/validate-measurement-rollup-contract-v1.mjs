import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const repo = process.cwd();
const coreRel = "src/lib/reality-core/measurement-rollup-contract-v1.ts";
const fixtureRel = "src/data/night-sleep-measurement-rollup-v1.ts";
const docRel = "docs/architecture/measurement-rollup-contract-v1.md";

function read(rel) {
  return fs.readFileSync(path.join(repo, ...rel.split("/")), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function pass(label) {
  console.log(`PASS ${label}`);
}

function fail(label) {
  console.error(`FAIL ${label}`);
}

const checks = [];
function check(label, condition) {
  checks.push([label, Boolean(condition)]);
}

for (const rel of [coreRel, fixtureRel, docRel]) {
  check(`file exists ${rel}`, fs.existsSync(path.join(repo, ...rel.split("/"))));
}

const core = read(coreRel);
const fixture = read(fixtureRel);
const doc = read(docRel);

check("contract marker", core.includes("ARCTOR_MEASUREMENT_ROLLUP_CONTRACT_V1"));
check("universal parameter documented", fixture.includes('parameterCode: "duration"'));
check("rollup target role", core.includes('"rollup_target"'));
check("missing means unknown", core.includes('"unknown"') && doc.includes("Missing means UNKNOWN"));
check("double count protection", core.includes("doubleCountProtection: true") && doc.includes("never summed together"));
check("same event guard", core.includes("sameActivityEventRequired: true"));
check("same bundle guard", core.includes("sameMeasurementBundleRequired: true"));
check("direct preferred", core.includes('"prefer_direct"'));
check("discrepancy flag", core.includes('"discrepancy"') && core.includes('"flag"'));
check("sleep target id", fixture.includes("84d2f41f-4068-518a-b9d9-047b0d0e0762"));
check("light component id", fixture.includes("607c0db7-d29d-5b5f-89a4-8317bb37fc62"));
check("deep component id", fixture.includes("45d472b0-88fe-5642-b7d0-cbe2502c4ca9"));
check("rem component id", fixture.includes("a620cf08-9cdb-5c7a-b428-721f356e2d8e"));
check("no sleep-specific parameter proliferation", !fixture.includes("light_sleep_duration_parameter") && !fixture.includes("deep_sleep_duration_parameter"));
check("no Supabase writes in contract", !/\.from\s*\(|\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(|\.rpc\s*\(/.test(core + "\n" + fixture));
check("no DB schema mutation in docs", !/\bcreate\s+table\b|\balter\s+table\b/i.test(core + "\n" + fixture));

let ts;
try {
  const require = createRequire(import.meta.url);
  let tsPath;
  try {
    tsPath = require.resolve("typescript", { paths: [repo] });
  } catch {
    tsPath = require.resolve("typescript");
  }
  ts = require(tsPath);
  pass(`typescript resolved ${ts.version}`);
} catch (error) {
  console.error(error);
  process.exit(1);
}

const transpiled = ts.transpileModule(core, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    strict: true,
    esModuleInterop: true,
  },
  reportDiagnostics: true,
  fileName: coreRel,
});

const diagnostics = (transpiled.diagnostics ?? [])
  .filter((item) => item.category === ts.DiagnosticCategory.Error);

check("core transpile diagnostics", diagnostics.length === 0);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "arctor-rollup-validator-"));
try {
  const cjs = path.join(tempDir, "measurement-rollup-contract-v1.cjs");
  fs.writeFileSync(cjs, transpiled.outputText, "utf8");
  const require = createRequire(import.meta.url);
  const mod = require(cjs);
  const self = mod.runMeasurementRollupSelfTestV1();
  check("runtime self-test 10/10", self?.passed === 10 && self?.total === 10);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

let passed = 0;
for (const [label, ok] of checks) {
  if (ok) {
    pass(label);
    passed += 1;
  } else {
    fail(label);
  }
}

if (passed !== checks.length) {
  console.error(`VALIDATOR=FAIL_${passed}_${checks.length}`);
  process.exit(1);
}

console.log(`VALIDATOR=PASS_${checks.length}_${checks.length}`);
