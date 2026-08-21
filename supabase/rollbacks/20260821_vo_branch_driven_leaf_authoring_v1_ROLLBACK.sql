-- ARCTor.app
-- VO branch-driven leaf authoring V1 data rollback.
-- Restores only rows marked by the V1 manual normalization SQL.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

with targets as (
  select
    vo.id,
    coalesce(
      vo.metadata_json -> 'branch_driven_authoring_v1' ->> 'previousStatus',
      'draft'
    ) as previous_status,
    nullif(
      vo.metadata_json -> 'branch_driven_authoring_v1'
        ->> 'previousHierarchyRelationCode',
      ''
    ) as previous_hierarchy_relation_code
  from public.value_objects vo
  where coalesce(vo.metadata_json, '{}'::jsonb)
    -> 'branch_driven_authoring_v1'
    ->> 'contract' = 'ARCTOR_VO_BRANCH_DRIVEN_LEAF_AUTHORING_V1'
),
restored as (
  update public.value_objects vo
  set
    status = targets.previous_status,
    hierarchy_relation_code = case
      when vo.ontology_node_role_code = 'root' then null
      else targets.previous_hierarchy_relation_code
    end,
    metadata_json = coalesce(vo.metadata_json, '{}'::jsonb)
      - 'branch_driven_authoring_v1',
    updated_at = now()
  from targets
  where vo.id = targets.id
  returning vo.id
)
select count(*) as restored_rows
from restored;

commit;
