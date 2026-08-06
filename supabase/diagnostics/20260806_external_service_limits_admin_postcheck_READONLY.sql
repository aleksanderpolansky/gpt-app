-- ARCTor GC: editable external service limits postcheck.
-- READ ONLY. This script changes nothing.

with checks as (
  select
    '01_settings_table_exists'::text as check_name,
    to_regclass('public.external_api_rate_limit_settings') is not null as passed,
    null::text as detail

  union all

  select
    '02_audit_table_exists',
    to_regclass('public.external_api_rate_limit_settings_audit') is not null,
    null

  union all

  select
    '03_settings_rls_enabled',
    coalesce(
      (
        select relrowsecurity
        from pg_class
        where oid = 'public.external_api_rate_limit_settings'::regclass
      ),
      false
    ),
    null

  union all

  select
    '04_audit_rls_enabled',
    coalesce(
      (
        select relrowsecurity
        from pg_class
        where oid = 'public.external_api_rate_limit_settings_audit'::regclass
      ),
      false
    ),
    null

  union all

  select
    '05_no_client_table_privileges',
    not has_table_privilege(
      'anon',
      'public.external_api_rate_limit_settings',
      'select,insert,update,delete'
    )
    and not has_table_privilege(
      'authenticated',
      'public.external_api_rate_limit_settings',
      'select,insert,update,delete'
    )
    and not has_table_privilege(
      'anon',
      'public.external_api_rate_limit_settings_audit',
      'select,insert,update,delete'
    )
    and not has_table_privilege(
      'authenticated',
      'public.external_api_rate_limit_settings_audit',
      'select,insert,update,delete'
    ),
    null

  union all

  select
    '06_update_rpc_exists',
    exists (
      select 1
      from pg_proc procedure
      join pg_namespace namespace
        on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname =
          'update_google_places_rate_limit_settings_v1'
    ),
    null

  union all

  select
    '07_client_cannot_execute_update_rpc',
    not has_function_privilege(
      'anon',
      'public.update_google_places_rate_limit_settings_v1(uuid,boolean,integer,integer,integer,boolean,integer,integer,integer)',
      'execute'
    )
    and not has_function_privilege(
      'authenticated',
      'public.update_google_places_rate_limit_settings_v1(uuid,boolean,integer,integer,integer,boolean,integer,integer,integer)',
      'execute'
    ),
    null

  union all

  select
    '08_search_settings_present',
    exists (
      select 1
      from public.external_api_rate_limit_settings settings
      where settings.provider = 'GOOGLE_PLACES_NEW'
        and settings.operation = 'search'
        and settings.user_scope_type = 'user_hour'
        and settings.user_limit = 30
        and settings.global_day_limit = 500
        and settings.global_month_limit = 9000
    ),
    (
      select concat_ws(
        '; ',
        settings.user_limit::text || '/user/hour',
        settings.global_day_limit::text || '/day',
        settings.global_month_limit::text || '/month'
      )
      from public.external_api_rate_limit_settings settings
      where settings.provider = 'GOOGLE_PLACES_NEW'
        and settings.operation = 'search'
    )

  union all

  select
    '09_resolve_settings_present',
    exists (
      select 1
      from public.external_api_rate_limit_settings settings
      where settings.provider = 'GOOGLE_PLACES_NEW'
        and settings.operation = 'resolve'
        and settings.user_scope_type = 'user_day'
        and settings.user_limit = 10
        and settings.global_day_limit = 100
        and settings.global_month_limit = 3000
    ),
    (
      select concat_ws(
        '; ',
        settings.user_limit::text || '/user/day',
        settings.global_day_limit::text || '/day',
        settings.global_month_limit::text || '/month'
      )
      from public.external_api_rate_limit_settings settings
      where settings.provider = 'GOOGLE_PLACES_NEW'
        and settings.operation = 'resolve'
    )

  union all

  select
    '10_consume_rpc_reads_settings',
    exists (
      select 1
      from pg_proc procedure
      join pg_namespace namespace
        on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname = 'consume_google_places_rate_limit_v1'
        and pg_get_functiondef(procedure.oid)
          like '%external_api_rate_limit_settings%'
        and pg_get_functiondef(procedure.oid)
          like '%limit_scope := ''disabled''%'
    ),
    null
)
select
  check_name,
  passed,
  detail
from checks
order by check_name;

select
  provider,
  operation,
  enabled,
  user_scope_type,
  user_limit,
  global_day_limit,
  global_month_limit,
  updated_at,
  updated_by_app_user_id
from public.external_api_rate_limit_settings
order by provider, operation;

select
  id,
  provider,
  operation,
  previous_settings,
  new_settings,
  changed_by_app_user_id,
  changed_at
from public.external_api_rate_limit_settings_audit
order by changed_at desc
limit 20;
