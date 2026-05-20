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
    "category-derivation-bridge-c8-p3-b3-fix1-transpile-result.json",
  );

  const source = fs.readFileSync(targetPath, "utf8");

  const additionalBlockStart = source.indexOf("const additionalCategoryLinksResult =");
  const deltaBlockStart = source.indexOf("const { data: deltaData", additionalBlockStart);

  const additionalBlock =
    additionalBlockStart >= 0 && deltaBlockStart > additionalBlockStart
      ? source.slice(additionalBlockStart, deltaBlockStart)
      : "";

  const requiredRegexChecks = [
    {
      name: "helper call uses createdItem.activityEventValueObjectLinkId",
      ok: /activityEventValueObjectLinkId:\s*createdItem\.activityEventValueObjectLinkId,\s*processorName,/.test(
        additionalBlock,
      ),
    },
    {
      name: "warning uses createdItem.activityEventValueObjectLinkId",
      ok: /activityEventValueObjectLinkId:\s*createdItem\.activityEventValueObjectLinkId,\s*errors:\s*additionalCategoryLinksResult\.errors,/.test(
        additionalBlock,
      ),
    },
    {
      name: "additional block no longer references v42Projection.activityEventValueObjectLinkId",
      ok: !additionalBlock.includes("v42Projection.activityEventValueObjectLinkId"),
    },
    {
      name: "additional block exists",
      ok: additionalBlock.length > 0,
    },
  ];

  const failedRegexChecks = requiredRegexChecks
    .filter((check) => !check.ok)
    .map((check) => check.name);

  const requiredPatterns = [
    "const additionalCategoryLinksResult =",
    "await createAdditionalValueObjectCategoryLinks({",
    "createdItem.activityEventValueObjectLinkId",
    "createdItem.additionalValueObjectCategoryLinks",
    "createdItem.additionalValueObjectCategoryLinkErrors",
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
    ok:
      diagnostics.length === 0 &&
      missingPatterns.length === 0 &&
      failedRegexChecks.length === 0,
    checkId: "P4.10.0-C8-P3-B3-fix1",
    checkedAt: new Date().toISOString(),
    targetPath: path.relative(rootDir, targetPath),
    diagnosticsCount: diagnostics.length,
    missingPatterns,
    failedRegexChecks,
    additionalBlockLength: additionalBlock.length,
    diagnostics: diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      category: ts.DiagnosticCategory[diagnostic.category],
      message:
        typeof diagnostic.messageText === "string"
          ? diagnostic.messageText
          : diagnostic.messageText.messageText,
    })),
    note:
      "Checks that the additionalCategoryLinks block uses createdItem.activityEventValueObjectLinkId instead of out-of-scope v42Projection.",
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("P4.10.0-C8-P3-B3-fix1 — scope/transpile smoke check");
  console.log("");
  console.log(`Target: ${path.relative(rootDir, targetPath)}`);
  console.log(`Diagnostics: ${diagnostics.length}`);
  console.log(`Missing patterns: ${missingPatterns.length}`);
  console.log(`Failed regex checks: ${failedRegexChecks.length}`);
  console.log(`Result JSON: ${path.relative(rootDir, resultPath)}`);

  if (!output.ok) {
    console.error("");
    console.error("FAILED:");
    console.error(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  console.log("");
  console.log("RESULT: PASS — B3 scope fix is present and transpiles.");
}

main();