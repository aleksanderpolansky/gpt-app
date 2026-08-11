/*
ARCTor.app — Goal World Constructor
P7 Controlled Goal World API v1

Depends on:
20260811103000_goal_world_p7_persistence_foundation.sql

Adds:
- persistence of unknownCodes + protocolRefs at revision level;
- service-role-only controlled create/revise RPCs;
- no direct table writes for service_role;
- actor/Value Object ownership guards.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.goal_worlds') is null
     or to_regclass('public.goal_world_revisions') is null
     or to_regclass('public.goal_world_objectives') is null
     or to_regclass('public.value_objects') is null
     or to_regclass('public.actors') is null then
    raise exception using
      errcode = '42P01',
      message = 'P7_CONTROLLED_API_REQUIRED_FOUNDATION_MISSING';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'goal_world_revisions'
      and column_name in (
        'unknown_codes',
        'protocol_refs_json'
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_REVISION_COLUMNS_ALREADY_OR_PARTIALLY_INSTALLED';
  end if;

  if to_regprocedure(
       'public.create_goal_world_v1(uuid,jsonb)'
     ) is not null
     or to_regprocedure(
       'public.revise_goal_world_v1(uuid,uuid,integer,jsonb)'
     ) is not null then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_RPC_ALREADY_OR_PARTIALLY_INSTALLED';
  end if;
end;
$preflight$;


alter table public.goal_world_revisions
  add column unknown_codes text[] not null
    default '{}'::text[],
  add column protocol_refs_json jsonb not null
    default '[]'::jsonb,
  add constraint goal_world_revisions_protocol_refs_array_p7_check
    check (
      jsonb_typeof(protocol_refs_json) = 'array'
    );


create or replace function public.assert_goal_world_value_object_access_p7_v1(
  p_owner_actor_id uuid,
  p_value_object_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if p_value_object_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.value_objects vo
    where vo.id = p_value_object_id
      and (
        vo.owner_actor_id = p_owner_actor_id
        or vo.scope_code = 'global'
      )
  ) then
    raise exception using
      errcode = '42501',
      message = 'P7_VALUE_OBJECT_NOT_ACCESSIBLE';
  end if;
end;
$function$;


create or replace function public.insert_goal_world_revision_payload_p7_v1(
  p_owner_actor_id uuid,
  p_goal_world_id uuid,
  p_revision_number integer,
  p_previous_revision_id uuid,
  p_revision_reason_code text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_source_goal_text text;
  v_goal_definition jsonb;
  v_methodology_trace jsonb;
  v_completeness integer;
  v_unknown_codes text[];
  v_protocol_refs jsonb;

  v_statement_id uuid := gen_random_uuid();
  v_definition_id uuid := gen_random_uuid();
  v_revision_id uuid := gen_random_uuid();

  v_item jsonb;
  v_objective_id uuid;
  v_parent_objective_id uuid;
  v_primary_target_value_object_id uuid;
  v_value_object_id uuid;
  v_objective_ids uuid[];
  v_role_codes text[];
  v_target_value jsonb;
  v_target_upper jsonb;
  v_rule_ref jsonb;
  v_evidence_refs jsonb;
begin
  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_PAYLOAD_OBJECT_REQUIRED';
  end if;

  v_source_goal_text :=
    btrim(coalesce(
      p_payload ->> 'sourceGoalText',
      ''
    ));

  if v_source_goal_text = '' then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_SOURCE_TEXT_REQUIRED';
  end if;

  v_goal_definition :=
    p_payload -> 'goalDefinitionJson';

  if v_goal_definition is null
     or jsonb_typeof(v_goal_definition) <> 'object' then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_GOAL_DEFINITION_OBJECT_REQUIRED';
  end if;

  if coalesce(
       v_goal_definition ->> 'sourceGoalText',
       ''
     ) <> v_source_goal_text then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_GOAL_DEFINITION_SOURCE_TEXT_MISMATCH';
  end if;

  v_methodology_trace :=
    p_payload -> 'methodologyTraceJson';

  if v_methodology_trace = 'null'::jsonb then
    v_methodology_trace := null;
  end if;

  if v_methodology_trace is not null
     and jsonb_typeof(v_methodology_trace) <> 'object' then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_METHODOLOGY_TRACE_OBJECT_REQUIRED';
  end if;

  begin
    v_completeness :=
      (p_payload ->> 'completenessPercent')::integer;
  exception
    when others then
      raise exception using
        errcode = '23514',
        message = 'P7_CONTROLLED_API_COMPLETENESS_INVALID';
  end;

  if v_completeness < 0
     or v_completeness > 100 then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_COMPLETENESS_INVALID';
  end if;

  if coalesce(
       jsonb_typeof(
         p_payload -> 'unknownCodes'
       ),
       'array'
     ) <> 'array' then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_UNKNOWN_CODES_ARRAY_REQUIRED';
  end if;

  select coalesce(
    array_agg(value),
    '{}'::text[]
  )
  into v_unknown_codes
  from jsonb_array_elements_text(
    coalesce(
      p_payload -> 'unknownCodes',
      '[]'::jsonb
    )
  ) value;

  v_protocol_refs :=
    coalesce(
      p_payload -> 'protocolRefs',
      '[]'::jsonb
    );

  if jsonb_typeof(v_protocol_refs) <> 'array' then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_PROTOCOL_REFS_ARRAY_REQUIRED';
  end if;

  insert into public.goal_world_goal_statements (
    id,
    goal_world_id,
    owner_actor_id,
    exact_text
  )
  values (
    v_statement_id,
    p_goal_world_id,
    p_owner_actor_id,
    v_source_goal_text
  );

  insert into public.goal_world_goal_definitions (
    id,
    goal_world_id,
    owner_actor_id,
    source_goal_statement_id,
    schema_version,
    definition_json,
    completeness_percent,
    methodology_trace_json
  )
  values (
    v_definition_id,
    p_goal_world_id,
    p_owner_actor_id,
    v_statement_id,
    1,
    v_goal_definition,
    v_completeness,
    v_methodology_trace
  );

  insert into public.goal_world_revisions (
    id,
    goal_world_id,
    owner_actor_id,
    revision_number,
    previous_revision_id,
    source_goal_statement_id,
    goal_definition_revision_id,
    revision_reason_code,
    unknown_codes,
    protocol_refs_json
  )
  values (
    v_revision_id,
    p_goal_world_id,
    p_owner_actor_id,
    p_revision_number,
    p_previous_revision_id,
    v_statement_id,
    v_definition_id,
    p_revision_reason_code,
    v_unknown_codes,
    v_protocol_refs
  );

  if coalesce(
       jsonb_typeof(
         p_payload -> 'objectives'
       ),
       ''
     ) <> 'array' then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_OBJECTIVES_ARRAY_REQUIRED';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(
      p_payload -> 'objectives'
    )
  loop
    begin
      v_objective_id :=
        (v_item ->> 'objectiveId')::uuid;

      v_parent_objective_id :=
        nullif(
          v_item ->> 'parentObjectiveId',
          ''
        )::uuid;

      v_primary_target_value_object_id :=
        nullif(
          v_item ->> 'primaryTargetValueObjectId',
          ''
        )::uuid;
    exception
      when invalid_text_representation then
        raise exception using
          errcode = '22P02',
          message = 'P7_CONTROLLED_API_OBJECTIVE_UUID_INVALID';
    end;

    perform
      public.assert_goal_world_value_object_access_p7_v1(
        p_owner_actor_id,
        v_primary_target_value_object_id
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
      v_objective_id,
      v_revision_id,
      p_owner_actor_id,
      v_item ->> 'objectiveRoleCode',
      v_parent_objective_id,
      v_primary_target_value_object_id,
      v_item ->> 'label',
      v_item ->> 'originCode'
    );
  end loop;

  if coalesce(
       jsonb_typeof(
         p_payload -> 'objectMemberships'
       ),
       'array'
     ) <> 'array' then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_MEMBERSHIPS_ARRAY_REQUIRED';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(
      coalesce(
        p_payload -> 'objectMemberships',
        '[]'::jsonb
      )
    )
  loop
    begin
      v_value_object_id :=
        (v_item ->> 'valueObjectId')::uuid;

      select coalesce(
        array_agg(value::uuid),
        '{}'::uuid[]
      )
      into v_objective_ids
      from jsonb_array_elements_text(
        coalesce(
          v_item -> 'objectiveIds',
          '[]'::jsonb
        )
      ) value;
    exception
      when invalid_text_representation then
        raise exception using
          errcode = '22P02',
          message = 'P7_CONTROLLED_API_MEMBERSHIP_UUID_INVALID';
    end;

    select coalesce(
      array_agg(value),
      '{}'::text[]
    )
    into v_role_codes
    from jsonb_array_elements_text(
      coalesce(
        v_item -> 'roleCodes',
        '[]'::jsonb
      )
    ) value;

    perform
      public.assert_goal_world_value_object_access_p7_v1(
        p_owner_actor_id,
        v_value_object_id
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
      v_revision_id,
      p_owner_actor_id,
      v_value_object_id,
      v_role_codes,
      coalesce(
        v_item ->> 'orientationCode',
        'neutral'
      ),
      v_objective_ids,
      nullif(
        v_item ->> 'note',
        ''
      )
    );
  end loop;

  if coalesce(
       jsonb_typeof(
         p_payload -> 'targetCriteria'
       ),
       'array'
     ) <> 'array' then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_TARGET_CRITERIA_ARRAY_REQUIRED';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(
      coalesce(
        p_payload -> 'targetCriteria',
        '[]'::jsonb
      )
    )
  loop
    begin
      v_objective_id :=
        (v_item ->> 'objectiveId')::uuid;

      v_value_object_id :=
        (v_item ->> 'valueObjectId')::uuid;
    exception
      when invalid_text_representation then
        raise exception using
          errcode = '22P02',
          message = 'P7_CONTROLLED_API_TARGET_UUID_INVALID';
    end;

    perform
      public.assert_goal_world_value_object_access_p7_v1(
        p_owner_actor_id,
        v_value_object_id
      );

    v_target_value :=
      v_item -> 'targetValue';

    v_target_upper :=
      v_item -> 'targetValueUpper';

    v_rule_ref :=
      v_item -> 'ruleRef';

    if v_rule_ref = 'null'::jsonb then
      v_rule_ref := null;
    end if;

    insert into public.goal_world_target_criteria (
      id,
      goal_world_revision_id,
      owner_actor_id,
      objective_id,
      value_object_id,
      parameter_code,
      comparator_code,
      target_value_json,
      target_value_upper_json,
      unit_code,
      definition_text,
      rule_ref_json
    )
    values (
      (v_item ->> 'criterionId')::uuid,
      v_revision_id,
      p_owner_actor_id,
      v_objective_id,
      v_value_object_id,
      nullif(
        v_item ->> 'parameterCode',
        ''
      ),
      v_item ->> 'comparatorCode',
      v_target_value,
      v_target_upper,
      nullif(
        v_item ->> 'unitCode',
        ''
      ),
      coalesce(
        v_item ->> 'definitionText',
        ''
      ),
      v_rule_ref
    );
  end loop;

  if coalesce(
       jsonb_typeof(
         p_payload -> 'goalHypotheses'
       ),
       'array'
     ) <> 'array' then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_HYPOTHESES_ARRAY_REQUIRED';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(
      coalesce(
        p_payload -> 'goalHypotheses',
        '[]'::jsonb
      )
    )
  loop
    v_evidence_refs :=
      coalesce(
        v_item -> 'evidenceRefs',
        '[]'::jsonb
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
      (v_item ->> 'hypothesisId')::uuid,
      v_revision_id,
      p_owner_actor_id,
      v_item ->> 'summary',
      coalesce(
        v_item ->> 'statusCode',
        'proposal_only'
      ),
      v_evidence_refs
    );
  end loop;

  return v_revision_id;
end;
$function$;


create or replace function public.create_goal_world_v1(
  p_owner_actor_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_world_id uuid := gen_random_uuid();
  v_revision_id uuid;
  v_lifecycle text;
begin
  if not exists (
    select 1
    from public.actors actor
    where actor.id = p_owner_actor_id
      and actor.status = 'active'
  ) then
    raise exception using
      errcode = '42501',
      message = 'P7_GOAL_WORLD_OWNER_ACTOR_INVALID';
  end if;

  v_lifecycle :=
    coalesce(
      nullif(
        p_payload ->> 'lifecycleStatusCode',
        ''
      ),
      'definition_ready'
    );

  insert into public.goal_worlds (
    id,
    owner_actor_id,
    lifecycle_status_code,
    current_revision_id,
    current_revision_number
  )
  values (
    v_world_id,
    p_owner_actor_id,
    v_lifecycle,
    null,
    0
  );

  v_revision_id :=
    public.insert_goal_world_revision_payload_p7_v1(
      p_owner_actor_id,
      v_world_id,
      1,
      null,
      'initial_definition',
      p_payload
    );

  update public.goal_worlds
  set
    current_revision_id = v_revision_id,
    current_revision_number = 1,
    lifecycle_status_code = v_lifecycle
  where id = v_world_id
    and owner_actor_id = p_owner_actor_id;

  return jsonb_build_object(
    'worldId',
    v_world_id,
    'revisionId',
    v_revision_id,
    'revisionNumber',
    1
  );
end;
$function$;


create or replace function public.revise_goal_world_v1(
  p_owner_actor_id uuid,
  p_goal_world_id uuid,
  p_expected_current_revision_number integer,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_current_revision_id uuid;
  v_current_revision_number integer;
  v_next_revision_number integer;
  v_revision_reason text;
  v_revision_id uuid;
  v_lifecycle text;
begin
  select
    world.current_revision_id,
    world.current_revision_number,
    world.lifecycle_status_code
  into
    v_current_revision_id,
    v_current_revision_number,
    v_lifecycle
  from public.goal_worlds world
  where world.id = p_goal_world_id
    and world.owner_actor_id = p_owner_actor_id
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'P7_GOAL_WORLD_NOT_FOUND_OR_NOT_OWNED';
  end if;

  if p_expected_current_revision_number
     is distinct from v_current_revision_number then
    raise exception using
      errcode = '40001',
      message = 'P7_GOAL_WORLD_EXPECTED_REVISION_MISMATCH';
  end if;

  if v_current_revision_number < 1
     or v_current_revision_id is null then
    raise exception using
      errcode = '23514',
      message = 'P7_GOAL_WORLD_CURRENT_REVISION_REQUIRED';
  end if;

  v_revision_reason :=
    nullif(
      p_payload ->> 'revisionReasonCode',
      ''
    );

  if v_revision_reason is null
     or v_revision_reason = 'initial_definition' then
    raise exception using
      errcode = '23514',
      message = 'P7_GOAL_WORLD_REVISION_REASON_REQUIRED';
  end if;

  v_lifecycle :=
    coalesce(
      nullif(
        p_payload ->> 'lifecycleStatusCode',
        ''
      ),
      v_lifecycle
    );

  v_next_revision_number :=
    v_current_revision_number + 1;

  v_revision_id :=
    public.insert_goal_world_revision_payload_p7_v1(
      p_owner_actor_id,
      p_goal_world_id,
      v_next_revision_number,
      v_current_revision_id,
      v_revision_reason,
      p_payload
    );

  update public.goal_worlds
  set
    current_revision_id = v_revision_id,
    current_revision_number =
      v_next_revision_number,
    lifecycle_status_code =
      v_lifecycle
  where id = p_goal_world_id
    and owner_actor_id = p_owner_actor_id;

  return jsonb_build_object(
    'worldId',
    p_goal_world_id,
    'revisionId',
    v_revision_id,
    'revisionNumber',
    v_next_revision_number
  );
end;
$function$;


/*
No direct table write is added.
Only service_role may execute the controlled RPCs.
Internal helper functions are not executable through API roles.
*/

revoke all on function
  public.assert_goal_world_value_object_access_p7_v1(uuid,uuid)
from public, anon, authenticated, service_role;

revoke all on function
  public.insert_goal_world_revision_payload_p7_v1(uuid,uuid,integer,uuid,text,jsonb)
from public, anon, authenticated, service_role;

revoke all on function
  public.create_goal_world_v1(uuid,jsonb)
from public, anon, authenticated, service_role;

revoke all on function
  public.revise_goal_world_v1(uuid,uuid,integer,jsonb)
from public, anon, authenticated, service_role;

grant execute on function
  public.create_goal_world_v1(uuid,jsonb)
to service_role;

grant execute on function
  public.revise_goal_world_v1(uuid,uuid,integer,jsonb)
to service_role;


/*
Atomic install gate.
*/

do $postgate$
declare
  v_ok boolean;
begin
  with checks(passed) as (
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'goal_world_revisions'
        and column_name = 'unknown_codes'
        and data_type = 'ARRAY'
    )

    union all

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'goal_world_revisions'
        and column_name = 'protocol_refs_json'
        and data_type = 'jsonb'
    )

    union all

    select (
      select count(*)
      from pg_proc p
      join pg_namespace n
        on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'create_goal_world_v1',
          'revise_goal_world_v1'
        )
        and p.prosecdef
    ) = 2

    union all

    select (
      select count(*)
      from pg_proc p
      join pg_namespace n
        on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'create_goal_world_v1',
          'revise_goal_world_v1'
        )
        and 'search_path=public, pg_temp'
          = any(coalesce(p.proconfig,'{}'::text[]))
    ) = 2

    union all

    select
      has_function_privilege(
        'service_role',
        'public.create_goal_world_v1(uuid,jsonb)',
        'EXECUTE'
      )
      and has_function_privilege(
        'service_role',
        'public.revise_goal_world_v1(uuid,uuid,integer,jsonb)',
        'EXECUTE'
      )

    union all

    select
      not has_function_privilege(
        'anon',
        'public.create_goal_world_v1(uuid,jsonb)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'authenticated',
        'public.create_goal_world_v1(uuid,jsonb)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'anon',
        'public.revise_goal_world_v1(uuid,uuid,integer,jsonb)',
        'EXECUTE'
      )
      and not has_function_privilege(
        'authenticated',
        'public.revise_goal_world_v1(uuid,uuid,integer,jsonb)',
        'EXECUTE'
      )

    union all

    select
      not has_table_privilege(
        'service_role',
        'public.goal_worlds',
        'INSERT'
      )
      and not has_table_privilege(
        'service_role',
        'public.goal_world_revisions',
        'INSERT'
      )
  )
  select bool_and(passed)
  into v_ok
  from checks;

  if v_ok is distinct from true then
    raise exception using
      errcode = '23514',
      message = 'P7_CONTROLLED_API_ATOMIC_POSTCONDITION_FAILED';
  end if;
end;
$postgate$;

commit;
