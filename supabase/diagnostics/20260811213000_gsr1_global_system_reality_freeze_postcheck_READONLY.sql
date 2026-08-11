-- ARCTor.app — GSR-1 live freeze postcheck
-- READ ONLY. Intended for Supabase SQL Editor after the repository freeze.

with global_objects as (
  select *
  from public.value_objects
  where scope_code = 'global'
    and canonical_key is not null
),
checks as (
  select
    '01_global_total_150' as check_name,
    (select count(*) from global_objects) = 150 as passed,
    (select count(*)::text from global_objects) as detail

  union all
  select
    '02_roots_12',
    (select count(*) from global_objects where ontology_node_role_code='root') = 12,
    (select count(*)::text from global_objects where ontology_node_role_code='root')

  union all
  select
    '03_intermediate_35',
    (select count(*) from global_objects where ontology_node_role_code='intermediate') = 35,
    (select count(*)::text from global_objects where ontology_node_role_code='intermediate')

  union all
  select
    '04_leaves_103',
    (select count(*) from global_objects where ontology_node_role_code='leaf') = 103,
    (select count(*)::text from global_objects where ontology_node_role_code='leaf')

  union all
  select
    '05_definition_versions_150',
    (
      select count(*)
      from public.value_object_definition_versions d
      join global_objects v on v.id=d.value_object_id
      where d.version=1
    ) = 150,
    (
      select count(*)::text
      from public.value_object_definition_versions d
      join global_objects v on v.id=d.value_object_id
      where d.version=1
    )

  union all
  select
    '06_system_assignments_52',
    (
      select count(*)
      from public.value_object_parameter_assignments a
      join global_objects v on v.id=a.value_object_id
      where a.assignment_scope_code='system'
        and a.status='active'
    ) = 52,
    (
      select count(*)::text
      from public.value_object_parameter_assignments a
      join global_objects v on v.id=a.value_object_id
      where a.assignment_scope_code='system'
        and a.status='active'
    )

  union all
  select
    '07_no_duplicate_canonical_keys',
    not exists (
      select 1
      from public.value_objects
      where canonical_key is not null
      group by canonical_key
      having count(*) > 1
    ),
    null

  union all
  select
    '08_no_leaf_children',
    not exists (
      select 1
      from global_objects parent
      join public.value_objects child
        on child.parent_value_object_id=parent.id
      where parent.ontology_node_role_code='leaf'
    ),
    null

  union all
  select
    '09_no_bad_nonroot_facets',
    not exists (
      select 1
      from global_objects child
      join global_objects parent
        on parent.id=child.parent_value_object_id
      where child.ontology_node_role_code <> 'root'
        and parent.ontology_node_role_code <> 'root'
        and child.facet_code is distinct from parent.facet_code
    ),
    null

  union all
  select
    '10_actor_owner_pairs_preserved',
    not exists (
      select 1
      from public.value_objects
      where scope_code='actor'
        and (owner_user_id is null or owner_actor_id is null)
    ),
    (
      select count(*)::text
      from public.value_objects
      where scope_code='actor'
    )

  union all
  select
    '11_control_plank',
    exists (
      select 1 from global_objects
      where canonical_key='process.exercise.plank'
        and ontology_node_role_code='leaf'
    ),
    null

  union all
  select
    '12_control_available_time',
    exists (
      select 1 from global_objects
      where canonical_key='context.resources.available_time'
        and ontology_node_role_code='leaf'
    ),
    null
)
select check_name, passed, detail
from checks
order by check_name;
