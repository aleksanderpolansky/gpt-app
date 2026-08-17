-- ARCTor.app
-- AI-A3.1 REVIEW-FIRST SEMANTIC FACT PIPELINE v1
-- GUARDED ROLLBACK
--
-- This rollback intentionally refuses to run after any A3.1 review draft,
-- coefficient rule, actor recognition example, commit ledger row, or committed
-- A3.1 fact exists. It is for pre-live-acceptance rollback only.

begin;

set local lock_timeout='5s';
set local statement_timeout='120s';

do $guard$
begin
  if to_regclass('public.activity_semantic_review_drafts_a31') is not null
     and exists (
       select 1
       from public.activity_semantic_review_drafts_a31
       limit 1
     ) then
    raise exception using
      errcode='55000',
      message='AI_A3_1_ROLLBACK_BLOCKED_REVIEW_DRAFTS_EXIST';
  end if;

  if to_regclass('public.activity_leaf_fact_coefficient_rules_a31') is not null
     and exists (
       select 1
       from public.activity_leaf_fact_coefficient_rules_a31
       limit 1
     ) then
    raise exception using
      errcode='55000',
      message='AI_A3_1_ROLLBACK_BLOCKED_COEFFICIENT_RULES_EXIST';
  end if;

  if to_regclass('public.actor_value_object_recognition_examples_a31') is not null
     and exists (
       select 1
       from public.actor_value_object_recognition_examples_a31
       limit 1
     ) then
    raise exception using
      errcode='55000',
      message='AI_A3_1_ROLLBACK_BLOCKED_RECOGNITION_EXAMPLES_EXIST';
  end if;

  if to_regclass('public.activity_semantic_review_commit_operations_a31') is not null
     and exists (
       select 1
       from public.activity_semantic_review_commit_operations_a31
       limit 1
     ) then
    raise exception using
      errcode='55000',
      message='AI_A3_1_ROLLBACK_BLOCKED_COMMIT_OPERATIONS_EXIST';
  end if;

  if exists (
    select 1
    from public.activity_object_facts
    where metadata->>'contract'='ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1'
    limit 1
  ) then
    raise exception using
      errcode='55000',
      message='AI_A3_1_ROLLBACK_BLOCKED_COMMITTED_FACTS_EXIST';
  end if;
end
$guard$;

drop function if exists public.ai_a3_1_review_first_schema_preflight_v1();

drop function if exists public.commit_activity_semantic_review_a31_v1(
  uuid,uuid,uuid,uuid,text,text,jsonb,jsonb
);

drop function if exists public.retire_activity_leaf_fact_coefficient_rule_a31_v1(
  uuid,uuid,uuid
);

drop function if exists public.save_activity_leaf_fact_coefficient_rule_a31_v1(
  uuid,uuid,uuid,uuid,text,uuid,text,text,numeric,text,boolean,numeric,integer
);

drop table if exists public.activity_semantic_review_commit_operations_a31;
drop table if exists public.activity_leaf_fact_coefficient_rules_a31;
drop table if exists public.actor_value_object_recognition_examples_a31;
drop table if exists public.activity_semantic_review_drafts_a31;

alter table public.activity_event_measures
  drop constraint activity_event_measures_unit_check;

alter table public.activity_event_measures
  add constraint activity_event_measures_unit_check
  check (
    (
      parameter_definition_id is null
      and unit in (
        'minute','hour','meter','kilometer','count','repetition','set',
        'milliliter','liter','gram','kilogram','kcal','pln','eur','usd',
        'score_0_10','boolean','text','tag','role','km_per_hour'
      )
    )
    or
    (
      parameter_definition_id is not null
      and unit ~ '^[a-z][a-z0-9_]{0,63}$'
    )
  );

alter table public.activity_object_facts
  drop constraint activity_object_facts_unit_check;

alter table public.activity_object_facts
  add constraint activity_object_facts_unit_check
  check (
    (
      parameter_definition_id is null
      and unit in (
        'minute','hour','meter','kilometer','count','repetition','set',
        'milliliter','liter','gram','kilogram','kcal','pln','eur','usd',
        'score_0_10','boolean','text','tag','role','km_per_hour'
      )
    )
    or
    (
      parameter_definition_id is not null
      and unit ~ '^[a-z][a-z0-9_]{0,63}$'
    )
  );

create or replace function public.enforce_activity_fact_actor_alignment_v2()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_measure public.activity_event_measures%rowtype;
  v_value_object public.value_objects%rowtype;
  v_assignment public.value_object_parameter_assignments%rowtype;
begin
  select *
  into v_measure
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

  if new.value_object_id is not null then
    select *
    into v_value_object
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

      if new.parameter_definition_id is null
         or new.parameter_assignment_id is null then
        raise exception using
          errcode='23514',
          message='GSR1D_GLOBAL_FACT_REQUIRES_SYSTEM_PARAMETER_CONTRACT';
      end if;

      select *
      into v_assignment
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

    elsif v_value_object.scope_code='actor' or v_value_object.scope_code is null then
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

commit;

select jsonb_build_object(
  'check','ARCTOR_AI_A3_1_REVIEW_FIRST_ROLLBACK_V1',
  'rolledBack',true,
  'dataRowsDeleted',0
) as arctor_ai_a3_1_review_first_rollback;
