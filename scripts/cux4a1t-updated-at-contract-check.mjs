import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const paths = {
  migration:
    "supabase/migrations/20260728143000_cux4a1_updated_at_monotonic_fix.sql",
  preflight:
    "supabase/diagnostics/20260728_cux4a1t_updated_at_preflight_READONLY.sql",
  postcheck:
    "supabase/diagnostics/20260728_cux4a1t_updated_at_postcheck_READONLY.sql",
  runtime:
    "supabase/diagnostics/20260728_cux4a1t_updated_at_runtime_acceptance.sql",
  doc:
    "docs/CUX4A1T_UPDATED_AT_MONOTONIC_FIX_RU_20260728.md",
};

const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const migration = read(paths.migration);
const preflight = read(paths.preflight);
const postcheck = read(paths.postcheck);
const runtime = read(paths.runtime);
const doc = read(paths.doc);

const checks = [
  ["migration begins transaction", /\bbegin\s*;/i.test(migration)],
  ["migration commits transaction", /\bcommit\s*;/i.test(migration)],
  [
    "dedicated function created",
    /set_activity_semantic_enrichment_updated_at_cux4/i.test(migration),
  ],
  ["clock timestamp used", /clock_timestamp\(\)/i.test(migration)],
  [
    "created_at monotonic guard used",
    /greatest\(clock_timestamp\(\),\s*new\.created_at\)/i.test(
      migration,
    ),
  ],
  [
    "CUX4A1 trigger rewired",
    /activity_semantic_enrichment_runs_cux4_updated_at_trg/i.test(
      migration,
    ),
  ],
  [
    "activity_events not altered",
    !/alter\s+table\s+(if\s+exists\s+)?public\.activity_events/i.test(
      migration,
    ),
  ],
  [
    "calendar_events not altered",
    !/alter\s+table\s+(if\s+exists\s+)?public\.calendar_events/i.test(
      migration,
    ),
  ],
  [
    "no activity delete",
    !/delete\s+from\s+public\.activity_events/i.test(migration),
  ],
  ["no truncate", !/\btruncate\b/i.test(migration)],
  ["no drop table", !/drop\s+table/i.test(migration)],
  ["preflight is read only", !/\b(insert|update|delete|create|alter|drop)\b/i.test(
    preflight.replace(/^\s*--.*$/gm, ""),
  )],
  ["postcheck is read only", !/\b(insert|update|delete|create|alter|drop)\b/i.test(
    postcheck.replace(/^\s*--.*$/gm, ""),
  )],
  [
    "runtime uses existing planned activity",
    /owned_planned_activity_available/i.test(runtime),
  ],
  [
    "runtime tests created timestamp",
    /created_timestamp_order_valid/i.test(runtime),
  ],
  [
    "runtime tests claim advancement",
    /claim_updated_at_advanced/i.test(runtime),
  ],
  [
    "runtime tests finish advancement",
    /finish_updated_at_advanced/i.test(runtime),
  ],
  ["runtime cleans fixture", /fixture_cleanup/i.test(runtime)],
  [
    "runtime does not create activity",
    !/create_activity_event_pp1_v1/i.test(runtime),
  ],
  [
    "documentation records transaction timestamp defect",
    /transaction|транзакц/i.test(doc),
  ],
];

let passed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (ok) passed += 1;
}

console.log(`CUX4A1T contract checks: ${passed}/${checks.length}`);

if (passed !== checks.length) {
  process.exitCode = 1;
}
