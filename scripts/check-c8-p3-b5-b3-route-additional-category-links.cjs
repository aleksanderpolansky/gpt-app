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
    "src",
    "app",
    "api",
    "activity",
    "debug",
    "free-text-value-object-test",
    "route.ts",
  );
  const resultPath = path.join(
    rootDir,
    "docs",
    "value-objects",
    "category-derivation-route-c8-p3-b5-b3-transpile-result.json",
  );

  const source = fs.readFileSync(targetPath, "utf8");

  const requiredPatterns = [
    "type AdditionalValueObjectCategoryLink",
    "function buildAdditionalCategoryLinksForBridge",
    "collectPossibleResolvedCandidates",
    "collectPossibleDerivationRows",
    "categoryDerivationBridgeAdditionalCategoryLinks",
    "additionalCategoryLinks: categoryDerivationBridgeAdditionalCategoryLinks",
    "categoryDerivationDryRun: categoryDerivationOptions.dryRun",
    "sourceRoute: \"/api/activity/debug/free-text-value-object-test\"",
    "p4Step: \"P4.10.0-C8-P3-B5-B3\"",
  ];

  const missingPatterns = requiredPatterns.filter((pattern) => !source.includes(pattern));

  const failedChecks = [];

  if (!source.includes("categoryDerivationEnabled: categoryDerivationOptions.enabled")) {
    failedChecks.push("helper call does not use categoryDerivationOptions.enabled");
  }

  if (!source.includes("categoryDerivationDryRun: categoryDerivationOptions.dryRun")) {
    failedChecks.push("helper call does not use categoryDerivationOptions.dryRun");
  }

  const callStart = source.indexOf("processActivityValueObjectBridge({");
  const callEnd = callStart >= 0 ? source.indexOf("});", callStart) : -1;
  const callBlock =
    callStart >= 0 && callEnd > callStart ? source.slice(callStart, callEnd) : "";

  if (!callBlock.includes("additionalCategoryLinks: categoryDerivationBridgeAdditionalCategoryLinks")) {
    failedChecks.push("bridge call does not pass additionalCategoryLinks");
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
    checkId: "P4.10.0-C8-P3-B5-B3",
    checkedAt: new Date().toISOString(),
    targetPath: path.relative(rootDir, targetPath),
    diagnosticsCount: diagnostics.length,
    missingPatterns,
    failedChecks,
    callBlockLength: callBlock.length,
    diagnostics: diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      category: ts.DiagnosticCategory[diagnostic.category],
      message:
        typeof diagnostic.messageText === "string"
          ? diagnostic.messageText
          : diagnostic.messageText.messageText,
    })),
    note:
      "Targeted route smoke check for passing resolved Category Derivation candidates into additionalCategoryLinks.",
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("P4.10.0-C8-P3-B5-B3 — route additionalCategoryLinks smoke check");
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
  console.log("RESULT: PASS — route passes Category Derivation additionalCategoryLinks and transpiles.");
}

main();