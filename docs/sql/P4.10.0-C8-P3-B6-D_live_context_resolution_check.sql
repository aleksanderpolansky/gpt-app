-- P4.10.0-C8-P3-B6-D — Live context resolution check
-- Date: 2026-05-20
-- Project: gpt-app / AI-NAVIGATOR
-- Scope: Category Derivation resolver / contextual_categories context_id failure
--
-- IMPORTANT:
-- Run this SQL in Supabase SQL Editor.
-- Do NOT run this file in PowerShell.
--
-- Goal:
-- Find which context_id resolver should use when creating contextual_categories
-- for Category Derivation candidates such as walking, work, commute-to-work,
-- walking-to-work, duration-minutes.

select
  '01_contexts_columns' as section,
  jsonb_agg(
    jsonb_build_object(
      'column_name', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable,
      'column_default', column_default
    )
    order by ordinal_position
  ) as data
from information_schema.columns
where table_schema = 'public'
  and table_name = 'contexts'

union all

select
  '02_contextual_categories_columns' as section,
  jsonb_agg(
    jsonb_build_object(
      'column_name', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable,
      'column_default', column_default
    )
    order by ordinal_position
  ) as data
from information_schema.columns
where table_schema = 'public'
  and table_name = 'contextual_categories'

union all

select
  '03_contexts_rows' as section,
  coalesce(jsonb_agg(to_jsonb(t) order by t.code), '[]'::jsonb) as data
from (
  select
    id,
    code,
    name,
    description,
    status,
    source_type,
    sort_order,
    is_active
  from public.contexts
  order by lower(code)
  limit 200
) as t

union all

select
  '04_likely_default_context_candidates' as section,
  coalesce(jsonb_agg(to_jsonb(t) order by t.code), '[]'::jsonb) as data
from (
  select
    id,
    code,
    name,
    status,
    source_type,
    is_active
  from public.contexts
  where lower(code) in (
    'general',
    'global',
    'personal',
    'personal_activity',
    'activity',
    'life',
    'work',
    'health',
    'learning',
    'measurement',
    'metric',
    'system'
  )
  or lower(name) like '%general%'
  or lower(name) like '%global%'
  or lower(name) like '%personal%'
  or lower(name) like '%activity%'
  or lower(name) like '%work%'
  or lower(name) like '%measurement%'
  or lower(name) like '%metric%'
  order by lower(code)
  limit 100
) as t

union all

select
  '05_contextual_categories_count_by_context' as section,
  coalesce(jsonb_agg(to_jsonb(t) order by t.category_count desc, t.context_code), '[]'::jsonb) as data
from (
  select
    c.id as context_id,
    c.code as context_code,
    c.name as context_name,
    count(cc.id) as category_count
  from public.contexts c
  left join public.contextual_categories cc
    on cc.context_id = c.id
  group by c.id, c.code, c.name
  order by count(cc.id) desc, lower(c.code)
  limit 200
) as t

union all

select
  '06_existing_candidate_categories' as section,
  coalesce(jsonb_agg(to_jsonb(t) order by t.context_code, t.slug), '[]'::jsonb) as data
from (
  select
    cc.id,
    cc.context_id,
    c.code as context_code,
    c.name as context_name,
    cc.slug,
    cc.name,
    cc.status,
    cc.source_type,
    cc.semantic_layer,
    cc.category_type,
    cc.is_active
  from public.contextual_categories cc
  left join public.contexts c
    on c.id = cc.context_id
  where lower(cc.slug) in (
    'walking',
    'work',
    'commute-to-work',
    'walking-to-work',
    'duration-minutes'
  )
  order by c.code, cc.slug
  limit 100
) as t

union all

select
  '07_sample_contextual_categories' as section,
  coalesce(jsonb_agg(to_jsonb(t) order by t.context_code, t.slug), '[]'::jsonb) as data
from (
  select
    cc.id,
    cc.context_id,
    c.code as context_code,
    c.name as context_name,
    cc.slug,
    cc.name,
    cc.status,
    cc.source_type,
    cc.semantic_layer,
    cc.category_type,
    cc.is_active
  from public.contextual_categories cc
  left join public.contexts c
    on c.id = cc.context_id
  order by c.code, cc.slug
  limit 150
) as t

union all

select
  '08_constraints_contextual_categories' as section,
  coalesce(jsonb_agg(to_jsonb(t) order by t.conname), '[]'::jsonb) as data
from (
  select
    conname,
    pg_get_constraintdef(c.oid) as constraint_def
  from pg_constraint c
  join pg_class rel
    on rel.oid = c.conrelid
  join pg_namespace nsp
    on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'contextual_categories'
  order by conname
) as t

union all

select
  '09_indexes_contextual_categories' as section,
  coalesce(jsonb_agg(to_jsonb(t) order by t.indexname), '[]'::jsonb) as data
from (
  select
    indexname,
    indexdef
  from pg_indexes
  where schemaname = 'public'
    and tablename = 'contextual_categories'
  order by indexname
) as t;