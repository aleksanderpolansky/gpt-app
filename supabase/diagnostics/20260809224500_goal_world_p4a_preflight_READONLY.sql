-- ARCTor.app Goal World P4A
-- READ ONLY PRE-FLIGHT.

select
  (select count(*)::integer from public.value_objects)
    as value_objects,
  (
    select count(*)::integer
    from public.value_object_definition_versions
  ) as definition_versions,
  (select count(*)::integer from public.activity_events)
    as activity_events,
  (
    select count(*)::integer
    from public.activity_event_measures
  ) as activity_event_measures,
  (
    select count(*)::integer
    from public.activity_object_facts
  ) as activity_object_facts,
  (
    select count(*)::integer
    from public.activity_value_object_links
  ) as activity_value_object_links,
  (
    select count(*)::integer
    from public.value_object_parameter_definitions
  ) as parameter_definitions,
  (
    select count(*)::integer
    from public.value_object_parameter_assignments
  ) as parameter_assignments,
  (
    select count(*)::integer
    from public.fact_capture_precision_policies
  ) as precision_policies,
  (
    select count(*)::integer
    from public.activity_semantic_enrichment_runs_cux4
  ) as semantic_runs,
  to_regclass('public.activity_measure_provenance') is not null
    as p4a_already_present,
  not exists (
    select 1
    from public.activity_object_facts fact
    join public.value_objects value_object
      on value_object.id=fact.value_object_id
    where fact.value_object_id is not null
      and value_object.ontology_node_role_code is distinct from 'leaf'
  ) as existing_fact_targets_leaf_safe;
