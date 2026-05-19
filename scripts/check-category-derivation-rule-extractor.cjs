const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = process.cwd();
const extractorPath = path.join(rootDir, "lib", "activity", "categoryDerivation", "ruleExtractor.ts");
const resultPath = path.join(rootDir, "docs", "value-objects", "category-derivation-rule-extractor-c8-l1-check-result.json");

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

function runCase(deriveCategoryCandidates, testCase) {
  const result = deriveCategoryCandidates({
    inputText: testCase.inputText,
    durationMinutes: testCase.durationMinutes ?? null,
    title: testCase.title ?? null,
    description: testCase.description ?? null,
  });

  const slugs = uniqueSlugs(result);
  const missing = missingSlugs(slugs, testCase.expectedSlugs);
  const forbiddenPresent = (testCase.forbiddenSlugs || []).filter((slug) => slugs.includes(slug));
  const passed = result.ok === true && missing.length === 0 && forbiddenPresent.length === 0;

  return {
    id: testCase.id,
    inputText: testCase.inputText,
    passed,
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
      id: "walked_to_work",
      inputText: "walked to work for 15 minutes",
      durationMinutes: 15,
      expectedSlugs: ["walking", "work", "commute-to-work", "walking-to-work", "duration-minutes"],
    },
    {
      id: "walking_dog_ru",
      inputText: "гулял с собакой 20 минут",
      durationMinutes: 20,
      expectedSlugs: ["walking", "dog", "pet-care", "duration-minutes"],
    },
    {
      id: "teach_math_with_child_ru",
      inputText: "учил математику с ребёнком 30 минут",
      durationMinutes: 30,
      expectedSlugs: ["teaching", "mathematics", "child", "family", "parental-care", "helping-child-learn", "duration-minutes"],
    },
    {
      id: "child_studied_nearby_ru",
      inputText: "ребёнок учил математику рядом со мной 30 минут",
      durationMinutes: 30,
      expectedSlugs: ["mathematics", "child", "supervision", "duration-minutes"],
      forbiddenSlugs: ["parental-care", "helping-child-learn"],
    },
    {
      id: "watch_film_with_child_ru",
      inputText: "смотрел фильм с ребёнком",
      expectedSlugs: ["watching", "film", "child"],
    },
    {
      id: "watch_english_cartoon_with_child_ru",
      inputText: "смотрел английский мультфильм с ребёнком и обсуждал слова",
      expectedSlugs: ["watching", "english-language", "cartoon", "child", "vocabulary-discussion", "helping-child-learn"],
    },
    {
      id: "write_commercial_proposal_ru",
      inputText: "писал коммерческое предложение клиенту",
      expectedSlugs: ["writing", "commercial-proposal", "client", "b2b-sales"],
    },
    {
      id: "no_rule_match",
      inputText: "случайная фраза без подходящего правила",
      expectedSlugs: [],
    },
  ];

  const caseResults = testCases.map((testCase) => runCase(mod.deriveCategoryCandidates, testCase));
  const failedCases = caseResults.filter((item) => !item.passed);
  const allPassed = failedCases.length === 0;

  const output = {
    ok: allPassed,
    checkId: "P4.10.0-C8-L1",
    checkedAt: new Date().toISOString(),
    extractorPath: path.relative(rootDir, extractorPath),
    processorVersion: mod.CATEGORY_DERIVATION_PROCESSOR_VERSION ?? null,
    ruleVersion: mod.CATEGORY_DERIVATION_RULE_VERSION ?? null,
    totalCases: caseResults.length,
    passedCases: caseResults.filter((item) => item.passed).length,
    failedCases: failedCases.length,
    cases: caseResults,
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("P4.10.0-C8-L1 — deterministic rule extractor check");
  console.log("");
  console.table(caseResults.map((item) => ({
    id: item.id,
    passed: item.passed,
    candidateCount: item.candidateCount,
    confidence: item.confidence,
    missingSlugs: item.missingSlugs.join(","),
    forbiddenPresent: item.forbiddenPresent.join(","),
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
  console.log("RESULT: PASS — deterministic rule extractor produced expected category candidates without DB writes.");
}

main();
