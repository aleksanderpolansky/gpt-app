-- ARCTor.app Goal World P2C
-- READ ONLY PRE-FLIGHT.

select
  (select count(*)::integer from public.value_objects) as value_objects,
  (
    select count(*)::integer
    from public.value_object_definition_versions
  ) as definition_versions,
  (
    select count(*)::integer
    from public.value_object_tree_operations
  ) as tree_operations,
  (
    select count(*)::integer
    from public.value_object_tree_operation_items
  ) as tree_operation_items,
  to_regprocedure(
    'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'
  ) is not null as p2a_card,
  to_regprocedure(
    'public.preview_value_object_tree_restructure_v2(uuid,uuid,uuid,text,jsonb)'
  ) is not null as p2b_preview,
  to_regclass(
    'public.value_object_definition_edit_requests'
  ) is not null as p2c_request_table_already_present,
  to_regprocedure(
    'public.edit_value_object_ontology_definition_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text)'
  ) is not null as p2c_edit_rpc_already_present;
