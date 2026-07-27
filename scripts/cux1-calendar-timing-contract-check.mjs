import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(
  repositoryRoot,
  "src",
  "lib",
  "activity",
  "pp1",
  "activityTiming.ts",
);

const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
  reportDiagnostics: true,
  fileName: sourcePath,
});

const syntaxErrors = (transpiled.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);

if (syntaxErrors.length > 0) {
  for (const diagnostic of syntaxErrors) {
    console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
  }
  process.exit(1);
}

const moduleRecord = { exports: {} };
vm.runInNewContext(
  transpiled.outputText,
  {
    exports: moduleRecord.exports,
    module: moduleRecord,
    require,
    console,
    Date,
    Intl,
    Map,
    Set,
    RegExp,
    Number,
    String,
    Math,
    Object,
    Array,
  },
  { filename: sourcePath },
);

const {
  inferActivityTimingDraftPp1,
  validateActivityTimingDraftPp1,
} = moduleRecord.exports;

const now = new Date("2026-07-27T12:00:00+02:00");
const fixtures = [
  {
    name: "01_unscheduled_without_defaults",
    text: "Купить новый ремень для гитары",
    direction: "future",
    expected: {
      scheduleModeCode: "unscheduled",
      startedAtLocal: "",
      endedAtLocal: "",
      durationMinutes: "",
    },
  },
  {
    name: "02_ru_exact_interval",
    text: "Репетиция на гитаре 30 июля с 18:00 до 18:45",
    direction: "future",
    expected: {
      scheduleModeCode: "exact",
      startedAtLocal: "2026-07-30T18:00",
      endedAtLocal: "2026-07-30T18:45",
      durationMinutes: "45",
    },
  },
  {
    name: "03_ru_exact_start_duration",
    text: "Репетиция на гитаре 30 июля в 18:00 45 минут",
    direction: "future",
    expected: {
      scheduleModeCode: "exact",
      startedAtLocal: "2026-07-30T18:00",
      endedAtLocal: "2026-07-30T18:45",
      durationMinutes: "45",
    },
  },
  {
    name: "04_ru_deadline",
    text: "Сделать отчёт до 30 июля 18:00",
    direction: "future",
    expected: {
      scheduleModeCode: "deadline",
      deadlineLocal: "2026-07-30T18:00",
    },
  },
  {
    name: "05_relative_date_no_time_default",
    text: "Позвонить врачу завтра",
    direction: "future",
    expected: {
      scheduleModeCode: "date_only",
      scheduledDate: "2026-07-28",
      startedAtLocal: "",
      durationMinutes: "",
    },
  },
  {
    name: "06_en_date_range",
    text: "Project from 30 July to 2 August",
    direction: "future",
    expected: {
      scheduleModeCode: "date_range",
      scheduleStartDate: "2026-07-30",
      scheduleEndDate: "2026-08-02",
    },
  },
  {
    name: "07_pl_exact_interval",
    text: "Spotkanie 30 lipca od 18:00 do 18:45",
    direction: "future",
    expected: {
      scheduleModeCode: "exact",
      startedAtLocal: "2026-07-30T18:00",
      endedAtLocal: "2026-07-30T18:45",
    },
  },
  {
    name: "08_de_exact_interval",
    text: "Probe am 30. Juli von 18:00 bis 18:45",
    direction: "future",
    expected: {
      scheduleModeCode: "exact",
      startedAtLocal: "2026-07-30T18:00",
      endedAtLocal: "2026-07-30T18:45",
    },
  },
  {
    name: "09_es_exact_interval",
    text: "Ensayo 30 julio de 18:00 a 18:45",
    direction: "future",
    expected: {
      scheduleModeCode: "exact",
      startedAtLocal: "2026-07-30T18:00",
      endedAtLocal: "2026-07-30T18:45",
    },
  },
  {
    name: "10_cs_exact_interval",
    text: "Zkouška 30 července od 18:00 do 18:45",
    direction: "future",
    expected: {
      scheduleModeCode: "exact",
      startedAtLocal: "2026-07-30T18:00",
      endedAtLocal: "2026-07-30T18:45",
    },
  },
  {
    name: "11_future_year_rollover",
    text: "Занятие 1 января",
    direction: "future",
    expected: {
      scheduleModeCode: "date_only",
      scheduledDate: "2027-01-01",
    },
  },
  {
    name: "12_overnight_interval",
    text: "Дежурство 30 июля с 23:00 до 01:00",
    direction: "future",
    expected: {
      scheduleModeCode: "exact",
      startedAtLocal: "2026-07-30T23:00",
      endedAtLocal: "2026-07-31T01:00",
      durationMinutes: "120",
    },
  },
];

const results = [];

for (const fixture of fixtures) {
  const draft = inferActivityTimingDraftPp1(
    fixture.text,
    fixture.direction,
    now,
  );
  const validation = validateActivityTimingDraftPp1(
    draft,
    fixture.direction,
  );
  const mismatches = Object.entries(fixture.expected).flatMap(
    ([key, expectedValue]) =>
      draft[key] === expectedValue
        ? []
        : [`${key}: expected ${expectedValue}, received ${draft[key]}`],
  );
  const passed = validation.ok && mismatches.length === 0;

  results.push({
    name: fixture.name,
    passed,
    validationErrors: validation.errors,
    mismatches,
    draft,
  });
}

for (const result of results) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}`);

  if (!result.passed) {
    console.log(JSON.stringify(result, null, 2));
  }
}

const passedCount = results.filter((result) => result.passed).length;
console.log(`RESULT ${passedCount}/${results.length}`);

if (passedCount !== results.length) {
  process.exit(1);
}
