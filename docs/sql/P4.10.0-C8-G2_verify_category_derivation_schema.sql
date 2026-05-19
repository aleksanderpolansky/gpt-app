-- P4.10.0-C8-G2 — Verify Category Derivation Layer v1 schema
-- Date: 2026-05-19
-- Project: gpt-app / AI-NAVIGATOR
--
-- IMPORTANT:
-- Run this only in Supabase SQL Editor after applying:
-- docs/sql/P4.10.0-C8-G_additive_category_derivation_schema.sql
-- Do not run this in PowerShell.

with expected_tables as (
  select * from (values
    ('contextual_categories'),
    ('activity_events'),
    ('value_object_category_links'),
    ('activity_event_value_object_links'),
    ('category_derivation_runs'),
    ('activity_category_derivations')
  ) as t(table_name)
),
table_check as (
  select
    e.table_name,
    exists (
      select 1
      from information_schema.tables t
      where t.table_schema = 'public'
        and t.table_name = e.table_name
    ) as exists_ok
  from expected_tables e
),
expected_columns as (
  select * from (values
    ('contextual_categories', 'semantic_layer'),
    ('contextual_categories', 'category_type'),
    ('contextual_categories', 'aliases'),
    ('contextual_categories', 'status'),
    ('contextual_categories', 'source_type'),
    ('contextual_categories', 'metadata_json'),
    ('category_derivation_runs', 'id'),
    ('category_derivation_runs', 'activity_event_id'),
    ('category_derivation_runs', 'processor_version'),
    ('category_derivation_runs', 'rule_version'),
    ('category_derivation_runs', 'model_name'),
    ('category_derivation_runs', 'prompt_version'),
    ('category_derivation_runs', 'status'),
    ('category_derivation_runs', 'confidence'),
    ('category_derivation_runs', 'needs_user_confirmation'),
    ('category_derivation_runs', 'input_json'),
    ('category_derivation_runs', 'output_json'),
    ('activity_category_derivations', 'id'),
    ('activity_category_derivations', 'activity_event_id'),
    ('activity_category_derivations', 'derivation_run_id'),
    ('activity_category_derivations', 'category_id'),
    ('activity_category_derivations', 'candidate_slug'),
    ('activity_category_derivations', 'candidate_title'),
    ('activity_category_derivations', 'semantic_layer'),
    ('activity_category_derivations', 'category_type'),
    ('activity_category_derivations', 'source'),
    ('activity_category_derivations', 'confidence'),
    ('activity_category_derivations', 'is_required'),
    ('activity_category_derivations', 'is_confirmed'),
    ('activity_category_derivations', 'needs_user_review'),
    ('activity_category_derivations', 'is_rejected'),
    ('activity_category_derivations', 'metadata_json')
  ) as c(table_name, column_name)
),
column_check as (
  select
    e.table_name,
    e.column_name,
    exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = e.table_name
        and c.column_name = e.column_name
    ) as exists_ok
  from expected_columns e
),
index_check as (
  select
    schemaname,
    tablename,
    indexname
  from pg_indexes
  where schemaname = 'public'
    and (
      tablename in ('contextual_categories', 'category_derivation_runs', 'activity_category_derivations')
      or indexname like 'idx_category_derivation_runs_%'
      or indexname like 'idx_activity_category_derivations_%'
      or indexname like 'idx_contextual_categories_%'
    )
)
select
  '01_expected_tables' as section,
  coalesce(jsonb_agg(to_jsonb(table_check) order by table_name), '[]'::jsonb) as data
from table_check

union all

select
  '02_expected_columns' as section,
  coalesce(jsonb_agg(to_jsonb(column_check) order by table_name, column_name), '[]'::jsonb) as data
from column_check

union all

select
  '03_relevant_indexes' as section,
  coalesce(jsonb_agg(to_jsonb(index_check) order by tablename, indexname), '[]'::jsonb) as data
from index_check

union all

select
  '04_missing_columns' as section,
  coalesce(jsonb_agg(to_jsonb(x) order by x.table_name, x.column_name), '[]'::jsonb) as data
from (
  select table_name, column_name
  from column_check
  where exists_ok = false
) x

union all

select
  '05_missing_tables' as section,
  coalesce(jsonb_agg(to_jsonb(x) order by x.table_name), '[]'::jsonb) as data
from (
  select table_name
  from table_check
  where exists_ok = false
) x;

