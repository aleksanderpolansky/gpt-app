/*
ARCTor.app â€” Goal World Constructor
P2A Role-Specific Value Object Cards v1

READ CONTRACT ONLY.

Creates:
- get_value_object_structure_card_v1(uuid,uuid,uuid)

Reuses:
- get_value_object_ontology_card_v1
- value_objects
- concept_aliases (read-only alias count)

Does NOT:
- alter tree structure
- replace P8 operations
- write aliases
- alter existing rows
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_definition_versions') is null
     or to_regclass('public.concept_aliases') is null then
    raise exception using
      errcode = '42P01',
      message = 'P2A_REQUIRED_TABLES_MISSING';
  end if;

  if to_regprocedure(
    'public.get_value_object_ontology_card_v1(uuid,uuid,uuid)'
  ) is null then
    raise exception using
      errcode = '42883',
      message = 'P2A_P1C_CORE_CARD_MISSING';
  end if;

  if (
    select count(*)
    from public.value_objects
  ) <> 15 then
    raise exception using
      errcode = '23514',
      message = 'P2A_VALUE_OBJECT_BASELINE_CHANGED';
  end if;

  if (
    select count(*)
    from public.value_object_definition_versions
  ) <> 15 then
    raise exception using
      errcode = '23514',
      message = 'P2A_DEFINITION_VERSION_BASELINE_CHANGED';
  end if;
end;
$preflight$;

create or replace function public.get_value_object_structure_card_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_value_object_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_core jsonb;
  v_value_object public.value_objects%rowtype;
  v_card_type text;

  v_path jsonb := '[]'::jsonb;
  v_children jsonb := '[]'::jsonb;

  v_direct_child_count integer := 0;
  v_intermediate_child_count integer := 0;
  v_leaf_child_count integer := 0;
  v_subtree_node_count integer := 0;

  v_child_facet_counts jsonb := '{}'::jsonb;
  v_alias_count integer := 0;

  v_can_add_child boolean := false;
  v_can_insert_above boolean := false;
  v_can_reparent boolean := false;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_value_object_id is null then
    raise exception using
      errcode = '22023',
      message = 'P2A_IDENTIFIERS_REQUIRED';
  end if;

  /*
  P1C remains the access-control and ontology-read authority.
  If the caller does not own the actor-scoped object, P1C rejects the call.
  */
  v_core := public.get_value_object_ontology_card_v1(
    p_owner_user_id,
    p_owner_actor_id,
    p_value_object_id
  );

  select *
  into v_value_object
  from public.value_objects value_object
  where value_object.id = p_value_object_id
    and value_object.scope_code = 'actor'
    and value_object.owner_user_id = p_owner_user_id
    and value_object.owner_actor_id = p_owner_actor_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'P2A_VALUE_OBJECT_NOT_FOUND';
  end if;

  v_card_type :=
    case v_value_object.ontology_node_role_code
      when 'root' then 'ROOT_CARD'
      when 'intermediate' then 'INTERMEDIATE_CARD'
      when 'leaf' then 'LEAF_CARD'
      else null
    end;

  if v_card_type is null then
    raise exception using
      errcode = '23514',
      message = 'P2A_SEMANTIC_NODE_ROLE_REQUIRED';
  end if;

  /*
  Build root -> current path from the canonical structural parent pointers.
  The ontology guard already enforces one structural parent.
  */
  with recursive ancestors as (
    select
      node.id,
      node.canonical_key,
      node.title,
      node.facet_code,
      node.object_kind_code,
      node.ontology_node_role_code,
      node.parent_value_object_id,
      node.root_value_object_id,
      node.status,
      node.definition_version,
      0 as reverse_depth
    from public.value_objects node
    where node.id = p_value_object_id
      and node.scope_code = 'actor'
      and node.owner_user_id = p_owner_user_id
      and node.owner_actor_id = p_owner_actor_id

    union all

    select
      parent.id,
      parent.canonical_key,
      parent.title,
      parent.facet_code,
      parent.object_kind_code,
      parent.ontology_node_role_code,
      parent.parent_value_object_id,
      parent.root_value_object_id,
      parent.status,
      parent.definition_version,
      ancestors.reverse_depth + 1
    from ancestors
    join public.value_objects parent
      on parent.id = ancestors.parent_value_object_id
     and parent.scope_code = 'actor'
     and parent.owner_user_id = p_owner_user_id
     and parent.owner_actor_id = p_owner_actor_id
  ),
  ordered as (
    select
      ancestors.*,
      row_number() over (
        order by ancestors.reverse_depth desc
      ) - 1 as depth
    from ancestors
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ordered.id,
        'canonicalKey', ordered.canonical_key,
        'title', ordered.title,
        'facetCode', ordered.facet_code,
        'objectKindCode', ordered.object_kind_code,
        'nodeRoleCode', ordered.ontology_node_role_code,
        'parentValueObjectId', ordered.parent_value_object_id,
        'rootValueObjectId', ordered.root_value_object_id,
        'statusCode', ordered.status,
        'definitionVersion', ordered.definition_version,
        'depth', ordered.depth
      )
      order by ordered.depth
    ),
    '[]'::jsonb
  )
  into v_path
  from ordered;

  /*
  Immediate semantic children only.
  Legacy/P1-null rows are not exposed as P2 ontology children.
  */
  with child_rows as (
    select
      child.id,
      child.canonical_key,
      child.title,
      child.facet_code,
      child.object_kind_code,
      child.ontology_node_role_code,
      child.parent_value_object_id,
      child.root_value_object_id,
      child.status,
      child.definition_version,
      (
        select count(*)::integer
        from public.value_objects grandchild
        where grandchild.parent_value_object_id = child.id
          and grandchild.scope_code = 'actor'
          and grandchild.owner_user_id = p_owner_user_id
          and grandchild.owner_actor_id = p_owner_actor_id
          and grandchild.ontology_node_role_code in (
            'intermediate',
            'leaf'
          )
      ) as child_count
    from public.value_objects child
    where child.parent_value_object_id = p_value_object_id
      and child.scope_code = 'actor'
      and child.owner_user_id = p_owner_user_id
      and child.owner_actor_id = p_owner_actor_id
      and child.ontology_node_role_code in (
        'intermediate',
        'leaf'
      )
      and child.canonical_key is not null
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', child_rows.id,
          'canonicalKey', child_rows.canonical_key,
          'title', child_rows.title,
          'facetCode', child_rows.facet_code,
          'objectKindCode', child_rows.object_kind_code,
          'nodeRoleCode', child_rows.ontology_node_role_code,
          'parentValueObjectId', child_rows.parent_value_object_id,
          'rootValueObjectId', child_rows.root_value_object_id,
          'statusCode', child_rows.status,
          'definitionVersion', child_rows.definition_version,
          'childCount', child_rows.child_count
        )
        order by
          case child_rows.ontology_node_role_code
            when 'intermediate' then 0
            else 1
          end,
          lower(child_rows.title),
          child_rows.id
      ),
      '[]'::jsonb
    ),
    count(*)::integer,
    count(*) filter (
      where child_rows.ontology_node_role_code = 'intermediate'
    )::integer,
    count(*) filter (
      where child_rows.ontology_node_role_code = 'leaf'
    )::integer
  into
    v_children,
    v_direct_child_count,
    v_intermediate_child_count,
    v_leaf_child_count
  from child_rows;

  select coalesce(
    jsonb_object_agg(
      facet_counts.facet_code,
      facet_counts.child_count
    ),
    '{}'::jsonb
  )
  into v_child_facet_counts
  from (
    select
      child.facet_code,
      count(*)::integer as child_count
    from public.value_objects child
    where child.parent_value_object_id = p_value_object_id
      and child.scope_code = 'actor'
      and child.owner_user_id = p_owner_user_id
      and child.owner_actor_id = p_owner_actor_id
      and child.ontology_node_role_code in ('intermediate', 'leaf')
      and child.canonical_key is not null
      and child.facet_code is not null
    group by child.facet_code
  ) facet_counts;

  with recursive subtree as (
    select node.id
    from public.value_objects node
    where node.id = p_value_object_id
      and node.scope_code = 'actor'
      and node.owner_user_id = p_owner_user_id
      and node.owner_actor_id = p_owner_actor_id

    union all

    select child.id
    from subtree
    join public.value_objects child
      on child.parent_value_object_id = subtree.id
     and child.scope_code = 'actor'
     and child.owner_user_id = p_owner_user_id
     and child.owner_actor_id = p_owner_actor_id
    where child.ontology_node_role_code in ('intermediate', 'leaf')
      and child.canonical_key is not null
  )
  select greatest(count(*)::integer - 1, 0)
  into v_subtree_node_count
  from subtree;

  /*
  Existing shared alias table is read only in P2A.
  If no value_object aliases exist yet, count is simply zero.
  */
  select count(*)::integer
  into v_alias_count
  from public.concept_aliases alias_row
  where alias_row.concept_type = 'value_object'
    and alias_row.concept_id = p_value_object_id
    and alias_row.status = 'active';

  v_can_add_child :=
    v_value_object.ontology_node_role_code in ('root', 'intermediate')
    and v_value_object.status in ('draft', 'active');

  v_can_insert_above :=
    v_value_object.ontology_node_role_code in ('intermediate', 'leaf')
    and v_value_object.status in ('draft', 'active');

  v_can_reparent :=
    v_value_object.ontology_node_role_code in ('intermediate', 'leaf')
    and v_value_object.status in ('draft', 'active');

  return jsonb_build_object(
    'contractVersion', 'value-object-structure-card-v1',
    'cardType', v_card_type,
    'core', v_core,
    'path', v_path,
    'children', v_children,

    'summary', jsonb_build_object(
      'directChildCount', v_direct_child_count,
      'intermediateChildCount', v_intermediate_child_count,
      'leafChildCount', v_leaf_child_count,
      'subtreeNodeCount', v_subtree_node_count,
      'childFacetCounts', v_child_facet_counts
    ),

    'recognition', jsonb_build_object(
      'aliasCount', v_alias_count,
      'aliasStore', 'concept_aliases',
      'writeEnabled', false
    ),

    'capabilities', jsonb_build_object(
      'canAddIntermediateChild', v_can_add_child,
      'canAddLeafChild', v_can_add_child,
      'canInsertIntermediateAbove', v_can_insert_above,
      'canReparent', v_can_reparent,
      'canPreviewRestructure',
        v_value_object.status in ('draft', 'active'),
      'canRename',
        v_value_object.status in ('draft', 'active', 'inactive'),
      'canEditSemanticDefinition',
        v_value_object.status in ('draft', 'active', 'inactive'),
      'canManageRecognition',
        v_value_object.status in ('draft', 'active', 'inactive')
    )
  );
end;
$function$;

revoke all on function public.get_value_object_structure_card_v1(
  uuid,
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute on function public.get_value_object_structure_card_v1(
  uuid,
  uuid,
  uuid
)
to service_role;

comment on function public.get_value_object_structure_card_v1(
  uuid,
  uuid,
  uuid
) is
  'P2A role-specific root/intermediate/leaf structure card. Read-only editor contract layered on P1C. Structural writes remain behind P8 until P2B semantic adaptation.';

commit;
