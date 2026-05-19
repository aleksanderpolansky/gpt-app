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
    "category-derivation-bridge-c8-p3-b2-transpile-result.json",
  );

  if (!fs.existsSync(targetPath)) {
    console.error(`Target file not found: ${targetPath}`);
    process.exit(1);
  }

  const source = fs.readFileSync(targetPath, "utf8");

  const requiredPatterns = [
    "function isAdditionalCategoryLinkMetadataRecord",
    "async function createAdditionalValueObjectCategoryLinks",
    "runtime_category_link_from_additional_category_links",
    "sourceLayer: \"category_derivation\"",
    "sourceProcessor: \"category_derivation_rule_extractor\"",
    "onConflict: \"value_object_id,category_table,category_id,category_role\"",
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
    checkId: "P4.10.0-C8-P3-B2",
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
      "This is a targeted transpile/pattern smoke check for the additive additionalCategoryLinks runtime helper.",
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("P4.10.0-C8-P3-B2 — valueObjectBridge helper transpile smoke check");
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
  console.log("RESULT: PASS — additionalCategoryLinks helper is present and transpiles.");
}

main();