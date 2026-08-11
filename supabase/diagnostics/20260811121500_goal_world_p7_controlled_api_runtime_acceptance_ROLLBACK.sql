-- ARCTor.app — P7 Controlled Goal World API
-- RPC Runtime Acceptance — ROLLBACK ONLY
--
-- Preconditions:
-- - P7 persistence foundation installed
-- - P7 controlled API migration postcheck = 14/14 PASS
--
-- This test exercises the actual create/revise database API:
--   create_goal_world_v1(uuid,jsonb)
--   revise_goal_world_v1(uuid,uuid,integer,jsonb)
--
-- All fixture writes occur inside a caught PL/pgSQL subtransaction and are
-- intentionally rolled back by P7_CONTROLLED_API_RUNTIME_ROLLBACK_SENTINEL.
--
-- Expected result: 18 rows; every passed=true.

create or replace function pg_temp.p7_controlled_api_runtime_acceptance()
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
  v_vo_before jsonb;
  v_vo_after jsonb;

  v_create jsonb;
  v_revise jsonb;
  v_world_id uuid;
  v_revision_1 uuid;
  v_revision_2 uuid;

  v_t1 uuid := gen_random_uuid();
  v_c1 uuid := gen_random_uuid();

  v_t2 uuid := gen_random_uuid();
  v_i2 uuid := gen_random_uuid();
  v_s2 uuid := gen_random_uuid();
  v_c2 uuid := gen_random_uuid();
  v_h2 uuid := gen_random_uuid();

  v_bad_t uuid;
  v_bad_c uuid;

  v_payload_1 jsonb;
  v_payload_2 jsonb;

  v_results jsonb := '[]'::jsonb;

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
      'No active actor-owned Value Object exists for rollback-only API acceptance.';
    return;
  end if;

  v_results := v_results || jsonb_build_array(
    jsonb_build_object(
      'check_name',
      '01_fixture_prerequisite_actor_owned_value_object',
      'passed',
      true,
      'detail',
      'Existing actor/Value Object selected by reference; it will not be modified.'
    )
  );

  v_payload_1 := jsonb_build_object(
    'sourceGoalText',
    'P7 runtime target 100',
    'goalDefinitionJson',
    jsonb_build_object(
      'sourceGoalText',
      'P7 runtime target 100',
      'goal',
      jsonb_build_object(
        'statusCode',
        'known',
        'value',
        'Reach 100'
      )
    ),
    'methodologyTraceJson',
    null,
    'completenessPercent',
    80,
    'lifecycleStatusCode',
    'definition_ready',
    'revisionReasonCode',
    'initial_definition',
    'unknownCodes',
    jsonb_build_array('timeframe'),
    'protocolRefs',
    jsonb_build_array(
      jsonb_build_object(
        'protocolCode',
        'goal_intake_protocol',
        'version',
        1,
        'contentHash',
        null
      )
    ),
    'objectives',
    jsonb_build_array(
      jsonb_build_object(
        'objectiveId',
        v_t1,
        'objectiveRoleCode',
        'terminal',
        'parentObjectiveId',
        null,
        'primaryTargetValueObjectId',
        v_value_object_id,
        'label',
        'Reach 100',
        'originCode',
        'actor_declared_terminal'
      )
    ),
    'objectMemberships',
    jsonb_build_array(
      jsonb_build_object(
        'valueObjectId',
        v_value_object_id,
        'roleCodes',
        jsonb_build_array('target','indicator'),
        'orientationCode',
        'approach',
        'objectiveIds',
        jsonb_build_array(v_t1),
        'note',
        'P7 controlled API rollback fixture'
      )
    ),
    'targetCriteria',
    jsonb_build_array(
      jsonb_build_object(
        'criterionId',
        v_c1,
        'objectiveId',
        v_t1,
        'valueObjectId',
        v_value_object_id,
        'parameterCode',
        'fixture_target',
        'comparatorCode',
        'eq',
        'targetValue',
        100,
        'targetValueUpper',
        null,
        'unitCode',
        null,
        'definitionText',
        'Initial runtime API target',
        'ruleRef',
        null
      )
    ),
    'goalHypotheses',
    '[]'::jsonb
  );

  v_payload_2 := jsonb_build_object(
    'sourceGoalText',
    'P7 runtime target refined to 95',
    'goalDefinitionJson',
    jsonb_build_object(
      'sourceGoalText',
      'P7 runtime target refined to 95',
      'goal',
      jsonb_build_object(
        'statusCode',
        'known',
        'value',
        'Reach 95'
      )
    ),
    'methodologyTraceJson',
    jsonb_build_object(
      'fixture',
      'p7-controlled-api-runtime'
    ),
    'completenessPercent',
    90,
    'lifecycleStatusCode',
    'active',
    'revisionReasonCode',
    'user_refinement',
    'unknownCodes',
    '[]'::jsonb,
    'protocolRefs',
    jsonb_build_array(
      jsonb_build_object(
        'protocolCode',
        'goal_intake_protocol',
        'version',
        1,
        'contentHash',
        null
      )
    ),
    'objectives',
    jsonb_build_array(
      jsonb_build_object(
        'objectiveId',
        v_t2,
        'objectiveRoleCode',
        'terminal',
        'parentObjectiveId',
        null,
        'primaryTargetValueObjectId',
        v_value_object_id,
        'label',
        'Reach 95',
        'originCode',
        'actor_declared_terminal'
      ),
      jsonb_build_object(
        'objectiveId',
        v_i2,
        'objectiveRoleCode',
        'intermediate',
        'parentObjectiveId',
        v_t2,
        'primaryTargetValueObjectId',
        null,
        'label',
        'Intermediate runtime objective',
        'originCode',
        'compiler_derived'
      ),
      jsonb_build_object(
        'objectiveId',
        v_s2,
        'objectiveRoleCode',
        'supporting',
        'parentObjectiveId',
        v_i2,
        'primaryTargetValueObjectId',
        null,
        'label',
        'Supporting runtime objective',
        'originCode',
        'compiler_derived'
      )
    ),
    'objectMemberships',
    jsonb_build_array(
      jsonb_build_object(
        'valueObjectId',
        v_value_object_id,
        'roleCodes',
        jsonb_build_array('target','indicator'),
        'orientationCode',
        'approach',
        'objectiveIds',
        jsonb_build_array(v_t2,v_i2,v_s2),
        'note',
        'Same shared Value Object in revision 2'
      )
    ),
    'targetCriteria',
    jsonb_build_array(
      jsonb_build_object(
        'criterionId',
        v_c2,
        'objectiveId',
        v_t2,
        'valueObjectId',
        v_value_object_id,
        'parameterCode',
        'fixture_target',
        'comparatorCode',
        'eq',
        'targetValue',
        95,
        'targetValueUpper',
        null,
        'unitCode',
        null,
        'definitionText',
        'Refined runtime API target',
        'ruleRef',
        null
      )
    ),
    'goalHypotheses',
    jsonb_build_array(
      jsonb_build_object(
        'hypothesisId',
        v_h2,
        'summary',
        'Alternative interpretation remains only a proposal.',
        'statusCode',
        'proposal_only',
        'evidenceRefs',
        jsonb_build_array(
          jsonb_build_object(
            'entityType',
            'fixture',
            'entityId',
            'p7-controlled-api-runtime'
          )
        )
      )
    )
  );

  /*
  Everything below is rolled back by the sentinel at the end of the nested
  block. PL/pgSQL result variables remain available to the outer block.
  */
  begin
    v_create :=
      public.create_goal_world_v1(
        v_actor_id,
        v_payload_1
      );

    v_world_id :=
      (v_create ->> 'worldId')::uuid;

    v_revision_1 :=
      (v_create ->> 'revisionId')::uuid;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '02_create_rpc_returns_revision_1',
        'passed',
        (v_create ->> 'revisionNumber')::integer = 1
          and v_world_id is not null
          and v_revision_1 is not null,
        'detail',
        v_create::text
      )
    );

    v_revise :=
      public.revise_goal_world_v1(
        v_actor_id,
        v_world_id,
        1,
        v_payload_2
      );

    v_revision_2 :=
      (v_revise ->> 'revisionId')::uuid;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '03_revise_rpc_returns_revision_2_same_world',
        'passed',
        (v_revise ->> 'worldId')::uuid = v_world_id
          and (v_revise ->> 'revisionNumber')::integer = 2
          and v_revision_2 is not null
          and v_revision_2 <> v_revision_1,
        'detail',
        v_revise::text
      )
    );

    /*
    Negative RPC: stale client may not append over a newer revision.
    */
    v_rejected := false;
    v_error := null;

    begin
      perform public.revise_goal_world_v1(
        v_actor_id,
        v_world_id,
        1,
        v_payload_2
      );
    exception
      when serialization_failure then
        v_rejected :=
          sqlerrm = 'P7_GOAL_WORLD_EXPECTED_REVISION_MISMATCH';
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '04_stale_revision_rejected',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'stale revision was unexpectedly accepted')
      )
    );

    /*
    Negative RPC: wrong actor may not revise an owned world.
    */
    v_rejected := false;
    v_error := null;

    begin
      perform public.revise_goal_world_v1(
        gen_random_uuid(),
        v_world_id,
        2,
        v_payload_2
      );
    exception
      when insufficient_privilege then
        v_rejected :=
          sqlerrm = 'P7_GOAL_WORLD_NOT_FOUND_OR_NOT_OWNED';
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '05_wrong_actor_revision_rejected',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'wrong actor revision was unexpectedly accepted')
      )
    );

    /*
    Negative create: caller cannot invent a nonexistent owner actor.
    */
    v_rejected := false;
    v_error := null;

    begin
      perform public.create_goal_world_v1(
        gen_random_uuid(),
        v_payload_1
      );
    exception
      when insufficient_privilege then
        v_rejected :=
          sqlerrm = 'P7_GOAL_WORLD_OWNER_ACTOR_INVALID';
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '06_invalid_owner_actor_rejected',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'invalid owner actor was unexpectedly accepted')
      )
    );

    /*
    Negative create: normalized Goal Definition must preserve exact source text.
    */
    v_rejected := false;
    v_error := null;

    begin
      perform public.create_goal_world_v1(
        v_actor_id,
        jsonb_set(
          v_payload_1,
          '{goalDefinitionJson,sourceGoalText}',
          to_jsonb('MISMATCHED SOURCE'::text),
          true
        )
      );
    exception
      when check_violation then
        v_rejected :=
          sqlerrm =
            'P7_CONTROLLED_API_GOAL_DEFINITION_SOURCE_TEXT_MISMATCH';
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '07_definition_source_text_mismatch_rejected',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'source mismatch was unexpectedly accepted')
      )
    );

    /*
    Negative create: random/non-owned/non-global VO cannot enter a Goal World.
    Constraints remain deferred here, so the VO guard is reached before the
    terminal deferred guard.
    */
    v_bad_t := gen_random_uuid();
    v_bad_c := gen_random_uuid();
    v_rejected := false;
    v_error := null;

    begin
      perform public.create_goal_world_v1(
        v_actor_id,
        jsonb_build_object(
          'sourceGoalText',
          'P7 inaccessible VO test',
          'goalDefinitionJson',
          jsonb_build_object(
            'sourceGoalText',
            'P7 inaccessible VO test'
          ),
          'methodologyTraceJson',
          null,
          'completenessPercent',
          50,
          'lifecycleStatusCode',
          'definition_ready',
          'revisionReasonCode',
          'initial_definition',
          'unknownCodes',
          '[]'::jsonb,
          'protocolRefs',
          '[]'::jsonb,
          'objectives',
          jsonb_build_array(
            jsonb_build_object(
              'objectiveId',
              v_bad_t,
              'objectiveRoleCode',
              'terminal',
              'parentObjectiveId',
              null,
              'primaryTargetValueObjectId',
              gen_random_uuid(),
              'label',
              'Forbidden inaccessible VO',
              'originCode',
              'actor_declared_terminal'
            )
          ),
          'objectMemberships',
          '[]'::jsonb,
          'targetCriteria',
          '[]'::jsonb,
          'goalHypotheses',
          '[]'::jsonb
        )
      );
    exception
      when insufficient_privilege then
        v_rejected :=
          sqlerrm = 'P7_VALUE_OBJECT_NOT_ACCESSIBLE';
        v_error := sqlerrm;
    end;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '08_inaccessible_value_object_rejected',
        'passed',
        v_rejected,
        'detail',
        coalesce(v_error,'inaccessible Value Object was unexpectedly accepted')
      )
    );

    /*
    Now force both valid revisions' deferred exactly-one-terminal guards.
    */
    set constraints all immediate;

    select count(*)
    into v_revision_count
    from public.goal_world_revisions
    where goal_world_id = v_world_id;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '09_two_revisions_persist_inside_fixture',
        'passed',
        v_revision_count = 2,
        'detail',
        'create + revise produced exactly two immutable revision rows.'
      )
    );

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '10_world_pointer_and_lifecycle_advanced',
        'passed',
        exists (
          select 1
          from public.goal_worlds
          where id = v_world_id
            and owner_actor_id = v_actor_id
            and current_revision_id = v_revision_2
            and current_revision_number = 2
            and lifecycle_status_code = 'active'
        ),
        'detail',
        'Stable world points to revision 2 and accepted lifecycle change.'
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
        '11_exactly_one_terminal_each_revision',
        'passed',
        v_terminal_count = 2,
        'detail',
        'Deferred terminal guards passed for both RPC-created revisions.'
      )
    );

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '12_deep_subgoal_hierarchy_via_rpc',
        'passed',
        exists (
          select 1
          from public.goal_world_objectives i
          join public.goal_world_objectives s
            on s.parent_objective_id = i.id
          where i.id = v_i2
            and i.goal_world_revision_id = v_revision_2
            and i.parent_objective_id = v_t2
            and i.objective_role_code = 'intermediate'
            and s.id = v_s2
            and s.objective_role_code = 'supporting'
        ),
        'detail',
        'terminal -> intermediate -> supporting stored through revise RPC.'
      )
    );

    select
      (target_value_json #>> '{}')::numeric
    into v_target_100
    from public.goal_world_target_criteria
    where goal_world_revision_id = v_revision_1
      and id = v_c1;

    select
      (target_value_json #>> '{}')::numeric
    into v_target_95
    from public.goal_world_target_criteria
    where goal_world_revision_id = v_revision_2
      and id = v_c2;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '13_target_history_100_to_95',
        'passed',
        v_target_100 = 100
          and v_target_95 = 95,
        'detail',
        'Revision 1 target remains 100; revision 2 target is 95.'
      )
    );

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '14_unknown_codes_and_protocol_refs_persist',
        'passed',
        exists (
          select 1
          from public.goal_world_revisions
          where id = v_revision_1
            and unknown_codes = array['timeframe']::text[]
            and jsonb_array_length(protocol_refs_json) = 1
        )
        and exists (
          select 1
          from public.goal_world_revisions
          where id = v_revision_2
            and unknown_codes = '{}'::text[]
            and jsonb_array_length(protocol_refs_json) = 1
        ),
        'detail',
        'P7 card fields added by controlled API migration round-trip in database.'
      )
    );

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '15_hypothesis_remains_proposal_only',
        'passed',
        exists (
          select 1
          from public.goal_world_goal_hypotheses
          where id = v_h2
            and goal_world_revision_id = v_revision_2
            and status_code = 'proposal_only'
        ),
        'detail',
        'Alternative/hidden-goal artifact stays proposal_only through RPC.'
      )
    );

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '16_shared_value_object_is_reference_only',
        'passed',
        exists (
          select 1
          from public.goal_world_object_memberships
          where goal_world_revision_id = v_revision_2
            and value_object_id = v_value_object_id
        ),
        'detail',
        'Goal World stores a reference to the shared Reality Graph Value Object.'
      )
    );

    select to_jsonb(vo)
    into v_vo_after
    from public.value_objects vo
    where vo.id = v_value_object_id;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'check_name',
        '17_shared_value_object_not_modified',
        'passed',
        v_vo_before = v_vo_after,
        'detail',
        'Controlled create/revise RPCs did not mutate the referenced Value Object.'
      )
    );

    raise exception using
      errcode = 'P0001',
      message = 'P7_CONTROLLED_API_RUNTIME_ROLLBACK_SENTINEL';

  exception
    when others then
      if sqlerrm <> 'P7_CONTROLLED_API_RUNTIME_ROLLBACK_SENTINEL' then
        raise;
      end if;
  end;

  v_results := v_results || jsonb_build_array(
    jsonb_build_object(
      'check_name',
      '18_fixture_fully_rolled_back',
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
      ),
      'detail',
      'No controlled-API Goal World fixture rows remain after sentinel rollback.'
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
from pg_temp.p7_controlled_api_runtime_acceptance()
order by
  substring(check_name from '^[0-9]+')::integer,
  check_name;
