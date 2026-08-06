-- ARCTor.app
-- GCR6D read-only postcheck.
-- Expected: every row passed = true.

with checks as (
  select
    '01_guard_function_exists'::text as check_name,
    to_regprocedure(
      'public.enforce_activity_gift_certificate_terms_v1()'
    ) is not null as passed,
    to_regprocedure(
      'public.enforce_activity_gift_certificate_terms_v1()'
    )::text as detail

  union all

  select
    '02_guard_security_definer',
    coalesce(proc.prosecdef, false),
    proc.prosecdef::text
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'enforce_activity_gift_certificate_terms_v1'
    and pg_get_function_identity_arguments(proc.oid) = ''

  union all

  select
    '03_guard_search_path_locked',
    coalesce(
      'search_path=public, pg_temp' = any(proc.proconfig),
      false
    ),
    array_to_string(proc.proconfig, ', ')
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'enforce_activity_gift_certificate_terms_v1'
    and pg_get_function_identity_arguments(proc.oid) = ''

  union all

  select
    '04_individual_unscheduled_allowed',
    position(
      'schedule_mode_code = ''unscheduled'''
      in pg_get_functiondef(proc.oid)
    ) > 0
    and position(
      'serviceTimeAgreement'
      in pg_get_functiondef(proc.oid)
    ) > 0,
    null
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'enforce_activity_gift_certificate_terms_v1'
    and pg_get_function_identity_arguments(proc.oid) = ''

  union all

  select
    '05_exact_mode_retained',
    position(
      'schedule_mode_code = ''exact'''
      in pg_get_functiondef(proc.oid)
    ) > 0,
    null
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'enforce_activity_gift_certificate_terms_v1'
    and pg_get_function_identity_arguments(proc.oid) = ''

  union all

  select
    '06_old_exact_only_error_removed',
    position(
      'PGC3B_SERVICE_REQUIRES_EXACT_SCHEDULE'
      in pg_get_functiondef(proc.oid)
    ) = 0,
    null
  from pg_proc proc
  join pg_namespace namespace
    on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'enforce_activity_gift_certificate_terms_v1'
    and pg_get_function_identity_arguments(proc.oid) = ''

  union all

  select
    '07_guard_trigger_present',
    exists (
      select 1
      from pg_trigger trigger_row
      join pg_class relation
        on relation.oid = trigger_row.tgrelid
      join pg_namespace namespace
        on namespace.oid = relation.relnamespace
      join pg_proc proc
        on proc.oid = trigger_row.tgfoid
      where namespace.nspname = 'public'
        and relation.relname = 'activity_gift_certificate_terms'
        and not trigger_row.tgisinternal
        and proc.proname = 'enforce_activity_gift_certificate_terms_v1'
    ),
    null
)
select check_name, passed, detail
from checks
order by check_name;
