-- ARCTor.app — P7 Goal World Persistence Foundation
-- READ ONLY preflight.
-- Expected: all passed=true before applying the P7 migration.

with checks as (
  select
    1 as ord,
    '01_actors_exists' as check_name,
    to_regclass('public.actors') is not null as passed,
    to_regclass('public.actors')::text as detail

  union all

  select
    2,
    '02_value_objects_exists',
    to_regclass('public.value_objects') is not null,
    to_regclass('public.value_objects')::text

  union all

  select
    3,
    '03_goal_world_tables_absent',
    not exists (
      select 1
      from information_schema.tables
      where table_schema='public'
        and table_name in (
          'goal_worlds',
          'goal_world_goal_statements',
          'goal_world_goal_definitions',
          'goal_world_revisions',
          'goal_world_objectives',
          'goal_world_object_memberships',
          'goal_world_target_criteria',
          'goal_world_goal_hypotheses'
        )
    ),
    (
      select count(*)::text
      from information_schema.tables
      where table_schema='public'
        and table_name in (
          'goal_worlds',
          'goal_world_goal_statements',
          'goal_world_goal_definitions',
          'goal_world_revisions',
          'goal_world_objectives',
          'goal_world_object_memberships',
          'goal_world_target_criteria',
          'goal_world_goal_hypotheses'
        )
    )

  union all

  select
    4,
    '04_goal_world_functions_absent',
    not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and (
          p.proname like '%goal_world%p7%'
          or p.proname like 'enforce_goal_world_%'
        )
    ),
    (
      select count(*)::text
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and (
          p.proname like '%goal_world%p7%'
          or p.proname like 'enforce_goal_world_%'
        )
    )

  union all

  select
    5,
    '05_value_objects_rls_enabled',
    exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='value_objects'
        and c.relrowsecurity
    ),
    coalesce(
      (
        select c.relrowsecurity::text
        from pg_class c
        join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public'
          and c.relname='value_objects'
      ),
      'missing'
    )

  union all

  select
    6,
    '06_actor_owner_pattern_exists',
    exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and column_name='owner_actor_id'
    ),
    (
      select count(*)::text
      from information_schema.columns
      where table_schema='public'
        and column_name='owner_actor_id'
    )
)
select check_name, passed, detail
from checks
order by ord;
