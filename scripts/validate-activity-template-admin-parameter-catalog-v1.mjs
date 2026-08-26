import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }
function check(name, condition, detail = "") { checks.push({ name, passed: Boolean(condition), detail }); }
function has(relative, pattern) { return pattern.test(read(relative)); }

const files = [
  "src/app/activity-templates/page.tsx",
  "src/app/activity-templates/activity-template-impact-profile-editor.tsx",
  "src/app/activity-templates/activity-parameter-admin-catalog.tsx",
  "src/app/api/activity-template-impact-profiles/route.ts",
  "src/app/api/activity-template-impact-profiles/catalog/route.ts",
  "src/app/api/activity-template-impact-profiles/[id]/route.ts",
  "src/app/api/admin/activity-parameter-definitions/route.ts",
  "src/lib/activity/activity-parameter-presentation.ts",
  "src/components/app-shell/global-navigation.tsx",
  "docs/recovery/ARCTOR_ACTIVITY_TEMPLATE_ADMIN_PARAMETER_CATALOG_V1_RU.md",
];
for (const file of files) check(`FILE_EXISTS:${file}`, fs.existsSync(path.join(root, file)));

check("PAGE_ADMIN_GUARD", has(files[0], /requirePlatformAdmin\(\)/));
check("PAGE_FAIL_CLOSED", has(files[0], /if \(!guard\.ok\) notFound\(\)/));
check("MAIN_API_ADMIN_GET", has(files[3], /export async function GET\(\)[\s\S]*?requirePlatformAdmin\(\)/));
check("MAIN_API_ADMIN_POST", has(files[3], /export async function POST[\s\S]*?requirePlatformAdmin\(\)/));
check("CATALOG_API_ADMIN", has(files[4], /requirePlatformAdmin\(\)/));
check("DETAIL_API_ADMIN", (read(files[5]).match(/requirePlatformAdmin\(\)/g) ?? []).length >= 2);

const adminApi = read(files[6]);
check("ADMIN_PARAMETER_GET", /export async function GET\(\)/.test(adminApi));
check("ADMIN_PARAMETER_POST", /export async function POST\(request: Request\)/.test(adminApi));
check("ADMIN_PARAMETER_PUT", /export async function PUT\(request: Request\)/.test(adminApi));
check("ADMIN_PARAMETER_NO_DELETE", !/export async function DELETE/.test(adminApi));
check("ADMIN_PARAMETER_CODE_GENERATED", /generateUniqueParameterCode/.test(adminApi));
check("ADMIN_PARAMETER_CODE_IMMUTABLE", /parameter_code is immutable after creation/.test(adminApi));
check("ADMIN_PARAMETER_SCOPE_SYSTEM", /scope_code: "system"/.test(adminApi));
check("ADMIN_PARAMETER_SEMANTIC_LOCK", /PARAMETER_SEMANTICS_LOCKED_AFTER_USE/.test(adminApi));
check("ADMIN_PARAMETER_USAGE_VALUE_OBJECT", /value_object_parameter_assignments/.test(adminApi));
check("ADMIN_PARAMETER_USAGE_TEMPLATE", /activity_template_profile_parameters_v2/.test(adminApi));
check("ADMIN_PARAMETER_STATUS_ONLY_SUPPORTED", /STATUS_CODES/.test(adminApi) && /active/.test(adminApi) && /retired/.test(adminApi));
check("ADMIN_PARAMETER_NO_PROCESS_COUNT", /neq\("parameter_code", "process_count"\)/.test(adminApi));
check("ADMIN_PARAMETER_TECH_CODE_REGEX", /\^\[a-z\]\[a-z0-9_\]/.test(adminApi));

const nav = read(files[8]);
check("NAV_ADMIN_CAN_EDIT_STATE", /adminCanEdit/.test(nav));
check("NAV_ACTIVITY_TEMPLATE_ADMIN_CHILD", /adminCanEdit \? \([\s\S]*navigation\.typicalActivities[\s\S]*\/activity-templates/.test(nav));
const activityJournalPart = nav.slice(nav.indexOf('label={t("navigation.activityJournal")}'));
check("NAV_ACTIVITY_TEMPLATE_REMOVED_FROM_JOURNAL", (activityJournalPart.match(/navigation\.typicalActivities/g) ?? []).length === 0);

const editor = read(files[1]);
check("EDITOR_LEAF_PRIMARY_SEARCH", /level: "leaf"/.test(editor));
check("EDITOR_ALL_LEVEL_DIAGNOSTIC_SEARCH", /level: "all"/.test(editor));
check("EDITOR_NON_LEAF_DIAGNOSTIC", /nonLeafResults/.test(editor) && /copy\.nonLeafOnly/.test(editor));
check("EDITOR_ADMIN_CATALOG_RENDER", /<ActivityParameterAdminCatalog locale=\{locale\}/.test(editor));
check("EDITOR_PARAMETER_PRESENTATION", /getActivityParameterPresentation/.test(editor));
check("EDITOR_UNIT_PRESENTATION", /getActivityUnitLabel/.test(editor));
check("EDITOR_NO_PROCESS_COUNT", !/process_count/.test(editor));
check("EDITOR_NO_CATEGORY_INPUT", !/templateGroup|categoryCode|categoryInput/.test(editor));

const presentation = read(files[7]);
for (const locale of ["en", "pl", "ru", "uk", "de", "es", "cs"]) {
  check(`PRESENTATION_LOCALE:${locale}`, new RegExp(`\\b${locale}:`).test(presentation));
}
check("PRESENTATION_SEED_DURATION", /"duration":/.test(presentation));
check("PRESENTATION_GSR_MEAL", /"meal_label":/.test(presentation));
check("PRESENTATION_UNITS", /UNIT_LABELS/.test(presentation));

const adminUi = read(files[2]);
check("ADMIN_UI_CREATE", /New parameter|Новый параметр|Nowy parametr/.test(adminUi));
check("ADMIN_UI_CODE_READONLY", /generatedCode/.test(adminUi) && /parameterCode/.test(adminUi));
check("ADMIN_UI_DEACTIVATE", /toggleStatus/.test(adminUi));
check("ADMIN_UI_SEMANTIC_LOCK", /semanticLocked/.test(adminUi));
check("ADMIN_UI_EVENT_RELOAD", /arctor:activity-parameter-catalog-changed/.test(adminUi));

const total = checks.length;
const passed = checks.filter((item) => item.passed).length;
const failed = total - passed;
const output = { release: "ARCTOR_ACTIVITY_TEMPLATE_ADMIN_PARAMETER_CATALOG_V1", total, passed, failed, allPass: failed === 0, checks };
console.log(JSON.stringify(output, null, 2));
if (failed > 0) process.exit(1);
