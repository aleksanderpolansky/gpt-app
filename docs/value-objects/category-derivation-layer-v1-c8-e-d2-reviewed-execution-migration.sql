-- GPT-APP / AI-NAVIGATOR
-- P4.10.0-C8-E-D — Category Derivation Layer v1 additive migration design
--
-- STATUS:
-- REVIEWED EXECUTION COPY.
-- RUN ONLY IN SUPABASE SQL EDITOR AFTER FINAL MANUAL REVIEW.
--
-- This execution copy is prepared after C8-E-C Supabase schema audit and C8-E-D1 migration design review.
-- It is intended to be executed once in Supabase SQL Editor, then verified with the post-execution SQL at the bottom.
--
-- Core audit conclusions:
-- - category_derivation_runs already exists.
-- - activity_category_derivations already exists.
-- - contextual_categories already has name, parent_id, semantic_layer, category_type, status, source_type, aliases, metadata_json.
-- - activity_event_value_object_links uses event_id; do not rename it to activity_event_id.
-- - value_object_category_links already exists.
--
-- Additive-only rules:
-- - No DROP.
-- - No destructive rename.
-- - No data rewrite.
-- - No recreating existing tables.
-- - Add missing columns only.
-- - Add indexes only if helpful.
-- - Add FK constraints only after confirming existing data will not break them.
--
-- Planned scope:
-- 1. category_derivation_runs: add reuse/policy/schema/model routing/cost metadata.
-- 2. activity_category_derivations: add governance/status fields.
-- 3. value_object_category_links: add derivation traceability fields.
-- 4. Defer activity_semantic_interpretations, activity_category_corrections, category_moderation_items.
--
-- ============================================================
-- BEGIN REVIEWED ADDITIVE MIGRATION DESIGN
-- ============================================================

begin;

-- ============================================================
-- 1) category_derivation_runs — additive metadata columns
-- ============================================================

alter table public.category_derivation_runs
  add column if not exists input_hash text;

alter table public.category_derivation_runs
  add column if not exists policy_version text;

alter table public.category_derivation_runs
  add column if not exists schema_version text;

alter table public.category_derivation_runs
  add column if not exists model_alias text;

alter table public.category_derivation_runs
  add column if not exists token_usage_json jsonb not null default '{}'::jsonb;

alter table public.category_derivation_runs
  add column if not exists cost_json jsonb not null default '{}'::jsonb;

comment on column public.category_derivation_runs.input_hash is
  'Normalized input hash for reuse/dedupe of Category Derivation runs. Added by P4.10.0-C8-E-D.';

comment on column public.category_derivation_runs.policy_version is
  'Policy version used for resolver/governance/AI routing decisions. Added by P4.10.0-C8-E-D.';

comment on column public.category_derivation_runs.schema_version is
  'Structured output schema version for rule/AI category derivation output. Added by P4.10.0-C8-E-D.';

comment on column public.category_derivation_runs.model_alias is
  'Configured model routing alias such as cheap/default/strong; model_name remains exact runtime model id. Added by P4.10.0-C8-E-D.';

comment on column public.category_derivation_runs.token_usage_json is
  'Token usage metadata for AI-assisted derivation cost control. Added by P4.10.0-C8-E-D.';

comment on column public.category_derivation_runs.cost_json is
  'Cost metadata for AI-assisted derivation cost control. Added by P4.10.0-C8-E-D.';

create index if not exists idx_category_derivation_runs_activity_event_id
  on public.category_derivation_runs(activity_event_id);

create index if not exists idx_category_derivation_runs_input_hash
  on public.category_derivation_runs(input_hash);

create index if not exists idx_category_derivation_runs_status
  on public.category_derivation_runs(status);

create index if not exists idx_category_derivation_runs_versions
  on public.category_derivation_runs(processor_version, rule_version, prompt_version, schema_version, policy_version);

-- ============================================================
-- 2) activity_category_derivations — additive governance columns
-- ============================================================

alter table public.activity_category_derivations
  add column if not exists status text not null default 'candidate';

alter table public.activity_category_derivations
  add column if not exists is_revoked boolean not null default false;

alter table public.activity_category_derivations
  add column if not exists is_core_meaning boolean not null default false;

alter table public.activity_category_derivations
  add column if not exists evidence_json jsonb not null default '{}'::jsonb;

comment on column public.activity_category_derivations.status is
  'Candidate/resolution governance status: candidate/resolved/confirmed/revoked/rejected/needs_review/etc. Added by P4.10.0-C8-E-D.';

comment on column public.activity_category_derivations.is_revoked is
  'Whether this activity-category derivation was revoked and must not be treated as active canonical interpretation. Added by P4.10.0-C8-E-D.';

comment on column public.activity_category_derivations.is_core_meaning is
  'Whether the candidate represents a core meaning of the activity, not only a secondary/possible meaning. Added by P4.10.0-C8-E-D.';

comment on column public.activity_category_derivations.evidence_json is
  'Evidence/reason/matched words/ambiguity details for the category candidate. Added by P4.10.0-C8-E-D.';

create index if not exists idx_activity_category_derivations_activity_event_id
  on public.activity_category_derivations(activity_event_id);

create index if not exists idx_activity_category_derivations_derivation_run_id
  on public.activity_category_derivations(derivation_run_id);

create index if not exists idx_activity_category_derivations_category_id
  on public.activity_category_derivations(category_id);

create index if not exists idx_activity_category_derivations_status
  on public.activity_category_derivations(status);

create index if not exists idx_activity_category_derivations_candidate_slug
  on public.activity_category_derivations(candidate_slug);

-- ============================================================
-- 3) value_object_category_links — additive derivation traceability
-- ============================================================

alter table public.value_object_category_links
  add column if not exists derivation_run_id uuid;

alter table public.value_object_category_links
  add column if not exists activity_derivation_id uuid;

alter table public.value_object_category_links
  add column if not exists status text not null default 'active';

comment on column public.value_object_category_links.derivation_run_id is
  'Traceability link to category_derivation_runs.id when a VO category link was produced from a Category Derivation run. Added by P4.10.0-C8-E-D.';

comment on column public.value_object_category_links.activity_derivation_id is
  'Traceability link to activity_category_derivations.id when a VO category link was produced from a specific candidate/resolution row. Added by P4.10.0-C8-E-D.';

comment on column public.value_object_category_links.status is
  'Link-level governance status: active/revoked/rejected/archived/etc. Added by P4.10.0-C8-E-D.';

-- Add FK constraints only if they do not already exist.
-- These are nullable and use ON DELETE SET NULL to preserve historical Value Object links.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'value_object_category_links_derivation_run_id_fkey'
  ) then
    alter table public.value_object_category_links
      add constraint value_object_category_links_derivation_run_id_fkey
      foreign key (derivation_run_id)
      references public.category_derivation_runs(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'value_object_category_links_activity_derivation_id_fkey'
  ) then
    alter table public.value_object_category_links
      add constraint value_object_category_links_activity_derivation_id_fkey
      foreign key (activity_derivation_id)
      references public.activity_category_derivations(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_value_object_category_links_derivation_run_id
  on public.value_object_category_links(derivation_run_id);

create index if not exists idx_value_object_category_links_activity_derivation_id
  on public.value_object_category_links(activity_derivation_id);

create index if not exists idx_value_object_category_links_status
  on public.value_object_category_links(status);

-- ============================================================
-- 4) Explicitly deferred tables
-- ============================================================
--
-- The following missing tables are intentionally NOT created in this first
-- small migration design:
--
-- - public.activity_semantic_interpretations
-- - public.activity_category_corrections
-- - public.category_moderation_items
--
-- Reason:
-- The next runtime block can first harden persistence/orchestrator on the
-- already existing core tables:
-- - category_derivation_runs
-- - activity_category_derivations
--
-- Full semantic snapshots, user correction endpoints, and moderation queue
-- should be added after the first runtime path is stable.

commit;

-- ============================================================
-- END REVIEWED ADDITIVE MIGRATION DESIGN
-- ============================================================

-- Post-execution verification draft, to be run only after the migration is executed:
--
-- select
--   table_name,
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and (
--     (table_name = 'category_derivation_runs'
--       and column_name in ('input_hash', 'policy_version', 'schema_version', 'model_alias', 'token_usage_json', 'cost_json'))
--     or
--     (table_name = 'activity_category_derivations'
--       and column_name in ('status', 'is_revoked', 'is_core_meaning', 'evidence_json'))
--     or
--     (table_name = 'value_object_category_links'
--       and column_name in ('derivation_run_id', 'activity_derivation_id', 'status'))
--   )
-- order by table_name, column_name;