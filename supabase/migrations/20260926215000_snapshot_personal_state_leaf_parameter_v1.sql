-- ARCTOR_SNAPSHOT_PERSONAL_STATE_LEAF_PARAMETER_V1
--
-- Purpose:
-- Allow an authenticated user to create a personal point-in-time snapshot
-- for any active GLOBAL system-model LEAF in the States & Needs branch using
-- an existing active SYSTEM numeric parameter, even if that exact
-- value_object <-> parameter pair has not yet been materialized as a global
-- system assignment.
--
-- This does NOT let the user mutate the ontology or create a system assignment.
-- Admins may still materialize the system assignment explicitly through the
-- guarded application action.
--
-- No historical fact rewrite.
-- No template/formula/relation writes.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $preflight$
begin
  if to_regclass('public.activity_object_facts') is null
     or to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null then
    raise exception using
      errcode='42P01',
      message='ARCTOR_SNAPSHOT_PERSONAL_STATE_LEAF_PARAMETER_REQUIRED_TABLES_MISSING';
  end if;

  if to_regprocedure('public.enforce_activity_fact_actor_alignment_v2()') is null then
    raise exception using
      errcode='42883',
      message='ARCTOR_SNAPSHOT_PERSONAL_STATE_LEAF_PARAMETER_FACT_GUARD_MISSING';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where id='6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a'::uuid
      and scope_code='global'
      and origin_type_code='system_model'
      and status='active'
  ) then
    raise exception using
      errcode='23514',
      message='ARCTOR_SNAPSHOT_PERSONAL_STATE_LEAF_PARAMETER_STATES_ROOT_MISSING';
  end if;
end
$preflight$;

create or replace function public.enforce_activity_fact_actor_alignment_v2()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_measure public.activity_event_measures%rowtype;
  v_event public.activity_events%rowtype;
  v_value_object public.value_objects%rowtype;
  v_assignment public.value_object_parameter_assignments%rowtype;
  v_definition public.value_object_parameter_definitions%rowtype;
  v_is_review_fact boolean;
  v_is_direct_state_snapshot boolean;
begin
  if new.measure_id is not null then
    select * into v_measure
    from public.activity_event_measures measure
    where measure.id=new.measure_id;

    if not found then
      raise exception using
        errcode='23503',
        message='P4A_FACT_MEASURE_NOT_FOUND';
    end if;

    if new.activity_event_id is distinct from v_measure.activity_event_id
       or new.user_id is distinct from v_measure.user_id
       or new.performed_by_actor_id is distinct from v_measure.performed_by_actor_id
       or new.acting_as_actor_id is distinct from v_measure.acting_as_actor_id
       or new.acting_for_actor_id is distinct from v_measure.acting_for_actor_id then
      raise exception using
        errcode='42501',
        message='P4A_FACT_MEASURE_ACTOR_MISMATCH';
    end if;

    if new.parameter_definition_id is distinct from v_measure.parameter_definition_id then
      raise exception using
        errcode='23514',
        message='GSR1D_FACT_MEASURE_PARAMETER_DEFINITION_MISMATCH';
    end if;
  else
    if new.fact_role_code not in ('result','snapshot') then
      raise exception using
        errcode='23514',
        message='FACT_CARD_V1_NON_MEASURE_FACT_MUST_BE_RESULT_OR_SNAPSHOT';
    end if;

    if new.activity_event_id is not null then
      select * into v_event
      from public.activity_events
      where id=new.activity_event_id;

      if not found then
        raise exception using
          errcode='23503',
          message='FACT_CARD_V1_ACTIVITY_EVENT_NOT_FOUND';
      end if;

      if new.user_id is distinct from v_event.user_id
         or new.performed_by_actor_id is distinct from v_event.performed_by_actor_id
         or new.acting_as_actor_id is distinct from v_event.acting_as_actor_id
         or new.acting_for_actor_id is distinct from v_event.acting_for_actor_id then
        raise exception using
          errcode='42501',
          message='FACT_CARD_V1_ACTIVITY_EVENT_ACTOR_MISMATCH';
      end if;
    end if;
  end if;

  v_is_review_fact :=
    coalesce(new.metadata->>'contract','')='ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1'
    and new.is_user_confirmed is true
    and new.semantic_match_method_code='user_confirmed';

  v_is_direct_state_snapshot :=
    new.fact_role_code='snapshot'
    and new.activity_event_id is null
    and new.measure_id is null
    and new.is_user_confirmed is true
    and new.semantic_match_method_code='user_confirmed'
    and new.source_type='user_text'
    and coalesce(
      new.metadata #>> '{snapshotCaptureV1,selectionMode}',
      ''
    )='direct_state_leaf_parameter_v1'
    and new.parameter_definition_id is not null
    and new.parameter_assignment_id is null;

  if new.value_object_id is not null then
    select * into v_value_object
    from public.value_objects
    where id=new.value_object_id;

    if not found then
      raise exception using
        errcode='23503',
        message='GSR1D_FACT_VALUE_OBJECT_NOT_FOUND';
    end if;

    if v_value_object.ontology_node_role_code is distinct from 'leaf' then
      raise exception using
        errcode='23514',
        message='P4A_FACT_REQUIRES_ONTOLOGY_LEAF';
    end if;

    if v_value_object.scope_code='global' then
      if v_value_object.owner_user_id is not null
         or v_value_object.owner_actor_id is not null
         or v_value_object.origin_type_code is distinct from 'system_model'
         or v_value_object.status is distinct from 'active' then
        raise exception using
          errcode='23514',
          message='GSR1D_GLOBAL_FACT_REQUIRES_ACTIVE_OWNERLESS_SYSTEM_LEAF';
      end if;

      if v_is_review_fact then
        if new.parameter_definition_id is not null
           or new.parameter_assignment_id is not null then
          raise exception using
            errcode='23514',
            message='AI_A3_1_REVIEW_FACT_MUST_NOT_USE_LEAF_PARAMETER_ASSIGNMENT';
        end if;

      elsif v_is_direct_state_snapshot then
        if v_value_object.root_value_object_id is distinct from
          '6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a'::uuid then
          raise exception using
            errcode='23514',
            message='ARCTOR_DIRECT_SNAPSHOT_REQUIRES_STATES_AND_NEEDS_LEAF';
        end if;

        select * into v_definition
        from public.value_object_parameter_definitions
        where id=new.parameter_definition_id;

        if not found
           or v_definition.scope_code is distinct from 'system'
           or v_definition.status is distinct from 'active'
           or v_definition.value_type_code is distinct from 'numeric' then
          raise exception using
            errcode='23514',
            message='ARCTOR_DIRECT_SNAPSHOT_REQUIRES_ACTIVE_SYSTEM_NUMERIC_PARAMETER';
        end if;

        if new.measure_type is distinct from v_definition.parameter_code then
          raise exception using
            errcode='23514',
            message='ARCTOR_DIRECT_SNAPSHOT_PARAMETER_CODE_MISMATCH';
        end if;

        if nullif(btrim(new.unit),'') is null
           or not (coalesce(v_definition.allowed_unit_codes,'[]'::jsonb) ? new.unit) then
          raise exception using
            errcode='23514',
            message='ARCTOR_DIRECT_SNAPSHOT_UNIT_NOT_ALLOWED';
        end if;

      else
        if new.parameter_definition_id is null
           or new.parameter_assignment_id is null then
          raise exception using
            errcode='23514',
            message='GSR1D_GLOBAL_FACT_REQUIRES_SYSTEM_PARAMETER_CONTRACT';
        end if;

        select * into v_assignment
        from public.value_object_parameter_assignments assignment
        where assignment.id=new.parameter_assignment_id;

        if not found
           or v_assignment.assignment_scope_code is distinct from 'system'
           or v_assignment.status is distinct from 'active'
           or v_assignment.value_object_id is distinct from new.value_object_id
           or v_assignment.parameter_definition_id is distinct from new.parameter_definition_id
           or v_assignment.owner_user_id is not null
           or v_assignment.owner_actor_id is not null then
          raise exception using
            errcode='23514',
            message='GSR1D_GLOBAL_FACT_SYSTEM_PARAMETER_ASSIGNMENT_MISMATCH';
        end if;
      end if;

    elsif v_value_object.scope_code='actor'
       or v_value_object.scope_code is null then
      if v_value_object.owner_user_id is distinct from new.user_id
         or v_value_object.owner_actor_id is distinct from new.acting_as_actor_id then
        raise exception using
          errcode='42501',
          message='P4A_FACT_VALUE_OBJECT_ACTOR_MISMATCH';
      end if;

      if new.parameter_assignment_id is not null
         and not exists (
           select 1
           from public.value_object_parameter_assignments assignment
           where assignment.id=new.parameter_assignment_id
             and assignment.value_object_id=new.value_object_id
             and assignment.owner_user_id=new.user_id
             and assignment.owner_actor_id=new.acting_as_actor_id
         ) then
        raise exception using
          errcode='23514',
          message='P4A_FACT_PARAMETER_ASSIGNMENT_TARGET_MISMATCH';
      end if;
    else
      raise exception using
        errcode='23514',
        message='GSR1D_FACT_VALUE_OBJECT_SCOPE_UNSUPPORTED';
    end if;
  end if;

  return new;
end;
$function$;

comment on function public.enforce_activity_fact_actor_alignment_v2() is
  'Fact ownership/leaf/parameter guard. ARCTOR_SNAPSHOT_PERSONAL_STATE_LEAF_PARAMETER_V1 additionally permits user-confirmed point-in-time snapshots on GLOBAL States & Needs leaves with an active SYSTEM numeric parameter and no global assignment.';

commit;

notify pgrst, 'reload schema';
