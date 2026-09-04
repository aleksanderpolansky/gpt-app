import fs from "node:fs";

const files = {
  analyzer: "src/lib/activity/activity-basic-intake-analysis.server.ts",
  route: "src/app/api/activity/intake-analysis/route.ts",
  card: "src/components/activity/activity-basic-intake-analysis-card.tsx",
  catalog: "lib/ai/navigatorModelCatalog.ts",
};

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, read(path)]),
);

const results = [];

function check(name, condition) {
  results.push({ name, pass: Boolean(condition) });
  console.log(`${name}: ${condition ? "PASS" : "FAIL"}`);
}

function has(value, ...needles) {
  return needles.every((needle) => value.includes(needle));
}

check(
  "CATALOG_REVERIFIED_20260904",
  has(
    source.catalog,
    'NAVIGATOR_MODEL_CATALOG_VERIFIED_AT =\n  "2026-09-04T00:00:00.000Z"',
    'NAVIGATOR_MODEL_AUTO_SEED_EXPIRES_AT =\n  "2026-09-11T23:59:59.999Z"',
  ),
);

check(
  "LUNA_PRICE_OFFICIAL_CURRENT",
  has(
    source.catalog,
    'modelName: "gpt-5.6-luna"',
    "inputUsdPer1m: 0.2",
    "cachedInputUsdPer1m: 0.02",
    "outputUsdPer1m: 1.2",
  ),
);

check(
  "TERRA_PRICE_OFFICIAL_CURRENT",
  has(
    source.catalog,
    'modelName: "gpt-5.6-terra"',
    "inputUsdPer1m: 2",
    "cachedInputUsdPer1m: 0.2",
    "outputUsdPer1m: 12",
  ),
);

check(
  "SOL_PRICE_OFFICIAL_CURRENT",
  has(
    source.catalog,
    'modelName: "gpt-5.6-sol"',
    "inputUsdPer1m: 4",
    "cachedInputUsdPer1m: 0.4",
    "outputUsdPer1m: 20",
  ),
);

check(
  "NANO_PRICE_STALE_RECOVERY",
  has(
    source.analyzer,
    "refreshNanoPriceSnapshotWithinVerifiedLease",
    '"PRICE_SNAPSHOT_STALE"',
    '"PRICE_SNAPSHOT_MISSING"',
    '"PRICE_SNAPSHOT_NOT_FOUND"',
    '"NO_ACTIVE_PRICE_SNAPSHOT"',
    '"ARCTOR_BASIC_INTAKE_NANO_PRICE_REFRESH_V1"',
    "preflight_ai_pilot_call_budget_v1",
    "BASIC_INTAKE_BUDGET_PREFLIGHT_RETRY_FAILED",
  ),
);

check(
  "PRICE_RECOVERY_FAIL_CLOSED",
  has(
    source.analyzer,
    "Date.now() > Date.parse(NAVIGATOR_MODEL_AUTO_SEED_EXPIRES_AT)",
    "BASIC_INTAKE_PRICE_REFRESH_BASELINE_MISMATCH_FAIL_CLOSED",
    'input.modelName !== "gpt-5.6-luna"',
  ),
);

check(
  "PROVIDER_NOT_ATTEMPTED_DISTINCT",
  has(
    source.analyzer,
    '"not_attempted"',
    '"analysis_blocked_before_provider"',
    "providerAttempted: providerCallStarted",
    "providerCompleted: providerCallCompleted",
    "failureStage: stage",
  ),
);

check(
  "MODEL_UNAVAILABLE_ONLY_AFTER_ATTEMPT",
  has(
    source.analyzer,
    "providerCallStarted && !providerResponseReceived",
    'eventCode = modelUnavailable\n      ? "model_unavailable"',
  ) &&
    !source.analyzer.includes("const modelUnavailable = !providerCallCompleted;"),
);

check(
  "PROVIDER_CONFIG_GATE_BEFORE_ATTEMPT",
  has(
    source.analyzer,
    'failureStage = "provider_config"',
    'if (!AI_ENABLED)',
    'throw new Error("BASIC_INTAKE_PROVIDER_DISABLED")',
    'failureStage = "provider_call"',
    "providerCallStarted = true",
  ),
);

check(
  "INVALID_PROVIDER_OUTPUT_NOT_UNAVAILABLE",
  has(
    source.analyzer,
    'message.startsWith("OpenAI returned empty output_text")',
    'message.startsWith("OpenAI returned invalid JSON")',
    "providerResponseReceived",
    '"responded_invalid"',
  ),
);

check(
  "SUCCESS_PROVIDER_EVIDENCE",
  has(
    source.analyzer,
    'analysisMode: "nano_model"',
    "providerAttempted: true",
    "providerCompleted: true",
    'providerState: "completed"',
    "modelUnavailable: false",
    "failureStage: null",
  ),
);

check(
  "RETRY_ENDPOINT",
  has(
    source.route,
    "export async function POST(request: Request)",
    "isRetryableAnalysis",
    "analyzeBasicActivityIntakeV1",
    'method: "POST"',
  ) || has(
    source.route,
    "export async function POST(request: Request)",
    "isRetryableAnalysis",
    "analyzeBasicActivityIntakeV1",
  ),
);

check(
  "RETRY_OWNERSHIP_GATES",
  has(
    source.route,
    '.eq("user_id", appUser.id)',
    '.eq("source_type", "manual_chat")',
    '.eq("output_event_id", activityEventId)',
    '.select("id,acting_as_actor_id")',
  ),
);

check(
  "FALLBACK_UI_NO_FALSE_NO_MATCH",
  has(
    source.card,
    "searchIncomplete: string",
    'displayedAnalysis.typicalActivitySearchStatus === "completed"',
    "{searchCompleted ? ui.noCandidate : ui.searchIncomplete}",
  ),
);

check(
  "EXPLICIT_RETRY_UI",
  has(
    source.card,
    'fetch("/api/activity/intake-analysis"',
    'method: "POST"',
    "setRetryResult(payload.analysis)",
    "ui.retrying",
    "ui.retryFailed",
  ),
);

check(
  "RU_RETRY_COPY",
  has(
    source.card,
    'searchIncomplete: "Поиск типовой активности не завершён. Активность ожидает повторного AI-анализа."',
    'retry: "Повторить AI-анализ"',
  ),
);

const failed = results.filter((item) => !item.pass);
if (failed.length > 0) {
  console.error(
    "ARCTOR_BASIC_INTAKE_MODEL_INVOCATION_RECOVERY_V1_VALIDATION: FAIL",
    failed.map((item) => item.name).join(", "),
  );
  process.exit(1);
}

console.log("ARCTOR_BASIC_INTAKE_MODEL_INVOCATION_RECOVERY_V1_VALIDATION: PASS");
