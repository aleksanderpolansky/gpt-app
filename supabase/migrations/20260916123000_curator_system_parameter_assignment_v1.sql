-- ARCTOR_CURATOR_SYSTEM_PARAMETER_ASSIGNMENT_V1
--
-- Purpose:
-- 1. Allow a parameter assignment to address a global system-model ontology leaf.
-- 2. Preserve the existing actor-owned assignment path.
-- 3. Provide one service-role-only atomic RPC for a curator-confirmed
--    parameter -> 1..N system observation-object mapping.
--
-- This migration does NOT write activity facts, formula results, templates,
-- formula versions, relations, or recalculation jobs.

begin;

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null
     or to_regclass('public.app_users') is null
     or to_regclass('public.actors') is null
     or to_regclass('public.actor_public_profiles') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_REQUIRED_TABLES_MISSING';
  end if;
end
$preflight$;

alter table public.value_object_parameter_assignments
  alter column owner_user_id drop not null,
  alter column owner_actor_id drop not null;

alter table public.value_object_parameter_assignments
  add column if not exists scope_code text;

update public.value_object_parameter_assignments
set scope_code = 'actor'
where scope_code is null;

alter table public.value_object_parameter_assignments
  alter column scope_code set default 'actor',
  alter column scope_code set not null;

alter table public.value_object_parameter_assignments
  drop constraint if exists value_object_parameter_assignments_scope_v1_check,
  drop constraint if exists value_object_parameter_assignments_owner_shape_v1_check;

alter table public.value_object_parameter_assignments
  add constraint value_object_parameter_assignments_scope_v1_check
    check (scope_code in ('actor', 'system')),
  add constraint value_object_parameter_assignments_owner_shape_v1_check
    check (
      (
        scope_code = 'actor'
        and owner_user_id is not null
        and owner_actor_id is not null
      )
      or
      (
        scope_code = 'system'
        and owner_user_id is null
        and owner_actor_id is null
        and created_by_actor_id is null
      )
    );

comment on column public.value_object_parameter_assignments.scope_code is
  'Assignment ownership: actor for actor-owned observation objects, system for ownerless global system-model ontology leaves.';

create or replace function public.enforce_value_object_parameter_assignment_v4()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_value_object public.value_objects%rowtype;
  v_definition public.value_object_parameter_definitions%rowtype;
  v_is_leaf boolean;
begin
  select *
  into v_value_object
  from public.value_objects
  where id = new.value_object_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'P7_PARAMETER_ASSIGNMENT_VALUE_OBJECT_NOT_FOUND';
  end if;

  v_is_leaf :=
    v_value_object.ontology_node_role_code = 'leaf'
    or (
      v_value_object.ontology_node_role_code is null
      and v_value_object.node_role_code = 'activity_leaf'
      and v_value_object.object_kind = 'activity_pattern'
      and v_value_object.parent_value_object_id is not null
    );

  if not v_is_leaf then
    raise exception using
      errcode = '23514',
      message = 'P7_PARAMETER_ASSIGNMENT_REQUIRES_SEMANTIC_LEAF';
  end if;

  select *
  into v_definition
  from public.value_object_parameter_definitions
  where id = new.parameter_definition_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'P7_PARAMETER_ASSIGNMENT_DEFINITION_NOT_FOUND';
  end if;

  if v_definition.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'P7_PARAMETER_ASSIGNMENT_DEFINITION_NOT_ACTIVE';
  end if;

  if new.scope_code = 'system' then
    if v_value_object.scope_code is distinct from 'global'
       or v_value_object.origin_type_code is distinct from 'system_model'
       or v_value_object.ontology_node_role_code is distinct from 'leaf' then
      raise exception using
        errcode = '23514',
        message = 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_REQUIRES_GLOBAL_SYSTEM_LEAF';
    end if;

    if v_definition.scope_code is distinct from 'system' then
      raise exception using
        errcode = '23514',
        message = 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_REQUIRES_SYSTEM_PARAMETER';
    end if;

    if new.owner_user_id is not null
       or new.owner_actor_id is not null
       or new.created_by_actor_id is not null then
      raise exception using
        errcode = '23514',
        message = 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_OWNER_MUST_BE_NULL';
    end if;

    return new;
  end if;

  if new.scope_code is distinct from 'actor' then
    raise exception using
      errcode = '23514',
      message = 'P7_PARAMETER_ASSIGNMENT_SCOPE_INVALID';
  end if;

  if v_value_object.owner_user_id is distinct from new.owner_user_id
     or v_value_object.owner_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P7_PARAMETER_ASSIGNMENT_VALUE_OBJECT_OWNER_MISMATCH';
  end if;

  if v_definition.scope_code = 'actor'
     and (
       v_definition.owner_user_id is distinct from new.owner_user_id
       or v_definition.owner_actor_id is distinct from new.owner_actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'P7_PARAMETER_ASSIGNMENT_DEFINITION_OWNER_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.owner_user_id = new.owner_user_id
      and profile.actor_id = new.owner_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'P7_PARAMETER_ASSIGNMENT_ACTOR_NOT_OWNED_BY_USER';
  end if;

  if new.created_by_actor_id is not null
     and not exists (
       select 1
       from public.actor_public_profiles profile
       where profile.owner_user_id = new.owner_user_id
         and profile.actor_id = new.created_by_actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'P7_PARAMETER_ASSIGNMENT_CREATOR_NOT_OWNED_BY_USER';
  end if;

  return new;
end
$function$;

drop trigger if exists value_object_parameter_assignments_guard_v3_trg
  on public.value_object_parameter_assignments;
drop trigger if exists value_object_parameter_assignments_guard_v4_trg
  on public.value_object_parameter_assignments;

create trigger value_object_parameter_assignments_guard_v4_trg
before insert or update
on public.value_object_parameter_assignments
for each row
execute function public.enforce_value_object_parameter_assignment_v4();

create or replace function public.save_system_value_object_parameter_assignment_set_v1(
  p_parameter_definition_id uuid,
  p_value_object_ids uuid[],
  p_curator_app_user_id uuid,
  p_curator_admin_id uuid,
  p_curator_role text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_definition public.value_object_parameter_definitions%rowtype;
  v_value_object public.value_objects%rowtype;
  v_existing public.value_object_parameter_assignments%rowtype;
  v_assignment public.value_object_parameter_assignments%rowtype;
  v_value_object_id uuid;
  v_assignment_ids jsonb := '[]'::jsonb;
  v_value_object_ids jsonb := '[]'::jsonb;
  v_rows_written integer := 0;
begin
  if p_parameter_definition_id is null
     or p_value_object_ids is null
     or cardinality(p_value_object_ids) < 1
     or p_curator_app_user_id is null
     or p_curator_admin_id is null
     or nullif(btrim(p_curator_role), '') is null
     or nullif(btrim(p_idempotency_key), '') is null
     or char_length(p_idempotency_key) not between 8 and 200 then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_ARGUMENTS_INVALID';
  end if;

  select *
  into v_definition
  from public.value_object_parameter_definitions
  where id = p_parameter_definition_id
  for share;

  if not found
     or v_definition.scope_code <> 'system'
     or v_definition.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_PARAMETER_NOT_ACTIVE_SYSTEM';
  end if;

  -- Validate the complete set before the first INSERT.
  for v_value_object_id in
    select distinct item.value_object_id
    from unnest(p_value_object_ids) as item(value_object_id)
  loop
    select *
    into v_value_object
    from public.value_objects
    where id = v_value_object_id
    for share;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_VALUE_OBJECT_NOT_FOUND';
    end if;

    if v_value_object.scope_code is distinct from 'global'
       or v_value_object.origin_type_code is distinct from 'system_model'
       or v_value_object.ontology_node_role_code is distinct from 'leaf' then
      raise exception using
        errcode = '23514',
        message = 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_VALUE_OBJECT_NOT_SYSTEM_LEAF';
    end if;

    if exists (
      select 1
      from public.value_object_parameter_assignments assignment
      where assignment.value_object_id = v_value_object_id
        and assignment.parameter_definition_id = p_parameter_definition_id
        and assignment.status in ('inactive', 'retired')
        and not exists (
          select 1
          from public.value_object_parameter_assignments active_assignment
          where active_assignment.value_object_id = v_value_object_id
            and active_assignment.parameter_definition_id =
              p_parameter_definition_id
            and active_assignment.status = 'active'
        )
    ) then
      raise exception using
        errcode = '23514',
        message = 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_INACTIVE_EXISTS';
    end if;
  end loop;

  for v_value_object_id in
    select distinct item.value_object_id
    from unnest(p_value_object_ids) as item(value_object_id)
    order by item.value_object_id
  loop
    select *
    into v_existing
    from public.value_object_parameter_assignments assignment
    where assignment.value_object_id = v_value_object_id
      and assignment.parameter_definition_id = p_parameter_definition_id
      and assignment.status = 'active'
    limit 1;

    if found then
      if v_existing.scope_code <> 'system' then
        raise exception using
          errcode = '23514',
          message = 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_SCOPE_CONFLICT';
      end if;

      v_assignment_ids :=
        v_assignment_ids || jsonb_build_array(v_existing.id);
      v_value_object_ids :=
        v_value_object_ids || jsonb_build_array(v_value_object_id);
      continue;
    end if;

    insert into public.value_object_parameter_assignments (
      value_object_id,
      parameter_definition_id,
      scope_code,
      owner_user_id,
      owner_actor_id,
      created_by_actor_id,
      status,
      display_order,
      idempotency_key,
      metadata_json
    )
    values (
      v_value_object_id,
      p_parameter_definition_id,
      'system',
      null,
      null,
      null,
      'active',
      1000,
      left(
        p_idempotency_key || ':' ||
        replace(v_value_object_id::text, '-', ''),
        200
      ),
      jsonb_build_object(
        'contract', 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_V1',
        'provenance', 'curator_action',
        'curatorAppUserId', p_curator_app_user_id,
        'curatorAdminId', p_curator_admin_id,
        'curatorRole', p_curator_role,
        'materializationKey', p_idempotency_key
      )
    )
    returning * into v_assignment;

    v_rows_written := v_rows_written + 1;
    v_assignment_ids :=
      v_assignment_ids || jsonb_build_array(v_assignment.id);
    v_value_object_ids :=
      v_value_object_ids || jsonb_build_array(v_value_object_id);
  end loop;

  return jsonb_build_object(
    'contract', 'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_V1',
    'parameterDefinitionId', p_parameter_definition_id,
    'valueObjectIds', v_value_object_ids,
    'assignmentIds', v_assignment_ids,
    'rowsWritten', v_rows_written,
    'idempotentReplay', v_rows_written = 0
  );
end
$function$;

revoke all
on function public.save_system_value_object_parameter_assignment_set_v1(
  uuid, uuid[], uuid, uuid, text, text
)
from public, anon, authenticated;

grant execute
on function public.save_system_value_object_parameter_assignment_set_v1(
  uuid, uuid[], uuid, uuid, text, text
)
to service_role;

comment on function public.save_system_value_object_parameter_assignment_set_v1(
  uuid, uuid[], uuid, uuid, text, text
) is
  'Atomically materializes curator-confirmed system parameter -> global system leaf assignments. No fact/template/formula writes.';

commit;
