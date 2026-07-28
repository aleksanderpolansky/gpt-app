-- ARCTor.app
-- CUX4A1 semantic enrichment DB foundation
-- Baseline: main @ 653dad3183bef6bb8c065a4c32a85a10e0de6fd9
--
-- Additive only:
-- DELETE=false
-- TRUNCATE=false
-- DROP_EXISTING_TABLES=false
-- BACKFILL=false

begin;

do $cux4a1_preflight$
begin
  if to_regclass('public.app_users') is null
     or to_regclass('public.actors') is null
     or to_regclass('public.actor_public_profiles') is null
     or to_regclass('public.activity_events') is null then
    raise exception using
      errcode='42P01',
      message='CUX4A1_REQUIRED_TABLE_MISSING';
  end if;

  if to_regprocedure(
    'public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])'
  ) is null then
    raise exception using
      errcode='42883',
      message='CUX4A1_PP1_CREATE_RPC_MISSING';
  end if;

  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception using
      errcode='42883',
      message='CUX4A1_PGCRYPTO_DIGEST_MISSING';
  end if;

  if to_regclass('public.activity_semantic_enrichment_runs_cux4') is not null then
    raise exception using
      errcode='42P07',
      message='CUX4A1_TABLE_ALREADY_EXISTS';
  end if;

  if exists (
    select 1
    from pg_proc procedure_row
    join pg_namespace namespace_row
      on namespace_row.oid=procedure_row.pronamespace
    where namespace_row.nspname='public'
      and procedure_row.proname in (
        'enforce_activity_semantic_enrichment_run_cux4',
        'create_activity_semantic_enrichment_run_cux4_v1',
        'claim_activity_semantic_enrichment_run_cux4_v1',
        'finish_activity_semantic_enrichment_run_cux4_v1'
      )
  ) then
    raise exception using
      errcode='42723',
      message='CUX4A1_FUNCTION_COLLISION';
  end if;
end
$cux4a1_preflight$;

create table public.activity_semantic_enrichment_runs_cux4 (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null
    references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null
    references public.actors(id) on delete cascade,
  activity_event_id uuid not null
    references public.activity_events(id) on delete cascade,
  request_key text not null,
  request_hash text not null,
  status text not null default 'pending',
  attempt_no integer not null default 1,
  source_locale text not null,
  source_text text not null,
  requested_fields_json jsonb not null default '{}'::jsonb,
  protected_field_codes text[] not null default '{}'::text[],
  input_snapshot_json jsonb not null default '{}'::jsonb,
  result_json jsonb,
  applied_fields_json jsonb not null
    default '{"applied":[],"skipped":[]}'::jsonb,
  previous_activity_json jsonb,
  previous_calendar_projection_json jsonb,
  error_json jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint activity_semantic_enrichment_runs_cux4_identity_unique
    unique (
      owner_user_id,
      owner_actor_id,
      activity_event_id,
      request_key
    ),

  constraint activity_semantic_enrichment_runs_cux4_request_key_check
    check (
      char_length(btrim(request_key)) between 1 and 200
    ),

  constraint activity_semantic_enrichment_runs_cux4_request_hash_check
    check (
      request_hash ~ '^[0-9a-f]{64}$'
    ),

  constraint activity_semantic_enrichment_runs_cux4_status_check
    check (
      status in (
        'pending',
        'processing',
        'processed',
        'needs_clarification',
        'failed',
        'cancelled'
      )
    ),

  constraint activity_semantic_enrichment_runs_cux4_attempt_check
    check (attempt_no >= 1),

  constraint activity_semantic_enrichment_runs_cux4_locale_check
    check (source_locale in ('en','pl','ru','uk','de','es','cs')),

  constraint activity_semantic_enrichment_runs_cux4_source_text_check
    check (
      char_length(btrim(source_text)) between 1 and 4000
    ),

  constraint activity_semantic_enrichment_runs_cux4_requested_fields_check
    check (
      jsonb_typeof(requested_fields_json)='object'
    ),

  constraint activity_semantic_enrichment_runs_cux4_input_snapshot_check
    check (
      jsonb_typeof(input_snapshot_json)='object'
    ),

  constraint activity_semantic_enrichment_runs_cux4_result_check
    check (
      result_json is null
      or jsonb_typeof(result_json)='object'
    ),

  constraint activity_semantic_enrichment_runs_cux4_applied_fields_check
    check (
      jsonb_typeof(applied_fields_json)='object'
    ),

  constraint activity_semantic_enrichment_runs_cux4_previous_activity_check
    check (
      previous_activity_json is null
      or jsonb_typeof(previous_activity_json)='object'
    ),

  constraint activity_semantic_enrichment_runs_cux4_previous_calendar_check
    check (
      previous_calendar_projection_json is null
      or jsonb_typeof(previous_calendar_projection_json)='object'
    ),

  constraint activity_semantic_enrichment_runs_cux4_error_check
    check (
      error_json is null
      or jsonb_typeof(error_json)='object'
    ),

  constraint activity_semantic_enrichment_runs_cux4_protected_fields_check
    check (
      protected_field_codes <@ array[
        'title',
        'schedule_mode_code',
        'scheduled_date',
        'schedule_start_date',
        'schedule_end_date',
        'deadline_at',
        'started_at',
        'ended_at',
        'duration_minutes',
        'planned_target_links'
      ]::text[]
    )
);

create index activity_semantic_enrichment_runs_cux4_activity_idx
  on public.activity_semantic_enrichment_runs_cux4(
    activity_event_id,
    created_at desc
  );

create index activity_semantic_enrichment_runs_cux4_owner_status_idx
  on public.activity_semantic_enrichment_runs_cux4(
    owner_user_id,
    owner_actor_id,
    status,
    updated_at
  );

create index activity_semantic_enrichment_runs_cux4_pending_idx
  on public.activity_semantic_enrichment_runs_cux4(
    created_at,
    attempt_no
  )
  where status in ('pending','failed','needs_clarification');

create or replace function public.enforce_activity_semantic_enrichment_run_cux4()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_activity public.activity_events%rowtype;
begin
  new.request_key := btrim(new.request_key);
  new.request_hash := lower(btrim(new.request_hash));
  new.source_locale := lower(btrim(new.source_locale));
  new.source_text := btrim(new.source_text);

  select *
  into v_activity
  from public.activity_events activity_event
  where activity_event.id=new.activity_event_id;

  if not found then
    raise exception using
      errcode='23503',
      message='CUX4A1_ACTIVITY_NOT_FOUND';
  end if;

  if v_activity.user_id is distinct from new.owner_user_id
     or v_activity.acting_as_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode='42501',
      message='CUX4A1_ACTIVITY_OWNER_MISMATCH';
  end if;

  if v_activity.activity_role_code <> 'planned' then
    raise exception using
      errcode='23514',
      message='CUX4A1_PLANNED_ACTIVITY_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id=profile.actor_id
     and actor.status='active'
    join public.app_users app_user
      on app_user.id=profile.owner_user_id
    where profile.owner_user_id=new.owner_user_id
      and profile.actor_id=new.owner_actor_id
      and coalesce(app_user.access_status,'active') <> 'blocked'
  ) then
    raise exception using
      errcode='42501',
      message='CUX4A1_OWNER_ACTOR_NOT_AVAILABLE';
  end if;

  if tg_op='UPDATE' then
    if new.owner_user_id is distinct from old.owner_user_id
       or new.owner_actor_id is distinct from old.owner_actor_id
       or new.activity_event_id is distinct from old.activity_event_id
       or new.request_key is distinct from old.request_key
       or new.request_hash is distinct from old.request_hash
       or new.source_locale is distinct from old.source_locale
       or new.source_text is distinct from old.source_text
       or new.requested_fields_json is distinct from old.requested_fields_json
       or new.protected_field_codes is distinct from old.protected_field_codes
       or new.input_snapshot_json is distinct from old.input_snapshot_json
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode='23514',
        message='CUX4A1_RUN_IDENTITY_IMMUTABLE';
    end if;

    if new.status is distinct from old.status then
      if not (
        (old.status='pending' and new.status in ('processing','cancelled'))
        or
        (
          old.status='processing'
          and new.status in (
            'processed',
            'needs_clarification',
            'failed',
            'cancelled'
          )
        )
        or
        (
          old.status in ('failed','needs_clarification')
          and new.status in ('processing','cancelled')
        )
        or
        (old.status='processed' and new.status='cancelled')
      ) then
        raise exception using
          errcode='23514',
          message='CUX4A1_RUN_STATUS_TRANSITION_INVALID';
      end if;
    end if;
  end if;

  if new.status='pending' then
    new.started_at := null;
    new.finished_at := null;
  elsif new.status='processing' then
    if new.started_at is null then
      new.started_at := clock_timestamp();
    end if;
    new.finished_at := null;
  elsif new.status in ('processed','needs_clarification','failed','cancelled') then
    if new.finished_at is null then
      new.finished_at := clock_timestamp();
    end if;
  end if;

  if new.status in ('processed','needs_clarification')
     and new.result_json is null then
    raise exception using
      errcode='23514',
      message='CUX4A1_RESULT_REQUIRED';
  end if;

  if new.status='failed'
     and new.error_json is null then
    raise exception using
      errcode='23514',
      message='CUX4A1_ERROR_REQUIRED';
  end if;

  return new;
end
$function$;

create trigger activity_semantic_enrichment_runs_cux4_contract_trg
before insert or update
on public.activity_semantic_enrichment_runs_cux4
for each row
execute function public.enforce_activity_semantic_enrichment_run_cux4();

create trigger activity_semantic_enrichment_runs_cux4_updated_at_trg
before update
on public.activity_semantic_enrichment_runs_cux4
for each row
execute function public.set_activity_recording_updated_at();

alter table public.activity_semantic_enrichment_runs_cux4
  enable row level security;

revoke all
on public.activity_semantic_enrichment_runs_cux4
from public, anon, authenticated;

grant select, insert, update, delete
on public.activity_semantic_enrichment_runs_cux4
to service_role;

create or replace function public.create_activity_semantic_enrichment_run_cux4_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_activity_event_id uuid,
  p_request_key text,
  p_source_locale text,
  p_source_text text,
  p_requested_fields_json jsonb default '{}'::jsonb,
  p_protected_field_codes text[] default '{}'::text[],
  p_input_snapshot_json jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_activity public.activity_events%rowtype;
  v_existing public.activity_semantic_enrichment_runs_cux4%rowtype;
  v_created public.activity_semantic_enrichment_runs_cux4%rowtype;
  v_request_key text;
  v_locale text;
  v_source_text text;
  v_protected text[];
  v_request_hash text;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_activity_event_id is null then
    raise exception using
      errcode='22023',
      message='CUX4A1_OWNER_ACTIVITY_REQUIRED';
  end if;

  v_request_key := nullif(btrim(p_request_key), '');
  v_locale := lower(nullif(btrim(p_source_locale), ''));
  v_source_text := nullif(btrim(p_source_text), '');

  if v_request_key is null then
    raise exception using
      errcode='22023',
      message='CUX4A1_REQUEST_KEY_REQUIRED';
  end if;

  if v_locale not in ('en','pl','ru','uk','de','es','cs') then
    raise exception using
      errcode='22023',
      message='CUX4A1_LOCALE_INVALID';
  end if;

  if v_source_text is null then
    raise exception using
      errcode='22023',
      message='CUX4A1_SOURCE_TEXT_REQUIRED';
  end if;

  if jsonb_typeof(coalesce(p_requested_fields_json,'{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_input_snapshot_json,'{}'::jsonb)) <> 'object' then
    raise exception using
      errcode='22023',
      message='CUX4A1_JSON_OBJECT_REQUIRED';
  end if;

  select coalesce(
    array_agg(distinct lower(btrim(field_code)) order by lower(btrim(field_code))),
    '{}'::text[]
  )
  into v_protected
  from unnest(coalesce(p_protected_field_codes,'{}'::text[])) field_code
  where nullif(btrim(field_code),'') is not null;

  if not (
    v_protected <@ array[
      'title',
      'schedule_mode_code',
      'scheduled_date',
      'schedule_start_date',
      'schedule_end_date',
      'deadline_at',
      'started_at',
      'ended_at',
      'duration_minutes',
      'planned_target_links'
    ]::text[]
  ) then
    raise exception using
      errcode='22023',
      message='CUX4A1_PROTECTED_FIELD_INVALID';
  end if;

  select *
  into v_activity
  from public.activity_events activity_event
  where activity_event.id=p_activity_event_id
    and activity_event.user_id=p_owner_user_id
    and activity_event.acting_as_actor_id=p_owner_actor_id
  for share;

  if not found then
    raise exception using
      errcode='42501',
      message='CUX4A1_ACTIVITY_NOT_OWNED';
  end if;

  if v_activity.activity_role_code <> 'planned' then
    raise exception using
      errcode='23514',
      message='CUX4A1_PLANNED_ACTIVITY_REQUIRED';
  end if;

  v_request_hash := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'activityEventId', p_activity_event_id,
          'sourceLocale', v_locale,
          'sourceText', v_source_text,
          'requestedFields', coalesce(p_requested_fields_json,'{}'::jsonb),
          'protectedFieldCodes', to_jsonb(v_protected),
          'inputSnapshot', coalesce(p_input_snapshot_json,'{}'::jsonb)
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_owner_user_id::text
      || ':' || p_owner_actor_id::text
      || ':' || p_activity_event_id::text
      || ':' || v_request_key,
      0
    )
  );

  select *
  into v_existing
  from public.activity_semantic_enrichment_runs_cux4 run
  where run.owner_user_id=p_owner_user_id
    and run.owner_actor_id=p_owner_actor_id
    and run.activity_event_id=p_activity_event_id
    and run.request_key=v_request_key;

  if found then
    if v_existing.request_hash <> v_request_hash then
      raise exception using
        errcode='23505',
        message='CUX4A1_RUN_IDEMPOTENCY_CONFLICT';
    end if;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'run', to_jsonb(v_existing)
    );
  end if;

  insert into public.activity_semantic_enrichment_runs_cux4 (
    owner_user_id,
    owner_actor_id,
    activity_event_id,
    request_key,
    request_hash,
    status,
    attempt_no,
    source_locale,
    source_text,
    requested_fields_json,
    protected_field_codes,
    input_snapshot_json
  ) values (
    p_owner_user_id,
    p_owner_actor_id,
    p_activity_event_id,
    v_request_key,
    v_request_hash,
    'pending',
    1,
    v_locale,
    v_source_text,
    coalesce(p_requested_fields_json,'{}'::jsonb),
    v_protected,
    coalesce(p_input_snapshot_json,'{}'::jsonb)
  )
  returning *
  into v_created;

  return jsonb_build_object(
    'ok', true,
    'disposition', 'created',
    'run', to_jsonb(v_created)
  );
end
$function$;

create or replace function public.claim_activity_semantic_enrichment_run_cux4_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_run_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_run public.activity_semantic_enrichment_runs_cux4%rowtype;
  v_previous_status text;
begin
  select *
  into v_run
  from public.activity_semantic_enrichment_runs_cux4 run
  where run.id=p_run_id
    and run.owner_user_id=p_owner_user_id
    and run.owner_actor_id=p_owner_actor_id
  for update;

  if not found then
    raise exception using
      errcode='42501',
      message='CUX4A1_RUN_NOT_OWNED';
  end if;

  if v_run.status='processing' then
    return jsonb_build_object(
      'ok', true,
      'claimed', false,
      'disposition', 'already_processing',
      'run', to_jsonb(v_run)
    );
  end if;

  if v_run.status in ('processed','cancelled') then
    return jsonb_build_object(
      'ok', true,
      'claimed', false,
      'disposition', 'already_finished',
      'run', to_jsonb(v_run)
    );
  end if;

  if v_run.status not in ('pending','failed','needs_clarification') then
    raise exception using
      errcode='23514',
      message='CUX4A1_RUN_NOT_CLAIMABLE';
  end if;

  v_previous_status := v_run.status;

  update public.activity_semantic_enrichment_runs_cux4
  set
    status='processing',
    attempt_no=case
      when v_previous_status='pending' then attempt_no
      else attempt_no + 1
    end,
    result_json=null,
    error_json=null,
    applied_fields_json='{"applied":[],"skipped":[]}'::jsonb,
    started_at=clock_timestamp(),
    finished_at=null
  where id=v_run.id
  returning *
  into v_run;

  return jsonb_build_object(
    'ok', true,
    'claimed', true,
    'disposition', 'claimed',
    'run', to_jsonb(v_run)
  );
end
$function$;

create or replace function public.finish_activity_semantic_enrichment_run_cux4_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_run_id uuid,
  p_final_status text,
  p_result_json jsonb default null,
  p_error_json jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_run public.activity_semantic_enrichment_runs_cux4%rowtype;
  v_final_status text;
  v_result jsonb;
  v_error jsonb;
begin
  v_final_status := lower(nullif(btrim(p_final_status),''));
  v_result := p_result_json;
  v_error := p_error_json;

  if v_final_status not in (
    'processed',
    'needs_clarification',
    'failed'
  ) then
    raise exception using
      errcode='22023',
      message='CUX4A1_FINAL_STATUS_INVALID';
  end if;

  if v_result is not null and jsonb_typeof(v_result) <> 'object' then
    raise exception using
      errcode='22023',
      message='CUX4A1_RESULT_OBJECT_REQUIRED';
  end if;

  if v_error is not null and jsonb_typeof(v_error) <> 'object' then
    raise exception using
      errcode='22023',
      message='CUX4A1_ERROR_OBJECT_REQUIRED';
  end if;

  if v_final_status in ('processed','needs_clarification')
     and v_result is null then
    raise exception using
      errcode='22023',
      message='CUX4A1_RESULT_REQUIRED';
  end if;

  if v_final_status='failed'
     and v_error is null then
    raise exception using
      errcode='22023',
      message='CUX4A1_ERROR_REQUIRED';
  end if;

  select *
  into v_run
  from public.activity_semantic_enrichment_runs_cux4 run
  where run.id=p_run_id
    and run.owner_user_id=p_owner_user_id
    and run.owner_actor_id=p_owner_actor_id
  for update;

  if not found then
    raise exception using
      errcode='42501',
      message='CUX4A1_RUN_NOT_OWNED';
  end if;

  if v_run.status=v_final_status then
    if v_run.result_json is not distinct from v_result
       and v_run.error_json is not distinct from v_error then
      return jsonb_build_object(
        'ok', true,
        'disposition', 'idempotent_replay',
        'run', to_jsonb(v_run)
      );
    end if;

    raise exception using
      errcode='23505',
      message='CUX4A1_FINISH_REPLAY_CONFLICT';
  end if;

  if v_run.status <> 'processing' then
    raise exception using
      errcode='23514',
      message='CUX4A1_RUN_NOT_PROCESSING';
  end if;

  update public.activity_semantic_enrichment_runs_cux4
  set
    status=v_final_status,
    result_json=case
      when v_final_status in ('processed','needs_clarification')
      then v_result
      else null
    end,
    error_json=case
      when v_final_status='failed'
      then v_error
      else null
    end,
    finished_at=clock_timestamp()
  where id=v_run.id
  returning *
  into v_run;

  return jsonb_build_object(
    'ok', true,
    'disposition', 'finished',
    'run', to_jsonb(v_run)
  );
end
$function$;

revoke all
on function public.create_activity_semantic_enrichment_run_cux4_v1(
  uuid,uuid,uuid,text,text,text,jsonb,text[],jsonb
)
from public, anon, authenticated;

revoke all
on function public.claim_activity_semantic_enrichment_run_cux4_v1(
  uuid,uuid,uuid
)
from public, anon, authenticated;

revoke all
on function public.finish_activity_semantic_enrichment_run_cux4_v1(
  uuid,uuid,uuid,text,jsonb,jsonb
)
from public, anon, authenticated;

grant execute
on function public.create_activity_semantic_enrichment_run_cux4_v1(
  uuid,uuid,uuid,text,text,text,jsonb,text[],jsonb
)
to service_role;

grant execute
on function public.claim_activity_semantic_enrichment_run_cux4_v1(
  uuid,uuid,uuid
)
to service_role;

grant execute
on function public.finish_activity_semantic_enrichment_run_cux4_v1(
  uuid,uuid,uuid,text,jsonb,jsonb
)
to service_role;

comment on table public.activity_semantic_enrichment_runs_cux4 is
'CUX4 service records for idempotent asynchronous semantic enrichment of canonical planned activity_events. Not a second activity entity.';

comment on function public.create_activity_semantic_enrichment_run_cux4_v1(
  uuid,uuid,uuid,text,text,text,jsonb,text[],jsonb
) is
'CUX4A1 idempotent creation of one semantic enrichment run for an owned planned activity_event.';

comment on function public.claim_activity_semantic_enrichment_run_cux4_v1(
  uuid,uuid,uuid
) is
'CUX4A1 controlled pending/retry transition to processing.';

comment on function public.finish_activity_semantic_enrichment_run_cux4_v1(
  uuid,uuid,uuid,text,jsonb,jsonb
) is
'CUX4A1 controlled completion of semantic enrichment without applying fields to activity_events.';

commit;
