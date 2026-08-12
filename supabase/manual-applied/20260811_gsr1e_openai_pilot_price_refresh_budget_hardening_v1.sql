/*
ARCTor.app — GSR-1E
OpenAI pilot price refresh + stricter token envelope v1
2026-08-11

MANUAL SUPABASE SQL EDITOR STEP.
NO OPENAI API CALLS ARE MADE.

Purpose:
1) refresh the three ARCTor pilot model price snapshots against current official
   OpenAI model documentation;
2) set the already-approved tier -> model mapping explicitly;
3) keep the existing USD 0.10 hard operation cap;
4) close a safety gap by blocking oversized pilot token envelopes before any
   provider request can be attempted.

LOCKED PILOT LIMITS
- operation hard cap: USD 0.10 total
- max OpenAI calls per operation: 3
- operation timeout: 60 seconds
- max input tokens per individual pilot call: 20,000
- max output tokens requested per individual pilot call: 4,000
- price snapshot max age: 7 days
- no persistent expensive-test bypass

Current verified standard text-token pricing, USD per 1M tokens:
- gpt-5.4-nano: input 0.20, cached 0.02, output 1.25
- gpt-5.4-mini: input 0.75, cached 0.075, output 4.50
- gpt-5.5: input 5.00, cached 0.50, output 30.00

No EUR FX value is invented here. The hard pilot safety gate operates directly
in provider USD.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- ===========================================================================
-- 1. Hard preflight
-- ===========================================================================

do $preflight$
begin
  if to_regclass('public.ai_model_tiers') is null
     or to_regclass('public.ai_model_price_snapshots') is null
     or to_regclass('public.ai_pilot_budget_reservations_gsr1') is null
     or to_regclass('public.ai_usage_events') is null then
    raise exception using
      errcode='42P01',
      message='GSR1E_REQUIRED_AI_BILLING_TABLES_MISSING';
  end if;

  if to_regprocedure(
       'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)'
     ) is null then
    raise exception using
      errcode='42883',
      message='GSR1E_AI_BUDGET_PREFLIGHT_RPC_MISSING';
  end if;

  if (
    select count(*)
    from public.ai_model_tiers
    where tier_code in ('nano','standard','pro')
      and enabled=true
  ) <> 3 then
    raise exception using
      errcode='23514',
      message='GSR1E_EXPECTED_THREE_ENABLED_TIERS';
  end if;

  if (
    select count(*)
    from public.ai_model_price_snapshots
    where provider='openai'
      and is_active=true
      and valid_to is null
      and (
        (tier_code='nano' and model_name='gpt-5.4-nano')
        or
        (tier_code='standard' and model_name='gpt-5.4-mini')
        or
        (tier_code='pro' and model_name='gpt-5.5')
      )
  ) <> 3 then
    raise exception using
      errcode='23514',
      message='GSR1E_EXPECTED_ACTIVE_PRICE_BASELINE_NOT_FOUND';
  end if;

  -- Refuse to silently overwrite an already refreshed 2026-08-11 pilot
  -- snapshot. This is a one-time manual refresh step.
  if exists (
    select 1
    from public.ai_model_price_snapshots
    where provider='openai'
      and metadata->>'verification_contract'='ARCTOR_GSR1E_OPENAI_PILOT_PRICES_V1'
  ) then
    raise exception using
      errcode='23514',
      message='GSR1E_PRICE_REFRESH_ALREADY_APPLIED';
  end if;
end;
$preflight$;

-- ===========================================================================
-- 2. Close the three stale active snapshots and insert freshly verified ones
-- ===========================================================================

do $price_refresh$
declare
  v_now timestamptz := clock_timestamp();
begin
  update public.ai_model_price_snapshots
  set
    is_active=false,
    valid_to=v_now
  where provider='openai'
    and is_active=true
    and valid_to is null
    and (
      (tier_code='nano' and model_name='gpt-5.4-nano')
      or
      (tier_code='standard' and model_name='gpt-5.4-mini')
      or
      (tier_code='pro' and model_name='gpt-5.5')
    );

  if not found then
    raise exception using
      errcode='23514',
      message='GSR1E_STALE_PRICE_SNAPSHOT_CLOSE_FAILED';
  end if;

  insert into public.ai_model_price_snapshots (
    tier_code,
    model_name,
    provider,
    pricing_currency,
    display_currency,
    input_cost_per_1m_tokens,
    cached_input_cost_per_1m_tokens,
    output_cost_per_1m_tokens,
    usd_to_eur_rate,
    eur_markup_multiplier,
    valid_from,
    valid_to,
    is_active,
    source_url,
    source_note,
    metadata
  )
  values
    (
      'nano',
      'gpt-5.4-nano',
      'openai',
      'USD',
      'EUR',
      0.20000000,
      0.02000000,
      1.25000000,
      null,
      1.000000,
      v_now,
      null,
      true,
      'https://developers.openai.com/api/docs/models/gpt-5.4-nano',
      'Verified 2026-08-11 against official OpenAI model documentation. Standard text-token pricing in USD per 1M tokens.',
      jsonb_build_object(
        'verification_contract','ARCTOR_GSR1E_OPENAI_PILOT_PRICES_V1',
        'verified_at','2026-08-11',
        'budget_currency','USD',
        'fx_intentionally_unset',true
      )
    ),
    (
      'standard',
      'gpt-5.4-mini',
      'openai',
      'USD',
      'EUR',
      0.75000000,
      0.07500000,
      4.50000000,
      null,
      1.000000,
      v_now,
      null,
      true,
      'https://developers.openai.com/api/docs/models/gpt-5.4-mini',
      'Verified 2026-08-11 against official OpenAI model documentation. Standard text-token pricing in USD per 1M tokens.',
      jsonb_build_object(
        'verification_contract','ARCTOR_GSR1E_OPENAI_PILOT_PRICES_V1',
        'verified_at','2026-08-11',
        'budget_currency','USD',
        'fx_intentionally_unset',true
      )
    ),
    (
      'pro',
      'gpt-5.5',
      'openai',
      'USD',
      'EUR',
      5.00000000,
      0.50000000,
      30.00000000,
      null,
      1.000000,
      v_now,
      null,
      true,
      'https://developers.openai.com/api/docs/models/gpt-5.5',
      'Verified 2026-08-11 against official OpenAI model documentation. Standard text-token pricing in USD per 1M tokens.',
      jsonb_build_object(
        'verification_contract','ARCTOR_GSR1E_OPENAI_PILOT_PRICES_V1',
        'verified_at','2026-08-11',
        'budget_currency','USD',
        'fx_intentionally_unset',true
      )
    );

  update public.ai_model_tiers
  set
    default_model_name =
      case tier_code
        when 'nano' then 'gpt-5.4-nano'
        when 'standard' then 'gpt-5.4-mini'
        when 'pro' then 'gpt-5.5'
      end,
    updated_at=v_now
  where tier_code in ('nano','standard','pro');
end;
$price_refresh$;

-- ===========================================================================
-- 3. Harden the existing pilot budget preflight
-- ===========================================================================

create or replace function public.preflight_ai_pilot_call_budget_v1(
  p_app_user_id uuid,
  p_operation_id uuid,
  p_tier_code text,
  p_model_name text,
  p_input_tokens integer,
  p_cached_input_tokens integer,
  p_max_output_tokens integer
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_snapshot public.ai_model_price_snapshots%rowtype;

  v_hard_cap_usd constant numeric := 0.10;
  v_max_calls constant integer := 3;
  v_timeout_ms constant integer := 60000;
  v_price_max_age interval := interval '7 days';

  v_max_input_tokens constant integer := 20000;
  v_max_output_tokens constant integer := 4000;

  v_call_count integer := 0;
  v_call_index integer := 1;
  v_first_call_at timestamptz;

  v_existing_reserved_usd numeric := 0;
  v_uncached_input_tokens integer;
  v_cached_price numeric;
  v_new_max_cost_usd numeric;
  v_new_operation_max_usd numeric;

  v_reservation_id uuid;
begin
  if p_app_user_id is null
     or p_operation_id is null
     or nullif(btrim(p_tier_code),'') is null
     or nullif(btrim(p_model_name),'') is null then
    raise exception using
      errcode='22023',
      message='GSR1D_AI_BUDGET_REQUIRED_ARGUMENT_MISSING';
  end if;

  if p_input_tokens is null
     or p_cached_input_tokens is null
     or p_max_output_tokens is null
     or p_input_tokens < 0
     or p_cached_input_tokens < 0
     or p_cached_input_tokens > p_input_tokens
     or p_max_output_tokens < 1 then
    raise exception using
      errcode='22023',
      message='GSR1D_AI_BUDGET_TOKEN_ENVELOPE_INVALID';
  end if;

  if p_input_tokens > v_max_input_tokens then
    return jsonb_build_object(
      'allowed',false,
      'reason','PILOT_INPUT_TOKEN_LIMIT',
      'operationId',p_operation_id,
      'inputTokens',p_input_tokens,
      'maxInputTokens',v_max_input_tokens,
      'hardCapUsd',v_hard_cap_usd,
      'requiresFreshExplicitConfirmation',false
    );
  end if;

  if p_max_output_tokens > v_max_output_tokens then
    return jsonb_build_object(
      'allowed',false,
      'reason','PILOT_OUTPUT_TOKEN_LIMIT',
      'operationId',p_operation_id,
      'maxOutputTokensRequested',p_max_output_tokens,
      'maxOutputTokensAllowed',v_max_output_tokens,
      'hardCapUsd',v_hard_cap_usd,
      'requiresFreshExplicitConfirmation',false
    );
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_operation_id::text,
      0
    )
  );

  if exists (
    select 1
    from public.ai_pilot_budget_reservations_gsr1 reservation
    where reservation.operation_id=p_operation_id
      and reservation.app_user_id is distinct from p_app_user_id
  ) then
    raise exception using
      errcode='42501',
      message='GSR1D_AI_BUDGET_OPERATION_USER_MISMATCH';
  end if;

  select
    count(*)::integer,
    min(created_at),
    coalesce(sum(estimated_max_cost_usd),0)
  into
    v_call_count,
    v_first_call_at,
    v_existing_reserved_usd
  from public.ai_pilot_budget_reservations_gsr1
  where operation_id=p_operation_id
    and app_user_id=p_app_user_id;

  if v_call_count >= v_max_calls then
    return jsonb_build_object(
      'allowed',false,
      'reason','MAX_CALLS_REACHED',
      'operationId',p_operation_id,
      'hardCapUsd',v_hard_cap_usd,
      'maxCalls',v_max_calls,
      'callCount',v_call_count,
      'timeoutMs',v_timeout_ms,
      'requiresFreshExplicitConfirmation',false
    );
  end if;

  if v_first_call_at is not null
     and clock_timestamp() >
       v_first_call_at + make_interval(secs => v_timeout_ms / 1000) then
    return jsonb_build_object(
      'allowed',false,
      'reason','OPERATION_TIMEOUT',
      'operationId',p_operation_id,
      'hardCapUsd',v_hard_cap_usd,
      'maxCalls',v_max_calls,
      'callCount',v_call_count,
      'timeoutMs',v_timeout_ms,
      'requiresFreshExplicitConfirmation',false
    );
  end if;

  select *
  into v_snapshot
  from public.ai_model_price_snapshots snapshot
  where snapshot.provider='openai'
    and snapshot.tier_code=btrim(p_tier_code)
    and snapshot.model_name=btrim(p_model_name)
    and snapshot.pricing_currency='USD'
    and snapshot.is_active=true
    and snapshot.valid_from <= clock_timestamp()
    and (
      snapshot.valid_to is null
      or snapshot.valid_to > clock_timestamp()
    )
  order by snapshot.valid_from desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'allowed',false,
      'reason','PRICE_UNKNOWN',
      'operationId',p_operation_id,
      'modelName',btrim(p_model_name),
      'tierCode',btrim(p_tier_code),
      'hardCapUsd',v_hard_cap_usd,
      'requiresFreshExplicitConfirmation',false
    );
  end if;

  if v_snapshot.valid_from < clock_timestamp() - v_price_max_age then
    return jsonb_build_object(
      'allowed',false,
      'reason','PRICE_SNAPSHOT_STALE',
      'operationId',p_operation_id,
      'modelName',v_snapshot.model_name,
      'tierCode',v_snapshot.tier_code,
      'priceSnapshotId',v_snapshot.id,
      'priceValidFrom',v_snapshot.valid_from,
      'maxPriceAgeDays',7,
      'hardCapUsd',v_hard_cap_usd,
      'requiresFreshExplicitConfirmation',false
    );
  end if;

  v_cached_price := coalesce(
    v_snapshot.cached_input_cost_per_1m_tokens,
    v_snapshot.input_cost_per_1m_tokens
  );

  v_uncached_input_tokens := p_input_tokens - p_cached_input_tokens;

  v_new_max_cost_usd := round(
    (
      (
        v_uncached_input_tokens::numeric
        * v_snapshot.input_cost_per_1m_tokens
      )
      +
      (
        p_cached_input_tokens::numeric
        * v_cached_price
      )
      +
      (
        p_max_output_tokens::numeric
        * v_snapshot.output_cost_per_1m_tokens
      )
    ) / 1000000::numeric,
    8
  );

  v_new_operation_max_usd :=
    v_existing_reserved_usd + v_new_max_cost_usd;

  if v_new_operation_max_usd > v_hard_cap_usd then
    return jsonb_build_object(
      'allowed',false,
      'reason','HARD_COST_CAP_EXCEEDED',
      'operationId',p_operation_id,
      'modelName',v_snapshot.model_name,
      'tierCode',v_snapshot.tier_code,
      'priceSnapshotId',v_snapshot.id,
      'existingReservedUsd',v_existing_reserved_usd,
      'requestedCallMaxCostUsd',v_new_max_cost_usd,
      'operationMaxCostUsd',v_new_operation_max_usd,
      'hardCapUsd',v_hard_cap_usd,
      'overByUsd',v_new_operation_max_usd-v_hard_cap_usd,
      'requiresFreshExplicitConfirmation',true
    );
  end if;

  v_call_index := v_call_count + 1;

  insert into public.ai_pilot_budget_reservations_gsr1 (
    operation_id,
    app_user_id,
    call_index,
    tier_code,
    model_name,
    price_snapshot_id,
    input_tokens,
    cached_input_tokens,
    max_output_tokens,
    estimated_max_cost_usd
  )
  values (
    p_operation_id,
    p_app_user_id,
    v_call_index,
    v_snapshot.tier_code,
    v_snapshot.model_name,
    v_snapshot.id,
    p_input_tokens,
    p_cached_input_tokens,
    p_max_output_tokens,
    v_new_max_cost_usd
  )
  returning id into v_reservation_id;

  return jsonb_build_object(
    'allowed',true,
    'reason','WITHIN_HARD_CAP',
    'contractVersion','GSR1E_AI_PILOT_HARD_BUDGET_V1',
    'operationId',p_operation_id,
    'reservationId',v_reservation_id,
    'callIndex',v_call_index,
    'maxCalls',v_max_calls,
    'remainingCalls',v_max_calls-v_call_index,
    'timeoutMs',v_timeout_ms,
    'modelName',v_snapshot.model_name,
    'tierCode',v_snapshot.tier_code,
    'priceSnapshotId',v_snapshot.id,
    'inputTokens',p_input_tokens,
    'maxInputTokens',v_max_input_tokens,
    'cachedInputTokens',p_cached_input_tokens,
    'maxOutputTokens',p_max_output_tokens,
    'maxOutputTokensAllowed',v_max_output_tokens,
    'requestedCallMaxCostUsd',v_new_max_cost_usd,
    'operationReservedMaxCostUsd',v_new_operation_max_usd,
    'hardCapUsd',v_hard_cap_usd,
    'remainingBudgetUsd',v_hard_cap_usd-v_new_operation_max_usd,
    'requiresFreshExplicitConfirmation',false
  );
end;
$function$;

revoke all
on function public.preflight_ai_pilot_call_budget_v1(
  uuid,uuid,text,text,integer,integer,integer
)
from public,anon,authenticated;

grant execute
on function public.preflight_ai_pilot_call_budget_v1(
  uuid,uuid,text,text,integer,integer,integer
)
to service_role;

-- ===========================================================================
-- 4. Acceptance
-- ===========================================================================

do $acceptance$
begin
  if (
    select count(*)
    from public.ai_model_price_snapshots
    where provider='openai'
      and is_active=true
      and valid_to is null
      and metadata->>'verification_contract'=
        'ARCTOR_GSR1E_OPENAI_PILOT_PRICES_V1'
  ) <> 3 then
    raise exception using
      errcode='23514',
      message='GSR1E_FRESH_ACTIVE_PRICE_COUNT_NOT_THREE';
  end if;

  if exists (
    select 1
    from public.ai_model_tiers
    where
      (tier_code='nano'
       and default_model_name is distinct from 'gpt-5.4-nano')
      or
      (tier_code='standard'
       and default_model_name is distinct from 'gpt-5.4-mini')
      or
      (tier_code='pro'
       and default_model_name is distinct from 'gpt-5.5')
  ) then
    raise exception using
      errcode='23514',
      message='GSR1E_TIER_MODEL_MAPPING_FAILED';
  end if;

  if has_function_privilege(
       'anon',
       'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)',
       'EXECUTE'
     ) then
    raise exception using
      errcode='42501',
      message='GSR1E_BUDGET_RPC_PRIVILEGE_GUARD_FAILED';
  end if;
end;
$acceptance$;

commit;

-- ===========================================================================
-- 5. Compact result
-- ===========================================================================

select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_GSR1E_OPENAI_PILOT_PRICE_REFRESH_BUDGET_HARDENING_V1',
    'hard_cap_usd',0.10,
    'max_calls_per_operation',3,
    'operation_timeout_ms',60000,
    'max_input_tokens_per_call',20000,
    'max_output_tokens_per_call',4000,
    'max_price_snapshot_age_days',7,

    'tiers',
      (
        select jsonb_agg(
          jsonb_build_object(
            'tierCode',tier.tier_code,
            'defaultModelName',tier.default_model_name,
            'priceSnapshotId',snapshot.id,
            'validFrom',snapshot.valid_from,
            'inputUsdPer1M',snapshot.input_cost_per_1m_tokens,
            'cachedInputUsdPer1M',snapshot.cached_input_cost_per_1m_tokens,
            'outputUsdPer1M',snapshot.output_cost_per_1m_tokens,
            'priceFresh',
              snapshot.valid_from >=
                clock_timestamp()-interval '7 days'
          )
          order by tier.sort_order
        )
        from public.ai_model_tiers tier
        join public.ai_model_price_snapshots snapshot
          on snapshot.tier_code=tier.tier_code
         and snapshot.model_name=tier.default_model_name
         and snapshot.provider='openai'
         and snapshot.is_active=true
         and snapshot.valid_to is null
        where tier.tier_code in ('nano','standard','pro')
      ),

    'global_fact_writer_rpc',
      to_regprocedure(
        'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)'
      ) is not null,

    'budget_preflight_rpc',
      to_regprocedure(
        'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)'
      ) is not null,

    'openai_calls_made_by_this_sql',0
  )
) as gsr1e_result;
