-- ARCTor.app Goal World P3
-- READ ONLY POSTCHECK.
-- Expected: 18 rows, all passed=true.

with checks as (
  select
    '01_relation_contract_columns' as check_name,
    not exists (
      select 1
      from (
        values
          ('relation_family_code'),
          ('canonical_relation_type_code'),
          ('canonical_orientation_code'),
          ('allowed_source_facet_codes'),
          ('allowed_target_facet_codes'),
          ('allowed_source_node_roles'),
          ('allowed_target_node_roles'),
          ('canonical_write_policy_code'),
          ('ai_write_policy_code'),
          ('evidence_policy_code'),
          ('world_evaluation_policy_code')
      ) expected(column_name)
      where not exists (
        select 1
        from information_schema.columns column_row
        where column_row.table_schema='public'
          and column_row.table_name='value_object_relation_types'
          and column_row.column_name=expected.column_name
      )
    ) as passed

  union all

  select
    '02_registry_12_rows_contract_v2',
    (select count(*)=12 from public.value_object_relation_types)
    and not exists (
      select 1
      from public.value_object_relation_types
      where contract_version < 2
    )

  union all

  select
    '03_six_canonical_active_writes',
    (
      select count(*)=6
      from public.value_object_relation_types
      where status='active'
        and canonical_write_policy_code='enabled'
        and relation_type_code in (
          'related_to',
          'same_subject_as',
          'supports',
          'depends_on',
          'conflicts_with',
          'influences'
        )
    )

  union all

  select
    '04_reverse_alias_contract',
    exists (
      select 1
      from public.value_object_relation_types
      where relation_type_code='prerequisite_for'
        and canonical_relation_type_code='depends_on'
        and canonical_orientation_code='reverse'
        and canonical_write_policy_code='reverse_alias'
    )
    and exists (
      select 1
      from public.value_object_relation_types
      where relation_type_code='influenced_by'
        and canonical_relation_type_code='influences'
        and canonical_orientation_code='reverse'
        and canonical_write_policy_code='reverse_alias'
    )

  union all

  select
    '05_future_analysis_stays_future',
    (
      select count(*)=3
      from public.value_object_relation_types
      where relation_type_code in (
        'threatens',
        'opportunity_for',
        'indicated_by'
      )
        and status='future'
        and canonical_write_policy_code='future'
        and evidence_policy_code='required'
    )

  union all

  select
    '06_relation_evidence_table',
    to_regclass('public.relation_evidence') is not null

  union all

  select
    '07_evidence_has_no_weight_confidence_columns',
    not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='relation_evidence'
        and column_name in (
          'weight',
          'confidence',
          'probability',
          'causal_score'
        )
    )

  union all

  select
    '08_validator_rpc',
    to_regprocedure(
      'public.validate_value_object_relation_candidate_v1(uuid,uuid,uuid,uuid,text)'
    ) is not null

  union all

  select
    '09_evidence_rpc',
    to_regprocedure(
      'public.add_value_object_relation_evidence_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,text)'
    ) is not null

  union all

  select
    '10_p3_trigger_markers',
    position(
      'P3_AI_DIRECT_CANONICAL_WRITE_FORBIDDEN'
      in pg_get_functiondef(
        'public.enforce_value_object_relation_p10()'::regprocedure
      )
    ) > 0
    and position(
      'P3_SOURCE_FACET_FORBIDDEN'
      in pg_get_functiondef(
        'public.enforce_value_object_relation_p10()'::regprocedure
      )
    ) > 0

  union all

  select
    '11_world_evaluation_not_global',
    position(
      'P3_WORLD_EVALUATION_NOT_GLOBAL_RELATION_DATA'
      in pg_get_functiondef(
        'public.enforce_value_object_relation_p10()'::regprocedure
      )
    ) > 0
    and not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='value_object_relations'
        and column_name in (
          'weight',
          'polarity',
          'world_role_code',
          'world_score'
        )
    )

  union all

  select
    '12_service_role_execute',
    has_function_privilege(
      'service_role',
      'public.validate_value_object_relation_candidate_v1(uuid,uuid,uuid,uuid,text)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.add_value_object_relation_evidence_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,text)',
      'EXECUTE'
    )

  union all

  select
    '13_browser_roles_no_execute',
    not has_function_privilege(
      'anon',
      'public.validate_value_object_relation_candidate_v1(uuid,uuid,uuid,uuid,text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.validate_value_object_relation_candidate_v1(uuid,uuid,uuid,uuid,text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'public.add_value_object_relation_evidence_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.add_value_object_relation_evidence_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,text)',
      'EXECUTE'
    )

  union all

  select
    '14_service_role_registry_read_only',
    has_table_privilege(
      'service_role',
      'public.value_object_relation_types',
      'SELECT'
    )
    and not has_table_privilege(
      'service_role',
      'public.value_object_relation_types',
      'INSERT'
    )
    and not has_table_privilege(
      'service_role',
      'public.value_object_relation_types',
      'UPDATE'
    )
    and not has_table_privilege(
      'service_role',
      'public.value_object_relation_types',
      'DELETE'
    )

  union all

  select
    '15_evidence_table_write_only_via_rpc',
    has_table_privilege(
      'service_role',
      'public.relation_evidence',
      'SELECT'
    )
    and not has_table_privilege(
      'service_role',
      'public.relation_evidence',
      'INSERT'
    )
    and not has_table_privilege(
      'service_role',
      'public.relation_evidence',
      'UPDATE'
    )
    and not has_table_privilege(
      'service_role',
      'public.relation_evidence',
      'DELETE'
    )

  union all

  select
    '16_evidence_inference_metadata_guard',
    exists (
      select 1
      from pg_constraint
      where conrelid='public.relation_evidence'::regclass
        and conname='relation_evidence_no_inference_numbers_p3_check'
        and pg_get_constraintdef(oid) like '%confidence%'
        and pg_get_constraintdef(oid) like '%causal_score%'
    )
    and position(
      'P3_EVIDENCE_INFERENCE_NUMBER_FORBIDDEN'
      in pg_get_functiondef(
        'public.add_value_object_relation_evidence_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,text)'::regprocedure
      )
    ) > 0

  union all

  select
    '17_existing_p10_relation_preserved',
    (select count(*)=1 from public.value_object_relations)
    and exists (
      select 1
      from public.value_object_relations relation
      where relation.id='9fd76c94-e642-4f14-b868-c259114834ce'::uuid
        and relation.relation_type_code='supports'
        and relation.status='active'
        and relation.source_value_object_id=
          '17de1928-0732-4649-a7d4-46212b24d532'::uuid
        and relation.target_value_object_id=
          '43b86bc3-aab6-49f1-afff-b11a52e01f66'::uuid
    )

  union all

  select
    '18_baseline_and_evidence_clean',
    (select count(*)=15 from public.value_objects)
    and
    (select count(*)=15 from public.value_object_definition_versions)
    and
    (select count(*)=0 from public.relation_evidence)
)
select check_name,passed
from checks
order by check_name;
