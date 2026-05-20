const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function main() {
  const rootDir = process.cwd();
  const targetPath = path.join(rootDir, "lib", "activity", "categoryDerivation", "resolver.ts");
  const resultPath = path.join(
    rootDir,
    "docs",
    "value-objects",
    "category-derivation-resolver-c8-p3-b6-d-c-retry-result.json",
  );

  const source = fs.readFileSync(targetPath, "utf8");

  const requiredPatterns = [
    "DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE = \"personal_activity\"",
    "function findDefaultCategoryDerivationContextId",
    "function normalizeContextualCategorySourceType",
    ".from<ContextRow>(\"contexts\")",
    ".eq(\"code\", DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE)",
    ".eq(\"is_active\", true)",
    "contextId?: string | null",
    ".eq(\"context_id\", contextId)",
    "context_id: contextId",
    "normalizeContextualCategorySourceType(options.sourceType)",
    "const defaultContextResult =",
    "const defaultContextId = defaultContextResult.contextId",
    "Cannot create contextual category without default context",
    "missingContextCode: DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE",
    "defaultContextId,",
  ];

  const forbiddenPatterns = [
    "context_id: contextId,tegoryCandidate",
    ");import type",
    "source_type: options.sourceType ?? \"ai_suggested\"",
    "source_type: options.sourceType,",
  ];

  const missingPatterns = requiredPatterns.filter((pattern) => !source.includes(pattern));
  const forbiddenFound = forbiddenPatterns.filter((pattern) => source.includes(pattern));
  const failedChecks = [];

  if (!source.trimStart().startsWith("import type {")) {
    failedChecks.push("resolver does not start with import type");
  }

  const diagnostics = ts.transpileModule(source, {
    fileName: targetPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
    },
    reportDiagnostics: true,
  }).diagnostics || [];

  const output = {
    ok:
      diagnostics.length === 0 &&
      missingPatterns.length === 0 &&
      forbiddenFound.length === 0 &&
      failedChecks.length === 0,
    checkId: "P4.10.0-C8-P3-B6-D-C-retry-check",
    checkedAt: new Date().toISOString(),
    targetPath: path.relative(rootDir, targetPath),
    diagnosticsCount: diagnostics.length,
    missingPatterns,
    forbiddenFound,
    failedChecks,
    diagnostics: diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      category: ts.DiagnosticCategory[diagnostic.category],
      message:
        typeof diagnostic.messageText === "string"
          ? diagnostic.messageText
          : diagnostic.messageText.messageText,
    })),
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("P4.10.0-C8-P3-B6-D-C-retry — resolver check");
  console.log(`Diagnostics: ${diagnostics.length}`);
  console.log(`Missing patterns: ${missingPatterns.length}`);
  console.log(`Forbidden found: ${forbiddenFound.length}`);
  console.log(`Failed checks: ${failedChecks.length}`);
  console.log(`Result JSON: ${path.relative(rootDir, resultPath)}`);

  if (!output.ok) {
    console.error(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  console.log("RESULT: PASS — resolver context patch is syntactically safe.");
}

main();