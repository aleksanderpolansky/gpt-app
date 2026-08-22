-- ARCTOR_VO_CREATE_DELETE_UX_V1 POSTCHECK
-- READ ONLY. Does not call the delete function.

with fn as (
  select
    p.oid,
    p.prosecdef as security_definer,
    p.proconfig,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid = to_regprocedure(
      'public.delete_value_object_safe_v1(uuid,uuid,uuid)'
    )
), checks as (
  select 1 as no, '01_function_exists' as name,
    to_regprocedure('public.delete_value_object_safe_v1(uuid,uuid,uuid)') is not null as passed
  union all
  select 2, '02_security_definer', coalesce((select security_definer from fn), false)
  union all
  select 3, '03_search_path_locked', coalesce(
    (select proconfig @> array['search_path=public, pg_temp'] from fn), false
  )
  union all
  select 4, '04_service_role_execute', has_function_privilege(
    'service_role',
    'public.delete_value_object_safe_v1(uuid,uuid,uuid)',
    'EXECUTE'
  )
  union all
  select 5, '05_anon_blocked', not has_function_privilege(
    'anon',
    'public.delete_value_object_safe_v1(uuid,uuid,uuid)',
    'EXECUTE'
  )
  union all
  select 6, '06_authenticated_blocked', not has_function_privilege(
    'authenticated',
    'public.delete_value_object_safe_v1(uuid,uuid,uuid)',
    'EXECUTE'
  )
  union all
  select 7, '07_manual_private_guard', coalesce(
    (select definition like '%VO_SAFE_DELETE_ONLY_PRIVATE_MANUAL_ONTOLOGY%' from fn), false
  )
  union all
  select 8, '08_initial_version_guard', coalesce(
    (select definition like '%VO_SAFE_DELETE_ONLY_UNUSED_INITIAL_VERSION%' from fn), false
  )
  union all
  select 9, '09_dynamic_fk_fail_closed', coalesce(
    (select definition like '%VALUE_OBJECT_DELETE_BLOCKED_DEPENDENCY%' from fn), false
  )
  union all
  select 10, '10_composite_fk_fail_closed', coalesce(
    (select definition like '%VO_SAFE_DELETE_UNSUPPORTED_COMPOSITE_REFERENCE%' from fn), false
  )
  union all
  select 11, '11_non_fk_reference_guard', coalesce(
    (select definition like '%VALUE_OBJECT_DELETE_BLOCKED_REFERENCE_COLUMN%' from fn), false
  )
  union all
  select 12, '12_no_function_execution', true
)
select jsonb_build_object(
  'release', 'ARCTOR_VO_CREATE_DELETE_UX_V1',
  'total', count(*),
  'passed', count(*) filter (where passed),
  'allPass', bool_and(passed),
  'checks', jsonb_agg(jsonb_build_object('name', name, 'passed', passed) order by no)
) as postcheck
from checks;
