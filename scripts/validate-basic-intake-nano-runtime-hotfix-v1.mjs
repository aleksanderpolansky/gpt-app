import fs from "node:fs";
import path from "node:path";

const checks = [];
function check(name, passed, detail = "") {
  checks.push({ name, passed: Boolean(passed), detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` ${detail}` : ""}`);
}

function read(relativePath) {
  const file = path.resolve(process.cwd(), relativePath);
  check(`FILE_EXISTS:${relativePath}`, fs.existsSync(file));
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function textHygiene(relativePath, content) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const trailing = lines.findIndex((line) => /[ \t]+$/.test(line));
  check(`TEXT_NO_TRAILING_WHITESPACE:${relativePath}`, trailing < 0, trailing >= 0 ? `line=${trailing + 1}` : "");
  check(
    `TEXT_SINGLE_FINAL_NEWLINE:${relativePath}`,
    content.endsWith("\n") && !content.endsWith("\n\n"),
  );
}

const validatorPath = "scripts/validate-basic-intake-nano-runtime-hotfix-v1.mjs";
const recoveryPath = "docs/recovery/ARCTOR_BASIC_INTAKE_NANO_RUNTIME_HOTFIX_V1_RU.md";
const evidencePath = "docs/recovery/evidence/HELP_FILES/ARCTOR_BASIC_INTAKE_NANO_RUNTIME_HOTFIX_V1_EVIDENCE.json";

const validator = read(validatorPath);
const recovery = read(recoveryPath);
const evidence = read(evidencePath);
for (const [file, content] of [
  [validatorPath, validator],
  [recoveryPath, recovery],
  [evidencePath, evidence],
]) {
  textHygiene(file, content);
}

check("RECOVERY_RELEASE_ID", recovery.includes("ARCTOR_BASIC_INTAKE_NANO_RUNTIME_HOTFIX_V1"));
check("RECOVERY_NO_DB_CHANGE", recovery.includes("DB schema change: NONE"));
check("RECOVERY_NO_CO_NO_TEMPLATE_MATCH", recovery.includes("нет связанного ЦО/ОН"));
check("RECOVERY_PARAMETERS_STILL_ANALYZED", recovery.includes("параметры всё равно извлекаются"));
check("EVIDENCE_NO_PROD_READ", evidence.includes('"productionSupabaseRead": false'));
check("EVIDENCE_BASELINE", evidence.includes("35fe99e40b19e4364dba875aee8ead78f1b5dd2b"));

const analyzerPath = "src/lib/activity/activity-basic-intake-analysis.server.ts";
if (fs.existsSync(path.resolve(process.cwd(), analyzerPath))) {
  const analyzer = read(analyzerPath);
  check("ANALYZER_CATALOG_IMPORT", analyzer.includes("getNavigatorModelDefinition"));
  check("ANALYZER_CATALOG_RESOLUTION", analyzer.includes("getNavigatorModelDefinition(MODEL_TIER)"));
  check("ANALYZER_NO_AI_MODEL_TIERS_READ", !analyzer.includes('.from("ai_model_tiers")'));
  check("ANALYZER_PROFILE_GATE", analyzer.includes('.from("activity_template_impact_profiles_v1")'));
  check("ANALYZER_OBJECT_LINK_GATE", analyzer.includes('.from("activity_template_profile_object_links_v1")'));
  check("ANALYZER_PREFILTER_LIMIT", analyzer.includes("MAX_CANDIDATES_PREFILTERED = 96"));
  check("ANALYZER_NO_FACT_WRITE", analyzer.includes("factsWritten: 0"));
  check("ANALYZER_NO_AUTO_TEMPLATE_BIND", analyzer.includes("automaticTemplateBinding: false"));
  check("ANALYZER_ONE_PROVIDER_CALL", analyzer.includes("providerCalls: 1"));
  check("ANALYZER_SAFE_FALLBACK_RETAINED", analyzer.includes('analysisMode: "safe_server_fallback"'));
} else {
  check("PACKAGE_MODE_ANALYZER_CHECK_DEFERRED", true);
}

const passed = checks.filter((item) => item.passed).length;
const failed = checks.length - passed;
console.log(`SUMMARY total=${checks.length} passed=${passed} failed=${failed}`);
if (failed > 0) process.exit(1);
