const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = process.cwd();
const persistPath = path.join(
  rootDir,
  "lib",
  "activity",
  "categoryDerivation",
  "persistDerivations.ts",
);
const resultPath = path.join(
  rootDir,
  "docs",
  "value-objects",
  "category-derivation-persist-c8-n1-mock-result.json",
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

function makeMockSupabase(options = {}) {
  const state = {
    inserts: [],
    rows: [],
    failRunInsert: Boolean(options.failRunInsert),
    failDerivationSlug: options.failDerivationSlug ?? null,
  };

  function makeInsertBuilder(table, payload) {
    let selectedColumns = null;

    return {
      select(columns) {
        selectedColumns = columns ?? "*";
        return this;
      },
      async maybeSingle() {
        state.inserts.push({
          table,
          payload,
          selectedColumns,
        });

        if (table === "category_derivation_runs" && state.failRunInsert) {
          return {
            data: null,
            error: { message: "mock run insert failure" },
          };
        }

        if (
          table === "activity_category_derivations" &&
          state.failDerivationSlug &&
          payload.candidate_slug === state.failDerivationSlug
        ) {
          return {
            data: null,
            error: { message: `mock derivation insert failure for ${payload.candidate_slug}` },
          };
        }

        const tableCount = state.rows.filter((row) => row.table === table).length + 1;
        const id =
          table === "category_derivation_runs"
            ? `mock-run-${tableCount}`
            : `mock-derivation-${tableCount}`;

        const row = {
          id,
          ...payload,
          table,
        };

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
          insert(payload) {
            return makeInsertBuilder(table, payload);
          },
        };
      },
    },
  };
}

function baseInput() {
  return {
    activityEventId: "event-001",
    inputText: "walked to work for 15 minutes",
    title: "Walked to work",
    description: "Mock persistence test",
    durationMinutes: 15,
    inputLanguage: "en",
    actorId: "actor-001",
    organizationId: null,
    metadata: {
      test: true,
    },
  };
}

function baseDerivationResult() {
  return {
    ok: true,
    skipped: false,
    skipReason: null,
    processorVersion: "category_derivation_v1",
    ruleVersion: "rules_v1",
    confidence: 0.92,
    candidates: [
      {
        slug: "walking",
        title: "Walking",
        semanticLayer: "action",
        categoryType: "activity_action",
        source: "rule",
        confidence: 0.95,
        isRequired: true,
        isConfirmed: true,
        needsUserReview: false,
        metadata: {
          ruleId: "walking_to_work_duration",
        },
      },
      {
        slug: "work",
        title: "Work",
        semanticLayer: "context",
        categoryType: "life_domain",
        source: "rule",
        confidence: 0.9,
        isRequired: true,
        isConfirmed: true,
        needsUserReview: false,
        metadata: {
          ruleId: "walking_to_work_duration",
        },
      },
    ],
    warnings: [],
    errors: [],
    metadata: {
      extractor: "ruleExtractor",
    },
  };
}

function baseResolvedCandidates() {
  return [
    {
      ...baseDerivationResult().candidates[0],
      categoryId: "category-walking",
      resolutionStatus: "resolved_existing",
    },
    {
      ...baseDerivationResult().candidates[1],
      categoryId: null,
      resolutionStatus: "unresolved",
    },
  ];
}

function caseResult(id, passed, details) {
  return {
    id,
    passed,
    ...details,
  };
}

async function main() {
  const mod = loadTypeScriptModule(persistPath);

  if (typeof mod.persistCategoryDerivations !== "function") {
    throw new Error("persistCategoryDerivations export was not found.");
  }

  const cases = [];

  {
    const mock = makeMockSupabase();
    const result = await mod.persistCategoryDerivations(mock.client, {
      activityEventId: "event-001",
      input: baseInput(),
      derivationResult: baseDerivationResult(),
      resolvedCandidates: baseResolvedCandidates(),
      actorId: "actor-001",
      organizationId: null,
      needsUserConfirmation: false,
    });

    const runInsert = mock.state.inserts.find(
      (item) => item.table === "category_derivation_runs",
    );
    const derivationInserts = mock.state.inserts.filter(
      (item) => item.table === "activity_category_derivations",
    );

    cases.push(
      caseResult(
        "persist_success_with_resolved_and_unresolved_candidates",
        result.ok === true &&
          result.derivationRunId === "mock-run-1" &&
          result.derivationRowsCreated === 2 &&
          result.candidateCount === 2 &&
          result.resolvedCandidateCount === 1 &&
          result.unresolvedCandidateCount === 1 &&
          runInsert?.payload?.activity_event_id === "event-001" &&
          runInsert?.payload?.status === "completed" &&
          derivationInserts.length === 2 &&
          derivationInserts[0]?.payload?.candidate_slug === "walking" &&
          derivationInserts[0]?.payload?.category_id === "category-walking" &&
          derivationInserts[1]?.payload?.candidate_slug === "work" &&
          derivationInserts[1]?.payload?.category_id === null,
        {
          result,
          runPayload: runInsert?.payload ?? null,
          derivationPayloads: derivationInserts.map((item) => item.payload),
        },
      ),
    );
  }

  {
    const mock = makeMockSupabase();
    const derivationResult = {
      ...baseDerivationResult(),
      warnings: ["mock warning"],
    };

    const result = await mod.persistCategoryDerivations(mock.client, {
      activityEventId: "event-warning",
      input: {
        ...baseInput(),
        activityEventId: "event-warning",
      },
      derivationResult,
      resolvedCandidates: baseResolvedCandidates(),
    });

    const runInsert = mock.state.inserts.find(
      (item) => item.table === "category_derivation_runs",
    );

    cases.push(
      caseResult(
        "warning_status_becomes_completed_with_warnings",
        result.ok === true &&
          result.derivationRunId === "mock-run-1" &&
          runInsert?.payload?.status === "completed_with_warnings",
        {
          resultStatus: runInsert?.payload?.status ?? null,
          result,
        },
      ),
    );
  }

  {
    const mock = makeMockSupabase();
    const derivationResult = {
      ...baseDerivationResult(),
      ok: false,
      errors: ["mock extractor failure"],
    };

    const result = await mod.persistCategoryDerivations(mock.client, {
      activityEventId: "event-failed",
      input: {
        ...baseInput(),
        activityEventId: "event-failed",
      },
      derivationResult,
      resolvedCandidates: baseResolvedCandidates(),
    });

    const runInsert = mock.state.inserts.find(
      (item) => item.table === "category_derivation_runs",
    );

    cases.push(
      caseResult(
        "error_status_becomes_failed_and_error_json_exists",
        result.ok === true &&
          result.derivationRunId === "mock-run-1" &&
          runInsert?.payload?.status === "failed" &&
          Boolean(runInsert?.payload?.error_json),
        {
          resultStatus: runInsert?.payload?.status ?? null,
          errorJson: runInsert?.payload?.error_json ?? null,
          result,
        },
      ),
    );
  }

  {
    const mock = makeMockSupabase();

    const result = await mod.persistCategoryDerivations(mock.client, {
      activityEventId: "",
      input: {
        ...baseInput(),
        activityEventId: "",
      },
      derivationResult: baseDerivationResult(),
      resolvedCandidates: baseResolvedCandidates(),
    });

    cases.push(
      caseResult(
        "missing_activity_event_id_returns_error_without_inserts",
        result.ok === false &&
          result.derivationRunId === null &&
          result.errors.some((item) => item.includes("activityEventId is required")) &&
          mock.state.inserts.length === 0,
        {
          result,
          inserts: mock.state.inserts,
        },
      ),
    );
  }

  {
    const mock = makeMockSupabase({ failRunInsert: true });

    const result = await mod.persistCategoryDerivations(mock.client, {
      activityEventId: "event-run-failure",
      input: {
        ...baseInput(),
        activityEventId: "event-run-failure",
      },
      derivationResult: baseDerivationResult(),
      resolvedCandidates: baseResolvedCandidates(),
    });

    cases.push(
      caseResult(
        "run_insert_failure_returns_error",
        result.ok === false &&
          result.derivationRunId === null &&
          result.errors.some((item) =>
            item.includes("Failed to insert category_derivation_runs"),
          ),
        {
          result,
          inserts: mock.state.inserts,
        },
      ),
    );
  }

  {
    const mock = makeMockSupabase({ failDerivationSlug: "work" });

    const result = await mod.persistCategoryDerivations(mock.client, {
      activityEventId: "event-partial-failure",
      input: {
        ...baseInput(),
        activityEventId: "event-partial-failure",
      },
      derivationResult: baseDerivationResult(),
      resolvedCandidates: baseResolvedCandidates(),
    });

    cases.push(
      caseResult(
        "one_derivation_insert_failure_returns_partial_error",
        result.ok === false &&
          result.derivationRunId === "mock-run-1" &&
          result.derivationRowsCreated === 1 &&
          result.errors.some((item) =>
            item.includes("Failed to insert activity_category_derivations for work"),
          ),
        {
          result,
          inserts: mock.state.inserts,
        },
      ),
    );
  }

  {
    const mock = makeMockSupabase();

    const result = await mod.persistCategoryDerivations(mock.client, {
      activityEventId: "event-unresolved-fallback",
      input: {
        ...baseInput(),
        activityEventId: "event-unresolved-fallback",
      },
      derivationResult: baseDerivationResult(),
    });

    cases.push(
      caseResult(
        "without_resolved_candidates_persists_unresolved_fallback",
        result.ok === true &&
          result.derivationRunId === "mock-run-1" &&
          result.derivationRowsCreated === 2 &&
          result.resolvedCandidateCount === 0 &&
          result.unresolvedCandidateCount === 2 &&
          result.derivationInserts.every((item) => item.category_id === null),
        {
          result,
        },
      ),
    );
  }

  const failedCases = cases.filter((item) => !item.passed);
  const allPassed = failedCases.length === 0;

  const output = {
    ok: allPassed,
    checkId: "P4.10.0-C8-N1",
    checkedAt: new Date().toISOString(),
    persistPath: path.relative(rootDir, persistPath),
    totalCases: cases.length,
    passedCases: cases.filter((item) => item.passed).length,
    failedCases: failedCases.length,
    liveDbWrites: false,
    cases,
  };

  fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("P4.10.0-C8-N1 — persistDerivations mock verification");
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
  console.log("RESULT: PASS — persistDerivations logic works with mock Supabase and no live DB writes.");
}

main();