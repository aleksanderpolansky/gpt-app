with constraints as (
  select
    c.conname,
    pg_get_constraintdef(c.oid) as definition,
    c.convalidated
  from pg_constraint c
  where c.conrelid = 'public.dashboard_analytics_blocks'::regclass
),
checks as (
  select
    '01_table_exists'::text as check_name,
    to_regclass('public.dashboard_analytics_blocks') is not null as passed,
    coalesce(to_regclass('public.dashboard_analytics_blocks')::text, 'missing') as detail

  union all

  select
    '02_map_visualization_allowed',
    exists (
      select 1 from constraints
      where conname = 'dashboard_analytics_blocks_visualization_check'
        and convalidated
        and definition like '%''map''%'
    ),
    coalesce((
      select definition from constraints
      where conname = 'dashboard_analytics_blocks_visualization_check'
    ), 'missing')

  union all

  select
    '03_location_grouping_allowed',
    exists (
      select 1 from constraints
      where conname = 'dashboard_analytics_blocks_grouping_check'
        and convalidated
        and definition like '%''location''%'
    ),
    coalesce((
      select definition from constraints
      where conname = 'dashboard_analytics_blocks_grouping_check'
    ), 'missing')

  union all

  select
    '04_rls_still_enabled',
    coalesce((
      select relrowsecurity
      from pg_class
      where oid = 'public.dashboard_analytics_blocks'::regclass
    ), false),
    'RLS must remain enabled'

  union all

  select
    '05_authenticated_still_has_no_direct_select',
    not has_table_privilege(
      'authenticated','public.dashboard_analytics_blocks','SELECT'
    ),
    has_table_privilege(
      'authenticated','public.dashboard_analytics_blocks','SELECT'
    )::text

  union all

  select
    '06_service_role_still_has_table_access',
    has_table_privilege(
      'service_role','public.dashboard_analytics_blocks','SELECT,INSERT,UPDATE,DELETE'
    ),
    has_table_privilege(
      'service_role','public.dashboard_analytics_blocks','SELECT,INSERT,UPDATE,DELETE'
    )::text
)
select check_name, passed, detail
from checks
order by check_name;