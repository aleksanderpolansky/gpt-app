-- ARCTor.app
-- AI Billing B3.0 — Background Billing Gateway foundation
-- 2026-09-30
--
-- PURPOSE
-- 1) Durable correlation between an AI channel run and its AI usage reservation.
-- 2) Atomic binding of provider response_id to both channel-run and usage-event state.
-- 3) Separate token/tool provider cost fields for background web-search workloads.
-- 4) No migration of channel runtime yet; B3.1 will consume this contract.
--
-- OpenAI web search tool call fee verified 2026-09-30:
-- $10 / 1,000 calls = $0.01 per web_search call.
-- Search content tokens remain billed at model token rates.
-- Source: https://developers.openai.com/api/docs/pricing

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.app_users') is null
     or to_regclass('public.ai_channels_v1') is null
     or to_regclass('public.ai_channel_runs_v1') is null
     or to_regclass('public.ai_usage_events') is null then
    raise exception using
      errcode='42P01',
      message='ARCTOR_AI_BILLING_B3_0_REQUIRED_TABLES_MISSING';
  end if;

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
      message='ARCTOR_AI_BILLING_B3_0_B2_2_RPC_MISSING';
  end if;
end;
$preflight$;

alter table public.ai_usage_events
  add column if not exists provider_token_cost_eur numeric(14,8),
  add column if not exists provider_tool_calls integer not null default 0,
  add column if not exists provider_tool_cost_eur numeric(14,8);

alter table public.ai_channel_runs_v1
  add column if not exists billing_user_id uuid references public.app_users(id),
  add column if not exists ai_usage_event_id uuid references public.ai_usage_events(id),
  add column if not exists billing_request_idempotency_key text;

do $constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.ai_usage_events'::regclass
      and conname='ai_usage_events_provider_tool_calls_non_negative'
  ) then
    alter table public.ai_usage_events
      add constraint ai_usage_events_provider_tool_calls_non_negative
      check (provider_tool_calls >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.ai_usage_events'::regclass
      and conname='ai_usage_events_provider_token_cost_non_negative'
  ) then
    alter table public.ai_usage_events
      add constraint ai_usage_events_provider_token_cost_non_negative
      check (
        provider_token_cost_eur is null
        or provider_token_cost_eur >= 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.ai_usage_events'::regclass
      and conname='ai_usage_events_provider_tool_cost_non_negative'
  ) then
    alter table public.ai_usage_events
      add constraint ai_usage_events_provider_tool_cost_non_negative
      check (
        provider_tool_cost_eur is null
        or provider_tool_cost_eur >= 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.ai_channel_runs_v1'::regclass
      and conname='ai_channel_runs_billing_request_key_length'
  ) then
    alter table public.ai_channel_runs_v1
      add constraint ai_channel_runs_billing_request_key_length
      check (
        billing_request_idempotency_key is null
        or char_length(billing_request_idempotency_key)
           between 8 and 200
      );
  end if;
end;
$constraints$;

create unique index if not exists
  ai_channel_runs_ai_usage_event_unique_idx
  on public.ai_channel_runs_v1(ai_usage_event_id)
  where ai_usage_event_id is not null;

create index if not exists
  ai_channel_runs_billing_user_idx
  on public.ai_channel_runs_v1(billing_user_id,started_at desc)
  where billing_user_id is not null;

create index if not exists
  ai_usage_events_openai_response_lookup_idx
  on public.ai_usage_events(openai_response_id)
  where openai_response_id is not null;

comment on column public.ai_channel_runs_v1.billing_user_id is
  'B3.0 durable billing owner for the run. B3.1 sets this to ai_channels_v1.owner_user_id, never the feed reader.';

comment on column public.ai_channel_runs_v1.ai_usage_event_id is
  'B3.0 one-to-one durable link to the reserved ai_usage_events row for this channel run.';

comment on column public.ai_channel_runs_v1.billing_request_idempotency_key is
  'B3.0 durable caller idempotency key used to reacquire/recover a background provider start safely.';

comment on column public.ai_usage_events.provider_token_cost_eur is
  'Provider token cost component in EUR before wallet rounding.';

comment on column public.ai_usage_events.provider_tool_calls is
  'Count of separately-priced provider tool calls such as OpenAI web_search.';

comment on column public.ai_usage_events.provider_tool_cost_eur is
  'Separately-priced provider tool cost component in EUR before wallet rounding.';

create or replace function public.bind_ai_channel_run_billing_v1(
  p_channel_id uuid,
  p_run_id uuid,
  p_billing_user_id uuid,
  p_usage_event_id uuid,
  p_request_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_channel public.ai_channels_v1%rowtype;
  v_run public.ai_channel_runs_v1%rowtype;
  v_usage public.ai_usage_events%rowtype;
  v_key text;
  v_already boolean := false;
begin
  if p_channel_id is null
     or p_run_id is null
     or p_billing_user_id is null
     or p_usage_event_id is null then
    raise exception using
      errcode='22023',
      message='AI_CHANNEL_BACKGROUND_BILLING_BIND_IDS_REQUIRED';
  end if;

  v_key := nullif(btrim(coalesce(p_request_idempotency_key,'')),'');
  if v_key is null or char_length(v_key) not between 8 and 200 then
    raise exception using
      errcode='22023',
      message='AI_CHANNEL_BACKGROUND_BILLING_BIND_KEY_INVALID';
  end if;

  select *
  into v_channel
  from public.ai_channels_v1
  where id=p_channel_id
  for update;

  if not found then
    raise exception using
      errcode='23503',
      message='AI_CHANNEL_BACKGROUND_BILLING_CHANNEL_NOT_FOUND';
  end if;

  if v_channel.owner_user_id <> p_billing_user_id then
    raise exception using
      errcode='42501',
      message='AI_CHANNEL_BACKGROUND_BILLING_OWNER_MISMATCH';
  end if;

  select *
  into v_run
  from public.ai_channel_runs_v1
  where id=p_run_id
    and channel_id=p_channel_id
  for update;

  if not found then
    raise exception using
      errcode='23503',
      message='AI_CHANNEL_BACKGROUND_BILLING_RUN_NOT_FOUND';
  end if;

  select *
  into v_usage
  from public.ai_usage_events
  where id=p_usage_event_id
    and app_user_id=p_billing_user_id
  for update;

  if not found then
    raise exception using
      errcode='23503',
      message='AI_CHANNEL_BACKGROUND_BILLING_USAGE_NOT_FOUND';
  end if;

  if coalesce(v_usage.request_idempotency_key,'') <> v_key then
    raise exception using
      errcode='23514',
      message='AI_CHANNEL_BACKGROUND_BILLING_KEY_MISMATCH';
  end if;

  if v_usage.status='openai_failed' then
    raise exception using
      errcode='23514',
      message='AI_CHANNEL_BACKGROUND_BILLING_USAGE_ALREADY_FAILED';
  end if;

  if coalesce(v_usage.reservation_eur,0) <= 0
     and v_usage.status <> 'wallet_debited' then
    raise exception using
      errcode='23514',
      message='AI_CHANNEL_BACKGROUND_BILLING_RESERVATION_REQUIRED';
  end if;

  if v_run.ai_usage_event_id is not null
     or v_run.billing_user_id is not null
     or v_run.billing_request_idempotency_key is not null then
    if v_run.ai_usage_event_id=p_usage_event_id
       and v_run.billing_user_id=p_billing_user_id
       and v_run.billing_request_idempotency_key=v_key then
      v_already := true;
    else
      raise exception using
        errcode='23505',
        message='AI_CHANNEL_BACKGROUND_BILLING_RUN_BIND_CONFLICT';
    end if;
  end if;

  if not v_already then
    update public.ai_channel_runs_v1
    set
      billing_user_id=p_billing_user_id,
      ai_usage_event_id=p_usage_event_id,
      billing_request_idempotency_key=v_key
    where id=p_run_id;
  end if;

  return jsonb_build_object(
    'ok',true,
    'alreadyBound',v_already,
    'channelId',p_channel_id,
    'runId',p_run_id,
    'billingUserId',p_billing_user_id,
    'usageEventId',p_usage_event_id,
    'requestIdempotencyKey',v_key
  );
end;
$function$;

revoke all on function public.bind_ai_channel_run_billing_v1(
  uuid,uuid,uuid,uuid,text
) from public,anon,authenticated;

grant execute on function public.bind_ai_channel_run_billing_v1(
  uuid,uuid,uuid,uuid,text
) to service_role;

create or replace function public.bind_ai_channel_provider_response_v1(
  p_channel_id uuid,
  p_run_id uuid,
  p_billing_user_id uuid,
  p_usage_event_id uuid,
  p_response_id text,
  p_usage jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_channel public.ai_channels_v1%rowtype;
  v_run public.ai_channel_runs_v1%rowtype;
  v_usage public.ai_usage_events%rowtype;
  v_response text;
  v_usage_patch jsonb;
  v_already boolean := false;
begin
  if p_channel_id is null
     or p_run_id is null
     or p_billing_user_id is null
     or p_usage_event_id is null then
    raise exception using
      errcode='22023',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_BIND_IDS_REQUIRED';
  end if;

  v_response := nullif(btrim(coalesce(p_response_id,'')),'');
  if v_response is null
     or v_response !~ '^resp_[A-Za-z0-9_-]+$' then
    raise exception using
      errcode='22023',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_RESPONSE_ID_INVALID';
  end if;

  v_usage_patch := coalesce(p_usage,'{}'::jsonb);
  if jsonb_typeof(v_usage_patch) <> 'object' then
    raise exception using
      errcode='22023',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_USAGE_PATCH_INVALID';
  end if;

  select *
  into v_channel
  from public.ai_channels_v1
  where id=p_channel_id
  for update;

  if not found or v_channel.owner_user_id<>p_billing_user_id then
    raise exception using
      errcode='42501',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_OWNER_MISMATCH';
  end if;

  select *
  into v_run
  from public.ai_channel_runs_v1
  where id=p_run_id
    and channel_id=p_channel_id
  for update;

  if not found
     or v_run.billing_user_id<>p_billing_user_id
     or v_run.ai_usage_event_id<>p_usage_event_id then
    raise exception using
      errcode='23514',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_RUN_NOT_BOUND';
  end if;

  select *
  into v_usage
  from public.ai_usage_events
  where id=p_usage_event_id
    and app_user_id=p_billing_user_id
  for update;

  if not found then
    raise exception using
      errcode='23503',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_USAGE_NOT_FOUND';
  end if;

  if v_run.provider_response_id is not null
     and v_run.provider_response_id<>v_response then
    raise exception using
      errcode='23505',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_RUN_RESPONSE_CONFLICT';
  end if;

  if v_usage.openai_response_id is not null
     and v_usage.openai_response_id<>v_response then
    raise exception using
      errcode='23505',
      message='AI_CHANNEL_BACKGROUND_PROVIDER_USAGE_RESPONSE_CONFLICT';
  end if;

  v_already :=
    v_run.provider_response_id=v_response
    and v_usage.openai_response_id=v_response;

  update public.ai_channel_runs_v1
  set
    provider_response_id=v_response,
    usage=coalesce(usage,'{}'::jsonb) || v_usage_patch
  where id=p_run_id;

  update public.ai_usage_events
  set
    openai_response_id=v_response,
    response_metadata=coalesce(response_metadata,'{}'::jsonb)
      || jsonb_build_object(
        'contract','ARCTOR_AI_BILLING_BACKGROUND_GATEWAY_B3_0_V1',
        'background',true,
        'providerBoundAt',clock_timestamp()
      )
  where id=p_usage_event_id;

  return jsonb_build_object(
    'ok',true,
    'alreadyBound',v_already,
    'channelId',p_channel_id,
    'runId',p_run_id,
    'billingUserId',p_billing_user_id,
    'usageEventId',p_usage_event_id,
    'providerResponseId',v_response
  );
end;
$function$;

revoke all on function public.bind_ai_channel_provider_response_v1(
  uuid,uuid,uuid,uuid,text,jsonb
) from public,anon,authenticated;

grant execute on function public.bind_ai_channel_provider_response_v1(
  uuid,uuid,uuid,uuid,text,jsonb
) to service_role;

do $acceptance$
begin
  if to_regprocedure(
       'public.bind_ai_channel_run_billing_v1(uuid,uuid,uuid,uuid,text)'
     ) is null
     or to_regprocedure(
       'public.bind_ai_channel_provider_response_v1(uuid,uuid,uuid,uuid,text,jsonb)'
     ) is null then
    raise exception using
      errcode='42883',
      message='ARCTOR_AI_BILLING_B3_0_RPC_MISSING_AFTER_WRITE';
  end if;

  if not has_function_privilege(
       'service_role',
       'public.bind_ai_channel_run_billing_v1(uuid,uuid,uuid,uuid,text)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.bind_ai_channel_run_billing_v1(uuid,uuid,uuid,uuid,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.bind_ai_channel_provider_response_v1(uuid,uuid,uuid,uuid,text,jsonb)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.bind_ai_channel_provider_response_v1(uuid,uuid,uuid,uuid,text,jsonb)',
       'EXECUTE'
     ) then
    raise exception using
      errcode='42501',
      message='ARCTOR_AI_BILLING_B3_0_RPC_PRIVILEGE_INVALID';
  end if;
end;
$acceptance$;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_AI_BILLING_B3_0_BACKGROUND_GATEWAY',
    'pass',true,
    'readOnlyVerification',true,
    'contract','ARCTOR_AI_BILLING_BACKGROUND_GATEWAY_B3_0_V1',
    'bindRunRpc',
      to_regprocedure(
        'public.bind_ai_channel_run_billing_v1(uuid,uuid,uuid,uuid,text)'
      ) is not null,
    'bindProviderRpc',
      to_regprocedure(
        'public.bind_ai_channel_provider_response_v1(uuid,uuid,uuid,uuid,text,jsonb)'
      ) is not null,
    'channelRunBillingColumns',
      (
        select count(*)=3
        from information_schema.columns
        where table_schema='public'
          and table_name='ai_channel_runs_v1'
          and column_name in (
            'billing_user_id',
            'ai_usage_event_id',
            'billing_request_idempotency_key'
          )
      ),
    'usageCostBreakdownColumns',
      (
        select count(*)=3
        from information_schema.columns
        where table_schema='public'
          and table_name='ai_usage_events'
          and column_name in (
            'provider_token_cost_eur',
            'provider_tool_calls',
            'provider_tool_cost_eur'
          )
      ),
    'existingChannelRuns',
      (select count(*) from public.ai_channel_runs_v1),
    'existingUsageEvents',
      (select count(*) from public.ai_usage_events),
    'existingRowsRewrittenByMigration',0
  )
) as arctor_ai_billing_b3_0_background_gateway;
