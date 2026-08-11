# ARCTor.app — GSR-1 Global System Reality Freeze
## Live DB / repository synchronization checkpoint — 2026-08-11

Status: **LIVE DATABASE VERIFIED / REPOSITORY FREEZE REQUIRED**

Baseline repository:
- `main @ 220af0b45d6e91163c25d764d052658ffac32937`
- working branch: `feat/gsr1-global-system-reality-machine-contract-v1-20260811`

## 1. Live database state independently verified

After manual Supabase SQL Editor execution and recovery inspection:

- global Value Objects: **150**
- DOMAIN roots: **12**
- intermediate objects: **35**
- semantic leaves: **103**
- immutable definition versions v1: **150**
- active system parameter assignments to global leaves: **52**
- missing expected global objects: **0**
- unexpected global objects: **0**
- duplicate `canonical_key`: **0**
- semantic leaves with children: **0**
- invalid parent/root pointers: **0**
- active system parameters after GSR-1A: **39**
- active object kinds after GSR-1A: **88**
- existing actor-scoped ontology objects preserved: **15**
- actor objects missing owner pair: **0**

Control canonical objects verified:
- `process.exercise.plank`
- `process.exercise.reverse_plank`
- `process.movement.walking`
- `process.nutrition.meal`
- `state.physiology.body_weight`
- `state.physiology.heart_rate`
- `context.weather.air_temperature`
- `context.resources.available_time`

## 2. Manual SQL steps already applied to the live database

The exact SQL sources are frozen under `supabase/manual-applied/`:

1. `20260811_gsr1a_registry_schema_support_v1.sql`
2. `20260811_gsr1a2_global_ownership_scope_guard_v1.sql`
3. `20260811_gsr1b_global_system_reality_seed_v1.sql`

These files are an **audit ledger**, not automatic migrations.

Do not move them into `supabase/migrations/` unchanged and do not execute them through
`supabase db push` against the already modified live database.

## 3. Why this freeze exists

Supabase SQL Editor behavior observed during GSR-1B proved that we must not infer
database atomicity from the final editor error alone:

- a TEMP staging relation was not visible to a later statement;
- nevertheless the intended 150 objects and 52 assignments were persisted;
- later independent read-only inspection proved the final state is internally consistent.

Therefore manual database work from this point follows:

`preflight -> one controlled write step -> independent read-only postcheck`

No future step may assume:
`final editor error => entire multi-statement script rolled back`.

## 4. Ownership model now frozen

Actor / legacy Value Objects:
- `owner_user_id` required;
- `owner_actor_id` required;
- actor must belong to the user.

Global system ontology Value Objects:
- `scope_code='global'`;
- `owner_user_id IS NULL`;
- `owner_actor_id IS NULL`;
- `actor_id IS NULL`;
- `app_user_id IS NULL`;
- `created_by_actor_id IS NULL`;
- `branch_type_code='ontology_v1'`;
- `origin_type_code='system_model'`;
- `visibility_code='public'`;
- `privacy_class_code='public_ontology'`.

The P1C ontology guard remains active and continues enforcing root/parent/facet/leaf rules.

## 5. Parameter assignment model now frozen

The existing `value_object_parameter_assignments` table is reused.

- existing rows remain actor-scoped;
- `assignment_scope_code='system'` is allowed only for ownerless global semantic leaves;
- system assignments use system parameter definitions;
- current global system assignment count is 52.

No competing assignment table was created.

## 6. Machine contract source of truth

Repository machine contract files:

- `src/data/reality-core/global-system-reality-seed-v1.json`
- `src/types/reality-core/global-system-reality-seed-v1.ts`
- `scripts/validate-global-system-reality-seed-v1.mjs`
- `docs/architecture/GSR1_STORAGE_COMPATIBILITY_GAPS_V1.md`
- `supabase/seed-plans/20260811_gsr1_global_system_reality_preflight_v1.sql`

The machine contract contains the complete 12-root / 150-object seed, semantic
parameter registry, routing constraints, strategy modes, temporal semantics and
gold fixtures.

## 7. Migration-history warning

The live database changes above were executed manually in Supabase SQL Editor.
They are therefore **not assumed to be present in the Supabase CLI migration
history**.

Before any future workflow that relies on migration history (`db push`, reset,
fresh environment reconstruction), create a dedicated idempotent reconciliation
migration or explicitly reconcile migration history through the supported
Supabase workflow.

Until then:
- live DB is the verified runtime baseline;
- the manual-applied ledger is the audit source for GSR-1A/A2/B;
- the machine seed is the semantic source of truth.

## 8. GSR-1C starting state

Read-only preflight verified:
- shared `public.concept_aliases` exists;
- RLS enabled;
- `value_object` is an allowed concept type;
- Value Object aliases currently: **0**;
- actor recognition RPC exists;
- global recognition RPC does **not** yet exist.

GSR-1C must reuse `concept_aliases`; it must not create a second alias registry.

## 9. Gate

This freeze is complete when:

1. the five machine-contract files are present;
2. the three exact manual-applied SQL files are present;
3. this live-state freeze document is present;
4. the read-only freeze postcheck is present;
5. machine validator passes;
6. `npm run build` passes;
7. git diff contains no unrelated source changes.

No DB write, commit or push is performed by the freeze script.
