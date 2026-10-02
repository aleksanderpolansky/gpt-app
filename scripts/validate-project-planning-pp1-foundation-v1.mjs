import fs from "node:fs";

const migrationPath =
  "supabase/migrations/20261002190000_project_planning_pp1_foundation_v1.sql";
const rollbackPath =
  "supabase/rollbacks/20261002190000_project_planning_pp1_foundation_v1_ROLLBACK.sql";

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`MISSING_FILE:${path}`);
  return fs.readFileSync(path, "utf8");
}

const migration = read(migrationPath);
const rollback = read(rollbackPath);
const checks = [];

function check(name, ok) {
  if (!ok) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  checks.push(name);
}

for (const table of [
  "project_contexts",
  "project_composition_relations",
  "project_activity_links",
  "activity_event_relations",
]) {
  check(
    `CREATE_${table.toUpperCase()}`,
    migration.includes(`create table public.${table}`),
  );

  check(
    `RLS_${table.toUpperCase()}`,
    migration.includes(`alter table public.${table} enable row level security`),
  );

  check(
    `ROLLBACK_${table.toUpperCase()}`,
    rollback.includes(`drop table if exists public.${table}`),
  );
}

check(
  "PROJECT_ROOT_USES_ONTOLOGY_LEAF",
  migration.includes("v_root.ontology_node_role_code <> 'leaf'"),
);

check(
  "PROJECT_ROOT_ACTOR_SCOPED",
  migration.includes("v_root.scope_code <> 'actor'"),
);

check(
  "PROJECT_ROOT_OWNER_MATCH",
  migration.includes(
    "v_root.owner_user_id is distinct from new.owner_user_id",
  ),
);

check(
  "COMPOSITION_LEAF_ONLY",
  migration.includes(
    "PROJECT_PP1_COMPOSITION_ENDPOINTS_MUST_BE_ACTIVE_ONTOLOGY_LEAVES",
  ),
);

check(
  "COMPOSITION_DOES_NOT_MUTATE_ONTOLOGY_PARENT",
  !migration.match(
    /alter\s+table\s+public\.value_objects[\s\S]{0,500}parent_value_object_id/i,
  ),
);

check(
  "COMPOSITION_CYCLE_GUARD",
  migration.includes("PROJECT_PP1_COMPOSITION_CYCLE_FORBIDDEN") &&
    migration.includes("with recursive reachable"),
);

check(
  "PROJECT_ACTIVITY_LINKS_CANONICAL_ACTIVITY_EVENTS",
  migration.includes(
    "activity_event_id uuid not null\n    references public.activity_events(id)",
  ),
);

check(
  "ACTIVITY_RELATIONS_CANONICAL_ACTIVITY_EVENTS",
  migration.includes(
    "source_activity_event_id uuid not null\n    references public.activity_events(id)",
  ) &&
    migration.includes(
      "target_activity_event_id uuid not null\n    references public.activity_events(id)",
    ),
);

for (const type of [
  "contains",
  "precedes",
  "finish_to_start",
  "start_to_start",
  "finish_to_finish",
  "start_to_finish",
  "blocks",
]) {
  check(
    `ACTIVITY_RELATION_TYPE_${type.toUpperCase()}`,
    migration.includes(`'${type}'`),
  );
}

check(
  "ACTIVITY_RELATION_REQUIRES_PROJECT_MEMBERSHIP",
  migration.includes(
    "PROJECT_PP1_ACTIVITY_RELATION_REQUIRES_ACTIVE_PROJECT_MEMBERSHIP",
  ),
);

check(
  "ACTIVITY_RELATION_CYCLE_GUARD",
  migration.includes("PROJECT_PP1_ACTIVITY_RELATION_CYCLE_FORBIDDEN"),
);

check(
  "NO_DIRECT_ANON_AUTH_PROJECT_CONTEXTS",
  migration.includes("project_contexts_no_direct_public_v1"),
);

check(
  "NO_DIRECT_ANON_AUTH_COMPOSITION",
  migration.includes("project_composition_no_direct_public_v1"),
);

check(
  "NO_DIRECT_ANON_AUTH_PROJECT_ACTIVITY_LINKS",
  migration.includes("project_activity_links_no_direct_public_v1"),
);

check(
  "NO_DIRECT_ANON_AUTH_ACTIVITY_RELATIONS",
  migration.includes("activity_event_relations_no_direct_public_v1"),
);

check(
  "NO_ACTIVITY_EVENTS_SCHEMA_MUTATION",
  !/alter\s+table\s+public\.activity_events/i.test(migration),
);

check(
  "NO_ACTIVITY_VALUE_OBJECT_LINKS_SCHEMA_MUTATION",
  !/alter\s+table\s+public\.activity_value_object_links/i.test(migration),
);

check(
  "NO_LEGACY_ACTIVITY_PARTICIPANTS_MUTATION",
  !/alter\s+table\s+public\.activity_participants/i.test(migration),
);

check(
  "NO_PROGRESS_PERCENT",
  !/progress_percent|completion_percent|percent_complete/i.test(migration),
);

check(
  "NO_SECOND_FORMULA_ENGINE",
  !/project_formula|project_calculation_rule|formula_engine/i.test(migration),
);

console.log(`VALIDATOR=PASS_${checks.length}/${checks.length}`);
