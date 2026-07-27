-- ARCTor.app PP1B
-- Canonical application write paths and fact attachment for PP1 activities.

begin;

create table if not exists public.activity_fact_write_operations_pp1 (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null references public.actors(id) on delete cascade,
  idempotency_key text not null,
  request_hash text not null,
  activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  result_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (owner_user_id, owner_actor_id, idempotency_key)
);

alter table public.activity_fact_write_operations_pp1 enable row level security;
revoke all on public.activity_fact_write_operations_pp1 from public, anon, authenticated;
grant select on public.activity_fact_write_operations_pp1 to service_role;

create index if not exists activity_fact_write_operations_pp1_event_idx
  on public.activity_fact_write_operations_pp1(activity_event_id, created_at desc);

create or replace function public.attach_reality_facts_to_activity_pp1_v1(
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
  v_activity public.activity_events%rowtype;
  v_existing_operation public.activity_fact_write_operations_pp1%rowtype;
  v_activity_event_id uuid;
  v_owner_actor_id uuid;
  v_idempotency_key text;
  v_temporal_direction text;
  v_original_event_code text;
  v_normalized_actor_context jsonb;
  v_normalized_activity jsonb;
  v_result jsonb;
  v_replay jsonb;
begin
  if p_owner_user_id is null then
    raise exception using errcode='22023', message='PP1_FACT_OWNER_USER_REQUIRED';
  end if;

  if coalesce(btrim(p_request_hash), '') = '' then
    raise exception using errcode='22023', message='PP1_FACT_REQUEST_HASH_REQUIRED';
  end if;

  if jsonb_typeof(coalesce(p_actor_context, '{}'::jsonb)) <> 'object' then
    raise exception using errcode='22023', message='PP1_FACT_ACTOR_CONTEXT_REQUIRED';
  end if;

  if jsonb_typeof(coalesce(p_activity, '{}'::jsonb)) <> 'object' then
    raise exception using errcode='22023', message='PP1_FACT_ACTIVITY_OBJECT_REQUIRED';
  end if;

  if jsonb_typeof(coalesce(p_facts, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_facts, '[]'::jsonb)) = 0 then
    raise exception using errcode='22023', message='PP1_FACT_ROWS_REQUIRED';
  end if;

  v_activity_event_id := nullif(p_activity->>'existingActivityEventId', '')::uuid;
  v_owner_actor_id := nullif(p_actor_context->>'actingAsActorId', '')::uuid;
  v_idempotency_key := nullif(btrim(p_activity->>'idempotencyKey'), '');

  if v_activity_event_id is null then
    raise exception using errcode='22023', message='PP1_FACT_EXISTING_ACTIVITY_REQUIRED';
  end if;

  if v_owner_actor_id is null then
    raise exception using errcode='22023', message='PP1_FACT_OWNER_ACTOR_REQUIRED';
  end if;

  if v_idempotency_key is null then
    raise exception using errcode='22023', message='PP1_FACT_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_owner_user_id::text || ':' || v_owner_actor_id::text || ':' || v_idempotency_key,
      0
    )
  );

  select * into v_existing_operation
  from public.activity_fact_write_operations_pp1 operation
  where operation.owner_user_id = p_owner_user_id
    and operation.owner_actor_id = v_owner_actor_id
    and operation.idempotency_key = v_idempotency_key;

  if found then
    if v_existing_operation.request_hash <> p_request_hash
       or v_existing_operation.activity_event_id <> v_activity_event_id then
      raise exception using errcode='23505', message='PP1_FACT_IDEMPOTENCY_CONFLICT';
    end if;

    v_replay := coalesce(v_existing_operation.result_json, '{}'::jsonb)
      || jsonb_build_object(
        'ok', true,
        'transactional', true,
        'writeStatus', 'idempotent_replay',
        'rowsActuallyWritten', 0,
        'dbWriteExecuted', false,
        'requestHash', p_request_hash
      );

    return v_replay;
  end if;

  select * into v_activity
  from public.activity_events activity_event
  where activity_event.id = v_activity_event_id
    and activity_event.user_id = p_owner_user_id
    and activity_event.acting_as_actor_id = v_owner_actor_id
  for update;

  if not found then
    raise exception using errcode='42501', message='PP1_FACT_ACTIVITY_NOT_OWNED';
  end if;

  if v_activity.activity_role_code not in ('planned', 'actual') then
    raise exception using errcode='23514', message='PP1_FACT_ACTIVITY_ROLE_INVALID';
  end if;

  v_temporal_direction := coalesce(
    nullif(p_activity->>'temporalDirection', ''),
    case when v_activity.activity_role_code = 'planned' then 'future' else 'past' end
  );

  if (v_activity.activity_role_code = 'planned' and v_temporal_direction <> 'future')
     or (v_activity.activity_role_code = 'actual' and v_temporal_direction <> 'past') then
    raise exception using errcode='23514', message='PP1_FACT_ACTIVITY_DIRECTION_MISMATCH';
  end if;

  if exists (
    select 1 from public.activity_event_measures measure
    where measure.activity_event_id = v_activity.id
  ) or exists (
    select 1 from public.activity_object_facts fact
    where fact.activity_event_id = v_activity.id
  ) then
    raise exception using errcode='23505', message='PP1_FACT_ACTIVITY_ALREADY_HAS_FACTS';
  end if;

  v_original_event_code := v_activity.event_code;
  v_normalized_actor_context := coalesce(p_actor_context, '{}'::jsonb)
    || jsonb_build_object(
      'performedByActorId', v_activity.performed_by_actor_id,
      'actingAsActorId', v_activity.acting_as_actor_id,
      'actingForActorId', v_activity.acting_for_actor_id
    );
  v_normalized_activity := coalesce(p_activity, '{}'::jsonb)
    || jsonb_build_object(
      'existingActivityEventId', v_activity.id,
      'temporalDirection', v_temporal_direction
    );

  -- save_reality_activity_v1 historically uses event_code as its idempotency
  -- marker. PP1 creation has its own operation registry and event code. We
  -- temporarily release the code, reuse the proven transactional fact writer,
  -- and then restore the PP1 creation code in the same transaction.
  update public.activity_events
  set event_code = null
  where id = v_activity.id;

  select public.save_reality_activity_v1(
    p_owner_user_id,
    p_request_hash,
    v_normalized_actor_context,
    v_normalized_activity,
    p_facts
  ) into v_result;

  update public.activity_events
  set event_code = v_original_event_code
  where id = v_activity.id;

  insert into public.activity_fact_write_operations_pp1 (
    owner_user_id,
    owner_actor_id,
    idempotency_key,
    request_hash,
    activity_event_id,
    result_json
  ) values (
    p_owner_user_id,
    v_owner_actor_id,
    v_idempotency_key,
    p_request_hash,
    v_activity.id,
    v_result
  );

  return v_result;
end
$function$;

revoke all on function public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb)
  to service_role;

comment on table public.activity_fact_write_operations_pp1 is
'PP1B idempotency registry for attaching one transactional fact bundle to an existing canonical activity_event.';

comment on function public.attach_reality_facts_to_activity_pp1_v1(uuid,text,jsonb,jsonb,jsonb) is
'PP1B transactional adapter that attaches Reality Core measures/facts to an existing canonical planned or actual activity without creating a second activity row.';

commit;
