-- ARCTor.app
-- AI Billing B3.4B1 — Active model-price FX invariant + Sol price repair
-- 2026-10-01
--
-- PURPOSE
-- 1) Replace the stale active GPT-5.6 Sol price snapshot with the current
--    canonical ARCTor / official OpenAI short-context Standard price.
-- 2) Attach the latest already-approved positive ARCTor USD->EUR FX snapshot.
-- 3) Enforce a DB invariant: every ACTIVE USD-priced / EUR-displayed snapshot
--    must have a positive usd_to_eur_rate.
--
-- IMPORTANT
-- * Historical inactive snapshots remain historical.
-- * No wallet / ledger / usage rows are modified.
-- * No OpenAI provider call is made.
-- * This migration is safe to re-run: once exactly one canonical active Sol
--   snapshot exists and the invariant is present, it does not create another.
--
-- GPT-5.6 Sol standard short-context pricing verified 2026-10-01:
-- input $4 / 1M
-- cached input $0.40 / 1M
-- output $20 / 1M
-- https://developers.openai.com/api/docs/models/gpt-5.6-sol
-- https://developers.openai.com/api/docs/pricing

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
declare
  v_fx_count integer;
begin
  if to_regclass('public.ai_model_price_snapshots') is null
     or to_regclass('public.ai_model_tiers') is null
     or to_regclass('public.ai_credit_wallets') is null
     or to_regclass('public.ai_credit_ledger') is null
     or to_regclass('public.ai_usage_events') is null then
    raise exception using
      errcode='42P01',
      message='ARCTOR_AI_BILLING_B3_4B1_FX_REQUIRED_TABLES_MISSING';
  end if;

  select count(*)
  into v_fx_count
  from public.ai_model_price_snapshots s
  where s.provider='openai'
    and s.pricing_currency='USD'
    and s.display_currency='EUR'
    and s.is_active=true
    and s.valid_from <= clock_timestamp()
    and s.usd_to_eur_rate is not null
    and s.usd_to_eur_rate > 0
    and s.eur_markup_multiplier > 0;

  if v_fx_count < 1 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4B1_NO_APPROVED_POSITIVE_ACTIVE_FX_SOURCE';
  end if;

  if not exists (
    select 1
    from public.ai_model_tiers t
    where t.tier_code='pro'
      and t.enabled=true
      and t.default_model_name='gpt-5.6-sol'
  ) then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4B1_PRO_TIER_NOT_SOL';
  end if;
end;
$preflight$;

do $repair$
declare
  v_now timestamptz := clock_timestamp();
  v_fx_source_id uuid;
  v_fx_rate numeric(14,8);
  v_fx_markup numeric(10,6);
  v_active_pro_count integer;
  v_canonical_pro_count integer;
begin
  select
    s.id,
    s.usd_to_eur_rate,
    s.eur_markup_multiplier
  into
    v_fx_source_id,
    v_fx_rate,
    v_fx_markup
  from public.ai_model_price_snapshots s
  where s.provider='openai'
    and s.pricing_currency='USD'
    and s.display_currency='EUR'
    and s.is_active=true
    and s.valid_from <= v_now
    and s.usd_to_eur_rate is not null
    and s.usd_to_eur_rate > 0
    and s.eur_markup_multiplier > 0
  order by s.valid_from desc
  limit 1;

  if v_fx_source_id is null or v_fx_rate is null or v_fx_rate <= 0 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4B1_FX_SOURCE_SELECTION_FAILED';
  end if;

  select count(*)
  into v_active_pro_count
  from public.ai_model_price_snapshots s
  where s.provider='openai'
    and s.tier_code='pro'
    and s.is_active=true
    and s.valid_from <= v_now;

  select count(*)
  into v_canonical_pro_count
  from public.ai_model_price_snapshots s
  where s.provider='openai'
    and s.tier_code='pro'
    and s.model_name='gpt-5.6-sol'
    and s.pricing_currency='USD'
    and s.display_currency='EUR'
    and s.is_active=true
    and s.valid_from <= v_now
    and s.input_cost_per_1m_tokens=4.00000000
    and coalesce(s.cached_input_cost_per_1m_tokens,-1)=0.40000000
    and s.output_cost_per_1m_tokens=20.00000000
    and s.usd_to_eur_rate is not null
    and s.usd_to_eur_rate > 0
    and s.eur_markup_multiplier > 0;

  -- Canonical active state is exactly one Pro/Sol row with current price + FX.
  if v_active_pro_count <> 1 or v_canonical_pro_count <> 1 then
    update public.ai_model_price_snapshots
    set
      is_active=false,
      valid_to=coalesce(valid_to,v_now),
      metadata=coalesce(metadata,'{}'::jsonb)
        || jsonb_build_object(
          'closedByContract','ARCTOR_AI_BILLING_B3_4B1_ACTIVE_PRICE_FX_INVARIANT_V1',
          'closedAt',v_now,
          'reason','replace_with_current_canonical_sol_price_and_positive_fx'
        )
    where provider='openai'
      and tier_code='pro'
      and is_active=true;

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
    values (
      'pro',
      'gpt-5.6-sol',
      'openai',
      'USD',
      'EUR',
      4.00000000,
      0.40000000,
      20.00000000,
      v_fx_rate,
      v_fx_markup,
      v_now,
      null,
      true,
      'https://developers.openai.com/api/docs/models/gpt-5.6-sol',
      'GPT-5.6 Sol standard short-context price verified 2026-10-01 against official OpenAI documentation. EUR billing uses the latest already-approved positive ARCTor USD/EUR snapshot.',
      jsonb_build_object(
        'verification_contract','ARCTOR_AI_BILLING_B3_4B1_ACTIVE_PRICE_FX_INVARIANT_V1',
        'verified_at','2026-10-01',
        'pricing_context','standard processing, short context',
        'pricing_source','https://developers.openai.com/api/docs/pricing',
        'model_source','https://developers.openai.com/api/docs/models/gpt-5.6-sol',
        'input_usd_per_1m_tokens',4,
        'cached_input_usd_per_1m_tokens',0.4,
        'output_usd_per_1m_tokens',20,
        'fx_source_snapshot_id',v_fx_source_id,
        'usd_to_eur_rate',v_fx_rate,
        'eur_markup_multiplier',v_fx_markup
      )
    );
  end if;

  -- Repair any other ACTIVE USD/EUR snapshot that somehow still has missing FX.
  -- Historical inactive rows are intentionally left untouched.
  update public.ai_model_price_snapshots s
  set
    usd_to_eur_rate=v_fx_rate,
    eur_markup_multiplier=
      case
        when s.eur_markup_multiplier is null or s.eur_markup_multiplier <= 0
          then v_fx_markup
        else s.eur_markup_multiplier
      end,
    metadata=coalesce(s.metadata,'{}'::jsonb)
      || jsonb_build_object(
        'fxBackfillContract','ARCTOR_AI_BILLING_B3_4B1_ACTIVE_PRICE_FX_INVARIANT_V1',
        'fxBackfilledAt',v_now,
        'fxSourceSnapshotId',v_fx_source_id,
        'usdToEurRate',v_fx_rate
      )
  where s.provider='openai'
    and s.pricing_currency='USD'
    and s.display_currency='EUR'
    and s.is_active=true
    and (
      s.usd_to_eur_rate is null
      or s.usd_to_eur_rate <= 0
    );
end;
$repair$;

alter table public.ai_model_price_snapshots
  drop constraint if exists ai_model_price_snapshots_active_usd_eur_requires_fx;

alter table public.ai_model_price_snapshots
  add constraint ai_model_price_snapshots_active_usd_eur_requires_fx
  check (
    not (
      is_active=true
      and pricing_currency='USD'
      and display_currency='EUR'
    )
    or (
      usd_to_eur_rate is not null
      and usd_to_eur_rate > 0
      and eur_markup_multiplier > 0
    )
  );

do $acceptance$
declare
  v_constraint text;
  v_invalid integer;
  v_active_pro integer;
  v_canonical_pro integer;
begin
  select pg_get_constraintdef(c.oid)
  into v_constraint
  from pg_constraint c
  where c.conrelid='public.ai_model_price_snapshots'::regclass
    and c.conname='ai_model_price_snapshots_active_usd_eur_requires_fx';

  if v_constraint is null
     or position('usd_to_eur_rate' in v_constraint)=0 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4B1_ACTIVE_FX_CONSTRAINT_MISSING';
  end if;

  select count(*)
  into v_invalid
  from public.ai_model_price_snapshots s
  where s.provider='openai'
    and s.pricing_currency='USD'
    and s.display_currency='EUR'
    and s.is_active=true
    and (
      s.usd_to_eur_rate is null
      or s.usd_to_eur_rate <= 0
      or s.eur_markup_multiplier <= 0
    );

  if v_invalid <> 0 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4B1_ACTIVE_USD_FX_STILL_INVALID';
  end if;

  select count(*)
  into v_active_pro
  from public.ai_model_price_snapshots s
  where s.provider='openai'
    and s.tier_code='pro'
    and s.is_active=true;

  select count(*)
  into v_canonical_pro
  from public.ai_model_price_snapshots s
  where s.provider='openai'
    and s.tier_code='pro'
    and s.model_name='gpt-5.6-sol'
    and s.pricing_currency='USD'
    and s.display_currency='EUR'
    and s.is_active=true
    and s.input_cost_per_1m_tokens=4.00000000
    and coalesce(s.cached_input_cost_per_1m_tokens,-1)=0.40000000
    and s.output_cost_per_1m_tokens=20.00000000
    and s.usd_to_eur_rate is not null
    and s.usd_to_eur_rate > 0
    and s.eur_markup_multiplier > 0;

  if v_active_pro <> 1 or v_canonical_pro <> 1 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_BILLING_B3_4B1_CANONICAL_SOL_ACTIVE_STATE_INVALID';
  end if;
end;
$acceptance$;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_AI_BILLING_B3_4B1_ACTIVE_PRICE_FX_INVARIANT',
    'pass',true,
    'contract','ARCTOR_AI_BILLING_B3_4B1_ACTIVE_PRICE_FX_INVARIANT_V1',
    'openAiCallsMade',0,
    'walletLedgerUsageRowsModified',0,
    'activeFxConstraint',
      (
        select pg_get_constraintdef(c.oid)
        from pg_constraint c
        where c.conrelid='public.ai_model_price_snapshots'::regclass
          and c.conname='ai_model_price_snapshots_active_usd_eur_requires_fx'
        limit 1
      ),
    'invalidActiveUsdFxCount',
      (
        select count(*)
        from public.ai_model_price_snapshots s
        where s.provider='openai'
          and s.pricing_currency='USD'
          and s.display_currency='EUR'
          and s.is_active=true
          and (
            s.usd_to_eur_rate is null
            or s.usd_to_eur_rate <= 0
            or s.eur_markup_multiplier <= 0
          )
      ),
    'activeProCount',
      (
        select count(*)
        from public.ai_model_price_snapshots s
        where s.provider='openai'
          and s.tier_code='pro'
          and s.is_active=true
      ),
    'activeSol',
      (
        select jsonb_build_object(
          'id',s.id,
          'tierCode',s.tier_code,
          'modelName',s.model_name,
          'inputUsdPer1M',s.input_cost_per_1m_tokens,
          'cachedInputUsdPer1M',s.cached_input_cost_per_1m_tokens,
          'outputUsdPer1M',s.output_cost_per_1m_tokens,
          'usdToEurRate',s.usd_to_eur_rate,
          'eurMarkupMultiplier',s.eur_markup_multiplier,
          'validFrom',s.valid_from,
          'metadata',s.metadata
        )
        from public.ai_model_price_snapshots s
        where s.provider='openai'
          and s.tier_code='pro'
          and s.model_name='gpt-5.6-sol'
          and s.is_active=true
        order by s.valid_from desc
        limit 1
      ),
    'activePrices',
      (
        select jsonb_agg(
          jsonb_build_object(
            'tierCode',x.tier_code,
            'modelName',x.model_name,
            'inputUsdPer1M',x.input_cost_per_1m_tokens,
            'cachedInputUsdPer1M',x.cached_input_cost_per_1m_tokens,
            'outputUsdPer1M',x.output_cost_per_1m_tokens,
            'usdToEurRate',x.usd_to_eur_rate,
            'validFrom',x.valid_from
          )
          order by x.tier_code
        )
        from (
          select distinct on (s.tier_code)
            s.*
          from public.ai_model_price_snapshots s
          where s.provider='openai'
            and s.is_active=true
          order by s.tier_code,s.valid_from desc
        ) x
      )
  )
) as arctor_ai_billing_b3_4b1_active_price_fx_invariant;
