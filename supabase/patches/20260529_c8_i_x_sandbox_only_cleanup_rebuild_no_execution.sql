-- GPT-APP / AI-NAVIGATOR
-- C8-I-X - SANDBOX-ONLY CLEANUP/REBUILD SQL PACKAGE
-- Status: NO EXECUTION IN C8-I-X
-- Target: current sandbox Supabase project only.
-- Production: DO NOT USE.
-- Secrets: do not paste or print any credentials, passwords, JWT values, connection strings, or server-side secrets.
-- Purpose:
--   1. Remove sandbox-only C8-I schema drift confirmed in C8-I-W.
--   2. Rebuild C8-I draft/state/semantic tables from the current committed migration draft.
--   3. Normalize private C8-I table grants toward backend-mediated service role posture.
-- Important:
--   - This file is created for review only in C8-I-X.
--   - Do not execute this SQL until a later explicit manual execution gate.
--   - This package intentionally contains DROP/REVOKE/GRANT statements because it is a sandbox-only cleanup/rebuild package.
--   - This package must never be used in production.

-- ============================================================
-- 1. SANDBOX-ONLY CLEANUP OF C8-I DRAFT/STATE/SEMANTIC TABLES
-- ============================================================

begin;

drop table if exists public.resolver_candidate_links cascade;
drop table if exists public.resolver_feedback cascade;
drop table if exists public.resolver_runs cascade;
drop table if exists public.semantic_signatures cascade;
drop table if exists public.activity_state_deltas cascade;
drop table if exists public.value_object_state_snapshots cascade;
drop table if exists public.value_object_state_facts cascade;
drop table if exists public.value_object_relevance_edges cascade;
drop table if exists public.value_object_similarity_edges cascade;
drop table if exists public.state_relevance_rules cascade;
drop table if exists public.state_dimensions cascade;

commit;

-- ============================================================
-- 2. REBUILD FROM CURRENT COMMITTED C8-I MIGRATION DRAFT
-- Source: supabase/migrations/20260528204503_c8_i_state_context_layer_draft.sql
-- ============================================================

-- GPT-APP / AI-NAVIGATOR
-- C8-I-E-SAFE-RETRY-FILE-V4 - Draft SQL migration for state/context layer
-- DRAFT ONLY. Do not execute before review.
-- SQL executed: false at creation time.
-- DB read/write: false at creation time.
-- Runtime write enablement: false at creation time.
-- Required order: create table -> indexes -> enable row level security -> policies -> explicit GRANT.
-- GRANT does not replace RLS.

begin;

-- ============================================================
-- state_dimensions
-- ============================================================
create table if not exists public.state_dimensions (
  id uuid primary key default gen_random_uuid(),
  dimension_key text not null unique,
  title text not null,
  domain text not null,
  description text,
  default_privacy_level text not null default 'private',
  is_sensitive boolean not null default false,
  claim_policy text not null default 'conservative_signal_only',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_state_dimensions_dimension_key on public.state_dimensions (dimension_key);
create index if not exists idx_state_dimensions_is_active on public.state_dimensions (is_active);
alter table public.state_dimensions enable row level security;
drop policy if exists state_dimensions_authenticated_read on public.state_dimensions;
create policy state_dimensions_authenticated_read on public.state_dimensions for select to authenticated using (true);
revoke all on table public.state_dimensions from anon;
grant select on table public.state_dimensions to authenticated;
grant all on table public.state_dimensions to service_role;

-- ============================================================
-- state_relevance_rules
-- ============================================================
create table if not exists public.state_relevance_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  state_dimension_key text not null,
  relevance_type text not null,
  condition_summary text not null,
  allowed_interpretation text not null,
  forbidden_overclaims text not null,
  default_weight numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_state_relevance_rules_rule_key on public.state_relevance_rules (rule_key);
create index if not exists idx_state_relevance_rules_dimension_key on public.state_relevance_rules (state_dimension_key);
create index if not exists idx_state_relevance_rules_is_active on public.state_relevance_rules (is_active);
alter table public.state_relevance_rules enable row level security;
drop policy if exists state_relevance_rules_authenticated_read on public.state_relevance_rules;
create policy state_relevance_rules_authenticated_read on public.state_relevance_rules for select to authenticated using (true);
revoke all on table public.state_relevance_rules from anon;
grant select on table public.state_relevance_rules to authenticated;
grant all on table public.state_relevance_rules to service_role;

-- ============================================================
-- value_object_state_facts
-- ============================================================
create table if not exists public.value_object_state_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  value_object_id uuid,
  subject_ref_type text,
  subject_ref_id uuid,
  state_dimension_key text not null,
  source_kind text not null,
  source_ref_type text,
  source_ref_id uuid,
  observed_at timestamptz,
  valid_from timestamptz,
  valid_to timestamptz,
  value_numeric numeric,
  value_text text,
  unit text,
  confidence numeric,
  evidence_summary text,
  privacy_level text not null default 'private',
  sensitivity_level text,
  status text not null default 'provisional',
  correction_of_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_value_object_state_facts_user_id on public.value_object_state_facts (user_id);
create index if not exists idx_value_object_state_facts_user_dimension on public.value_object_state_facts (user_id, state_dimension_key);
create index if not exists idx_value_object_state_facts_user_value_object on public.value_object_state_facts (user_id, value_object_id);
create index if not exists idx_value_object_state_facts_observed_at on public.value_object_state_facts (observed_at);
create index if not exists idx_value_object_state_facts_status on public.value_object_state_facts (status);
alter table public.value_object_state_facts enable row level security;
drop policy if exists value_object_state_facts_authenticated_select_own on public.value_object_state_facts;
drop policy if exists value_object_state_facts_authenticated_insert_own on public.value_object_state_facts;
drop policy if exists value_object_state_facts_authenticated_update_own on public.value_object_state_facts;
create policy value_object_state_facts_authenticated_select_own on public.value_object_state_facts for select to authenticated using (user_id = auth.uid());
create policy value_object_state_facts_authenticated_insert_own on public.value_object_state_facts for insert to authenticated with check (user_id = auth.uid());
create policy value_object_state_facts_authenticated_update_own on public.value_object_state_facts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on table public.value_object_state_facts from anon;
grant select, insert, update on table public.value_object_state_facts to authenticated;
grant all on table public.value_object_state_facts to service_role;

-- ============================================================
-- activity_state_deltas
-- ============================================================
create table if not exists public.activity_state_deltas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  activity_id uuid,
  activity_event_id uuid,
  value_object_id uuid,
  state_dimension_key text not null,
  delta_direction text,
  delta_numeric numeric,
  confidence numeric,
  source_kind text not null,
  evidence_summary text,
  observed_at timestamptz,
  valid_from timestamptz,
  valid_to timestamptz,
  privacy_level text not null default 'private',
  sensitivity_level text,
  status text not null default 'provisional',
  correction_of_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_activity_state_deltas_user_id on public.activity_state_deltas (user_id);
create index if not exists idx_activity_state_deltas_user_dimension on public.activity_state_deltas (user_id, state_dimension_key);
create index if not exists idx_activity_state_deltas_activity_id on public.activity_state_deltas (activity_id);
create index if not exists idx_activity_state_deltas_activity_event_id on public.activity_state_deltas (activity_event_id);
create index if not exists idx_activity_state_deltas_observed_at on public.activity_state_deltas (observed_at);
alter table public.activity_state_deltas enable row level security;
drop policy if exists activity_state_deltas_authenticated_select_own on public.activity_state_deltas;
drop policy if exists activity_state_deltas_authenticated_insert_own on public.activity_state_deltas;
drop policy if exists activity_state_deltas_authenticated_update_own on public.activity_state_deltas;
create policy activity_state_deltas_authenticated_select_own on public.activity_state_deltas for select to authenticated using (user_id = auth.uid());
create policy activity_state_deltas_authenticated_insert_own on public.activity_state_deltas for insert to authenticated with check (user_id = auth.uid());
create policy activity_state_deltas_authenticated_update_own on public.activity_state_deltas for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on table public.activity_state_deltas from anon;
grant select, insert, update on table public.activity_state_deltas to authenticated;
grant all on table public.activity_state_deltas to service_role;

-- ============================================================
-- value_object_state_snapshots
-- ============================================================
create table if not exists public.value_object_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  value_object_id uuid,
  snapshot_at timestamptz not null,
  window_start timestamptz,
  window_end timestamptz,
  state_dimension_key text not null,
  value_numeric numeric,
  value_text text,
  confidence numeric,
  source_fact_ids jsonb not null default '[]'::jsonb,
  source_delta_ids jsonb not null default '[]'::jsonb,
  evidence_summary text,
  privacy_level text not null default 'private',
  sensitivity_level text,
  expires_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_value_object_state_snapshots_user_id on public.value_object_state_snapshots (user_id);
create index if not exists idx_value_object_state_snapshots_user_dimension on public.value_object_state_snapshots (user_id, state_dimension_key);
create index if not exists idx_value_object_state_snapshots_user_value_object on public.value_object_state_snapshots (user_id, value_object_id);
create index if not exists idx_value_object_state_snapshots_snapshot_at on public.value_object_state_snapshots (snapshot_at);
create index if not exists idx_value_object_state_snapshots_status on public.value_object_state_snapshots (status);
alter table public.value_object_state_snapshots enable row level security;
drop policy if exists value_object_state_snapshots_authenticated_select_own on public.value_object_state_snapshots;
drop policy if exists value_object_state_snapshots_authenticated_insert_own on public.value_object_state_snapshots;
drop policy if exists value_object_state_snapshots_authenticated_update_own on public.value_object_state_snapshots;
create policy value_object_state_snapshots_authenticated_select_own on public.value_object_state_snapshots for select to authenticated using (user_id = auth.uid());
create policy value_object_state_snapshots_authenticated_insert_own on public.value_object_state_snapshots for insert to authenticated with check (user_id = auth.uid());
create policy value_object_state_snapshots_authenticated_update_own on public.value_object_state_snapshots for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on table public.value_object_state_snapshots from anon;
grant select, insert, update on table public.value_object_state_snapshots to authenticated;
grant all on table public.value_object_state_snapshots to service_role;

-- ============================================================
-- semantic_signatures
-- ============================================================
create table if not exists public.semantic_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ref_type text not null,
  ref_id uuid not null,
  signature_version text not null,
  category_keys jsonb not null default '[]'::jsonb,
  dimension_keys jsonb not null default '[]'::jsonb,
  actor_role_keys jsonb not null default '[]'::jsonb,
  context_keys jsonb not null default '[]'::jsonb,
  evidence_summary text,
  privacy_level text not null default 'private',
  sensitivity_level text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_semantic_signatures_user_id on public.semantic_signatures (user_id);
create index if not exists idx_semantic_signatures_ref on public.semantic_signatures (ref_type, ref_id);
create index if not exists idx_semantic_signatures_status on public.semantic_signatures (status);
alter table public.semantic_signatures enable row level security;
drop policy if exists semantic_signatures_authenticated_select_own on public.semantic_signatures;
drop policy if exists semantic_signatures_authenticated_insert_own on public.semantic_signatures;
drop policy if exists semantic_signatures_authenticated_update_own on public.semantic_signatures;
create policy semantic_signatures_authenticated_select_own on public.semantic_signatures for select to authenticated using (user_id = auth.uid());
create policy semantic_signatures_authenticated_insert_own on public.semantic_signatures for insert to authenticated with check (user_id = auth.uid());
create policy semantic_signatures_authenticated_update_own on public.semantic_signatures for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on table public.semantic_signatures from anon;
grant select, insert, update on table public.semantic_signatures to authenticated;
grant all on table public.semantic_signatures to service_role;

-- ============================================================
-- value_object_similarity_edges
-- ============================================================
create table if not exists public.value_object_similarity_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_value_object_id uuid not null,
  target_value_object_id uuid not null,
  similarity_score numeric not null,
  similarity_basis text not null,
  shared_category_keys jsonb not null default '[]'::jsonb,
  shared_dimension_keys jsonb not null default '[]'::jsonb,
  confidence numeric,
  evidence_summary text,
  signature_version text,
  privacy_level text not null default 'private',
  sensitivity_level text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_value_object_similarity_edges_user_id on public.value_object_similarity_edges (user_id);
create index if not exists idx_value_object_similarity_edges_source on public.value_object_similarity_edges (source_value_object_id);
create index if not exists idx_value_object_similarity_edges_target on public.value_object_similarity_edges (target_value_object_id);
create index if not exists idx_value_object_similarity_edges_score on public.value_object_similarity_edges (similarity_score);
alter table public.value_object_similarity_edges enable row level security;
drop policy if exists value_object_similarity_edges_authenticated_select_own on public.value_object_similarity_edges;
drop policy if exists value_object_similarity_edges_authenticated_insert_own on public.value_object_similarity_edges;
drop policy if exists value_object_similarity_edges_authenticated_update_own on public.value_object_similarity_edges;
create policy value_object_similarity_edges_authenticated_select_own on public.value_object_similarity_edges for select to authenticated using (user_id = auth.uid());
create policy value_object_similarity_edges_authenticated_insert_own on public.value_object_similarity_edges for insert to authenticated with check (user_id = auth.uid());
create policy value_object_similarity_edges_authenticated_update_own on public.value_object_similarity_edges for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on table public.value_object_similarity_edges from anon;
grant select, insert, update on table public.value_object_similarity_edges to authenticated;
grant all on table public.value_object_similarity_edges to service_role;

-- ============================================================
-- value_object_relevance_edges
-- ============================================================
create table if not exists public.value_object_relevance_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_ref_type text not null,
  source_ref_id uuid,
  target_ref_type text not null,
  target_ref_id uuid,
  relevance_type text not null,
  state_dimension_key text,
  relevance_score numeric,
  directionality text,
  rule_key text,
  confidence numeric,
  evidence_summary text,
  allowed_interpretation text,
  forbidden_overclaims text,
  privacy_level text not null default 'private',
  sensitivity_level text,
  status text not null default 'provisional',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_value_object_relevance_edges_user_id on public.value_object_relevance_edges (user_id);
create index if not exists idx_value_object_relevance_edges_source on public.value_object_relevance_edges (source_ref_type, source_ref_id);
create index if not exists idx_value_object_relevance_edges_target on public.value_object_relevance_edges (target_ref_type, target_ref_id);
create index if not exists idx_value_object_relevance_edges_dimension on public.value_object_relevance_edges (state_dimension_key);
create index if not exists idx_value_object_relevance_edges_score on public.value_object_relevance_edges (relevance_score);
alter table public.value_object_relevance_edges enable row level security;
drop policy if exists value_object_relevance_edges_authenticated_select_own on public.value_object_relevance_edges;
drop policy if exists value_object_relevance_edges_authenticated_insert_own on public.value_object_relevance_edges;
drop policy if exists value_object_relevance_edges_authenticated_update_own on public.value_object_relevance_edges;
create policy value_object_relevance_edges_authenticated_select_own on public.value_object_relevance_edges for select to authenticated using (user_id = auth.uid());
create policy value_object_relevance_edges_authenticated_insert_own on public.value_object_relevance_edges for insert to authenticated with check (user_id = auth.uid());
create policy value_object_relevance_edges_authenticated_update_own on public.value_object_relevance_edges for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on table public.value_object_relevance_edges from anon;
grant select, insert, update on table public.value_object_relevance_edges to authenticated;
grant all on table public.value_object_relevance_edges to service_role;

-- ============================================================
-- resolver_runs
-- ============================================================
create table if not exists public.resolver_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  run_type text not null,
  input_summary text,
  output_summary text,
  privacy_level text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_resolver_runs_user_id on public.resolver_runs (user_id);
create index if not exists idx_resolver_runs_created_at on public.resolver_runs (created_at);
alter table public.resolver_runs enable row level security;
drop policy if exists resolver_runs_authenticated_select_own on public.resolver_runs;
drop policy if exists resolver_runs_authenticated_insert_own on public.resolver_runs;
drop policy if exists resolver_runs_authenticated_update_own on public.resolver_runs;
create policy resolver_runs_authenticated_select_own on public.resolver_runs for select to authenticated using (user_id = auth.uid());
create policy resolver_runs_authenticated_insert_own on public.resolver_runs for insert to authenticated with check (user_id = auth.uid());
create policy resolver_runs_authenticated_update_own on public.resolver_runs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on table public.resolver_runs from anon;
grant select, insert, update on table public.resolver_runs to authenticated;
grant all on table public.resolver_runs to service_role;

-- ============================================================
-- resolver_candidate_links
-- ============================================================
create table if not exists public.resolver_candidate_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  resolver_run_id uuid not null,
  candidate_type text not null,
  candidate_ref_type text,
  candidate_ref_id uuid,
  score numeric,
  reason_summary text,
  status text not null default 'candidate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_resolver_candidate_links_user_id on public.resolver_candidate_links (user_id);
create index if not exists idx_resolver_candidate_links_run_id on public.resolver_candidate_links (resolver_run_id);
create index if not exists idx_resolver_candidate_links_score on public.resolver_candidate_links (score);
alter table public.resolver_candidate_links enable row level security;
drop policy if exists resolver_candidate_links_authenticated_select_own on public.resolver_candidate_links;
drop policy if exists resolver_candidate_links_authenticated_insert_own on public.resolver_candidate_links;
drop policy if exists resolver_candidate_links_authenticated_update_own on public.resolver_candidate_links;
create policy resolver_candidate_links_authenticated_select_own on public.resolver_candidate_links for select to authenticated using (user_id = auth.uid());
create policy resolver_candidate_links_authenticated_insert_own on public.resolver_candidate_links for insert to authenticated with check (user_id = auth.uid());
create policy resolver_candidate_links_authenticated_update_own on public.resolver_candidate_links for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on table public.resolver_candidate_links from anon;
grant select, insert, update on table public.resolver_candidate_links to authenticated;
grant all on table public.resolver_candidate_links to service_role;

-- ============================================================
-- resolver_feedback
-- ============================================================
create table if not exists public.resolver_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  resolver_run_id uuid,
  candidate_link_id uuid,
  feedback_type text not null,
  feedback_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_resolver_feedback_user_id on public.resolver_feedback (user_id);
create index if not exists idx_resolver_feedback_run_id on public.resolver_feedback (resolver_run_id);
create index if not exists idx_resolver_feedback_candidate_id on public.resolver_feedback (candidate_link_id);
alter table public.resolver_feedback enable row level security;
drop policy if exists resolver_feedback_authenticated_select_own on public.resolver_feedback;
drop policy if exists resolver_feedback_authenticated_insert_own on public.resolver_feedback;
drop policy if exists resolver_feedback_authenticated_update_own on public.resolver_feedback;
create policy resolver_feedback_authenticated_select_own on public.resolver_feedback for select to authenticated using (user_id = auth.uid());
create policy resolver_feedback_authenticated_insert_own on public.resolver_feedback for insert to authenticated with check (user_id = auth.uid());
create policy resolver_feedback_authenticated_update_own on public.resolver_feedback for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on table public.resolver_feedback from anon;
grant select, insert, update on table public.resolver_feedback to authenticated;
grant all on table public.resolver_feedback to service_role;

-- C8-I-K BACKEND-MEDIATED RLS PATCH START
-- Purpose: conservative MVP access model before SQL execution.
-- SQL executed: false
-- DB read executed: false
-- DB write executed: false
-- Runtime called: false
-- supabase db push executed: false
-- psql executed: false
-- migration executed: false
-- Decision: DO_NOT_EXECUTE_SQL_YET
-- Patch target: BACKEND_MEDIATED_RLS_PATCH_APPLIED_TO_DRAFT
-- auth.uid() = user_id is not accepted as proven.
-- Private state/context tables are backend-mediated/service_role until compatibility is proven.

-- Catalog/reference tables: no anon; authenticated read only; service_role all.
revoke all on table public.state_dimensions from anon;
grant select on table public.state_dimensions to authenticated;
grant all on table public.state_dimensions to service_role;
revoke all on table public.state_relevance_rules from anon;
grant select on table public.state_relevance_rules to authenticated;
grant all on table public.state_relevance_rules to service_role;

-- Private/user-owned state/context tables: no anon; no authenticated direct access for MVP; backend/service_role only.
revoke all on table public.value_object_state_facts from anon;
revoke all on table public.value_object_state_facts from authenticated;
grant all on table public.value_object_state_facts to service_role;
revoke all on table public.activity_state_deltas from anon;
revoke all on table public.activity_state_deltas from authenticated;
grant all on table public.activity_state_deltas to service_role;
revoke all on table public.value_object_state_snapshots from anon;
revoke all on table public.value_object_state_snapshots from authenticated;
grant all on table public.value_object_state_snapshots to service_role;
revoke all on table public.semantic_signatures from anon;
revoke all on table public.semantic_signatures from authenticated;
grant all on table public.semantic_signatures to service_role;
revoke all on table public.value_object_similarity_edges from anon;
revoke all on table public.value_object_similarity_edges from authenticated;
grant all on table public.value_object_similarity_edges to service_role;
revoke all on table public.value_object_relevance_edges from anon;
revoke all on table public.value_object_relevance_edges from authenticated;
grant all on table public.value_object_relevance_edges to service_role;
revoke all on table public.resolver_runs from anon;
revoke all on table public.resolver_runs from authenticated;
grant all on table public.resolver_runs to service_role;
revoke all on table public.resolver_candidate_links from anon;
revoke all on table public.resolver_candidate_links from authenticated;
grant all on table public.resolver_candidate_links to service_role;
revoke all on table public.resolver_feedback from anon;
revoke all on table public.resolver_feedback from authenticated;
grant all on table public.resolver_feedback to service_role;

-- C8-I-K BACKEND-MEDIATED RLS PATCH END


commit;



-- ============================================================
-- 3. POST-REBUILD GRANT NORMALIZATION FOR PRIVATE C8-I TABLES
-- Backend-mediated posture:
--   anon/authenticated: no broad direct table privileges
--   service_role: backend/server-side access only
-- RLS remains enabled by migration draft.
-- ============================================================

begin;

revoke all privileges on table public.state_dimensions from anon;
revoke all privileges on table public.state_dimensions from authenticated;
grant all privileges on table public.state_dimensions to service_role;
revoke all privileges on table public.state_relevance_rules from anon;
revoke all privileges on table public.state_relevance_rules from authenticated;
grant all privileges on table public.state_relevance_rules to service_role;
revoke all privileges on table public.value_object_state_facts from anon;
revoke all privileges on table public.value_object_state_facts from authenticated;
grant all privileges on table public.value_object_state_facts to service_role;
revoke all privileges on table public.activity_state_deltas from anon;
revoke all privileges on table public.activity_state_deltas from authenticated;
grant all privileges on table public.activity_state_deltas to service_role;
revoke all privileges on table public.value_object_state_snapshots from anon;
revoke all privileges on table public.value_object_state_snapshots from authenticated;
grant all privileges on table public.value_object_state_snapshots to service_role;
revoke all privileges on table public.semantic_signatures from anon;
revoke all privileges on table public.semantic_signatures from authenticated;
grant all privileges on table public.semantic_signatures to service_role;
revoke all privileges on table public.value_object_similarity_edges from anon;
revoke all privileges on table public.value_object_similarity_edges from authenticated;
grant all privileges on table public.value_object_similarity_edges to service_role;
revoke all privileges on table public.value_object_relevance_edges from anon;
revoke all privileges on table public.value_object_relevance_edges from authenticated;
grant all privileges on table public.value_object_relevance_edges to service_role;
revoke all privileges on table public.resolver_runs from anon;
revoke all privileges on table public.resolver_runs from authenticated;
grant all privileges on table public.resolver_runs to service_role;
revoke all privileges on table public.resolver_candidate_links from anon;
revoke all privileges on table public.resolver_candidate_links from authenticated;
grant all privileges on table public.resolver_candidate_links to service_role;
revoke all privileges on table public.resolver_feedback from anon;
revoke all privileges on table public.resolver_feedback from authenticated;
grant all privileges on table public.resolver_feedback to service_role;

commit;

-- ============================================================
-- End of C8-I-X sandbox-only cleanup/rebuild SQL package.
-- NO EXECUTION IN C8-I-X.
-- ============================================================
