import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const ts = process.env.ARCTOR_TYPESCRIPT_PATH
  ? require(process.env.ARCTOR_TYPESCRIPT_PATH)
  : require("typescript");

const FILES = {
  ontology: "src/app/api/value-objects/ontology/[id]/route.ts",
  aliases: "src/app/api/value-objects/[id]/aliases/route.ts",
  relations: "src/app/api/value-objects/[id]/relations/route.ts",
  panel: "src/components/workspace/value-objects/value-object-full-card-panel.tsx",
};

function fail(message) {
  throw new Error(
    `AI_A3_P5B_GLOBAL_FULL_CARD_READ_SCOPE_V1_FAILED: ${message}`,
  );
}

function read(rel) {
  const file = path.join(ROOT, ...rel.split("/"));
  if (!fs.existsSync(file)) fail(`missing file: ${rel}`);
  const source = fs
    .readFileSync(file, "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  if (source.includes("\u0000")) fail(`NUL byte: ${rel}`);
  return source;
}

function syntax(source, rel) {
  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  };
  if (rel.endsWith(".tsx")) {
    options.jsx = ts.JsxEmit.ReactJSX;
  }
  const result = ts.transpileModule(source, {
    compilerOptions: options,
    reportDiagnostics: true,
    fileName: rel,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    fail(
      `${rel} syntax: ${errors
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
        )
        .join(" | ")}`,
    );
  }
}

function requireToken(source, token, label = token) {
  if (!source.includes(token)) fail(`missing marker ${label}`);
}

function forbidToken(source, token, label = token) {
  if (source.includes(token)) fail(`forbidden marker ${label}`);
}

const loaded = Object.fromEntries(
  Object.entries(FILES).map(([key, rel]) => [key, read(rel)]),
);
for (const [key, rel] of Object.entries(FILES)) {
  syntax(loaded[key], rel);
}

for (const marker of [
  "readGlobalSystemOntologyCard",
  'row.scope_code === "global"',
  'row.origin_type_code === "system_model"',
  'row.status === "active"',
  "localizeGlobalSystemValueObject",
  "allowedLifecycleActions: []",
  '"get_value_object_ontology_card_v1"',
  "p_owner_user_id: actorContext.appUserId",
  "p_owner_actor_id: actorContext.actorId",
]) {
  requireToken(loaded.ontology, marker, `ontology ${marker}`);
}
requireToken(
  loaded.ontology,
  "if (globalRead.handled) {\n    return globalRead.response;\n  }",
  "ontology GLOBAL branch precedes actor RPC",
);

for (const marker of [
  "readGlobalSystemAliasProfile",
  'row.scope_code === "global"',
  'row.origin_type_code === "system_model"',
  'row.status === "active"',
  '.from("concept_aliases")',
  'aliasLocale === null || aliasLocale === locale',
  "canManageAliases: false",
  "actorOwner: false",
  '"get_value_object_alias_profile_v1"',
  '"manage_value_object_alias_v1"',
]) {
  requireToken(loaded.aliases, marker, `aliases ${marker}`);
}
requireToken(
  loaded.aliases,
  "export async function PATCH(request: Request, context: RouteContext)",
  "alias write route retained",
);
requireToken(
  loaded.aliases,
  "p_owner_user_id: actorContext.appUserId",
  "alias owner guard retained",
);

for (const marker of [
  "readGlobalSystemValueObject",
  '.eq("scope_code", "global")',
  '.eq("origin_type_code", "system_model")',
  '.eq("status", "active")',
  "relationTypes: []",
  "candidates: []",
  "relations: []",
  '"X-ARCTor-Read-Scope": "global-system-read-only"',
  "readOwnedValueObject",
  '"create_or_reactivate_value_object_relation_v1"',
]) {
  requireToken(loaded.relations, marker, `relations ${marker}`);
}
requireToken(
  loaded.relations,
  "export async function POST(request: Request, context: RouteContext)",
  "relation write route retained",
);
requireToken(
  loaded.relations,
  "const { data: sourceValueObject, error: sourceError } =\n    await readOwnedValueObject(sourceValueObjectId, actorContext);",
  "relation POST owner guard retained",
);
forbidToken(
  loaded.relations,
  'X-ARCTor-Read-Scope": "global-system-write',
  "no GLOBAL write scope",
);

for (const marker of [
  "/api/value-objects/ontology/${encodeURIComponent(",
  "}/aliases?locale=${encodeURIComponent(locale)}`",
  "}/relations?locale=${encodeURIComponent(locale)}`",
  "}, [valueObjectId, locale]);",
]) {
  requireToken(loaded.panel, marker, `panel ${marker}`);
}
if ((loaded.panel.match(/locale=\$\{encodeURIComponent\(locale\)\}/g) ?? []).length < 3) {
  fail("panel locale query parameter missing from one or more GLOBAL full-card reads");
}

const panelEffectStart = loaded.panel.indexOf("useEffect(() => {");
const panelEffectEnd = loaded.panel.indexOf(
  "const activeAliases = useMemo",
  panelEffectStart,
);
if (panelEffectStart < 0 || panelEffectEnd < 0) {
  fail("panel read effect boundaries not found");
}
const panelReadEffect = loaded.panel.slice(panelEffectStart, panelEffectEnd);
for (const endpoint of ["ontology", "aliases", "relations"]) {
  if (!panelReadEffect.includes(endpoint)) {
    fail(`panel read effect missing ${endpoint}`);
  }
}
if (!panelReadEffect.includes("locale")) {
  fail("panel read effect is not locale-aware");
}

console.log(
  JSON.stringify(
    {
      validator: "AI_A3_P5B_GLOBAL_FULL_CARD_READ_SCOPE_V1",
      passed: true,
      checks: {
        typescriptSyntax: "PASS",
        globalOntologyRead: "PASS",
        globalAliasRead: "PASS",
        localeAwareAliases: "PASS",
        globalRelationsReadOnly: "PASS",
        actorOntologyRpcPreserved: "PASS",
        actorAliasMutationPreserved: "PASS",
        actorRelationMutationPreserved: "PASS",
        panelLocaleRefresh: "PASS",
      },
    },
    null,
    2,
  ),
);
