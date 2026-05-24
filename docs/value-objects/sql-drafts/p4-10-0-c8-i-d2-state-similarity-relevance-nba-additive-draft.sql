-- GPT-APP / AI-NAVIGATOR
-- P4.10.0-C8-I-D2 — Draft Additive SQL Migration
--
-- Date: 2026-05-24
-- Status: DRAFT SQL MIGRATION FILE — DO NOT EXECUTE BEFORE REVIEW
-- Previous step: P4.10.0-C8-I-D1
-- Previous commit: 5c02f70
--
-- Purpose:
-- Add missing State / Similarity / Relevance / NBA support tables.
--
-- Important:
-- This migration is additive only.
-- It must not alter existing source-of-truth tables.
-- It must not create activity_state_deltas.
-- It must not create value_object_state_window_snapshots yet.
-- It must not touch commercial RPCs, points, wallets, certificates, purchase confirmations.

begin;

-- ============================================================
-- 1. state_dimensions
-- ============================================================

create table if not exists public.state_dimensions (
  id uuid primary key default gen_random_uuid(),

  dimension_key text not null unique,
  title text not null,
  domain text not null,
  description text,
  unit_type text,

  default_privacy_level text not null default 'private',
  claim_policy text not null default 'proxy_only',

  allowed_source_types jsonb not null default '[]'::jsonb,
  forbidden_claims jsonb not null default '[]'::jsonb,
  safer_proxy_wording jsonb not null default '{}'::jsonb,

  is_sensitive boolean not null default false,
  is_active boolean not null default true,

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint state_dimensions_dimension_key_not_blank
    check (length(btrim(dimension_key)) > 0),

  constraint state_dimensions_title_not_blank
    check (length(btrim(title)) > 0),

  constraint state_dimensions_domain_not_blank
    check (length(btrim(domain)) > 0),

  constraint state_dimensions_default_privacy_level_check
    check (default_privacy_level in ('private', 'shared_with_org', 'public_masked', 'public')),

  constraint state_dimensions_claim_policy_check
    check (claim_policy in ('direct_measurement', 'proxy_only', 'user_confirmed', 'system_estimate', 'blocked')),

  constraint state_dimensions_allowed_source_types_is_array
    check (jsonb_typeof(allowed_source_types) = 'array'),

  constraint state_dimensions_forbidden_claims_is_array
    check (jsonb_typeof(forbidden_claims) = 'array'),

  constraint state_dimensions_safer_proxy_wording_is_object
    check (jsonb_typeof(safer_proxy_wording) = 'object'),

  constraint state_dimensions_metadata_is_object
    check (jsonb_typeof(metadata_json) = 'object')
);

alter table public.state_dimensions enable row level security;

create index if not exists idx_state_dimensions_domain
  on public.state_dimensions (domain);

create index if not exists idx_state_dimensions_is_active
  on public.state_dimensions (is_active);

create index if not exists idx_state_dimensions_is_sensitive
  on public.state_dimensions (is_sensitive);

-- ============================================================
-- 2. value_object_state_facts
-- ============================================================

create table if not exists public.value_object_state_facts (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users(id) on delete cascade,
  value_object_id uuid not null references public.value_objects(id) on delete cascade,

  dimension_id uuid references public.state_dimensions(id) on delete set null,
  dimension_key text not null,

  value_json jsonb not null default '{}'::jsonb,

  source_type text not null default 'manual',
  source_id uuid,

  confidence numeric not null default 1,
  evidence_json jsonb not null default '{}'::jsonb,
  claim_strength integer not null default 2,

  privacy_level text not null default 'private',
  valid_from timestamp with time zone,
  valid_to timestamp with time zone,

  correction_status text not null default 'active',

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint value_object_state_facts_dimension_key_not_blank
    check (length(btrim(dimension_key)) > 0),

  constraint value_object_state_facts_confidence_range
    check (confidence >= 0 and confidence <= 1),

  constraint value_object_state_facts_claim_strength_range
    check (claim_strength >= 0 and claim_strength <= 5),

  constraint value_object_state_facts_privacy_level_check
    check (privacy_level in ('private', 'shared_with_org', 'public_masked', 'public')),

  constraint value_object_state_facts_correction_status_check
    check (correction_status in ('active', 'corrected', 'revoked', 'superseded')),

  constraint value_object_state_facts_source_type_check
    check (source_type in ('manual', 'user_confirmed', 'rule', 'ai', 'system', 'import', 'correction')),

  constraint value_object_state_facts_value_json_is_object
    check (jsonb_typeof(value_json) = 'object'),

  constraint value_object_state_facts_evidence_json_is_object
    check (jsonb_typeof(evidence_json) = 'object'),

  constraint value_object_state_facts_metadata_json_is_object
    check (jsonb_typeof(metadata_json) = 'object'),

  constraint value_object_state_facts_valid_time_order_check
    check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

alter table public.value_object_state_facts enable row level security;

create index if not exists idx_value_object_state_facts_user_value_object
  on public.value_object_state_facts (user_id, value_object_id);

create index if not exists idx_value_object_state_facts_user_dimension_key
  on public.value_object_state_facts (user_id, dimension_key);

create index if not exists idx_value_object_state_facts_value_object_dimension_key
  on public.value_object_state_facts (value_object_id, dimension_key);

create index if not exists idx_value_object_state_facts_correction_status
  on public.value_object_state_facts (correction_status);

create index if not exists idx_value_object_state_facts_created_at
  on public.value_object_state_facts (created_at desc);

-- ============================================================
-- 3. state_relevance_rules
-- ============================================================

create table if not exists public.state_relevance_rules (
  id uuid primary key default gen_random_uuid(),

  source_dimension_id uuid references public.state_dimensions(id) on delete set null,
  source_dimension_key text not null,

  target_category_id uuid references public.contextual_categories(id) on delete set null,
  target_value_object_id uuid references public.value_objects(id) on delete set null,
  target_direction_key text,

  relation text not null,
  relevance_weight numeric not null default 1,

  explanation text,
  safety_policy text not null default 'proxy_safe',

  is_active boolean not null default true,

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint state_relevance_rules_source_dimension_key_not_blank
    check (length(btrim(source_dimension_key)) > 0),

  constraint state_relevance_rules_relation_check
    check (relation in ('increases_relevance', 'decreases_relevance', 'blocks', 'requires_review', 'requires_user_choice')),

  constraint state_relevance_rules_safety_policy_check
    check (safety_policy in ('proxy_safe', 'needs_user_confirmation', 'blocked_medical_claim', 'blocked_sensitive_claim')),

  constraint state_relevance_rules_relevance_weight_non_negative
    check (relevance_weight >= 0),

  constraint state_relevance_rules_target_presence_check
    check (
      target_category_id is not null
      or target_value_object_id is not null
      or nullif(btrim(target_direction_key), '') is not null
    ),

  constraint state_relevance_rules_metadata_json_is_object
    check (jsonb_typeof(metadata_json) = 'object')
);

alter table public.state_relevance_rules enable row level security;

create index if not exists idx_state_relevance_rules_source_dimension_key
  on public.state_relevance_rules (source_dimension_key);

create index if not exists idx_state_relevance_rules_target_category_id
  on public.state_relevance_rules (target_category_id);

create index if not exists idx_state_relevance_rules_target_value_object_id
  on public.state_relevance_rules (target_value_object_id);

create index if not exists idx_state_relevance_rules_target_direction_key
  on public.state_relevance_rules (target_direction_key);

create index if not exists idx_state_relevance_rules_is_active
  on public.state_relevance_rules (is_active);

-- ============================================================
-- 4. value_object_similarity_edges
-- ============================================================

create table if not exists public.value_object_similarity_edges (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references public.app_users(id) on delete cascade,

  source_value_object_id uuid not null references public.value_objects(id) on delete cascade,
  target_value_object_id uuid not null references public.value_objects(id) on delete cascade,

  similarity_score numeric not null default 0,

  shared_category_ids uuid[] not null default '{}'::uuid[],

  method text not null default 'category_overlap_v1',
  explanation text,

  metadata_json jsonb not null default '{}'::jsonb,

  computed_at timestamp with time zone not null default now(),

  constraint value_object_similarity_edges_not_self_check
    check (source_value_object_id <> target_value_object_id),

  constraint value_object_similarity_edges_score_range
    check (similarity_score >= 0 and similarity_score <= 1),

  constraint value_object_similarity_edges_method_not_blank
    check (length(btrim(method)) > 0),

  constraint value_object_similarity_edges_metadata_json_is_object
    check (jsonb_typeof(metadata_json) = 'object')
);

alter table public.value_object_similarity_edges enable row level security;

create unique index if not exists value_object_similarity_edges_user_pair_method_unique
  on public.value_object_similarity_edges (user_id, source_value_object_id, target_value_object_id, method)
  where user_id is not null;

create unique index if not exists value_object_similarity_edges_global_pair_method_unique
  on public.value_object_similarity_edges (source_value_object_id, target_value_object_id, method)
  where user_id is null;

create index if not exists idx_value_object_similarity_edges_source
  on public.value_object_similarity_edges (source_value_object_id);

create index if not exists idx_value_object_similarity_edges_target
  on public.value_object_similarity_edges (target_value_object_id);

create index if not exists idx_value_object_similarity_edges_user
  on public.value_object_similarity_edges (user_id);

create index if not exists idx_value_object_similarity_edges_score
  on public.value_object_similarity_edges (similarity_score desc);

-- ============================================================
-- 5. value_object_relevance_edges
-- ============================================================

create table if not exists public.value_object_relevance_edges (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users(id) on delete cascade,

  source_value_object_id uuid references public.value_objects(id) on delete cascade,
  target_value_object_id uuid references public.value_objects(id) on delete cascade,

  source_dimension_key text,
  target_direction_key text,

  relevance_score numeric not null default 0,
  relation_category text not null default 'contextual_relevance',
  confidence numeric not null default 1,

  evidence_json jsonb not null default '{}'::jsonb,
  feedback_source text,
  metadata_json jsonb not null default '{}'::jsonb,

  computed_at timestamp with time zone not null default now(),

  constraint value_object_relevance_edges_score_range
    check (relevance_score >= 0 and relevance_score <= 1),

  constraint value_object_relevance_edges_confidence_range
    check (confidence >= 0 and confidence <= 1),

  constraint value_object_relevance_edges_relation_category_not_blank
    check (length(btrim(relation_category)) > 0),

  constraint value_object_relevance_edges_target_presence_check
    check (
      target_value_object_id is not null
      or nullif(btrim(target_direction_key), '') is not null
    ),

  constraint value_object_relevance_edges_evidence_json_is_object
    check (jsonb_typeof(evidence_json) = 'object'),

  constraint value_object_relevance_edges_metadata_json_is_object
    check (jsonb_typeof(metadata_json) = 'object')
);

alter table public.value_object_relevance_edges enable row level security;

create index if not exists idx_value_object_relevance_edges_user_score
  on public.value_object_relevance_edges (user_id, relevance_score desc);

create index if not exists idx_value_object_relevance_edges_user_target_direction
  on public.value_object_relevance_edges (user_id, target_direction_key);

create index if not exists idx_value_object_relevance_edges_user_source_dimension
  on public.value_object_relevance_edges (user_id, source_dimension_key);

create index if not exists idx_value_object_relevance_edges_source_value_object
  on public.value_object_relevance_edges (source_value_object_id);

create index if not exists idx_value_object_relevance_edges_target_value_object
  on public.value_object_relevance_edges (target_value_object_id);

create index if not exists idx_value_object_relevance_edges_computed_at
  on public.value_object_relevance_edges (computed_at desc);

-- ============================================================
-- 6. recommendation_feedback
-- ============================================================

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users(id) on delete cascade,

  recommendation_id uuid,
  context_package_id uuid,

  selected_direction text,

  candidate_action jsonb not null default '{}'::jsonb,

  feedback_type text not null,
  reason text,
  difficulty integer,
  helped boolean,

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),

  constraint recommendation_feedback_feedback_type_check
    check (feedback_type in ('accepted', 'rejected', 'ignored', 'too_hard', 'not_relevant', 'unsafe', 'done', 'postponed', 'other')),

  constraint recommendation_feedback_difficulty_check
    check (difficulty is null or (difficulty >= 1 and difficulty <= 5)),

  constraint recommendation_feedback_candidate_action_is_object
    check (jsonb_typeof(candidate_action) = 'object'),

  constraint recommendation_feedback_metadata_json_is_object
    check (jsonb_typeof(metadata_json) = 'object')
);

alter table public.recommendation_feedback enable row level security;

create index if not exists idx_recommendation_feedback_user_created_at
  on public.recommendation_feedback (user_id, created_at desc);

create index if not exists idx_recommendation_feedback_feedback_type
  on public.recommendation_feedback (feedback_type);

create index if not exists idx_recommendation_feedback_selected_direction
  on public.recommendation_feedback (selected_direction);

create index if not exists idx_recommendation_feedback_recommendation_id
  on public.recommendation_feedback (recommendation_id);

create index if not exists idx_recommendation_feedback_context_package_id
  on public.recommendation_feedback (context_package_id);


-- ============================================================
-- 7. updated_at triggers for mutable draft tables
-- ============================================================

drop trigger if exists trg_state_dimensions_updated_at on public.state_dimensions;
create trigger trg_state_dimensions_updated_at
before update on public.state_dimensions
for each row
execute function public.set_activity_recording_updated_at();

drop trigger if exists trg_value_object_state_facts_updated_at on public.value_object_state_facts;
create trigger trg_value_object_state_facts_updated_at
before update on public.value_object_state_facts
for each row
execute function public.set_activity_recording_updated_at();

drop trigger if exists trg_state_relevance_rules_updated_at on public.state_relevance_rules;
create trigger trg_state_relevance_rules_updated_at
before update on public.state_relevance_rules
for each row
execute function public.set_activity_recording_updated_at();

-- ============================================================
-- 8. Explicit deny policies
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'state_dimensions'
      and policyname = 'No direct public state dimensions access'
  ) then
    execute 'create policy "No direct public state dimensions access" on public.state_dimensions for all to anon, authenticated using (false) with check (false)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'value_object_state_facts'
      and policyname = 'No direct public value object state facts access'
  ) then
    execute 'create policy "No direct public value object state facts access" on public.value_object_state_facts for all to anon, authenticated using (false) with check (false)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'state_relevance_rules'
      and policyname = 'No direct public state relevance rules access'
  ) then
    execute 'create policy "No direct public state relevance rules access" on public.state_relevance_rules for all to anon, authenticated using (false) with check (false)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'value_object_similarity_edges'
      and policyname = 'No direct public value object similarity edges access'
  ) then
    execute 'create policy "No direct public value object similarity edges access" on public.value_object_similarity_edges for all to anon, authenticated using (false) with check (false)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'value_object_relevance_edges'
      and policyname = 'No direct public value object relevance edges access'
  ) then
    execute 'create policy "No direct public value object relevance edges access" on public.value_object_relevance_edges for all to anon, authenticated using (false) with check (false)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'recommendation_feedback'
      and policyname = 'No direct public recommendation feedback access'
  ) then
    execute 'create policy "No direct public recommendation feedback access" on public.recommendation_feedback for all to anon, authenticated using (false) with check (false)';
  end if;
end $$;

commit;

-- ============================================================
-- 9. Smoke checks to run manually after review/execution
-- ============================================================

-- select table_name
-- from information_schema.tables
-- where table_schema = 'public'
--   and table_name in (
--     'state_dimensions',
--     'value_object_state_facts',
--     'state_relevance_rules',
--     'value_object_similarity_edges',
--     'value_object_relevance_edges',
--     'recommendation_feedback'
--   )
-- order by table_name;

-- select
--   n.nspname,
--   c.relname,
--   c.relrowsecurity,
--   c.relforcerowsecurity
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and c.relname in (
--     'state_dimensions',
--     'value_object_state_facts',
--     'state_relevance_rules',
--     'value_object_similarity_edges',
--     'value_object_relevance_edges',
--     'recommendation_feedback'
--   )
-- order by c.relname;

-- select
--   schemaname,
--   tablename,
--   policyname,
--   cmd,
--   qual,
--   with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in (
--     'state_dimensions',
--     'value_object_state_facts',
--     'state_relevance_rules',
--     'value_object_similarity_edges',
--     'value_object_relevance_edges',
--     'recommendation_feedback'
--   )
-- order by tablename, policyname;

