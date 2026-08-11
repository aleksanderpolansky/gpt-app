-- ARCTor.app — P7 Goal World Persistence Foundation
-- READ ONLY postcheck.
-- Expected: 20 rows; every passed=true.

with checks as (
  select
    1 as ord,
    '01_eight_tables_exist' as check_name,
    (
      select count(*)
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
    ) = 8 as passed,
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
    ) as detail

  union all

  select
    2,
    '02_all_eight_rls_enabled',
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
    ) = 8,
    (
      select count(*)::text
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
    )

  union all

  select
    3,
    '03_world_actor_fk',
    exists (
      select 1
      from pg_constraint
      where conrelid='public.goal_worlds'::regclass
        and contype='f'
        and pg_get_constraintdef(oid,true)
          ilike '%owner_actor_id%actors%'
    ),
    'owner_actor_id -> actors'

  union all

  select
    4,
    '04_revision_unique_number',
    exists (
      select 1
      from pg_constraint
      where conrelid='public.goal_world_revisions'::regclass
        and conname='goal_world_revisions_world_number_p7_unique'
    ),
    'goal_world_id + revision_number'

  union all

  select
    5,
    '05_current_revision_fk',
    exists (
      select 1
      from pg_constraint
      where conrelid='public.goal_worlds'::regclass
        and conname='goal_worlds_current_revision_p7_fkey'
    ),
    'goal_worlds.current_revision_id -> goal_world_revisions.id'

  union all

  select
    6,
    '06_one_terminal_unique_index',
    exists (
      select 1
      from pg_indexes
      where schemaname='public'
        and tablename='goal_world_objectives'
        and indexname='goal_world_objectives_one_terminal_p7_uidx'
    ),
    'partial unique terminal index'

  union all

  select
    7,
    '07_terminal_deferred_guard',
    exists (
      select 1
      from pg_trigger
      where tgrelid='public.goal_world_revisions'::regclass
        and tgname='goal_world_revision_terminal_guard_p7_trg'
        and not tgisinternal
    ),
    'exactly one actor-declared terminal checked at transaction end'

  union all

  select
    8,
    '08_objective_integrity_trigger',
    exists (
      select 1
      from information_schema.triggers
      where event_object_schema='public'
        and event_object_table='goal_world_objectives'
        and trigger_name='goal_world_objectives_integrity_p7_trg'
    ),
    'parent/revision owner guard'

  union all

  select
    9,
    '09_membership_integrity_trigger',
    exists (
      select 1
      from information_schema.triggers
      where event_object_schema='public'
        and event_object_table='goal_world_object_memberships'
        and trigger_name='goal_world_object_memberships_integrity_p7_trg'
    ),
    'membership objective refs guard'

  union all

  select
    10,
    '10_target_criterion_integrity_trigger',
    exists (
      select 1
      from information_schema.triggers
      where event_object_schema='public'
        and event_object_table='goal_world_target_criteria'
        and trigger_name='goal_world_target_criteria_integrity_p7_trg'
    ),
    'target criterion objective guard'

  union all

  select
    11,
    '11_definition_source_text_guard',
    exists (
      select 1
      from information_schema.triggers
      where event_object_schema='public'
        and event_object_table='goal_world_goal_definitions'
        and trigger_name='goal_world_goal_definitions_integrity_p7_trg'
    ),
    'exact sourceGoalText must match exact statement'

  union all

  select
    12,
    '12_revision_integrity_trigger',
    exists (
      select 1
      from information_schema.triggers
      where event_object_schema='public'
        and event_object_table='goal_world_revisions'
        and trigger_name='goal_world_revisions_integrity_p7_trg'
    ),
    'world/statement/definition/previous revision alignment'

  union all

  select
    13,
    '13_goal_world_pointer_guard',
    exists (
      select 1
      from information_schema.triggers
      where event_object_schema='public'
        and event_object_table='goal_worlds'
        and trigger_name='goal_worlds_current_revision_p7_trg'
    ),
    'current revision belongs to same world/actor and cannot move backward'

  union all

  select
    14,
    '14_seven_history_immutability_triggers',
    (
      select count(distinct trigger_name)
      from information_schema.triggers
      where event_object_schema='public'
        and trigger_name like '%immutable_p7_trg'
    ) = 7,
    (
      select count(distinct trigger_name)::text
      from information_schema.triggers
      where event_object_schema='public'
        and trigger_name like '%immutable_p7_trg'
    )

  union all

  select
    15,
    '15_goal_world_delete_guard',
    exists (
      select 1
      from information_schema.triggers
      where event_object_schema='public'
        and event_object_table='goal_worlds'
        and trigger_name='goal_worlds_no_delete_p7_trg'
    ),
    'stable world identity cannot be deleted'

  union all

  select
    16,
    '16_service_role_select_all_eight',
    (
      select count(*)
      from information_schema.role_table_grants
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
        and grantee='service_role'
        and privilege_type='SELECT'
    ) = 8,
    'service_role SELECT only surface'

  union all

  select
    17,
    '17_service_role_no_direct_writes',
    not exists (
      select 1
      from information_schema.role_table_grants
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
        and grantee='service_role'
        and privilege_type in (
          'INSERT','UPDATE','DELETE','TRUNCATE'
        )
    ),
    'no service_role direct table mutation'

  union all

  select
    18,
    '18_anon_authenticated_no_access',
    not exists (
      select 1
      from information_schema.role_table_grants
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
        and grantee in ('anon','authenticated')
    ),
    'private server-only tables'

  union all

  select
    19,
    '19_vo_references_reuse_shared_reality',
    (
      select count(*)
      from pg_constraint
      where contype='f'
        and conrelid in (
          'public.goal_world_objectives'::regclass,
          'public.goal_world_object_memberships'::regclass,
          'public.goal_world_target_criteria'::regclass
        )
        and pg_get_constraintdef(oid,true)
          ilike '%value_objects%'
    ) = 3,
    'objective primary target + membership + target criterion reference value_objects'

  union all

  select
    20,
    '20_hypothesis_proposal_only_check',
    exists (
      select 1
      from pg_constraint
      where conrelid='public.goal_world_goal_hypotheses'::regclass
        and conname='goal_world_goal_hypotheses_status_p7_check'
        and pg_get_constraintdef(oid,true)
          ilike '%proposal_only%'
    ),
    'hidden/alternative goal remains proposal_only'
)
select check_name, passed, detail
from checks
order by ord;
