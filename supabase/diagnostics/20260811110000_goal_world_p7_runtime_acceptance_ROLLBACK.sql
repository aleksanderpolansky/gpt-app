-- ARCTor.app — P7 Goal World Persistence Runtime Acceptance
-- Transactional fixture with automatic rollback through a caught subtransaction.
--
-- This script:
-- - reuses one existing actor-owned Value Object as a reference only;
-- - writes an isolated Goal World fixture inside a PL/pgSQL subtransaction;
-- - tests two revisions of the SAME world (100 -> 95);
-- - tests deep intermediate/supporting objectives;
-- - tests proposal-only hidden-goal hypothesis;
-- - tests important database guards with deliberately invalid writes;
-- - intentionally raises and catches P7_RUNTIME_ROLLBACK_SENTINEL;
-- - verifies that all fixture rows were rolled back;
-- - returns one result table.
--
-- It does NOT call OpenAI or the web.
-- Expected: every returned row has passed=true.

create or replace function pg_temp.p7_goal_world_runtime_acceptance()
returns table(
  check_name text,
  passed boolean,
  detail text
)
language plpgsql
as $function$
declare
  v_actor_id uuid;
  v_value_object_id uuid;

  v_world_id uuid := gen_random_uuid();

  v_statement_1 uuid := gen_random_uuid();
  v_definition_1 uuid := gen_random_uuid();
  v_revision_1 uuid := gen_random_uuid();
  v_terminal_1 uuid := gen_random_uuid();

  v_statement_2 uuid := gen_random_uuid();
  v_definition_2 uuid := gen_random_uuid();
  v_revision_2 uuid := gen_random_uuid();
  v_terminal_2 uuid := gen_random_uuid();
  v_intermediate_2 uuid := gen_random_uuid();
  v_supporting_2 uuid := gen_random_uuid();
  v_hypothesis_2 uuid := gen_random_uuid();

  v_results jsonb := '[]'::jsonb;

  v_vo_before jsonb;
  v_vo_after jsonb;

  v_rejected boolean;
  v_error text;

  v_revision_count integer;
  v_terminal_count integer;
  v_target_100 numeric;
  v_target_95 numeric;
begin
  select
    vo.owner_actor_id,
    vo.id,
    to_jsonb(vo)
  into
    v_actor_id,
    v_value_object_id,
    v_vo_before
  from public.value_objects vo
  join public.actors actor
    on actor.id = vo.owner_actor_id
  where vo.owner_actor_id is not null
    and actor.status = 'active'
  order by vo.created_at nulls last, vo.id
  limit 1;

  if v_actor_id is null
     or v_value_object_id is null then
    return query
    select
      '01_fixture_prerequisite_actor_owned_value_object',
      false,
      'No active actor-owned Value Object exists for a rollback-only P7 fixture.';
    return;
  end if;

  v_results := v_results || jsonb_build_array(
    jsonb_build_object(
      'check_name',
      '01_fixture_prerequisite_actor_owned_value_object',
      'passed',
      true,
      'detail',
      'Reused existing actor/value-object references without modifying them.'
    )
  );

  /*
  Everything inside this nested block is deliberately rolled back by the
  sentinel exception at the end. PL/pgSQL variables survive the rollback,
  allowing the result report to be returned afterwards.
  */
  begin
    insert into public.goal_worlds (
      id,
      owner_actor_id,
      lifecycle_status_code,
      current_revision_id,
      current_revision_number
    )
    values (
      v_world_id,
      v_actor_id,
      'definition_ready',
      null,
      0
    );

    /*
    Revision 1 — user initially states 100.
    */
    insert into public.goal_world_goal_statements (
      id,
      goal_world_id,
      owner_actor_id,
      exact_text
    )
    values (
      v_statement_1,
      v_world_id,
      v_actor_id,
      'I want to reach 100.'
    );

    insert into public.goal_world_goal_definitions (
      id,
      goal_world_id,
      owner_actor_id,
      source_goal_statement_id,
      schema_version,
      definition_json,
      completeness_percent
    )
    values (
      v_definition_1,
      v_world_id,
      v_actor_id,
      v_statement_1,
      1,
      jsonb_build_object(
        'sourceGoalText',
        'I want to reach 100.',
        'goal',
        jsonb_build_object(
          'statusCode',
          'known',
          'value',
          'Reach 100'
        )
      ),
      80
    );

    insert into public.goal_world_revisions (
      id,
      goal_world_id,
      owner_actor_id,
      revision_number,
      previous_revision_id,
      source_goal_statement_id,
      goal_definition_revision_id,
      revision_reason_code
    )
    values (
      v_revision_1,
      v_world_id,
      v_actor_id,
      1,
      null,
      v_statement_1,
      v_definition_1,
      'initial_definition'
    );

    insert into public.goal_world_objectives (
      id,
      goal_world_revision_id,
      owner_actor_id,
      objective_role_code,
      parent_objective_id,
      primary_target_value_object_id,
      label,
      origin_code
    )
    values (
      v_terminal_1,
      v_revision_1,
      v_actor_id,
      'terminal',
      null,
      v_value_object_id,
      'Reach 100',
      'actor_declared_terminal'
    );

    insert into public.goal_world_object_memberships (
      goal_world_revision_id,
      owner_actor_id,
      value_object_id,
      role_codes,
      orientation_code,
      objective_ids,
      note
    )
    values (
      v_revision_1,
      v_actor_id,
      v_value_object_id,
      array['target','indicator']::text[],
      'approach',
      array[v_terminal_1]::uuid[],
      'P7 rollback-only runtime fixture'
    );

    insert into public.goal_world_target_criteria (
      goal_world_revision_id,
      owner_actor_id,
      objective_id,
      value_object_id,
      parameter_code,
      comparator_code,
      target_value_json,
      unit_code,
      definition_text
    )
    values (
      v_revision_1,
      v_actor_id,
      v_terminal_1,
      v_value_object_id,
      'fixture_target',
      'eq',
      to_jsonb(100::numeric),
      null,
      'Initial target in revision 1'
    );

    update public.goal_worlds
    set
      current_revision_id = v_revision_1,
      current_revision_number = 1
    where id = v_world_id;

    /*
    Revision 2 — ordinary refinement of the SAME world: 100 -> 95.
    */
    insert into public.goal_world_goal_statements (
      id,
      goal_world_id,
      owner_actor_id,
      exact_text
    )
    values (
      v_statement_2,
      v_world_id,
      v_actor_id,
      'I want to refine the target to 95.'
    );

    insert into public.goal_world_goal_definitions (
      id,
      goal_world_id,
      owner_actor_id,
      source_goal_statement_id,
      schema_version,
      definition_json,
      completeness_percent
    )
    values (
      v_definition_2,
      v_world_id,
      v_actor_id,
      v_statement_2,
      1,
      jsonb_build_object(
        'sourceGoalText',
        'I want to refine the target to 95.',
        'goal',
        jsonb_build_object(
          'statusCode',
          'known',
          'value',
          'Reach 95'
        )
      ),
      80
    );

    insert into public.goal_world_revisions (
      id,
      goal_world_id,
      owner_actor_id,
      revision_number,
      previous_revision_id,
      source_goal_statement_id,
      goal_definition_revision_id,
      revision_reason_code
    )
    values (
      v_revision_2,
      v_world_id,
      v_actor_id,
      2,
      v_revision_1,
      v_statement_2,
      v_definition_2,
      'user_refinement'
    );

    insert into public.goal_world_objectives (
      id,
      goal_world_revision_id,
      owner_actor_id,
      objective_role_code,
      parent_objective_id,
      primary_target_value_object_id,
      label,
      origin_code
    )
    values (
      v_terminal_2,
      v_revision_2,
      v_actor_id,
      'terminal',
      null,
      v_value_object_id,
      'Reach 95',
      'actor_declared_terminal'
    );

    insert into public.goal_world_objectives (
      id,
      goal_world_revision_id,
      owner_actor_id,
      objective_role_code,
      parent_objective_id,
      primary_target_value_object_id,
      label,
      origin_code
    )
    values (
      v_intermediate_2,
      v_revision_2,
      v_actor_id,
      'intermediate',
      v_terminal_2,
      null,
      'Intermediate objective',
      'compiler_derived'
    );

    insert into public.goal_world_objectives (
      id,
      goal_world_revision_id,
      owner_actor_id,
      objective_role_code,
      parent_objective_id,
      primary_target_value_object_id,
      label,
      origin_code
    )
    values (
      v_supporting_2,
      v_revision_2,
      v_actor_id,
      'supporting',
      v_intermediate_2,
      null,
      'Supporting objective below the intermediate objective',
      'compiler_derived'
    );

    insert into public.goal_world_object_memberships (
      goal_world_revision_id,
      owner_actor_id,
      value_object_id,
      role_codes,
      orientation_code,
      objective_ids,
      note
    )
    values (
      v_revision_2,
      v_actor_id,
      v_value_object_id,
      array['target','indicator']::text[],
      'approach',
      array[
        v_terminal_2,
        v_intermediate_2,
        v_supporting_2
      ]::uuid[],
      'Same shared Value Object; revision/world role only.'
    );

    insert into public.goal_world_target_criteria (
      goal_world_revision_id,
      owner_actor_id,
      objective_id,
      value_object_id,
      parameter_code,
      comparator_code,
      target_value_json,
      unit_code,
      definition_text
    )
    values (
      v_revision_2,
      v_actor_id,
      v_terminal_2,
      v_value_object_id,
      'fixture_target',
      'eq',
      to_jsonb(95::numeric),
      null,
      'Refined target in revision 2'
    );

    insert into public.goal_world_goal_hypotheses (
      id,
      goal_world_revision_id,
      owner_actor_id,
      summary,
      status_code,
      evidence_refs_json
    )
    values (
      v_hypothesis_2,
      v_revision_2,
      v_actor_id,
      'Alternative interpretation remains only a hypothesis.',
      'proposal_only',
      jsonb_build_array(
        jsonb_build_object(
          'entityType',
          'fixture',
          'entityId',
          'p7-runtime'
        )
      )
    );

    update public.goal_worlds
    set
      current_revision_id = v_revision_2,
      current_revision_number = 2
    where id = v_world_id;

    /*
    Force the deferred "exactly one terminal" guards now.
    */
    set constraints all immediate;

    select count(*)
    into v_revision_count
    from public.goal_world_revisions
    where goal_world_id = v_world_id;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '02_two_revisions_same_world',
        'passed',
        v_revision_count = 2,
        'detail',
        '100 -> 95 produced two immutable revisions under one stable world id.'
      )
    );

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '03_current_pointer_is_revision_2',
        'passed',
        exists (
          select 1
          from public.goal_worlds
          where id = v_world_id
            and current_revision_id = v_revision_2
            and current_revision_number = 2
        ),
        'detail',
        'Stable world points to the refined revision.'
      )
    );

    select
      (target_value_json #>> '{}')::numeric
    into v_target_100
    from public.goal_world_target_criteria
    where goal_world_revision_id = v_revision_1
      and objective_id = v_terminal_1;

    select
      (target_value_json #>> '{}')::numeric
    into v_target_95
    from public.goal_world_target_criteria
    where goal_world_revision_id = v_revision_2
      and objective_id = v_terminal_2;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '04_target_history_100_then_95',
        'passed',
        v_target_100 = 100
        and v_target_95 = 95,
        'detail',
        'Old desired target remains 100 while the new revision stores 95.'
      )
    );

    select count(*)
    into v_terminal_count
    from public.goal_world_objectives
    where goal_world_revision_id in (
      v_revision_1,
      v_revision_2
    )
      and objective_role_code = 'terminal'
      and origin_code = 'actor_declared_terminal';

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '05_exactly_one_terminal_per_revision',
        'passed',
        v_terminal_count = 2
        and exists (
          select 1
          from public.goal_world_objectives
          where goal_world_revision_id = v_revision_1
            and objective_role_code = 'terminal'
          group by goal_world_revision_id
          having count(*) = 1
        )
        and exists (
          select 1
          from public.goal_world_objectives
          where goal_world_revision_id = v_revision_2
            and objective_role_code = 'terminal'
          group by goal_world_revision_id
          having count(*) = 1
        ),
        'detail',
        'Each revision contains exactly one actor-declared terminal objective.'
      )
    );

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '06_deep_subgoal_hierarchy',
        'passed',
        exists (
          select 1
          from public.goal_world_objectives intermediate
          join public.goal_world_objectives supporting
            on supporting.parent_objective_id = intermediate.id
          where intermediate.id = v_intermediate_2
            and intermediate.parent_objective_id = v_terminal_2
            and intermediate.objective_role_code = 'intermediate'
            and supporting.id = v_supporting_2
            and supporting.objective_role_code = 'supporting'
        ),
        'detail',
        'terminal -> intermediate -> supporting hierarchy persisted.'
      )
    );

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '07_hypothesis_is_proposal_only',
        'passed',
        exists (
          select 1
          from public.goal_world_goal_hypotheses
          where id = v_hypothesis_2
            and status_code = 'proposal_only'
        ),
        'detail',
        'Alternative/hidden-goal interpretation remains a proposal-only artifact.'
      )
    );

    /*
    Negative guard: a second terminal objective in the same revision.
    */
    v_rejected := false;
    v_error := null;

    begin
      insert into public.goal_world_objectives (
        goal_world_revision_id,
        owner_actor_id,
        objective_role_code,
        parent_objective_id,
        primary_target_value_object_id,
        label,
        origin_code
      )
      values (
        v_revision_2,
        v_actor_id,
        'terminal',
        null,
        v_value_object_id,
        'Forbidden second terminal',
        'actor_declared_terminal'
      );
    exception
      when unique_violation then
        v_rejected := true;
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '08_second_terminal_rejected',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'second terminal was unexpectedly accepted')
      )
    );

    /*
    Negative guard: normalized definition may not lie about the exact source
    statement from which it came.
    */
    v_rejected := false;
    v_error := null;

    begin
      insert into public.goal_world_goal_definitions (
        goal_world_id,
        owner_actor_id,
        source_goal_statement_id,
        schema_version,
        definition_json,
        completeness_percent
      )
      values (
        v_world_id,
        v_actor_id,
        v_statement_2,
        1,
        jsonb_build_object(
          'sourceGoalText',
          'This text does not match the immutable source statement.'
        ),
        80
      );
    exception
      when check_violation then
        v_rejected := sqlerrm =
          'P7_GOAL_DEFINITION_SOURCE_TEXT_MISMATCH';
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '09_definition_source_text_mismatch_rejected',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'mismatched source text was unexpectedly accepted')
      )
    );

    /*
    Negative guard: revision 3 may not skip revision 2 as its predecessor.
    */
    v_rejected := false;
    v_error := null;

    begin
      insert into public.goal_world_revisions (
        goal_world_id,
        owner_actor_id,
        revision_number,
        previous_revision_id,
        source_goal_statement_id,
        goal_definition_revision_id,
        revision_reason_code
      )
      values (
        v_world_id,
        v_actor_id,
        3,
        v_revision_1,
        v_statement_2,
        v_definition_2,
        'user_refinement'
      );
    exception
      when check_violation then
        v_rejected := sqlerrm =
          'P7_GOAL_REVISION_PREVIOUS_MISMATCH';
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '10_revision_chain_skip_rejected',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'revision chain skip was unexpectedly accepted')
      )
    );

    /*
    Negative guard: an objective in revision 2 may not use a parent from
    revision 1.
    */
    v_rejected := false;
    v_error := null;

    begin
      insert into public.goal_world_objectives (
        goal_world_revision_id,
        owner_actor_id,
        objective_role_code,
        parent_objective_id,
        primary_target_value_object_id,
        label,
        origin_code
      )
      values (
        v_revision_2,
        v_actor_id,
        'intermediate',
        v_terminal_1,
        null,
        'Forbidden cross-revision child',
        'compiler_derived'
      );
    exception
      when check_violation then
        v_rejected := sqlerrm =
          'P7_OBJECTIVE_PARENT_REVISION_MISMATCH';
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '11_cross_revision_parent_rejected',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'cross-revision parent was unexpectedly accepted')
      )
    );

    /*
    Negative guard: historical revision rows are immutable.
    */
    v_rejected := false;
    v_error := null;

    begin
      update public.goal_world_revisions
      set revision_reason_code = 'other'
      where id = v_revision_2;
    exception
      when others then
        v_rejected := sqlerrm =
          'P7_GOAL_WORLD_REVISION_HISTORY_IMMUTABLE';
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '12_revision_history_update_rejected',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'historical revision update was unexpectedly accepted')
      )
    );

    /*
    Negative guard: once world has advanced to revision 2, the current pointer
    cannot be moved backwards to revision 1.
    */
    v_rejected := false;
    v_error := null;

    begin
      update public.goal_worlds
      set
        current_revision_id = v_revision_1,
        current_revision_number = 1
      where id = v_world_id;
    exception
      when check_violation then
        v_rejected := sqlerrm =
          'P7_GOAL_WORLD_REVISION_POINTER_CANNOT_MOVE_BACKWARD';
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '13_current_revision_pointer_cannot_move_backward',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'backward pointer move was unexpectedly accepted')
      )
    );

    /*
    Negative guard: a hidden-goal hypothesis cannot be made active.
    */
    v_rejected := false;
    v_error := null;

    begin
      insert into public.goal_world_goal_hypotheses (
        goal_world_revision_id,
        owner_actor_id,
        summary,
        status_code,
        evidence_refs_json
      )
      values (
        v_revision_2,
        v_actor_id,
        'Forbidden active hidden goal.',
        'active',
        '[]'::jsonb
      );
    exception
      when check_violation then
        v_rejected := true;
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '14_active_hidden_goal_rejected',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'active hidden-goal status was unexpectedly accepted')
      )
    );

    /*
    Goal World must only reference the shared Value Object. The underlying
    Reality object must remain byte-for-byte unchanged.
    */
    select to_jsonb(vo)
    into v_vo_after
    from public.value_objects vo
    where vo.id = v_value_object_id;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '15_shared_value_object_not_modified',
        'passed',
        v_vo_before = v_vo_after,
        'detail',
        'Goal World membership/criteria referenced the shared Value Object without changing it.'
      )
    );

    /*
    Sentinel: rollback every fixture row above while preserving local
    v_results for the outer exception handler.
    */
    raise exception using
      errcode = 'P0001',
      message = 'P7_RUNTIME_ROLLBACK_SENTINEL';

  exception
    when others then
      if sqlerrm <> 'P7_RUNTIME_ROLLBACK_SENTINEL' then
        raise;
      end if;
  end;

  /*
  Prove that the subtransaction rollback left no Goal World fixture rows.
  */
  v_results := v_results || jsonb_build_array(
    jsonb_build_object(
      'check_name',
      '16_fixture_fully_rolled_back',
      'passed',
      not exists (
        select 1
        from public.goal_worlds
        where id = v_world_id
      )
      and not exists (
        select 1
        from public.goal_world_revisions
        where id in (
          v_revision_1,
          v_revision_2
        )
      )
      and not exists (
        select 1
        from public.goal_world_goal_statements
        where id in (
          v_statement_1,
          v_statement_2
        )
      ),
      'detail',
      'Runtime acceptance left no persistent Goal World fixture rows.'
    )
  );

  return query
  select
    item ->> 'check_name',
    (item ->> 'passed')::boolean,
    item ->> 'detail'
  from jsonb_array_elements(v_results) item;
end;
$function$;


select
  check_name,
  passed,
  detail
from pg_temp.p7_goal_world_runtime_acceptance()
order by
  substring(check_name from '^[0-9]+')::integer,
  check_name;
