-- ============================================================
-- C33-J.4 — Stable semantic bundle schema migration draft
-- STATUS: DRAFT / DO NOT EXECUTE WITHOUT EXPLICIT SANDBOX SQL GATE
-- ============================================================
-- Reason:
-- C33-J.3 live schema preflight reported all stable semantic bundle
-- persistence tables as missing.
--
-- Scope:
-- Creates the minimum persistence schema needed by the C33-I/C33-J
-- stable semantic bundle write contract, schema preflight, dry-run plan,
-- and transaction contract.
--
-- Safety:
-- This is a migration draft committed to the repository only.
-- The C33-J.4 PowerShell helper does NOT execute this SQL.
--
-- Execution gate:
-- Do not run this migration in Supabase SQL Editor until a separate
-- explicit sandbox SQL execution gate is opened.
--
-- Supabase rule:
-- create table -> indexes -> enable row level security -> policies -> explicit GRANT
-- ============================================================

-- ============================================================
-- 1) Tables
-- ============================================================

create table if not exists public.stable_semantic_bundles (
  id uuid primary key default gen_random_uuid(),

  -- Link to source activity event when available.
  -- Kept nullable because C33-J sandbox/test flows may be bound to a test input snapshot first.
  activity_event_id uuid null,

  input_text text not null,
  normalized_text text not null,
  input_language text not null,

  policy_version text not null,
  source_order_snapshot_key text not null,
  resolver_snapshot_key text not null,

  -- Future transaction/idempotency contract support.
  idempotency_key text not null,
  payload_hash text not null,

  bundle_status text not null default 'stable'
    check (bundle_status in ('stable', 'superseded', 'voided', 'test_preview')),

  is_sandbox_test boolean not null default true,

  created_at timestamptz not null default now(),
  created_by_user_id uuid null,

  constraint stable_semantic_bundles_idempotency_key_unique
    unique (idempotency_key)
);

create table if not exists public.stable_semantic_bundle_members (
  id uuid primary key default gen_random_uuid(),

  stable_semantic_bundle_id uuid not null
    references public.stable_semantic_bundles(id)
    on delete cascade,

  member_preview_key text not null,
  candidate_key text not null,
  normalized_text text not null,

  source_kind text not null
    check (source_kind = 'local_controlled_category'),

  resolver_decision_status text not null
    check (resolver_decision_status = 'accepted_for_preview'),

  created_at timestamptz not null default now(),

  constraint stable_semantic_bundle_members_unique_candidate
    unique (stable_semantic_bundle_id, candidate_key, source_kind)
);

create table if not exists public.stable_semantic_bundle_blocked_audit_items (
  id uuid primary key default gen_random_uuid(),

  stable_semantic_bundle_id uuid not null
    references public.stable_semantic_bundles(id)
    on delete cascade,

  blocked_preview_key text not null,
  candidate_key text not null,
  normalized_text text not null,

  source_kind text not null
    check (source_kind in ('unknown_term', 'external_concept_stub')),

  excluded_from_future_bundle_members boolean not null default true,
  retained_for_audit_preview boolean not null default true,

  created_at timestamptz not null default now(),

  constraint stable_semantic_bundle_blocked_audit_unique_candidate
    unique (stable_semantic_bundle_id, candidate_key, source_kind)
);

create table if not exists public.stable_semantic_bundle_source_snapshots (
  id uuid primary key default gen_random_uuid(),

  stable_semantic_bundle_id uuid not null
    references public.stable_semantic_bundles(id)
    on delete cascade,

  source_order_policy text not null,
  stage_count integer not null check (stage_count >= 0),
  stages_json jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),

  constraint stable_semantic_bundle_source_snapshots_unique_bundle
    unique (stable_semantic_bundle_id)
);

create table if not exists public.stable_semantic_bundle_resolver_snapshots (
  id uuid primary key default gen_random_uuid(),

  stable_semantic_bundle_id uuid not null
    references public.stable_semantic_bundles(id)
    on delete cascade,

  resolver_decision_count integer not null check (resolver_decision_count >= 0),
  local_accepted_member_count integer not null check (local_accepted_member_count >= 0),
  unresolved_blocker_count integer not null check (unresolved_blocker_count >= 0),
  unknown_term_blocked_count integer not null check (unknown_term_blocked_count >= 0),
  external_concept_blocked_count integer not null check (external_concept_blocked_count >= 0),

  created_at timestamptz not null default now(),

  constraint stable_semantic_bundle_resolver_snapshots_unique_bundle
    unique (stable_semantic_bundle_id)
);

-- ============================================================
-- 2) Indexes
-- ============================================================

create index if not exists stable_semantic_bundles_activity_event_id_idx
  on public.stable_semantic_bundles(activity_event_id);

create index if not exists stable_semantic_bundles_payload_hash_idx
  on public.stable_semantic_bundles(payload_hash);

create index if not exists stable_semantic_bundles_created_at_idx
  on public.stable_semantic_bundles(created_at desc);

create index if not exists stable_semantic_bundle_members_bundle_id_idx
  on public.stable_semantic_bundle_members(stable_semantic_bundle_id);

create index if not exists stable_semantic_bundle_members_candidate_key_idx
  on public.stable_semantic_bundle_members(candidate_key);

create index if not exists stable_semantic_bundle_blocked_audit_bundle_id_idx
  on public.stable_semantic_bundle_blocked_audit_items(stable_semantic_bundle_id);

create index if not exists stable_semantic_bundle_blocked_audit_candidate_key_idx
  on public.stable_semantic_bundle_blocked_audit_items(candidate_key);

create index if not exists stable_semantic_bundle_source_snapshots_bundle_id_idx
  on public.stable_semantic_bundle_source_snapshots(stable_semantic_bundle_id);

create index if not exists stable_semantic_bundle_resolver_snapshots_bundle_id_idx
  on public.stable_semantic_bundle_resolver_snapshots(stable_semantic_bundle_id);

-- ============================================================
-- 3) RLS
-- ============================================================

alter table public.stable_semantic_bundles enable row level security;
alter table public.stable_semantic_bundle_members enable row level security;
alter table public.stable_semantic_bundle_blocked_audit_items enable row level security;
alter table public.stable_semantic_bundle_source_snapshots enable row level security;
alter table public.stable_semantic_bundle_resolver_snapshots enable row level security;

-- ============================================================
-- 4) Policies
-- ============================================================
-- For MVP/sandbox persistence gate:
-- stable semantic bundle persistence is server-side/service-role only.
-- No anon/authenticated direct Data API access is granted here.

drop policy if exists stable_semantic_bundles_service_role_all
  on public.stable_semantic_bundles;

create policy stable_semantic_bundles_service_role_all
  on public.stable_semantic_bundles
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists stable_semantic_bundle_members_service_role_all
  on public.stable_semantic_bundle_members;

create policy stable_semantic_bundle_members_service_role_all
  on public.stable_semantic_bundle_members
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists stable_semantic_bundle_blocked_audit_service_role_all
  on public.stable_semantic_bundle_blocked_audit_items;

create policy stable_semantic_bundle_blocked_audit_service_role_all
  on public.stable_semantic_bundle_blocked_audit_items
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists stable_semantic_bundle_source_snapshots_service_role_all
  on public.stable_semantic_bundle_source_snapshots;

create policy stable_semantic_bundle_source_snapshots_service_role_all
  on public.stable_semantic_bundle_source_snapshots
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists stable_semantic_bundle_resolver_snapshots_service_role_all
  on public.stable_semantic_bundle_resolver_snapshots;

create policy stable_semantic_bundle_resolver_snapshots_service_role_all
  on public.stable_semantic_bundle_resolver_snapshots
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- 5) Explicit GRANT
-- ============================================================
-- GRANT does not replace RLS. GRANT enables role/table access;
-- RLS still decides row visibility/mutation permission.

grant select, insert, update, delete
  on table public.stable_semantic_bundles
  to service_role;

grant select, insert, update, delete
  on table public.stable_semantic_bundle_members
  to service_role;

grant select, insert, update, delete
  on table public.stable_semantic_bundle_blocked_audit_items
  to service_role;

grant select, insert, update, delete
  on table public.stable_semantic_bundle_source_snapshots
  to service_role;

grant select, insert, update, delete
  on table public.stable_semantic_bundle_resolver_snapshots
  to service_role;

-- No anon/authenticated grants are added in this draft.
-- Public/user-facing read routes must be designed separately.

