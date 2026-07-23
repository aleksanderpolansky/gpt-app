-- ARCTor.app / Reality Model v2
-- P4 ACTOR OWNERSHIP
-- Apply only after the P4 code package has passed production build.
--
-- Purpose:
--   1. Remove test-only activity chains instead of backfilling actor context.
--   2. Require every Reality Core actor id to be owned by p_owner_user_id.
--   3. Reject attaching facts to an existing event from a different actor.
--   4. Reject Value Object ids outside the active actor's owned tree.
--   5. Keep the same atomic/idempotent save_reality_activity_v1 contract.
--
-- Current-schema compatibility:
--   activity_events
--   activity_event_measures
--   activity_object_facts
--   activity_fact_review_items
--   activity_fact_recalculation_queue
--
-- The DDL is wrapped in one transaction. Any migration error rolls back the
-- cleanup, function, grants and comment.

begin;

do $preflight$
declare
  v_required_table text;
begin
  foreach v_required_table in array array[
    'public.app_users',
    'public.actors',
    'public.actor_public_profiles',
    'public.activity_events',
    'public.activity_event_measures',
    'public.activity_object_facts',
    'public.activity_fact_review_items',
    'public.activity_fact_recalculation_queue',
    'public.value_objects'
  ]
  loop
    if to_regclass(v_required_table) is null then
      raise exception using
        errcode = '42P01',
        message = 'REALITY_V2_ACTOR_OWNERSHIP_REQUIRED_TABLE_MISSING:' ||
          v_required_table;
    end if;
  end loop;
end;
$preflight$;

/*
All current activity rows are test data and do not require preservation.
CASCADE intentionally clears measures, facts, reviews, queue entries, links
and any other test-only rows that reference public.activity_events.
*/
truncate table public.activity_events cascade;

-- event_code is also used by legacy shortcut/template routes. Only Reality
-- Core save-gate codes are idempotency keys and may be globally unique per
-- account.
drop index if exists public.activity_events_user_event_code_unique_idx;

create unique index activity_events_user_event_code_unique_idx
  on public.activity_events(user_id, event_code)
  where left(event_code, 10) = 'save_gate:';

create or replace function public.enforce_activity_event_actor_ownership_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if new.user_id is null
     or new.performed_by_actor_id is null
     or new.acting_as_actor_id is null then
    raise exception using
      errcode = '23514',
      message = 'REALITY_V2_ACTIVITY_PRIMARY_ACTOR_CONTEXT_REQUIRED';
  end if;

  if exists (
    select 1
    from (
      values
        (new.performed_by_actor_id),
        (new.acting_as_actor_id),
        (new.acting_for_actor_id)
    ) referenced_actor(actor_id)
    where referenced_actor.actor_id is not null
      and not exists (
      select 1
      from public.actor_public_profiles profile
      join public.actors actor
        on actor.id = profile.actor_id
       and actor.status = 'active'
      where profile.owner_user_id = new.user_id
        and profile.actor_id = referenced_actor.actor_id
    )
  ) then
    raise exception using
      errcode = '42501',
      message = 'REALITY_V2_ACTIVITY_ACTOR_NOT_OWNED_BY_USER';
  end if;

  return new;
end;
$function$;

drop trigger if exists activity_events_actor_ownership_v2_trg
  on public.activity_events;

create trigger activity_events_actor_ownership_v2_trg
before insert or update of
  user_id,
  performed_by_actor_id,
  acting_as_actor_id,
  acting_for_actor_id
on public.activity_events
for each row
execute function public.enforce_activity_event_actor_ownership_v2();

create or replace function public.enforce_activity_measure_actor_alignment_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_event public.activity_events%rowtype;
begin
  select *
  into v_event
  from public.activity_events event
  where event.id = new.activity_event_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'REALITY_V2_MEASURE_ACTIVITY_EVENT_NOT_FOUND';
  end if;

  if new.user_id is distinct from v_event.user_id
     or new.performed_by_actor_id is distinct from
        v_event.performed_by_actor_id
     or new.acting_as_actor_id is distinct from
        v_event.acting_as_actor_id
     or new.acting_for_actor_id is distinct from
        v_event.acting_for_actor_id then
    raise exception using
      errcode = '42501',
      message = 'REALITY_V2_MEASURE_EVENT_ACTOR_MISMATCH';
  end if;

  return new;
end;
$function$;

drop trigger if exists activity_event_measures_actor_alignment_v2_trg
  on public.activity_event_measures;

create trigger activity_event_measures_actor_alignment_v2_trg
before insert or update of
  activity_event_id,
  user_id,
  performed_by_actor_id,
  acting_as_actor_id,
  acting_for_actor_id
on public.activity_event_measures
for each row
execute function public.enforce_activity_measure_actor_alignment_v2();

create or replace function public.enforce_activity_fact_actor_alignment_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_measure public.activity_event_measures%rowtype;
begin
  select *
  into v_measure
  from public.activity_event_measures measure
  where measure.id = new.measure_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'REALITY_V2_FACT_MEASURE_NOT_FOUND';
  end if;

  if new.activity_event_id is distinct from v_measure.activity_event_id
     or new.user_id is distinct from v_measure.user_id
     or new.performed_by_actor_id is distinct from
        v_measure.performed_by_actor_id
     or new.acting_as_actor_id is distinct from
        v_measure.acting_as_actor_id
     or new.acting_for_actor_id is distinct from
        v_measure.acting_for_actor_id then
    raise exception using
      errcode = '42501',
      message = 'REALITY_V2_FACT_MEASURE_ACTOR_MISMATCH';
  end if;

  if new.value_object_id is not null
     and not exists (
       select 1
       from public.value_objects value_object
       where value_object.id = new.value_object_id
         and value_object.owner_user_id = new.user_id
         and value_object.owner_actor_id = new.acting_as_actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'REALITY_V2_FACT_VALUE_OBJECT_ACTOR_MISMATCH';
  end if;

  return new;
end;
$function$;

drop trigger if exists activity_object_facts_actor_alignment_v2_trg
  on public.activity_object_facts;

create trigger activity_object_facts_actor_alignment_v2_trg
before insert or update of
  activity_event_id,
  measure_id,
  user_id,
  performed_by_actor_id,
  acting_as_actor_id,
  acting_for_actor_id,
  value_object_id
on public.activity_object_facts
for each row
execute function public.enforce_activity_fact_actor_alignment_v2();

create or replace function public.enforce_value_object_actor_ownership_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
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

drop trigger if exists value_objects_actor_ownership_v2_trg
  on public.value_objects;

create trigger value_objects_actor_ownership_v2_trg
before insert or update of owner_user_id, owner_actor_id
on public.value_objects
for each row
execute function public.enforce_value_object_actor_ownership_v2();

create or replace function public.save_reality_activity_v1(
  p_owner_user_id uuid,
  p_request_hash text,
  p_actor_context jsonb,
  p_activity jsonb,
  p_facts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_activity_event_id uuid;
  v_requested_activity_event_id uuid;
  v_existing_request_hash text;
  v_existing_event_code text;
  v_existing_temporal_direction text;
  v_existing_performed_by_actor_id uuid;
  v_existing_acting_as_actor_id uuid;
  v_existing_acting_for_actor_id uuid;
  v_event_code text;
  v_idempotency_key text;
  v_temporal_direction text;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_duration_minutes integer;
  v_performed_by_actor_id uuid;
  v_acting_as_actor_id uuid;
  v_acting_for_actor_id uuid;
  v_fact jsonb;
  v_fact_ordinal integer := 0;
  v_measure_id uuid;
  v_fact_id uuid;
  v_review_item_id uuid;
  v_queue_id uuid;
  v_measure_ids jsonb := '[]'::jsonb;
  v_fact_ids jsonb := '[]'::jsonb;
  v_review_item_ids jsonb := '[]'::jsonb;
  v_recalculation_queue_ids jsonb := '[]'::jsonb;
  v_rows_written integer := 0;
  v_value_count integer;
  v_decision text;
  v_measure_type text;
  v_parameter_code text;
  v_unit_code text;
  v_semantic_object_key text;
  v_semantic_object_label text;
  v_value_object_id uuid;
  v_value_numeric numeric;
  v_value_text text;
  v_value_boolean boolean;
  v_confidence numeric;
  v_source_type text;
  v_fact_status text;
  v_metadata jsonb;
begin
  if p_owner_user_id is null then
    raise exception using
      errcode = '22023',
      message = 'SAVE_REALITY_ACTIVITY_OWNER_USER_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.app_users
    where id = p_owner_user_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'SAVE_REALITY_ACTIVITY_OWNER_USER_NOT_FOUND';
  end if;

  if coalesce(btrim(p_request_hash), '') = '' then
    raise exception using
      errcode = '22023',
      message = 'SAVE_REALITY_ACTIVITY_REQUEST_HASH_REQUIRED';
  end if;

  if jsonb_typeof(coalesce(p_actor_context, '{}'::jsonb)) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'SAVE_REALITY_ACTIVITY_ACTOR_CONTEXT_MUST_BE_OBJECT';
  end if;

  if jsonb_typeof(coalesce(p_activity, '{}'::jsonb)) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'SAVE_REALITY_ACTIVITY_ACTIVITY_MUST_BE_OBJECT';
  end if;

  if jsonb_typeof(coalesce(p_facts, '[]'::jsonb)) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'SAVE_REALITY_ACTIVITY_FACTS_MUST_BE_ARRAY';
  end if;

  if jsonb_array_length(coalesce(p_facts, '[]'::jsonb)) = 0 then
    raise exception using
      errcode = '22023',
      message = 'SAVE_REALITY_ACTIVITY_AT_LEAST_ONE_FACT_REQUIRED';
  end if;

  v_idempotency_key := nullif(btrim(p_activity->>'idempotencyKey'), '');

  if v_idempotency_key is null then
    raise exception using
      errcode = '22023',
      message = 'SAVE_REALITY_ACTIVITY_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  v_event_code := 'save_gate:' || v_idempotency_key;
  v_requested_activity_event_id :=
    nullif(p_activity->>'existingActivityEventId', '')::uuid;
  v_temporal_direction := coalesce(nullif(p_activity->>'temporalDirection', ''), 'past');

  if v_temporal_direction not in ('past', 'future') then
    raise exception using
      errcode = '23514',
      message = 'SAVE_REALITY_ACTIVITY_TEMPORAL_DIRECTION_NOT_ALLOWED';
  end if;

  v_started_at := nullif(p_activity->>'startedAtIso', '')::timestamptz;
  v_ended_at := nullif(p_activity->>'endedAtIso', '')::timestamptz;
  v_duration_minutes := nullif(p_activity->>'durationMinutes', '')::integer;

  if v_started_at is not null
     and v_ended_at is not null
     and v_ended_at < v_started_at then
    raise exception using
      errcode = '23514',
      message = 'SAVE_REALITY_ACTIVITY_TIME_ORDER_INVALID';
  end if;

  if v_duration_minutes is not null and v_duration_minutes < 0 then
    raise exception using
      errcode = '23514',
      message = 'SAVE_REALITY_ACTIVITY_DURATION_INVALID';
  end if;

  v_performed_by_actor_id :=
    nullif(p_actor_context->>'performedByActorId', '')::uuid;
  v_acting_as_actor_id :=
    nullif(p_actor_context->>'actingAsActorId', '')::uuid;
  v_acting_for_actor_id :=
    nullif(p_actor_context->>'actingForActorId', '')::uuid;

  if v_performed_by_actor_id is null then
    raise exception using
      errcode = '22023',
      message = 'SAVE_REALITY_ACTIVITY_PERFORMED_BY_ACTOR_REQUIRED';
  end if;

  if v_acting_as_actor_id is null then
    raise exception using
      errcode = '22023',
      message = 'SAVE_REALITY_ACTIVITY_ACTING_AS_ACTOR_REQUIRED';
  end if;

  if exists (
    select 1
    from (
      values
        (v_performed_by_actor_id),
        (v_acting_as_actor_id),
        (v_acting_for_actor_id)
    ) referenced_actor(actor_id)
    where referenced_actor.actor_id is not null
      and not exists (
      select 1
      from public.actor_public_profiles profile
      join public.actors actor
        on actor.id = profile.actor_id
       and actor.status = 'active'
      where profile.owner_user_id = p_owner_user_id
        and profile.actor_id = referenced_actor.actor_id
    )
  ) then
    raise exception using
      errcode = '42501',
      message = 'SAVE_REALITY_ACTIVITY_ACTOR_NOT_OWNED_BY_USER';
  end if;

  if v_requested_activity_event_id is not null then
    select
      id,
      event_code,
      metadata_json->>'realityCoreRequestHash',
      temporal_direction,
      performed_by_actor_id,
      acting_as_actor_id,
      acting_for_actor_id,
      started_at,
      ended_at,
      duration_minutes
    into
      v_activity_event_id,
      v_existing_event_code,
      v_existing_request_hash,
      v_existing_temporal_direction,
      v_existing_performed_by_actor_id,
      v_existing_acting_as_actor_id,
      v_existing_acting_for_actor_id,
      v_started_at,
      v_ended_at,
      v_duration_minutes
    from public.activity_events
    where id = v_requested_activity_event_id
      and user_id = p_owner_user_id
    for update;

    if v_activity_event_id is null then
      raise exception using
        errcode = '23503',
        message = 'SAVE_REALITY_ACTIVITY_EXISTING_ACTIVITY_NOT_FOUND';
    end if;

    if v_existing_performed_by_actor_id is distinct from
         v_performed_by_actor_id
       or v_existing_acting_as_actor_id is distinct from
         v_acting_as_actor_id
       or v_existing_acting_for_actor_id is distinct from
         v_acting_for_actor_id then
      raise exception using
        errcode = '42501',
        message =
          'SAVE_REALITY_ACTIVITY_EXISTING_ACTIVITY_ACTOR_MISMATCH';
    end if;

    if v_existing_temporal_direction is not null
       and v_existing_temporal_direction <> v_temporal_direction then
      raise exception using
        errcode = '23514',
        message = 'SAVE_REALITY_ACTIVITY_EXISTING_ACTIVITY_DIRECTION_MISMATCH';
    end if;

    if v_existing_event_code is not null then
      if v_existing_event_code <> v_event_code then
        raise exception using
          errcode = '23505',
          message = 'SAVE_REALITY_ACTIVITY_EXISTING_ACTIVITY_ALREADY_BOUND';
      end if;

      if coalesce(v_existing_request_hash, '') <> p_request_hash then
        raise exception using
          errcode = '23505',
          message = 'SAVE_REALITY_ACTIVITY_IDEMPOTENCY_CONFLICT';
      end if;

      return jsonb_build_object(
        'ok', true,
        'transactional', true,
        'writeStatus', 'idempotent_replay',
        'activityEventId', v_activity_event_id,
        'measureIds', coalesce((
          select jsonb_agg(id order by created_at, id)
          from public.activity_event_measures
          where activity_event_id = v_activity_event_id
        ), '[]'::jsonb),
        'factIds', coalesce((
          select jsonb_agg(id order by created_at, id)
          from public.activity_object_facts
          where activity_event_id = v_activity_event_id
        ), '[]'::jsonb),
        'reviewItemIds', coalesce((
          select jsonb_agg(id order by created_at, id)
          from public.activity_fact_review_items
          where activity_event_id = v_activity_event_id
        ), '[]'::jsonb),
        'recalculationQueueIds', coalesce((
          select jsonb_agg(id order by created_at, id)
          from public.activity_fact_recalculation_queue
          where activity_event_id = v_activity_event_id
        ), '[]'::jsonb),
        'rowsActuallyWritten', 0,
        'dbWriteExecuted', false,
        'requestHash', p_request_hash
      );
    end if;

    if exists (
      select 1
      from public.activity_events
      where user_id = p_owner_user_id
        and event_code = v_event_code
        and id <> v_activity_event_id
    ) then
      raise exception using
        errcode = '23505',
        message = 'SAVE_REALITY_ACTIVITY_IDEMPOTENCY_CONFLICT';
    end if;

    update public.activity_events
    set
      event_code = v_event_code,
      performed_by_actor_id = coalesce(
        performed_by_actor_id,
        v_performed_by_actor_id
      ),
      acting_as_actor_id = coalesce(
        acting_as_actor_id,
        v_acting_as_actor_id
      ),
      acting_for_actor_id = coalesce(
        acting_for_actor_id,
        v_acting_for_actor_id
      ),
      temporal_direction = coalesce(
        temporal_direction,
        v_temporal_direction
      ),
      processing_status = 'processed',
      metadata_json = coalesce(metadata_json, '{}'::jsonb)
        || jsonb_build_object(
          'realityCoreRpc', 'save_reality_activity_v1',
          'realityCoreContractVersion', 'reality-core-v1',
          'parameterRegistryVersion', 'parameter-registry-v1',
          'realityCoreRequestHash', p_request_hash,
          'idempotencyKey', v_idempotency_key,
          'facts_created', true
        )
    where id = v_activity_event_id;

    v_rows_written := 1;
  else
    insert into public.activity_events (
      user_id,
      performed_by_actor_id,
      acting_as_actor_id,
      acting_for_actor_id,
      activity_type_id,
      template_id,
      event_code,
      input_text,
      title,
      description,
      started_at,
      ended_at,
      duration_minutes,
      source,
      status,
      privacy_scope,
      processing_status,
      metadata_json,
      temporal_direction
    )
    values (
      p_owner_user_id,
      v_performed_by_actor_id,
      v_acting_as_actor_id,
      v_acting_for_actor_id,
      nullif(p_activity->>'activityTypeId', '')::uuid,
      nullif(p_activity->>'legacyTemplateId', '')::uuid,
      v_event_code,
      nullif(p_activity->>'inputText', ''),
      nullif(p_activity->>'title', ''),
      nullif(p_activity->>'description', ''),
      v_started_at,
      v_ended_at,
      v_duration_minutes,
      coalesce(nullif(p_activity->>'source', ''), 'chat_ai'),
      coalesce(
        nullif(p_activity->>'status', ''),
        case
          when v_temporal_direction = 'future' then 'planned'
          else 'completed'
        end
      ),
      coalesce(nullif(p_activity->>'privacyScope', ''), 'private'),
      'processed',
      coalesce(p_activity->'metadata', '{}'::jsonb)
        || jsonb_build_object(
          'realityCoreRpc', 'save_reality_activity_v1',
          'realityCoreContractVersion', 'reality-core-v1',
          'parameterRegistryVersion', 'parameter-registry-v1',
          'realityCoreRequestHash', p_request_hash,
          'idempotencyKey', v_idempotency_key
        ),
      v_temporal_direction
    )
    on conflict (user_id, event_code)
      where left(event_code, 10) = 'save_gate:'
    do nothing
    returning id into v_activity_event_id;

    if v_activity_event_id is null then
      select
        id,
        metadata_json->>'realityCoreRequestHash',
        performed_by_actor_id,
        acting_as_actor_id,
        acting_for_actor_id
      into
        v_activity_event_id,
        v_existing_request_hash,
        v_existing_performed_by_actor_id,
        v_existing_acting_as_actor_id,
        v_existing_acting_for_actor_id
      from public.activity_events
      where user_id = p_owner_user_id
        and event_code = v_event_code
      limit 1;

      if v_activity_event_id is null then
        raise exception using
          errcode = 'P0001',
          message = 'SAVE_REALITY_ACTIVITY_IDEMPOTENCY_RESOLUTION_FAILED';
      end if;

      if v_existing_performed_by_actor_id is distinct from
           v_performed_by_actor_id
         or v_existing_acting_as_actor_id is distinct from
           v_acting_as_actor_id
         or v_existing_acting_for_actor_id is distinct from
           v_acting_for_actor_id then
        raise exception using
          errcode = '42501',
          message =
            'SAVE_REALITY_ACTIVITY_IDEMPOTENT_REPLAY_ACTOR_MISMATCH';
      end if;

      if coalesce(v_existing_request_hash, '') <> p_request_hash then
        raise exception using
          errcode = '23505',
          message = 'SAVE_REALITY_ACTIVITY_IDEMPOTENCY_CONFLICT';
      end if;

      return jsonb_build_object(
        'ok', true,
        'transactional', true,
        'writeStatus', 'idempotent_replay',
        'activityEventId', v_activity_event_id,
        'measureIds', coalesce((
          select jsonb_agg(id order by created_at, id)
          from public.activity_event_measures
          where activity_event_id = v_activity_event_id
        ), '[]'::jsonb),
        'factIds', coalesce((
          select jsonb_agg(id order by created_at, id)
          from public.activity_object_facts
          where activity_event_id = v_activity_event_id
        ), '[]'::jsonb),
        'reviewItemIds', coalesce((
          select jsonb_agg(id order by created_at, id)
          from public.activity_fact_review_items
          where activity_event_id = v_activity_event_id
        ), '[]'::jsonb),
        'recalculationQueueIds', coalesce((
          select jsonb_agg(id order by created_at, id)
          from public.activity_fact_recalculation_queue
          where activity_event_id = v_activity_event_id
        ), '[]'::jsonb),
        'rowsActuallyWritten', 0,
        'dbWriteExecuted', false,
        'requestHash', p_request_hash
      );
    end if;

    v_rows_written := 1;
  end if;

  for v_fact in
    select value
    from jsonb_array_elements(p_facts)
  loop
    v_fact_ordinal := v_fact_ordinal + 1;

    if jsonb_typeof(v_fact) <> 'object' then
      raise exception using
        errcode = '22023',
        message = 'SAVE_REALITY_ACTIVITY_FACT_MUST_BE_OBJECT';
    end if;

    v_measure_type := nullif(v_fact->>'measureType', '');
    v_parameter_code := nullif(v_fact->>'parameterCode', '');
    v_unit_code := nullif(v_fact->>'unitCode', '');
    v_semantic_object_key := nullif(v_fact->>'semanticObjectKey', '');
    v_semantic_object_label :=
      coalesce(nullif(v_fact->>'semanticObjectLabel', ''), v_semantic_object_key);
    v_value_object_id := nullif(v_fact->>'valueObjectId', '')::uuid;
    v_value_numeric := nullif(v_fact->>'valueNumeric', '')::numeric;
    v_value_text := nullif(v_fact->>'valueText', '');
    v_value_boolean := nullif(v_fact->>'valueBoolean', '')::boolean;
    v_confidence := coalesce(nullif(v_fact->>'confidence', '')::numeric, 1);
    v_decision := coalesce(nullif(v_fact->>'decision', ''), 'accept');
    v_source_type := case when v_decision = 'edit' then 'user_edit' else 'user_text' end;
    v_fact_status := case
      when v_temporal_direction = 'future' then 'proposed'
      else 'confirmed'
    end;

    if coalesce(nullif(v_fact->>'localFactId', ''), '') = '' then
      raise exception using
        errcode = '22023',
        message = 'SAVE_REALITY_ACTIVITY_LOCAL_FACT_ID_REQUIRED';
    end if;

    if v_measure_type is null then
      raise exception using
        errcode = '22023',
        message = 'SAVE_REALITY_ACTIVITY_MEASURE_TYPE_REQUIRED';
    end if;

    if v_parameter_code is null then
      raise exception using
        errcode = '22023',
        message = 'SAVE_REALITY_ACTIVITY_PARAMETER_CODE_REQUIRED';
    end if;

    if v_unit_code is null then
      raise exception using
        errcode = '22023',
        message = 'SAVE_REALITY_ACTIVITY_UNIT_CODE_REQUIRED';
    end if;

    if v_semantic_object_key is null
       or v_semantic_object_key !~ '^[a-z][a-z0-9_]{1,79}$' then
      raise exception using
        errcode = '23514',
        message = 'SAVE_REALITY_ACTIVITY_SEMANTIC_OBJECT_KEY_INVALID';
    end if;

    if v_decision not in ('accept', 'edit') then
      raise exception using
        errcode = '23514',
        message = 'SAVE_REALITY_ACTIVITY_DECISION_NOT_ALLOWED';
    end if;

    if v_confidence < 0 or v_confidence > 1 then
      raise exception using
        errcode = '23514',
        message = 'SAVE_REALITY_ACTIVITY_CONFIDENCE_OUT_OF_RANGE';
    end if;

    v_value_count :=
      case when v_value_numeric is not null then 1 else 0 end
      + case when v_value_text is not null then 1 else 0 end
      + case when v_value_boolean is not null then 1 else 0 end;

    if v_value_count <> 1 then
      raise exception using
        errcode = '23514',
        message = 'SAVE_REALITY_ACTIVITY_EXACTLY_ONE_FACT_VALUE_REQUIRED';
    end if;

    if v_value_object_id is not null
       and not exists (
         select 1
         from public.value_objects value_object
         where value_object.id = v_value_object_id
           and value_object.owner_user_id = p_owner_user_id
           and value_object.owner_actor_id = v_acting_as_actor_id
       ) then
      raise exception using
        errcode = '42501',
        message = 'SAVE_REALITY_ACTIVITY_VALUE_OBJECT_ACTOR_OWNERSHIP_MISMATCH';
    end if;

    v_metadata :=
      coalesce(v_fact->'metadata', '{}'::jsonb)
      || jsonb_build_object(
        'localFactId', v_fact->>'localFactId',
        'parameterCode', v_parameter_code,
        'realityCoreRpc', 'save_reality_activity_v1',
        'realityCoreContractVersion', 'reality-core-v1',
        'parameterRegistryVersion', 'parameter-registry-v1',
        'realityCoreRequestHash', p_request_hash,
        'idempotencyKey', v_idempotency_key,
        'factOrdinal', v_fact_ordinal
      );

    insert into public.activity_event_measures (
      activity_event_id,
      user_id,
      performed_by_actor_id,
      acting_as_actor_id,
      acting_for_actor_id,
      measure_type,
      value_numeric,
      value_text,
      value_boolean,
      unit,
      source_type,
      confidence,
      is_derived,
      raw_fragment,
      normalized_fragment,
      metadata
    )
    values (
      v_activity_event_id,
      p_owner_user_id,
      v_performed_by_actor_id,
      v_acting_as_actor_id,
      v_acting_for_actor_id,
      v_measure_type,
      v_value_numeric,
      v_value_text,
      v_value_boolean,
      v_unit_code,
      v_source_type,
      v_confidence,
      false,
      nullif(v_fact->>'rawFragment', ''),
      nullif(v_fact->>'normalizedFragment', ''),
      v_metadata
    )
    returning id into v_measure_id;

    v_rows_written := v_rows_written + 1;
    v_measure_ids := v_measure_ids || jsonb_build_array(v_measure_id);

    insert into public.activity_object_facts (
      activity_event_id,
      measure_id,
      user_id,
      performed_by_actor_id,
      acting_as_actor_id,
      acting_for_actor_id,
      value_object_id,
      semantic_object_key,
      semantic_object_label,
      measure_type,
      value_numeric,
      value_text,
      value_boolean,
      unit,
      period_start,
      period_end,
      fact_status,
      confidence,
      source_type,
      is_chronological_primary,
      is_exposure_fact,
      is_user_confirmed,
      metadata
    )
    values (
      v_activity_event_id,
      v_measure_id,
      p_owner_user_id,
      v_performed_by_actor_id,
      v_acting_as_actor_id,
      v_acting_for_actor_id,
      v_value_object_id,
      v_semantic_object_key,
      v_semantic_object_label,
      v_measure_type,
      v_value_numeric,
      v_value_text,
      v_value_boolean,
      v_unit_code,
      v_started_at,
      v_ended_at,
      v_fact_status,
      v_confidence,
      v_source_type,
      (
        v_fact_ordinal = 1
        and v_measure_type = 'duration'
        and v_unit_code = 'minute'
      ),
      true,
      (v_temporal_direction = 'past'),
      v_metadata
    )
    returning id into v_fact_id;

    v_rows_written := v_rows_written + 1;
    v_fact_ids := v_fact_ids || jsonb_build_array(v_fact_id);

    insert into public.activity_fact_review_items (
      activity_event_id,
      fact_id,
      measure_id,
      user_id,
      performed_by_actor_id,
      acting_as_actor_id,
      acting_for_actor_id,
      proposed_label,
      proposed_value_numeric,
      proposed_value_text,
      proposed_value_boolean,
      proposed_unit,
      user_decision,
      edited_value_numeric,
      edited_value_text,
      edited_value_boolean,
      edited_unit,
      rejected_reason,
      metadata
    )
    values (
      v_activity_event_id,
      v_fact_id,
      v_measure_id,
      p_owner_user_id,
      v_performed_by_actor_id,
      v_acting_as_actor_id,
      v_acting_for_actor_id,
      v_semantic_object_label,
      v_value_numeric,
      v_value_text,
      v_value_boolean,
      v_unit_code,
      case when v_decision = 'edit' then 'edited' else 'accepted' end,
      case when v_decision = 'edit' then v_value_numeric else null end,
      case when v_decision = 'edit' then v_value_text else null end,
      case when v_decision = 'edit' then v_value_boolean else null end,
      case when v_decision = 'edit' then v_unit_code else null end,
      null,
      v_metadata || jsonb_build_object('reasonRu', v_fact->>'reasonRu')
    )
    returning id into v_review_item_id;

    v_rows_written := v_rows_written + 1;
    v_review_item_ids :=
      v_review_item_ids || jsonb_build_array(v_review_item_id);

    insert into public.activity_fact_recalculation_queue (
      user_id,
      performed_by_actor_id,
      acting_as_actor_id,
      acting_for_actor_id,
      activity_event_id,
      value_object_id,
      semantic_object_key,
      reason,
      queue_status,
      metadata
    )
    values (
      p_owner_user_id,
      v_performed_by_actor_id,
      v_acting_as_actor_id,
      v_acting_for_actor_id,
      v_activity_event_id,
      v_value_object_id,
      v_semantic_object_key,
      'fact_created',
      'queued',
      v_metadata || jsonb_build_object(
        'factId', v_fact_id,
        'measureId', v_measure_id
      )
    )
    returning id into v_queue_id;

    v_rows_written := v_rows_written + 1;
    v_recalculation_queue_ids :=
      v_recalculation_queue_ids || jsonb_build_array(v_queue_id);
  end loop;

  return jsonb_build_object(
    'ok', true,
    'transactional', true,
    'writeStatus', 'written',
    'activityEventId', v_activity_event_id,
    'measureIds', v_measure_ids,
    'factIds', v_fact_ids,
    'reviewItemIds', v_review_item_ids,
    'recalculationQueueIds', v_recalculation_queue_ids,
    'rowsActuallyWritten', v_rows_written,
    'dbWriteExecuted', true,
    'requestHash', p_request_hash
  );

  -- No EXCEPTION handler is intentionally present.
  -- Any validation error, FK violation, CHECK violation or insert failure
  -- aborts the complete PostgreSQL function call and rolls back all writes.
end;
$function$;

revoke all on function public.enforce_activity_event_actor_ownership_v2()
  from public, anon, authenticated;

revoke all on function public.enforce_activity_measure_actor_alignment_v2()
  from public, anon, authenticated;

revoke all on function public.enforce_activity_fact_actor_alignment_v2()
  from public, anon, authenticated;

revoke all on function public.enforce_value_object_actor_ownership_v2()
  from public, anon, authenticated;

revoke all on function public.save_reality_activity_v1(
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.save_reality_activity_v1(
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb
) to service_role;

comment on function public.save_reality_activity_v1(
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb
) is
'ARCTor Reality Model v2 P4 transactional save RPC. Actor ids must belong to the server-resolved account context; existing events and Value Objects must match the same active actor. Any failure rolls back all writes.';

commit;
