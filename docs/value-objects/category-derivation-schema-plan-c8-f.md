# P4.10.0-C8-F — Additive Schema Plan for Category Derivation Layer v1

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / Semantic Capital

Previous checkpoints:
- c79ce3d Document category derivation layer design
- e7a9c44 Inventory category derivation implementation surface

## 1. Purpose

This document defines the additive schema plan for Category Derivation Layer v1.

This step is planning-only.

Do not apply SQL in PowerShell.
Do not change runtime code in this step.
Do not break the verified C7 free-text pipeline.
The next SQL migration must be executed only in Supabase SQL Editor after review.

## 2. Current architectural problem

The verified free-text pipeline can create activity_event, Value Object, Value Object instance, activity_event_value_object_link, usage aggregate, state delta, daily aggregate, snapshot and processing log.

But for free-text fallback, value_object_category_links are not created because the bridge does not receive resolved category ids.

The fix must not be a one-category seed for walking-to-work.

The required solution is a general Category Derivation Layer v1.

## 3. Target pipeline

free text / app action
-> raw Activity Event
-> category_derivation_run
-> rule-based extractor
-> optional structured AI classifier
-> categoryCandidates[]
-> resolver slug to category_id
-> activity_category_derivations
-> Value Object Bridge
-> value_object_category_links
-> activity_event_value_object_links
-> aggregates / snapshots / logs

## 4. Additive schema principle

All changes must be additive.

Allowed:
- create new tables
- add nullable columns
- add indexes
- add safe comments
- add non-breaking constraints where they do not affect existing rows

Not allowed in this block:
- dropping columns
- renaming columns
- changing existing runtime semantics
- deleting old category or link logic
- forcing NOT NULL on old rows
- introducing typed relation edges
- changing commercial core currency logic
- modifying purchase confirmation logic

## 5. contextual_categories additive fields

If missing, add these nullable or safe fields to public.contextual_categories:

- semantic_layer text
- category_type text
- aliases jsonb
- status text
- source_type text
- metadata_json jsonb

semantic_layer examples: action, object, domain, participant, relationship_context, role, duty, care_function, purpose, metric.

status examples: active, suggested, needs_review, archived.

source_type examples: system_seed, rule, ai, user, migration.

Do not enforce a strict enum yet unless the existing project convention already requires check constraints.

## 6. New table: category_derivation_runs

Purpose: one semantic interpretation attempt for one activity event.

Proposed fields:
- id uuid primary key
- activity_event_id uuid references activity_events(id) on delete cascade
- actor_id uuid nullable
- organization_id uuid nullable
- input_text text nullable
- input_language text nullable
- processor_version text not null default category_derivation_v1
- rule_version text nullable
- model_name text nullable
- prompt_version text nullable
- status text not null
- confidence numeric nullable
- needs_user_confirmation boolean not null default false
- started_at timestamptz not null default now()
- finished_at timestamptz nullable
- input_json jsonb not null default empty object
- output_json jsonb not null default empty object
- error_json jsonb nullable
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

Recommended indexes:
- activity_event_id
- status
- created_at desc
- processor_version
- model_name
- needs_user_confirmation

## 7. New table: activity_category_derivations

Purpose: resolved and candidate category outputs for an activity event.

This is the canonical bridge between raw activity events and contextual categories.

Proposed fields:
- id uuid primary key
- activity_event_id uuid not null references activity_events(id) on delete cascade
- derivation_run_id uuid nullable references category_derivation_runs(id) on delete set null
- category_id uuid nullable references contextual_categories(id) on delete set null
- candidate_slug text not null
- candidate_title text nullable
- semantic_layer text nullable
- category_type text nullable
- source text not null
- confidence numeric nullable
- is_required boolean not null default false
- is_confirmed boolean not null default false
- needs_user_review boolean not null default false
- is_rejected boolean not null default false
- metadata_json jsonb not null default empty object
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

Recommended indexes:
- activity_event_id
- derivation_run_id
- category_id
- candidate_slug
- semantic_layer
- source
- needs_user_review
- is_rejected

Do not over-constrain uniqueness in v1. A possible later unique index is activity_event_id plus derivation_run_id plus candidate_slug plus semantic_layer.

## 8. activity_semantic_interpretations

Do not create this table in the first migration unless inventory proves it is immediately needed.

For v1, category_derivation_runs.output_json can store interpretation JSON.

Create a separate table later only if multiple competing interpretations per run, review UI versions, or benchmark/evaluation storage require it.

## 9. value_object_category_links

The table already exists and must not be redesigned in this block.

Future resolver and bridge behavior:
- one Value Object may have multiple category links
- links should include source, confidence and run metadata if fields exist
- if these fields are missing, plan an additive extension later
- do not remove existing link behavior
- do not require only one contextualCategoryId

## 10. activity_event_value_object_links

This table already participates in the verified C7 pipeline.

Do not change it in C8-F unless inventory proves a missing safe metadata field is required.

The current priority is not to break event to VO links, exposure_minutes, aggregates, snapshots and processing logs.

## 11. Resolver contract required by schema

Future resolver must accept category candidates with slug, title, semanticLayer, categoryType, confidence, source, isRequired, isConfirmed, needsUserReview and metadata.

Resolver output must include categoryId and resolutionStatus.

Allowed resolutionStatus values: resolved_existing, created_suggested, created_active, unresolved.

## 12. Migration safety checklist

Before applying SQL:
- confirm Supabase project is correct
- run current schema inspection in Supabase SQL Editor
- confirm contextual_categories exists
- confirm activity_events exists
- confirm value_object_category_links exists
- confirm activity_event_value_object_links exists
- check whether pgcrypto and gen_random_uuid() are available
- check whether updated_at trigger helper exists or use plain columns
- do not run SQL in PowerShell

## 13. Verification after SQL migration

After migration, SQL verification should confirm:
- contextual_categories has semantic_layer, category_type, aliases, status, source_type and metadata_json or equivalent fields
- category_derivation_runs exists
- activity_category_derivations exists
- indexes exist
- no existing runtime rows were deleted
- C7 free-text debug route still works
- TypeScript still passes before runtime code changes

## 14. Next step after C8-F

Proceed to P4.10.0-C8-G — draft additive SQL migration for Category Derivation Layer v1.

C8-G should create a SQL file only.

SQL must not be pasted into PowerShell.

The SQL file should be reviewed first, then manually executed in Supabase SQL Editor.
