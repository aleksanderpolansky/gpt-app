-- ARCTor.app Goal World P4A
-- READ ONLY POSTCHECK.
-- Expected: 30 rows, all passed=true.

with checks as (
  select
    '01_measure_quality_columns' as check_name,
    exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='activity_event_measures'
        and column_name='precision_policy_code'
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='activity_event_measures'
        and column_name='parameter_definition_id'
    ) as passed

  union all

  select
    '02_fact_semantic_match_axis',
    exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='activity_object_facts'
        and column_name='semantic_match_confidence'
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='activity_object_facts'
        and column_name='semantic_match_method_code'
    )

  union all

  select
    '03_link_semantic_match_axis',
    exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='activity_value_object_links'
        and column_name='semantic_match_confidence'
    )

  union all

  select
    '04_measure_provenance_table',
    to_regclass('public.activity_measure_provenance') is not null

  union all

  select
    '05_typical_reference_requires_notice',
    exists (
      select 1
      from pg_constraint
      where conrelid='public.activity_measure_provenance'::regclass
        and conname='activity_measure_provenance_typical_notice_p4a_check'
    )

  union all

  select
    '06_ai_estimate_requires_notice',
    exists (
      select 1
      from pg_constraint
      where conrelid='public.activity_measure_provenance'::regclass
        and conname='activity_measure_provenance_ai_notice_p4a_check'
    )

  union all

  select
    '07_parameter_assignment_ontology_leaf_guard',
    position(
      'ontology_node_role_code'
      in pg_get_functiondef(
        'public.enforce_value_object_parameter_assignment_v3()'::regprocedure
      )
    ) > 0
    and position(
      'activity_leaf'
      in pg_get_functiondef(
        'public.enforce_value_object_parameter_assignment_v3()'::regprocedure
      )
    ) = 0

  union all

  select
    '08_fact_ontology_leaf_guard',
    position(
      'P4A_FACT_REQUIRES_ONTOLOGY_LEAF'
      in pg_get_functiondef(
        'public.enforce_activity_fact_actor_alignment_v2()'::regprocedure
      )
    ) > 0

  union all

  select
    '09_planned_target_nonleaf_still_allowed_by_contract',
    position(
      'P4A_PLANNED_TARGET_REQUIRES_ONTOLOGY_VALUE_OBJECT'
      in pg_get_functiondef(
        'public.enforce_activity_value_object_link_pp1a()'::regprocedure
      )
    ) > 0

  union all

  select
    '10_semantic_exposure_leaf_guard',
    position(
      'P4A_SEMANTIC_EXPOSURE_REQUIRES_ONTOLOGY_LEAF'
      in pg_get_functiondef(
        'public.enforce_activity_value_object_link_pp1a()'::regprocedure
      )
    ) > 0

  union all

  select
    '11_system_instruction_tables',
    to_regclass('public.ai_processing_instruction_sets') is not null
    and
    to_regclass('public.ai_processing_instruction_revisions') is not null

  union all

  select
    '12_actor_instruction_tables',
    to_regclass('public.actor_ai_processing_preferences') is not null
    and
    to_regclass(
      'public.actor_ai_processing_preference_revisions'
    ) is not null

  union all

  select
    '13_processing_provenance_table',
    to_regclass('public.activity_ai_processing_provenance') is not null

  union all

  select
    '14_time_accounting_rpc',
    to_regprocedure(
      'public.get_activity_time_accounting_v1(uuid,uuid,timestamp with time zone,timestamp with time zone)'
    ) is not null

  union all

  select
    '15_time_accounting_server_only',
    has_function_privilege(
      'service_role',
      'public.get_activity_time_accounting_v1(uuid,uuid,timestamp with time zone,timestamp with time zone)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.get_activity_time_accounting_v1(uuid,uuid,timestamp with time zone,timestamp with time zone)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.get_activity_time_accounting_v1(uuid,uuid,timestamp with time zone,timestamp with time zone)',
      'EXECUTE'
    )

  union all

  select
    '16_parameter_registry_preserved',
    (
      select count(*)=24
      from public.value_object_parameter_definitions
    )
    and
    (
      select count(*)=0
      from public.value_object_parameter_assignments
    )

  union all

  select
    '17_precision_registry_preserved',
    (
      select count(*)=4
      from public.fact_capture_precision_policies
    )
    and
    (
      select count(*)=0
      from public.fact_capture_precision_preferences
    )

  union all

  select
    '18_activity_fact_baseline_preserved',
    (select count(*)=37 from public.activity_events)
    and
    (select count(*)=4 from public.activity_event_measures)
    and
    (select count(*)=4 from public.activity_object_facts)
    and
    (select count(*)=16 from public.activity_value_object_links)

  union all

  select
    '19_p4a_new_tables_empty',
    (select count(*)=0 from public.activity_measure_provenance)
    and
    (select count(*)=0 from public.ai_processing_instruction_sets)
    and
    (select count(*)=0 from public.ai_processing_instruction_revisions)
    and
    (select count(*)=0 from public.actor_ai_processing_preferences)
    and
    (
      select count(*)=0
      from public.actor_ai_processing_preference_revisions
    )
    and
    (select count(*)=0 from public.activity_ai_processing_provenance)

  union all

  select
    '20_system_instruction_revision_triggers',
    to_regprocedure(
      'public.prepare_ai_processing_instruction_set_p4a()'
    ) is not null
    and
    to_regprocedure(
      'public.append_ai_processing_instruction_revision_p4a()'
    ) is not null
    and exists (
      select 1
      from pg_trigger trigger_row
      where not trigger_row.tgisinternal
        and trigger_row.tgrelid=
          'public.ai_processing_instruction_sets'::regclass
        and trigger_row.tgname=
          'trg_ai_processing_instruction_revision_append_p4a'
    )

  union all

  select
    '21_actor_instruction_revision_triggers',
    to_regprocedure(
      'public.prepare_actor_ai_processing_preference_p4a()'
    ) is not null
    and
    to_regprocedure(
      'public.append_actor_ai_processing_preference_revision_p4a()'
    ) is not null
    and exists (
      select 1
      from pg_trigger trigger_row
      where not trigger_row.tgisinternal
        and trigger_row.tgrelid=
          'public.actor_ai_processing_preferences'::regclass
        and trigger_row.tgname=
          'trg_actor_ai_processing_preference_revision_append_p4a'
    )

  union all

  select
    '22_parameter_assignment_creator_guard_preserved',
    position(
      'P4A_PARAMETER_ASSIGNMENT_CREATOR_NOT_OWNED_BY_USER'
      in pg_get_functiondef(
        'public.enforce_value_object_parameter_assignment_v3()'::regprocedure
      )
    ) > 0

  union all

  select
    '23_processing_provenance_owner_guard',
    to_regprocedure(
      'public.enforce_activity_ai_processing_provenance_p4a()'
    ) is not null
    and position(
      'P4A_AI_PROCESSING_PROVENANCE_OWNER_MISMATCH'
      in pg_get_functiondef(
        'public.enforce_activity_ai_processing_provenance_p4a()'::regprocedure
      )
    ) > 0
    and position(
      'P4A_AI_USAGE_EVENT_OWNER_MISMATCH'
      in pg_get_functiondef(
        'public.enforce_activity_ai_processing_provenance_p4a()'::regprocedure
      )
    ) > 0

  union all

  select
    '24_revision_ledgers_runtime_read_only',
    has_table_privilege(
      'service_role',
      'public.ai_processing_instruction_revisions',
      'SELECT'
    )
    and not has_table_privilege(
      'service_role',
      'public.ai_processing_instruction_revisions',
      'INSERT'
    )
    and not has_table_privilege(
      'service_role',
      'public.ai_processing_instruction_revisions',
      'UPDATE'
    )
    and not has_table_privilege(
      'service_role',
      'public.ai_processing_instruction_revisions',
      'DELETE'
    )
    and has_table_privilege(
      'service_role',
      'public.actor_ai_processing_preference_revisions',
      'SELECT'
    )
    and not has_table_privilege(
      'service_role',
      'public.actor_ai_processing_preference_revisions',
      'INSERT'
    )
    and not has_table_privilege(
      'service_role',
      'public.actor_ai_processing_preference_revisions',
      'UPDATE'
    )
    and not has_table_privilege(
      'service_role',
      'public.actor_ai_processing_preference_revisions',
      'DELETE'
    )

  union all

  select
    '25_immutable_history_triggers',
    to_regprocedure(
      'public.forbid_p4a_history_mutation()'
    ) is not null
    and exists (
      select 1
      from pg_trigger trigger_row
      where not trigger_row.tgisinternal
        and trigger_row.tgrelid=
          'public.ai_processing_instruction_revisions'::regclass
        and trigger_row.tgname=
          'trg_ai_processing_instruction_revisions_immutable_p4a'
    )
    and exists (
      select 1
      from pg_trigger trigger_row
      where not trigger_row.tgisinternal
        and trigger_row.tgrelid=
          'public.actor_ai_processing_preference_revisions'::regclass
        and trigger_row.tgname=
          'trg_actor_ai_processing_preference_revisions_immutable_p4a'
    )

  union all

  select
    '26_processing_provenance_runtime_immutable',
    has_table_privilege(
      'service_role',
      'public.activity_ai_processing_provenance',
      'SELECT'
    )
    and has_table_privilege(
      'service_role',
      'public.activity_ai_processing_provenance',
      'INSERT'
    )
    and not has_table_privilege(
      'service_role',
      'public.activity_ai_processing_provenance',
      'UPDATE'
    )
    and not has_table_privilege(
      'service_role',
      'public.activity_ai_processing_provenance',
      'DELETE'
    )
    and exists (
      select 1
      from pg_trigger trigger_row
      where not trigger_row.tgisinternal
        and trigger_row.tgrelid=
          'public.activity_ai_processing_provenance'::regclass
        and trigger_row.tgname=
          'trg_activity_ai_processing_provenance_immutable_p4a'
    )

  union all

  select
    '27_measure_provenance_exact_runtime_privileges',
    has_table_privilege(
      'service_role',
      'public.activity_measure_provenance',
      'SELECT'
    )
    and has_table_privilege(
      'service_role',
      'public.activity_measure_provenance',
      'INSERT'
    )
    and has_table_privilege(
      'service_role',
      'public.activity_measure_provenance',
      'UPDATE'
    )
    and not has_table_privilege(
      'service_role',
      'public.activity_measure_provenance',
      'DELETE'
    )

  union all

  select
    '28_measure_origin_reliability_contract',
    exists (
      select 1
      from pg_constraint
      where conrelid='public.activity_measure_provenance'::regclass
        and conname=
          'activity_measure_provenance_origin_reliability_p4a_check'
    )

  union all

  select
    '29_time_accounting_safety_contract',
    position(
      'P4A_TIME_RANGE_INVALID'
      in pg_get_functiondef(
        'public.get_activity_time_accounting_v1(uuid,uuid,timestamp with time zone,timestamp with time zone)'::regprocedure
      )
    ) > 0
    and position(
      'P4A_TIME_ACCOUNTING_ACTOR_NOT_OWNED_BY_USER'
      in pg_get_functiondef(
        'public.get_activity_time_accounting_v1(uuid,uuid,timestamp with time zone,timestamp with time zone)'::regprocedure
      )
    ) > 0
    and position(
      'p_from is null'
      in lower(
        pg_get_functiondef(
          'public.get_activity_time_accounting_v1(uuid,uuid,timestamp with time zone,timestamp with time zone)'::regprocedure
        )
      )
    ) > 0

  union all

  select
    '30_value_object_baseline_preserved',
    (select count(*)=15 from public.value_objects)
    and
    (
      select count(*)=15
      from public.value_object_definition_versions
    )
)
select check_name,passed
from checks
order by check_name;
