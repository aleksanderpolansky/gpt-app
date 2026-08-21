-- ARCTor.app
-- VO branch-driven leaf authoring V1 postcheck — READ ONLY.

select jsonb_pretty(
  jsonb_build_object(
    'allPass',
      to_regclass('public.value_objects') is not null
      and to_regprocedure(
        'public.create_value_object_ontology_v1(uuid,uuid,uuid,jsonb,text,text)'
      ) is not null
      and to_regprocedure(
        'public.set_value_object_ontology_lifecycle_v1(uuid,uuid,uuid,text)'
      ) is not null
      and not exists (
        select 1
        from public.value_objects vo
        where vo.scope_code = 'actor'
          and vo.usage_scope = 'private'
          and vo.organization_id is null
          and vo.origin_type_code = 'user_declared'
          and vo.source = 'manual'
          and vo.branch_type_code = 'ontology_v1'
          and vo.canonical_key is not null
          and vo.ontology_node_role_code in ('root', 'intermediate', 'leaf')
          and vo.status = 'draft'
      )
      and not exists (
        select 1
        from public.value_objects vo
        where coalesce(vo.metadata_json, '{}'::jsonb)
          -> 'branch_driven_authoring_v1'
          ->> 'contract' = 'ARCTOR_VO_BRANCH_DRIVEN_LEAF_AUTHORING_V1'
          and vo.ontology_node_role_code in ('intermediate', 'leaf')
          and vo.hierarchy_relation_code is distinct from 'part_of'
      ),
    'createRpcExists',
      to_regprocedure(
        'public.create_value_object_ontology_v1(uuid,uuid,uuid,jsonb,text,text)'
      ) is not null,
    'lifecycleRpcExists',
      to_regprocedure(
        'public.set_value_object_ontology_lifecycle_v1(uuid,uuid,uuid,text)'
      ) is not null,
    'remainingPrivateOntologyDrafts', (
      select count(*)
      from public.value_objects vo
      where vo.scope_code = 'actor'
        and vo.usage_scope = 'private'
        and vo.organization_id is null
        and vo.origin_type_code = 'user_declared'
        and vo.source = 'manual'
        and vo.branch_type_code = 'ontology_v1'
        and vo.canonical_key is not null
        and vo.ontology_node_role_code in ('root', 'intermediate', 'leaf')
        and vo.status = 'draft'
    ),
    'normalizedRows', (
      select count(*)
      from public.value_objects vo
      where coalesce(vo.metadata_json, '{}'::jsonb)
        -> 'branch_driven_authoring_v1'
        ->> 'contract' = 'ARCTOR_VO_BRANCH_DRIVEN_LEAF_AUTHORING_V1'
    ),
    'normalizedNonRootNotPartOf', (
      select count(*)
      from public.value_objects vo
      where coalesce(vo.metadata_json, '{}'::jsonb)
        -> 'branch_driven_authoring_v1'
        ->> 'contract' = 'ARCTOR_VO_BRANCH_DRIVEN_LEAF_AUTHORING_V1'
        and vo.ontology_node_role_code in ('intermediate', 'leaf')
        and vo.hierarchy_relation_code is distinct from 'part_of'
    )
  )
) as arctor_vo_branch_driven_leaf_authoring_v1_postcheck;
