/*
ARCTor.app â€” Goal World Constructor
P2D Value Object Aliases & Deterministic Recognition v1

Reuses public.concept_aliases.
Does NOT create a duplicate Value Object alias table.
Does NOT update Value Object definition versions.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

do $preflight$
begin
  if to_regclass('public.concept_aliases') is null
     or to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_definition_versions') is null
     or to_regclass('public.actor_public_profiles') is null
     or to_regclass('public.actors') is null then
    raise exception using
      errcode='42P01',
      message='P2D_REQUIRED_TABLES_MISSING';
  end if;

  if to_regprocedure(
    'public.get_value_object_structure_card_v1(uuid,uuid,uuid)'
  ) is null
     or to_regprocedure(
       'public.get_value_object_definition_editor_v1(uuid,uuid,uuid)'
     ) is null then
    raise exception using
      errcode='42883',
      message='P2D_P2A_OR_P2C_NOT_INSTALLED';
  end if;

  if to_regprocedure(
    'public.get_value_object_alias_profile_v1(uuid,uuid,uuid)'
  ) is not null
     or to_regprocedure(
       'public.manage_value_object_alias_v1(uuid,uuid,uuid,uuid,text,jsonb)'
     ) is not null
     or to_regprocedure(
       'public.recognize_value_object_text_v1(uuid,uuid,text,text)'
     ) is not null then
    raise exception using
      errcode='23514',
      message='P2D_ALREADY_INSTALLED_OR_PARTIALLY_APPLIED';
  end if;

  if (select count(*) from public.value_objects) <> 15
     or (select count(*) from public.value_object_definition_versions) <> 15
     or (select count(*) from public.value_object_definition_edit_requests) <> 0
     or (
       select count(*)
       from public.concept_aliases
       where concept_type='value_object'
     ) <> 0 then
    raise exception using
      errcode='23514',
      message='P2D_BASELINE_CHANGED';
  end if;
end;
$preflight$;

alter table public.concept_aliases
  drop constraint concept_aliases_concept_type_allowed;

alter table public.concept_aliases
  add constraint concept_aliases_concept_type_allowed
  check (
    concept_type in (
      'object_class',
      'object_type',
      'action_type',
      'context',
      'contextual_category',
      'value_object'
    )
  );

create index if not exists concept_aliases_value_object_recognition_idx
on public.concept_aliases (
  alias_normalized,
  lower(locale),
  concept_id
)
where concept_type='value_object'
  and status in ('approved','published');

create or replace function public.get_value_object_alias_profile_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_value_object_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $function$
declare
  v_value_object public.value_objects%rowtype;
  v_aliases jsonb := '[]'::jsonb;
  v_alias_count integer := 0;
  v_active_count integer := 0;
  v_can_manage boolean := false;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_value_object_id is null then
    raise exception using
      errcode='22023',
      message='P2D_ALIAS_PROFILE_IDENTIFIERS_REQUIRED';
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
      message='P2D_ACTOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_value_object
  from public.value_objects value_object
  where value_object.id=p_value_object_id;

  if not found then
    raise exception using
      errcode='P0002',
      message='P2D_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_value_object.scope_code <> 'actor'
     or v_value_object.owner_user_id is distinct from p_owner_user_id
     or v_value_object.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode='42501',
      message='P2D_VALUE_OBJECT_ACCESS_DENIED';
  end if;

  if v_value_object.canonical_key is null
     or v_value_object.ontology_node_role_code
          not in ('root','intermediate','leaf')
     or v_value_object.definition_version is null then
    raise exception using
      errcode='23514',
      message='P2D_VALUE_OBJECT_NOT_ONTOLOGY_READY';
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',alias_row.id,
          'aliasText',alias_row.alias_text,
          'aliasNormalized',alias_row.alias_normalized,
          'locale',alias_row.locale,
          'status',alias_row.status,
          'sourceType',alias_row.source_type,
          'createdAt',alias_row.created_at,
          'updatedAt',alias_row.updated_at,
          'recognitionActive',
            alias_row.status in ('approved','published')
        )
        order by
          case
            when alias_row.status in ('approved','published') then 0
            when alias_row.status='archived' then 2
            else 1
          end,
          coalesce(lower(alias_row.locale),''),
          alias_row.alias_normalized,
          alias_row.id
      ),
      '[]'::jsonb
    ),
    count(*)::integer,
    count(*) filter (
      where alias_row.status in ('approved','published')
    )::integer
  into
    v_aliases,
    v_alias_count,
    v_active_count
  from public.concept_aliases alias_row
  where alias_row.concept_type='value_object'
    and alias_row.concept_id=v_value_object.id;

  v_can_manage :=
    v_value_object.status in ('draft','active','inactive');

  return jsonb_build_object(
    'ok',true,
    'contractVersion','P2D_VALUE_OBJECT_ALIAS_RECOGNITION_V1',
    'valueObject',jsonb_build_object(
      'id',v_value_object.id,
      'title',v_value_object.title,
      'canonicalKey',v_value_object.canonical_key,
      'statusCode',v_value_object.status,
      'definitionVersion',v_value_object.definition_version
    ),
    'aliases',v_aliases,
    'summary',jsonb_build_object(
      'aliasCount',v_alias_count,
      'recognitionActiveAliasCount',v_active_count
    ),
    'permissions',jsonb_build_object(
      'actorOwner',true,
      'canManageAliases',v_can_manage,
      'hardDeleteEnabled',false,
      'primaryTitleManagedBy','P2C'
    )
  );
end;
$function$;

create or replace function public.manage_value_object_alias_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_value_object_id uuid,
  p_action text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_value_object public.value_objects%rowtype;
  v_alias public.concept_aliases%rowtype;

  v_alias_text text;
  v_alias_normalized text;
  v_locale text;
  v_alias_id uuid;

  v_state_already_satisfied boolean := false;
  v_before_version integer;
  v_after_version integer;
  v_profile jsonb;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_created_by_actor_id is null
     or p_value_object_id is null then
    raise exception using
      errcode='22023',
      message='P2D_ALIAS_IDENTIFIERS_REQUIRED';
  end if;

  if p_action not in ('add','archive','restore') then
    raise exception using
      errcode='22023',
      message='P2D_ALIAS_ACTION_INVALID';
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode='22023',
      message='P2D_ALIAS_PAYLOAD_INVALID';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id=profile.actor_id
     and actor.status='active'
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_owner_actor_id
  ) or not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id=profile.actor_id
     and actor.status='active'
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_created_by_actor_id
  ) then
    raise exception using
      errcode='42501',
      message='P2D_ACTOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_value_object
  from public.value_objects value_object
  where value_object.id=p_value_object_id
  for update;

  if not found then
    raise exception using
      errcode='P0002',
      message='P2D_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_value_object.scope_code <> 'actor'
     or v_value_object.owner_user_id is distinct from p_owner_user_id
     or v_value_object.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode='42501',
      message='P2D_VALUE_OBJECT_ACCESS_DENIED';
  end if;

  if v_value_object.canonical_key is null
     or v_value_object.ontology_node_role_code
          not in ('root','intermediate','leaf')
     or v_value_object.definition_version is null then
    raise exception using
      errcode='23514',
      message='P2D_VALUE_OBJECT_NOT_ONTOLOGY_READY';
  end if;

  if v_value_object.status not in ('draft','active','inactive') then
    raise exception using
      errcode='23514',
      message='P2D_STATUS_NOT_MANAGEABLE';
  end if;

  v_before_version := v_value_object.definition_version;

  if p_action='add' then
    if not (p_payload ? 'aliasText')
       or jsonb_typeof(p_payload -> 'aliasText') <> 'string' then
      raise exception using
        errcode='22023',
        message='P2D_ALIAS_TEXT_REQUIRED';
    end if;

    v_alias_text := nullif(btrim(p_payload ->> 'aliasText'),'');

    if v_alias_text is null
       or char_length(v_alias_text) > 180 then
      raise exception using
        errcode='22023',
        message='P2D_ALIAS_TEXT_INVALID';
    end if;

    v_alias_normalized := lower(v_alias_text);

    if v_alias_normalized=lower(btrim(v_value_object.title)) then
      raise exception using
        errcode='23514',
        message='P2D_ALIAS_EQUALS_PRIMARY_TITLE';
    end if;

    if p_payload ? 'locale' then
      if jsonb_typeof(p_payload -> 'locale')='null' then
        v_locale := null;
      elsif jsonb_typeof(p_payload -> 'locale')='string' then
        v_locale := lower(nullif(btrim(p_payload ->> 'locale'),''));
      else
        raise exception using
          errcode='22023',
          message='P2D_ALIAS_LOCALE_INVALID';
      end if;
    else
      v_locale := null;
    end if;

    if v_locale is not null
       and (
         char_length(v_locale) > 35
         or v_locale !~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'
       ) then
      raise exception using
        errcode='22023',
        message='P2D_ALIAS_LOCALE_INVALID';
    end if;

    select *
    into v_alias
    from public.concept_aliases alias_row
    where alias_row.concept_type='value_object'
      and alias_row.concept_id=v_value_object.id
      and alias_row.alias_normalized=v_alias_normalized
      and coalesce(lower(alias_row.locale),'')=coalesce(v_locale,'')
    for update;

    if found then
      if v_alias.status in ('approved','published') then
        v_state_already_satisfied := true;
      else
        update public.concept_aliases
        set
          alias_text=v_alias_text,
          locale=v_locale,
          status='approved',
          source_type='owner_confirmed',
          updated_at=clock_timestamp()
        where id=v_alias.id
        returning * into v_alias;
      end if;
    else
      insert into public.concept_aliases (
        concept_type,
        concept_id,
        alias_text,
        locale,
        status,
        source_type
      )
      values (
        'value_object',
        v_value_object.id,
        v_alias_text,
        v_locale,
        'approved',
        'owner_confirmed'
      )
      returning * into v_alias;
    end if;

  else
    if not (p_payload ? 'aliasId')
       or jsonb_typeof(p_payload -> 'aliasId') <> 'string' then
      raise exception using
        errcode='22023',
        message='P2D_ALIAS_ID_REQUIRED';
    end if;

    begin
      v_alias_id := (p_payload ->> 'aliasId')::uuid;
    exception
      when invalid_text_representation then
        raise exception using
          errcode='22023',
          message='P2D_ALIAS_ID_INVALID';
    end;

    select *
    into v_alias
    from public.concept_aliases alias_row
    where alias_row.id=v_alias_id
      and alias_row.concept_type='value_object'
      and alias_row.concept_id=v_value_object.id
    for update;

    if not found then
      raise exception using
        errcode='P0002',
        message='P2D_ALIAS_NOT_FOUND';
    end if;

    if p_action='archive' then
      if v_alias.status='archived' then
        v_state_already_satisfied := true;
      else
        update public.concept_aliases
        set
          status='archived',
          updated_at=clock_timestamp()
        where id=v_alias.id
        returning * into v_alias;
      end if;
    else
      if v_alias.status in ('approved','published') then
        v_state_already_satisfied := true;
      else
        update public.concept_aliases
        set
          status='approved',
          source_type='owner_confirmed',
          updated_at=clock_timestamp()
        where id=v_alias.id
        returning * into v_alias;
      end if;
    end if;
  end if;

  select definition_version
  into v_after_version
  from public.value_objects
  where id=v_value_object.id;

  if v_after_version is distinct from v_before_version then
    raise exception using
      errcode='23514',
      message='P2D_ALIAS_MUTATION_CHANGED_DEFINITION_VERSION';
  end if;

  v_profile := public.get_value_object_alias_profile_v1(
    p_owner_user_id,
    p_owner_actor_id,
    v_value_object.id
  );

  return jsonb_build_object(
    'ok',true,
    'contractVersion','P2D_VALUE_OBJECT_ALIAS_RECOGNITION_V1',
    'action',p_action,
    'stateAlreadySatisfied',v_state_already_satisfied,
    'definitionVersionBefore',v_before_version,
    'definitionVersionAfter',v_after_version,
    'definitionVersionChanged',false,
    'alias',jsonb_build_object(
      'id',v_alias.id,
      'aliasText',v_alias.alias_text,
      'aliasNormalized',v_alias.alias_normalized,
      'locale',v_alias.locale,
      'status',v_alias.status,
      'sourceType',v_alias.source_type,
      'createdAt',v_alias.created_at,
      'updatedAt',v_alias.updated_at,
      'recognitionActive',
        v_alias.status in ('approved','published')
    ),
    'profile',v_profile
  );
end;
$function$;

create or replace function public.recognize_value_object_text_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_query_text text,
  p_locale text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $function$
declare
  v_query_text text;
  v_query_normalized text;
  v_locale text;
  v_candidates jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_resolved uuid := null;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null then
    raise exception using
      errcode='22023',
      message='P2D_RECOGNITION_IDENTIFIERS_REQUIRED';
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
      message='P2D_ACTOR_NOT_OWNED_BY_USER';
  end if;

  v_query_text := nullif(btrim(p_query_text),'');
  if v_query_text is null
     or char_length(v_query_text) > 180 then
    raise exception using
      errcode='22023',
      message='P2D_RECOGNITION_TEXT_INVALID';
  end if;

  v_query_normalized := lower(v_query_text);
  v_locale := lower(nullif(btrim(p_locale),''));

  if v_locale is not null
     and (
       char_length(v_locale) > 35
       or v_locale !~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'
     ) then
    raise exception using
      errcode='22023',
      message='P2D_RECOGNITION_LOCALE_INVALID';
  end if;

  with candidate_rows as (
    select
      value_object.id as value_object_id,
      value_object.canonical_key,
      value_object.title,
      value_object.facet_code,
      value_object.object_kind_code,
      value_object.ontology_node_role_code,
      value_object.definition_version,
      'primary_title'::text as match_kind,
      null::uuid as alias_id,
      null::text as alias_text,
      null::text as alias_locale,
      0::integer as match_priority,
      0::integer as locale_priority
    from public.value_objects value_object
    where value_object.scope_code='actor'
      and value_object.owner_user_id=p_owner_user_id
      and value_object.owner_actor_id=p_owner_actor_id
      and value_object.status <> 'retired'
      and value_object.canonical_key is not null
      and value_object.ontology_node_role_code in (
        'root','intermediate','leaf'
      )
      and lower(btrim(value_object.title))=v_query_normalized

    union all

    select
      value_object.id,
      value_object.canonical_key,
      value_object.title,
      value_object.facet_code,
      value_object.object_kind_code,
      value_object.ontology_node_role_code,
      value_object.definition_version,
      'alias'::text,
      alias_row.id,
      alias_row.alias_text,
      alias_row.locale,
      1::integer,
      case
        when v_locale is not null
             and lower(alias_row.locale)=v_locale then 0
        when alias_row.locale is null then 1
        else 2
      end::integer
    from public.concept_aliases alias_row
    join public.value_objects value_object
      on value_object.id=alias_row.concept_id
    where alias_row.concept_type='value_object'
      and alias_row.status in ('approved','published')
      and alias_row.alias_normalized=v_query_normalized
      and value_object.scope_code='actor'
      and value_object.owner_user_id=p_owner_user_id
      and value_object.owner_actor_id=p_owner_actor_id
      and value_object.status <> 'retired'
      and value_object.canonical_key is not null
      and value_object.ontology_node_role_code in (
        'root','intermediate','leaf'
      )
  ),
  ranked as (
    select
      candidate_rows.*,
      row_number() over (
        partition by candidate_rows.value_object_id
        order by
          candidate_rows.match_priority,
          candidate_rows.locale_priority,
          candidate_rows.alias_id nulls first
      ) as value_object_rank
    from candidate_rows
  ),
  winners as (
    select *
    from ranked
    where value_object_rank=1
  )
  select
    count(*)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'valueObjectId',winners.value_object_id,
          'canonicalKey',winners.canonical_key,
          'title',winners.title,
          'facetCode',winners.facet_code,
          'objectKindCode',winners.object_kind_code,
          'nodeRoleCode',winners.ontology_node_role_code,
          'definitionVersion',winners.definition_version,
          'matchKind',winners.match_kind,
          'aliasId',winners.alias_id,
          'aliasText',winners.alias_text,
          'aliasLocale',winners.alias_locale
        )
        order by
          winners.match_priority,
          winners.locale_priority,
          lower(winners.title),
          winners.value_object_id
      ),
      '[]'::jsonb
    )
  into
    v_count,
    v_candidates
  from winners;

  if v_count=1 then
    v_resolved := (v_candidates -> 0 ->> 'valueObjectId')::uuid;
  end if;

  return jsonb_build_object(
    'ok',true,
    'contractVersion','P2D_VALUE_OBJECT_ALIAS_RECOGNITION_V1',
    'matchingMode','exact_normalized_v1',
    'queryText',v_query_text,
    'queryNormalized',v_query_normalized,
    'requestedLocale',v_locale,
    'exactMatchCount',v_count,
    'ambiguous',v_count > 1,
    'resolvedValueObjectId',v_resolved,
    'candidates',v_candidates
  );
end;
$function$;


CREATE OR REPLACE FUNCTION public.get_value_object_structure_card_v1(p_owner_user_id uuid, p_owner_actor_id uuid, p_value_object_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    and alias_row.status in ('approved', 'published');

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
      'writeEnabled', true
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


revoke all on function public.get_value_object_alias_profile_v1(
  uuid,uuid,uuid
) from public,anon,authenticated;

revoke all on function public.manage_value_object_alias_v1(
  uuid,uuid,uuid,uuid,text,jsonb
) from public,anon,authenticated;

revoke all on function public.recognize_value_object_text_v1(
  uuid,uuid,text,text
) from public,anon,authenticated;

grant execute on function public.get_value_object_alias_profile_v1(
  uuid,uuid,uuid
) to service_role;

grant execute on function public.manage_value_object_alias_v1(
  uuid,uuid,uuid,uuid,text,jsonb
) to service_role;

grant execute on function public.recognize_value_object_text_v1(
  uuid,uuid,text,text
) to service_role;

comment on function public.get_value_object_alias_profile_v1(
  uuid,uuid,uuid
) is
  'P2D owner-scoped Value Object alias profile. Aliases do not change definition versions.';

comment on function public.manage_value_object_alias_v1(
  uuid,uuid,uuid,uuid,text,jsonb
) is
  'P2D add/archive/restore owner-confirmed Value Object aliases. Hard delete disabled.';

comment on function public.recognize_value_object_text_v1(
  uuid,uuid,text,text
) is
  'P2D exact normalized owner-scoped Value Object recognition from primary titles and approved/published aliases.';

commit;
