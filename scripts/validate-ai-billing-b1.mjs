import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  route: path.join(root, "src/app/api/admin/users/route.ts"),
  page: path.join(root, "src/app/admin/users/page.tsx"),
  runtime: path.join(root, "src/lib/ai-billing/runtime.ts"),
  migration: path.join(
    root,
    "supabase/migrations/20260930111500_ai_billing_b1_foundation.sql",
  ),
};

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`MISSING_FILE:${path.relative(root, file)}`);
  }
  return fs.readFileSync(file, "utf8");
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, read(file)]),
);

const checks = [
  ["route marker B1", source.route.includes("admin-users-billing-b1-v1")],
  [
    "route set balance action",
    source.route.includes('action === "set_ai_balance"'),
  ],
  [
    "route set available RPC",
    source.route.includes("admin_set_ai_available_eur_v1"),
  ],
  [
    "route lifetime summary RPC",
    source.route.includes("admin_get_ai_usage_lifetime_summary_v1"),
  ],
  [
    "route no 2000 limit on ai_usage_events",
    !/readRowsByUserIds<AiUsageRow>[\s\S]{0,500}"ai_usage_events"/.test(
      source.route,
    ),
  ],
  [
    "route lifetime input tokens",
    source.route.includes("totalAiInputTokens"),
  ],
  [
    "route lifetime cached tokens",
    source.route.includes("totalAiCachedInputTokens"),
  ],
  [
    "route lifetime output tokens",
    source.route.includes("totalAiOutputTokens"),
  ],
  [
    "route provider call count",
    source.route.includes("aiProviderCallCount"),
  ],
  [
    "route wallet debited lifetime",
    source.route.includes("totalAiWalletDebitedEur"),
  ],
  [
    "page editable ai state",
    source.page.includes("editingAiUserId"),
  ],
  [
    "page save AI balance",
    source.page.includes("saveAiBalance"),
  ],
  [
    "page posts set_ai_balance",
    source.page.includes('"set_ai_balance"'),
  ],
  [
    "page available token projection label",
    source.page.includes("≈ доступно при текущем AI EUR"),
  ],
  [
    "page usage input tokens",
    source.page.includes("totalAiInputTokens"),
  ],
  [
    "page usage cached tokens",
    source.page.includes("totalAiCachedInputTokens"),
  ],
  [
    "page usage output tokens",
    source.page.includes("totalAiOutputTokens"),
  ],
  [
    "runtime contract",
    source.runtime.includes("ARCTOR_AI_BILLING_B1_FOUNDATION_V1"),
  ],
  [
    "runtime cost calculator",
    source.runtime.includes("calculateAiUsageCostEur"),
  ],
  [
    "runtime wallet preflight",
    source.runtime.includes("requireAiWalletForEstimatedCost"),
  ],
  [
    "runtime settlement",
    source.runtime.includes("settleAiUsageDebit"),
  ],
  [
    "migration admin set function",
    source.migration.includes(
      "create or replace function public.admin_set_ai_available_eur_v1",
    ),
  ],
  [
    "migration lifetime summary",
    source.migration.includes(
      "create or replace function public.admin_get_ai_usage_lifetime_summary_v1",
    ),
  ],
  [
    "migration settlement",
    source.migration.includes(
      "create or replace function public.settle_ai_usage_debit_v1",
    ),
  ],
  [
    "migration service-role admin set grant",
    /grant execute on function public\.admin_set_ai_available_eur_v1[\s\S]*?to service_role;/m.test(
      source.migration,
    ),
  ],
  [
    "migration browser revoke",
    /revoke all on function public\.admin_set_ai_available_eur_v1[\s\S]*?from public, anon, authenticated;/m.test(
      source.migration,
    ),
  ],
  [
    "migration manual adjustment ledger",
    source.migration.includes("'manual_adjustment'"),
  ],
  [
    "migration ai usage ledger",
    source.migration.includes("'ai_usage'"),
  ],
  [
    "migration atomic transaction",
    source.migration.includes("begin;") &&
      source.migration.includes("commit;"),
  ],
  [
    "migration acceptance marker",
    source.migration.includes("ARCTOR_AI_BILLING_B1_FOUNDATION"),
  ],
];

const failures = checks.filter(([, passed]) => !passed);

for (const [name, passed] of checks) {
  process.stdout.write(`${passed ? "PASS" : "FAIL"} ${name}\n`);
}

if (failures.length) {
  process.stderr.write(
    `VALIDATOR=FAIL_${failures.length}_OF_${checks.length}\n`,
  );
  process.exit(1);
}

process.stdout.write(`VALIDATOR=PASS_${checks.length}_${checks.length}\n`);
