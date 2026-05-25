-- GPT-APP / AI-NAVIGATOR
-- P4.10.0-C8-I-D4-L-L-G
-- Atomic rollback RPC migration file.
--
-- Status:
-- - MIGRATION FILE ONLY
-- - DO NOT APPLY IN THIS STEP
-- - NO RUNTIME ROLLBACK IN THIS STEP
-- - NO ROUTE IN THIS STEP
--
-- Purpose:
-- Create a narrow atomic RPC for rolling back one value_object_state_facts row
-- and inserting the corresponding value_object_state_fact_audit_events row in
-- the same database transaction/function execution.

create or replace function public.rollback_value_object_state_fact_controlled(
  p_user_id uuid,
  p_actor_id uuid,
  p_value_object_id uuid,
  p_state_fact_id uuid,
  p_reason text,
  p_request_trace_id text,
  p_idempotency_key text,
  p_source_route text,
  p_helper_version text,
  p_contract_version text,
  p_d4_gate_version text,
  p_rollback_at timestamptz,
  p_evidence_json jsonb default '{}'::jsonb,
  p_metadata_json jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_fact record;
  v_existing_audit_event_id uuid;
  v_audit_event_id uuid;
  v_previous_metadata jsonb;
  v_rollback_metadata jsonb;
  v_new_metadata jsonb;
  v_audit_metadata jsonb;
  v_rows_updated integer := 0;
begin
  if p_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'reason', 'p_user_id is required',
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0
    );
  end if;

  if p_value_object_id is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'reason', 'p_value_object_id is required',
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0
    );
  end if;

  if p_state_fact_id is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'reason', 'p_state_fact_id is required',
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0
    );
  end if;

  if nullif(btrim(p_reason), '') is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'reason', 'p_reason is required',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0
    );
  end if;

  if nullif(btrim(p_request_trace_id), '') is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'reason', 'p_request_trace_id is required',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0
    );
  end if;

  if nullif(btrim(p_idempotency_key), '') is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'reason', 'p_idempotency_key is required',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0
    );
  end if;

  if nullif(btrim(p_source_route), '') is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'reason', 'p_source_route is required',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0
    );
  end if;

  if nullif(btrim(p_helper_version), '') is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'reason', 'p_helper_version is required',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0
    );
  end if;

  if nullif(btrim(p_contract_version), '') is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'reason', 'p_contract_version is required',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0
    );
  end if;

  if nullif(btrim(p_d4_gate_version), '') is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'reason', 'p_d4_gate_version is required',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0
    );
  end if;

  if p_rollback_at is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'reason', 'p_rollback_at is required',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0
    );
  end if;

  select ae.id
    into v_existing_audit_event_id
  from public.value_object_state_fact_audit_events ae
  where ae.user_id = p_user_id
    and ae.state_fact_id = p_state_fact_id
    and ae.action_type = 'rolled_back'
    and ae.idempotency_key = p_idempotency_key
  limit 1;

  if v_existing_audit_event_id is not null then
    return jsonb_build_object(
      'ok', true,
      'status', 'already_rolled_back',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'auditEventId', v_existing_audit_event_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0,
      'reason', 'Matching rollback audit event already exists.'
    );
  end if;

  select sf.id,
         sf.user_id,
         sf.value_object_id,
         sf.dimension_key,
         sf.correction_status,
         sf.valid_to,
         sf.metadata_json
    into v_fact
  from public.value_object_state_facts sf
  where sf.id = p_state_fact_id
    and sf.value_object_id = p_value_object_id
    and sf.user_id = p_user_id
  for update;

  if v_fact.id is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'rejected_fact_not_found',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0,
      'reason', 'No state fact found for stateFactId + valueObjectId + userId. No stateFactId-alone authorization was performed.'
    );
  end if;

  select ae.id
    into v_existing_audit_event_id
  from public.value_object_state_fact_audit_events ae
  where ae.user_id = p_user_id
    and ae.state_fact_id = p_state_fact_id
    and ae.action_type = 'rolled_back'
    and ae.idempotency_key = p_idempotency_key
  limit 1;

  if v_existing_audit_event_id is not null then
    return jsonb_build_object(
      'ok', true,
      'status', 'already_rolled_back',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'auditEventId', v_existing_audit_event_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0,
      'reason', 'Matching rollback audit event already exists after target lock.'
    );
  end if;

  if v_fact.correction_status = 'rolled_back' then
    return jsonb_build_object(
      'ok', false,
      'status', 'rejected_invalid_state',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0,
      'reason', 'State fact is already rolled back without a matching idempotency key.'
    );
  end if;

  v_previous_metadata := coalesce(v_fact.metadata_json, '{}'::jsonb);

  v_rollback_metadata := jsonb_build_object(
    'requestedAt', p_rollback_at,
    'reason', p_reason,
    'requestTraceId', p_request_trace_id,
    'idempotencyKey', p_idempotency_key,
    'sourceRoute', p_source_route,
    'helperVersion', p_helper_version,
    'contractVersion', p_contract_version,
    'd4GateVersion', p_d4_gate_version
  );

  v_new_metadata :=
    v_previous_metadata ||
    jsonb_build_object('rollback', v_rollback_metadata);

  v_audit_metadata :=
    coalesce(p_metadata_json, '{}'::jsonb) ||
    jsonb_build_object(
      'rollback', v_rollback_metadata,
      'targetStateFact', jsonb_build_object(
        'id', v_fact.id,
        'valueObjectId', v_fact.value_object_id,
        'dimensionKey', v_fact.dimension_key,
        'previousCorrectionStatus', v_fact.correction_status,
        'previousValidTo', v_fact.valid_to
      )
    );

  update public.value_object_state_facts
  set correction_status = 'rolled_back',
      valid_to = p_rollback_at,
      metadata_json = v_new_metadata,
      updated_at = p_rollback_at
  where id = p_state_fact_id
    and value_object_id = p_value_object_id
    and user_id = p_user_id
    and (
      correction_status is null
      or correction_status <> 'rolled_back'
    );

  get diagnostics v_rows_updated = row_count;

  if v_rows_updated <> 1 then
    return jsonb_build_object(
      'ok', false,
      'status', 'rejected_invalid_state',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', v_rows_updated,
      'auditEventsCreated', 0,
      'reason', 'State fact was not updated exactly once.'
    );
  end if;

  insert into public.value_object_state_fact_audit_events (
    user_id,
    actor_id,
    value_object_id,
    state_fact_id,
    related_state_fact_id,
    dimension_key,
    action_type,
    previous_correction_status,
    new_correction_status,
    reason,
    request_trace_id,
    idempotency_key,
    source_route,
    helper_version,
    contract_version,
    d4_gate_version,
    previous_valid_to,
    new_valid_to,
    evidence_json,
    metadata_json
  )
  values (
    p_user_id,
    p_actor_id,
    p_value_object_id,
    p_state_fact_id,
    null,
    v_fact.dimension_key,
    'rolled_back',
    v_fact.correction_status,
    'rolled_back',
    p_reason,
    p_request_trace_id,
    p_idempotency_key,
    p_source_route,
    p_helper_version,
    p_contract_version,
    p_d4_gate_version,
    v_fact.valid_to,
    p_rollback_at,
    coalesce(p_evidence_json, '{}'::jsonb),
    v_audit_metadata
  )
  returning id into v_audit_event_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'rolled_back',
    'stateFactId', p_state_fact_id,
    'valueObjectId', p_value_object_id,
    'auditEventId', v_audit_event_id,
    'stateFactsUpdated', 1,
    'auditEventsCreated', 1,
    'reason', 'State fact rolled back atomically.'
  );

exception
  when unique_violation then
    select ae.id
      into v_existing_audit_event_id
    from public.value_object_state_fact_audit_events ae
    where ae.user_id = p_user_id
      and ae.state_fact_id = p_state_fact_id
      and ae.action_type = 'rolled_back'
      and ae.idempotency_key = p_idempotency_key
    limit 1;

    if v_existing_audit_event_id is not null then
      return jsonb_build_object(
        'ok', true,
        'status', 'already_rolled_back',
        'stateFactId', p_state_fact_id,
        'valueObjectId', p_value_object_id,
        'auditEventId', v_existing_audit_event_id,
        'stateFactsUpdated', 0,
        'auditEventsCreated', 0,
        'reason', 'Rollback already recorded by idempotency backstop.'
      );
    end if;

    return jsonb_build_object(
      'ok', false,
      'status', 'rejected_idempotency_conflict',
      'stateFactId', p_state_fact_id,
      'valueObjectId', p_value_object_id,
      'stateFactsUpdated', 0,
      'auditEventsCreated', 0,
      'reason', 'Rollback idempotency conflict.'
    );
end;
$function$;

revoke all on function public.rollback_value_object_state_fact_controlled(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb,
  jsonb
) from public;

revoke all on function public.rollback_value_object_state_fact_controlled(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb,
  jsonb
) from anon;

revoke all on function public.rollback_value_object_state_fact_controlled(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb,
  jsonb
) from authenticated;

grant execute on function public.rollback_value_object_state_fact_controlled(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  jsonb,
  jsonb
) to service_role;
