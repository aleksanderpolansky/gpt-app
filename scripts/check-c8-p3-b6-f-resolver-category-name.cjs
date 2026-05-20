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
    "category-derivation-resolver-c8-p3-b6-f-name-result.json",
  );

  const source = fs.readFileSync(targetPath, "utf8");

  const requiredPatterns = [
    "const title = normalizeTitle(candidate);",
    "context_id: contextId,",
    "slug: normalizedSlug,",
    "name: title,",
    "source_type: normalizeContextualCategorySourceType(options.sourceType)",
    "createCategory(supabase, candidate, normalizedSlug, defaultContextId, {",
  ];

  const forbiddenPatterns = [
    "context_id: contextId,tegoryCandidate",
    ");import type",
    "source_type: options.sourceType ?? \"rule\"",
    "const created = await createCategory(supabase, candidate, normalizedSlug, {",
  ];

  const missingPatterns = requiredPatterns.filter((pattern) => !source.includes(pattern));
  const forbiddenFound = forbiddenPatterns.filter((pattern) => source.includes(pattern));
  const failedChecks = [];

  const payloadStart = source.indexOf("const payload: Record<string, unknown> = {");
  const payloadEnd = payloadStart >= 0 ? source.indexOf("};", payloadStart) : -1;
  const payloadBlock =
    payloadStart >= 0 && payloadEnd > payloadStart ? source.slice(payloadStart, payloadEnd) : "";

  if (payloadBlock.length === 0) {
    failedChecks.push("could not isolate createCategory payload block");
  }

  if (!payloadBlock.includes("context_id: contextId,")) {
    failedChecks.push("payload does not include context_id");
  }

  if (!payloadBlock.includes("slug: normalizedSlug,")) {
    failedChecks.push("payload does not include slug");
  }

  if (!payloadBlock.includes("name: title,")) {
    failedChecks.push("payload does not include name: title");
  }

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
    ok:
      diagnostics.length === 0 &&
      missingPatterns.length === 0 &&
      forbiddenFound.length === 0 &&
      failedChecks.length === 0,
    checkId: "P4.10.0-C8-P3-B6-F-fix1",
    checkedAt: new Date().toISOString(),
    targetPath: path.relative(rootDir, targetPath),
    diagnosticsCount: diagnostics.length,
    missingPatterns,
    forbiddenFound,
    failedChecks,
    payloadBlockLength: payloadBlock.length,
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

  console.log("P4.10.0-C8-P3-B6-F-fix1 — resolver category name payload check");
  console.log(`Diagnostics: ${diagnostics.length}`);
  console.log(`Missing patterns: ${missingPatterns.length}`);
  console.log(`Forbidden found: ${forbiddenFound.length}`);
  console.log(`Failed checks: ${failedChecks.length}`);
  console.log(`Result JSON: ${path.relative(rootDir, resultPath)}`);

  if (!output.ok) {
    console.error(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  console.log("RESULT: PASS — contextual_categories payload includes required name field.");
}

main();