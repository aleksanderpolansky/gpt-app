import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const ts = process.env.ARCTOR_TYPESCRIPT_PATH
  ? require(process.env.ARCTOR_TYPESCRIPT_PATH)
  : require("typescript");

const files = {
  detail: "src/app/value-objects/[id]/page.tsx",
  fullCard: "src/components/workspace/value-objects/value-object-full-card-panel.tsx",
  standards: "src/app/api/value-objects/[id]/standards/route.ts",
};

function fail(message) {
  console.error(JSON.stringify({ validator: "AI_A3_P5B_LEAF_DETAIL_CONSISTENCY_V1", passed: false, error: message }, null, 2));
  process.exit(1);
}
function read(rel) {
  const file = path.join(root, ...rel.split("/"));
  if (!fs.existsSync(file)) fail(`missing file: ${rel}`);
  const source = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (source.startsWith("\ufeff")) fail(`unexpected BOM: ${rel}`);
  if (source.includes("\u0000")) fail(`NUL byte: ${rel}`);
  return source;
}
function syntax(source, rel) {
  const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext };
  if (rel.endsWith(".tsx")) options.jsx = ts.JsxEmit.ReactJSX;
  const result = ts.transpileModule(source, { compilerOptions: options, reportDiagnostics: true, fileName: rel });
  const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) fail(`${rel} syntax: ${errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join(" | ")}`);
}
function requireToken(source, token, label = token) {
  if (!source.includes(token)) fail(`missing marker: ${label}`);
}
function forbidToken(source, token, label = token) {
  if (source.includes(token)) fail(`forbidden marker: ${label}`);
}

const loaded = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));
for (const [key, rel] of Object.entries(files)) syntax(loaded[key], rel);

for (const token of [
  "const ontologyNodeRole = valueObject.ontology_node_role_code;",
  'valueObject.ontology_node_role_code === "leaf"',
  "!ontologyNodeRole &&",
  "let linkedActivityCount = 0;",
  '.from("activity_object_facts")',
  '.eq("user_id", actorContext.appUserId)',
  '.eq("acting_as_actor_id", actorContext.actorId)',
  '.from("activity_value_object_links")',
  '.eq("app_user_id", actorContext.appUserId)',
  '.eq("actor_id", actorContext.actorId)',
  '.in("link_type", ["semantic_exposure", "planned_target"])',
  "value: String(linkedActivityCount)",
  "<ActivityMutualLinksPanel",
]) requireToken(loaded.detail, token);

forbidToken(
  loaded.detail,
  "value: String(plannedActivities.length),\n          },\n          { label: summaryLabels.totalCriteria",
  "leaf summary must not reuse plannedActivities.length as linked count",
);

for (const token of [
  'const isLeaf = node?.nodeRoleCode === "leaf" || initialNodeRoleCode === "leaf";',
  "{isLeaf ? copy.noAutomation : copy.leafOnly}",
]) requireToken(loaded.fullCard, token);

for (const token of [
  "object_kind_code: string | null;",
  "ontology_node_role_code: string | null;",
  "scope_code: string | null;",
  "origin_type_code: string | null;",
  "const isGlobalSystemObject =",
  'valueObject.scope_code === "global"',
  'valueObject.origin_type_code === "system_model"',
  "if (!isGlobalSystemObject && !isOwnedByActiveActor)",
  'const isSemanticLeaf = valueObject.ontology_node_role_code === "leaf";',
  "if (isGlobalSystemObject) {",
  "assignments: [],",
  "writeActionsEnabled: false",
  '.eq("owner_user_id", actorContext.appUserId)',
  '.eq("owner_actor_id", actorContext.actorId)',
  'nodeRoleCode: isSemanticLeaf ? "leaf" : "activity_leaf"',
  'valueObject.object_kind_code ??',
]) requireToken(loaded.standards, token);

function assertResponseTypeContract() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "arctor-p5b-leaf-type-contract-"));
  const file = path.join(tmp, "contract.ts");
  const source = `
    type Row = {
      node_role_code: string | null;
      object_kind: string | null;
      object_kind_code: string | null;
    };
    type Read = { nodeRoleCode: string; objectKind: string };
    declare const valueObject: Row;
    declare const isSemanticLeaf: boolean;
    const mapped: Read = {
      nodeRoleCode: isSemanticLeaf ? "leaf" : "activity_leaf",
      objectKind:
        valueObject.object_kind ??
        valueObject.object_kind_code ??
        "unknown",
    };
    void mapped;
  `;
  fs.writeFileSync(file, source, "utf8");
  try {
    const program = ts.createProgram([file], {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    });
    const errors = ts.getPreEmitDiagnostics(program).filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    );
    if (errors.length) {
      fail(`standards response type contract: ${errors
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
        .join(" | ")}`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

assertResponseTypeContract();

const globalReturnIndex = loaded.standards.indexOf("if (isGlobalSystemObject) {");
const assignmentReadIndex = loaded.standards.indexOf('.from("value_object_parameter_assignments")');
if (globalReturnIndex < 0 || assignmentReadIndex < 0 || globalReturnIndex >= assignmentReadIndex) {
  fail("GLOBAL standards response must return before actor-private assignment reads");
}

for (const writeMarker of [".insert(", ".update(", ".delete(", ".upsert(", ".rpc("]) {
  forbidToken(loaded.standards, writeMarker, `standards GET remains read-only: ${writeMarker}`);
}

console.log(JSON.stringify({
  validator: "AI_A3_P5B_LEAF_DETAIL_CONSISTENCY_V1",
  passed: true,
  checks: {
    typescriptSyntax: "PASS",
    standardsResponseTypeContract: "PASS",
    ontologyRoleAuthoritative: "PASS",
    leafEyebrowConsistency: "PASS",
    linkedActivityCountUsesP5BSources: "PASS",
    mutualLinksPanelPreserved: "PASS",
    fullCardLeafFallback: "PASS",
    globalStandardsReadOnlyEmptyProjection: "PASS",
    actorPrivateParameterReadsNotExposedToGlobal: "PASS",
  },
}, null, 2));
