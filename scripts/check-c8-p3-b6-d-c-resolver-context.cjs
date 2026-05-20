const fs = require("node:fs");
const path = require("node:path");

function main() {
  let ts;

  try {
    ts = require("typescript");
  } catch (error) {
    console.error("The local typescript package is required for this check.");
    process.exit(1);
  }

  const rootDir = process.cwd();
  const targetPath = path.join(
    rootDir,
    "lib",
    "activity",
    "categoryDerivation",
    "resolver.ts",
  );
  const resultPath = path.join(
    rootDir,
    "docs",
    "value-objects",
    "category-derivation-resolver-c8-p3-b6-d-c-transpile-result.json",
  );

  const source = fs.readFileSync(targetPath, "utf8");

  const requiredPatterns = [
    "DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE = \"personal_activity\"",
    "function findDefaultCategoryDerivationContextId",
    ".from<ContextRow>(\"contexts\")",
    ".eq(\"code\", DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE)",
    ".eq(\"is_active\", true)",
    "contextId?: string | null",
    ".eq(\"context_id\", contextId)",
    "context_id: contextId",
    "const defaultContextResult =",
    "const defaultContextId = defaultContextResult.contextId",
    "missingContextCode: DEFAULT_CATEGORY_DERIVATION_CONTEXT_CODE",
    "createContextualCategory(",
    "defaultContextId,",
  ];

  const missingPatterns = requiredPatterns.filter((pattern) => !source.includes(pattern));

  const failedChecks = [];

  const payloadStart = source.indexOf("const payload = {");
  const payloadEnd = payloadStart >= 0 ? source.indexOf("};", payloadStart) : -1;
  const payloadBlock =
    payloadStart >= 0 && payloadEnd > payloadStart
      ? source.slice(payloadStart, payloadEnd)
      : "";

  if (!payloadBlock.includes("context_id: contextId")) {
    failedChecks.push("create payload does not include context_id: contextId");
  }

  const findExistingStart = source.indexOf("async function findExistingCategory");
  const findExistingEnd =
    findExistingStart >= 0
      ? source.indexOf("function shouldCreateCategory", findExistingStart)
      : -1;
  const findExistingBlock =
    findExistingStart >= 0 && findExistingEnd > findExistingStart
      ? source.slice(findExistingStart, findExistingEnd)
      : "";

  if (!findExistingBlock.includes(".eq(\"context_id\", contextId)")) {
    failedChecks.push("findExistingCategory is not context-aware");
  }

  if (!source.includes("await findDefaultCategoryDerivationContextId(supabase)")) {
    failedChecks.push("resolver does not call default context lookup");
  }

  if (!source.includes("Cannot create contextual category without default context")) {
    failedChecks.push("resolver does not guard missing default context before create");
  }

  const transpiled = ts.transpileModule(source, {
    fileName: targetPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
    },
    reportDiagnostics: true,
  });

  const diagnostics = transpiled.diagnostics || [];

  const output = {
    ok: diagnostics.length === 0 && missingPatterns.length === 0 && failedChecks.length === 0,
    checkId: "P4.10.0-C8-P3-B6-D-C",
    checkedAt: new Date().toISOString(),
    targetPath: path.relative(rootDir, targetPath),
    diagnosticsCount: diagnostics.length,
    missingPatterns,
    failedChecks,
    payloadBlockLength: payloadBlock.length,
    findExistingBlockLength: findExistingBlock.length,
    diagnostics: diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      category: ts.DiagnosticCategory[diagnostic.category],
      message:
        typeof diagnostic.messageText === "string"
          ? diagnostic.messageText
          : diagnostic.messageText.messageText,
    })),
    note:
      "Checks resolver default personal_activity context lookup, context-aware category lookup, and contextual_categories insert context_id.",
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("P4.10.0-C8-P3-B6-D-C — resolver context smoke check");
  console.log("");
  console.log(`Target: ${path.relative(rootDir, targetPath)}`);
  console.log(`Diagnostics: ${diagnostics.length}`);
  console.log(`Missing patterns: ${missingPatterns.length}`);
  console.log(`Failed checks: ${failedChecks.length}`);
  console.log(`Result JSON: ${path.relative(rootDir, resultPath)}`);

  if (!output.ok) {
    console.error("");
    console.error("FAILED:");
    console.error(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  console.log("");
  console.log("RESULT: PASS — resolver uses personal_activity context for contextual_categories creation.");
}

main();