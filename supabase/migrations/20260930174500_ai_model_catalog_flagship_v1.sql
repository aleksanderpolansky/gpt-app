-- ARCTor.app
-- Unified AI model catalog / flagship model slot
-- 2026-09-30
--
-- Public/user-facing model names must be real provider model names.
-- Internal tier codes remain compatibility keys for existing billing tables.
--
-- Official OpenAI standard short-context prices used for GPT-6 Astra:
-- input $10 / 1M
-- cached input $1 / 1M
-- output $50 / 1M
-- Source: https://developers.openai.com/api/docs/models/gpt-6-astra
--         https://developers.openai.com/api/docs/pricing

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.ai_model_tiers') is null
     or to_regclass('public.ai_model_price_snapshots') is null then
    raise exception using
      errcode='42P01',
      message='ARCTOR_AI_MODEL_CATALOG_REQUIRED_TABLES_MISSING';
  end if;
end;
$preflight$;

alter table public.ai_model_tiers
  drop constraint if exists ai_model_tiers_tier_code_allowed;

alter table public.ai_model_tiers
  add constraint ai_model_tiers_tier_code_allowed
  check (tier_code in ('nano','standard','pro','max'));

update public.ai_model_tiers
set
  display_name = case tier_code
    when 'nano' then 'GPT-5.6 Luna'
    when 'standard' then 'GPT-5.6 Terra'
    when 'pro' then 'GPT-5.6 Sol'
    else display_name
  end,
  default_model_name = case tier_code
    when 'nano' then 'gpt-5.6-luna'
    when 'standard' then 'gpt-5.6-terra'
    when 'pro' then 'gpt-5.6-sol'
    else default_model_name
  end,
  metadata = coalesce(metadata,'{}'::jsonb)
    || jsonb_build_object(
      'userFacingModelName', true,
      'catalogContract', 'ARCTOR_AI_MODEL_CATALOG_V2_20260930'
    ),
  updated_at = now()
where tier_code in ('nano','standard','pro');

insert into public.ai_model_tiers (
  tier_code,
  display_name,
  description,
  default_model_name,
  warning_level,
  enabled,
  sort_order,
  metadata
)
values (
  'max',
  'GPT-6 Astra',
  'OpenAI flagship model for the most demanding requests.',
  'gpt-6-astra',
  'high',
  true,
  40,
  jsonb_build_object(
    'catalogContract','ARCTOR_AI_MODEL_CATALOG_V2_20260930',
    'userFacingModelName',true,
    'flagship',true,
    'navigatorSelectable',true,
    'aiChannelSelectable',false,
    'aiChannelReason','Enable only after AI channel provider execution migrates to the unified billing gateway.'
  )
)
on conflict (tier_code) do update
set
  display_name = excluded.display_name,
  description = excluded.description,
  default_model_name = excluded.default_model_name,
  warning_level = excluded.warning_level,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  metadata = coalesce(public.ai_model_tiers.metadata,'{}'::jsonb)
    || excluded.metadata,
  updated_at = now();

-- Close only an incorrect active snapshot for the internal max slot.
update public.ai_model_price_snapshots
set
  is_active = false,
  valid_to = coalesce(valid_to, now())
where
  tier_code = 'max'
  and is_active = true
  and (
    model_name <> 'gpt-6-astra'
    or input_cost_per_1m_tokens <> 10
    or coalesce(cached_input_cost_per_1m_tokens,-1) <> 1
    or output_cost_per_1m_tokens <> 50
  );

with latest_fx as (
  select
    usd_to_eur_rate,
    eur_markup_multiplier
  from public.ai_model_price_snapshots
  where
    provider = 'openai'
    and pricing_currency = 'USD'
    and usd_to_eur_rate is not null
    and usd_to_eur_rate > 0
  order by valid_from desc
  limit 1
)
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
select
  'max',
  'gpt-6-astra',
  'openai',
  'USD',
  'EUR',
  10.00000000::numeric,
  1.00000000::numeric,
  50.00000000::numeric,
  fx.usd_to_eur_rate,
  coalesce(fx.eur_markup_multiplier,1),
  now(),
  null,
  true,
  'https://developers.openai.com/api/docs/models/gpt-6-astra',
  'Official OpenAI GPT-6 Astra standard short-context token pricing verified 2026-09-30. Prices stored in USD per 1M tokens; EUR projection uses latest existing ARCTor USD/EUR snapshot.',
  jsonb_build_object(
    'catalogContract','ARCTOR_AI_MODEL_CATALOG_V2_20260930',
    'verifiedAt','2026-09-30',
    'pricingSource','https://developers.openai.com/api/docs/pricing',
    'modelSource','https://developers.openai.com/api/docs/models/gpt-6-astra',
    'inputUsdPer1m',10,
    'cachedInputUsdPer1m',1,
    'outputUsdPer1m',50,
    'pricingContext','standard processing, short context'
  )
from latest_fx fx
where not exists (
  select 1
  from public.ai_model_price_snapshots s
  where
    s.tier_code = 'max'
    and s.model_name = 'gpt-6-astra'
    and s.provider = 'openai'
    and s.is_active = true
    and s.input_cost_per_1m_tokens = 10
    and coalesce(s.cached_input_cost_per_1m_tokens,-1) = 1
    and s.output_cost_per_1m_tokens = 50
);

do $acceptance$
declare
  v_constraint text;
begin
  select pg_get_constraintdef(oid)
  into v_constraint
  from pg_constraint
  where conrelid='public.ai_model_tiers'::regclass
    and conname='ai_model_tiers_tier_code_allowed';

  if v_constraint is null or position('max' in v_constraint) = 0 then
    raise exception using
      errcode='23514',
      message='ARCTOR_AI_MODEL_CATALOG_MAX_CONSTRAINT_MISSING';
  end if;

  if not exists (
    select 1
    from public.ai_model_tiers
    where tier_code='max'
      and enabled=true
      and default_model_name='gpt-6-astra'
      and display_name='GPT-6 Astra'
  ) then
    raise exception using
      errcode='P0001',
      message='ARCTOR_AI_MODEL_CATALOG_ASTRA_TIER_MISSING';
  end if;

  if not exists (
    select 1
    from public.ai_model_price_snapshots
    where tier_code='max'
      and model_name='gpt-6-astra'
      and provider='openai'
      and is_active=true
      and input_cost_per_1m_tokens=10
      and coalesce(cached_input_cost_per_1m_tokens,-1)=1
      and output_cost_per_1m_tokens=50
  ) then
    raise exception using
      errcode='P0001',
      message='ARCTOR_AI_MODEL_CATALOG_ASTRA_PRICE_MISSING';
  end if;
end;
$acceptance$;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_AI_MODEL_CATALOG_FLAGSHIP_V1',
    'pass',true,
    'catalogContract','ARCTOR_AI_MODEL_CATALOG_V2_20260930',
    'userFacingModels',
      (
        select jsonb_agg(
          jsonb_build_object(
            'tierCode',t.tier_code,
            'displayName',t.display_name,
            'modelName',t.default_model_name,
            'enabled',t.enabled,
            'sortOrder',t.sort_order
          )
          order by t.sort_order
        )
        from public.ai_model_tiers t
        where t.tier_code in ('nano','standard','pro','max')
      ),
    'astraActivePrice',
      (
        select jsonb_build_object(
          'modelName',s.model_name,
          'inputUsdPer1m',s.input_cost_per_1m_tokens,
          'cachedInputUsdPer1m',s.cached_input_cost_per_1m_tokens,
          'outputUsdPer1m',s.output_cost_per_1m_tokens,
          'usdToEurRate',s.usd_to_eur_rate,
          'markup',s.eur_markup_multiplier,
          'priceSnapshotId',s.id
        )
        from public.ai_model_price_snapshots s
        where s.tier_code='max'
          and s.model_name='gpt-6-astra'
          and s.is_active=true
        order by s.valid_from desc
        limit 1
      )
  )
) as arctor_ai_model_catalog_flagship_v1;
