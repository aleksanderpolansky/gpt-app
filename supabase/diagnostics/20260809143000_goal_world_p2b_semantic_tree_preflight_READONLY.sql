-- ARCTor.app Goal World P2B
-- READ ONLY PRE-FLIGHT.

select
  (select count(*)::integer from public.value_objects) as value_objects,
  (select count(*)::integer from public.value_objects where ontology_node_role_code='root') as semantic_roots,
  (select count(*)::integer from public.value_objects where ontology_node_role_code='intermediate') as semantic_intermediates,
  (select count(*)::integer from public.value_objects where ontology_node_role_code='leaf') as semantic_leaves,
  (select count(*)::integer from public.value_object_definition_versions) as definition_versions,
  (select count(*)::integer from public.value_object_tree_operations) as tree_operations,
  (select count(*)::integer from public.value_object_tree_operation_items) as tree_operation_items;

select
  to_regprocedure('public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)') is not null as p8_preview,
  to_regprocedure('public.apply_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)') is not null as p8_apply,
  to_regprocedure('public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)') is not null as p8_rollback,
  to_regprocedure('public.get_value_object_structure_card_v1(uuid,uuid,uuid)') is not null as p2a_structure_card,
  to_regprocedure('public.preview_value_object_tree_restructure_v2(uuid,uuid,uuid,text,jsonb)') is not null as p2b_already_installed,
  exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='value_object_tree_operations'
      and column_name='contract_version'
  ) as p2b_contract_version_column_exists;
