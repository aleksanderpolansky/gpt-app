-- ARCTor.app
-- AI Billing B3.1 — AI Channels -> Background Billing Gateway
-- 2026-09-30
--
-- The runtime migration is in application code. This SQL:
-- 1) refuses deployment while a pre-B3.1 direct-provider channel run is active;
-- 2) records that all four real models are now selectable on AI Channels;
-- 3) verifies active price snapshots required by billing preflight.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
declare
  v_legacy_running bigint;
  v_prices bigint;
begin
  if to_regclass('public.ai_channels_v1') is null
     or to_regclass('public.ai_channel_runs_v1') is null
     or to_regclass('public.ai_usage_events') is null
     or to_regclass('public.ai_model_tiers') is null
     or to_regclass('public.ai_model_price_snapshots') is null then
    raise exception using
      errcode='42P01',
      message='ARCTOR_AI_BILLING_B3_1_REQUIRED_TABLES_MISSING';
  end if;

  if to_regprocedure(
       'public.bind_ai_channel_run_billing_v1(uuid,uuid,uuid,uuid,text)'
     ) is null
     or to_regprocedure(
       'public.bind_ai_channel_provider_response_v1(uuid,uuid,uuid,uuid,text,jsonb)'
     ) is null then
    raise exception using
      errcode='42883',
      message='ARCTOR_AI_BILLING_B3_1_B3_0_RPC_MISSING';
  end if;

  select count(*)
  into v_legacy_running
  from public.ai_channel_runs_v1
  where status='running'
    and ai_usage_event_id is null;

  if v_legacy_running <> 0 then
    raise exception using
      errcode='55000',
      message='ARCTOR_AI_BILLING_B3_1_LEGACY_RUNNING_CHANNELS_PRESENT:' || v_legacy_running::text;
  end if;

  select count(*)
  into v_prices
  from public.ai_model_price_snapshots
  where is_active=true
    and (
      (tier_code='nano' and model_name='gpt-5.6-luna')
      or (tier_code='standard' and model_name='gpt-5.6-terra')
      or (tier_code='pro' and model_name='gpt-5.6-sol')
      or (tier_code='max' and model_name='gpt-6-astra')
    );

  if v_prices < 4 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_1_ACTIVE_MODEL_PRICES_INCOMPLETE:' || v_prices::text;
  end if;
end;
$preflight$;

update public.ai_model_tiers
set
  metadata = coalesce(metadata,'{}'::jsonb)
    || jsonb_build_object(
      'aiChannelSelectable',true,
      'aiChannelBillingContract','ARCTOR_AI_BILLING_BACKGROUND_GATEWAY_B3_0_V1',
      'aiChannelEnabledAt',clock_timestamp()
    ),
  updated_at = now()
where tier_code in ('nano','standard','pro','max');

commit;

select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_AI_BILLING_B3_1_AI_CHANNELS_GATEWAY',
    'pass',true,
    'readOnlyVerification',true,
    'backgroundGatewayContract','ARCTOR_AI_BILLING_BACKGROUND_GATEWAY_B3_0_V1',
    'legacyRunningUnbilledRuns',
      (
        select count(*)
        from public.ai_channel_runs_v1
        where status='running'
          and ai_usage_event_id is null
      ),
    'channelSelectableTiers',
      (
        select count(*)
        from public.ai_model_tiers
        where tier_code in ('nano','standard','pro','max')
          and enabled=true
          and coalesce((metadata->>'aiChannelSelectable')::boolean,false)=true
      ),
    'activeChannelModelPrices',
      (
        select count(*)
        from public.ai_model_price_snapshots
        where is_active=true
          and (
            (tier_code='nano' and model_name='gpt-5.6-luna')
            or (tier_code='standard' and model_name='gpt-5.6-terra')
            or (tier_code='pro' and model_name='gpt-5.6-sol')
            or (tier_code='max' and model_name='gpt-6-astra')
          )
      ),
    'bindRunRpc',
      to_regprocedure(
        'public.bind_ai_channel_run_billing_v1(uuid,uuid,uuid,uuid,text)'
      ) is not null,
    'bindProviderRpc',
      to_regprocedure(
        'public.bind_ai_channel_provider_response_v1(uuid,uuid,uuid,uuid,text,jsonb)'
      ) is not null
  )
) as arctor_ai_billing_b3_1_ai_channels_gateway;
