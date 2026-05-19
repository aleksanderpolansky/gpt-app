-- P4.10.0-C8-P2 - Inspect live value_object_category_links constraints
-- Date: 2026-05-19
-- Project: gpt-app / AI-NAVIGATOR
--
-- Safe A2 version:
-- - no diagnostic json text section
-- - only actual live DB metadata inspection
-- - intended for Supabase SQL Editor

with target_table as (
  select
    'public'::text as table_schema,
    'value_object_category_links'::text as table_name
),
table_columns as (
  select
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default
  from information_schema.columns c
  join target_table t
    on c.table_schema = t.table_schema
   and c.table_name = t.table_name
  order by c.ordinal_position
),
pg_constraints_rows as (
  select
    con.conname as constraint_name,
    con.contype as constraint_type_code,
    case con.contype
      when 'c' then 'check'
      when 'f' then 'foreign_key'
      when 'p' then 'primary_key'
      when 'u' then 'unique'
      else con.contype::text
    end as constraint_type,
    pg_get_constraintdef(con.oid) as constraint_definition
  from pg_constraint con
  join pg_class rel
    on rel.oid = con.conrelid
  join pg_namespace nsp
    on nsp.oid = rel.relnamespace
  join target_table t
    on nsp.nspname = t.table_schema
   and rel.relname = t.table_name
  order by con.contype, con.conname
),
pg_indexes_rows as (
  select
    i.schemaname,
    i.tablename,
    i.indexname,
    i.indexdef
  from pg_indexes i
  join target_table t
    on i.schemaname = t.table_schema
   and i.tablename = t.table_name
  order by i.indexname
),
category_role_values as (
  select
    category_role,
    count(*) as count
  from public.value_object_category_links
  group by category_role
  order by category_role
),
source_values as (
  select
    source,
    count(*) as count
  from public.value_object_category_links
  group by source
  order by source
),
sample_rows as (
  select
    id,
    value_object_id,
    category_table,
    category_id,
    category_role,
    source,
    confidence,
    metadata_json,
    created_at,
    updated_at
  from public.value_object_category_links
  order by created_at desc nulls last, id desc
  limit 20
),
constraint_summary as (
  select
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_object_category_links'
        and column_name = 'category_role'
    ) as has_category_role_column,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_object_category_links'
        and column_name = 'source'
    ) as has_source_column,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_object_category_links'
        and column_name = 'metadata_json'
    ) as has_metadata_json_column,
    exists (
      select 1
      from pg_constraints_rows
      where constraint_type = 'unique'
        and constraint_definition ilike '%value_object_id%'
        and constraint_definition ilike '%category_table%'
        and constraint_definition ilike '%category_id%'
        and constraint_definition ilike '%category_role%'
    ) as has_expected_unique_constraint,
    (
      select constraint_definition
      from pg_constraints_rows
      where constraint_name ilike '%category_role%'
         or constraint_definition ilike '%category_role%'
      order by constraint_name
      limit 1
    ) as category_role_constraint_definition,
    (
      select constraint_definition
      from pg_constraints_rows
      where constraint_name ilike '%source%'
         or constraint_definition ilike '%source%'
      order by constraint_name
      limit 1
    ) as source_constraint_definition,
    (
      select constraint_definition
      from pg_constraints_rows
      where constraint_name ilike '%metadata%'
         or constraint_definition ilike '%metadata_json%'
      order by constraint_name
      limit 1
    ) as metadata_constraint_definition,
    (
      select constraint_definition
      from pg_constraints_rows
      where constraint_type = 'unique'
      order by constraint_name
      limit 1
    ) as unique_constraint_definition
)
select
  '01_columns' as section,
  coalesce(
    (select jsonb_agg(to_jsonb(c) order by c.ordinal_position) from table_columns c),
    '[]'::jsonb
  ) as data

union all

select
  '02_constraints' as section,
  coalesce(
    (select jsonb_agg(to_jsonb(c) order by c.constraint_type, c.constraint_name) from pg_constraints_rows c),
    '[]'::jsonb
  ) as data

union all

select
  '03_indexes' as section,
  coalesce(
    (select jsonb_agg(to_jsonb(i) order by i.indexname) from pg_indexes_rows i),
    '[]'::jsonb
  ) as data

union all

select
  '04_existing_category_role_values' as section,
  coalesce(
    (select jsonb_agg(to_jsonb(v) order by v.category_role) from category_role_values v),
    '[]'::jsonb
  ) as data

union all

select
  '05_existing_source_values' as section,
  coalesce(
    (select jsonb_agg(to_jsonb(v) order by v.source) from source_values v),
    '[]'::jsonb
  ) as data

union all

select
  '06_recent_sample_rows' as section,
  coalesce(
    (select jsonb_agg(to_jsonb(r) order by r.created_at desc nulls last, r.id desc) from sample_rows r),
    '[]'::jsonb
  ) as data

union all

select
  '07_constraint_summary' as section,
  to_jsonb(s) as data
from constraint_summary s;