-- ARCTor.app — P7 Controlled Goal World API v1
-- READ ONLY postcheck. Expected: 14 rows; all passed=true.

with checks as (
  select
    1 as ord,
    '01_unknown_codes_column' as check_name,
    exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='goal_world_revisions'
        and column_name='unknown_codes'
        and data_type='ARRAY'
    ) as passed,
    'goal_world_revisions.unknown_codes text[]' as detail

  union all

  select
    2,
    '02_protocol_refs_column',
    exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='goal_world_revisions'
        and column_name='protocol_refs_json'
        and data_type='jsonb'
    ),
    'goal_world_revisions.protocol_refs_json jsonb'

  union all

  select
    3,
    '03_protocol_refs_array_guard',
    exists (
      select 1
      from pg_constraint
      where conrelid='public.goal_world_revisions'::regclass
        and conname='goal_world_revisions_protocol_refs_array_p7_check'
    ),
    'protocol refs must be JSON array'

  union all

  select
    4,
    '04_create_rpc_exists',
    to_regprocedure(
      'public.create_goal_world_v1(uuid,jsonb)'
    ) is not null,
    coalesce(
      to_regprocedure(
        'public.create_goal_world_v1(uuid,jsonb)'
      )::text,
      'missing'
    )

  union all

  select
    5,
    '05_revise_rpc_exists',
    to_regprocedure(
      'public.revise_goal_world_v1(uuid,uuid,integer,jsonb)'
    ) is not null,
    coalesce(
      to_regprocedure(
        'public.revise_goal_world_v1(uuid,uuid,integer,jsonb)'
      )::text,
      'missing'
    )

  union all

  select
    6,
    '06_rpc_security_definer',
    (
      select count(*)
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and p.proname in (
          'create_goal_world_v1',
          'revise_goal_world_v1'
        )
        and p.prosecdef
    )=2,
    'both RPCs SECURITY DEFINER'

  union all

  select
    7,
    '07_rpc_search_path_locked',
    (
      select count(*)
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and p.proname in (
          'create_goal_world_v1',
          'revise_goal_world_v1'
        )
        and 'search_path=public, pg_temp'
          = any(coalesce(p.proconfig,'{}'::text[]))
    )=2,
    'search_path=public, pg_temp'

  union all

  select
    8,
    '08_service_role_can_execute',
    has_function_privilege(
      'service_role',
      'public.create_goal_world_v1(uuid,jsonb)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.revise_goal_world_v1(uuid,uuid,integer,jsonb)',
      'EXECUTE'
    ),
    'service_role execute both'

  union all

  select
    9,
    '09_anon_cannot_execute',
    not has_function_privilege(
      'anon',
      'public.create_goal_world_v1(uuid,jsonb)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.revise_goal_world_v1(uuid,uuid,integer,jsonb)',
      'EXECUTE'
    ),
    'anon blocked'

  union all

  select
    10,
    '10_authenticated_cannot_execute',
    not has_function_privilege(
      'authenticated',
      'public.create_goal_world_v1(uuid,jsonb)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.revise_goal_world_v1(uuid,uuid,integer,jsonb)',
      'EXECUTE'
    ),
    'authenticated blocked'

  union all

  select
    11,
    '11_service_role_still_no_direct_table_write',
    not has_table_privilege(
      'service_role',
      'public.goal_worlds',
      'INSERT'
    )
    and not has_table_privilege(
      'service_role',
      'public.goal_world_revisions',
      'INSERT'
    )
    and not has_table_privilege(
      'service_role',
      'public.goal_world_objectives',
      'INSERT'
    ),
    'RPC only; no direct service_role INSERT'

  union all

  select
    12,
    '12_internal_helper_not_service_role_executable',
    not has_function_privilege(
      'service_role',
      'public.insert_goal_world_revision_payload_p7_v1(uuid,uuid,integer,uuid,text,jsonb)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'service_role',
      'public.assert_goal_world_value_object_access_p7_v1(uuid,uuid)',
      'EXECUTE'
    ),
    'internal helper functions not exposed'

  union all

  select
    13,
    '13_value_object_access_guard_exists',
    to_regprocedure(
      'public.assert_goal_world_value_object_access_p7_v1(uuid,uuid)'
    ) is not null,
    'actor-owned or explicit global Value Object only'

  union all

  select
    14,
    '14_existing_eight_tables_still_rls',
    (
      select count(*)
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname in (
          'goal_worlds',
          'goal_world_goal_statements',
          'goal_world_goal_definitions',
          'goal_world_revisions',
          'goal_world_objectives',
          'goal_world_object_memberships',
          'goal_world_target_criteria',
          'goal_world_goal_hypotheses'
        )
        and c.relrowsecurity
    )=8,
    '8/8 Goal World tables RLS enabled'
)
select check_name, passed, detail
from checks
order by ord;
