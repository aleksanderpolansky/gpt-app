-- ARCTor.app
-- AI Billing B2.2 — reservation + request idempotency
-- 2026-09-30
--
-- PURPOSE
-- 1) Atomically acquire one billable AI request by (app_user_id, request_idempotency_key).
-- 2) Reserve estimated EUR before the external OpenAI HTTP call.
-- 3) Release reservation atomically when the provider call fails.
-- 4) Settle provider usage by releasing its reservation and debiting the wallet in one DB transaction.
--
-- IMPORTANT
-- Existing B1 functions remain available for not-yet-migrated routes.
-- B2.2 functions are service_role-only.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.app_users') is null
     or to_regclass('public.ai_credit_wallets') is null
     or to_regclass('public.ai_credit_ledger') is null
     or to_regclass('public.ai_usage_events') is null then
    raise exception using
      errcode='42P01',
      message='ARCTOR_AI_BILLING_B2_2_REQUIRED_TABLES_MISSING';
  end if;
end;
$preflight$;

alter table public.ai_usage_events
  add column if not exists request_idempotency_key text,
  add column if not exists request_fingerprint text,
  add column if not exists reservation_eur numeric(14,6) not null default 0;

do $constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ai_usage_events'::regclass
      and conname = 'ai_usage_events_request_idempotency_key_length'
  ) then
    alter table public.ai_usage_events
      add constraint ai_usage_events_request_idempotency_key_length
      check (
        request_idempotency_key is null
        or char_length(request_idempotency_key) between 8 and 200
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ai_usage_events'::regclass
      and conname = 'ai_usage_events_request_fingerprint_format'
  ) then
    alter table public.ai_usage_events
      add constraint ai_usage_events_request_fingerprint_format
      check (
        request_fingerprint is null
        or request_fingerprint ~ '^[0-9a-f]{64}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ai_usage_events'::regclass
      and conname = 'ai_usage_events_reservation_non_negative'
  ) then
    alter table public.ai_usage_events
      add constraint ai_usage_events_reservation_non_negative
      check (reservation_eur >= 0);
  end if;
end;
$constraints$;

create unique index if not exists ai_usage_events_request_idempotency_unique_idx
  on public.ai_usage_events (app_user_id, request_idempotency_key)
  where request_idempotency_key is not null;

create index if not exists ai_usage_events_open_reservation_idx
  on public.ai_usage_events (app_user_id, status, created_at desc)
  where reservation_eur > 0;

comment on column public.ai_usage_events.request_idempotency_key is
  'Caller-supplied idempotency key. B2.2 permits at most one provider execution acquisition per app user and key.';

comment on column public.ai_usage_events.request_fingerprint is
  'SHA-256 fingerprint of the billable request contract. Reusing an idempotency key for a different request is rejected.';

comment on column public.ai_usage_events.reservation_eur is
  'Current EUR reservation held by this usage event before final provider settlement.';

create or replace function public.reserve_ai_usage_request_v1(
  p_app_user_id uuid,
  p_request_idempotency_key text,
  p_request_fingerprint text,
  p_selected_tier_code text,
  p_model_name text,
  p_route_path text,
  p_operation_kind text,
  p_estimated_cost_eur numeric,
  p_reservation_eur numeric,
  p_request_metadata jsonb default '{}'::jsonb
)
returns table (
  usage_event_id uuid,
  wallet_id uuid,
  reservation_ledger_id uuid,
  app_user_id uuid,
  acquired boolean,
  usage_status text,
  request_idempotency_key text,
  balance_eur numeric,
  reserved_before_eur numeric,
  reserved_after_eur numeric,
  available_before_eur numeric,
  available_after_eur numeric,
  reservation_eur numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_wallet public.ai_credit_wallets%rowtype;
  v_usage public.ai_usage_events%rowtype;
  v_ledger public.ai_credit_ledger%rowtype;
  v_key text;
  v_fingerprint text;
  v_metadata jsonb;
  v_estimated numeric(14,8);
  v_reserve numeric(14,6);
  v_balance numeric(14,6);
  v_reserved_before numeric(14,6);
  v_reserved_after numeric(14,6);
  v_available_before numeric(14,6);
begin
  if p_app_user_id is null then
    raise exception using errcode='22023', message='AI_BILLING_APP_USER_REQUIRED';
  end if;

  v_key := nullif(btrim(coalesce(p_request_idempotency_key,'')),'');
  if v_key is null or char_length(v_key) not between 8 and 200 then
    raise exception using errcode='22023', message='AI_BILLING_REQUEST_IDEMPOTENCY_KEY_INVALID';
  end if;

  v_fingerprint := lower(nullif(btrim(coalesce(p_request_fingerprint,'')),''));
  if v_fingerprint is null or v_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023', message='AI_BILLING_REQUEST_FINGERPRINT_INVALID';
  end if;

  if nullif(btrim(coalesce(p_model_name,'')),'') is null then
    raise exception using errcode='22023', message='AI_BILLING_MODEL_NAME_REQUIRED';
  end if;

  if p_estimated_cost_eur is null or p_estimated_cost_eur < 0 then
    raise exception using errcode='22023', message='AI_BILLING_ESTIMATED_COST_INVALID';
  end if;

  if p_reservation_eur is null
     or p_reservation_eur <= 0
     or p_reservation_eur > 100000 then
    raise exception using errcode='22023', message='AI_BILLING_RESERVATION_INVALID';
  end if;

  v_metadata := coalesce(p_request_metadata,'{}'::jsonb);
  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception using errcode='22023', message='AI_BILLING_REQUEST_METADATA_MUST_BE_OBJECT';
  end if;

  v_estimated := round(p_estimated_cost_eur::numeric,8);
  v_reserve := round(p_reservation_eur::numeric,6);

  -- Wallet-first lock order is shared by all B2.2 mutation RPCs.
  select w.*
  into v_wallet
  from public.ai_credit_wallets w
  where w.app_user_id = p_app_user_id
  for update;

  if not found then
    raise exception using errcode='23503', message='AI_CREDIT_WALLET_NOT_FOUND';
  end if;

  if v_wallet.status <> 'active' then
    raise exception using errcode='42501', message='AI_CREDIT_WALLET_NOT_ACTIVE';
  end if;

  if v_wallet.currency <> 'EUR' then
    raise exception using errcode='22023', message='AI_CREDIT_WALLET_CURRENCY_MISMATCH';
  end if;

  -- Re-check idempotency only after the per-user wallet row is locked.
  select u.*
  into v_usage
  from public.ai_usage_events u
  where u.app_user_id = p_app_user_id
    and u.request_idempotency_key = v_key
  limit 1;

  if found then
    if coalesce(v_usage.request_fingerprint,'') <> v_fingerprint then
      raise exception using
        errcode='23505',
        message='AI_BILLING_IDEMPOTENCY_KEY_FINGERPRINT_CONFLICT';
    end if;

    select l.*
    into v_ledger
    from public.ai_credit_ledger l
    where l.app_user_id = p_app_user_id
      and l.source_type = 'ai_usage'
      and l.source_id = v_usage.id
      and l.idempotency_key = 'ai_reserve:' || v_usage.id::text
    limit 1;

    usage_event_id := v_usage.id;
    wallet_id := coalesce(v_usage.wallet_id,v_wallet.id);
    reservation_ledger_id := case when found then v_ledger.id else null end;
    app_user_id := p_app_user_id;
    acquired := false;
    usage_status := v_usage.status;
    request_idempotency_key := v_key;
    balance_eur := round(coalesce(v_wallet.balance_eur,0)::numeric,6);
    reserved_before_eur := round(coalesce(v_wallet.reserved_eur,0)::numeric,6);
    reserved_after_eur := reserved_before_eur;
    available_before_eur := greatest(balance_eur - reserved_before_eur,0);
    available_after_eur := available_before_eur;
    reservation_eur := round(coalesce(v_usage.reservation_eur,0)::numeric,6);
    return next;
    return;
  end if;

  v_balance := round(coalesce(v_wallet.balance_eur,0)::numeric,6);
  v_reserved_before := round(coalesce(v_wallet.reserved_eur,0)::numeric,6);
  v_available_before := greatest(v_balance - v_reserved_before,0);

  if v_available_before < v_reserve then
    raise exception using
      errcode='23514',
      message='AI_CREDIT_WALLET_INSUFFICIENT_AVAILABLE_BALANCE_FOR_RESERVATION';
  end if;

  v_reserved_after := round(v_reserved_before + v_reserve,6);

  insert into public.ai_usage_events (
    app_user_id,
    wallet_id,
    selected_tier_code,
    model_name,
    provider,
    route_path,
    operation_kind,
    input_tokens,
    cached_input_tokens,
    output_tokens,
    total_tokens,
    estimated_cost_eur,
    actual_cost_eur,
    wallet_debit_eur,
    status,
    error_code,
    error_message,
    openai_response_id,
    request_idempotency_key,
    request_fingerprint,
    reservation_eur,
    request_metadata,
    response_metadata,
    completed_at
  )
  values (
    p_app_user_id,
    v_wallet.id,
    nullif(btrim(coalesce(p_selected_tier_code,'')),''),
    btrim(p_model_name),
    'openai',
    nullif(btrim(coalesce(p_route_path,'')),''),
    coalesce(nullif(btrim(coalesce(p_operation_kind,'')),''),'other'),
    0,0,0,0,
    v_estimated,
    null,
    null,
    'preflight_allowed',
    null,
    null,
    null,
    v_key,
    v_fingerprint,
    v_reserve,
    v_metadata || jsonb_build_object(
      'billingReservationRpc','reserve_ai_usage_request_v1',
      'reservationAcquiredAt',clock_timestamp()
    ),
    '{}'::jsonb,
    null
  )
  returning *
  into v_usage;

  insert into public.ai_credit_ledger (
    wallet_id,
    app_user_id,
    direction,
    amount_eur,
    balance_before_eur,
    balance_after_eur,
    source_type,
    source_id,
    reason,
    idempotency_key,
    metadata
  )
  values (
    v_wallet.id,
    p_app_user_id,
    'reserve',
    v_reserve,
    v_balance,
    v_balance,
    'ai_usage',
    v_usage.id,
    'AI usage preflight reservation',
    'ai_reserve:' || v_usage.id::text,
    jsonb_build_object(
      'rpc','reserve_ai_usage_request_v1',
      'requestIdempotencyKey',v_key,
      'reservedBeforeEur',v_reserved_before,
      'reservedAfterEur',v_reserved_after,
      'reservedAt',clock_timestamp()
    )
  )
  returning *
  into v_ledger;

  update public.ai_credit_wallets
  set
    reserved_eur = v_reserved_after,
    updated_at = clock_timestamp()
  where id = v_wallet.id;

  usage_event_id := v_usage.id;
  wallet_id := v_wallet.id;
  reservation_ledger_id := v_ledger.id;
  app_user_id := p_app_user_id;
  acquired := true;
  usage_status := 'preflight_allowed';
  request_idempotency_key := v_key;
  balance_eur := v_balance;
  reserved_before_eur := v_reserved_before;
  reserved_after_eur := v_reserved_after;
  available_before_eur := v_available_before;
  available_after_eur := greatest(v_balance - v_reserved_after,0);
  reservation_eur := v_reserve;
  return next;
end;
$function$;

comment on function public.reserve_ai_usage_request_v1(
  uuid,text,text,text,text,text,text,numeric,numeric,jsonb
) is
  'B2.2 atomic request acquisition and EUR reservation. Duplicate app_user_id + idempotency key returns acquired=false and never reserves twice.';

revoke all on function public.reserve_ai_usage_request_v1(
  uuid,text,text,text,text,text,text,numeric,numeric,jsonb
) from public, anon, authenticated;

grant execute on function public.reserve_ai_usage_request_v1(
  uuid,text,text,text,text,text,text,numeric,numeric,jsonb
) to service_role;

create or replace function public.release_ai_usage_reservation_v1(
  p_usage_event_id uuid,
  p_app_user_id uuid,
  p_error_code text default null,
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  usage_event_id uuid,
  wallet_id uuid,
  release_ledger_id uuid,
  app_user_id uuid,
  changed boolean,
  usage_status text,
  balance_eur numeric,
  reserved_before_eur numeric,
  reserved_after_eur numeric,
  released_eur numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_wallet public.ai_credit_wallets%rowtype;
  v_usage public.ai_usage_events%rowtype;
  v_ledger public.ai_credit_ledger%rowtype;
  v_balance numeric(14,6);
  v_reserved_before numeric(14,6);
  v_reserved_after numeric(14,6);
  v_release numeric(14,6);
  v_metadata jsonb;
begin
  if p_usage_event_id is null or p_app_user_id is null then
    raise exception using errcode='22023', message='AI_BILLING_USAGE_EVENT_AND_USER_REQUIRED';
  end if;

  if p_error_code is not null and char_length(p_error_code) > 200 then
    raise exception using errcode='22023', message='AI_BILLING_ERROR_CODE_TOO_LONG';
  end if;

  if p_error_message is not null and char_length(p_error_message) > 4000 then
    raise exception using errcode='22023', message='AI_BILLING_ERROR_MESSAGE_TOO_LONG';
  end if;

  v_metadata := coalesce(p_metadata,'{}'::jsonb);
  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception using errcode='22023', message='AI_BILLING_METADATA_MUST_BE_OBJECT';
  end if;

  -- Same wallet-first lock order as reservation and settlement.
  select w.*
  into v_wallet
  from public.ai_credit_wallets w
  where w.app_user_id = p_app_user_id
  for update;

  if not found then
    raise exception using errcode='23503', message='AI_CREDIT_WALLET_NOT_FOUND';
  end if;

  select u.*
  into v_usage
  from public.ai_usage_events u
  where u.id = p_usage_event_id
    and u.app_user_id = p_app_user_id
  for update;

  if not found then
    raise exception using errcode='23503', message='AI_USAGE_EVENT_NOT_FOUND';
  end if;

  if v_usage.status = 'wallet_debited' then
    raise exception using errcode='23514', message='AI_BILLING_CANNOT_RELEASE_SETTLED_USAGE';
  end if;

  v_balance := round(coalesce(v_wallet.balance_eur,0)::numeric,6);
  v_reserved_before := round(coalesce(v_wallet.reserved_eur,0)::numeric,6);
  v_release := round(coalesce(v_usage.reservation_eur,0)::numeric,6);

  if v_release <= 0 then
    select l.*
    into v_ledger
    from public.ai_credit_ledger l
    where l.app_user_id = p_app_user_id
      and l.source_type = 'ai_usage'
      and l.source_id = p_usage_event_id
      and l.idempotency_key = 'ai_release:' || p_usage_event_id::text
    limit 1;

    usage_event_id := p_usage_event_id;
    wallet_id := v_wallet.id;
    release_ledger_id := case when found then v_ledger.id else null end;
    app_user_id := p_app_user_id;
    changed := false;
    usage_status := v_usage.status;
    balance_eur := v_balance;
    reserved_before_eur := v_reserved_before;
    reserved_after_eur := v_reserved_before;
    released_eur := 0;
    return next;
    return;
  end if;

  if v_reserved_before < v_release then
    raise exception using errcode='23514', message='AI_BILLING_RESERVATION_LEDGER_WALLET_MISMATCH';
  end if;

  v_reserved_after := round(v_reserved_before - v_release,6);

  insert into public.ai_credit_ledger (
    wallet_id,
    app_user_id,
    direction,
    amount_eur,
    balance_before_eur,
    balance_after_eur,
    source_type,
    source_id,
    reason,
    idempotency_key,
    metadata
  )
  values (
    v_wallet.id,
    p_app_user_id,
    'release',
    v_release,
    v_balance,
    v_balance,
    'ai_usage',
    p_usage_event_id,
    'AI usage reservation released after provider failure',
    'ai_release:' || p_usage_event_id::text,
    v_metadata || jsonb_build_object(
      'rpc','release_ai_usage_reservation_v1',
      'reservedBeforeEur',v_reserved_before,
      'reservedAfterEur',v_reserved_after,
      'releasedAt',clock_timestamp()
    )
  )
  returning *
  into v_ledger;

  update public.ai_credit_wallets
  set
    reserved_eur = v_reserved_after,
    updated_at = clock_timestamp()
  where id = v_wallet.id;

  update public.ai_usage_events
  set
    reservation_eur = 0,
    status = 'openai_failed',
    error_code = nullif(btrim(coalesce(p_error_code,'')),''),
    error_message = nullif(p_error_message,''),
    completed_at = coalesce(completed_at,clock_timestamp()),
    response_metadata = coalesce(response_metadata,'{}'::jsonb)
      || v_metadata
      || jsonb_build_object(
        'billingReservationReleaseRpc','release_ai_usage_reservation_v1',
        'billingReservationReleasedAt',clock_timestamp()
      )
  where id = p_usage_event_id;

  usage_event_id := p_usage_event_id;
  wallet_id := v_wallet.id;
  release_ledger_id := v_ledger.id;
  app_user_id := p_app_user_id;
  changed := true;
  usage_status := 'openai_failed';
  balance_eur := v_balance;
  reserved_before_eur := v_reserved_before;
  reserved_after_eur := v_reserved_after;
  released_eur := v_release;
  return next;
end;
$function$;

comment on function public.release_ai_usage_reservation_v1(
  uuid,uuid,text,text,jsonb
) is
  'B2.2 provider-failure path: atomically releases this usage event reservation, writes a release ledger row and marks the usage event openai_failed.';

revoke all on function public.release_ai_usage_reservation_v1(
  uuid,uuid,text,text,jsonb
) from public, anon, authenticated;

grant execute on function public.release_ai_usage_reservation_v1(
  uuid,uuid,text,text,jsonb
) to service_role;

create or replace function public.settle_reserved_ai_usage_v1(
  p_usage_event_id uuid,
  p_app_user_id uuid,
  p_actual_cost_eur numeric,
  p_wallet_debit_eur numeric,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  usage_event_id uuid,
  wallet_id uuid,
  release_ledger_id uuid,
  debit_ledger_id uuid,
  app_user_id uuid,
  balance_before_eur numeric,
  balance_after_eur numeric,
  reserved_before_eur numeric,
  reserved_after_eur numeric,
  reservation_released_eur numeric,
  wallet_debit_eur numeric,
  actual_cost_eur numeric,
  usage_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_wallet public.ai_credit_wallets%rowtype;
  v_usage public.ai_usage_events%rowtype;
  v_existing_debit public.ai_credit_ledger%rowtype;
  v_release_ledger public.ai_credit_ledger%rowtype;
  v_debit_ledger public.ai_credit_ledger%rowtype;
  v_balance_before numeric(14,6);
  v_balance_after numeric(14,6);
  v_reserved_before numeric(14,6);
  v_reserved_after numeric(14,6);
  v_event_reservation numeric(14,6);
  v_debit numeric(14,6);
  v_actual numeric(14,8);
  v_available_after_release numeric(14,6);
  v_metadata jsonb;
begin
  if p_usage_event_id is null or p_app_user_id is null then
    raise exception using errcode='22023', message='AI_BILLING_USAGE_EVENT_AND_USER_REQUIRED';
  end if;

  if p_actual_cost_eur is null or p_actual_cost_eur < 0 then
    raise exception using errcode='22023', message='AI_BILLING_ACTUAL_COST_INVALID';
  end if;

  if p_wallet_debit_eur is null or p_wallet_debit_eur <= 0 then
    raise exception using errcode='22023', message='AI_BILLING_WALLET_DEBIT_INVALID';
  end if;

  if p_reason is not null and char_length(p_reason) > 1000 then
    raise exception using errcode='22023', message='AI_BILLING_REASON_TOO_LONG';
  end if;

  v_metadata := coalesce(p_metadata,'{}'::jsonb);
  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception using errcode='22023', message='AI_BILLING_METADATA_MUST_BE_OBJECT';
  end if;

  v_debit := round(p_wallet_debit_eur::numeric,6);
  v_actual := round(p_actual_cost_eur::numeric,8);

  -- Same wallet-first lock order as reserve/release.
  select w.*
  into v_wallet
  from public.ai_credit_wallets w
  where w.app_user_id = p_app_user_id
  for update;

  if not found then
    raise exception using errcode='23503', message='AI_CREDIT_WALLET_NOT_FOUND';
  end if;

  select u.*
  into v_usage
  from public.ai_usage_events u
  where u.id = p_usage_event_id
    and u.app_user_id = p_app_user_id
  for update;

  if not found then
    raise exception using errcode='23503', message='AI_USAGE_EVENT_NOT_FOUND';
  end if;

  select l.*
  into v_existing_debit
  from public.ai_credit_ledger l
  where l.app_user_id = p_app_user_id
    and l.source_type = 'ai_usage'
    and l.source_id = p_usage_event_id
    and l.idempotency_key = 'ai_usage:' || p_usage_event_id::text
  limit 1;

  if found then
    select l.*
    into v_release_ledger
    from public.ai_credit_ledger l
    where l.app_user_id = p_app_user_id
      and l.source_type = 'ai_usage'
      and l.source_id = p_usage_event_id
      and l.idempotency_key = 'ai_release:' || p_usage_event_id::text
    limit 1;

    usage_event_id := p_usage_event_id;
    wallet_id := v_existing_debit.wallet_id;
    release_ledger_id := case when found then v_release_ledger.id else null end;
    debit_ledger_id := v_existing_debit.id;
    app_user_id := p_app_user_id;
    balance_before_eur := v_existing_debit.balance_before_eur;
    balance_after_eur := v_existing_debit.balance_after_eur;
    reserved_before_eur := null;
    reserved_after_eur := round(coalesce(v_wallet.reserved_eur,0)::numeric,6);
    reservation_released_eur := 0;
    wallet_debit_eur := v_existing_debit.amount_eur;
    actual_cost_eur := coalesce(v_usage.actual_cost_eur,v_actual);
    usage_status := v_usage.status;
    return next;
    return;
  end if;

  if v_usage.status not in ('openai_completed','debit_failed') then
    raise exception using
      errcode='23514',
      message='AI_BILLING_USAGE_NOT_READY_FOR_RESERVED_SETTLEMENT';
  end if;

  if v_usage.wallet_id is not null and v_usage.wallet_id <> v_wallet.id then
    raise exception using errcode='23514', message='AI_BILLING_USAGE_WALLET_MISMATCH';
  end if;

  v_balance_before := round(coalesce(v_wallet.balance_eur,0)::numeric,6);
  v_reserved_before := round(coalesce(v_wallet.reserved_eur,0)::numeric,6);
  v_event_reservation := round(coalesce(v_usage.reservation_eur,0)::numeric,6);

  if v_event_reservation <= 0 then
    raise exception using errcode='23514', message='AI_BILLING_USAGE_RESERVATION_MISSING';
  end if;

  if v_reserved_before < v_event_reservation then
    raise exception using errcode='23514', message='AI_BILLING_RESERVED_TOTAL_BELOW_EVENT_RESERVATION';
  end if;

  v_reserved_after := round(v_reserved_before - v_event_reservation,6);
  v_available_after_release := greatest(v_balance_before - v_reserved_after,0);

  if v_available_after_release < v_debit then
    raise exception using
      errcode='23514',
      message='AI_CREDIT_WALLET_INSUFFICIENT_BALANCE_AFTER_RESERVATION_RELEASE';
  end if;

  v_balance_after := round(v_balance_before - v_debit,6);

  insert into public.ai_credit_ledger (
    wallet_id,
    app_user_id,
    direction,
    amount_eur,
    balance_before_eur,
    balance_after_eur,
    source_type,
    source_id,
    reason,
    idempotency_key,
    metadata
  )
  values (
    v_wallet.id,
    p_app_user_id,
    'release',
    v_event_reservation,
    v_balance_before,
    v_balance_before,
    'ai_usage',
    p_usage_event_id,
    'AI usage reservation released during settlement',
    'ai_release:' || p_usage_event_id::text,
    v_metadata || jsonb_build_object(
      'rpc','settle_reserved_ai_usage_v1',
      'releaseStage',true,
      'reservedBeforeEur',v_reserved_before,
      'reservedAfterEur',v_reserved_after,
      'releasedAt',clock_timestamp()
    )
  )
  returning *
  into v_release_ledger;

  insert into public.ai_credit_ledger (
    wallet_id,
    app_user_id,
    direction,
    amount_eur,
    balance_before_eur,
    balance_after_eur,
    source_type,
    source_id,
    reason,
    idempotency_key,
    metadata
  )
  values (
    v_wallet.id,
    p_app_user_id,
    'debit',
    v_debit,
    v_balance_before,
    v_balance_after,
    'ai_usage',
    p_usage_event_id,
    nullif(btrim(coalesce(p_reason,'')),''),
    'ai_usage:' || p_usage_event_id::text,
    v_metadata || jsonb_build_object(
      'rpc','settle_reserved_ai_usage_v1',
      'reservationReleasedEur',v_event_reservation,
      'settledAt',clock_timestamp()
    )
  )
  returning *
  into v_debit_ledger;

  update public.ai_credit_wallets
  set
    balance_eur = v_balance_after,
    reserved_eur = v_reserved_after,
    updated_at = clock_timestamp()
  where id = v_wallet.id;

  update public.ai_usage_events
  set
    wallet_id = v_wallet.id,
    reservation_eur = 0,
    actual_cost_eur = v_actual,
    wallet_debit_eur = v_debit,
    status = 'wallet_debited',
    completed_at = coalesce(completed_at,clock_timestamp()),
    response_metadata = coalesce(response_metadata,'{}'::jsonb)
      || jsonb_build_object(
        'billingSettlementRpc','settle_reserved_ai_usage_v1',
        'billingReservationReleasedEur',v_event_reservation,
        'billingSettledAt',clock_timestamp()
      )
  where id = p_usage_event_id;

  usage_event_id := p_usage_event_id;
  wallet_id := v_wallet.id;
  release_ledger_id := v_release_ledger.id;
  debit_ledger_id := v_debit_ledger.id;
  app_user_id := p_app_user_id;
  balance_before_eur := v_balance_before;
  balance_after_eur := v_balance_after;
  reserved_before_eur := v_reserved_before;
  reserved_after_eur := v_reserved_after;
  reservation_released_eur := v_event_reservation;
  wallet_debit_eur := v_debit;
  actual_cost_eur := v_actual;
  usage_status := 'wallet_debited';
  return next;
end;
$function$;

comment on function public.settle_reserved_ai_usage_v1(
  uuid,uuid,numeric,numeric,text,jsonb
) is
  'B2.2 atomic settlement: releases the usage event reservation, writes release+debit ledger rows, debits the wallet and marks usage wallet_debited in one transaction.';

revoke all on function public.settle_reserved_ai_usage_v1(
  uuid,uuid,numeric,numeric,text,jsonb
) from public, anon, authenticated;

grant execute on function public.settle_reserved_ai_usage_v1(
  uuid,uuid,numeric,numeric,text,jsonb
) to service_role;

do $acceptance$
begin
  if to_regprocedure(
       'public.reserve_ai_usage_request_v1(uuid,text,text,text,text,text,text,numeric,numeric,jsonb)'
     ) is null
     or to_regprocedure(
       'public.release_ai_usage_reservation_v1(uuid,uuid,text,text,jsonb)'
     ) is null
     or to_regprocedure(
       'public.settle_reserved_ai_usage_v1(uuid,uuid,numeric,numeric,text,jsonb)'
     ) is null then
    raise exception using
      errcode='42883',
      message='ARCTOR_AI_BILLING_B2_2_RPC_MISSING_AFTER_WRITE';
  end if;

  if has_function_privilege(
       'anon',
       'public.reserve_ai_usage_request_v1(uuid,text,text,text,text,text,text,numeric,numeric,jsonb)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.reserve_ai_usage_request_v1(uuid,text,text,text,text,text,text,numeric,numeric,jsonb)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.reserve_ai_usage_request_v1(uuid,text,text,text,text,text,text,numeric,numeric,jsonb)',
       'EXECUTE'
     ) then
    raise exception using errcode='42501', message='ARCTOR_AI_BILLING_B2_2_RESERVE_PRIVILEGE_GUARD_FAILED';
  end if;

  if has_function_privilege(
       'anon',
       'public.release_ai_usage_reservation_v1(uuid,uuid,text,text,jsonb)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.release_ai_usage_reservation_v1(uuid,uuid,text,text,jsonb)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.release_ai_usage_reservation_v1(uuid,uuid,text,text,jsonb)',
       'EXECUTE'
     ) then
    raise exception using errcode='42501', message='ARCTOR_AI_BILLING_B2_2_RELEASE_PRIVILEGE_GUARD_FAILED';
  end if;

  if has_function_privilege(
       'anon',
       'public.settle_reserved_ai_usage_v1(uuid,uuid,numeric,numeric,text,jsonb)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.settle_reserved_ai_usage_v1(uuid,uuid,numeric,numeric,text,jsonb)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.settle_reserved_ai_usage_v1(uuid,uuid,numeric,numeric,text,jsonb)',
       'EXECUTE'
     ) then
    raise exception using errcode='42501', message='ARCTOR_AI_BILLING_B2_2_SETTLE_PRIVILEGE_GUARD_FAILED';
  end if;
end;
$acceptance$;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_AI_BILLING_B2_2_RESERVATION_IDEMPOTENCY',
    'pass',true,
    'requestIdempotencyColumn',
      exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ai_usage_events'
          and column_name='request_idempotency_key'
      ),
    'requestFingerprintColumn',
      exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ai_usage_events'
          and column_name='request_fingerprint'
      ),
    'reservationColumn',
      exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='ai_usage_events'
          and column_name='reservation_eur'
      ),
    'reserveRpc',
      to_regprocedure(
        'public.reserve_ai_usage_request_v1(uuid,text,text,text,text,text,text,numeric,numeric,jsonb)'
      ) is not null,
    'releaseRpc',
      to_regprocedure(
        'public.release_ai_usage_reservation_v1(uuid,uuid,text,text,jsonb)'
      ) is not null,
    'reservedSettlementRpc',
      to_regprocedure(
        'public.settle_reserved_ai_usage_v1(uuid,uuid,numeric,numeric,text,jsonb)'
      ) is not null
  )
) as arctor_ai_billing_b2_2_reservation_idempotency;
