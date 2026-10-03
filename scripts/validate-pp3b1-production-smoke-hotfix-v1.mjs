import fs from "node:fs";

const files = {
  recurrence: "src/lib/activity/pp3/activityRecurrence.ts",
  taskDetail: "src/components/calendar/cux6-task-detail-modal.tsx",
  projectMap: "src/app/projects/ProjectMapStartClient.tsx",
  pp3b1Validator:
    "scripts/validate-project-planning-pp3b1-recurrence-v1.mjs",
};

function read(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`MISSING_FILE:${path}`);
  }

  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, read(path)]),
);

let passed = 0;

function check(name, condition) {
  if (!condition) {
    throw new Error(`FAIL ${name}`);
  }

  console.log(`PASS ${name}`);
  passed += 1;
}

function recurrencePatternsByCode(text) {
  const pairs = new Map();
  const pairPattern =
    /pattern:\s*(\/(?:\\\/|[^/\n])+\/[a-z]*),\s*\n\s*sourcePatternCode:\s*"([^"]+)"/g;

  for (const match of text.matchAll(pairPattern)) {
    const literal = match[1];
    const code = match[2];
    // The literal comes from the trusted repository source under validation.
    const pattern = Function(`"use strict"; return (${literal});`)();
    pairs.set(code, pattern);
  }

  return pairs;
}

const patterns = recurrencePatternsByCode(source.recurrence);

const runtimeCases = [
  [
    "ru_weekly",
    "Проверять акционные предложения продуктовых магазинов каждую неделю",
  ],
  ["ru_daily", "Проверять цены каждый день"],
  ["ru_monthly", "Проверять подписки каждый месяц"],
  ["uk_weekly", "Перевіряти ціни щотижня"],
  ["pl_weekly", "Sprawdzać promocje co tydzień"],
  ["en_weekly", "Check promotions every week"],
  ["de_weekly", "Angebote jede Woche prüfen"],
  ["es_weekly", "Revisar promociones cada semana"],
  ["cs_weekly", "Kontrolovat nabídky každý týden"],
  ["ru_every_n_weeks", "Проверять акции каждые 2 недели"],
  ["en_every_n_weeks", "Check promotions every 3 weeks"],
  ["pl_every_n_weeks", "Sprawdzać promocje co 4 tygodnie"],
];

for (const [code, sample] of runtimeCases) {
  const pattern = patterns.get(code);

  check(
    `RECURRENCE_RUNTIME_${code.toUpperCase()}`,
    pattern instanceof RegExp && pattern.test(sample.toLocaleLowerCase()),
  );
}

check(
  "RECURRENCE_NO_JS_ASCII_WORD_BOUNDARY",
  !source.recurrence.includes("pattern: /\\b") &&
    !source.recurrence.includes("\\b/iu,"),
);

check(
  "TASK_SHELF_USES_CURRENT_ANALYSIS_ROUTE",
  source.taskDetail.includes('return `/activity-ai-lab?${params.toString()}`;') &&
    !source.taskDetail.includes("/calendar/activity-review"),
);

check(
  "TASK_SHELF_VISIBLE_LEGACY_CONTAINER_COPY_REMOVED",
  !source.taskDetail.includes('"Контейнер активности"') &&
    !source.taskDetail.includes('"Activity Container"') &&
    source.taskDetail.includes('analysis: "Анализ"') &&
    source.taskDetail.includes('analysis: "Analysis"'),
);

check(
  "PROJECT_BACKGROUND_ACTIVITY_REFRESH",
  source.projectMap.includes('{ background: true }') &&
    source.projectMap.includes("if (!background)"),
);

check(
  "PROJECT_FLOW_REMOUNTS_ONLY_FOR_ACTIVITY_IDENTITY_CHANGE",
  source.projectMap.includes("const flowKey = useMemo(") &&
    source.projectMap.includes("key={flowKey}"),
);

check(
  "PP3B1_BASE_VALIDATOR_STILL_PRESENT",
  source.pp3b1Validator.includes("RECURRENCE_NOT_SCHEDULE_MODE") &&
    source.pp3b1Validator.includes("NO_PROJECT_TASK_ENTITY") &&
    source.pp3b1Validator.includes("NO_OCCURRENCE_MATERIALIZATION_YET"),
);

console.log(`VALIDATOR=PASS_${passed}/${passed}`);
