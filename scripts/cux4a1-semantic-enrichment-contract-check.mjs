import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  docs: "docs/CUX4A1_SEMANTIC_ENRICHMENT_DB_FOUNDATION_RU_20260728.md",
  migration:
    "supabase/migrations/20260728140000_cux4a1_semantic_enrichment_db_foundation.sql",
  preflight:
    "supabase/diagnostics/20260728_cux4a1_semantic_enrichment_preflight_READONLY.sql",
  postcheck:
    "supabase/diagnostics/20260728_cux4a1_semantic_enrichment_postcheck_READONLY.sql",
  runtime:
    "supabase/diagnostics/20260728_cux4a1_semantic_enrichment_runtime_acceptance.sql",
  cleanup:
    "supabase/diagnostics/20260728_cux4a1_semantic_enrichment_runtime_helper_cleanup.sql",
  cleanupPostcheck:
    "supabase/diagnostics/20260728_cux4a1_semantic_enrichment_cleanup_postcheck_READONLY.sql",
};

const content = Object.fromEntries(
  Object.entries(files).map(([key, relativePath]) => {
    const absolutePath = path.join(root, relativePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Missing CUX4A1 file: ${relativePath}`);
    }

    return [key, fs.readFileSync(absolutePath, "utf8")];
  }),
);

const checks = [
  ["docs scope CUX4A1", content.docs.includes("CUX4A1")],
  [
    "docs canonical activity_events",
    content.docs.includes("public.activity_events"),
  ],
  [
    "docs no second activity entity",
    content.docs.includes("не является второй таблицей активностей"),
  ],
  ["docs no delete", content.docs.includes("DELETE=false")],
  ["docs CUX4A2 boundary", content.docs.includes("CUX4A2")],

  [
    "migration additive marker",
    content.migration.includes("TRUNCATE=false"),
  ],
  [
    "migration enrichment table",
    content.migration.includes(
      "create table public.activity_semantic_enrichment_runs_cux4",
    ),
  ],
  [
    "migration activity foreign key",
    content.migration.includes(
      "references public.activity_events(id) on delete cascade",
    ),
  ],
  [
    "migration status needs clarification",
    content.migration.includes("'needs_clarification'"),
  ],
  [
    "migration protected fields",
    content.migration.includes("'planned_target_links'"),
  ],
  [
    "migration identity unique",
    content.migration.includes(
      "activity_semantic_enrichment_runs_cux4_identity_unique",
    ),
  ],
  [
    "migration contract trigger",
    content.migration.includes(
      "activity_semantic_enrichment_runs_cux4_contract_trg",
    ),
  ],
  [
    "migration RLS",
    content.migration.includes("enable row level security"),
  ],
  [
    "migration service role only",
    content.migration.includes("to service_role"),
  ],
  [
    "migration create run RPC",
    content.migration.includes(
      "create_activity_semantic_enrichment_run_cux4_v1",
    ),
  ],
  [
    "migration claim run RPC",
    content.migration.includes(
      "claim_activity_semantic_enrichment_run_cux4_v1",
    ),
  ],
  [
    "migration finish run RPC",
    content.migration.includes(
      "finish_activity_semantic_enrichment_run_cux4_v1",
    ),
  ],
  [
    "migration idempotency conflict",
    content.migration.includes("CUX4A1_RUN_IDEMPOTENCY_CONFLICT"),
  ],
  [
    "migration owner guard",
    content.migration.includes("CUX4A1_ACTIVITY_OWNER_MISMATCH"),
  ],
  [
    "migration planned guard",
    content.migration.includes("CUX4A1_PLANNED_ACTIVITY_REQUIRED"),
  ],

  [
    "preflight read only",
    !/\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b|\btruncate\s+table\b|\bdrop\s+(table|function)\b|\balter\s+table\b|\bcreate\s+(table|function|trigger|index)\b/i.test(
      content.preflight.replace(/--.*$/gm, ""),
    ),
  ],
  [
    "preflight no collision",
    content.preflight.includes("no_table_collision"),
  ],
  [
    "postcheck columns",
    content.postcheck.includes("required_columns"),
  ],
  [
    "postcheck no rows",
    content.postcheck.includes("no_rows_created_by_migration"),
  ],

  [
    "runtime helper",
    content.runtime.includes(
      "cux4a1_runtime_acceptance_helper_20260728",
    ),
  ],
  [
    "runtime PP1 fixture",
    content.runtime.includes("create_activity_event_pp1_v1"),
  ],
  [
    "runtime replay",
    content.runtime.includes("run_idempotent_replay"),
  ],
  [
    "runtime conflict",
    content.runtime.includes("idempotency_conflict_rejected"),
  ],
  [
    "runtime cleanup",
    content.runtime.includes("fixture_activity_cleanup"),
  ],

  [
    "cleanup drops helper",
    content.cleanup.includes("drop function if exists"),
  ],
  [
    "cleanup postcheck residuals",
    content.cleanupPostcheck.includes("runtime_operation_residuals_zero"),
  ],
];

let failed = 0;

for (const [label, passed] of checks) {
  if (passed) {
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

console.log(`CUX4A1 contract checks: ${checks.length - failed}/${checks.length}`);

if (failed > 0) {
  process.exitCode = 1;
}
