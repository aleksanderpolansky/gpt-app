-- GPT-APP / AI-NAVIGATOR
-- C8-I-U - READ-ONLY SANDBOX SCHEMA DRIFT DIAGNOSTIC
-- Purpose: diagnose ERROR 42703: column "rule_key" does not exist.
-- Target: current sandbox Supabase project only.
-- Production: do not use.
-- Secrets: do not paste or print secrets, keys, passwords, connection strings, JWT, or service_role keys.
-- This SQL is read-only diagnostic SQL.
-- Expected: run manually in Supabase Dashboard SQL Editor only after a separate explicit diagnostic gate.

with expected_tables(table_name) as (
  values
    ('state_dimensions'),
    ('state_relevance_rules'),
    ('value_object_state_facts'),
    ('activity_state_deltas'),
    ('value_object_state_snapshots'),
    ('semantic_signatures'),
    ('value_object_similarity_edges'),
    ('value_object_relevance_edges'),
    ('resolver_runs'),
    ('resolver_candidate_links'),
    ('resolver_feedback')
)
select
  e.table_name,
  case when t.table_name is null then 'missing' else 'exists' end as table_status
from expected_tables e
left join information_schema.tables t
  on t.table_schema = 'public'
 and t.table_name = e.table_name
order by e.table_name;

select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in (
    'state_dimensions',
    'state_relevance_rules',
    'value_object_state_facts',
    'activity_state_deltas',
    'value_object_state_snapshots',
    'semantic_signatures',
    'value_object_similarity_edges',
    'value_object_relevance_edges',
    'resolver_runs',
    'resolver_candidate_links',
    'resolver_feedback'
  )
order by c.table_name, c.ordinal_position;

with expected_columns(table_name, column_name) as (
  values
    ('state_relevance_rules', 'rule_key')
)
select
  e.table_name,
  e.column_name,
  case when c.column_name is null then 'missing' else 'exists' end as column_status,
  c.data_type,
  c.is_nullable,
  c.column_default
from expected_columns e
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = e.table_name
 and c.column_name = e.column_name
order by e.table_name, e.column_name;

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'state_dimensions',
    'state_relevance_rules',
    'value_object_state_facts',
    'activity_state_deltas',
    'value_object_state_snapshots',
    'semantic_signatures',
    'value_object_similarity_edges',
    'value_object_relevance_edges',
    'resolver_runs',
    'resolver_candidate_links',
    'resolver_feedback'
  )
order by tablename;

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'state_dimensions',
    'state_relevance_rules',
    'value_object_state_facts',
    'activity_state_deltas',
    'value_object_state_snapshots',
    'semantic_signatures',
    'value_object_similarity_edges',
    'value_object_relevance_edges',
    'resolver_runs',
    'resolver_candidate_links',
    'resolver_feedback'
  )
order by tablename, indexname;

select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in (
    'state_dimensions',
    'state_relevance_rules',
    'value_object_state_facts',
    'activity_state_deltas',
    'value_object_state_snapshots',
    'semantic_signatures',
    'value_object_similarity_edges',
    'value_object_relevance_edges',
    'resolver_runs',
    'resolver_candidate_links',
    'resolver_feedback'
  )
order by table_name, grantee, privilege_type;
