-- P4.10.0-C8-G — Additive Category Derivation Layer v1 schema draft
-- Date: 2026-05-19
-- Project: gpt-app / AI-NAVIGATOR
-- Scope: Category Derivation Layer v1 / Semantic Capital
--
-- IMPORTANT:
-- This file is a SQL migration draft only.
-- Do not run this file in PowerShell.
-- Review first, then execute manually in Supabase SQL Editor.
--
-- Design checkpoints:
-- - c79ce3d Document category derivation layer design
-- - e7a9c44 Inventory category derivation implementation surface
-- - 8b1271a Plan category derivation additive schema

begin;

-- 1. UUID support
create extension if not exists pgcrypto;

-- 2. Additive contextual_categories semantic fields
-- These fields are nullable/safe and must not change existing runtime semantics.
alter table public.contextual_categories
  add column if not exists semantic_layer text,
  add column if not exists category_type text,
  add column if not exists aliases jsonb not null default '[]'::jsonb,
  add column if not exists status text,
  add column if not exists source_type text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

comment on column public.contextual_categories.semantic_layer is 'Category Derivation semantic layer: action, object, domain, participant, relationship_context, role, duty, care_function, purpose, metric.';
comment on column public.contextual_categories.category_type is 'Category governance/type marker for Category Derivation Layer v1.';
comment on column public.contextual_categories.aliases is 'JSON array of aliases, multilingual labels or phrase variants used by resolver.';
comment on column public.contextual_categories.status is 'Category status such as active, suggested, needs_review, archived.';
comment on column public.contextual_categories.source_type is 'Category source such as system_seed, rule, ai, user, migration.';
comment on column public.contextual_categories.metadata_json is 'Flexible metadata for category governance and resolver evidence.';

create index if not exists idx_contextual_categories_semantic_layer
  on public.contextual_categories (semantic_layer);

create index if not exists idx_contextual_categories_category_type
  on public.contextual_categories (category_type);

create index if not exists idx_contextual_categories_status
  on public.contextual_categories (status);

create index if not exists idx_contextual_categories_source_type
  on public.contextual_categories (source_type);

create index if not exists idx_contextual_categories_aliases_gin
  on public.contextual_categories using gin (aliases);

-- 3. category_derivation_runs
-- One versioned semantic interpretation attempt for one activity event.
create table if not exists public.category_derivation_runs (
  id uuid primary key default gen_random_uuid(),
  activity_event_id uuid references public.activity_events(id) on delete cascade,
  actor_id uuid null,
  organization_id uuid null,
  input_text text null,
  input_language text null,
  processor_version text not null default 'category_derivation_v1',
  rule_version text null,
  model_name text null,
  prompt_version text null,
  status text not null default 'started',
  confidence numeric null,
  needs_user_confirmation boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  error_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_derivation_runs_confidence_range
    check (confidence is null or (confidence >= 0 and confidence <= 1))
);

comment on table public.category_derivation_runs is 'Versioned semantic interpretation runs for Activity Events. Stores rule/model/prompt versions and input/output JSON.';

create index if not exists idx_category_derivation_runs_activity_event_id
  on public.category_derivation_runs (activity_event_id);

create index if not exists idx_category_derivation_runs_status
  on public.category_derivation_runs (status);

create index if not exists idx_category_derivation_runs_created_at_desc
  on public.category_derivation_runs (created_at desc);

create index if not exists idx_category_derivation_runs_processor_version
  on public.category_derivation_runs (processor_version);

create index if not exists idx_category_derivation_runs_model_name
  on public.category_derivation_runs (model_name);

create index if not exists idx_category_derivation_runs_needs_user_confirmation
  on public.category_derivation_runs (needs_user_confirmation);

-- 4. activity_category_derivations
-- Candidate and resolved category outputs for activity events.
create table if not exists public.activity_category_derivations (
  id uuid primary key default gen_random_uuid(),
  activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  derivation_run_id uuid null references public.category_derivation_runs(id) on delete set null,
  category_id uuid null references public.contextual_categories(id) on delete set null,
  candidate_slug text not null,
  candidate_title text null,
  semantic_layer text null,
  category_type text null,
  source text not null,
  confidence numeric null,
  is_required boolean not null default false,
  is_confirmed boolean not null default false,
  needs_user_review boolean not null default false,
  is_rejected boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_category_derivations_confidence_range
    check (confidence is null or (confidence >= 0 and confidence <= 1))
);

comment on table public.activity_category_derivations is 'Category candidates and resolved categories derived from Activity Events.';

create index if not exists idx_activity_category_derivations_activity_event_id
  on public.activity_category_derivations (activity_event_id);

create index if not exists idx_activity_category_derivations_derivation_run_id
  on public.activity_category_derivations (derivation_run_id);

create index if not exists idx_activity_category_derivations_category_id
  on public.activity_category_derivations (category_id);

create index if not exists idx_activity_category_derivations_candidate_slug
  on public.activity_category_derivations (candidate_slug);

create index if not exists idx_activity_category_derivations_semantic_layer
  on public.activity_category_derivations (semantic_layer);

create index if not exists idx_activity_category_derivations_source
  on public.activity_category_derivations (source);

create index if not exists idx_activity_category_derivations_needs_user_review
  on public.activity_category_derivations (needs_user_review);

create index if not exists idx_activity_category_derivations_is_rejected
  on public.activity_category_derivations (is_rejected);

-- 5. Keep v1 intentionally flexible
-- Do not create activity_semantic_interpretations in this migration.
-- category_derivation_runs.output_json is enough for v1 interpretation JSON.
-- Do not add typed relation edges.
-- Do not modify commercial core tables.
-- Do not alter activity_event_value_object_links in this migration.
-- Do not redesign value_object_category_links in this migration.

commit;

-- Post-migration verification must be done separately.
-- Required checks:
-- - contextual_categories has semantic_layer/category_type/aliases/status/source_type/metadata_json
-- - category_derivation_runs exists
-- - activity_category_derivations exists
-- - indexes exist
-- - C7 free-text debug route still works after SQL migration
-- - TypeScript passes before runtime code changes
