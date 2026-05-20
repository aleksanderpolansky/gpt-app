const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function main() {
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
    "category-derivation-route-c8-p3-b6-d-diagnostics-result.json",
  );

  const source = fs.readFileSync(targetPath, "utf8");

  const requiredPatterns = [
    "categoryDerivationResult.persistence?.derivationRunId ?? null",
    "activityEventId: createdEvent.id",
    "additionalCategoryLinks: categoryDerivationBridgeAdditionalCategoryLinks",
    "buildAdditionalCategoryLinksForBridge",
  ];

  const forbiddenPatterns = [
    "categoryDerivationResult?.derivationRunId",
    "categoryDerivationResult?.runId",
    "activityEventId: event.id",
  ];

  const missingPatterns = requiredPatterns.filter((pattern) => !source.includes(pattern));
  const forbiddenFound = forbiddenPatterns.filter((pattern) => source.includes(pattern));

  const diagnostics =
    ts.transpileModule(source, {
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
    ok: diagnostics.length === 0 && missingPatterns.length === 0 && forbiddenFound.length === 0,
    checkId: "P4.10.0-C8-P3-B6-D-route-fix",
    checkedAt: new Date().toISOString(),
    targetPath: path.relative(rootDir, targetPath),
    diagnosticsCount: diagnostics.length,
    missingPatterns,
    forbiddenFound,
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

  console.log("P4.10.0-C8-P3-B6-D-route-fix — route diagnostics check");
  console.log(`Diagnostics: ${diagnostics.length}`);
  console.log(`Missing patterns: ${missingPatterns.length}`);
  console.log(`Forbidden found: ${forbiddenFound.length}`);
  console.log(`Result JSON: ${path.relative(rootDir, resultPath)}`);

  if (!output.ok) {
    console.error(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  console.log("RESULT: PASS — route.ts diagnostic patterns fixed.");
}

main();