import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`B3_1_1_V2_FILE_MISSING:${rel}`);
  return fs.readFileSync(full, "utf8");
}

const server = read("src/lib/ai-channels/server.ts");
const gateway = read("src/lib/ai-billing/gateway.server.ts");
const migration = read(
  "supabase/migrations/20261001121500_ai_billing_b3_1_1_operation_kind_fix.sql",
);

const checks = [
  [
    "RUNTIME_USES_AI_CHANNEL_OPERATION_KIND",
    server.includes("operationKind:'ai_channel'"),
  ],
  [
    "GATEWAY_TYPE_ALLOWS_AI_CHANNEL",
    gateway.includes('| "ai_channel"'),
  ],
  [
    "MIGRATION_TARGETS_OPERATION_KIND_CONSTRAINT",
    migration.includes("ai_usage_events_operation_kind_allowed"),
  ],
  [
    "MIGRATION_ADDS_AI_CHANNEL",
    migration.includes("'ai_channel'"),
  ],
  [
    "MIGRATION_PRESERVES_CONTENT_LOCALIZATION",
    migration.includes("'content_localization'"),
  ],
  [
    "MIGRATION_PRESERVES_FULL_KNOWN_SUPERSET",
    [
      "'chat_message'",
      "'activity_preview'",
      "'semantic_intake'",
      "'ai_channel'",
      "'admin_test'",
      "'other'",
      "'content_localization'",
    ].every((kind) => migration.includes(kind)),
  ],
  [
    "MIGRATION_REFUSES_UNKNOWN_LIVE_KINDS",
    migration.includes("UNEXPECTED_LIVE_OPERATION_KINDS") &&
      migration.includes("select distinct operation_kind"),
  ],
  [
    "MIGRATION_IDEMPOTENT",
    migration.includes("position('ai_channel' in v_definition)=0") &&
      migration.includes("position('content_localization' in v_definition)=0"),
  ],
  [
    "MIGRATION_VALIDATES_CONSTRAINT",
    migration.includes(
      "validate constraint ai_usage_events_operation_kind_allowed",
    ),
  ],
  [
    "MIGRATION_REPORTS_NO_DATA_REWRITE",
    migration.includes("'dataRowsModifiedByMigration',0"),
  ],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${name}=${ok ? "PASS" : "FAIL"}`);
  if (ok) passed += 1;
}

console.log(
  `B3_1_1_V2_VALIDATOR=${passed === checks.length ? "PASS" : "FAIL"}_${passed}_${checks.length}`,
);

if (passed !== checks.length) process.exit(1);
