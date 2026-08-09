-- ARCTor.app Goal World P2D
-- READ ONLY PRE-FLIGHT.

select
  (select count(*)::integer from public.value_objects) as value_objects,
  (
    select count(*)::integer
    from public.value_object_definition_versions
  ) as definition_versions,
  (
    select count(*)::integer
    from public.value_object_definition_edit_requests
  ) as definition_edit_requests,
  (
    select count(*)::integer
    from public.concept_aliases
    where concept_type='value_object'
  ) as value_object_aliases,
  to_regprocedure(
    'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'
  ) is not null as p2a_structure_card,
  to_regprocedure(
    'public.get_value_object_definition_editor_v1(uuid,uuid,uuid)'
  ) is not null as p2c_definition_editor,
  to_regprocedure(
    'public.get_value_object_alias_profile_v1(uuid,uuid,uuid)'
  ) is not null as p2d_alias_profile_already_present;
