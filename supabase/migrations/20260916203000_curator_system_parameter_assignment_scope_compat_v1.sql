-- ARCTOR_CURATOR_SYSTEM_PARAMETER_ASSIGNMENT_SCOPE_COMPAT_V1
--
-- Root cause:
-- GSR1 introduced assignment_scope_code.
-- ARCTOR_CURATOR_SYSTEM_PARAMETER_ASSIGNMENT_V1 later introduced scope_code.
--
-- The curator RPC wrote scope_code='system' while assignment_scope_code kept
-- its legacy default 'actor'. The legacy GSR1 ownership-shape CHECK therefore
-- rejected the ownerless system assignment.
--
-- This migration deliberately keeps both columns for compatibility and makes
-- them an explicit synchronized pair.
--
-- NO activity fact writes.
-- NO activity template writes.
-- NO formula writes.
-- NO historical rewrites.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $preflight$
declare
  v_mismatch_count bigint;
begin
  if to_regclass('public.value_object_parameter_assignments') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_objects') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_SCOPE_COMPAT_REQUIRED_TABLES_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'value_object_parameter_assignments'
      and column_name = 'assignment_scope_code'
  ) then
    raise exception using
      errcode = '42703',
      message = 'ARCTOR_SCOPE_COMPAT_ASSIGNMENT_SCOPE_CODE_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'value_object_parameter_assignments'
      and column_name = 'scope_code'
  ) then
    raise exception using
      errcode = '42703',
      message = 'ARCTOR_SCOPE_COMPAT_SCOPE_CODE_MISSING';
  end if;

  select count(*)
  into v_mismatch_count
  from public.value_object_parameter_assignments
  where scope_code is distinct from assignment_scope_code;

  if v_mismatch_count <> 0 then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_SCOPE_COMPAT_EXISTING_SCOPE_MISMATCH:' ||
        v_mismatch_count::text;
  end if;
end
$preflight$;

alter table public.value_object_parameter_assignments
  alter column scope_code set default 'actor',
  alter column assignment_scope_code set default 'actor';

alter table public.value_object_parameter_assignments
  drop constraint if exists
    value_object_parameter_assignments_scope_compat_v1_check;

alter table public.value_object_parameter_assignments
  add constraint
    value_object_parameter_assignments_scope_compat_v1_check
  check (
    scope_code = assignment_scope_code
  );

comment on constraint
  value_object_parameter_assignments_scope_compat_v1_check
on public.value_object_parameter_assignments is
  'GSR1 assignment_scope_code and curator scope_code are compatibility mirrors and must remain identical.';

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
      message =
        'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_PARAMETER_NOT_ACTIVE_SYSTEM';
  end if;

  -- Validate the complete mapping before any INSERT.
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
        message =
          'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_VALUE_OBJECT_NOT_FOUND';
    end if;

    if v_value_object.scope_code is distinct from 'global'
       or v_value_object.origin_type_code is distinct from 'system_model'
       or v_value_object.ontology_node_role_code is distinct from 'leaf' then
      raise exception using
        errcode = '23514',
        message =
          'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_VALUE_OBJECT_NOT_SYSTEM_LEAF';
    end if;

    if exists (
      select 1
      from public.value_object_parameter_assignments assignment
      where assignment.value_object_id = v_value_object_id
        and assignment.parameter_definition_id =
              p_parameter_definition_id
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
        message =
          'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_INACTIVE_EXISTS';
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
      and assignment.parameter_definition_id =
            p_parameter_definition_id
      and assignment.status = 'active'
    limit 1;

    if found then

      if v_existing.scope_code <> 'system'
         or v_existing.assignment_scope_code <> 'system' then
        raise exception using
          errcode = '23514',
          message =
            'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_SCOPE_CONFLICT';
      end if;

      v_assignment_ids :=
        v_assignment_ids ||
        jsonb_build_array(v_existing.id);

      v_value_object_ids :=
        v_value_object_ids ||
        jsonb_build_array(v_value_object_id);

      continue;
    end if;

    insert into public.value_object_parameter_assignments (
      value_object_id,
      parameter_definition_id,

      -- Both generations of the assignment contract are deliberately written.
      assignment_scope_code,
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
        'contract',
        'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_V1',

        'scopeCompatibilityContract',
        'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_SCOPE_COMPAT_V1',

        'provenance',
        'curator_action',

        'curatorAppUserId',
        p_curator_app_user_id,

        'curatorAdminId',
        p_curator_admin_id,

        'curatorRole',
        p_curator_role,

        'materializationKey',
        p_idempotency_key
      )
    )
    returning *
    into v_assignment;

    v_rows_written := v_rows_written + 1;

    v_assignment_ids :=
      v_assignment_ids ||
      jsonb_build_array(v_assignment.id);

    v_value_object_ids :=
      v_value_object_ids ||
      jsonb_build_array(v_value_object_id);
  end loop;

  return jsonb_build_object(
    'contract',
    'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_V1',

    'scopeCompatibilityContract',
    'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_SCOPE_COMPAT_V1',

    'parameterDefinitionId',
    p_parameter_definition_id,

    'valueObjectIds',
    v_value_object_ids,

    'assignmentIds',
    v_assignment_ids,

    'rowsWritten',
    v_rows_written,

    'idempotentReplay',
    v_rows_written = 0
  );
end
$function$;

revoke all
on function public.save_system_value_object_parameter_assignment_set_v1(
  uuid,
  uuid[],
  uuid,
  uuid,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.save_system_value_object_parameter_assignment_set_v1(
  uuid,
  uuid[],
  uuid,
  uuid,
  text,
  text
)
to service_role;

comment on function public.save_system_value_object_parameter_assignment_set_v1(
  uuid,
  uuid[],
  uuid,
  uuid,
  text,
  text
) is
  'Atomically materializes curator-confirmed system parameter -> global system leaf assignments while keeping GSR1 assignment_scope_code and curator scope_code synchronized.';

commit;

notify pgrst, 'reload schema';

select jsonb_pretty(
  jsonb_build_object(
    'contract',
    'ARCTOR_SYSTEM_PARAMETER_ASSIGNMENT_SCOPE_COMPAT_V1',

    'scopeMismatchCount',
      (
        select count(*)
        from public.value_object_parameter_assignments
        where scope_code is distinct from assignment_scope_code
      ),

    'actorAssignments',
      (
        select count(*)
        from public.value_object_parameter_assignments
        where scope_code = 'actor'
          and assignment_scope_code = 'actor'
      ),

    'systemAssignments',
      (
        select count(*)
        from public.value_object_parameter_assignments
        where scope_code = 'system'
          and assignment_scope_code = 'system'
      ),

    'compatConstraintPresent',
      exists (
        select 1
        from pg_constraint
        where conrelid =
          'public.value_object_parameter_assignments'::regclass
          and conname =
            'value_object_parameter_assignments_scope_compat_v1_check'
      ),

    'rpcPresent',
      to_regprocedure(
        'public.save_system_value_object_parameter_assignment_set_v1(uuid,uuid[],uuid,uuid,text,text)'
      ) is not null
  )
) as arctor_scope_compat_postcheck;