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
    "category-derivation-route-c8-o1-transpile-result.json",
  );

  if (!fs.existsSync(targetPath)) {
    console.error(`Target file not found: ${targetPath}`);
    process.exit(1);
  }

  const source = fs.readFileSync(targetPath, "utf8");

  const requiredPatterns = [
    "deriveCategoryCandidates",
    "resolveCategoryCandidates",
    "persistCategoryDerivations",
    "enableCategoryDerivation",
    "categoryDerivationCreatePolicy",
    "runCategoryDerivationForDebugRoute",
  ];

  const missingPatterns = requiredPatterns.filter(
    (pattern) => !source.includes(pattern),
  );

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
    checkId: "P4.10.0-C8-O1",
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
      "This is a route syntax/transpile smoke check only. Runtime verification is the next step.",
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("P4.10.0-C8-O1 — route transpile smoke check");
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
  console.log("RESULT: PASS — route transpiles and Category Derivation integration markers are present.");
}

main();