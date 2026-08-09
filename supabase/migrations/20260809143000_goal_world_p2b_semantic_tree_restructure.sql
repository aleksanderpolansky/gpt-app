/*
ARCTor.app â€” Goal World Constructor
P2B Semantic Tree Restructure v1

This migration ADAPTS the existing P8 controlled tree engine.

Reuses:
- value_object_tree_operations
- value_object_tree_operation_items
- arctor.p8_tree_operation_id guard context
- old enforce_value_object_tree_v2 guard
- P1C ontology guard + immutable definition snapshot trigger

Creates semantic v2 RPCs.
Legacy P8 v1 RPCs remain untouched.

NO AI / NO historical recalculation.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_tree_operations') is null
     or to_regclass('public.value_object_tree_operation_items') is null
     or to_regclass('public.value_object_definition_versions') is null
     or to_regclass('public.value_object_kind_registry') is null
     or to_regclass('public.actor_public_profiles') is null then
    raise exception using
      errcode = '42P01',
      message = 'P2B_REQUIRED_TABLES_MISSING';
  end if;

  if to_regprocedure(
    'public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)'
  ) is null
     or to_regprocedure(
       'public.apply_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,jsonb,text,text,text)'
     ) is null
     or to_regprocedure(
       'public.rollback_value_object_tree_restructure_v1(uuid,uuid,uuid,uuid,text,text)'
     ) is null then
    raise exception using
      errcode = '42883',
      message = 'P2B_P8_ENGINE_MISSING';
  end if;

  if to_regprocedure(
    'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'
  ) is null then
    raise exception using
      errcode = '42883',
      message = 'P2B_P2A_STRUCTURE_CARD_MISSING';
  end if;

  if to_regprocedure(
    'public.preview_value_object_tree_restructure_v2(uuid,uuid,uuid,text,jsonb)'
  ) is not null
     or exists (
       select 1
       from information_schema.columns
       where table_schema='public'
         and table_name='value_object_tree_operations'
         and column_name='contract_version'
     ) then
    raise exception using
      errcode='23514',
      message='P2B_ALREADY_INSTALLED_OR_PARTIALLY_APPLIED';
  end if;

  if (select count(*) from public.value_objects) <> 15
     or (select count(*) from public.value_object_definition_versions) <> 15
     or (select count(*) from public.value_object_tree_operations) <> 0
     or (select count(*) from public.value_object_tree_operation_items) <> 0 then
    raise exception using
      errcode = '23514',
      message = 'P2B_BASELINE_CHANGED';
  end if;
end;
$preflight$;

alter table public.value_object_tree_operations
  add column if not exists contract_version text;

update public.value_object_tree_operations
set contract_version = 'P8_TREE_V1'
where contract_version is null;

alter table public.value_object_tree_operations
  alter column contract_version set default 'P8_TREE_V1';

alter table public.value_object_tree_operations
  alter column contract_version set not null;

do $constraint$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.value_object_tree_operations'::regclass
      and conname='value_object_tree_operations_contract_version_check'
  ) then
    alter table public.value_object_tree_operations
      add constraint value_object_tree_operations_contract_version_check
      check (
        contract_version in (
          'P8_TREE_V1',
          'P2B_SEMANTIC_TREE_V1'
        )
      );
  end if;
end;
$constraint$;

/*
P2B rows in the shared P8 ledger may only be inserted or updated by a P2B
transaction context. This prevents the legacy P8 rollback RPC from committing
changes to a P2B operation row.
*/
create or replace function public.enforce_value_object_tree_operation_p2b_contract_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if tg_op='UPDATE'
     and old.contract_version='P2B_SEMANTIC_TREE_V1'
     and new.contract_version is distinct from old.contract_version then
    raise exception using
      errcode='23514',
      message='P2B_OPERATION_CONTRACT_IMMUTABLE';
  end if;

  if new.contract_version='P2B_SEMANTIC_TREE_V1'
     and current_setting('arctor.p2b_tree_contract',true)
           is distinct from 'P2B_SEMANTIC_TREE_V1' then
    raise exception using
      errcode='42501',
      message='P2B_OPERATION_REQUIRES_P2B_CONTROLLED_FLOW';
  end if;

  return new;
end;
$function$;

drop trigger if exists value_object_tree_operations_p2b_contract_trg
  on public.value_object_tree_operations;

create trigger value_object_tree_operations_p2b_contract_trg
before insert or update
on public.value_object_tree_operations
for each row
execute function public.enforce_value_object_tree_operation_p2b_contract_v1();

create or replace function public.p2b_value_object_tree_node_json_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_value_object_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select jsonb_build_object(
    'id', value_object.id,
    'canonicalKey', value_object.canonical_key,
    'title', value_object.title,
    'parentValueObjectId', value_object.parent_value_object_id,
    'rootValueObjectId', value_object.root_value_object_id,
    'facetCode', value_object.facet_code,
    'objectKindCode', value_object.object_kind_code,
    'nodeRoleCode', value_object.ontology_node_role_code,
    'hierarchyRelationCode', value_object.hierarchy_relation_code,
    'statusCode', value_object.status,
    'definitionVersion', value_object.definition_version
  )
  from public.value_objects value_object
  where value_object.id = p_value_object_id
    and value_object.scope_code='actor'
    and value_object.owner_user_id = p_owner_user_id
    and value_object.owner_actor_id = p_owner_actor_id
    and value_object.canonical_key is not null
    and value_object.ontology_node_role_code in (
      'root',
      'intermediate',
      'leaf'
    );
$function$;

create or replace function public.p2b_value_object_tree_path_json_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_value_object_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with recursive ancestors as (
    select
      value_object.id,
      value_object.canonical_key,
      value_object.title,
      value_object.parent_value_object_id,
      value_object.root_value_object_id,
      value_object.facet_code,
      value_object.object_kind_code,
      value_object.ontology_node_role_code,
      value_object.hierarchy_relation_code,
      value_object.status,
      value_object.definition_version,
      0 as depth
    from public.value_objects value_object
    where value_object.id = p_value_object_id
      and value_object.scope_code='actor'
      and value_object.owner_user_id = p_owner_user_id
      and value_object.owner_actor_id = p_owner_actor_id

    union all

    select
      parent.id,
      parent.canonical_key,
      parent.title,
      parent.parent_value_object_id,
      parent.root_value_object_id,
      parent.facet_code,
      parent.object_kind_code,
      parent.ontology_node_role_code,
      parent.hierarchy_relation_code,
      parent.status,
      parent.definition_version,
      child.depth + 1
    from public.value_objects parent
    join ancestors child
      on parent.id=child.parent_value_object_id
    where parent.scope_code='actor'
      and parent.owner_user_id=p_owner_user_id
      and parent.owner_actor_id=p_owner_actor_id
      and child.depth < 200
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ancestor.id,
        'canonicalKey', ancestor.canonical_key,
        'title', ancestor.title,
        'parentValueObjectId', ancestor.parent_value_object_id,
        'rootValueObjectId', ancestor.root_value_object_id,
        'facetCode', ancestor.facet_code,
        'objectKindCode', ancestor.object_kind_code,
        'nodeRoleCode', ancestor.ontology_node_role_code,
        'hierarchyRelationCode', ancestor.hierarchy_relation_code,
        'statusCode', ancestor.status,
        'definitionVersion', ancestor.definition_version
      )
      order by ancestor.depth desc
    ),
    '[]'::jsonb
  )
  from ancestors ancestor;
$function$;

create or replace function public.get_value_object_tree_restructure_context_v2(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_target_value_object_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_target public.value_objects%rowtype;
  v_candidates jsonb := '[]'::jsonb;
  v_children jsonb := '[]'::jsonb;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_target_value_object_id is null then
    raise exception using
      errcode='22023',
      message='P2B_REQUIRED_IDENTIFIERS_MISSING';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id=profile.actor_id
     and actor.status='active'
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_owner_actor_id
  ) then
    raise exception using
      errcode='42501',
      message='P2B_ACTOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_target
  from public.value_objects value_object
  where value_object.id=p_target_value_object_id
    and value_object.scope_code='actor'
    and value_object.owner_user_id=p_owner_user_id
    and value_object.owner_actor_id=p_owner_actor_id;

  if not found then
    raise exception using
      errcode='P0002',
      message='P2B_TARGET_NOT_FOUND_OR_DENIED';
  end if;

  if v_target.canonical_key is null
     or v_target.facet_code is null
     or v_target.object_kind_code is null
     or v_target.ontology_node_role_code not in ('root','intermediate','leaf') then
    raise exception using
      errcode='23514',
      message='P2B_TARGET_NOT_ONTOLOGY_READY';
  end if;

  with recursive subtree as (
    select child.id
    from public.value_objects child
    where child.id=v_target.id

    union all

    select child.id
    from public.value_objects child
    join subtree parent on child.parent_value_object_id=parent.id
    where child.scope_code='actor'
      and child.owner_user_id=p_owner_user_id
      and child.owner_actor_id=p_owner_actor_id
  ),
  eligible as (
    select candidate.*
    from public.value_objects candidate
    where candidate.scope_code='actor'
      and candidate.owner_user_id=p_owner_user_id
      and candidate.owner_actor_id=p_owner_actor_id
      and candidate.status in ('draft','active')
      and candidate.canonical_key is not null
      and candidate.ontology_node_role_code in ('root','intermediate')
      and candidate.id <> v_target.id
      and not exists (
        select 1 from subtree where subtree.id=candidate.id
      )
      and (
        (
          candidate.ontology_node_role_code='root'
          and candidate.facet_code='DOMAIN'
          and v_target.facet_code <> 'DOMAIN'
        )
        or
        (
          candidate.ontology_node_role_code='intermediate'
          and candidate.facet_code=v_target.facet_code
        )
      )
  )
  select coalesce(
    jsonb_agg(
      public.p2b_value_object_tree_node_json_v1(
        p_owner_user_id,
        p_owner_actor_id,
        eligible.id
      )
      order by lower(eligible.title), eligible.id
    ),
    '[]'::jsonb
  )
  into v_candidates
  from eligible;

  select coalesce(
    jsonb_agg(
      public.p2b_value_object_tree_node_json_v1(
        p_owner_user_id,
        p_owner_actor_id,
        child.id
      )
      order by lower(child.title), child.id
    ),
    '[]'::jsonb
  )
  into v_children
  from public.value_objects child
  where child.parent_value_object_id=v_target.id
    and child.scope_code='actor'
    and child.owner_user_id=p_owner_user_id
    and child.owner_actor_id=p_owner_actor_id
    and child.status in ('draft','active')
    and child.canonical_key is not null
    and child.ontology_node_role_code in ('intermediate','leaf');

  return jsonb_build_object(
    'ok', true,
    'contractVersion', 'P2B_SEMANTIC_TREE_V1',
    'current',
      public.p2b_value_object_tree_node_json_v1(
        p_owner_user_id,
        p_owner_actor_id,
        v_target.id
      ),
    'candidates',
      case
        when v_target.ontology_node_role_code='root'
          then '[]'::jsonb
        else v_candidates
      end,
    'directChildren', v_children,
    'capabilities', jsonb_build_object(
      'canReparent',
        v_target.status in ('draft','active')
        and v_target.ontology_node_role_code in ('intermediate','leaf'),
      'canInsertIntermediate',
        v_target.status in ('draft','active')
        and v_target.ontology_node_role_code in ('root','intermediate')
        and jsonb_array_length(v_children) > 0
    )
  );
end;
$function$;

create or replace function public.preview_value_object_tree_restructure_v2(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_target_value_object_id uuid,
  p_mode text,
  p_payload jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_target public.value_objects%rowtype;
  v_source_parent public.value_objects%rowtype;
  v_destination_parent public.value_objects%rowtype;

  v_new_parent_id uuid;
  v_new_root_id uuid;
  v_new_branch_type_code text;

  v_child_ids uuid[];
  v_child_count integer;
  v_distinct_child_count integer;
  v_selected_facet_count integer;
  v_derived_facet_code text;

  v_title text;
  v_description text;
  v_facet_code text;
  v_object_kind_code text;
  v_hierarchy_relation_code text;
  v_visibility_code text;
  v_privacy_class_code text;

  v_old_path jsonb;
  v_new_path jsonb;
  v_affected jsonb;
  v_selected_children jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;

  v_preview_material jsonb;
  v_preview_hash text;
  v_state_already_satisfied boolean := false;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_target_value_object_id is null then
    raise exception using
      errcode='22023',
      message='P2B_REQUIRED_IDENTIFIERS_MISSING';
  end if;

  if p_mode not in ('reparent','insert_intermediate') then
    raise exception using
      errcode='22023',
      message='P2B_MODE_INVALID';
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode='22023',
      message='P2B_PAYLOAD_MUST_BE_OBJECT';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id=profile.actor_id
     and actor.status='active'
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_owner_actor_id
  ) then
    raise exception using
      errcode='42501',
      message='P2B_ACTOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_target
  from public.value_objects value_object
  where value_object.id=p_target_value_object_id;

  if not found then
    raise exception using
      errcode='P0002',
      message='P2B_TARGET_NOT_FOUND';
  end if;

  if v_target.scope_code <> 'actor'
     or v_target.owner_user_id is distinct from p_owner_user_id
     or v_target.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode='42501',
      message='P2B_TARGET_OWNER_MISMATCH';
  end if;

  if v_target.canonical_key is null
     or v_target.facet_code is null
     or v_target.object_kind_code is null
     or v_target.ontology_node_role_code not in ('root','intermediate','leaf')
     or v_target.root_value_object_id is null
     or v_target.branch_type_code is null then
    raise exception using
      errcode='23514',
      message='P2B_TARGET_NOT_ONTOLOGY_READY';
  end if;

  if v_target.status not in ('draft','active') then
    raise exception using
      errcode='23514',
      message='P2B_TARGET_STATUS_NOT_EDITABLE';
  end if;

  if v_target.parent_value_object_id is not null then
    select *
    into v_source_parent
    from public.value_objects parent
    where parent.id=v_target.parent_value_object_id;
  end if;

  v_old_path :=
    public.p2b_value_object_tree_path_json_v1(
      p_owner_user_id,
      p_owner_actor_id,
      v_target.id
    );

  if p_mode='reparent' then
    if v_target.ontology_node_role_code='root' then
      raise exception using
        errcode='23514',
        message='P2B_ROOT_REPARENT_FORBIDDEN';
    end if;

    if not (p_payload ? 'newParentValueObjectId')
       or nullif(btrim(p_payload ->> 'newParentValueObjectId'),'') is null then
      raise exception using
        errcode='22023',
        message='P2B_NEW_PARENT_REQUIRED';
    end if;

    begin
      v_new_parent_id := (p_payload ->> 'newParentValueObjectId')::uuid;
    exception when invalid_text_representation then
      raise exception using
        errcode='22023',
        message='P2B_NEW_PARENT_ID_INVALID';
    end;

    if v_new_parent_id=v_target.id then
      raise exception using
        errcode='23514',
        message='P2B_PARENT_CANNOT_REFERENCE_TARGET';
    end if;

    select *
    into v_destination_parent
    from public.value_objects parent
    where parent.id=v_new_parent_id;

    if not found then
      raise exception using
        errcode='P0002',
        message='P2B_DESTINATION_PARENT_NOT_FOUND';
    end if;

    if v_destination_parent.scope_code <> 'actor'
       or v_destination_parent.owner_user_id is distinct from p_owner_user_id
       or v_destination_parent.owner_actor_id is distinct from p_owner_actor_id then
      raise exception using
        errcode='42501',
        message='P2B_DESTINATION_PARENT_OWNER_MISMATCH';
    end if;

    if v_destination_parent.status not in ('draft','active')
       or v_destination_parent.canonical_key is null
       or v_destination_parent.ontology_node_role_code not in ('root','intermediate')
       or v_destination_parent.root_value_object_id is null
       or v_destination_parent.branch_type_code is null
       or v_destination_parent.node_role_code <> 'structural' then
      raise exception using
        errcode='23514',
        message='P2B_DESTINATION_PARENT_NOT_ELIGIBLE';
    end if;

    if v_destination_parent.ontology_node_role_code='root' then
      if v_destination_parent.facet_code <> 'DOMAIN'
         or v_target.facet_code='DOMAIN' then
        raise exception using
          errcode='23514',
          message='P2B_ROOT_FACET_TRANSITION_INVALID';
      end if;
    elsif v_destination_parent.facet_code <> v_target.facet_code then
      raise exception using
        errcode='23514',
        message='P2B_CROSS_FACET_REPARENT_FORBIDDEN';
    end if;

    if exists (
      with recursive subtree as (
        select value_object.id
        from public.value_objects value_object
        where value_object.id=v_target.id

        union all

        select child.id
        from public.value_objects child
        join subtree parent on child.parent_value_object_id=parent.id
        where child.scope_code='actor'
          and child.owner_user_id=p_owner_user_id
          and child.owner_actor_id=p_owner_actor_id
      )
      select 1 from subtree where id=v_new_parent_id
    ) then
      raise exception using
        errcode='23514',
        message='P2B_CYCLE_FORBIDDEN';
    end if;

    v_new_root_id := v_destination_parent.root_value_object_id;
    v_new_branch_type_code := v_destination_parent.branch_type_code;

    v_new_path :=
      public.p2b_value_object_tree_path_json_v1(
        p_owner_user_id,
        p_owner_actor_id,
        v_destination_parent.id
      )
      ||
      jsonb_build_array(
        jsonb_build_object(
          'id', v_target.id,
          'canonicalKey', v_target.canonical_key,
          'title', v_target.title,
          'parentValueObjectId', v_destination_parent.id,
          'rootValueObjectId', v_new_root_id,
          'facetCode', v_target.facet_code,
          'objectKindCode', v_target.object_kind_code,
          'nodeRoleCode', v_target.ontology_node_role_code,
          'hierarchyRelationCode', v_target.hierarchy_relation_code,
          'statusCode', v_target.status,
          'definitionVersion', v_target.definition_version
        )
      );

    with recursive subtree as (
      select
        value_object.id,
        value_object.canonical_key,
        value_object.title,
        value_object.parent_value_object_id,
        value_object.root_value_object_id,
        value_object.branch_type_code,
        value_object.facet_code,
        value_object.object_kind_code,
        value_object.ontology_node_role_code,
        value_object.hierarchy_relation_code,
        value_object.status,
        value_object.definition_version,
        value_object.updated_at,
        0 as depth
      from public.value_objects value_object
      where value_object.id=v_target.id
        and value_object.scope_code='actor'
        and value_object.owner_user_id=p_owner_user_id
        and value_object.owner_actor_id=p_owner_actor_id

      union all

      select
        child.id,
        child.canonical_key,
        child.title,
        child.parent_value_object_id,
        child.root_value_object_id,
        child.branch_type_code,
        child.facet_code,
        child.object_kind_code,
        child.ontology_node_role_code,
        child.hierarchy_relation_code,
        child.status,
        child.definition_version,
        child.updated_at,
        parent.depth + 1
      from public.value_objects child
      join subtree parent on child.parent_value_object_id=parent.id
      where child.scope_code='actor'
        and child.owner_user_id=p_owner_user_id
        and child.owner_actor_id=p_owner_actor_id
        and parent.depth < 200
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', subtree.id,
          'canonicalKey', subtree.canonical_key,
          'title', subtree.title,
          'parentValueObjectId', subtree.parent_value_object_id,
          'rootValueObjectId', subtree.root_value_object_id,
          'facetCode', subtree.facet_code,
          'objectKindCode', subtree.object_kind_code,
          'nodeRoleCode', subtree.ontology_node_role_code,
          'hierarchyRelationCode', subtree.hierarchy_relation_code,
          'statusCode', subtree.status,
          'definitionVersion', subtree.definition_version,
          'depth', subtree.depth,
          'updatedAt', subtree.updated_at
        )
        order by subtree.depth, subtree.id
      ),
      '[]'::jsonb
    )
    into v_affected
    from subtree;

    v_state_already_satisfied :=
      v_target.parent_value_object_id is not distinct from v_new_parent_id
      and v_target.root_value_object_id is not distinct from v_new_root_id
      and v_target.branch_type_code is not distinct from v_new_branch_type_code;

    if jsonb_array_length(v_affected) > 1 then
      v_warnings := v_warnings || jsonb_build_array(
        'The selected object has descendants. Their root context moves atomically with the target.'
      );
    end if;

    v_warnings := v_warnings || jsonb_build_array(
      'The existing hierarchyRelationCode is preserved. Changing parent-edge meaning is a separate semantic edit.',
      'Historical AI reinterpretation is not started automatically. A full historical recalculation is a separate budgeted operation with a hard token cap.'
    );

    v_preview_material := jsonb_build_object(
      'contractVersion','P2B_SEMANTIC_TREE_V1',
      'mode',p_mode,
      'targetId',v_target.id,
      'newParentId',v_new_parent_id,
      'newRootId',v_new_root_id,
      'newBranchTypeCode',v_new_branch_type_code,
      'targetParentId',v_target.parent_value_object_id,
      'targetRootId',v_target.root_value_object_id,
      'targetBranchTypeCode',v_target.branch_type_code,
      'targetFacetCode',v_target.facet_code,
      'targetNodeRoleCode',v_target.ontology_node_role_code,
      'targetHierarchyRelationCode',v_target.hierarchy_relation_code,
      'affected',v_affected
    );

  else
    if v_target.ontology_node_role_code not in ('root','intermediate') then
      raise exception using
        errcode='23514',
        message='P2B_INSERT_PARENT_MUST_BE_ROOT_OR_INTERMEDIATE';
    end if;

    if jsonb_typeof(p_payload -> 'childValueObjectIds') <> 'array' then
      raise exception using
        errcode='22023',
        message='P2B_CHILD_IDS_MUST_BE_ARRAY';
    end if;

    begin
      select coalesce(
        array_agg(value::uuid order by value::uuid),
        array[]::uuid[]
      )
      into v_child_ids
      from jsonb_array_elements_text(
        p_payload -> 'childValueObjectIds'
      ) element(value);
    exception when invalid_text_representation then
      raise exception using
        errcode='22023',
        message='P2B_CHILD_ID_INVALID';
    end;

    v_child_count := coalesce(cardinality(v_child_ids),0);

    select count(distinct child_id)
    into v_distinct_child_count
    from unnest(v_child_ids) child_id;

    if v_child_count=0
       or v_child_count <> v_distinct_child_count then
      raise exception using
        errcode='22023',
        message='P2B_CHILD_IDS_EMPTY_OR_DUPLICATED';
    end if;

    v_title := nullif(btrim(p_payload ->> 'title'),'');
    v_description := nullif(btrim(p_payload ->> 'description'),'');
    v_facet_code := nullif(btrim(p_payload ->> 'facetCode'),'');
    v_object_kind_code := nullif(btrim(p_payload ->> 'objectKindCode'),'');
    v_hierarchy_relation_code :=
      nullif(btrim(p_payload ->> 'hierarchyRelationCode'),'');
    v_visibility_code :=
      coalesce(
        nullif(btrim(p_payload ->> 'visibilityCode'),''),
        v_target.visibility_code,
        'private'
      );
    v_privacy_class_code :=
      coalesce(
        nullif(btrim(p_payload ->> 'privacyClassCode'),''),
        v_target.privacy_class_code,
        'standard'
      );

    if v_title is null or char_length(v_title) > 180 then
      raise exception using
        errcode='22023',
        message='P2B_INTERMEDIATE_TITLE_INVALID';
    end if;

    if v_description is null or char_length(v_description) > 4000 then
      raise exception using
        errcode='22023',
        message='P2B_INTERMEDIATE_DESCRIPTION_INVALID';
    end if;

    if v_hierarchy_relation_code not in (
      'is_a',
      'part_of',
      'aspect_of',
      'subprocess_of'
    ) then
      raise exception using
        errcode='22023',
        message='P2B_INTERMEDIATE_HIERARCHY_RELATION_INVALID';
    end if;

    if v_visibility_code not in ('private','shared','public')
       or v_privacy_class_code not in (
         'public_ontology',
         'standard',
         'sensitive',
         'restricted'
       ) then
      raise exception using
        errcode='22023',
        message='P2B_INTERMEDIATE_PRIVACY_INVALID';
    end if;

    if exists (
      select 1
      from unnest(v_child_ids) selected(id)
      left join public.value_objects child on child.id=selected.id
      where child.id is null
         or child.scope_code is distinct from 'actor'
         or child.owner_user_id is distinct from p_owner_user_id
         or child.owner_actor_id is distinct from p_owner_actor_id
         or child.parent_value_object_id is distinct from v_target.id
         or child.status not in ('draft','active')
         or child.canonical_key is null
         or child.ontology_node_role_code not in ('intermediate','leaf')
    ) then
      raise exception using
        errcode='23514',
        message='P2B_SELECTED_CHILD_MUST_BE_DIRECT_OWNED_SEMANTIC_CHILD';
    end if;

    select
      count(distinct child.facet_code),
      min(child.facet_code)
    into
      v_selected_facet_count,
      v_derived_facet_code
    from public.value_objects child
    where child.id=any(v_child_ids);

    if v_selected_facet_count <> 1
       or v_derived_facet_code is null
       or v_derived_facet_code='DOMAIN' then
      raise exception using
        errcode='23514',
        message='P2B_SELECTED_CHILDREN_MUST_SHARE_ONE_NON_DOMAIN_FACET';
    end if;

    if v_target.ontology_node_role_code='intermediate'
       and v_target.facet_code <> v_derived_facet_code then
      raise exception using
        errcode='23514',
        message='P2B_INTERMEDIATE_CHILD_FACET_MISMATCH';
    end if;

    if v_facet_code is distinct from v_derived_facet_code then
      raise exception using
        errcode='23514',
        message='P2B_NEW_INTERMEDIATE_FACET_MUST_MATCH_SELECTED_CHILDREN';
    end if;

    if not exists (
      select 1
      from public.value_object_kind_registry kind_registry
      where kind_registry.object_kind_code=v_object_kind_code
        and kind_registry.facet_code=v_facet_code
        and kind_registry.status='active'
        and kind_registry.allowed_node_roles_json ? 'intermediate'
    ) then
      raise exception using
        errcode='23514',
        message='P2B_INTERMEDIATE_KIND_NOT_ALLOWED';
    end if;

    select coalesce(
      jsonb_agg(
        public.p2b_value_object_tree_node_json_v1(
          p_owner_user_id,
          p_owner_actor_id,
          child.id
        )
        order by lower(child.title), child.id
      ),
      '[]'::jsonb
    )
    into v_selected_children
    from public.value_objects child
    where child.id=any(v_child_ids);

    with recursive selected_subtrees as (
      select
        child.id,
        child.canonical_key,
        child.title,
        child.parent_value_object_id,
        child.root_value_object_id,
        child.facet_code,
        child.object_kind_code,
        child.ontology_node_role_code,
        child.hierarchy_relation_code,
        child.status,
        child.definition_version,
        child.updated_at,
        child.id as selected_root_id,
        0 as depth
      from public.value_objects child
      where child.id=any(v_child_ids)

      union all

      select
        descendant.id,
        descendant.canonical_key,
        descendant.title,
        descendant.parent_value_object_id,
        descendant.root_value_object_id,
        descendant.facet_code,
        descendant.object_kind_code,
        descendant.ontology_node_role_code,
        descendant.hierarchy_relation_code,
        descendant.status,
        descendant.definition_version,
        descendant.updated_at,
        parent.selected_root_id,
        parent.depth + 1
      from public.value_objects descendant
      join selected_subtrees parent
        on descendant.parent_value_object_id=parent.id
      where descendant.scope_code='actor'
        and descendant.owner_user_id=p_owner_user_id
        and descendant.owner_actor_id=p_owner_actor_id
        and parent.depth < 200
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',subtree.id,
          'canonicalKey',subtree.canonical_key,
          'title',subtree.title,
          'parentValueObjectId',subtree.parent_value_object_id,
          'rootValueObjectId',subtree.root_value_object_id,
          'facetCode',subtree.facet_code,
          'objectKindCode',subtree.object_kind_code,
          'nodeRoleCode',subtree.ontology_node_role_code,
          'hierarchyRelationCode',subtree.hierarchy_relation_code,
          'statusCode',subtree.status,
          'definitionVersion',subtree.definition_version,
          'selectedRootId',subtree.selected_root_id,
          'depth',subtree.depth,
          'updatedAt',subtree.updated_at
        )
        order by subtree.selected_root_id, subtree.depth, subtree.id
      ),
      '[]'::jsonb
    )
    into v_affected
    from selected_subtrees subtree;

    v_new_path :=
      public.p2b_value_object_tree_path_json_v1(
        p_owner_user_id,
        p_owner_actor_id,
        v_target.id
      )
      ||
      jsonb_build_array(
        jsonb_build_object(
          'id',null,
          'canonicalKey',null,
          'title',v_title,
          'parentValueObjectId',v_target.id,
          'rootValueObjectId',v_target.root_value_object_id,
          'facetCode',v_facet_code,
          'objectKindCode',v_object_kind_code,
          'nodeRoleCode','intermediate',
          'hierarchyRelationCode',v_hierarchy_relation_code,
          'statusCode','draft',
          'definitionVersion',1
        )
      );

    v_warnings := v_warnings || jsonb_build_array(
      'The new intermediate and selected-child moves are one atomic operation.',
      'Selected children preserve their current hierarchyRelationCode values.',
      'Historical AI reinterpretation is not started automatically. A full historical recalculation is a separate budgeted operation with a hard token cap.'
    );

    v_preview_material := jsonb_build_object(
      'contractVersion','P2B_SEMANTIC_TREE_V1',
      'mode',p_mode,
      'parentId',v_target.id,
      'rootId',v_target.root_value_object_id,
      'branchTypeCode',v_target.branch_type_code,
      'title',v_title,
      'description',v_description,
      'facetCode',v_facet_code,
      'objectKindCode',v_object_kind_code,
      'hierarchyRelationCode',v_hierarchy_relation_code,
      'visibilityCode',v_visibility_code,
      'privacyClassCode',v_privacy_class_code,
      'childIds',to_jsonb(v_child_ids),
      'affected',v_affected
    );
  end if;

  v_preview_hash := upper(
    encode(
      digest(
        convert_to(v_preview_material::text,'UTF8'),
        'sha256'
      ),
      'hex'
    )
  );

  return jsonb_build_object(
    'ok',true,
    'allowed',true,
    'contractVersion','P2B_SEMANTIC_TREE_V1',
    'mode',p_mode,
    'stateAlreadySatisfied',v_state_already_satisfied,
    'target',
      public.p2b_value_object_tree_node_json_v1(
        p_owner_user_id,
        p_owner_actor_id,
        v_target.id
      ),
    'sourceParent',
      case
        when v_source_parent.id is null then null
        else public.p2b_value_object_tree_node_json_v1(
          p_owner_user_id,
          p_owner_actor_id,
          v_source_parent.id
        )
      end,
    'destinationParent',
      case
        when p_mode='insert_intermediate'
          then public.p2b_value_object_tree_node_json_v1(
            p_owner_user_id,
            p_owner_actor_id,
            v_target.id
          )
        when v_destination_parent.id is null then null
        else public.p2b_value_object_tree_node_json_v1(
          p_owner_user_id,
          p_owner_actor_id,
          v_destination_parent.id
        )
      end,
    'oldPath',v_old_path,
    'newPath',v_new_path,
    'affectedNodes',v_affected,
    'selectedChildren',v_selected_children,
    'proposedIntermediate',
      case
        when p_mode='insert_intermediate' then jsonb_build_object(
          'title',v_title,
          'description',v_description,
          'facetCode',v_facet_code,
          'objectKindCode',v_object_kind_code,
          'hierarchyRelationCode',v_hierarchy_relation_code
        )
        else null
      end,
    'historicalRecalculation',jsonb_build_object(
      'started',false,
      'automatic',false,
      'requiresSeparateBudgetedConfirmation',true
    ),
    'warnings',v_warnings,
    'previewHash',v_preview_hash
  );
end;
$function$;

create or replace function public.apply_value_object_tree_restructure_v2(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_target_value_object_id uuid,
  p_mode text,
  p_payload jsonb,
  p_preview_hash text,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_existing_operation public.value_object_tree_operations%rowtype;
  v_operation public.value_object_tree_operations%rowtype;
  v_target public.value_objects%rowtype;
  v_parent public.value_objects%rowtype;
  v_preview jsonb;

  v_new_parent_id uuid;
  v_new_root_id uuid;
  v_new_branch_type_code text;

  v_child_ids uuid[];
  v_created_intermediate public.value_objects%rowtype;

  v_new_id uuid;
  v_canonical_key text;
  v_facet_code text;
  v_object_kind_code text;
  v_hierarchy_relation_code text;
  v_visibility_code text;
  v_privacy_class_code text;
  v_legacy_privacy_level text;
  v_legacy_sensitivity_level text;

  v_response jsonb;
  v_now timestamptz := clock_timestamp();
  v_item record;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_created_by_actor_id is null
     or p_target_value_object_id is null then
    raise exception using
      errcode='22023',
      message='P2B_REQUIRED_IDENTIFIERS_MISSING';
  end if;

  if p_mode not in ('reparent','insert_intermediate') then
    raise exception using
      errcode='22023',
      message='P2B_MODE_INVALID';
  end if;

  if nullif(btrim(p_idempotency_key),'') is null
     or char_length(p_idempotency_key) not between 8 and 200
     or p_request_hash !~ '^[A-F0-9]{64}$'
     or p_preview_hash !~ '^[A-F0-9]{64}$' then
    raise exception using
      errcode='22023',
      message='P2B_IDEMPOTENCY_OR_HASH_INVALID';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_owner_actor_id
  ) or not exists (
    select 1
    from public.actor_public_profiles profile
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_created_by_actor_id
  ) then
    raise exception using
      errcode='42501',
      message='P2B_ACTOR_OR_CREATOR_NOT_OWNED';
  end if;

  select *
  into v_existing_operation
  from public.value_object_tree_operations operation
  where operation.owner_user_id=p_owner_user_id
    and operation.owner_actor_id=p_owner_actor_id
    and operation.idempotency_key=p_idempotency_key
  for update;

  if found then
    if v_existing_operation.contract_version
         is distinct from 'P2B_SEMANTIC_TREE_V1'
       or v_existing_operation.operation_type is distinct from p_mode
       or v_existing_operation.target_value_object_id_snapshot
            is distinct from p_target_value_object_id
       or v_existing_operation.request_hash is distinct from p_request_hash then
      raise exception using
        errcode='23505',
        message='P2B_IDEMPOTENCY_PAYLOAD_MISMATCH';
    end if;

    return jsonb_set(
      v_existing_operation.response_json,
      '{idempotentReplay}',
      'true'::jsonb,
      true
    );
  end if;

  lock table public.value_objects in share row exclusive mode;

  if p_mode='reparent' then
    for v_item in
      with recursive subtree as (
        select value_object.id,0 as depth
        from public.value_objects value_object
        where value_object.id=p_target_value_object_id

        union all

        select child.id,parent.depth+1
        from public.value_objects child
        join subtree parent on child.parent_value_object_id=parent.id
        where parent.depth < 200
      )
      select value_object.id
      from public.value_objects value_object
      join subtree on subtree.id=value_object.id
      order by subtree.depth,value_object.id
      for update of value_object
    loop
      null;
    end loop;

    v_new_parent_id := (p_payload ->> 'newParentValueObjectId')::uuid;

    perform 1
    from public.value_objects value_object
    where value_object.id=v_new_parent_id
    for update;

  else
    select coalesce(
      array_agg(value::uuid order by value::uuid),
      array[]::uuid[]
    )
    into v_child_ids
    from jsonb_array_elements_text(
      p_payload -> 'childValueObjectIds'
    ) element(value);

    for v_item in
      with recursive locked_rows as (
        select value_object.id,0 as depth
        from public.value_objects value_object
        where value_object.id=p_target_value_object_id
           or value_object.id=any(v_child_ids)

        union

        select child.id,parent.depth+1
        from public.value_objects child
        join locked_rows parent on child.parent_value_object_id=parent.id
        where parent.id <> p_target_value_object_id
          and parent.depth < 200
      )
      select value_object.id
      from public.value_objects value_object
      join locked_rows locked on locked.id=value_object.id
      order by locked.depth,value_object.id
      for update of value_object
    loop
      null;
    end loop;
  end if;

  v_preview := public.preview_value_object_tree_restructure_v2(
    p_owner_user_id,
    p_owner_actor_id,
    p_target_value_object_id,
    p_mode,
    p_payload
  );

  if v_preview ->> 'previewHash' is distinct from p_preview_hash then
    raise exception using
      errcode='40001',
      message='P2B_PREVIEW_STALE_RELOAD_REQUIRED';
  end if;

  select *
  into v_target
  from public.value_objects value_object
  where value_object.id=p_target_value_object_id
  for update;

  if p_mode='reparent' then
    v_new_parent_id := (p_payload ->> 'newParentValueObjectId')::uuid;

    select *
    into v_parent
    from public.value_objects value_object
    where value_object.id=v_new_parent_id
    for update;

    v_new_root_id := v_parent.root_value_object_id;
    v_new_branch_type_code := v_parent.branch_type_code;
  end if;

  perform set_config(
    'arctor.p2b_tree_contract',
    'P2B_SEMANTIC_TREE_V1',
    true
  );

  insert into public.value_object_tree_operations (
    owner_user_id,
    owner_actor_id,
    created_by_actor_id,
    operation_type,
    contract_version,
    status,
    target_value_object_id,
    target_value_object_id_snapshot,
    source_parent_value_object_id,
    source_parent_value_object_id_snapshot,
    destination_parent_value_object_id,
    destination_parent_value_object_id_snapshot,
    idempotency_key,
    request_hash,
    preview_hash,
    request_payload,
    before_snapshot
  )
  values (
    p_owner_user_id,
    p_owner_actor_id,
    p_created_by_actor_id,
    p_mode,
    'P2B_SEMANTIC_TREE_V1',
    'applying',
    v_target.id,
    v_target.id,
    v_target.parent_value_object_id,
    v_target.parent_value_object_id,
    case when p_mode='reparent' then v_new_parent_id else v_target.id end,
    case when p_mode='reparent' then v_new_parent_id else v_target.id end,
    p_idempotency_key,
    p_request_hash,
    p_preview_hash,
    p_payload,
    jsonb_build_object(
      'contractVersion','P2B_SEMANTIC_TREE_V1',
      'preview',v_preview
    )
  )
  returning * into v_operation;

  perform set_config(
    'arctor.p8_tree_operation_id',
    v_operation.id::text,
    true
  );

  if p_mode='reparent' then
    insert into public.value_object_tree_operation_items (
      operation_id,
      value_object_id,
      value_object_id_snapshot,
      item_role,
      depth,
      before_parent_value_object_id,
      before_root_value_object_id,
      before_branch_type_code,
      before_updated_at,
      after_parent_value_object_id,
      after_root_value_object_id,
      after_branch_type_code,
      before_snapshot
    )
    with recursive subtree as (
      select value_object.*,0 as depth
      from public.value_objects value_object
      where value_object.id=v_target.id
        and value_object.scope_code='actor'
        and value_object.owner_user_id=p_owner_user_id
        and value_object.owner_actor_id=p_owner_actor_id

      union all

      select child.*,parent.depth+1
      from public.value_objects child
      join subtree parent on child.parent_value_object_id=parent.id
      where child.scope_code='actor'
        and child.owner_user_id=p_owner_user_id
        and child.owner_actor_id=p_owner_actor_id
        and parent.depth < 200
    )
    select
      v_operation.id,
      subtree.id,
      subtree.id,
      case when subtree.depth=0 then 'target' else 'descendant' end,
      subtree.depth,
      subtree.parent_value_object_id,
      subtree.root_value_object_id,
      subtree.branch_type_code,
      subtree.updated_at,
      case
        when subtree.depth=0 then v_new_parent_id
        else subtree.parent_value_object_id
      end,
      v_new_root_id,
      v_new_branch_type_code,
      to_jsonb(subtree)-'depth'
    from subtree;

    if not coalesce(
      (v_preview ->> 'stateAlreadySatisfied')::boolean,
      false
    ) then
      for v_item in
        select
          item.value_object_id_snapshot,
          item.depth
        from public.value_object_tree_operation_items item
        where item.operation_id=v_operation.id
        order by item.depth,item.value_object_id_snapshot
      loop
        update public.value_objects value_object
        set
          parent_value_object_id =
            case
              when v_item.depth=0 then v_new_parent_id
              else value_object.parent_value_object_id
            end,
          root_value_object_id=v_new_root_id,
          branch_type_code=v_new_branch_type_code,
          updated_at=v_now
        where value_object.id=v_item.value_object_id_snapshot
          and value_object.scope_code='actor'
          and value_object.owner_user_id=p_owner_user_id
          and value_object.owner_actor_id=p_owner_actor_id;
      end loop;
    end if;

  else
    select coalesce(
      array_agg(value::uuid order by value::uuid),
      array[]::uuid[]
    )
    into v_child_ids
    from jsonb_array_elements_text(
      p_payload -> 'childValueObjectIds'
    ) element(value);

    v_new_id := gen_random_uuid();
    v_canonical_key :=
      'actor.'
      || replace(p_owner_actor_id::text,'-','')
      || '.'
      || replace(v_new_id::text,'-','');

    v_facet_code :=
      v_preview -> 'proposedIntermediate' ->> 'facetCode';
    v_object_kind_code :=
      v_preview -> 'proposedIntermediate' ->> 'objectKindCode';
    v_hierarchy_relation_code :=
      v_preview -> 'proposedIntermediate' ->> 'hierarchyRelationCode';

    v_visibility_code :=
      coalesce(
        nullif(btrim(p_payload ->> 'visibilityCode'),''),
        v_target.visibility_code,
        'private'
      );

    v_privacy_class_code :=
      coalesce(
        nullif(btrim(p_payload ->> 'privacyClassCode'),''),
        v_target.privacy_class_code,
        'standard'
      );

    v_legacy_privacy_level := v_visibility_code;

    v_legacy_sensitivity_level :=
      case v_privacy_class_code
        when 'sensitive' then 'sensitive'
        when 'restricted' then 'restricted'
        else 'standard'
      end;

    insert into public.value_objects (
      id,
      owner_actor_id,
      value_type,
      title,
      description,
      organization_id,
      commercial_usage,
      parent_value_object_id,
      actor_id,
      app_user_id,
      owner_user_id,
      visibility,
      source,
      usage_scope,
      created_by_actor_id,
      object_kind,
      node_role_code,
      branch_type_code,
      root_value_object_id,
      instance_of_value_object_id,
      privacy_level,
      sensitivity_level,
      status,
      canonical_key,
      facet_code,
      object_kind_code,
      ontology_node_role_code,
      hierarchy_relation_code,
      scope_code,
      visibility_code,
      privacy_class_code,
      definition_version,
      origin_type_code,
      metadata_json,
      identity_attributes_json
    )
    values (
      v_new_id,
      p_owner_actor_id,
      'other',
      btrim(p_payload ->> 'title'),
      btrim(p_payload ->> 'description'),
      null,
      'none',
      v_target.id,
      p_owner_actor_id,
      p_owner_user_id,
      p_owner_user_id,
      v_visibility_code,
      'manual',
      'private',
      p_created_by_actor_id,
      'other',
      'structural',
      v_target.branch_type_code,
      v_target.root_value_object_id,
      null,
      v_legacy_privacy_level,
      v_legacy_sensitivity_level,
      'draft',
      v_canonical_key,
      v_facet_code,
      v_object_kind_code,
      'intermediate',
      v_hierarchy_relation_code,
      'actor',
      v_visibility_code,
      v_privacy_class_code,
      1,
      'user_declared',
      jsonb_build_object(
        'authoring_contract','P2B_SEMANTIC_TREE_V1',
        'tree_operation_id',v_operation.id,
        'legacy_bridge',true
      ),
      '{}'::jsonb
    )
    returning * into v_created_intermediate;

    update public.value_object_tree_operations
    set
      created_value_object_id=v_created_intermediate.id,
      created_value_object_id_snapshot=v_created_intermediate.id
    where id=v_operation.id;

    insert into public.value_object_tree_operation_items (
      operation_id,
      value_object_id,
      value_object_id_snapshot,
      item_role,
      depth,
      before_parent_value_object_id,
      before_root_value_object_id,
      before_branch_type_code,
      before_updated_at,
      after_parent_value_object_id,
      after_root_value_object_id,
      after_branch_type_code,
      before_snapshot,
      after_snapshot,
      after_updated_at
    )
    values (
      v_operation.id,
      v_created_intermediate.id,
      v_created_intermediate.id,
      'created_intermediate',
      0,
      null,
      null,
      null,
      null,
      v_created_intermediate.parent_value_object_id,
      v_created_intermediate.root_value_object_id,
      v_created_intermediate.branch_type_code,
      '{}'::jsonb,
      to_jsonb(v_created_intermediate),
      v_created_intermediate.updated_at
    );

    insert into public.value_object_tree_operation_items (
      operation_id,
      value_object_id,
      value_object_id_snapshot,
      item_role,
      depth,
      before_parent_value_object_id,
      before_root_value_object_id,
      before_branch_type_code,
      before_updated_at,
      after_parent_value_object_id,
      after_root_value_object_id,
      after_branch_type_code,
      before_snapshot
    )
    with recursive selected_subtrees as (
      select
        child.*,
        child.id as selected_root_id,
        0 as depth
      from public.value_objects child
      where child.id=any(v_child_ids)

      union all

      select
        descendant.*,
        parent.selected_root_id,
        parent.depth+1
      from public.value_objects descendant
      join selected_subtrees parent
        on descendant.parent_value_object_id=parent.id
      where descendant.scope_code='actor'
        and descendant.owner_user_id=p_owner_user_id
        and descendant.owner_actor_id=p_owner_actor_id
        and parent.depth < 200
    )
    select
      v_operation.id,
      subtree.id,
      subtree.id,
      case
        when subtree.depth=0 then 'selected_child'
        else 'selected_descendant'
      end,
      subtree.depth,
      subtree.parent_value_object_id,
      subtree.root_value_object_id,
      subtree.branch_type_code,
      subtree.updated_at,
      case
        when subtree.depth=0 then v_created_intermediate.id
        else subtree.parent_value_object_id
      end,
      subtree.root_value_object_id,
      subtree.branch_type_code,
      to_jsonb(subtree)-'selected_root_id'-'depth'
    from selected_subtrees subtree;

    for v_item in
      select item.value_object_id_snapshot
      from public.value_object_tree_operation_items item
      where item.operation_id=v_operation.id
        and item.item_role='selected_child'
      order by item.value_object_id_snapshot
    loop
      update public.value_objects value_object
      set
        parent_value_object_id=v_created_intermediate.id,
        updated_at=v_now
      where value_object.id=v_item.value_object_id_snapshot
        and value_object.scope_code='actor'
        and value_object.owner_user_id=p_owner_user_id
        and value_object.owner_actor_id=p_owner_actor_id;
    end loop;
  end if;

  update public.value_object_tree_operation_items item
  set
    after_updated_at=value_object.updated_at,
    after_snapshot=to_jsonb(value_object)
  from public.value_objects value_object
  where item.operation_id=v_operation.id
    and item.value_object_id_snapshot=value_object.id;

  v_response := jsonb_build_object(
    'ok',true,
    'contractVersion','P2B_SEMANTIC_TREE_V1',
    'idempotentReplay',false,
    'operationStatus','applied',
    'rolledBackByOperationId',null,
    'stateAlreadySatisfied',
      coalesce(
        (v_preview ->> 'stateAlreadySatisfied')::boolean,
        false
      ),
    'operationId',v_operation.id,
    'operationType',p_mode,
    'targetValueObjectId',v_target.id,
    'createdValueObjectId',v_created_intermediate.id,
    'affectedValueObjectIds',coalesce(
      (
        select jsonb_agg(
          item.value_object_id_snapshot
          order by item.depth,item.value_object_id_snapshot
        )
        from public.value_object_tree_operation_items item
        where item.operation_id=v_operation.id
      ),
      '[]'::jsonb
    ),
    'redirectValueObjectId',
      coalesce(v_created_intermediate.id,v_target.id),
    'historicalRecalculation',jsonb_build_object(
      'started',false,
      'automatic',false,
      'requiresSeparateBudgetedConfirmation',true
    )
  );

  update public.value_object_tree_operations
  set
    status='applied',
    applied_at=v_now,
    after_snapshot=jsonb_build_object(
      'contractVersion','P2B_SEMANTIC_TREE_V1',
      'target',
        public.p2b_value_object_tree_node_json_v1(
          p_owner_user_id,
          p_owner_actor_id,
          v_target.id
        ),
      'createdIntermediate',
        case
          when v_created_intermediate.id is null then null
          else public.p2b_value_object_tree_node_json_v1(
            p_owner_user_id,
            p_owner_actor_id,
            v_created_intermediate.id
          )
        end
    ),
    response_json=v_response
  where id=v_operation.id;

  return v_response;
end;
$function$;

create or replace function public.rollback_value_object_tree_restructure_v2(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_operation_id uuid,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_existing_operation public.value_object_tree_operations%rowtype;
  v_original public.value_object_tree_operations%rowtype;
  v_rollback public.value_object_tree_operations%rowtype;
  v_created_item public.value_object_tree_operation_items%rowtype;
  v_response jsonb;
  v_now timestamptz := clock_timestamp();
  v_item record;
  v_current public.value_objects%rowtype;
  v_newer_conflict boolean;
  v_fk record;
  v_has_external_reference boolean;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_created_by_actor_id is null
     or p_operation_id is null then
    raise exception using
      errcode='22023',
      message='P2B_ROLLBACK_REQUIRED_IDENTIFIERS_MISSING';
  end if;

  if nullif(btrim(p_idempotency_key),'') is null
     or char_length(p_idempotency_key) not between 8 and 200
     or p_request_hash !~ '^[A-F0-9]{64}$' then
    raise exception using
      errcode='22023',
      message='P2B_ROLLBACK_IDEMPOTENCY_INVALID';
  end if;

  select *
  into v_existing_operation
  from public.value_object_tree_operations operation
  where operation.owner_user_id=p_owner_user_id
    and operation.owner_actor_id=p_owner_actor_id
    and operation.idempotency_key=p_idempotency_key
  for update;

  if found then
    if v_existing_operation.contract_version
         is distinct from 'P2B_SEMANTIC_TREE_V1'
       or v_existing_operation.operation_type <> 'rollback'
       or v_existing_operation.rollback_of_operation_id
            is distinct from p_operation_id
       or v_existing_operation.request_hash
            is distinct from p_request_hash then
      raise exception using
        errcode='23505',
        message='P2B_IDEMPOTENCY_PAYLOAD_MISMATCH';
    end if;

    return jsonb_set(
      v_existing_operation.response_json,
      '{idempotentReplay}',
      'true'::jsonb,
      true
    );
  end if;

  select *
  into v_original
  from public.value_object_tree_operations operation
  where operation.id=p_operation_id
  for update;

  if not found then
    raise exception using
      errcode='P0002',
      message='P2B_OPERATION_NOT_FOUND';
  end if;

  if v_original.owner_user_id is distinct from p_owner_user_id
     or v_original.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode='42501',
      message='P2B_OPERATION_OWNER_MISMATCH';
  end if;

  if v_original.contract_version <> 'P2B_SEMANTIC_TREE_V1'
     or v_original.operation_type not in (
       'reparent',
       'insert_intermediate'
     )
     or v_original.status <> 'applied' then
    raise exception using
      errcode='23514',
      message='P2B_OPERATION_NOT_ROLLBACK_ELIGIBLE';
  end if;

  lock table public.value_objects in share row exclusive mode;

  select exists (
    select 1
    from public.value_object_tree_operation_items original_item
    join public.value_object_tree_operation_items newer_item
      on newer_item.value_object_id_snapshot=
         original_item.value_object_id_snapshot
    join public.value_object_tree_operations newer_operation
      on newer_operation.id=newer_item.operation_id
    where original_item.operation_id=v_original.id
      and newer_operation.id <> v_original.id
      and newer_operation.status='applied'
      and newer_operation.operation_type in (
        'reparent',
        'insert_intermediate'
      )
      and newer_operation.created_at > v_original.created_at
  )
  into v_newer_conflict;

  if v_newer_conflict then
    raise exception using
      errcode='40001',
      message='P2B_ROLLBACK_BLOCKED_BY_NEWER_TREE_OPERATION';
  end if;

  for v_item in
    select *
    from public.value_object_tree_operation_items item
    where item.operation_id=v_original.id
      and item.item_role <> 'created_intermediate'
    order by item.depth,item.value_object_id_snapshot
  loop
    select *
    into v_current
    from public.value_objects value_object
    where value_object.id=v_item.value_object_id_snapshot
    for update;

    if not found then
      raise exception using
        errcode='40001',
        message='P2B_ROLLBACK_OBJECT_MISSING';
    end if;

    if v_current.scope_code <> 'actor'
       or v_current.owner_user_id is distinct from p_owner_user_id
       or v_current.owner_actor_id is distinct from p_owner_actor_id
       or v_current.parent_value_object_id
            is distinct from v_item.after_parent_value_object_id
       or v_current.root_value_object_id
            is distinct from v_item.after_root_value_object_id
       or v_current.branch_type_code
            is distinct from v_item.after_branch_type_code then
      raise exception using
        errcode='40001',
        message='P2B_ROLLBACK_CURRENT_TREE_STATE_CONFLICT';
    end if;
  end loop;

  if v_original.operation_type='insert_intermediate' then
    select *
    into v_created_item
    from public.value_object_tree_operation_items item
    where item.operation_id=v_original.id
      and item.item_role='created_intermediate';

    if not found then
      raise exception using
        errcode='P0002',
        message='P2B_ROLLBACK_CREATED_INTERMEDIATE_AUDIT_MISSING';
    end if;

    select *
    into v_current
    from public.value_objects value_object
    where value_object.id=v_created_item.value_object_id_snapshot
    for update;

    if not found
       or v_current.scope_code <> 'actor'
       or v_current.owner_user_id is distinct from p_owner_user_id
       or v_current.owner_actor_id is distinct from p_owner_actor_id
       or v_current.parent_value_object_id
            is distinct from v_created_item.after_parent_value_object_id
       or v_current.root_value_object_id
            is distinct from v_created_item.after_root_value_object_id
       or v_current.branch_type_code
            is distinct from v_created_item.after_branch_type_code
       or v_current.canonical_key
            is distinct from (v_created_item.after_snapshot ->> 'canonical_key')
       or v_current.title
            is distinct from (v_created_item.after_snapshot ->> 'title')
       or v_current.description
            is distinct from nullif(
              v_created_item.after_snapshot ->> 'description',
              ''
            )
       or v_current.facet_code
            is distinct from (v_created_item.after_snapshot ->> 'facet_code')
       or v_current.object_kind_code
            is distinct from (
              v_created_item.after_snapshot ->> 'object_kind_code'
            )
       or v_current.ontology_node_role_code
            is distinct from 'intermediate'
       or v_current.definition_version
            is distinct from (
              v_created_item.after_snapshot ->> 'definition_version'
            )::integer
       or v_current.status
            is distinct from (v_created_item.after_snapshot ->> 'status') then
      raise exception using
        errcode='40001',
        message='P2B_ROLLBACK_CREATED_INTERMEDIATE_CHANGED';
    end if;

    if exists (
      select 1
      from public.value_objects child
      where child.parent_value_object_id=
        v_created_item.value_object_id_snapshot
        and not exists (
          select 1
          from public.value_object_tree_operation_items original_item
          where original_item.operation_id=v_original.id
            and original_item.item_role='selected_child'
            and original_item.value_object_id_snapshot=child.id
        )
    ) then
      raise exception using
        errcode='40001',
        message='P2B_ROLLBACK_CREATED_INTERMEDIATE_HAS_NEW_CHILDREN';
    end if;

    for v_fk in
      select
        namespace.nspname as schema_name,
        relation.relname as table_name,
        attribute.attname as column_name
      from pg_constraint constraint_row
      join pg_class relation
        on relation.oid=constraint_row.conrelid
      join pg_namespace namespace
        on namespace.oid=relation.relnamespace
      join unnest(constraint_row.conkey)
        with ordinality local_key(attnum,ordinal)
        on true
      join unnest(constraint_row.confkey)
        with ordinality referenced_key(attnum,ordinal)
        on referenced_key.ordinal=local_key.ordinal
      join pg_attribute attribute
        on attribute.attrelid=constraint_row.conrelid
       and attribute.attnum=local_key.attnum
      join pg_attribute referenced_attribute
        on referenced_attribute.attrelid=constraint_row.confrelid
       and referenced_attribute.attnum=referenced_key.attnum
      where constraint_row.contype='f'
        and constraint_row.confrelid='public.value_objects'::regclass
        and referenced_attribute.attname='id'
        and cardinality(constraint_row.conkey)=1
        and not (
          namespace.nspname='public'
          and relation.relname in (
            'value_object_tree_operations',
            'value_object_tree_operation_items',
            'value_object_hierarchy_events',
            'value_object_definition_versions'
          )
        )
        and not (
          namespace.nspname='public'
          and relation.relname='value_objects'
          and attribute.attname='parent_value_object_id'
        )
    loop
      execute format(
        'select exists (select 1 from %I.%I where %I=$1)',
        v_fk.schema_name,
        v_fk.table_name,
        v_fk.column_name
      )
      into v_has_external_reference
      using v_created_item.value_object_id_snapshot;

      if v_has_external_reference then
        raise exception using
          errcode='40001',
          message='P2B_ROLLBACK_CREATED_INTERMEDIATE_HAS_DEPENDENT_DATA',
          detail=format(
            'Dependent reference found in %I.%I.%I',
            v_fk.schema_name,
            v_fk.table_name,
            v_fk.column_name
          );
      end if;
    end loop;
  end if;

  perform set_config(
    'arctor.p2b_tree_contract',
    'P2B_SEMANTIC_TREE_V1',
    true
  );

  insert into public.value_object_tree_operations (
    owner_user_id,
    owner_actor_id,
    created_by_actor_id,
    operation_type,
    contract_version,
    status,
    target_value_object_id,
    target_value_object_id_snapshot,
    source_parent_value_object_id,
    source_parent_value_object_id_snapshot,
    destination_parent_value_object_id,
    destination_parent_value_object_id_snapshot,
    rollback_of_operation_id,
    idempotency_key,
    request_hash,
    preview_hash,
    request_payload,
    before_snapshot
  )
  values (
    p_owner_user_id,
    p_owner_actor_id,
    p_created_by_actor_id,
    'rollback',
    'P2B_SEMANTIC_TREE_V1',
    'applying',
    v_original.target_value_object_id,
    v_original.target_value_object_id_snapshot,
    v_original.destination_parent_value_object_id,
    v_original.destination_parent_value_object_id_snapshot,
    v_original.source_parent_value_object_id,
    v_original.source_parent_value_object_id_snapshot,
    v_original.id,
    p_idempotency_key,
    p_request_hash,
    v_original.preview_hash,
    jsonb_build_object(
      'operationId',v_original.id,
      'contractVersion','P2B_SEMANTIC_TREE_V1'
    ),
    jsonb_build_object(
      'originalOperation',v_original.response_json
    )
  )
  returning * into v_rollback;

  perform set_config(
    'arctor.p8_tree_operation_id',
    v_rollback.id::text,
    true
  );

  insert into public.value_object_tree_operation_items (
    operation_id,
    value_object_id,
    value_object_id_snapshot,
    item_role,
    depth,
    before_parent_value_object_id,
    before_root_value_object_id,
    before_branch_type_code,
    before_updated_at,
    after_parent_value_object_id,
    after_root_value_object_id,
    after_branch_type_code,
    before_snapshot,
    after_snapshot
  )
  select
    v_rollback.id,
    original_item.value_object_id,
    original_item.value_object_id_snapshot,
    original_item.item_role,
    original_item.depth,
    original_item.after_parent_value_object_id,
    original_item.after_root_value_object_id,
    original_item.after_branch_type_code,
    original_item.after_updated_at,
    case
      when original_item.item_role='created_intermediate'
        then original_item.after_parent_value_object_id
      else original_item.before_parent_value_object_id
    end,
    case
      when original_item.item_role='created_intermediate'
        then original_item.after_root_value_object_id
      else original_item.before_root_value_object_id
    end,
    case
      when original_item.item_role='created_intermediate'
        then original_item.after_branch_type_code
      else original_item.before_branch_type_code
    end,
    original_item.after_snapshot,
    original_item.before_snapshot
  from public.value_object_tree_operation_items original_item
  where original_item.operation_id=v_original.id;

  for v_item in
    select *
    from public.value_object_tree_operation_items item
    where item.operation_id=v_original.id
      and item.item_role <> 'created_intermediate'
    order by item.depth,item.value_object_id_snapshot
  loop
    update public.value_objects value_object
    set
      parent_value_object_id=v_item.before_parent_value_object_id,
      root_value_object_id=v_item.before_root_value_object_id,
      branch_type_code=v_item.before_branch_type_code,
      updated_at=v_now
    where value_object.id=v_item.value_object_id_snapshot
      and value_object.scope_code='actor'
      and value_object.owner_user_id=p_owner_user_id
      and value_object.owner_actor_id=p_owner_actor_id
      and (
        value_object.parent_value_object_id
          is distinct from v_item.before_parent_value_object_id
        or value_object.root_value_object_id
          is distinct from v_item.before_root_value_object_id
        or value_object.branch_type_code
          is distinct from v_item.before_branch_type_code
      );
  end loop;

  if v_original.operation_type='insert_intermediate' then
    update public.value_objects value_object
    set
      status='retired',
      metadata_json=
        coalesce(value_object.metadata_json,'{}'::jsonb)
        || jsonb_build_object(
          'retired_by_tree_rollback_operation_id',v_rollback.id,
          'retired_from_tree_operation_id',v_original.id
        ),
      updated_at=v_now
    where value_object.id=v_created_item.value_object_id_snapshot
      and value_object.scope_code='actor'
      and value_object.owner_user_id=p_owner_user_id
      and value_object.owner_actor_id=p_owner_actor_id;
  end if;

  update public.value_object_tree_operation_items item
  set
    after_updated_at=value_object.updated_at,
    after_snapshot=to_jsonb(value_object)
  from public.value_objects value_object
  where item.operation_id=v_rollback.id
    and item.value_object_id_snapshot=value_object.id;

  v_response := jsonb_build_object(
    'ok',true,
    'contractVersion','P2B_SEMANTIC_TREE_V1',
    'idempotentReplay',false,
    'rollbackOperationId',v_rollback.id,
    'rolledBackOperationId',v_original.id,
    'restoredValueObjectIds',coalesce(
      (
        select jsonb_agg(
          item.value_object_id_snapshot
          order by item.depth,item.value_object_id_snapshot
        )
        from public.value_object_tree_operation_items item
        where item.operation_id=v_original.id
          and item.item_role <> 'created_intermediate'
      ),
      '[]'::jsonb
    ),
    'retiredCreatedValueObjectId',
      case
        when v_original.operation_type='insert_intermediate'
          then v_created_item.value_object_id_snapshot
        else null
      end,
    'redirectValueObjectId',
      v_original.target_value_object_id_snapshot
  );

  update public.value_object_tree_operations
  set
    status='rolled_back',
    rolled_back_at=v_now,
    response_json=
      coalesce(response_json,'{}'::jsonb)
      || jsonb_build_object(
        'operationStatus','rolled_back',
        'rolledBackByOperationId',v_rollback.id
      )
  where id=v_original.id;

  update public.value_object_tree_operations
  set
    status='applied',
    applied_at=v_now,
    after_snapshot=jsonb_build_object(
      'contractVersion','P2B_SEMANTIC_TREE_V1',
      'rollbackOf',v_original.id
    ),
    response_json=v_response
  where id=v_rollback.id;

  return v_response;
end;
$function$;

/*
P2B integration hardening:
retired semantic descendants retained for historical replay are hidden from
ordinary P2A structure navigation and aggregate counts.
*/
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
          and grandchild.status <> 'retired'
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
      and child.status <> 'retired'
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
      and child.status <> 'retired'
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
     and child.status <> 'retired'
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

revoke all on function public.enforce_value_object_tree_operation_p2b_contract_v1()
from public, anon, authenticated;

grant execute on function public.enforce_value_object_tree_operation_p2b_contract_v1()
to service_role;

revoke all on function public.p2b_value_object_tree_node_json_v1(
  uuid,uuid,uuid
) from public, anon, authenticated;

revoke all on function public.p2b_value_object_tree_path_json_v1(
  uuid,uuid,uuid
) from public, anon, authenticated;

revoke all on function public.get_value_object_tree_restructure_context_v2(
  uuid,uuid,uuid
) from public, anon, authenticated;

revoke all on function public.preview_value_object_tree_restructure_v2(
  uuid,uuid,uuid,text,jsonb
) from public, anon, authenticated;

revoke all on function public.apply_value_object_tree_restructure_v2(
  uuid,uuid,uuid,uuid,text,jsonb,text,text,text
) from public, anon, authenticated;

revoke all on function public.rollback_value_object_tree_restructure_v2(
  uuid,uuid,uuid,uuid,text,text
) from public, anon, authenticated;

grant execute on function public.p2b_value_object_tree_node_json_v1(
  uuid,uuid,uuid
) to service_role;

grant execute on function public.p2b_value_object_tree_path_json_v1(
  uuid,uuid,uuid
) to service_role;

grant execute on function public.get_value_object_tree_restructure_context_v2(
  uuid,uuid,uuid
) to service_role;

grant execute on function public.preview_value_object_tree_restructure_v2(
  uuid,uuid,uuid,text,jsonb
) to service_role;

grant execute on function public.apply_value_object_tree_restructure_v2(
  uuid,uuid,uuid,uuid,text,jsonb,text,text,text
) to service_role;

grant execute on function public.rollback_value_object_tree_restructure_v2(
  uuid,uuid,uuid,uuid,text,text
) to service_role;

comment on function public.preview_value_object_tree_restructure_v2(
  uuid,uuid,uuid,text,jsonb
) is
  'P2B semantic Value Object tree preview. One structural parent; root immutable; facet guards; no historical AI recalculation.';

comment on function public.apply_value_object_tree_restructure_v2(
  uuid,uuid,uuid,uuid,text,jsonb,text,text,text
) is
  'P2B semantic Value Object tree apply. Reuses P8 ledger and controlled-flow guard; P1C creates immutable definition versions.';

comment on function public.rollback_value_object_tree_restructure_v2(
  uuid,uuid,uuid,uuid,text,text
) is
  'P2B semantic guarded rollback. Restores tree state and retires P2B-created intermediate instead of deleting semantic history.';

commit;
