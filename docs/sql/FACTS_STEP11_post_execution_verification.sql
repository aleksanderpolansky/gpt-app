with expected_tables as (
  select *
  from (
    values
      ('activity_event_measures'),
      ('activity_object_facts'),
      ('activity_fact_review_items'),
      ('activity_fact_recalculation_queue')
  ) as t(table_name)
),
table_existence as (
  select
    e.table_name,
    case when it.table_name is not null then 'PRESENT' else 'MISSING' end as status
  from expected_tables e
  left join information_schema.tables it
    on it.table_schema = 'public'
   and it.table_name = e.table_name
),
rls_flags as (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in (
      'activity_event_measures',
      'activity_object_facts',
      'activity_fact_review_items',
      'activity_fact_recalculation_queue'
    )
),
policies as (
  select
    tablename as table_name,
    policyname,
    roles,
    cmd,
    qual,
    with_check
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'activity_event_measures',
      'activity_object_facts',
      'activity_fact_review_items',
      'activity_fact_recalculation_queue'
    )
),
privileges as (
  select
    table_name,
    grantee,
    privilege_type
  from information_schema.table_privileges
  where table_schema = 'public'
    and table_name in (
      'activity_event_measures',
      'activity_object_facts',
      'activity_fact_review_items',
      'activity_fact_recalculation_queue'
    )
    and grantee in ('anon', 'authenticated', 'service_role')
),
triggers as (
  select
    event_object_table as table_name,
    trigger_name,
    action_statement
  from information_schema.triggers
  where event_object_schema = 'public'
    and event_object_table in (
      'activity_event_measures',
      'activity_object_facts',
      'activity_fact_review_items',
      'activity_fact_recalculation_queue'
    )
),
columns_check as (
  select
    table_name,
    jsonb_agg(
      jsonb_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'udt_name', udt_name,
        'is_nullable', is_nullable
      )
      order by ordinal_position
    ) as columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name in (
      'activity_event_measures',
      'activity_object_facts',
      'activity_fact_review_items',
      'activity_fact_recalculation_queue'
    )
  group by table_name
),
fk_check as (
  select
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name as foreign_table_name,
    ccu.column_name as foreign_column_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema = tc.table_schema
  where tc.table_schema = 'public'
    and tc.constraint_type = 'FOREIGN KEY'
    and tc.table_name in (
      'activity_event_measures',
      'activity_object_facts',
      'activity_fact_review_items',
      'activity_fact_recalculation_queue'
    )
),
summary as (
  select
    (select count(*) from table_existence where status = 'PRESENT') as present_table_count,
    (select count(*) from table_existence where status = 'MISSING') as missing_table_count,
    (select count(*) from rls_flags where rls_enabled = true) as rls_enabled_count,
    (select count(*) from policies where qual = 'false' and with_check = 'false') as no_direct_policy_count,
    (select count(*) from privileges where grantee in ('anon', 'authenticated')) as direct_client_privilege_count,
    (select count(*) from privileges where grantee = 'service_role') as service_role_privilege_count,
    (select count(*) from triggers where action_statement ilike '%set_activity_recording_updated_at%') as updated_at_trigger_count,
    (select count(*) from fk_check) as fk_count
)
select
  'facts_step11_post_execution_summary' as section,
  to_jsonb(summary) as payload
from summary

union all

select
  'table_existence' as section,
  coalesce(jsonb_agg(to_jsonb(table_existence) order by table_name), '[]'::jsonb) as payload
from table_existence

union all

select
  'rls_flags' as section,
  coalesce(jsonb_agg(to_jsonb(rls_flags) order by table_name), '[]'::jsonb) as payload
from rls_flags

union all

select
  'policies' as section,
  coalesce(jsonb_agg(to_jsonb(policies) order by table_name, policyname), '[]'::jsonb) as payload
from policies

union all

select
  'privileges' as section,
  coalesce(jsonb_agg(to_jsonb(privileges) order by table_name, grantee, privilege_type), '[]'::jsonb) as payload
from privileges

union all

select
  'triggers' as section,
  coalesce(jsonb_agg(to_jsonb(triggers) order by table_name, trigger_name), '[]'::jsonb) as payload
from triggers

union all

select
  'columns' as section,
  coalesce(jsonb_agg(to_jsonb(columns_check) order by table_name), '[]'::jsonb) as payload
from columns_check

union all

select
  'foreign_keys' as section,
  coalesce(jsonb_agg(to_jsonb(fk_check) order by table_name, column_name), '[]'::jsonb) as payload
from fk_check;