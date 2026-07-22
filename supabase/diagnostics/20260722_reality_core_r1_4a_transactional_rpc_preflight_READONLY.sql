-- ARCTOR REALITY CORE R1-4A
-- TRANSACTIONAL RPC PREFLIGHT
-- READ ONLY / SELECT ONLY
--
-- Run only when R1-4B begins. Export the single result grid.
-- This file performs no CREATE, ALTER, DROP, INSERT, UPDATE, DELETE,
-- TRUNCATE, GRANT, REVOKE, CALL or RPC execution.

with required_columns(table_name, column_name) as (
  values
    ('activity_events', 'id'),
    ('activity_events', 'user_id'),
    ('activity_events', 'event_code'),
    ('activity_events', 'metadata_json'),
    ('activity_events', 'temporal_direction'),

    ('activity_event_measures', 'id'),
    ('activity_event_measures', 'activity_event_id'),
    ('activity_event_measures', 'user_id'),
    ('activity_event_measures', 'measure_type'),
    ('activity_event_measures', 'unit'),
    ('activity_event_measures', 'metadata'),

    ('activity_object_facts', 'id'),
    ('activity_object_facts', 'activity_event_id'),
    ('activity_object_facts', 'measure_id'),
    ('activity_object_facts', 'user_id'),
    ('activity_object_facts', 'semantic_object_key'),
    ('activity_object_facts', 'measure_type'),
    ('activity_object_facts', 'unit'),
    ('activity_object_facts', 'metadata'),

    ('activity_fact_review_items', 'id'),
    ('activity_fact_review_items', 'activity_event_id'),
    ('activity_fact_review_items', 'fact_id'),
    ('activity_fact_review_items', 'measure_id'),
    ('activity_fact_review_items', 'user_id'),
    ('activity_fact_review_items', 'user_decision'),
    ('activity_fact_review_items', 'metadata'),

    ('activity_fact_recalculation_queue', 'id'),
    ('activity_fact_recalculation_queue', 'activity_event_id'),
    ('activity_fact_recalculation_queue', 'user_id'),
    ('activity_fact_recalculation_queue', 'reason'),
    ('activity_fact_recalculation_queue', 'queue_status'),
    ('activity_fact_recalculation_queue', 'metadata')
),
missing_columns as (
  select
    rc.table_name,
    rc.column_name
  from required_columns rc
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = rc.table_name
   and c.column_name = rc.column_name
  where c.column_name is null
),
duplicate_event_codes as (
  select
    user_id,
    event_code,
    count(*) as duplicate_count
  from public.activity_events
  where event_code is not null
  group by user_id, event_code
  having count(*) > 1
),
target_tables as (
  select unnest(array[
    'activity_events',
    'activity_event_measures',
    'activity_object_facts',
    'activity_fact_review_items',
    'activity_fact_recalculation_queue'
  ]::text[]) as table_name
),
table_rls as (
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join target_tables tt on tt.table_name = c.relname
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
),
rows as (
  select
    'required_columns'::text as check_name,
    case when count(*) = 0 then 'PASS' else 'FAIL' end as status,
    jsonb_build_object(
      'missingCount', count(*),
      'missing', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'table', table_name,
            'column', column_name
          )
          order by table_name, column_name
        ) filter (where table_name is not null),
        '[]'::jsonb
      )
    ) as details
  from missing_columns

  union all

  select
    'event_code_uniqueness',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    jsonb_build_object(
      'duplicateGroupCount', count(*),
      'duplicates', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'userId', user_id,
            'eventCode', event_code,
            'count', duplicate_count
          )
          order by event_code
        ) filter (where event_code is not null),
        '[]'::jsonb
      )
    )
  from duplicate_event_codes

  union all

  select
    'target_table_rls',
    case
      when count(*) = 5 and bool_and(rls_enabled) then 'PASS'
      else 'FAIL'
    end,
    jsonb_build_object(
      'tableCount', count(*),
      'allRlsEnabled', coalesce(bool_and(rls_enabled), false),
      'tables', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'table', table_name,
            'rlsEnabled', rls_enabled
          )
          order by table_name
        ),
        '[]'::jsonb
      )
    )
  from table_rls

  union all

  select
    'existing_rpc',
    case when count(*) = 0 then 'PASS' else 'WARN' end,
    jsonb_build_object(
      'existingFunctionCount', count(*),
      'functions', coalesce(
        jsonb_agg(
          p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
          order by p.oid
        ),
        '[]'::jsonb
      )
    )
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'save_reality_activity_v1'

  union all

  select
    'current_row_counts',
    'INFO',
    jsonb_build_object(
      'activityEvents', (select count(*) from public.activity_events),
      'measures', (select count(*) from public.activity_event_measures),
      'objectFacts', (select count(*) from public.activity_object_facts),
      'reviewItems', (select count(*) from public.activity_fact_review_items),
      'recalculationQueue', (
        select count(*) from public.activity_fact_recalculation_queue
      )
    )
)
select
  check_name,
  status,
  details
from rows
order by check_name;
