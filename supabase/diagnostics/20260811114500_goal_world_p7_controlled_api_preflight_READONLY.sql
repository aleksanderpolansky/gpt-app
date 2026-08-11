-- ARCTor.app — P7 Controlled Goal World API v1
-- READ ONLY preflight. Expected: all passed=true.

with checks as (
  select
    1 as ord,
    '01_goal_world_foundation_exists' as check_name,
    to_regclass('public.goal_worlds') is not null
      and to_regclass('public.goal_world_revisions') is not null
      and to_regclass('public.goal_world_objectives') is not null as passed,
    'goal_worlds / revisions / objectives' as detail

  union all

  select
    2,
    '02_revision_extension_columns_absent',
    not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='goal_world_revisions'
        and column_name in (
          'unknown_codes',
          'protocol_refs_json'
        )
    ),
    (
      select count(*)::text
      from information_schema.columns
      where table_schema='public'
        and table_name='goal_world_revisions'
        and column_name in (
          'unknown_codes',
          'protocol_refs_json'
        )
    )

  union all

  select
    3,
    '03_create_rpc_absent',
    to_regprocedure(
      'public.create_goal_world_v1(uuid,jsonb)'
    ) is null,
    coalesce(
      to_regprocedure(
        'public.create_goal_world_v1(uuid,jsonb)'
      )::text,
      'absent'
    )

  union all

  select
    4,
    '04_revise_rpc_absent',
    to_regprocedure(
      'public.revise_goal_world_v1(uuid,uuid,integer,jsonb)'
    ) is null,
    coalesce(
      to_regprocedure(
        'public.revise_goal_world_v1(uuid,uuid,integer,jsonb)'
      )::text,
      'absent'
    )

  union all

  select
    5,
    '05_service_role_still_select_only_on_goal_world_tables',
    has_table_privilege(
      'service_role',
      'public.goal_worlds',
      'SELECT'
    )
    and not has_table_privilege(
      'service_role',
      'public.goal_worlds',
      'INSERT'
    )
    and not has_table_privilege(
      'service_role',
      'public.goal_world_revisions',
      'INSERT'
    ),
    'SELECT yes / direct INSERT no'

  union all

  select
    6,
    '06_value_objects_owner_and_scope_available',
    exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='value_objects'
        and column_name='owner_actor_id'
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='value_objects'
        and column_name='scope_code'
    ),
    'owner_actor_id + scope_code'
)
select check_name, passed, detail
from checks
order by ord;
