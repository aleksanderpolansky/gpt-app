import fs from "node:fs";
import path from "node:path";

const repo = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const migration = path.join(
  repo,
  "supabase/migrations/20260930124500_ai_billing_b1_admin_balance_rpc_ambiguity_fix.sql",
);

function fail(message) {
  console.error(`VALIDATOR_FAIL=${message}`);
  process.exit(1);
}

if (!fs.existsSync(migration)) fail("MIGRATION_MISSING");

const sql = fs.readFileSync(migration, "utf8");

const checks = [
  ["CREATE_OR_REPLACE_RPC", /create or replace function public\.admin_set_ai_available_eur_v1\s*\(/i],
  ["VARIABLE_CONFLICT_GUARD", /#variable_conflict use_column/i],
  ["ON_CONSTRAINT", /on conflict on constraint ai_credit_wallets_app_user_unique do nothing;/i],
  ["ALIASED_WALLET_SELECT", /from public\.ai_credit_wallets as acw[\s\S]*where acw\.app_user_id = p_target_app_user_id/i],
  ["ALIASED_WALLET_UPDATE", /update public\.ai_credit_wallets as acw[\s\S]*where acw\.id = v_wallet\.id;/i],
  ["MANUAL_ADJUSTMENT", /'manual_adjustment'/i],
  ["SERVICE_ROLE_GRANT", /grant execute on function public\.admin_set_ai_available_eur_v1[\s\S]*to service_role;/i],
  ["NO_DATA_REWRITE", /dataRowsModifiedByMigration'[\s\S]*0/i],
  ["TRANSACTION_BEGIN", /^begin;/im],
  ["TRANSACTION_COMMIT", /^commit;/im],
];

let passed = 0;
for (const [name, regex] of checks) {
  if (!regex.test(sql)) fail(name);
  console.log(`${name}=PASS`);
  passed += 1;
}

for (const [index, line] of sql.split(/\r?\n/).entries()) {
  if (/[ \t]+$/.test(line)) fail(`TRAILING_WHITESPACE_LINE_${index + 1}`);
}

console.log(`VALIDATOR=PASS_${passed}_${checks.length}`);
