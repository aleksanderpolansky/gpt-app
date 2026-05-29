-- GPT-APP / AI-NAVIGATOR
-- C8-I-V2 - CONSOLIDATED READ-ONLY SANDBOX SCHEMA DRIFT DIAGNOSTIC
-- Purpose: diagnose ERROR 42703: column "rule_key" does not exist.
-- Target: current sandbox Supabase project only.
-- Production: do not use.
-- Secrets: do not paste or print secrets, keys, passwords, connection strings, JWT, or service_role keys.
-- This SQL is read-only diagnostic SQL.
-- Result shape: one JSON object in one result row.

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
),
expected_columns(table_name, column_name) as (
  values
    ('state_relevance_rules', 'id'),
    ('state_relevance_rules', 'rule_key'),
    ('state_relevance_rules', 'dimension_id'),
    ('state_relevance_rules', 'source_type'),
    ('state_relevance_rules', 'target_type'),
    ('state_relevance_rules', 'relevance_type'),
    ('state_relevance_rules', 'weight'),
    ('state_relevance_rules', 'is_active'),
    ('state_relevance_rules', 'created_at'),
    ('state_relevance_rules', 'updated_at')
),
table_status as (
  select
    e.table_name,
    case when t.table_name is null then 'missing' else 'exists' end as table_status
  from expected_tables e
  left join information_schema.tables t
    on t.table_schema = 'public'
   and t.table_name = e.table_name
),
column_status as (
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
),
all_columns as (
  select
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name in (select table_name from expected_tables)
),
rls_status as (
  select
    p.tablename as table_name,
    p.rowsecurity
  from pg_tables p
  where p.schemaname = 'public'
    and p.tablename in (select table_name from expected_tables)
),
index_status as (
  select
    i.tablename as table_name,
    i.indexname,
    i.indexdef
  from pg_indexes i
  where i.schemaname = 'public'
    and i.tablename in (select table_name from expected_tables)
),
privilege_status as (
  select
    tp.table_name,
    tp.grantee,
    tp.privilege_type
  from information_schema.table_privileges tp
  where tp.table_schema = 'public'
    and tp.table_name in (select table_name from expected_tables)
),
anon_auth_privilege_summary as (
  select
    tp.table_name,
    tp.grantee,
    array_agg(tp.privilege_type order by tp.privilege_type) as privilege_types
  from information_schema.table_privileges tp
  where tp.table_schema = 'public'
    and tp.table_name in (select table_name from expected_tables)
    and tp.grantee in ('anon', 'authenticated')
  group by tp.table_name, tp.grantee
),
rule_key_check as (
  select
    case
      when exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'state_relevance_rules'
          and c.column_name = 'rule_key'
      )
      then 'rule_key_exists'
      else 'rule_key_missing'
    end as rule_key_status
),
summary as (
  select
    (select count(*) from table_status where table_status = 'exists') as expected_tables_existing_count,
    (select count(*) from table_status where table_status = 'missing') as expected_tables_missing_count,
    (select rule_key_status from rule_key_check) as rule_key_status,
    (select count(*) from anon_auth_privilege_summary) as anon_authenticated_table_grant_rows
)
select jsonb_pretty(
  jsonb_build_object(
    'gate', 'C8-I-V2',
    'mode', 'read_only_consolidated_schema_drift_diagnostic',
    'target', 'current sandbox Supabase project only',
    'production', 'do not use',
    'observed_previous_error', 'ERROR 42703: column rule_key does not exist',
    'summary', (select to_jsonb(summary) from summary),
    'table_status', coalesce((select jsonb_agg(to_jsonb(table_status) order by table_name) from table_status), '[]'::jsonb),
    'state_relevance_rules_expected_columns', coalesce((select jsonb_agg(to_jsonb(column_status) order by column_name) from column_status), '[]'::jsonb),
    'all_existing_c8_i_columns', coalesce((select jsonb_agg(to_jsonb(all_columns) order by table_name, ordinal_position) from all_columns), '[]'::jsonb),
    'rls_status', coalesce((select jsonb_agg(to_jsonb(rls_status) order by table_name) from rls_status), '[]'::jsonb),
    'indexes', coalesce((select jsonb_agg(to_jsonb(index_status) order by table_name, indexname) from index_status), '[]'::jsonb),
    'anon_authenticated_privilege_summary', coalesce((select jsonb_agg(to_jsonb(anon_auth_privilege_summary) order by table_name, grantee) from anon_auth_privilege_summary), '[]'::jsonb),
    'all_privileges', coalesce((select jsonb_agg(to_jsonb(privilege_status) order by table_name, grantee, privilege_type) from privilege_status), '[]'::jsonb)
  )
) as c8_i_v2_diagnostic_result_json;
