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
  const targetPath = path.join(rootDir, "lib", "activity", "valueObjectBridge.ts");
  const resultPath = path.join(
    rootDir,
    "docs",
    "value-objects",
    "category-derivation-bridge-c8-p3-b3-transpile-result.json",
  );

  if (!fs.existsSync(targetPath)) {
    console.error(`Target file not found: ${targetPath}`);
    process.exit(1);
  }

  const source = fs.readFileSync(targetPath, "utf8");

  const requiredPatterns = [
    "async function createAdditionalValueObjectCategoryLinks",
    "additionalCategoryLinks,",
    "const additionalCategoryLinksResult =",
    "await createAdditionalValueObjectCategoryLinks({",
    "createdItem.additionalValueObjectCategoryLinks",
    "createdItem.additionalValueObjectCategoryLinkErrors",
    "C8-P3-B3 additional value_object_category_links warnings",
    "additionalValueObjectCategoryLinks: []",
    "additionalValueObjectCategoryLinkErrors: []",
  ];

  const missingPatterns = requiredPatterns.filter((pattern) => !source.includes(pattern));

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
    ok: diagnostics.length === 0 && missingPatterns.length === 0,
    checkId: "P4.10.0-C8-P3-B3",
    checkedAt: new Date().toISOString(),
    targetPath: path.relative(rootDir, targetPath),
    emittedJsLength: transpiled.outputText.length,
    diagnosticsCount: diagnostics.length,
    missingPatterns,
    diagnostics: diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      category: ts.DiagnosticCategory[diagnostic.category],
      message:
        typeof diagnostic.messageText === "string"
          ? diagnostic.messageText
          : diagnostic.messageText.messageText,
    })),
    note:
      "Targeted transpile/pattern smoke check for calling additionalCategoryLinks helper from the bridge loop.",
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("P4.10.0-C8-P3-B3 — valueObjectBridge loop-call transpile smoke check");
  console.log("");
  console.log(`Target: ${path.relative(rootDir, targetPath)}`);
  console.log(`Diagnostics: ${diagnostics.length}`);
  console.log(`Missing patterns: ${missingPatterns.length}`);
  console.log(`Result JSON: ${path.relative(rootDir, resultPath)}`);

  if (!output.ok) {
    console.error("");
    console.error("FAILED:");
    console.error(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  console.log("");
  console.log("RESULT: PASS — additionalCategoryLinks helper is called from bridge loop and transpiles.");
}

main();