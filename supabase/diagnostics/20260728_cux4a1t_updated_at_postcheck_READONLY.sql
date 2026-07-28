-- ARCTor.app
-- CUX4A1T updated_at correction postcheck — READ ONLY

with trigger_data as (
  select
    trigger_row.oid,
    pg_get_triggerdef(trigger_row.oid, true) as definition
  from pg_trigger trigger_row
  join pg_class table_row
    on table_row.oid=trigger_row.tgrelid
  join pg_namespace namespace_row
    on namespace_row.oid=table_row.relnamespace
  where namespace_row.nspname='public'
    and table_row.relname='activity_semantic_enrichment_runs_cux4'
    and trigger_row.tgname=
      'activity_semantic_enrichment_runs_cux4_updated_at_trg'
    and not trigger_row.tgisinternal
),
function_data as (
  select
    to_regprocedure(
      'public.set_activity_semantic_enrichment_updated_at_cux4()'
    ) as procedure_oid
),
checks as (
  select
    10 as ord,
    'dedicated_function_exists' as check_code,
    procedure_oid is not null as passed,
    jsonb_build_object(
      'procedure',
      procedure_oid::text
    ) as details
  from function_data

  union all

  select
    20,
    'dedicated_function_uses_clock_timestamp',
    procedure_oid is not null
    and pg_get_functiondef(procedure_oid)
      ilike '%clock_timestamp()%',
    jsonb_build_object(
      'definition',
      case
        when procedure_oid is null then null
        else pg_get_functiondef(procedure_oid)
      end
    )
  from function_data

  union all

  select
    30,
    'dedicated_function_guards_created_at',
    procedure_oid is not null
    and pg_get_functiondef(procedure_oid)
      ilike '%greatest(clock_timestamp(), new.created_at)%',
    jsonb_build_object(
      'expected',
      'greatest(clock_timestamp(), new.created_at)'
    )
  from function_data

  union all

  select
    40,
    'updated_at_trigger_exists_once',
    (select count(*) from trigger_data)=1,
    jsonb_build_object(
      'count',
      (select count(*) from trigger_data)
    )

  union all

  select
    50,
    'updated_at_trigger_uses_dedicated_function',
    exists (
      select 1
      from trigger_data
      where definition ilike
        '%set_activity_semantic_enrichment_updated_at_cux4%'
    ),
    coalesce((
      select jsonb_build_object(
        'definition',
        definition
      )
      from trigger_data
      limit 1
    ), '{}'::jsonb)

  union all

  select
    60,
    'shared_function_still_exists',
    to_regprocedure(
      'public.set_activity_recording_updated_at()'
    ) is not null,
    jsonb_build_object(
      'procedure',
      to_regprocedure(
        'public.set_activity_recording_updated_at()'
      )::text
    )

  union all

  select
    70,
    'no_rows_created_by_fix',
    not exists (
      select 1
      from public.activity_semantic_enrichment_runs_cux4
    ),
    jsonb_build_object(
      'rows',
      (
        select count(*)
        from public.activity_semantic_enrichment_runs_cux4
      )
    )
)
select
  row_number() over(order by ord) as check_no,
  check_code,
  passed,
  details
from checks
order by ord;
