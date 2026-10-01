import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath =
  "supabase/migrations/20261001162000_ai_billing_b3_3_1_object_action_operation_kind.sql";

const full = path.join(root, migrationPath);

if (!fs.existsSync(full)) {
  throw new Error(`B3_3_1_MIGRATION_MISSING:${migrationPath}`);
}

const source = fs.readFileSync(full, "utf8");

const requiredKinds = [
  "chat_message",
  "activity_preview",
  "semantic_intake",
  "ai_channel",
  "admin_test",
  "other",
  "content_localization",
  "object_action_suggestion",
];

const checks = [
  ["TARGET_TABLE", source.includes("public.ai_usage_events")],
  [
    "TARGET_CONSTRAINT",
    source.includes("ai_usage_events_operation_kind_allowed"),
  ],
  ["BEGIN_COMMIT", /\bbegin\s*;/i.test(source) && /\bcommit\s*;/i.test(source)],
  ["LOCK_TIMEOUT", source.includes("lock_timeout = '5s'")],
  ["STATEMENT_TIMEOUT", source.includes("statement_timeout = '120s'")],
  ["PREFLIGHT_PRESENT", source.includes("do $preflight$")],
  ["IDEMPOTENT_FIX_PRESENT", source.includes("do $fix$")],
  [
    "NOT_VALID_THEN_VALIDATE",
    source.includes(") not valid;") &&
      source.includes("validate constraint ai_usage_events_operation_kind_allowed"),
  ],
  [
    "NO_USAGE_DML",
    !/\binsert\s+into\s+public\.ai_usage_events\b/i.test(source) &&
      !/\bupdate\s+public\.ai_usage_events\b/i.test(source) &&
      !/\bdelete\s+from\s+public\.ai_usage_events\b/i.test(source),
  ],
  [
    "ZERO_DATA_ROWS_DECLARED",
    source.includes("'dataRowsModifiedByMigration',0"),
  ],
  [
    "RESULT_CHECK_NAME",
    source.includes("ARCTOR_AI_BILLING_B3_3_1_OPERATION_KIND_FIX"),
  ],
  [
    "NEXT_B3_3",
    source.includes("'next','B3.3_SOURCE_MIGRATION'"),
  ],
];

for (const kind of requiredKinds) {
  checks.push([
    `PRESERVES_${kind.toUpperCase()}`,
    source.includes(`'${kind}'`),
  ]);
}

let passed = 0;

for (const [name, ok] of checks) {
  console.log(`${name}=${ok ? "PASS" : "FAIL"}`);
  if (ok) passed += 1;
}

console.log(
  `B3_3_1_VALIDATOR=${passed === checks.length ? "PASS" : "FAIL"}_${passed}_${checks.length}`,
);

if (passed !== checks.length) {
  process.exit(1);
}
