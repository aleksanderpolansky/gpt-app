import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  migration:
    "supabase/migrations/20261002140000_ai_provider_treasury_balance_snapshot.sql",
  route: "src/app/api/admin/openai-treasury/route.ts",
  component: "src/app/admin/users/OpenAiTreasuryCard.tsx",
  page: "src/app/admin/users/page.tsx",
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, rel]) => {
    const abs = path.join(root, rel);

    if (!fs.existsSync(abs)) {
      throw new Error(`MISSING_FILE:${rel}`);
    }

    return [key, fs.readFileSync(abs, "utf8")];
  }),
);

const checks = [];
const check = (name, pass) =>
  checks.push({ name, pass: Boolean(pass) });

check(
  "MIGRATION_TABLE_PRESENT",
  source.migration.includes("create table if not exists public.ai_provider_treasury_snapshots"),
);

check(
  "MIGRATION_RLS_SERVER_ONLY",
  source.migration.includes("enable row level security") &&
    source.migration.includes("revoke all") &&
    source.migration.includes("to service_role"),
);

check(
  "MIGRATION_INITIAL_USD_1_90",
  source.migration.includes("1.900000") &&
    source.migration.includes("OPENAI_DASHBOARD_MANUAL_SEED"),
);

check(
  "ROUTE_ADMIN_GUARD",
  source.route.includes("requirePlatformAdmin") &&
    source.route.includes('allowedRoles: ["owner", "admin", "viewer"]') &&
    source.route.includes('allowedRoles: ["owner", "admin"]'),
);

check(
  "ROUTE_NO_OPENAI_PROVIDER_CALL",
  !source.route.includes('from "openai"') &&
    !source.route.includes("new OpenAI(") &&
    !source.route.includes(".responses.create("),
);

check(
  "ROUTE_USES_APPROVED_BILLING_FX",
  source.route.includes('from("ai_model_price_snapshots")') &&
    source.route.includes("usd_to_eur_rate") &&
    source.route.includes("balanceUsd * fx.usdToEurRate"),
);

check(
  "ROUTE_EXCLUDES_OWNER_ALLOCATIONS",
  source.route.includes("ownerIds") &&
    source.route.includes("PROTECTED_OWNER_EMAILS") &&
    source.route.includes('admin.role === "owner"'),
);

check(
  "ROUTE_ALLOCATION_USES_BALANCE",
  source.route.includes("allocatedBalanceEur += balanceEur") &&
    source.route.includes("allocationUsesWalletBalanceNotAvailableBalance: true"),
);

check(
  "COMPONENT_SHOWS_REAL_PROVIDER_BALANCE",
  source.component.includes("Резерв OpenAI") &&
    source.component.includes("formatUsd(data?.providerBalance?.balanceUsd)"),
);

check(
  "COMPONENT_SHOWS_PROJECTED_REMAINDER",
  source.component.includes("Прогнозируемый остаток") &&
    source.component.includes("providerBalanceEur - forecastAllocatedAiEur"),
);

check(
  "COMPONENT_NEGATIVE_IS_RED",
  source.component.includes('text-red-400') &&
    source.component.includes("Расределено больше") === false &&
    source.component.includes("Распределено больше"),
);

check(
  "COMPONENT_MANUAL_DASHBOARD_DISCLOSURE",
  source.component.includes(
    "OpenAI не предоставляет документированный API Credit balance",
  ),
);

check(
  "PAGE_IMPORTS_TREASURY_CARD",
  source.page.includes(
    'import OpenAiTreasuryCard from "./OpenAiTreasuryCard";',
  ),
);

check(
  "PAGE_REPLACES_OLD_TOTAL_AI_CARD",
  source.page.includes("<OpenAiTreasuryCard") &&
    !source.page.includes("const totalAiAvailable = useMemo"),
);

check(
  "PAGE_LIVE_FORECAST_FROM_EDIT",
  source.page.includes("forecastAllocatedUserAiEur") &&
    source.page.includes("editingAiValue") &&
    source.page.includes("row.aiReservedEur"),
);

const failed = checks.filter((item) => !item.pass);

for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}`);
}

console.log(
  `SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`,
);

if (failed.length > 0) {
  console.error("AI_BILLING_B4_PROVIDER_TREASURY_VALIDATOR=FAIL");
  process.exit(1);
}

console.log("PROVIDER_BALANCE_CURRENCY=USD");
console.log("INTERNAL_ALLOCATION_CURRENCY=EUR");
console.log("OWNER_WALLETS_EXCLUDED=TRUE");
console.log("LIVE_DRAFT_FORECAST=TRUE");
console.log("NEGATIVE_FORECAST_RED=TRUE");
console.log("OFFICIAL_CREDIT_BALANCE_API_USED=FALSE");
console.log("AI_BILLING_B4_PROVIDER_TREASURY_VALIDATOR=PASS");
