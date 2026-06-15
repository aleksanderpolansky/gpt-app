select 'FACTS_STEP7_SANITIZED_SELECT_ONLY_SCHEMA_INSPECTION_GATE' as gate_id, 'SELECT_ONLY' as execution_mode, now() as prepared_at;


select
  'FACTS_STEP6_SELECT_ONLY_SCHEMA_INSPECTION_GATE' as gate_id,
  'SELECT_ONLY' as execution_mode,
  'No writes intended. Inspect schema only.' as safety_note,
  now() as inspected_at;


select
  'required_table_existence' as section,
  required.table_schema,
  required.table_name,
  case when tables.table_name is not null then 'PRESENT' else 'MISSING' end as status
from (
  values
    ('public', 'activity_events'),
    ('public', 'value_objects'),
    ('public', 'activity_event_measures'),
    ('public', 'activity_object_facts'),
    ('public', 'activity_fact_review_items'),
    ('public', 'activity_fact_recalculation_queue'),
    ('public', 'actors'),
    ('public', 'app_users'),
    ('public', 'persons')
) as required(table_schema, table_name)
left join information_schema.tables tables
  on tables.table_schema = required.table_schema
 and tables.table_name = required.table_name
order by required.table_name;


select
  'activity_events_columns' as section,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'activity_events'
order by c.ordinal_position;


select
  'value_objects_columns' as section,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'value_objects'
order by c.ordinal_position;


select
  'identity_mapping_columns' as section,
  c.table_schema,
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in (
    'actors',
    'app_users',
    'persons',
    'profiles',
    'user_profiles',
    'auth_users',
    'organization_members'
  )
order by c.table_name, c.ordinal_position;


select
  'constraints_activity_value_identity' as section,
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name in (
    'activity_events',
    'value_objects',
    'activity_event_measures',
    'activity_object_facts',
    'activity_fact_review_items',
    'activity_fact_recalculation_queue',
    'actors',
    'app_users',
    'persons'
  )
order by tc.table_name, tc.constraint_type, tc.constraint_name, kcu.ordinal_position;


select
  'indexes_activity_value_facts' as section,
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'activity_events',
    'value_objects',
    'activity_event_measures',
    'activity_object_facts',
    'activity_fact_review_items',
    'activity_fact_recalculation_queue'
  )
order by tablename, indexname;


select
  'rls_enabled_flags' as section,
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'activity_events',
    'value_objects',
    'activity_event_measures',
    'activity_object_facts',
    'activity_fact_review_items',
    'activity_fact_recalculation_queue'
  )
order by c.relname;


select
  'rls_policies' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'activity_events',
    'value_objects',
    'activity_event_measures',
    'activity_object_facts',
    'activity_fact_review_items',
    'activity_fact_recalculation_queue'
  )
order by tablename, policyname;


select
  'table_privileges' as section,
  grantee,
  table_schema,
  table_name,
  privilege_type,
  is_grantable
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in (
    'activity_events',
    'value_objects',
    'activity_event_measures',
    'activity_object_facts',
    'activity_fact_review_items',
    'activity_fact_recalculation_queue'
  )
  and grantee in ('anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;


select
  'updated_at_trigger_candidates' as section,
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and (
    trigger_name ilike '%updated_at%'
    or action_statement ilike '%updated_at%'
  )
order by event_object_table, trigger_name;

select
  'updated_at_function_candidates' as section,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname ilike '%updated_at%'
    or p.proname ilike '%set_updated%'
    or p.proname ilike '%touch%'
  )
order by p.proname;


select
  'activity_security_pattern_summary' as section,
  'activity_events' as table_name,
  coalesce((
    select jsonb_agg(distinct privilege_type order by privilege_type)
    from information_schema.table_privileges tp
    where tp.table_schema = 'public'
      and tp.table_name = 'activity_events'
      and tp.grantee = 'authenticated'
  ), '[]'::jsonb) as authenticated_privileges,
  coalesce((
    select jsonb_agg(distinct privilege_type order by privilege_type)
    from information_schema.table_privileges tp
    where tp.table_schema = 'public'
      and tp.table_name = 'activity_events'
      and tp.grantee = 'anon'
  ), '[]'::jsonb) as anon_privileges,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'policy', policyname,
      'cmd', cmd,
      'roles', roles,
      'qual', qual,
      'with_check', with_check
    ) order by policyname)
    from pg_policies pp
    where pp.schemaname = 'public'
      and pp.tablename = 'activity_events'
  ), '[]'::jsonb) as policies;


with checks as (
  select
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'activity_events'
    ) as activity_events_exists,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'activity_events' and column_name = 'id'
    ) as activity_events_id_exists,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'activity_events' and column_name = 'user_id'
    ) as activity_events_user_id_exists,
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'value_objects'
    ) as value_objects_exists,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'value_objects' and column_name = 'id'
    ) as value_objects_id_exists
)
select
  'facts_step6_readiness_checklist' as section,
  activity_events_exists,
  activity_events_id_exists,
  activity_events_user_id_exists,
  value_objects_exists,
  value_objects_id_exists,
  case
    when activity_events_exists
     and activity_events_id_exists
     and activity_events_user_id_exists
     and value_objects_exists
     and value_objects_id_exists
    then 'BASIC_FK_TARGETS_PRESENT'
    else 'BLOCKED_BASIC_FK_TARGETS_MISSING'
  end as basic_fk_target_status
from checks;

