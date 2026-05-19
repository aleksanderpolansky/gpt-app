const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = process.cwd();
const extractorPath = path.join(rootDir, "lib", "activity", "categoryDerivation", "ruleExtractor.ts");
const resultPath = path.join(rootDir, "docs", "value-objects", "category-derivation-unicode-sanity-c8-l2-result.json");

function loadTypeScriptModule(tsPath) {
  let ts;

  try {
    ts = require("typescript");
  } catch (error) {
    throw new Error("The local typescript package is required for this verification script.");
  }

  if (!fs.existsSync(tsPath)) {
    throw new Error(`TypeScript file not found: ${tsPath}`);
  }

  const source = fs.readFileSync(tsPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: tsPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
    },
  });

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require,
    console,
  };

  vm.runInNewContext(transpiled.outputText, sandbox, {
    filename: tsPath,
  });

  return sandbox.module.exports;
}

function uniqueSlugs(result) {
  return Array.from(new Set((result.candidates || []).map((candidate) => candidate.slug))).sort();
}

function missingSlugs(actualSlugs, expectedSlugs) {
  return expectedSlugs.filter((slug) => !actualSlugs.includes(slug));
}

function codePoints(value) {
  return Array.from(value).map((char) => char.codePointAt(0).toString(16).padStart(4, "0"));
}

function runCase(deriveCategoryCandidates, testCase) {
  const result = deriveCategoryCandidates({
    inputText: testCase.inputText,
    durationMinutes: testCase.durationMinutes ?? null,
  });

  const slugs = uniqueSlugs(result);
  const missing = missingSlugs(slugs, testCase.expectedSlugs);
  const forbiddenPresent = (testCase.forbiddenSlugs || []).filter((slug) => slugs.includes(slug));
  const passed = result.ok === true && missing.length === 0 && forbiddenPresent.length === 0;

  return {
    id: testCase.id,
    passed,
    inputText: testCase.inputText,
    firstCodePoints: codePoints(testCase.inputText).slice(0, 12),
    ok: result.ok,
    skipped: result.skipped ?? false,
    skipReason: result.skipReason ?? null,
    confidence: result.confidence ?? null,
    candidateCount: result.candidates.length,
    slugs,
    expectedSlugs: testCase.expectedSlugs,
    missingSlugs: missing,
    forbiddenSlugs: testCase.forbiddenSlugs || [],
    forbiddenPresent,
    warnings: result.warnings,
    errors: result.errors,
  };
}

function main() {
  const mod = loadTypeScriptModule(extractorPath);

  if (typeof mod.deriveCategoryCandidates !== "function") {
    throw new Error("deriveCategoryCandidates export was not found.");
  }

  const testCases = [
    {
      id: "unicode_walking_dog_ru",
      inputText: "\u0433\u0443\u043b\u044f\u043b \u0441 \u0441\u043e\u0431\u0430\u043a\u043e\u0439 20 \u043c\u0438\u043d\u0443\u0442",
      durationMinutes: 20,
      expectedSlugs: ["walking", "dog", "pet-care", "duration-minutes"],
    },
    {
      id: "unicode_teach_math_with_child_ru",
      inputText: "\u0443\u0447\u0438\u043b \u043c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u043a\u0443 \u0441 \u0440\u0435\u0431\u0451\u043d\u043a\u043e\u043c 30 \u043c\u0438\u043d\u0443\u0442",
      durationMinutes: 30,
      expectedSlugs: ["teaching", "mathematics", "child", "family", "parental-care", "helping-child-learn", "duration-minutes"],
    },
    {
      id: "unicode_child_studied_nearby_ru",
      inputText: "\u0440\u0435\u0431\u0451\u043d\u043e\u043a \u0443\u0447\u0438\u043b \u043c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u043a\u0443 \u0440\u044f\u0434\u043e\u043c \u0441\u043e \u043c\u043d\u043e\u0439 30 \u043c\u0438\u043d\u0443\u0442",
      durationMinutes: 30,
      expectedSlugs: ["mathematics", "child", "supervision", "duration-minutes"],
      forbiddenSlugs: ["parental-care", "helping-child-learn"],
    },
    {
      id: "unicode_watch_english_cartoon_ru",
      inputText: "\u0441\u043c\u043e\u0442\u0440\u0435\u043b \u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u0438\u0439 \u043c\u0443\u043b\u044c\u0442\u0444\u0438\u043b\u044c\u043c \u0441 \u0440\u0435\u0431\u0451\u043d\u043a\u043e\u043c \u0438 \u043e\u0431\u0441\u0443\u0436\u0434\u0430\u043b \u0441\u043b\u043e\u0432\u0430",
      expectedSlugs: ["watching", "english-language", "cartoon", "child", "vocabulary-discussion", "helping-child-learn"],
    },
    {
      id: "unicode_commercial_proposal_ru",
      inputText: "\u043f\u0438\u0441\u0430\u043b \u043a\u043e\u043c\u043c\u0435\u0440\u0447\u0435\u0441\u043a\u043e\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u043a\u043b\u0438\u0435\u043d\u0442\u0443",
      expectedSlugs: ["writing", "commercial-proposal", "client", "b2b-sales"],
    },
  ];

  const caseResults = testCases.map((testCase) => runCase(mod.deriveCategoryCandidates, testCase));
  const failedCases = caseResults.filter((item) => !item.passed);
  const allPassed = failedCases.length === 0;

  const output = {
    ok: allPassed,
    checkId: "P4.10.0-C8-L2",
    checkedAt: new Date().toISOString(),
    extractorPath: path.relative(rootDir, extractorPath),
    processorVersion: mod.CATEGORY_DERIVATION_PROCESSOR_VERSION ?? null,
    ruleVersion: mod.CATEGORY_DERIVATION_RULE_VERSION ?? null,
    purpose: "Confirm that real Unicode Cyrillic strings match deterministic rules, not only PowerShell-rendered text.",
    totalCases: caseResults.length,
    passedCases: caseResults.filter((item) => item.passed).length,
    failedCases: failedCases.length,
    cases: caseResults,
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("P4.10.0-C8-L2 — Unicode sanity check");
  console.log("");
  console.table(caseResults.map((item) => ({
    id: item.id,
    passed: item.passed,
    candidateCount: item.candidateCount,
    confidence: item.confidence,
    missingSlugs: item.missingSlugs.join(","),
    forbiddenPresent: item.forbiddenPresent.join(","),
    firstCodePoints: item.firstCodePoints.join(" "),
  })));

  console.log("");
  console.log(`Result JSON: ${path.relative(rootDir, resultPath)}`);

  if (!allPassed) {
    console.error("");
    console.error("FAILED CASES:");
    console.error(JSON.stringify(failedCases, null, 2));
    process.exit(1);
  }

  console.log("");
  console.log("RESULT: PASS — true Unicode Cyrillic inputs match deterministic rules.");
}

main();
