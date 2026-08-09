-- ARCTor.app Goal World P3
-- READ ONLY PRE-FLIGHT.

select
  (select count(*)::integer from public.value_objects) as value_objects,
  (
    select count(*)::integer
    from public.value_object_definition_versions
  ) as definition_versions,
  (
    select count(*)::integer
    from public.value_object_relation_types
  ) as relation_types,
  (
    select count(*)::integer
    from public.value_object_relations
  ) as relations,
  to_regclass('public.relation_evidence') is not null
    as relation_evidence_already_present,
  to_regprocedure(
    'public.validate_value_object_relation_candidate_v1(uuid,uuid,uuid,uuid,text)'
  ) is not null as p3_validator_already_present,
  exists (
    select 1
    from public.value_object_relations relation
    where relation.id='9fd76c94-e642-4f14-b868-c259114834ce'::uuid
      and relation.relation_type_code='supports'
      and relation.status='active'
  ) as p10_relation_baseline_present;
