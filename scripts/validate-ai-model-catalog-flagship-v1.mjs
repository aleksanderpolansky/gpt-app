import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  platform: path.join(root, "lib/ai/platformModelCatalog.ts"),
  navigator: path.join(root, "lib/ai/navigatorModelCatalog.ts"),
  priceRuntime: path.join(root, "lib/ai/navigatorPriceSnapshot.server.ts"),
  apiTest: path.join(root, "src/app/api/test/route.ts"),
  provider: path.join(
    root,
    "src/components/app-shell/ai-navigator-provider.tsx",
  ),
  navigatorUi: path.join(
    root,
    "src/components/app-shell/global-ai-navigator.tsx",
  ),
  dashboard: path.join(
    root,
    "src/components/figma-dashboard/figma-dashboard.tsx",
  ),
  catalogRoute: path.join(root, "src/app/api/ai/model-catalog/route.ts"),
  migration: path.join(
    root,
    "supabase/migrations/20260930174500_ai_model_catalog_flagship_v1.sql",
  ),
};

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`MISSING_FILE:${path.relative(root, file)}`);
  }

  return fs.readFileSync(file, "utf8");
}

const platform = read(files.platform);
const navigator = read(files.navigator);
const priceRuntime = read(files.priceRuntime);
const apiTest = read(files.apiTest);
const provider = read(files.provider);
const navigatorUi = read(files.navigatorUi);
const dashboard = read(files.dashboard);
const catalogRoute = read(files.catalogRoute);
const migration = read(files.migration);

const checks = [
  [
    "CANONICAL_PLATFORM_CATALOG",
    platform.includes("ARCTOR_AI_MODEL_CATALOG_V2_20260930") &&
      platform.includes('modelName: "gpt-5.6-luna"') &&
      platform.includes('modelName: "gpt-5.6-terra"') &&
      platform.includes('modelName: "gpt-5.6-sol"') &&
      platform.includes('modelName: "gpt-6-astra"'),
  ],
  [
    "ASTRA_OFFICIAL_PRICES",
    platform.includes("inputUsdPer1m: 10") &&
      platform.includes("cachedInputUsdPer1m: 1") &&
      platform.includes("outputUsdPer1m: 50"),
  ],
  [
    "ASTRA_FLAGSHIP_VISIBLE_IN_NAVIGATOR",
    platform.includes('flagship: true') &&
      platform.includes('navigator: true'),
  ],
  [
    "CHANNELS_NOT_ENABLED_BEFORE_GATEWAY",
    platform.includes('aiChannels: false'),
  ],
  [
    "NAVIGATOR_WRAPS_CANONICAL_CATALOG",
    navigator.includes('from "./platformModelCatalog"') &&
      navigator.includes("getPublicArctorAiModelCatalog"),
  ],
  [
    "MAX_TIER_PRICE_RUNTIME",
    priceRuntime.includes('value === "max"'),
  ],
  [
    "MAX_TIER_API_TEST",
    apiTest.includes('"max",') &&
      apiTest.includes("const ALLOWED_TIERS"),
  ],
  [
    "RIGHT_RAIL_ASTRA_FALLBACK",
    provider.includes('tierCode: "max"') &&
      provider.includes('modelName: "gpt-6-astra"') &&
      provider.includes('displayName: "GPT-6 Astra"'),
  ],
  [
    "RIGHT_RAIL_ACCEPTS_FOUR_MODELS",
    provider.includes('item.tierCode === "max"') &&
      provider.includes("if (models.length >= 4)"),
  ],
  [
    "RIGHT_RAIL_REAL_MODEL_LABELS",
    navigatorUi.includes('tier.displayName.replace(/^GPT-/i, "")') &&
      navigatorUi.includes('tier.frontier ? "Flagship · Max" : tier.caption') &&
      navigatorUi.includes("grid grid-cols-2"),
  ],
  [
    "DASHBOARD_NO_ABSTRACT_TIERS",
    !dashboard.includes('return "Nano"') &&
      !dashboard.includes('return "Standard"') &&
      !dashboard.includes('return "Pro"') &&
      !dashboard.includes('["nano", "standard", "pro"].includes'),
  ],
  [
    "DASHBOARD_REAL_MODEL_DETAILS",
    dashboard.includes("getModelDisplayName") &&
      dashboard.includes("getModelDetailsLabel") &&
      dashboard.includes("detailsOpen") &&
      dashboard.includes("sortedRows[sortedRows.length - 1]"),
  ],
  [
    "PUBLIC_CATALOG_V2",
    catalogRoute.includes("ARCTOR_NAVIGATOR_MODEL_CATALOG_V2") &&
      catalogRoute.includes(
        'selectionPolicy: "server_approved_model_catalog_with_flagship"',
      ),
  ],
  [
    "DB_MAX_CONSTRAINT",
    migration.includes(
      "check (tier_code in ('nano','standard','pro','max'))",
    ),
  ],
  [
    "DB_REAL_USER_FACING_NAMES",
    migration.includes("'GPT-5.6 Luna'") &&
      migration.includes("'GPT-5.6 Terra'") &&
      migration.includes("'GPT-5.6 Sol'") &&
      migration.includes("'GPT-6 Astra'"),
  ],
  [
    "DB_ASTRA_ACTIVE_PRICE",
    migration.includes("'gpt-6-astra'") &&
      migration.includes("10.00000000::numeric") &&
      migration.includes("1.00000000::numeric") &&
      migration.includes("50.00000000::numeric"),
  ],
];

let passed = 0;

for (const [name, ok] of checks) {
  if (ok) {
    passed += 1;
    console.log(`${name}=PASS`);
  } else {
    console.error(`${name}=FAIL`);
  }
}

console.log(
  `VALIDATOR=${passed === checks.length ? "PASS" : "FAIL"}_${passed}_${checks.length}`,
);

if (passed !== checks.length) {
  process.exit(1);
}
