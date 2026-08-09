-- ARCTor.app Goal World P1B
-- READ ONLY POSTCHECK.

with checks as (
  select
    '01_all_15_mapped' as check_name,
    (
      select count(*) = 15
      from public.value_objects
      where canonical_key like 'legacy.%'
        and definition_version = 1
        and origin_type_code = 'legacy'
    ) as passed

  union all

  select
    '02_role_distribution_5_root_10_leaf',
    (
      select
        count(*) filter (where ontology_node_role_code='root') = 5
        and count(*) filter (where ontology_node_role_code='leaf') = 10
        and count(*) filter (where ontology_node_role_code='intermediate') = 0
      from public.value_objects
      where canonical_key like 'legacy.%'
    )

  union all

  select
    '03_facet_distribution_5_5_5',
    (
      select
        count(*) filter (where facet_code='DOMAIN') = 5
        and count(*) filter (where facet_code='ENTITY') = 5
        and count(*) filter (where facet_code='PROCESS') = 5
      from public.value_objects
      where canonical_key like 'legacy.%'
    )

  union all

  select
    '04_definition_versions_15',
    (
      select count(*) = 15
      from public.value_object_definition_versions
      where source_context='P1B_LEGACY_VALUE_OBJECT_MAPPING_V1'
        and version=1
    )

  union all

  select
    '05_legacy_roles_preserved',
    (
      select
        count(*) filter (where node_role_code='structural') = 6
        and count(*) filter (where node_role_code='activity_leaf') = 9
      from public.value_objects
    )

  union all

  select
    '06_all_scope_actor',
    (
      select count(*) = 15
      from public.value_objects
      where canonical_key like 'legacy.%'
        and scope_code='actor'
    )

  union all

  select
    '07_all_private_standard',
    (
      select count(*) = 15
      from public.value_objects
      where canonical_key like 'legacy.%'
        and visibility_code='private'
        and privacy_class_code='standard'
    )

  union all

  select
    '08_roots_have_no_hierarchy_relation',
    (
      select count(*) = 5
      from public.value_objects
      where canonical_key like 'legacy.%'
        and ontology_node_role_code='root'
        and hierarchy_relation_code is null
    )

  union all

  select
    '09_leaves_use_aspect_of',
    (
      select count(*) = 10
      from public.value_objects
      where canonical_key like 'legacy.%'
        and ontology_node_role_code='leaf'
        and hierarchy_relation_code='aspect_of'
    )

  union all

  select
    '10_family_budget_is_entity_leaf',
    (
      select count(*) = 1
      from public.value_objects
      where id='687b8d5a-2c45-4ed5-9ccd-3fbaeb68a050'::uuid
        and facet_code='ENTITY'
        and object_kind_code='generic_entity'
        and ontology_node_role_code='leaf'
    )
)
select check_name, passed
from checks
order by check_name;

select
  id,
  title,
  canonical_key,
  facet_code,
  object_kind_code,
  ontology_node_role_code,
  hierarchy_relation_code,
  scope_code,
  visibility_code,
  privacy_class_code,
  definition_version,
  origin_type_code
from public.value_objects
where canonical_key like 'legacy.%'
order by facet_code, title, id;
