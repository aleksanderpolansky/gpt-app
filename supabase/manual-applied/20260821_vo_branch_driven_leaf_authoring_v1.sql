-- ARCTor.app
-- VO branch-driven leaf authoring V1
-- Manual data normalization for private ontology-authored observation objects.
--
-- Purpose:
-- 1) existing private user-declared ontology objects created by the old manual
--    root/intermediate/leaf authoring stop looking like drafts;
-- 2) existing non-root rows created by that authoring use part_of for the
--    structural parent edge instead of is_a;
-- 3) no commercial, GLOBAL/System or legacy P1-null rows are touched.
--
-- The application source handles all NEW branch-driven private objects by
-- immediately calling set_value_object_ontology_lifecycle_v1(..., 'active').

begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.value_objects') is null then
    raise exception using
      errcode = '42P01',
      message = 'VO_BRANCH_V1_VALUE_OBJECTS_TABLE_MISSING';
  end if;

  if to_regprocedure(
    'public.set_value_object_ontology_lifecycle_v1(uuid,uuid,uuid,text)'
  ) is null then
    raise exception using
      errcode = '42883',
      message = 'VO_BRANCH_V1_LIFECYCLE_RPC_MISSING';
  end if;

  if to_regprocedure(
    'public.create_value_object_ontology_v1(uuid,uuid,uuid,jsonb,text,text)'
  ) is null then
    raise exception using
      errcode = '42883',
      message = 'VO_BRANCH_V1_CREATE_RPC_MISSING';
  end if;
end
$preflight$;

with targets as (
  select
    vo.id,
    vo.status as previous_status,
    vo.hierarchy_relation_code as previous_hierarchy_relation_code
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
    and coalesce(vo.metadata_json, '{}'::jsonb)
          -> 'branch_driven_authoring_v1' is null
),
updated as (
  update public.value_objects vo
  set
    status = 'active',
    hierarchy_relation_code = case
      when vo.ontology_node_role_code = 'root' then null
      else 'part_of'
    end,
    metadata_json = jsonb_set(
      coalesce(vo.metadata_json, '{}'::jsonb),
      '{branch_driven_authoring_v1}',
      jsonb_build_object(
        'normalizedAt', now(),
        'previousStatus', targets.previous_status,
        'previousHierarchyRelationCode', targets.previous_hierarchy_relation_code,
        'contract', 'ARCTOR_VO_BRANCH_DRIVEN_LEAF_AUTHORING_V1'
      ),
      true
    ),
    updated_at = now()
  from targets
  where vo.id = targets.id
  returning vo.id
)
select count(*) as normalized_rows
from updated;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'status', case
      when not exists (
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
      ) then 'PASS'
      else 'FAIL'
    end,
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
) as arctor_vo_branch_driven_leaf_authoring_v1_apply_result;
