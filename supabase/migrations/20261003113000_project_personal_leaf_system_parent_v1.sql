begin;

-- PP2: personal actor leaf -> active global system-model intermediate parent.
-- No new table and no new domain entity.

do $patch$
declare
  v_def text;
  v_next text;
begin
  select pg_get_functiondef(
    'public.enforce_value_object_ontology_p1c()'::regprocedure
  )
  into v_def;

  if v_def is null then
    raise exception 'PP2_SYSTEM_PARENT_GUARD_SOURCE_NOT_FOUND';
  end if;

  if position('PP2_ACTOR_LEAF_UNDER_SYSTEM_INTERMEDIATE_V1' in v_def) = 0 then
    v_next := regexp_replace(
      v_def,
      $rx$if new\.scope_code is distinct from v_parent\.scope_code[[:space:]]+or new\.owner_actor_id is distinct from v_parent\.owner_actor_id[[:space:]]+or new\.owner_user_id is distinct from v_parent\.owner_user_id then[[:space:]]+raise exception using[[:space:]]+errcode = '42501',[[:space:]]+message = 'P1C_PARENT_SCOPE_OWNER_MISMATCH';[[:space:]]+end if;$rx$,
      $replacement$if not (
      (
        new.scope_code is not distinct from v_parent.scope_code
        and new.owner_actor_id is not distinct from v_parent.owner_actor_id
        and new.owner_user_id is not distinct from v_parent.owner_user_id
      )
      or (
        /* PP2_ACTOR_LEAF_UNDER_SYSTEM_INTERMEDIATE_V1 */
        new.scope_code = 'actor'
        and new.ontology_node_role_code = 'leaf'
        and new.owner_actor_id is not null
        and new.owner_user_id is not null
        and v_parent.scope_code = 'global'
        and v_parent.origin_type_code = 'system_model'
        and v_parent.ontology_node_role_code = 'intermediate'
        and v_parent.status = 'active'
        and v_parent.owner_actor_id is null
        and v_parent.owner_user_id is null
      )
    ) then
      raise exception using
        errcode = '42501',
        message = 'P1C_PARENT_SCOPE_OWNER_MISMATCH';
    end if;$replacement$,
      'n'
    );

    if v_next = v_def then
      raise exception 'PP2_SYSTEM_PARENT_GUARD_PATCH_ANCHOR_NOT_FOUND';
    end if;

    execute v_next;
  end if;
end;
$patch$;

do $patch$
declare
  v_def text;
  v_next text;
begin
  select pg_get_functiondef(
    'public.create_value_object_ontology_v1(uuid,uuid,uuid,jsonb,text,text)'::regprocedure
  )
  into v_def;

  if v_def is null then
    raise exception 'PP2_SYSTEM_PARENT_CREATE_SOURCE_NOT_FOUND';
  end if;

  if position('PP2_ALLOW_GLOBAL_SYSTEM_PARENT_V1' in v_def) = 0 then
    v_next := regexp_replace(
      v_def,
      $rx$if v_parent\.owner_user_id is distinct from p_owner_user_id[[:space:]]+or v_parent\.owner_actor_id is distinct from p_owner_actor_id then[[:space:]]+raise exception using[[:space:]]+errcode = '42501',[[:space:]]+message = 'P1C_CREATE_PARENT_ACCESS_DENIED';[[:space:]]+end if;$rx$,
      $replacement$if not (
      (
        v_parent.owner_user_id is not distinct from p_owner_user_id
        and v_parent.owner_actor_id is not distinct from p_owner_actor_id
      )
      or (
        /* PP2_ALLOW_GLOBAL_SYSTEM_PARENT_V1 */
        coalesce((p_payload ->> 'allowGlobalSystemParent')::boolean, false)
        and v_node_role_code = 'leaf'
        and v_parent.scope_code = 'global'
        and v_parent.origin_type_code = 'system_model'
        and v_parent.ontology_node_role_code = 'intermediate'
        and v_parent.status = 'active'
        and v_parent.owner_user_id is null
        and v_parent.owner_actor_id is null
      )
    ) then
      raise exception using
        errcode = '42501',
        message = 'P1C_CREATE_PARENT_ACCESS_DENIED';
    end if;$replacement$,
      'n'
    );

    if v_next = v_def then
      raise exception 'PP2_SYSTEM_PARENT_CREATE_PATCH_ANCHOR_NOT_FOUND';
    end if;

    execute v_next;
  end if;
end;
$patch$;

comment on function public.create_value_object_ontology_v1(
  uuid, uuid, uuid, jsonb, text, text
) is
  'P1C actor-scoped ontology creation. PP2 additionally allows an actor leaf under an active global system-model intermediate parent only when allowGlobalSystemParent=true.';

commit;
