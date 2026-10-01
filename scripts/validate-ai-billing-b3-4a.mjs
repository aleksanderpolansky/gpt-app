import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  server: "src/lib/ai-channels/server.ts",
  contracts: "src/lib/ai-channels/contracts.ts",
  policy: "src/lib/ai-channels/billingPolicy.server.ts",
  migration: "supabase/migrations/20261001193000_ai_billing_b3_4a_channel_billing_owner.sql",
};

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`B3_4A_VALIDATOR_FILE_MISSING:${rel}`);
  }
  return fs.readFileSync(full, "utf8");
}

const server = read(files.server);
const contracts = read(files.contracts);
const policy = read(files.policy);
const migration = read(files.migration);

const checks = [
  [
    "CENTRAL_PLATFORM_OWNER_EMAIL",
    policy.includes(
      'PLATFORM_AI_CHANNEL_BILLING_OWNER_EMAIL =\n  "aleksanderpolansky@gmail.com"',
    ),
  ],
  [
    "CREATION_ADMIN_TO_PLATFORM_OWNER",
    policy.includes('billingPolicy: "platform_owner"') &&
      policy.includes("await platformBillingOwnerUserId()"),
  ],
  [
    "CREATION_USER_TO_SELF",
    policy.includes('billingPolicy: "creator"') &&
      policy.includes("billingUserId: who.user"),
  ],
  [
    "STORED_CREATOR_POLICY_VALIDATED",
    policy.includes('billingPolicy === "creator"') &&
      policy.includes("billingUserId !== ownerUserId"),
  ],
  [
    "STORED_PLATFORM_POLICY_VALIDATED",
    policy.includes('billingPolicy === "platform_owner"') &&
      policy.includes("billingUserId !== platformOwnerUserId"),
  ],
  [
    "CONTRACT_HAS_DURABLE_FIELDS",
    contracts.includes("billing_policy:ChannelBillingPolicy") &&
      contracts.includes("billing_user_id:string"),
  ],
  [
    "CREATION_ACCESS_RESOLVES_PAYER",
    server.includes("resolveAiChannelCreationBillingUser(who)") &&
      server.includes(".eq('app_user_id',billingUserId)"),
  ],
  [
    "RUNTIME_RESOLVES_STORED_PAYER",
    server.includes("resolveStoredAiChannelBillingUser(c)"),
  ],
  [
    "RUN_PRESTART_GUARD",
    server.indexOf("await resolveStoredAiChannelBillingUser(c);") >= 0 &&
      server.indexOf("await resolveStoredAiChannelBillingUser(c);") <
        server.indexOf("channelCommand(who,'start',id"),
  ],
  [
    "BACKGROUND_GATEWAY_USES_RESOLVED_PAYER",
    server.includes("billingUserId:channelBilling.billingUserId"),
  ],
  [
    "RUN_BIND_USES_RESOLVED_PAYER",
    server.includes(
      "bindRunBilling(c,r,channelBilling.billingUserId,billing)",
    ),
  ],
  [
    "PROVIDER_BIND_USES_RESOLVED_PAYER",
    server.includes(
      "bindProviderBilling(c,r,channelBilling.billingUserId,start,usage)",
    ),
  ],
  [
    "NO_RUNTIME_OWNER_AS_PAYER",
    !server.includes("billingUserId:c.owner_user_id") &&
      !server.includes("p_billing_user_id:c.owner_user_id"),
  ],
  [
    "CHANNEL_BILLING_METADATA_PRESENT",
    server.includes("channelBillingPolicy:channelBilling.billingPolicy") &&
      server.includes("channelBillingUserId:channelBilling.billingUserId"),
  ],
  [
    "MIGRATION_ADDS_CHANNEL_BILLING_FIELDS",
    migration.includes("add column if not exists billing_policy text") &&
      migration.includes("add column if not exists billing_user_id uuid"),
  ],
  [
    "MIGRATION_BACKFILLS_EXISTING_CHANNELS",
    migration.includes("update public.ai_channels_v1 c") &&
      migration.includes("then 'platform_owner'") &&
      migration.includes("else 'creator'"),
  ],
  [
    "INSERT_TRIGGER_ASSIGNMENT",
    migration.includes("assign_ai_channel_billing_owner_v1") &&
      migration.includes("before insert on public.ai_channels_v1"),
  ],
  [
    "DB_ADMIN_POLICY_FIXED_OWNER",
    migration.includes(
      "lower(email)=lower('aleksanderpolansky@gmail.com')",
    ) &&
      migration.includes("new.billing_policy := 'platform_owner'"),
  ],
  [
    "DB_USER_POLICY_CREATOR",
    migration.includes("new.billing_policy := 'creator'") &&
      migration.includes("new.billing_user_id := new.owner_user_id"),
  ],
  [
    "BIND_RUN_CHECKS_BILLING_USER_COLUMN",
    migration.includes(
      "v_channel.billing_user_id <> p_billing_user_id",
    ),
  ],
  [
    "BIND_PROVIDER_CHECKS_BILLING_USER_COLUMN",
    migration.includes(
      "v_channel.billing_user_id<>p_billing_user_id",
    ),
  ],
  [
    "NO_HISTORICAL_RUN_REBILL_DECLARED",
    migration.includes("'historicalRunsRewrittenByMigration',0"),
  ],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${name}=${ok ? "PASS" : "FAIL"}`);
  if (ok) passed += 1;
}

console.log(
  `B3_4A_VALIDATOR=${passed === checks.length ? "PASS" : "FAIL"}_${passed}_${checks.length}`,
);

if (passed !== checks.length) {
  process.exit(1);
}
