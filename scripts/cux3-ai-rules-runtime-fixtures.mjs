import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const requireFromHere = createRequire(import.meta.url);
let ts;
try {
  ts = requireFromHere("typescript");
} catch {
  const globalRoot = execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"], { encoding: "utf8" }).trim();
  ts = requireFromHere(path.join(globalRoot, "typescript", "lib", "typescript.js"));
}

const root = process.cwd();

function loadTypeScriptModule(relativePath, imports = {}) {
  const fileName = path.join(root, relativePath);
  const source = fs.readFileSync(fileName, "utf8");
  const output = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });

  const syntaxErrors = (output.diagnostics ?? []).filter(
    (item) => item.category === ts.DiagnosticCategory.Error,
  );
  if (syntaxErrors.length > 0) {
    throw new Error(
      syntaxErrors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"),
    );
  }

  const module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    require(specifier) {
      if (Object.hasOwn(imports, specifier)) {
        return imports[specifier];
      }
      throw new Error(`Unexpected runtime import ${specifier} from ${relativePath}`);
    },
    console,
    process,
    URL,
    Intl,
    Date,
    Math,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Array,
    Map,
    Set,
    JSON,
  });

  vm.runInContext(output.outputText, context, { filename: fileName });
  return module.exports;
}

const timing = loadTypeScriptModule("src/lib/activity/pp1/activityTiming.ts");

class ActorContextError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const rulesModule = loadTypeScriptModule(
  "src/lib/calendar/aiInterpretationRules.server.ts",
  {
    "../../../lib/actor-context": {
      ActorContextError,
      resolveActiveActorContext: async () => null,
    },
    "../../../lib/auth0": {
      auth0: { getSession: async () => null },
    },
    "../../../lib/supabase": {
      supabase: {},
    },
    "@/lib/activity/pp1/activityTiming": timing,
  },
);

const now = new Date("2026-07-28T08:00:00Z");
const baseRules = {
  locale: "ru",
  effectiveText: 'КОГДА "рыбалка" => НАЗВАНИЕ "Рыбалка"; БЛИЖАЙШЕЕ воскресенье 09:00-12:00; ЦЕЛЬ "Рыбалка по воскресеньям"\n',
  customText: null,
  systemDefaultText: "",
  source: "test_override",
  fallbackLocale: null,
  ruleVersion: null,
  updatedAt: null,
};

const fixtures = [
  {
    name: "01_russian_shortcut_next_sunday",
    run() {
      const result = rulesModule.applyCalendarAiRuleShortcut({
        rawText: "рыбалка",
        rules: baseRules,
        temporalDirection: "future",
        now,
      });
      return Boolean(
        result &&
        result.title === "Рыбалка" &&
        result.timingDraft.scheduleModeCode === "exact" &&
        result.timingDraft.startedAtLocal === "2026-08-02T09:00" &&
        result.timingDraft.endedAtLocal === "2026-08-02T12:00" &&
        result.timingDraft.durationMinutes === "180" &&
        result.targetTitles[0] === "Рыбалка по воскресеньям"
      );
    },
  },
  {
    name: "02_explicit_interval_wins",
    run() {
      const result = rulesModule.applyCalendarAiRuleShortcut({
        rawText: "рыбалка 30 июля с 18:00 до 18:45",
        rules: baseRules,
        temporalDirection: "future",
        now,
      });
      return Boolean(
        result &&
        result.timingDraft.startedAtLocal === "2026-07-30T18:00" &&
        result.timingDraft.endedAtLocal === "2026-07-30T18:45" &&
        result.timingDraft.durationMinutes === "45"
      );
    },
  },
  {
    name: "03_explicit_date_rule_time_fills_gap",
    run() {
      const result = rulesModule.applyCalendarAiRuleShortcut({
        rawText: "рыбалка 30 июля",
        rules: baseRules,
        temporalDirection: "future",
        now,
      });
      return Boolean(
        result &&
        result.timingDraft.startedAtLocal === "2026-07-30T09:00" &&
        result.timingDraft.endedAtLocal === "2026-07-30T12:00"
      );
    },
  },
  {
    name: "04_comment_is_not_active_rule",
    run() {
      const result = rulesModule.applyCalendarAiRuleShortcut({
        rawText: "рыбалка",
        rules: { ...baseRules, effectiveText: `# ${baseRules.effectiveText}` },
        temporalDirection: "future",
        now,
      });
      return result === null;
    },
  },
  {
    name: "05_no_match",
    run() {
      const result = rulesModule.applyCalendarAiRuleShortcut({
        rawText: "репетиция",
        rules: baseRules,
        temporalDirection: "future",
        now,
      });
      return result === null;
    },
  },
  {
    name: "06_polish_aliases",
    run() {
      const result = rulesModule.applyCalendarAiRuleShortcut({
        rawText: "wędkowanie",
        rules: {
          ...baseRules,
          locale: "pl",
          effectiveText: 'GDY "wędkowanie" => TYTUŁ "Wędkowanie"; NAJBLIŻSZA niedziela 07:30-10:00; CEL "Niedzielne wędkowanie"\n',
        },
        temporalDirection: "future",
        now,
      });
      return Boolean(
        result &&
        result.title === "Wędkowanie" &&
        result.timingDraft.startedAtLocal === "2026-08-02T07:30" &&
        result.timingDraft.durationMinutes === "150"
      );
    },
  },
  {
    name: "07_overnight_interval",
    run() {
      const result = rulesModule.applyCalendarAiRuleShortcut({
        rawText: "ночная смена",
        rules: {
          ...baseRules,
          effectiveText: 'КОГДА "ночная смена" => НАЗВАНИЕ "Ночная смена"; БЛИЖАЙШАЯ суббота 22:00-02:00\n',
        },
        temporalDirection: "future",
        now,
      });
      return Boolean(
        result &&
        result.timingDraft.startedAtLocal === "2026-08-01T22:00" &&
        result.timingDraft.endedAtLocal === "2026-08-02T02:00" &&
        result.timingDraft.durationMinutes === "240"
      );
    },
  },
];

let passed = 0;
for (const fixture of fixtures) {
  const ok = fixture.run();
  console.log(`${ok ? "PASS" : "FAIL"} ${fixture.name}`);
  if (ok) {
    passed += 1;
  }
}

console.log(`RESULT ${passed}/${fixtures.length}`);
if (passed !== fixtures.length) {
  process.exitCode = 1;
}
