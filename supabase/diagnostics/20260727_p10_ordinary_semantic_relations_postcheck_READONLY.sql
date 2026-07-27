-- ARCTor.app
-- P10 ordinary semantic relations postcheck
-- READ ONLY

with checks as (
  select 1 as sort_order, '01_relation_rows_table_exists' as check_name,
    to_regclass('public.value_object_relations') is not null as passed,
    jsonb_build_object('regclass', to_regclass('public.value_object_relations')) as details

  union all
  select 2, '02_relation_operations_table_exists',
    to_regclass('public.value_object_relation_operations') is not null,
    jsonb_build_object('regclass', to_regclass('public.value_object_relation_operations'))

  union all
  select 3, '03_registry_reverse_title_exists',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_object_relation_types'
        and column_name = 'reverse_title_key'
        and is_nullable = 'NO'
    ), '{}'::jsonb

  union all
  select 4, '04_registry_reverse_description_exists',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_object_relation_types'
        and column_name = 'reverse_description_key'
        and is_nullable = 'NO'
    ), '{}'::jsonb

  union all
  select 5, '05_registry_allow_self_link_exists',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_object_relation_types'
        and column_name = 'allow_self_link'
        and is_nullable = 'NO'
    ), '{}'::jsonb

  union all
  select 6, '06_registry_contract_version_exists',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_object_relation_types'
        and column_name = 'contract_version'
        and is_nullable = 'NO'
    ), '{}'::jsonb

  union all
  select 7, '07_canonical_active_vocabulary',
    (
      select array_agg(relation_type_code order by display_order) =
        array[
          'related_to',
          'same_subject_as',
          'supports',
          'depends_on',
          'conflicts_with',
          'influences'
        ]::text[]
      from public.value_object_relation_types
      where status = 'active'
    ),
    jsonb_build_object(
      'activeCodes', (
        select jsonb_agg(relation_type_code order by display_order)
        from public.value_object_relation_types
        where status = 'active'
      )
    )

  union all
  select 8, '08_provisional_inverse_codes_inactive',
    (
      select count(*) = 3
      from public.value_object_relation_types
      where relation_type_code in (
        'prerequisite_for',
        'associated_with',
        'influenced_by'
      )
        and status = 'inactive'
    ),
    jsonb_build_object(
      'rows', (
        select jsonb_agg(
          jsonb_build_object(
            'code', relation_type_code,
            'status', status,
            'displayOrder', display_order
          ) order by display_order
        )
        from public.value_object_relation_types
        where relation_type_code in (
          'prerequisite_for',
          'associated_with',
          'influenced_by'
        )
      )
    )

  union all
  select 9, '09_future_analysis_types_preserved',
    (
      select count(*) = 3
      from public.value_object_relation_types
      where relation_type_code in (
        'threatens',
        'opportunity_for',
        'indicated_by'
      )
        and status = 'future'
    ), '{}'::jsonb

  union all
  select 10, '10_no_active_part_of_type',
    not exists (
      select 1 from public.value_object_relation_types
      where relation_type_code in ('part_of', 'has_part')
        and status = 'active'
    ), '{}'::jsonb

  union all
  select 11, '11_relation_identity_unique_constraint',
    exists (
      select 1 from pg_catalog.pg_constraint
      where conrelid = 'public.value_object_relations'::regclass
        and conname = 'value_object_relations_identity_p10_unique'
        and contype = 'u'
    ), '{}'::jsonb

  union all
  select 12, '12_relation_status_constraint',
    exists (
      select 1 from pg_catalog.pg_constraint
      where conrelid = 'public.value_object_relations'::regclass
        and conname = 'value_object_relations_status_p10_check'
        and contype = 'c'
    ), '{}'::jsonb

  union all
  select 13, '13_relation_provenance_constraint',
    exists (
      select 1 from pg_catalog.pg_constraint
      where conrelid = 'public.value_object_relations'::regclass
        and conname = 'value_object_relations_provenance_p10_check'
        and contype = 'c'
    ), '{}'::jsonb

  union all
  select 14, '14_relation_guard_trigger',
    exists (
      select 1 from information_schema.triggers
      where event_object_schema = 'public'
        and event_object_table = 'value_object_relations'
        and trigger_name = 'value_object_relations_enforce_p10_trg'
    ), '{}'::jsonb

  union all
  select 15, '15_relation_guard_function',
    to_regprocedure('public.enforce_value_object_relation_p10()') is not null,
    jsonb_build_object(
      'procedure', to_regprocedure('public.enforce_value_object_relation_p10()')
    )

  union all
  select 16, '16_create_rpc_exists',
    to_regprocedure(
      'public.create_or_reactivate_value_object_relation_v1(uuid,uuid,uuid,uuid,uuid,text,text,text)'
    ) is not null,
    '{}'::jsonb

  union all
  select 17, '17_status_rpc_exists',
    to_regprocedure(
      'public.set_value_object_relation_status_v1(uuid,uuid,uuid,uuid,uuid,text,text)'
    ) is not null,
    '{}'::jsonb

  union all
  select 18, '18_relation_json_helper_exists',
    to_regprocedure('public.p10_value_object_relation_json(uuid)') is not null,
    '{}'::jsonb

  union all
  select 19, '19_relation_rls_enabled',
    (
      select relrowsecurity
      from pg_catalog.pg_class
      where oid = 'public.value_object_relations'::regclass
    ), '{}'::jsonb

  union all
  select 20, '20_operation_rls_enabled',
    (
      select relrowsecurity
      from pg_catalog.pg_class
      where oid = 'public.value_object_relation_operations'::regclass
    ), '{}'::jsonb

  union all
  select 21, '21_relation_no_direct_policy',
    exists (
      select 1 from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename = 'value_object_relations'
        and policyname = 'value_object_relations_no_direct_p10'
    ), '{}'::jsonb

  union all
  select 22, '22_operation_no_direct_policy',
    exists (
      select 1 from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename = 'value_object_relation_operations'
        and policyname = 'value_object_relation_operations_no_direct_p10'
    ), '{}'::jsonb

  union all
  select 23, '23_anon_has_no_relation_table_privileges',
    not has_table_privilege('anon', 'public.value_object_relations', 'SELECT')
    and not has_table_privilege('anon', 'public.value_object_relations', 'INSERT')
    and not has_table_privilege('anon', 'public.value_object_relations', 'UPDATE')
    and not has_table_privilege('anon', 'public.value_object_relations', 'DELETE'),
    '{}'::jsonb

  union all
  select 24, '24_authenticated_has_no_relation_table_privileges',
    not has_table_privilege('authenticated', 'public.value_object_relations', 'SELECT')
    and not has_table_privilege('authenticated', 'public.value_object_relations', 'INSERT')
    and not has_table_privilege('authenticated', 'public.value_object_relations', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.value_object_relations', 'DELETE'),
    '{}'::jsonb

  union all
  select 25, '25_service_role_relation_read_only',
    has_table_privilege('service_role', 'public.value_object_relations', 'SELECT')
    and not has_table_privilege('service_role', 'public.value_object_relations', 'INSERT')
    and not has_table_privilege('service_role', 'public.value_object_relations', 'UPDATE')
    and not has_table_privilege('service_role', 'public.value_object_relations', 'DELETE'),
    '{}'::jsonb

  union all
  select 26, '26_service_role_operation_read_only',
    has_table_privilege('service_role', 'public.value_object_relation_operations', 'SELECT')
    and not has_table_privilege('service_role', 'public.value_object_relation_operations', 'INSERT')
    and not has_table_privilege('service_role', 'public.value_object_relation_operations', 'UPDATE')
    and not has_table_privilege('service_role', 'public.value_object_relation_operations', 'DELETE'),
    '{}'::jsonb

  union all
  select 27, '27_source_index_exists',
    to_regclass('public.value_object_relations_source_p10_idx') is not null,
    '{}'::jsonb

  union all
  select 28, '28_target_index_exists',
    to_regclass('public.value_object_relations_target_p10_idx') is not null,
    '{}'::jsonb

  union all
  select 29, '29_initial_relation_rows_zero',
    (select count(*) = 0 from public.value_object_relations),
    jsonb_build_object(
      'rowCount', (select count(*) from public.value_object_relations)
    )

  union all
  select 30, '30_initial_operation_rows_zero',
    (select count(*) = 0 from public.value_object_relation_operations),
    jsonb_build_object(
      'rowCount', (select count(*) from public.value_object_relation_operations)
    )
)
select
  sort_order,
  check_name,
  passed,
  details
from checks
order by sort_order;

select
  relation_type_code,
  directionality_code,
  from_scope_code,
  to_scope_code,
  title_key,
  reverse_title_key,
  allow_self_link,
  contract_version,
  display_order,
  status
from public.value_object_relation_types
order by display_order, relation_type_code;
