const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = process.cwd();
const resolverPath = path.join(
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
  "category-derivation-resolver-c8-m1-mock-result.json",
);

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

function makeMockSupabase(initialRows = []) {
  const state = {
    rows: [...initialRows],
    insertedRows: [],
    selects: [],
    inserts: [],
  };

  function makeSelectBuilder(table, selectedColumns) {
    const filters = [];

    return {
      eq(column, value) {
        filters.push({ column, value });
        return this;
      },
      limit(count) {
        this._limit = count;
        return this;
      },
      async maybeSingle() {
        state.selects.push({
          table,
          selectedColumns,
          filters: [...filters],
          limit: this._limit ?? null,
        });

        const row =
          state.rows.find((item) =>
            filters.every((filter) => item[filter.column] === filter.value),
          ) ?? null;

        return {
          data: row,
          error: null,
        };
      },
    };
  }

  function makeInsertBuilder(table, payload) {
    let selectedColumns = null;

    return {
      select(columns) {
        selectedColumns = columns ?? "*";
        return this;
      },
      async maybeSingle() {
        const row = {
          id: `mock-created-${state.insertedRows.length + 1}`,
          ...payload,
        };

        state.inserts.push({
          table,
          payload,
          selectedColumns,
        });
        state.insertedRows.push(row);
        state.rows.push(row);

        return {
          data: row,
          error: null,
        };
      },
    };
  }

  return {
    state,
    client: {
      from(table) {
        return {
          select(columns) {
            return makeSelectBuilder(table, columns ?? "*");
          },
          insert(payload) {
            return makeInsertBuilder(table, payload);
          },
        };
      },
    },
  };
}

function ids(result) {
  return result.candidates.map((candidate) => ({
    slug: candidate.slug,
    categoryId: candidate.categoryId,
    status: candidate.resolutionStatus,
  }));
}

function caseResult(id, passed, details) {
  return {
    id,
    passed,
    ...details,
  };
}

async function main() {
  const mod = loadTypeScriptModule(resolverPath);

  if (typeof mod.resolveCategoryCandidates !== "function") {
    throw new Error("resolveCategoryCandidates export was not found.");
  }

  if (typeof mod.normalizeCategoryCandidateSlug !== "function") {
    throw new Error("normalizeCategoryCandidateSlug export was not found.");
  }

  const cases = [];

  const unicodeInput =
    "\u041c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u043a\u0430 / \u0440\u0435\u0431\u0451\u043d\u043e\u043a\u2019s test";
  const unicodeExpected =
    "\u043c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u043a\u0430-\u0440\u0435\u0431\u0451\u043d\u043e\u043as-test";
  const unicodeActual = mod.normalizeCategoryCandidateSlug(unicodeInput);

  cases.push(
    caseResult("normalize_unicode_slug", unicodeActual === unicodeExpected, {
      input: unicodeInput,
      actual: unicodeActual,
      expected: unicodeExpected,
      actualCodePoints: Array.from(unicodeActual).map((char) =>
        char.codePointAt(0).toString(16).padStart(4, "0"),
      ),
    }),
  );

  {
    const mock = makeMockSupabase([
      {
        id: "existing-walking-action",
        slug: "walking",
        title: "Walking",
        semantic_layer: "action",
        category_type: "activity_action",
        status: "active",
      },
    ]);

    const result = await mod.resolveCategoryCandidates(
      mock.client,
      [
        {
          slug: "Walking",
          title: "Walking",
          semanticLayer: "action",
          categoryType: "activity_action",
          source: "rule",
          isRequired: true,
          isConfirmed: true,
          confidence: 0.95,
        },
      ],
      { createPolicy: "suggested_only" },
    );

    cases.push(
      caseResult(
        "reuse_existing_by_slug_and_semantic_layer",
        result.ok === true &&
          result.reusedCount === 1 &&
          result.createdCount === 0 &&
          result.unresolvedCount === 0 &&
          result.candidates[0]?.categoryId === "existing-walking-action" &&
          result.candidates[0]?.resolutionStatus === "resolved_existing" &&
          mock.state.inserts.length === 0,
        {
          result: {
            ok: result.ok,
            createdCount: result.createdCount,
            reusedCount: result.reusedCount,
            unresolvedCount: result.unresolvedCount,
            candidates: ids(result),
          },
          selects: mock.state.selects,
          inserts: mock.state.inserts,
        },
      ),
    );
  }

  {
    const mock = makeMockSupabase([]);

    const result = await mod.resolveCategoryCandidates(
      mock.client,
      [
        {
          slug: "new suggested category",
          title: "New suggested category",
          semanticLayer: "context",
          categoryType: "test_category",
          source: "rule",
          isRequired: false,
          isConfirmed: false,
          confidence: 0.55,
        },
      ],
      { createPolicy: "suggested_only" },
    );

    cases.push(
      caseResult(
        "create_suggested_for_missing_category",
        result.ok === true &&
          result.createdCount === 1 &&
          result.reusedCount === 0 &&
          result.unresolvedCount === 0 &&
          result.candidates[0]?.categoryId === "mock-created-1" &&
          result.candidates[0]?.resolutionStatus === "created_suggested" &&
          mock.state.inserts.length === 1 &&
          mock.state.inserts[0]?.payload?.slug === "new-suggested-category" &&
          mock.state.inserts[0]?.payload?.status === "suggested",
        {
          result: {
            ok: result.ok,
            createdCount: result.createdCount,
            reusedCount: result.reusedCount,
            unresolvedCount: result.unresolvedCount,
            candidates: ids(result),
          },
          insertedPayload: mock.state.inserts[0]?.payload ?? null,
        },
      ),
    );
  }

  {
    const mock = makeMockSupabase([]);

    const result = await mod.resolveCategoryCandidates(
      mock.client,
      [
        {
          slug: "confirmed required category",
          title: "Confirmed required category",
          semanticLayer: "activity_meaning",
          categoryType: "test_category",
          source: "rule",
          isRequired: true,
          isConfirmed: true,
          confidence: 0.9,
        },
      ],
      { createPolicy: "active_for_confirmed_required" },
    );

    cases.push(
      caseResult(
        "create_active_for_confirmed_required",
        result.ok === true &&
          result.createdCount === 1 &&
          result.reusedCount === 0 &&
          result.unresolvedCount === 0 &&
          result.candidates[0]?.resolutionStatus === "created_active" &&
          mock.state.inserts[0]?.payload?.status === "active",
        {
          result: {
            ok: result.ok,
            createdCount: result.createdCount,
            reusedCount: result.reusedCount,
            unresolvedCount: result.unresolvedCount,
            candidates: ids(result),
          },
          insertedPayload: mock.state.inserts[0]?.payload ?? null,
        },
      ),
    );
  }

  {
    const mock = makeMockSupabase([]);

    const result = await mod.resolveCategoryCandidates(
      mock.client,
      [
        {
          slug: "dry run category",
          title: "Dry run category",
          semanticLayer: "context",
          categoryType: "test_category",
          source: "rule",
          isRequired: true,
          isConfirmed: true,
          confidence: 0.9,
        },
      ],
      { createPolicy: "suggested_only", dryRun: true },
    );

    cases.push(
      caseResult(
        "dry_run_does_not_insert",
        result.ok === true &&
          result.createdCount === 0 &&
          result.reusedCount === 0 &&
          result.unresolvedCount === 1 &&
          result.candidates[0]?.categoryId === null &&
          result.candidates[0]?.resolutionStatus === "unresolved" &&
          mock.state.inserts.length === 0,
        {
          result: {
            ok: result.ok,
            createdCount: result.createdCount,
            reusedCount: result.reusedCount,
            unresolvedCount: result.unresolvedCount,
            candidates: ids(result),
          },
          inserts: mock.state.inserts,
        },
      ),
    );
  }

  {
    const mock = makeMockSupabase([]);

    const result = await mod.resolveCategoryCandidates(
      mock.client,
      [
        {
          slug: "never create category",
          title: "Never create category",
          semanticLayer: "context",
          categoryType: "test_category",
          source: "rule",
          isRequired: true,
          isConfirmed: true,
          confidence: 0.9,
        },
      ],
      { createPolicy: "never" },
    );

    cases.push(
      caseResult(
        "create_policy_never_does_not_insert",
        result.ok === true &&
          result.createdCount === 0 &&
          result.reusedCount === 0 &&
          result.unresolvedCount === 1 &&
          result.candidates[0]?.resolutionStatus === "unresolved" &&
          mock.state.inserts.length === 0,
        {
          result: {
            ok: result.ok,
            createdCount: result.createdCount,
            reusedCount: result.reusedCount,
            unresolvedCount: result.unresolvedCount,
            candidates: ids(result),
          },
          inserts: mock.state.inserts,
        },
      ),
    );
  }

  const failedCases = cases.filter((item) => !item.passed);
  const allPassed = failedCases.length === 0;

  const output = {
    ok: allPassed,
    checkId: "P4.10.0-C8-M1",
    checkedAt: new Date().toISOString(),
    resolverPath: path.relative(rootDir, resolverPath),
    totalCases: cases.length,
    passedCases: cases.filter((item) => item.passed).length,
    failedCases: failedCases.length,
    liveDbWrites: false,
    cases,
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("P4.10.0-C8-M1 — resolver mock verification");
  console.log("");
  console.table(
    cases.map((item) => ({
      id: item.id,
      passed: item.passed,
    })),
  );

  console.log("");
  console.log(`Result JSON: ${path.relative(rootDir, resultPath)}`);

  if (!allPassed) {
    console.error("");
    console.error("FAILED CASES:");
    console.error(JSON.stringify(failedCases, null, 2));
    process.exit(1);
  }

  console.log("");
  console.log("RESULT: PASS — resolver logic works with mock Supabase and no live DB writes.");
}

main();