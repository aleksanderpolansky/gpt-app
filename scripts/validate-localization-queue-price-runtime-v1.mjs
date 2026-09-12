import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}
function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
}

const localization = read("src/lib/localization/contentLocalization.server.ts");
const objectBootstrap = read("src/app/api/admin/reality-curator/signals/object-bootstrap/route.ts");
const queue = read("src/lib/reality-core/global-system-value-object-localization.server.ts");
const nav = read("src/components/app-shell/global-navigation.tsx");
const config = read("lib/ai/openaiConfig.ts");
const organization = read("lib/organizations/organizationSemanticIntake.ts");
const vercel = read("vercel.json");
const basic = read("src/lib/activity/activity-basic-intake-analysis.server.ts");
const matcher = read("src/lib/activity/typical-activity-template-matcher.server.ts");
const review = read("src/lib/ai/activitySemanticReviewA31.server.ts");

check("LOCALIZATION_MODEL_FROM_CATALOG", localization.includes("getNavigatorModelDefinition") && !localization.includes('.from("ai_model_tiers")'));
check("LOCALIZATION_PRICE_ENSURE", localization.includes("ensureNavigatorPriceSnapshotV1"));
check("OBJECT_INSERTS_PENDING_LOCALIZATION", objectBootstrap.includes("createPendingCanonicalSystemValueObjectLocalizationV1") && objectBootstrap.includes('localizationState: "pending"'));
check("OBJECT_LOCALIZATION_FAILURE_NON_BLOCKING", objectBootstrap.includes("attemptCuratorSystemValueObjectLocalizationV1"));
check("PERSISTENT_QUEUE_STATES", ["pending", "retrying", "blocked", "complete"].every((item) => queue.includes(`\"${item}\"`)));
check("QUEUE_ADMIN_API", fs.existsSync(path.join(root, "src/app/api/admin/localization-jobs/route.ts")));
check("QUEUE_ADMIN_UI", fs.existsSync(path.join(root, "src/app/admin/localization-jobs/page.tsx")));
check("QUEUE_NAV_LINK", nav.includes("/admin/localization-jobs") && nav.includes("pendingLocalizationCount"));
check("MAINTENANCE_CRON", vercel.includes("/api/maintenance/localization") && fs.existsSync(path.join(root, "src/app/api/maintenance/localization/route.ts")));
check("CENTRAL_PRICE_RUNTIME", fs.existsSync(path.join(root, "lib/ai/navigatorPriceSnapshot.server.ts")));
check("BASIC_INTAKE_PRICE_ENSURE", basic.includes("ensureNavigatorPriceSnapshotV1"));
check("TEMPLATE_MATCHER_CENTRAL_MODEL_PRICE", matcher.includes("getNavigatorModelDefinition") && matcher.includes("ensureNavigatorPriceSnapshotV1") && !matcher.includes('.from("ai_model_tiers")'));
check("SEMANTIC_REVIEW_CENTRAL_MODEL_PRICE", review.includes("getNavigatorModelDefinition") && review.includes("ensureNavigatorPriceSnapshotV1") && !review.includes('.from("ai_model_tiers")'));
check("OPENAI_CONFIG_NO_MODEL_ENV", !config.includes("process.env.OPENAI_DEFAULT_MODEL") && !config.includes("process.env.OPENAI_MAX_OUTPUT_TOKENS") && !config.includes("process.env.OPENAI_TEMPERATURE"));
check("ORGANIZATION_NO_SEMANTIC_MODEL_ENV", !organization.includes("OPENAI_SEMANTIC_MODEL") && organization.includes("getNavigatorModelDefinition"));

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`FAILED ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`PASS ${checks.length}/${checks.length}`);
