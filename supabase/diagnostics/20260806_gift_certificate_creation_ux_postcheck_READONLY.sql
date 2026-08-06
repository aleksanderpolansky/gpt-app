-- ARCTor.app
-- Gift-certificate creation UX postcheck (read only).

with target as (
  select
    to_regprocedure(
      'public.create_gift_certificate_activity_draft_v1(uuid,uuid,uuid,text,text,date,date,text,numeric,numeric,numeric,text,date,timestamp with time zone,text,boolean,text,timestamp with time zone,timestamp with time zone)'
    ) as oid
), definition as (
  select
    target.oid,
    case when target.oid is null then '' else pg_get_functiondef(target.oid) end as source,
    case when target.oid is null then null else p.prosecdef end as security_definer,
    case when target.oid is null then null else p.proconfig end as config
  from target
  left join pg_proc p on p.oid = target.oid
), checks as (
  select 1 as ordering, '01_draft_rpc_exists'::text as check_name,
    oid is not null as passed,
    oid::text as detail
  from definition

  union all
  select 2, '02_rpc_security_definer',
    coalesce(security_definer, false),
    security_definer::text
  from definition

  union all
  select 3, '03_rpc_search_path_locked',
    coalesce(config @> array['search_path=public, extensions, pg_temp'], false),
    coalesce(array_to_string(config, '; '), '')
  from definition

  union all
  select 4, '04_individual_time_uses_unscheduled',
    source like '%scheduleModeCode'', ''unscheduled''%',
    null
  from definition

  union all
  select 5, '05_individual_agreement_metadata_present',
    source like '%serviceTimeAgreement'', ''individual''%',
    null
  from definition

  union all
  select 6, '06_exact_time_mode_retained',
    source like '%scheduleModeCode'', ''exact''%'
      and source like '%serviceTimeAgreement'', ''exact''%',
    null
  from definition

  union all
  select 7, '07_partial_interval_guard_present',
    source like '%GCR6C_SERVICE_TIME_MODE_INCOMPLETE%',
    null
  from definition

  union all
  select 8, '08_service_role_can_execute',
    coalesce(
      has_function_privilege('service_role', oid, 'EXECUTE'),
      false
    ),
    null
  from definition

  union all
  select 9, '09_anon_cannot_execute',
    not coalesce(has_function_privilege('anon', oid, 'EXECUTE'), false),
    null
  from definition

  union all
  select 10, '10_authenticated_cannot_execute',
    not coalesce(
      has_function_privilege('authenticated', oid, 'EXECUTE'),
      false
    ),
    null
  from definition
)
select check_name, passed, detail
from checks
order by ordering;
