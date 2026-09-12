begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function public.guard_system_value_object_relation_v1()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_source record;
  v_target record;
  v_type record;
begin

  select
    id,
    facet_code,
    node_role_code,
    ontology_node_role_code,
    owner_user_id,
    owner_actor_id,
    status
  into v_source
  from public.value_objects
  where id = new.source_value_object_id;

  select
    id,
    facet_code,
    node_role_code,
    ontology_node_role_code,
    owner_user_id,
    owner_actor_id,
    status
  into v_target
  from public.value_objects
  where id = new.target_value_object_id;

  select *
  into v_type
  from public.value_object_relation_types
  where relation_type_code = new.relation_type_code;

  if v_source.id is null or v_target.id is null then
    raise exception 'SYSTEM_RELATION_ENDPOINT_NOT_FOUND';
  end if;

  if
    v_source.owner_user_id is not null
    or v_source.owner_actor_id is not null
    or v_target.owner_user_id is not null
    or v_target.owner_actor_id is not null
  then
    raise exception 'SYSTEM_RELATION_REQUIRES_GLOBAL_ENDPOINTS';
  end if;

  if
    v_source.status <> 'active'
    or v_target.status <> 'active'
  then
    raise exception 'SYSTEM_RELATION_ENDPOINT_INACTIVE';
  end if;

  if
    v_type.relation_type_code is null
    or v_type.status <> 'active'
    or coalesce(v_type.canonical_write_policy_code, 'disabled') <> 'enabled'
  then
    raise exception 'SYSTEM_RELATION_TYPE_NOT_WRITABLE';
  end if;

  if
    not (v_source.facet_code = any(v_type.allowed_source_facet_codes))
    or not (v_target.facet_code = any(v_type.allowed_target_facet_codes))
  then
    raise exception 'SYSTEM_RELATION_FACET_GUARD_REJECTED';
  end if;

  if
    v_source.ontology_node_role_code <> 'leaf'
    or v_target.ontology_node_role_code <> 'leaf'
  then
    raise exception 'SYSTEM_RELATION_NODE_ROLE_GUARD_REJECTED';
  end if;

  if
    not (
      v_source.ontology_node_role_code =
      any(v_type.allowed_source_node_roles)
    )
    or not (
      v_target.ontology_node_role_code =
      any(v_type.allowed_target_node_roles)
    )
  then
    raise exception 'SYSTEM_RELATION_NODE_ROLE_GUARD_REJECTED';
  end if;

  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

commit;
