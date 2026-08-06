-- ARCTor GC: Google Places rate-limit postcheck.
-- Read-only. Does not insert, update, delete, or consume quota.

with checks as (
  select
    '01_rate_limit_table_exists'::text as check_name,
    to_regclass('public.external_api_rate_limit_windows') is not null
      as passed,
    null::text as detail

  union all

  select
    '02_rate_limit_table_rls_enabled',
    coalesce(
      (
        select relrowsecurity
        from pg_class
        where oid = 'public.external_api_rate_limit_windows'::regclass
      ),
      false
    ),
    null

  union all

  select
    '03_rate_limit_rpc_exists',
    to_regprocedure(
      'public.consume_google_places_rate_limit_v1(text,text)'
    ) is not null,
    null

  union all

  select
    '04_service_role_can_execute',
    has_function_privilege(
      'service_role',
      'public.consume_google_places_rate_limit_v1(text,text)',
      'EXECUTE'
    ),
    null

  union all

  select
    '05_anon_cannot_execute',
    not has_function_privilege(
      'anon',
      'public.consume_google_places_rate_limit_v1(text,text)',
      'EXECUTE'
    ),
    null

  union all

  select
    '06_authenticated_cannot_execute',
    not has_function_privilege(
      'authenticated',
      'public.consume_google_places_rate_limit_v1(text,text)',
      'EXECUTE'
    ),
    null

  union all

  select
    '07_no_client_table_privileges',
    not exists (
      select 1
      from information_schema.role_table_grants grants
      where grants.table_schema = 'public'
        and grants.table_name = 'external_api_rate_limit_windows'
        and grants.grantee in ('anon', 'authenticated', 'PUBLIC')
    ),
    null

  union all

  select
    '08_search_limits_present',
    (
      select pg_get_functiondef(
        'public.consume_google_places_rate_limit_v1(text,text)'::regprocedure
      ) like '%v_user_limit := 30;%'
      and pg_get_functiondef(
        'public.consume_google_places_rate_limit_v1(text,text)'::regprocedure
      ) like '%v_global_day_limit := 500;%'
      and pg_get_functiondef(
        'public.consume_google_places_rate_limit_v1(text,text)'::regprocedure
      ) like '%v_global_month_limit := 9000;%'
    ),
    '30/user/hour; 500/day; 9000/month'

  union all

  select
    '09_resolve_limits_present',
    (
      select pg_get_functiondef(
        'public.consume_google_places_rate_limit_v1(text,text)'::regprocedure
      ) like '%v_user_limit := 10;%'
      and pg_get_functiondef(
        'public.consume_google_places_rate_limit_v1(text,text)'::regprocedure
      ) like '%v_global_day_limit := 100;%'
      and pg_get_functiondef(
        'public.consume_google_places_rate_limit_v1(text,text)'::regprocedure
      ) like '%v_global_month_limit := 3000;%'
    ),
    '10/user/day; 100/day; 3000/month'

  union all

  select
    '10_counter_rows_valid',
    not exists (
      select 1
      from public.external_api_rate_limit_windows counters
      where counters.request_count < 0
        or counters.scope_key is null
        or counters.window_started_at is null
    ),
    (
      select count(*)::text
      from public.external_api_rate_limit_windows
    )
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
  scope_type,
  window_started_at,
  request_count,
  updated_at
from public.external_api_rate_limit_windows
order by updated_at desc
limit 50;
