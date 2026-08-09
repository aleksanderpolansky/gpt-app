-- ARCTor.app Goal World P2A
-- READ ONLY PRE-FLIGHT.

select
  (select count(*)::integer from public.value_objects) as value_objects,
  (
    select count(*)::integer
    from public.value_objects
    where ontology_node_role_code='root'
  ) as ontology_roots,
  (
    select count(*)::integer
    from public.value_objects
    where ontology_node_role_code='intermediate'
  ) as ontology_intermediates,
  (
    select count(*)::integer
    from public.value_objects
    where ontology_node_role_code='leaf'
  ) as ontology_leaves,
  (
    select count(*)::integer
    from public.value_object_definition_versions
  ) as definition_versions;

select
  to_regprocedure(
    'public.get_value_object_ontology_card_v1(uuid,uuid,uuid)'
  ) is not null as p1c_core_card_exists,
  to_regprocedure(
    'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'
  ) is not null as p2a_structure_card_already_exists,
  to_regprocedure(
    'public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)'
  ) is not null as p8_preview_exists,
  to_regprocedure(
    'public.apply_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)'
  ) is not null as p8_apply_exists,
  to_regprocedure(
    'public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)'
  ) is not null as p8_rollback_exists;

select
  to_regclass('public.concept_aliases') is not null
    as concept_aliases_exists,
  (
    select count(*)::integer
    from public.concept_aliases
    where concept_type='value_object'
  ) as current_value_object_alias_rows;
