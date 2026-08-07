-- ARCTor Dashboard Analytics V1 read-only postcheck.
-- Expected: every row passed=true.

with checks as (
  select
    '01_table_exists'::text as check_name,
    to_regclass('public.dashboard_analytics_blocks') is not null as passed,
    coalesce(
      to_regclass('public.dashboard_analytics_blocks')::text,
      'missing'
    ) as detail

  union all
  select
    '02_owner_user_column_exists',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'dashboard_analytics_blocks'
        and column_name = 'owner_user_id'
        and is_nullable = 'NO'
    ),
    'owner_user_id'

  union all
  select
    '03_owner_actor_column_exists',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'dashboard_analytics_blocks'
        and column_name = 'owner_actor_id'
        and is_nullable = 'NO'
    ),
    'owner_actor_id'

  union all
  select
    '04_visualization_column_exists',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'dashboard_analytics_blocks'
        and column_name = 'visualization_type'
    ),
    'line/bar/metric enabled by V1 runtime'

  union all
  select
    '05_source_metric_contract_columns_exist',
    (
      select count(*) = 4
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'dashboard_analytics_blocks'
        and column_name in (
          'source_type',
          'metric_key',
          'aggregation_key',
          'group_by_key'
        )
    ),
    'source + metric + aggregation + grouping'

  union all
  select
    '06_period_column_exists',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'dashboard_analytics_blocks'
        and column_name = 'period_days'
    ),
    'period_days'

  union all
  select
    '07_rls_enabled',
    coalesce((
      select c.relrowsecurity
      from pg_catalog.pg_class c
      where c.oid = to_regclass('public.dashboard_analytics_blocks')
    ), false),
    'RLS enabled'

  union all
  select
    '08_authenticated_no_direct_select',
    not has_table_privilege(
      'authenticated',
      'public.dashboard_analytics_blocks',
      'SELECT'
    ),
    'server-mediated access'

  union all
  select
    '09_authenticated_no_direct_write',
    not has_table_privilege(
      'authenticated',
      'public.dashboard_analytics_blocks',
      'INSERT'
    )
    and not has_table_privilege(
      'authenticated',
      'public.dashboard_analytics_blocks',
      'UPDATE'
    )
    and not has_table_privilege(
      'authenticated',
      'public.dashboard_analytics_blocks',
      'DELETE'
    ),
    'server-mediated writes'

  union all
  select
    '10_service_role_access',
    has_table_privilege(
      'service_role',
      'public.dashboard_analytics_blocks',
      'SELECT'
    )
    and has_table_privilege(
      'service_role',
      'public.dashboard_analytics_blocks',
      'INSERT'
    )
    and has_table_privilege(
      'service_role',
      'public.dashboard_analytics_blocks',
      'DELETE'
    ),
    'service_role'

  union all
  select
    '11_initial_rows_summary',
    true,
    format(
      'dashboard_analytics_blocks=%s',
      (select count(*) from public.dashboard_analytics_blocks)
    )
)
select check_name, passed, detail
from checks
order by check_name;
