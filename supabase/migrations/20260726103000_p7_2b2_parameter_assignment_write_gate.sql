-- ARCTOR.app
-- P7.2B2 parameter assignment write gate
-- Additive migration: guarded idempotent parameter assignment writes only.
-- No target, fact, measure, calendar or activity-container writes.

begin;

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.actor_public_profiles') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null then
    raise exception using
      errcode = '42P01',
      message = 'P7_2B2_REQUIRED_TABLES_MISSING';
  end if;

  if to_regclass(
    'public.value_object_parameter_assignment_write_requests'
  ) is not null then
    raise exception using
      errcode = '42P07',
      message = 'P7_2B2_WRITE_REQUEST_TABLE_ALREADY_EXISTS';
  end if;
end;
$preflight$;

create table public.value_object_parameter_assignment_write_requests (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  value_object_id uuid not null
    references public.value_objects(id)
    on delete cascade,

  mode text not null,
  idempotency_key text not null,
  request_hash text not null,

  result_definition_id uuid
    references public.value_object_parameter_definitions(id)
    on delete set null,

  result_assignment_id uuid
    references public.value_object_parameter_assignments(id)
    on delete set null,

  response_json jsonb not null,
  created_at timestamptz not null default now(),

  constraint value_object_parameter_assignment_write_requests_mode_check
    check (
      mode in (
        'assign_existing',
        'create_custom_and_assign',
        'deactivate',
        'reactivate'
      )
    ),

  constraint value_object_parameter_assignment_write_requests_key_check
    check (char_length(idempotency_key) between 8 and 200),

  constraint value_object_parameter_assignment_write_requests_hash_check
    check (request_hash ~ '^[A-F0-9]{64}$'),

  constraint value_object_parameter_assignment_write_requests_response_check
    check (jsonb_typeof(response_json) = 'object'),

  constraint value_object_parameter_assignment_write_requests_idem_key
    unique (owner_user_id, owner_actor_id, idempotency_key)
);

create index value_object_parameter_assignment_write_requests_leaf_idx
  on public.value_object_parameter_assignment_write_requests(
    value_object_id,
    created_at desc
  );

alter table public.value_object_parameter_assignment_write_requests
  enable row level security;

revoke all
on public.value_object_parameter_assignment_write_requests
from public, anon, authenticated;

grant select, insert
on public.value_object_parameter_assignment_write_requests
to service_role;

create policy value_object_parameter_assignment_write_requests_no_direct_v1
on public.value_object_parameter_assignment_write_requests
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.save_value_object_parameter_assignment_v2(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_value_object_id uuid,
  p_mode text,
  p_payload jsonb,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_existing_request
    public.value_object_parameter_assignment_write_requests%rowtype;
  v_value_object public.value_objects%rowtype;
  v_definition public.value_object_parameter_definitions%rowtype;
  v_assignment public.value_object_parameter_assignments%rowtype;

  v_parameter_definition_id uuid;
  v_assignment_id uuid;
  v_display_order integer;
  v_parameter_code text;
  v_title text;
  v_description text;
  v_dimension_code text;
  v_value_type_code text;
  v_canonical_unit_code text;
  v_allowed_unit_codes jsonb;
  v_aggregation_method_code text;
  v_default_window_code text;
  v_allow_negative boolean;
  v_validation_json jsonb;

  v_rows_written integer := 0;
  v_state_already_satisfied boolean := false;
  v_response jsonb;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_created_by_actor_id is null
     or p_value_object_id is null then
    raise exception using
      errcode = '22023',
      message = 'P7_2B2_REQUIRED_IDENTIFIERS_MISSING';
  end if;

  if p_mode not in (
    'assign_existing',
    'create_custom_and_assign',
    'deactivate',
    'reactivate'
  ) then
    raise exception using
      errcode = '22023',
      message = 'P7_2B2_MODE_INVALID';
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'P7_2B2_PAYLOAD_MUST_BE_OBJECT';
  end if;

  if nullif(btrim(p_idempotency_key), '') is null
     or char_length(p_idempotency_key) not between 8 and 200
     or nullif(btrim(p_request_hash), '') is null
     or p_request_hash !~ '^[A-F0-9]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'P7_2B2_IDEMPOTENCY_INVALID';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.owner_user_id = p_owner_user_id
      and profile.actor_id = p_owner_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'P7_2B2_ACTOR_NOT_OWNED_BY_USER';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    where profile.owner_user_id = p_owner_user_id
      and profile.actor_id = p_created_by_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'P7_2B2_CREATOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_existing_request
  from public.value_object_parameter_assignment_write_requests request
  where request.owner_user_id = p_owner_user_id
    and request.owner_actor_id = p_owner_actor_id
    and request.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing_request.mode is distinct from p_mode
       or v_existing_request.value_object_id
            is distinct from p_value_object_id
       or v_existing_request.request_hash is distinct from p_request_hash then
      raise exception using
        errcode = '23505',
        message = 'P7_2B2_IDEMPOTENCY_PAYLOAD_MISMATCH';
    end if;

    return jsonb_set(
      v_existing_request.response_json,
      '{idempotentReplay}',
      'true'::jsonb,
      true
    );
  end if;

  select *
  into v_value_object
  from public.value_objects
  where id = p_value_object_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'P7_2B2_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_value_object.owner_user_id is distinct from p_owner_user_id
     or v_value_object.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P7_2B2_VALUE_OBJECT_OWNER_MISMATCH';
  end if;

  if v_value_object.node_role_code is distinct from 'activity_leaf'
     or v_value_object.object_kind is distinct from 'activity_pattern'
     or v_value_object.parent_value_object_id is null then
    raise exception using
      errcode = '23514',
      message = 'P7_2B2_ASSIGNMENT_REQUIRES_ACTIVITY_LEAF';
  end if;

  if p_mode = 'assign_existing' then
    v_parameter_definition_id :=
      nullif(p_payload ->> 'parameterDefinitionId', '')::uuid;
    v_display_order :=
      coalesce(nullif(p_payload ->> 'displayOrder', '')::integer, 1000);

    if v_parameter_definition_id is null or v_display_order <= 0 then
      raise exception using
        errcode = '22023',
        message = 'P7_2B2_ASSIGN_EXISTING_PAYLOAD_INVALID';
    end if;

    select *
    into v_definition
    from public.value_object_parameter_definitions definition
    where definition.id = v_parameter_definition_id
    for share;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'P7_2B2_PARAMETER_DEFINITION_NOT_FOUND';
    end if;

    if v_definition.status <> 'active' then
      raise exception using
        errcode = '23514',
        message = 'P7_2B2_PARAMETER_DEFINITION_NOT_ACTIVE';
    end if;

    if v_definition.scope_code = 'actor'
       and (
         v_definition.owner_user_id is distinct from p_owner_user_id
         or v_definition.owner_actor_id is distinct from p_owner_actor_id
       ) then
      raise exception using
        errcode = '42501',
        message = 'P7_2B2_PARAMETER_DEFINITION_OWNER_MISMATCH';
    end if;

    if exists (
      select 1
      from public.value_object_parameter_assignments assignment
      where assignment.value_object_id = p_value_object_id
        and assignment.parameter_definition_id = v_parameter_definition_id
        and assignment.status = 'active'
    ) then
      raise exception using
        errcode = '23505',
        message = 'P7_2B2_DUPLICATE_ACTIVE_ASSIGNMENT';
    end if;

    if exists (
      select 1
      from public.value_object_parameter_assignments assignment
      where assignment.value_object_id = p_value_object_id
        and assignment.parameter_definition_id = v_parameter_definition_id
        and assignment.status in ('inactive', 'retired')
    ) then
      raise exception using
        errcode = '23514',
        message = 'P7_2B2_ASSIGNMENT_EXISTS_USE_REACTIVATE';
    end if;

    insert into public.value_object_parameter_assignments (
      value_object_id,
      parameter_definition_id,
      owner_user_id,
      owner_actor_id,
      created_by_actor_id,
      status,
      display_order,
      idempotency_key,
      metadata_json
    )
    values (
      p_value_object_id,
      v_parameter_definition_id,
      p_owner_user_id,
      p_owner_actor_id,
      p_created_by_actor_id,
      'active',
      v_display_order,
      p_idempotency_key,
      jsonb_build_object(
        'writeGate', 'p7-2b2-parameter-assignment-v1',
        'requestHash', p_request_hash
      )
    )
    returning * into v_assignment;

    v_rows_written := 1;

  elsif p_mode = 'create_custom_and_assign' then
    v_title := nullif(btrim(p_payload #>> '{definition,title}'), '');
    v_description :=
      nullif(btrim(p_payload #>> '{definition,description}'), '');
    v_dimension_code :=
      nullif(btrim(p_payload #>> '{definition,dimensionCode}'), '');
    v_value_type_code :=
      nullif(btrim(p_payload #>> '{definition,valueTypeCode}'), '');
    v_canonical_unit_code :=
      nullif(btrim(p_payload #>> '{definition,canonicalUnitCode}'), '');
    v_allowed_unit_codes :=
      coalesce(p_payload #> '{definition,allowedUnitCodes}', '[]'::jsonb);
    v_aggregation_method_code :=
      nullif(
        btrim(p_payload #>> '{definition,aggregationMethodCode}'),
        ''
      );
    v_default_window_code :=
      nullif(btrim(p_payload #>> '{definition,defaultWindowCode}'), '');
    v_allow_negative :=
      coalesce(
        nullif(p_payload #>> '{definition,allowNegative}', '')::boolean,
        false
      );
    v_validation_json :=
      coalesce(p_payload #> '{definition,validation}', '{}'::jsonb);
    v_display_order :=
      coalesce(nullif(p_payload ->> 'displayOrder', '')::integer, 1000);

    if v_title is null
       or v_dimension_code is null
       or v_value_type_code is null
       or v_canonical_unit_code is null
       or v_aggregation_method_code is null
       or v_default_window_code is null
       or v_display_order <= 0
       or jsonb_typeof(v_allowed_unit_codes) <> 'array'
       or jsonb_typeof(v_validation_json) <> 'object' then
      raise exception using
        errcode = '22023',
        message = 'P7_2B2_CUSTOM_PARAMETER_PAYLOAD_INVALID';
    end if;

    v_parameter_code :=
      'custom_' ||
      substring(
        replace(gen_random_uuid()::text, '-', '')
        from 1 for 24
      );

    insert into public.value_object_parameter_definitions (
      scope_code,
      parameter_code,
      owner_user_id,
      owner_actor_id,
      created_by_actor_id,
      title,
      description,
      dimension_code,
      value_type_code,
      canonical_unit_code,
      allowed_unit_codes,
      aggregation_method_code,
      default_window_code,
      allow_negative,
      validation_json,
      source_version,
      status,
      metadata_json
    )
    values (
      'actor',
      v_parameter_code,
      p_owner_user_id,
      p_owner_actor_id,
      p_created_by_actor_id,
      v_title,
      v_description,
      v_dimension_code,
      v_value_type_code,
      v_canonical_unit_code,
      v_allowed_unit_codes,
      v_aggregation_method_code,
      v_default_window_code,
      v_allow_negative,
      v_validation_json,
      'p7-2b2-parameter-assignment-v1',
      'active',
      jsonb_build_object(
        'writeGate', 'p7-2b2-parameter-assignment-v1',
        'requestHash', p_request_hash
      )
    )
    returning * into v_definition;

    insert into public.value_object_parameter_assignments (
      value_object_id,
      parameter_definition_id,
      owner_user_id,
      owner_actor_id,
      created_by_actor_id,
      status,
      display_order,
      idempotency_key,
      metadata_json
    )
    values (
      p_value_object_id,
      v_definition.id,
      p_owner_user_id,
      p_owner_actor_id,
      p_created_by_actor_id,
      'active',
      v_display_order,
      p_idempotency_key,
      jsonb_build_object(
        'writeGate', 'p7-2b2-parameter-assignment-v1',
        'requestHash', p_request_hash
      )
    )
    returning * into v_assignment;

    v_rows_written := 2;

  else
    v_assignment_id :=
      nullif(p_payload ->> 'assignmentId', '')::uuid;

    if v_assignment_id is null then
      raise exception using
        errcode = '22023',
        message = 'P7_2B2_ASSIGNMENT_ID_REQUIRED';
    end if;

    select *
    into v_assignment
    from public.value_object_parameter_assignments assignment
    where assignment.id = v_assignment_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'P7_2B2_ASSIGNMENT_NOT_FOUND';
    end if;

    if v_assignment.value_object_id is distinct from p_value_object_id
       or v_assignment.owner_user_id is distinct from p_owner_user_id
       or v_assignment.owner_actor_id is distinct from p_owner_actor_id then
      raise exception using
        errcode = '42501',
        message = 'P7_2B2_ASSIGNMENT_OWNER_MISMATCH';
    end if;

    select *
    into v_definition
    from public.value_object_parameter_definitions definition
    where definition.id = v_assignment.parameter_definition_id
    for share;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'P7_2B2_PARAMETER_DEFINITION_NOT_FOUND';
    end if;

    if p_mode = 'deactivate' then
      if v_assignment.status = 'active' then
        update public.value_object_parameter_assignments
        set
          status = 'inactive',
          valid_to = now(),
          updated_at = now()
        where id = v_assignment.id
        returning * into v_assignment;

        v_rows_written := 1;
      elsif v_assignment.status = 'inactive' then
        v_state_already_satisfied := true;
      else
        raise exception using
          errcode = '23514',
          message = 'P7_2B2_RETIRED_ASSIGNMENT_CANNOT_DEACTIVATE';
      end if;

    elsif p_mode = 'reactivate' then
      if v_definition.status <> 'active' then
        raise exception using
          errcode = '23514',
          message = 'P7_2B2_PARAMETER_DEFINITION_NOT_ACTIVE';
      end if;

      if v_assignment.status = 'inactive' then
        if exists (
          select 1
          from public.value_object_parameter_assignments duplicate
          where duplicate.value_object_id = p_value_object_id
            and duplicate.parameter_definition_id =
              v_assignment.parameter_definition_id
            and duplicate.status = 'active'
            and duplicate.id <> v_assignment.id
        ) then
          raise exception using
            errcode = '23505',
            message = 'P7_2B2_DUPLICATE_ACTIVE_ASSIGNMENT';
        end if;

        update public.value_object_parameter_assignments
        set
          status = 'active',
          valid_from = now(),
          valid_to = null,
          updated_at = now()
        where id = v_assignment.id
        returning * into v_assignment;

        v_rows_written := 1;
      elsif v_assignment.status = 'active' then
        v_state_already_satisfied := true;
      else
        raise exception using
          errcode = '23514',
          message = 'P7_2B2_RETIRED_ASSIGNMENT_CANNOT_REACTIVATE';
      end if;
    end if;
  end if;

  if v_definition.id is null then
    select *
    into v_definition
    from public.value_object_parameter_definitions definition
    where definition.id = v_assignment.parameter_definition_id;
  end if;

  v_response := jsonb_build_object(
    'idempotentReplay', false,
    'stateAlreadySatisfied', v_state_already_satisfied,
    'mode', p_mode,
    'definitionId', v_definition.id,
    'parameterCode', v_definition.parameter_code,
    'assignmentId', v_assignment.id,
    'assignmentStatus', v_assignment.status,
    'rowsActuallyWritten', v_rows_written
  );

  insert into public.value_object_parameter_assignment_write_requests (
    owner_user_id,
    owner_actor_id,
    value_object_id,
    mode,
    idempotency_key,
    request_hash,
    result_definition_id,
    result_assignment_id,
    response_json
  )
  values (
    p_owner_user_id,
    p_owner_actor_id,
    p_value_object_id,
    p_mode,
    p_idempotency_key,
    p_request_hash,
    v_definition.id,
    v_assignment.id,
    v_response
  );

  return v_response;
end;
$function$;

revoke execute
on function public.save_value_object_parameter_assignment_v2(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.save_value_object_parameter_assignment_v2(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb,
  text,
  text
)
to service_role;

comment on table
  public.value_object_parameter_assignment_write_requests is
  'P7.2B2 service-only idempotency ledger for parameter assignment writes.';

comment on function public.save_value_object_parameter_assignment_v2(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  jsonb,
  text,
  text
) is
  'P7.2B2 guarded server-only write gate for assigning, creating, deactivating and reactivating leaf parameters.';

commit;
