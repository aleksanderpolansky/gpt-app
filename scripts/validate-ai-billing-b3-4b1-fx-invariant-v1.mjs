import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const RUNTIME = "src/lib/ai-billing/runtime.ts";
const NAV_PRICE = "lib/ai/navigatorPriceSnapshot.server.ts";
const MODEL_CATALOG = "lib/ai/platformModelCatalog.ts";
const MIGRATION =
  "supabase/migrations/20261001200000_ai_billing_b3_4b1_active_price_fx_invariant.sql";

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`B3_4B1_FX_VALIDATOR_FILE_MISSING:${rel}`);
  }
  return fs.readFileSync(full, "utf8");
}

const runtime = read(RUNTIME);
const navPrice = read(NAV_PRICE);
const catalog = read(MODEL_CATALOG);
const migration = read(MIGRATION);

const checks = [
  [
    "RUNTIME_REJECTS_ACTIVE_USD_SNAPSHOT_WITHOUT_FX",
    runtime.includes("AI_BILLING_ACTIVE_PRICE_SNAPSHOT_FX_MISSING") &&
      runtime.includes('pricingCurrency === "USD"') &&
      runtime.includes("usdToEurRate === null || usdToEurRate <= 0"),
  ],
  [
    "NAVIGATOR_FRESH_SNAPSHOT_REQUIRES_BILLING_FX",
    navPrice.includes("currentHasBillingFx") &&
      navPrice.includes("current &&") &&
      navPrice.includes("currentHasBillingFx &&"),
  ],
  [
    "NAVIGATOR_INSERT_REQUIRES_POSITIVE_FX",
    navPrice.includes("NAVIGATOR_PRICE_POSITIVE_USD_TO_EUR_RATE_REQUIRED") &&
      navPrice.includes("NAVIGATOR_PRICE_POSITIVE_EUR_MARKUP_REQUIRED"),
  ],
  [
    "NAVIGATOR_SYNC_COVERS_FOUR_CATALOG_TIERS",
    navPrice.includes('["nano", "standard", "pro", "max"] as const'),
  ],
  [
    "CATALOG_SOL_PRICE_IS_CURRENT_CANONICAL",
    catalog.includes('modelName: "gpt-5.6-sol"') &&
      catalog.includes("inputUsdPer1m: 4") &&
      catalog.includes("cachedInputUsdPer1m: 0.4") &&
      catalog.includes("outputUsdPer1m: 20"),
  ],
  [
    "MIGRATION_REPAIRS_SOL_TO_CURRENT_PRICE",
    migration.includes("'gpt-5.6-sol'") &&
      migration.includes("4.00000000") &&
      migration.includes("0.40000000") &&
      migration.includes("20.00000000"),
  ],
  [
    "MIGRATION_PRESERVES_HISTORICAL_STALE_ROW",
    migration.includes("is_active=false") &&
      migration.includes("replace_with_current_canonical_sol_price_and_positive_fx"),
  ],
  [
    "MIGRATION_REQUIRES_POSITIVE_ACTIVE_FX",
    migration.includes(
      "ai_model_price_snapshots_active_usd_eur_requires_fx",
    ) &&
      migration.includes("usd_to_eur_rate is not null") &&
      migration.includes("usd_to_eur_rate > 0"),
  ],
  [
    "MIGRATION_DOES_NOT_TOUCH_WALLET_LEDGER_USAGE",
    !/\b(?:insert\s+into|update|delete\s+from)\s+public\.ai_credit_wallets\b/i.test(
      migration,
    ) &&
      !/\b(?:insert\s+into|update|delete\s+from)\s+public\.ai_credit_ledger\b/i.test(
        migration,
      ) &&
      !/\b(?:insert\s+into|update|delete\s+from)\s+public\.ai_usage_events\b/i.test(
        migration,
      ),
  ],
  [
    "MIGRATION_NO_PROVIDER_CALL",
    migration.includes("No OpenAI provider call is made") &&
      !migration.includes("responses.create"),
  ],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${name}=${ok ? "PASS" : "FAIL"}`);
  if (ok) passed += 1;
}

console.log(
  `B3_4B1_FX_INVARIANT_VALIDATOR=${
    passed === checks.length ? "PASS" : "FAIL"
  }_${passed}_${checks.length}`,
);

if (passed !== checks.length) {
  process.exit(1);
}
