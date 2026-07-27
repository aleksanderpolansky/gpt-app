-- ARCTor.app
-- P10 ordinary semantic relations preflight
-- READ ONLY

with checks as (
  select 1 as sort_order, '01_value_objects_exists' as check_name,
    to_regclass('public.value_objects') is not null as passed,
    jsonb_build_object('regclass', to_regclass('public.value_objects')) as details

  union all
  select 2, '02_relation_registry_exists',
    to_regclass('public.value_object_relation_types') is not null,
    jsonb_build_object('regclass', to_regclass('public.value_object_relation_types'))

  union all
  select 3, '03_relation_rows_table_absent',
    to_regclass('public.value_object_relations') is null,
    jsonb_build_object('regclass', to_regclass('public.value_object_relations'))

  union all
  select 4, '04_relation_operations_table_absent',
    to_regclass('public.value_object_relation_operations') is null,
    jsonb_build_object('regclass', to_regclass('public.value_object_relation_operations'))

  union all
  select 5, '05_tree_guard_exists',
    to_regprocedure('public.enforce_value_object_tree_v2()') is not null,
    jsonb_build_object('procedure', to_regprocedure('public.enforce_value_object_tree_v2()'))

  union all
  select 6, '06_pgcrypto_digest_exists',
    to_regprocedure('extensions.digest(bytea,text)') is not null,
    jsonb_build_object(
      'procedure', to_regprocedure('extensions.digest(bytea,text)')
    )

  union all
  select 7, '07_registry_has_nine_rows',
    (select count(*) = 9 from public.value_object_relation_types),
    jsonb_build_object(
      'rowCount', (select count(*) from public.value_object_relation_types)
    )

  union all
  select 8, '08_initial_active_codes_match_audit',
    (
      select array_agg(relation_type_code order by display_order) =
        array[
          'supports',
          'depends_on',
          'prerequisite_for',
          'conflicts_with',
          'associated_with',
          'influenced_by'
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
  select 9, '09_future_analysis_codes_preserved',
    (
      select array_agg(relation_type_code order by display_order) =
        array['threatens', 'opportunity_for', 'indicated_by']::text[]
      from public.value_object_relation_types
      where status = 'future'
    ),
    jsonb_build_object(
      'futureCodes', (
        select jsonb_agg(relation_type_code order by display_order)
        from public.value_object_relation_types
        where status = 'future'
      )
    )

  union all
  select 10, '10_no_relation_type_inverse_columns_yet',
    not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'value_object_relation_types'
        and column_name in (
          'reverse_title_key',
          'reverse_description_key',
          'allow_self_link',
          'contract_version'
        )
    ),
    jsonb_build_object(
      'existingColumns', coalesce((
        select jsonb_agg(column_name order by ordinal_position)
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_relation_types'
          and column_name in (
            'reverse_title_key',
            'reverse_description_key',
            'allow_self_link',
            'contract_version'
          )
      ), '[]'::jsonb)
    )

  union all
  select 11, '11_value_object_owner_pair_available',
    exists (
      select 1
      from public.value_objects
      where owner_user_id is not null
        and owner_actor_id is not null
    ),
    jsonb_build_object(
      'ownerPairCount', (
        select count(distinct (owner_user_id, owner_actor_id))
        from public.value_objects
        where owner_user_id is not null
          and owner_actor_id is not null
      )
    )

  union all
  select 12, '12_value_objects_are_v2_identified',
    not exists (
      select 1
      from public.value_objects
      where object_kind is null
         or node_role_code is null
         or branch_type_code is null
         or root_value_object_id is null
    ),
    jsonb_build_object(
      'incompleteCount', (
        select count(*)
        from public.value_objects
        where object_kind is null
           or node_role_code is null
           or branch_type_code is null
           or root_value_object_id is null
      )
    )

  union all
  select 13, '13_no_structural_part_of_relation_type',
    not exists (
      select 1
      from public.value_object_relation_types
      where relation_type_code in ('part_of', 'has_part')
        and status = 'active'
    ),
    '{}'::jsonb

  union all
  select 14, '14_no_semantic_relation_rpc_exists',
    not exists (
      select 1
      from pg_catalog.pg_proc procedure_row
      join pg_catalog.pg_namespace namespace_row
        on namespace_row.oid = procedure_row.pronamespace
      where namespace_row.nspname = 'public'
        and procedure_row.proname in (
          'create_or_reactivate_value_object_relation_v1',
          'set_value_object_relation_status_v1'
        )
    ),
    '{}'::jsonb

  union all
  select 15, '15_similarity_edges_empty',
    (select count(*) = 0 from public.value_object_similarity_edges),
    jsonb_build_object(
      'rowCount', (select count(*) from public.value_object_similarity_edges)
    )

  union all
  select 16, '16_relevance_edges_empty',
    (select count(*) = 0 from public.value_object_relevance_edges),
    jsonb_build_object(
      'rowCount', (select count(*) from public.value_object_relevance_edges)
    )

  union all
  select 17, '17_no_relation_backfill_required',
    true,
    jsonb_build_object(
      'valueObjectRelationTableExists',
        to_regclass('public.value_object_relations') is not null,
      'sourceAuditConclusion', 'no relation-row store exists'
    )
)
select
  sort_order,
  check_name,
  passed,
  details
from checks
order by sort_order;
