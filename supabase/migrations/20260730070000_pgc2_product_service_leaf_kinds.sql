-- ARCTor.app PGC2 — product/service leaf kinds foundation.
-- Baseline: main @ fd3278e7c67ebe97abdebf23dd5922f4e70c6671
-- Scope:
--   * activity_leaf may use activity_pattern, product_type or service_type;
--   * those three kinds are forbidden for structural nodes;
--   * parameters and target standards remain available to every supported leaf kind;
--   * no data backfill is required (live preflight: 0 leaves, 0 assignments, 0 targets).

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

alter table public.value_objects
  drop constraint if exists value_objects_activity_leaf_shape_v2_check;

alter table public.value_objects
  drop constraint if exists value_objects_activity_leaf_shape_v3_check;

alter table public.value_objects
  add constraint value_objects_activity_leaf_shape_v3_check
  check (
    node_role_code is distinct from 'activity_leaf'
    or (
      object_kind in (
        'activity_pattern',
        'product_type',
        'service_type'
      )
      and parent_value_object_id is not null
    )
  )
  not valid;

alter table public.value_objects
  validate constraint value_objects_activity_leaf_shape_v3_check;

alter table public.value_objects
  drop constraint if exists value_objects_structural_kind_v3_check;

alter table public.value_objects
  add constraint value_objects_structural_kind_v3_check
  check (
    node_role_code is distinct from 'structural'
    or object_kind not in (
      'activity_pattern',
      'product_type',
      'service_type'
    )
  )
  not valid;

alter table public.value_objects
  validate constraint value_objects_structural_kind_v3_check;

CREATE OR REPLACE FUNCTION public.enforce_value_object_tree_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_tree_requested boolean;
  v_parent record;
  v_root record;
  v_cycle_found boolean;
  v_has_children boolean;
  v_controlled_operation_id uuid;
  v_controlled_operation_valid boolean := false;
begin
  begin
    v_controlled_operation_id :=
      nullif(current_setting('arctor.p8_tree_operation_id', true), '')::uuid;
  exception when invalid_text_representation then
    v_controlled_operation_id := null;
  end;

  if v_controlled_operation_id is not null then
    select exists (
      select 1
      from public.value_object_tree_operations operation
      where operation.id = v_controlled_operation_id
        and operation.status = 'applying'
    )
    into v_controlled_operation_valid;
  end if;

  v_tree_requested :=
    new.object_kind is not null
    or new.node_role_code is not null
    or new.branch_type_code is not null
    or new.root_value_object_id is not null
    or new.instance_of_value_object_id is not null;

  if not v_tree_requested then
    if tg_op = 'UPDATE' then
      if (
         old.object_kind is not null
         or old.node_role_code is not null
         or old.branch_type_code is not null
         or old.root_value_object_id is not null
         or old.instance_of_value_object_id is not null
      ) then
        raise exception using
          errcode = '23514',
          message = 'VALUE_OBJECT_TREE_V2_IDENTITY_CANNOT_BE_CLEARED';
      end if;
    end if;

    return new;
  end if;

  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if new.object_kind is null
     or new.node_role_code is null
     or new.branch_type_code is null then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_IDENTITY_INCOMPLETE';
  end if;

  new.value_type := new.object_kind;

  if new.node_role_code = 'activity_leaf'
     and new.object_kind not in (
       'activity_pattern',
       'product_type',
       'service_type'
     ) then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_LEAF_KIND_INVALID';
  end if;

  if new.node_role_code = 'structural'
     and new.object_kind in (
       'activity_pattern',
       'product_type',
       'service_type'
     ) then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_STRUCTURAL_KIND_INVALID';
  end if;

  if new.instance_of_value_object_id = new.id then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_INSTANCE_CANNOT_REFERENCE_SELF';
  end if;

  if new.parent_value_object_id is null then
    if new.node_role_code <> 'structural' then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_MUST_BE_STRUCTURAL';
    end if;

    if new.root_value_object_id is null then
      new.root_value_object_id := new.id;
    elsif new.root_value_object_id <> new.id then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_MUST_REFERENCE_SELF';
    end if;
  else
    if new.parent_value_object_id = new.id then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_PARENT_CANNOT_REFERENCE_SELF';
    end if;

    select
      parent.id,
      parent.node_role_code,
      parent.branch_type_code,
      parent.root_value_object_id
    into v_parent
    from public.value_objects parent
    where parent.id = new.parent_value_object_id;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'VALUE_OBJECT_TREE_V2_PARENT_NOT_FOUND';
    end if;

    if v_parent.node_role_code <> 'structural'
       or v_parent.branch_type_code is null
       or v_parent.root_value_object_id is null then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_PARENT_MUST_BE_V2_STRUCTURAL';
    end if;

    if new.branch_type_code <> v_parent.branch_type_code then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_BRANCH_MISMATCH';
    end if;

    if new.root_value_object_id is null then
      new.root_value_object_id := v_parent.root_value_object_id;
    elsif new.root_value_object_id <> v_parent.root_value_object_id then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_MISMATCH';
    end if;

    with recursive ancestors as (
      select candidate.id, candidate.parent_value_object_id
      from public.value_objects candidate
      where candidate.id = new.parent_value_object_id

      union

      select candidate.id, candidate.parent_value_object_id
      from public.value_objects candidate
      join ancestors previous
        on candidate.id = previous.parent_value_object_id
    )
    select exists (
      select 1
      from ancestors
      where id = new.id
    )
    into v_cycle_found;

    if v_cycle_found then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_CYCLE_FORBIDDEN';
    end if;
  end if;

  if new.root_value_object_id <> new.id then
    select
      root.id,
      root.node_role_code,
      root.branch_type_code,
      root.root_value_object_id,
      root.parent_value_object_id
    into v_root
    from public.value_objects root
    where root.id = new.root_value_object_id;

    if not found
       or v_root.node_role_code <> 'structural'
       or v_root.parent_value_object_id is not null
       or v_root.root_value_object_id <> v_root.id
       or v_root.branch_type_code <> new.branch_type_code then
      raise exception using
        errcode = '23514',
        message = 'VALUE_OBJECT_TREE_V2_ROOT_INVALID';
    end if;
  end if;

  select exists (
    select 1
    from public.value_objects child
    where child.parent_value_object_id = new.id
      and child.id <> new.id
  )
  into v_has_children;

  if new.node_role_code = 'activity_leaf' and v_has_children then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_LEAF_CANNOT_HAVE_CHILDREN';
  end if;

  if tg_op = 'UPDATE'
     and (
       new.parent_value_object_id is distinct from old.parent_value_object_id
       or new.branch_type_code is distinct from old.branch_type_code
       or new.root_value_object_id is distinct from old.root_value_object_id
     )
     and not v_controlled_operation_valid then
    raise exception using
      errcode = '23514',
      message = 'VALUE_OBJECT_TREE_V2_SUBTREE_MOVE_REQUIRES_CONTROLLED_FLOW';
  end if;

  return new;
end;
$function$;


CREATE OR REPLACE FUNCTION public.enforce_value_object_parameter_assignment_v3()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_value_object public.value_objects%rowtype;
  v_definition public.value_object_parameter_definitions%rowtype;
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

  if v_value_object.node_role_code is distinct from 'activity_leaf'
     or coalesce(v_value_object.object_kind, '') not in (
       'activity_pattern',
       'product_type',
       'service_type'
     ) then
    raise exception using
      errcode = '23514',
      message = 'P7_PARAMETER_ASSIGNMENT_REQUIRES_ACTIVITY_LEAF';
  end if;

  if v_value_object.owner_user_id is distinct from new.owner_user_id
     or v_value_object.owner_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P7_PARAMETER_ASSIGNMENT_VALUE_OBJECT_OWNER_MISMATCH';
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
end;
$function$;


CREATE OR REPLACE FUNCTION public.save_value_object_parameter_assignment_v2(p_owner_user_id uuid, p_owner_actor_id uuid, p_created_by_actor_id uuid, p_value_object_id uuid, p_mode text, p_payload jsonb, p_idempotency_key text, p_request_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
     or coalesce(v_value_object.object_kind, '') not in (
       'activity_pattern',
       'product_type',
       'service_type'
     )
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


CREATE OR REPLACE FUNCTION public.enforce_value_object_target_standard_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_assignment public.value_object_parameter_assignments%rowtype;
  v_definition public.value_object_parameter_definitions%rowtype;
  v_value_object public.value_objects%rowtype;
  v_target_kind public.value_object_target_kinds%rowtype;
  v_policy public.value_object_normalization_policies%rowtype;

  v_latest public.value_object_target_standard_versions%rowtype;
  v_has_latest boolean := false;

  v_allowed_unit boolean;
  v_period_policy text;
  v_numeric_shape text;
begin
  if tg_op = 'UPDATE' then
    if (
      new.target_series_id is distinct from old.target_series_id
      or new.version is distinct from old.version
      or new.parameter_assignment_id is distinct from old.parameter_assignment_id
      or new.owner_user_id is distinct from old.owner_user_id
      or new.owner_actor_id is distinct from old.owner_actor_id
      or new.created_by_actor_id is distinct from old.created_by_actor_id
      or new.target_kind_code is distinct from old.target_kind_code
      or new.normalization_policy_code is distinct from old.normalization_policy_code
      or new.original_value_numeric is distinct from old.original_value_numeric
      or new.original_min_numeric is distinct from old.original_min_numeric
      or new.original_max_numeric is distinct from old.original_max_numeric
      or new.original_value_boolean is distinct from old.original_value_boolean
      or new.original_value_text is distinct from old.original_value_text
      or new.original_unit_code is distinct from old.original_unit_code
      or new.canonical_value_numeric is distinct from old.canonical_value_numeric
      or new.canonical_min_numeric is distinct from old.canonical_min_numeric
      or new.canonical_max_numeric is distinct from old.canonical_max_numeric
      or new.canonical_value_boolean is distinct from old.canonical_value_boolean
      or new.canonical_value_text is distinct from old.canonical_value_text
      or new.canonical_unit_code is distinct from old.canonical_unit_code
      or new.period_count is distinct from old.period_count
      or new.period_unit_code is distinct from old.period_unit_code
      or new.period_days_numeric is distinct from old.period_days_numeric
      or new.daily_equivalent_numeric is distinct from old.daily_equivalent_numeric
      or new.daily_equivalent_unit_code is distinct from old.daily_equivalent_unit_code
      or new.normalization_state_code is distinct from old.normalization_state_code
      or new.normalization_formula_version is distinct from old.normalization_formula_version
      or new.priority_code is distinct from old.priority_code
      or new.source_type_code is distinct from old.source_type_code
      or new.supersedes_target_version_id is distinct from old.supersedes_target_version_id
      or new.label is distinct from old.label
      or new.description is distinct from old.description
      or new.safety_note is distinct from old.safety_note
      or new.idempotency_key is distinct from old.idempotency_key
      or new.request_hash is distinct from old.request_hash
      or new.metadata_json is distinct from old.metadata_json
      or new.valid_from is distinct from old.valid_from
      or new.created_at is distinct from old.created_at
    ) then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TARGET_VERSION_IS_IMMUTABLE';
    end if;

    if old.status_code = 'draft'
       and new.status_code not in ('draft', 'active', 'archived') then
      raise exception using
        errcode = '23514',
        message = 'P7_2_INVALID_DRAFT_STATUS_TRANSITION';
    elsif old.status_code = 'active'
       and new.status_code not in ('active', 'superseded', 'archived') then
      raise exception using
        errcode = '23514',
        message = 'P7_2_INVALID_ACTIVE_STATUS_TRANSITION';
    elsif old.status_code in ('superseded', 'archived')
       and new.status_code is distinct from old.status_code then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TERMINAL_TARGET_STATUS_IS_IMMUTABLE';
    end if;

    if new.status_code in ('superseded', 'archived')
       and new.valid_to is null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TERMINAL_TARGET_REQUIRES_VALID_TO';
    end if;

    if new.status_code in ('draft', 'active')
       and new.valid_to is not null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_OPEN_TARGET_CANNOT_HAVE_VALID_TO';
    end if;

    return new;
  end if;

  select *
  into v_assignment
  from public.value_object_parameter_assignments assignment
  where assignment.id = new.parameter_assignment_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'P7_2_PARAMETER_ASSIGNMENT_NOT_FOUND';
  end if;

  if v_assignment.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'P7_2_PARAMETER_ASSIGNMENT_NOT_ACTIVE';
  end if;

  if v_assignment.owner_user_id is distinct from new.owner_user_id
     or v_assignment.owner_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P7_2_TARGET_ASSIGNMENT_OWNER_MISMATCH';
  end if;

  select *
  into v_value_object
  from public.value_objects value_object
  where value_object.id = v_assignment.value_object_id;

  if not found
     or v_value_object.node_role_code is distinct from 'activity_leaf'
     or coalesce(v_value_object.object_kind, '') not in (
       'activity_pattern',
       'product_type',
       'service_type'
     ) then
    raise exception using
      errcode = '23514',
      message = 'P7_2_TARGET_REQUIRES_ACTIVITY_LEAF';
  end if;

  if v_value_object.owner_user_id is distinct from new.owner_user_id
     or v_value_object.owner_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P7_2_TARGET_LEAF_OWNER_MISMATCH';
  end if;

  select *
  into v_definition
  from public.value_object_parameter_definitions definition
  where definition.id = v_assignment.parameter_definition_id;

  if not found or v_definition.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'P7_2_PARAMETER_DEFINITION_NOT_ACTIVE';
  end if;

  if v_definition.scope_code = 'actor'
     and (
       v_definition.owner_user_id is distinct from new.owner_user_id
       or v_definition.owner_actor_id is distinct from new.owner_actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'P7_2_TARGET_PARAMETER_OWNER_MISMATCH';
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
      message = 'P7_2_TARGET_ACTOR_NOT_OWNED_BY_USER';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    where profile.owner_user_id = new.owner_user_id
      and profile.actor_id = new.created_by_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'P7_2_TARGET_CREATOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_target_kind
  from public.value_object_target_kinds target_kind
  where target_kind.target_kind_code = new.target_kind_code
    and target_kind.status = 'active';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'P7_2_TARGET_KIND_NOT_ACTIVE';
  end if;

  if new.normalization_policy_code is null then
    new.normalization_policy_code :=
      v_target_kind.default_normalization_policy_code;
  end if;

  select *
  into v_policy
  from public.value_object_normalization_policies policy
  where policy.normalization_policy_code = new.normalization_policy_code
    and policy.status = 'active';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'P7_2_NORMALIZATION_POLICY_NOT_ACTIVE';
  end if;

  if new.normalization_policy_code
       is distinct from v_target_kind.default_normalization_policy_code
     and new.normalization_policy_code <> 'custom_formula' then
    raise exception using
      errcode = '23514',
      message = 'P7_2_NORMALIZATION_POLICY_NOT_ALLOWED_FOR_KIND';
  end if;

  v_period_policy := v_target_kind.period_policy_code;
  v_numeric_shape := v_target_kind.numeric_shape_code;

  if v_period_policy = 'required'
     and (new.period_count is null or new.period_unit_code is null) then
    raise exception using
      errcode = '23514',
      message = 'P7_2_TARGET_PERIOD_REQUIRED';
  elsif v_period_policy = 'forbidden'
     and (new.period_count is not null or new.period_unit_code is not null) then
    raise exception using
      errcode = '23514',
      message = 'P7_2_TARGET_PERIOD_FORBIDDEN';
  end if;

  if new.period_unit_code in ('rolling_7_days', 'rolling_30_days')
     and new.period_count is distinct from 1 then
    raise exception using
      errcode = '23514',
      message = 'P7_2_ROLLING_PERIOD_COUNT_MUST_EQUAL_ONE';
  end if;

  if new.period_count is not null then
    new.period_days_numeric :=
      public.value_object_target_period_days_v1(
        new.period_count,
        new.period_unit_code
      );

    if new.period_days_numeric is null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TARGET_PERIOD_NOT_SUPPORTED';
    end if;
  else
    new.period_days_numeric := null;
  end if;

  if v_numeric_shape = 'single' then
    if v_definition.value_type_code <> 'numeric'
       or new.original_value_numeric is null
       or num_nonnulls(
         new.original_min_numeric,
         new.original_max_numeric,
         new.original_value_boolean,
         new.original_value_text
       ) <> 0
       or new.original_unit_code is null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_SINGLE_NUMERIC_TARGET_SHAPE_INVALID';
    end if;
  elsif v_numeric_shape = 'range' then
    if v_definition.value_type_code <> 'numeric'
       or new.original_min_numeric is null
       or new.original_max_numeric is null
       or new.original_min_numeric > new.original_max_numeric
       or num_nonnulls(
         new.original_value_numeric,
         new.original_value_boolean,
         new.original_value_text
       ) <> 0
       or new.original_unit_code is null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_RANGE_TARGET_SHAPE_INVALID';
    end if;
  elsif v_numeric_shape = 'boolean' then
    if v_definition.value_type_code <> 'boolean'
       or new.original_value_boolean is null
       or num_nonnulls(
         new.original_value_numeric,
         new.original_min_numeric,
         new.original_max_numeric,
         new.original_value_text,
         new.original_unit_code
       ) <> 0 then
      raise exception using
        errcode = '23514',
        message = 'P7_2_BOOLEAN_TARGET_SHAPE_INVALID';
    end if;
  elsif v_numeric_shape = 'text' then
    if v_definition.value_type_code <> 'text'
       or nullif(btrim(new.original_value_text), '') is null
       or num_nonnulls(
         new.original_value_numeric,
         new.original_min_numeric,
         new.original_max_numeric,
         new.original_value_boolean,
         new.original_unit_code
       ) <> 0 then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TEXT_TARGET_SHAPE_INVALID';
    end if;
  end if;

  if v_definition.value_type_code = 'numeric' then
    select exists (
      select 1
      from jsonb_array_elements_text(
        v_definition.allowed_unit_codes
      ) allowed_unit(unit_code)
      where allowed_unit.unit_code = new.original_unit_code
    )
    into v_allowed_unit;

    if not v_allowed_unit then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TARGET_UNIT_NOT_ALLOWED_FOR_PARAMETER';
    end if;

    if not v_definition.allow_negative
       and (
         coalesce(new.original_value_numeric < 0, false)
         or coalesce(new.original_min_numeric < 0, false)
         or coalesce(new.original_max_numeric < 0, false)
       ) then
      raise exception using
        errcode = '23514',
        message = 'P7_2_NEGATIVE_TARGET_NOT_ALLOWED';
    end if;

    new.canonical_value_numeric :=
      public.convert_value_object_unit_v1(
        v_definition.dimension_code,
        new.original_value_numeric,
        new.original_unit_code,
        v_definition.canonical_unit_code
      );

    new.canonical_min_numeric :=
      public.convert_value_object_unit_v1(
        v_definition.dimension_code,
        new.original_min_numeric,
        new.original_unit_code,
        v_definition.canonical_unit_code
      );

    new.canonical_max_numeric :=
      public.convert_value_object_unit_v1(
        v_definition.dimension_code,
        new.original_max_numeric,
        new.original_unit_code,
        v_definition.canonical_unit_code
      );

    new.canonical_unit_code := v_definition.canonical_unit_code;
    new.canonical_value_boolean := null;
    new.canonical_value_text := null;
  elsif v_definition.value_type_code = 'boolean' then
    new.canonical_value_boolean := new.original_value_boolean;
    new.canonical_value_text := null;
    new.canonical_value_numeric := null;
    new.canonical_min_numeric := null;
    new.canonical_max_numeric := null;
    new.canonical_unit_code := v_definition.canonical_unit_code;
  elsif v_definition.value_type_code = 'text' then
    new.canonical_value_text := btrim(new.original_value_text);
    new.canonical_value_boolean := null;
    new.canonical_value_numeric := null;
    new.canonical_min_numeric := null;
    new.canonical_max_numeric := null;
    new.canonical_unit_code := v_definition.canonical_unit_code;
  else
    raise exception using
      errcode = '23514',
      message = 'P7_2_TIMESTAMP_TARGETS_NOT_SUPPORTED';
  end if;

  if new.normalization_policy_code in ('linear_rate', 'cadence_rate') then
    if new.canonical_value_numeric is null
       or new.period_days_numeric is null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_DAILY_NORMALIZATION_REQUIRES_NUMERIC_PERIOD_TARGET';
    end if;

    new.daily_equivalent_numeric :=
      new.canonical_value_numeric / new.period_days_numeric;
    new.daily_equivalent_unit_code := new.canonical_unit_code;
    new.normalization_state_code := 'derived';
    new.normalization_formula_version :=
      coalesce(v_policy.formula_version, 'daily-rate-v1');
  elsif new.normalization_policy_code = 'custom_formula' then
    new.daily_equivalent_numeric := null;
    new.daily_equivalent_unit_code := null;
    new.normalization_state_code := 'formula_required';
    new.normalization_formula_version := null;
  else
    new.daily_equivalent_numeric := null;
    new.daily_equivalent_unit_code := null;
    new.normalization_state_code := 'not_applicable';
    new.normalization_formula_version := v_policy.formula_version;
  end if;

  select latest.*
  into v_latest
  from public.value_object_target_standard_versions latest
  where latest.target_series_id = new.target_series_id
  order by latest.version desc
  limit 1;

  v_has_latest := found;

  if not v_has_latest then
    if new.version <> 1
       or new.supersedes_target_version_id is not null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_FIRST_TARGET_VERSION_MUST_BE_VERSION_ONE';
    end if;
  else
    if new.parameter_assignment_id
         is distinct from v_latest.parameter_assignment_id
       or new.target_kind_code
         is distinct from v_latest.target_kind_code
       or new.owner_user_id
         is distinct from v_latest.owner_user_id
       or new.owner_actor_id
         is distinct from v_latest.owner_actor_id then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TARGET_SERIES_IDENTITY_CHANGE_FORBIDDEN';
    end if;

    if new.version <> v_latest.version + 1
       or new.supersedes_target_version_id
         is distinct from v_latest.id then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TARGET_VERSION_SEQUENCE_INVALID';
    end if;
  end if;

  if new.status_code in ('superseded', 'archived') then
    raise exception using
      errcode = '23514',
      message = 'P7_2_NEW_TARGET_VERSION_MUST_BE_OPEN';
  end if;

  new.valid_to := null;

  return new;
end;
$function$;


CREATE OR REPLACE FUNCTION public.preview_value_object_tree_restructure_v1(p_owner_user_id uuid, p_owner_actor_id uuid, p_target_value_object_id uuid, p_mode text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_target public.value_objects%rowtype;
  v_source_parent public.value_objects%rowtype;
  v_destination_parent public.value_objects%rowtype;
  v_new_parent_id uuid;
  v_new_root_id uuid;
  v_child_ids uuid[];
  v_child_count integer;
  v_distinct_child_count integer;
  v_title text;
  v_description text;
  v_object_kind text;
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
      errcode = '22023',
      message = 'P8_REQUIRED_IDENTIFIERS_MISSING';
  end if;

  if p_mode not in ('reparent', 'insert_intermediate') then
    raise exception using
      errcode = '22023',
      message = 'P8_MODE_INVALID';
  end if;

  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'P8_PAYLOAD_MUST_BE_OBJECT';
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
      message = 'P8_ACTOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_target
  from public.value_objects value_object
  where value_object.id = p_target_value_object_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'P8_TARGET_NOT_FOUND';
  end if;

  if v_target.owner_user_id is distinct from p_owner_user_id
     or v_target.owner_actor_id is distinct from p_owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P8_TARGET_OWNER_MISMATCH';
  end if;

  if v_target.node_role_code not in ('structural', 'activity_leaf')
     or v_target.branch_type_code is null
     or v_target.root_value_object_id is null
     or v_target.object_kind is null then
    raise exception using
      errcode = '23514',
      message = 'P8_TARGET_REQUIRES_V2_TREE_IDENTITY';
  end if;

  if v_target.parent_value_object_id is not null then
    select *
    into v_source_parent
    from public.value_objects value_object
    where value_object.id = v_target.parent_value_object_id;
  end if;

  v_old_path := public.p8_value_object_tree_path_json(
    p_owner_user_id,
    p_owner_actor_id,
    p_target_value_object_id
  );

  if p_mode = 'reparent' then
    if p_payload ? 'newParentValueObjectId'
       and nullif(p_payload ->> 'newParentValueObjectId', '') is not null then
      begin
        v_new_parent_id := (p_payload ->> 'newParentValueObjectId')::uuid;
      exception when invalid_text_representation then
        raise exception using
          errcode = '22023',
          message = 'P8_NEW_PARENT_ID_INVALID';
      end;
    else
      v_new_parent_id := null;
    end if;

    if v_new_parent_id is null then
      if v_target.node_role_code <> 'structural' then
        raise exception using
          errcode = '23514',
          message = 'P8_ONLY_STRUCTURAL_CAN_BECOME_ROOT';
      end if;

      v_new_root_id := v_target.id;
      v_new_path := jsonb_build_array(
        jsonb_build_object(
          'id', v_target.id,
          'title', v_target.title,
          'parentValueObjectId', null,
          'rootValueObjectId', v_target.id,
          'branchTypeCode', v_target.branch_type_code,
          'nodeRoleCode', v_target.node_role_code,
          'objectKind', v_target.object_kind,
          'status', v_target.status
        )
      );
    else
      if v_new_parent_id = v_target.id then
        raise exception using
          errcode = '23514',
          message = 'P8_PARENT_CANNOT_REFERENCE_TARGET';
      end if;

      select *
      into v_destination_parent
      from public.value_objects value_object
      where value_object.id = v_new_parent_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message = 'P8_DESTINATION_PARENT_NOT_FOUND';
      end if;

      if v_destination_parent.owner_user_id is distinct from p_owner_user_id
         or v_destination_parent.owner_actor_id is distinct from p_owner_actor_id then
        raise exception using
          errcode = '42501',
          message = 'P8_DESTINATION_PARENT_OWNER_MISMATCH';
      end if;

      if v_destination_parent.node_role_code <> 'structural'
         or v_destination_parent.root_value_object_id is null
         or v_destination_parent.branch_type_code is null then
        raise exception using
          errcode = '23514',
          message = 'P8_DESTINATION_PARENT_MUST_BE_STRUCTURAL';
      end if;

      if v_destination_parent.branch_type_code <> v_target.branch_type_code then
        raise exception using
          errcode = '23514',
          message = 'P8_CROSS_BRANCH_MOVE_FORBIDDEN';
      end if;

      if exists (
        with recursive subtree as (
          select value_object.id
          from public.value_objects value_object
          where value_object.id = v_target.id

          union all

          select child.id
          from public.value_objects child
          join subtree parent
            on child.parent_value_object_id = parent.id
          where child.owner_user_id = p_owner_user_id
            and child.owner_actor_id = p_owner_actor_id
        )
        select 1
        from subtree
        where id = v_new_parent_id
      ) then
        raise exception using
          errcode = '23514',
          message = 'P8_CYCLE_FORBIDDEN';
      end if;

      v_new_root_id := v_destination_parent.root_value_object_id;
      v_new_path :=
        public.p8_value_object_tree_path_json(
          p_owner_user_id,
          p_owner_actor_id,
          v_destination_parent.id
        ) ||
        jsonb_build_array(
          jsonb_build_object(
            'id', v_target.id,
            'title', v_target.title,
            'parentValueObjectId', v_destination_parent.id,
            'rootValueObjectId', v_new_root_id,
            'branchTypeCode', v_target.branch_type_code,
            'nodeRoleCode', v_target.node_role_code,
            'objectKind', v_target.object_kind,
            'status', v_target.status
          )
        );
    end if;

    with recursive subtree as (
      select
        value_object.id,
        value_object.title,
        value_object.parent_value_object_id,
        value_object.root_value_object_id,
        value_object.branch_type_code,
        value_object.node_role_code,
        value_object.object_kind,
        value_object.status,
        value_object.updated_at,
        0 as depth
      from public.value_objects value_object
      where value_object.id = v_target.id
        and value_object.owner_user_id = p_owner_user_id
        and value_object.owner_actor_id = p_owner_actor_id

      union all

      select
        child.id,
        child.title,
        child.parent_value_object_id,
        child.root_value_object_id,
        child.branch_type_code,
        child.node_role_code,
        child.object_kind,
        child.status,
        child.updated_at,
        parent.depth + 1
      from public.value_objects child
      join subtree parent
        on child.parent_value_object_id = parent.id
      where child.owner_user_id = p_owner_user_id
        and child.owner_actor_id = p_owner_actor_id
        and parent.depth < 200
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', subtree.id,
          'title', subtree.title,
          'parentValueObjectId', subtree.parent_value_object_id,
          'rootValueObjectId', subtree.root_value_object_id,
          'branchTypeCode', subtree.branch_type_code,
          'nodeRoleCode', subtree.node_role_code,
          'objectKind', subtree.object_kind,
          'status', subtree.status,
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
      and v_target.root_value_object_id is not distinct from v_new_root_id;

    if jsonb_array_length(v_affected) > 1 then
      v_warnings := v_warnings || jsonb_build_array(
        'The selected object has descendants. Their structural path and root context will move atomically with the target.'
      );
    end if;

    v_preview_material := jsonb_build_object(
      'mode', p_mode,
      'targetId', v_target.id,
      'newParentId', v_new_parent_id,
      'newRootId', v_new_root_id,
      'targetParentId', v_target.parent_value_object_id,
      'targetRootId', v_target.root_value_object_id,
      'branchTypeCode', v_target.branch_type_code,
      'affected', v_affected
    );

  else
    if v_target.node_role_code <> 'structural' then
      raise exception using
        errcode = '23514',
        message = 'P8_INSERT_PARENT_MUST_BE_STRUCTURAL';
    end if;

    if jsonb_typeof(p_payload -> 'childValueObjectIds') <> 'array' then
      raise exception using
        errcode = '22023',
        message = 'P8_CHILD_IDS_MUST_BE_ARRAY';
    end if;

    begin
      select coalesce(array_agg(value::uuid order by value::uuid), array[]::uuid[])
      into v_child_ids
      from jsonb_array_elements_text(p_payload -> 'childValueObjectIds') element(value);
    exception when invalid_text_representation then
      raise exception using
        errcode = '22023',
        message = 'P8_CHILD_ID_INVALID';
    end;

    v_child_count := coalesce(cardinality(v_child_ids), 0);

    select count(distinct child_id)
    into v_distinct_child_count
    from unnest(v_child_ids) child_id;

    if v_child_count = 0 or v_child_count <> v_distinct_child_count then
      raise exception using
        errcode = '22023',
        message = 'P8_CHILD_IDS_EMPTY_OR_DUPLICATED';
    end if;

    v_title := nullif(btrim(p_payload ->> 'title'), '');
    v_description := nullif(btrim(p_payload ->> 'description'), '');
    v_object_kind := nullif(btrim(p_payload ->> 'objectKind'), '');

    if v_title is null or char_length(v_title) > 180 then
      raise exception using
        errcode = '22023',
        message = 'P8_INTERMEDIATE_TITLE_INVALID';
    end if;

    if v_description is not null and char_length(v_description) > 4000 then
      raise exception using
        errcode = '22023',
        message = 'P8_INTERMEDIATE_DESCRIPTION_INVALID';
    end if;

    if v_object_kind is null
       or v_object_kind in (
         'activity_pattern',
         'product_type',
         'service_type'
       ) then
      raise exception using
        errcode = '22023',
        message = 'P8_INTERMEDIATE_OBJECT_KIND_INVALID';
    end if;

    if exists (
      select 1
      from unnest(v_child_ids) selected(id)
      left join public.value_objects child
        on child.id = selected.id
      where child.id is null
         or child.owner_user_id is distinct from p_owner_user_id
         or child.owner_actor_id is distinct from p_owner_actor_id
         or child.parent_value_object_id is distinct from v_target.id
         or child.branch_type_code is distinct from v_target.branch_type_code
         or child.root_value_object_id is distinct from v_target.root_value_object_id
    ) then
      raise exception using
        errcode = '23514',
        message = 'P8_SELECTED_CHILD_MUST_BE_DIRECT_OWNED_CHILD';
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', child.id,
          'title', child.title,
          'parentValueObjectId', child.parent_value_object_id,
          'rootValueObjectId', child.root_value_object_id,
          'branchTypeCode', child.branch_type_code,
          'nodeRoleCode', child.node_role_code,
          'objectKind', child.object_kind,
          'status', child.status
        )
        order by child.title, child.id
      ),
      '[]'::jsonb
    )
    into v_selected_children
    from public.value_objects child
    where child.id = any(v_child_ids);

    with recursive selected_subtrees as (
      select
        child.id,
        child.title,
        child.parent_value_object_id,
        child.root_value_object_id,
        child.branch_type_code,
        child.node_role_code,
        child.object_kind,
        child.status,
        child.updated_at,
        child.id as selected_root_id,
        0 as depth
      from public.value_objects child
      where child.id = any(v_child_ids)

      union all

      select
        descendant.id,
        descendant.title,
        descendant.parent_value_object_id,
        descendant.root_value_object_id,
        descendant.branch_type_code,
        descendant.node_role_code,
        descendant.object_kind,
        descendant.status,
        descendant.updated_at,
        parent.selected_root_id,
        parent.depth + 1
      from public.value_objects descendant
      join selected_subtrees parent
        on descendant.parent_value_object_id = parent.id
      where descendant.owner_user_id = p_owner_user_id
        and descendant.owner_actor_id = p_owner_actor_id
        and parent.depth < 200
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', subtree.id,
          'title', subtree.title,
          'parentValueObjectId', subtree.parent_value_object_id,
          'rootValueObjectId', subtree.root_value_object_id,
          'branchTypeCode', subtree.branch_type_code,
          'nodeRoleCode', subtree.node_role_code,
          'objectKind', subtree.object_kind,
          'status', subtree.status,
          'depth', subtree.depth,
          'selectedRootId', subtree.selected_root_id,
          'updatedAt', subtree.updated_at
        )
        order by subtree.selected_root_id, subtree.depth, subtree.id
      ),
      '[]'::jsonb
    )
    into v_affected
    from selected_subtrees subtree;

    v_new_path :=
      public.p8_value_object_tree_path_json(
        p_owner_user_id,
        p_owner_actor_id,
        v_target.id
      ) ||
      jsonb_build_array(
        jsonb_build_object(
          'id', null,
          'title', v_title,
          'parentValueObjectId', v_target.id,
          'rootValueObjectId', v_target.root_value_object_id,
          'branchTypeCode', v_target.branch_type_code,
          'nodeRoleCode', 'structural',
          'objectKind', v_object_kind,
          'status', 'draft'
        )
      );

    v_warnings := v_warnings || jsonb_build_array(
      'The new intermediate object and all selected child reparent operations will be committed or rolled back as one transaction.'
    );

    v_preview_material := jsonb_build_object(
      'mode', p_mode,
      'parentId', v_target.id,
      'rootId', v_target.root_value_object_id,
      'branchTypeCode', v_target.branch_type_code,
      'title', v_title,
      'description', v_description,
      'objectKind', v_object_kind,
      'childIds', to_jsonb(v_child_ids),
      'affected', v_affected
    );
  end if;

  v_preview_hash := upper(
    encode(
      digest(convert_to(v_preview_material::text, 'UTF8'), 'sha256'),
      'hex'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'allowed', true,
    'mode', p_mode,
    'stateAlreadySatisfied', v_state_already_satisfied,
    'target', public.p8_value_object_tree_node_json(v_target.id),
    'sourceParent',
      case
        when v_source_parent.id is null then null
        else public.p8_value_object_tree_node_json(v_source_parent.id)
      end,
    'destinationParent',
      case
        when p_mode = 'insert_intermediate' then public.p8_value_object_tree_node_json(v_target.id)
        when v_destination_parent.id is null then null
        else public.p8_value_object_tree_node_json(v_destination_parent.id)
      end,
    'oldPath', v_old_path,
    'newPath', v_new_path,
    'affectedNodes', v_affected,
    'selectedChildren', v_selected_children,
    'proposedIntermediate',
      case
        when p_mode = 'insert_intermediate' then jsonb_build_object(
          'title', v_title,
          'description', v_description,
          'objectKind', v_object_kind
        )
        else null
      end,
    'warnings', v_warnings,
    'previewHash', v_preview_hash
  );
end;
$function$;


comment on constraint value_objects_activity_leaf_shape_v3_check
  on public.value_objects is
  'PGC2: activity leaves may be activity_pattern, product_type or service_type and must have a parent.';

comment on constraint value_objects_structural_kind_v3_check
  on public.value_objects is
  'PGC2: leaf-only object kinds cannot be used by structural nodes.';

commit;
