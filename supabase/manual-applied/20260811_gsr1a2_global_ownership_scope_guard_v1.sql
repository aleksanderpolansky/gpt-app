/*
ARCTor.app — GSR-1A2
Global Value Object ownership-scope guard v1
Manual Supabase SQL Editor migration.

Purpose:
- preserve all existing actor-owned ownership enforcement;
- add a second valid ownership shape for canonical global system ontology rows;
- do not create any Global Seed objects yet.

Expected baseline:
- GSR-1A already applied;
- global_objects = 0;
- system_assignments = 0.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $preflight$
begin
  if to_regprocedure('public.enforce_value_object_actor_ownership_v2()') is null then
    raise exception using
      errcode = '42883',
      message = 'GSR1A2_OWNERSHIP_GUARD_REQUIRED';
  end if;

  if (
    select count(*)
    from public.value_objects
    where scope_code = 'global'
      and canonical_key is not null
  ) <> 0 then
    raise exception using
      errcode = '23514',
      message = 'GSR1A2_GLOBAL_OBJECTS_ALREADY_PRESENT';
  end if;

  if (
    select count(*)
    from public.value_object_parameter_assignments
    where assignment_scope_code = 'system'
  ) <> 0 then
    raise exception using
      errcode = '23514',
      message = 'GSR1A2_SYSTEM_ASSIGNMENTS_ALREADY_PRESENT';
  end if;
end;
$preflight$;

create or replace function public.enforce_value_object_actor_ownership_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  /*
  GLOBAL SYSTEM ONTOLOGY SHAPE

  A reusable global Value Object is not owned by a user/actor.
  This path is intentionally narrow: only canonical ontology_v1 rows created
  by the system model may use owner_user_id/owner_actor_id = NULL.
  */
  if new.scope_code = 'global' then
    if new.owner_user_id is not null
       or new.owner_actor_id is not null
       or new.actor_id is not null
       or new.app_user_id is not null
       or new.created_by_actor_id is not null then
      raise exception using
        errcode = '23514',
        message = 'GSR1_GLOBAL_VALUE_OBJECT_MUST_BE_OWNERLESS';
    end if;

    if new.branch_type_code is distinct from 'ontology_v1'
       or nullif(btrim(new.canonical_key), '') is null
       or new.origin_type_code is distinct from 'system_model'
       or new.visibility_code is distinct from 'public'
       or new.privacy_class_code is distinct from 'public_ontology' then
      raise exception using
        errcode = '23514',
        message = 'GSR1_GLOBAL_VALUE_OBJECT_SYSTEM_SHAPE_REQUIRED';
    end if;

    return new;
  end if;

  /*
  EXISTING ACTOR / LEGACY CONTRACT

  This is the original REALITY_V2 behavior. Keeping scope_code NULL here is
  deliberate because older authoring paths may not populate the P1 scope field.
  */
  if new.owner_user_id is null or new.owner_actor_id is null then
    raise exception using
      errcode = '23514',
      message = 'REALITY_V2_VALUE_OBJECT_OWNER_PAIR_REQUIRED';
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
      message = 'REALITY_V2_VALUE_OBJECT_ACTOR_NOT_OWNED_BY_USER';
  end if;

  return new;
end;
$function$;

do $acceptance$
declare
  v_actor_rows integer;
  v_bad_actor_rows integer;
begin
  if to_regprocedure('public.enforce_value_object_actor_ownership_v2()') is null then
    raise exception using
      errcode = '42883',
      message = 'GSR1A2_OWNERSHIP_GUARD_MISSING_AFTER_WRITE';
  end if;

  select count(*)
  into v_actor_rows
  from public.value_objects
  where scope_code = 'actor';

  select count(*)
  into v_bad_actor_rows
  from public.value_objects
  where scope_code = 'actor'
    and (
      owner_user_id is null
      or owner_actor_id is null
    );

  if v_bad_actor_rows <> 0 then
    raise exception using
      errcode = '23514',
      message = 'GSR1A2_EXISTING_ACTOR_OWNER_PAIR_VIOLATION';
  end if;

  if exists (
    select 1
    from public.value_objects
    where scope_code = 'global'
      and canonical_key is not null
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1A2_UNEXPECTED_GLOBAL_WRITE';
  end if;
end;
$acceptance$;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'check', 'ARCTOR_GSR1A2_GLOBAL_OWNERSHIP_SCOPE_GUARD_V1',
    'global_objects',
      (
        select count(*)
        from public.value_objects
        where scope_code = 'global'
          and canonical_key is not null
      ),
    'actor_objects',
      (
        select count(*)
        from public.value_objects
        where scope_code = 'actor'
      ),
    'actor_objects_missing_owner_pair',
      (
        select count(*)
        from public.value_objects
        where scope_code = 'actor'
          and (
            owner_user_id is null
            or owner_actor_id is null
          )
      ),
    'system_assignments',
      (
        select count(*)
        from public.value_object_parameter_assignments
        where assignment_scope_code = 'system'
      ),
    'ownership_guard_definition',
      pg_get_functiondef(
        'public.enforce_value_object_actor_ownership_v2()'::regprocedure
      )
  )
) as gsr1a2_result;
