import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const repo = process.cwd();

const coreRel =
  "src/lib/reality-core/measurement-rollup-target-metadata-v1.ts";
const apiRel =
  "src/app/api/admin/value-objects/[id]/measurement-rollup/route.ts";
const componentRel =
  "src/components/workspace/value-objects/value-object-measurement-rollup-manager.tsx";
const pageRel = "src/app/value-objects/[id]/page.tsx";
const docRel =
  "docs/architecture/measurement-rollup-target-authoring-v1.md";

function read(rel) {
  return fs
    .readFileSync(path.join(repo, ...rel.split("/")), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function check(label, condition, checks) {
  checks.push([label, Boolean(condition)]);
}

const checks = [];

for (const rel of [coreRel, apiRel, componentRel, pageRel, docRel]) {
  check(`file exists ${rel}`, fs.existsSync(path.join(repo, ...rel.split("/"))), checks);
}

const core = read(coreRel);
const api = read(apiRel);
const component = read(componentRel);
const page = read(pageRel);
const doc = read(docRel);

check(
  "metadata key is measurementRollupV1",
  core.includes('"measurementRollupV1"'),
  checks,
);
check(
  "ordinary leaf is represented by absence of metadata",
  core.includes("return null") &&
    doc.includes("ordinary leaf requires no stored rollup role"),
  checks,
);
check(
  "only target stores rollup semantics",
  doc.includes("Source leaves are not marked as component"),
  checks,
);
check(
  "universal parameter preserved",
  doc.includes("Parameters remain universal"),
  checks,
);
check(
  "admin guard present",
  api.includes("requirePlatformAdmin") &&
    api.includes("platformAdminErrorResponse"),
  checks,
);
check(
  "global system leaf guard present",
  api.includes('row.scope_code === "global"') &&
    api.includes('row.origin_type_code === "system_model"') &&
    api.includes('row.ontology_node_role_code === "leaf"'),
  checks,
);
check(
  "same-level candidate constraint present",
  api.includes(".eq(\"parent_value_object_id\", target.parent_value_object_id)") &&
    api.includes(".eq(\"root_value_object_id\", target.root_value_object_id)"),
  checks,
);
check(
  "numeric system parameter constraint present",
  api.includes('.eq("scope_code", "system")') &&
    api.includes('.eq("value_type_code", "numeric")'),
  checks,
);
check(
  "fixed policies are sum all direct-preferred unknown",
  api.includes('operator: "sum"') &&
    api.includes('requiredComponentPolicy: "all"') &&
    api.includes('directValuePolicy: "prefer_direct"') &&
    api.includes('missingValuePolicy: "unknown"'),
  checks,
);
check(
  "optimistic concurrency guard present",
  api.includes('updateQuery.eq("updated_at", target.updated_at)') &&
    api.includes("ROLLUP_TARGET_CONCURRENT_UPDATE"),
  checks,
);
check(
  "no DB schema mutation",
  !/\bcreate\s+table\b|\balter\s+table\b|\bdrop\s+table\b/i.test(
    core + "\n" + api + "\n" + component,
  ),
  checks,
);
check(
  "component has seven UI locales",
  ["en:", "pl:", "ru:", "uk:", "de:", "es:", "cs:"].every((token) =>
    component.includes(token),
  ),
  checks,
);
check(
  "component has no independent/component role selector",
  !component.includes('value="component"') &&
    !component.includes('value="independent"'),
  checks,
);
check(
  "page import installed",
  page.includes("ValueObjectMeasurementRollupManager"),
  checks,
);
check(
  "page renders manager only for global system leaf admin",
  page.includes(
    "isGlobalSystemObject && isLeaf && canManageRelations",
  ),
  checks,
);
check(
  "authoring is separate from analytics runtime",
  doc.includes("does not yet make analytics consume the stored rule"),
  checks,
);

let ts;
try {
  const require = createRequire(import.meta.url);
  let resolved;
  try {
    resolved = require.resolve("typescript", { paths: [repo] });
  } catch {
    resolved = require.resolve("typescript");
  }
  ts = require(resolved);
  console.log(`PASS typescript resolved ${ts.version}`);
} catch (error) {
  console.error(error);
  process.exit(1);
}

for (const [rel, source] of [
  [coreRel, core],
  [apiRel, api],
  [componentRel, component],
]) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
    fileName: rel,
    transformers: undefined,
  });

  const errors = (result.diagnostics ?? []).filter(
    (item) => item.category === ts.DiagnosticCategory.Error,
  );
  check(`transpile diagnostics ${rel}`, errors.length === 0, checks);
}

const tempDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "arctor-rollup-target-validator-"),
);
try {
  const contractRel =
    "src/lib/reality-core/measurement-rollup-contract-v1.ts";
  const contract = read(contractRel);

  const transpile = (rel, source) =>
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        strict: true,
        esModuleInterop: true,
      },
      fileName: rel,
    }).outputText;

  const contractCjs = path.join(tempDir, "measurement-rollup-contract-v1.cjs");
  const coreCjs = path.join(
    tempDir,
    "measurement-rollup-target-metadata-v1.cjs",
  );

  fs.writeFileSync(contractCjs, transpile(contractRel, contract), "utf8");

  const rewrittenCore = core.replace(
    /from "@\/lib\/reality-core\/measurement-rollup-contract-v1"/g,
    'from "./measurement-rollup-contract-v1.cjs"',
  );
  fs.writeFileSync(coreCjs, transpile(coreRel, rewrittenCore), "utf8");

  const require = createRequire(import.meta.url);
  const mod = require(coreCjs);
  const self = mod.runMeasurementRollupTargetMetadataSelfTestV1();
  check(
    "runtime metadata self-test 6/6",
    self?.passed === 6 && self?.total === 6,
    checks,
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

let passed = 0;
for (const [label, ok] of checks) {
  if (ok) {
    console.log(`PASS ${label}`);
    passed += 1;
  } else {
    console.error(`FAIL ${label}`);
  }
}

if (passed !== checks.length) {
  console.error(`VALIDATOR=FAIL_${passed}_${checks.length}`);
  process.exit(1);
}

console.log(`VALIDATOR=PASS_${checks.length}_${checks.length}`);
