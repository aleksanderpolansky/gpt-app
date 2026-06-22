-- GPT-APP / AI-NAVIGATOR
-- Step 18N-R2: AI model price snapshots seed draft for the actual active schema.
--
-- Purpose:
--   Replace the user-facing "ожидаем цены" state with approximate Nano / Standard / Pro token projections.
--
-- Safety:
--   This file is a SQL migration draft only.
--   It is NOT executed by the generator script.
--   Execute only after a separate explicit SQL execution gate.
--   Commit/push only after a separate git gate.
--
-- Actual schema columns used:
--   tier_code
--   model_name
--   provider
--   pricing_currency
--   display_currency
--   input_cost_per_1m_tokens
--   cached_input_cost_per_1m_tokens
--   output_cost_per_1m_tokens
--   usd_to_eur_rate
--   eur_markup_multiplier
--   valid_from
--   valid_to
--   is_active
--   source_url
--   source_note
--   metadata
--
-- Pricing source:
--   https://developers.openai.com/api/docs/pricing/
-- FX source:
--   https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html
-- FX snapshot:
--   2026-06-22: 1 EUR = 1.1456 USD, so 1 USD = 0.872905028 EUR.
--
-- Tier mapping used in this draft:
--   nano     -> gpt-5.4-nano
--   standard -> gpt-5.4-mini
--   pro      -> gpt-5.5
--
-- Note:
--   gpt-5.5-pro is intentionally not mapped to user-facing "Pro" in this draft.
--   It can be introduced later as a separate Ultra/Admin tier if needed.

begin;

update public.ai_model_price_snapshots
set
  is_active = false,
  valid_to = coalesce(valid_to, '2026-06-22T00:00:00Z'::timestamptz)
where
  tier_code in ('nano', 'standard', 'pro')
  and is_active = true
  and valid_from < '2026-06-22T00:00:00Z'::timestamptz;

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
  v.tier_code,
  v.model_name,
  v.provider,
  v.pricing_currency,
  v.display_currency,
  v.input_cost_per_1m_tokens,
  v.cached_input_cost_per_1m_tokens,
  v.output_cost_per_1m_tokens,
  v.usd_to_eur_rate,
  v.eur_markup_multiplier,
  v.valid_from,
  v.valid_to,
  v.is_active,
  v.source_url,
  v.source_note,
  v.metadata
from (
  values
    ('nano', 'gpt-5.4-nano', 'openai', 'USD', 'EUR', 0.20000000::numeric, 0.02000000::numeric, 1.25000000::numeric, 0.87290503::numeric, 1.00000000::numeric, '2026-06-22T00:00:00Z'::timestamptz, null::timestamptz, true, 'https://developers.openai.com/api/docs/pricing/', 'OpenAI API pricing snapshot. Prices stored in USD per 1M tokens. EUR display projection uses ECB FX 2026-06-22: 1 EUR = 1.1456 USD. User-facing tier: Nano.', '{"step":"18N-R2","user_facing_tier":"Nano","pricing_source_url":"https://developers.openai.com/api/docs/pricing/","pricing_context":"standard processing, short context, prices per 1M tokens","fx_source_url":"https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html","fx_date":"2026-06-22","eur_to_usd_rate":1.1456,"usd_to_eur_rate":0.872905028,"input_usd_per_1m_tokens":0.2,"cached_input_usd_per_1m_tokens":0.02,"output_usd_per_1m_tokens":1.25,"note":"Versioned backend snapshot. UI must read projections from API and must not hardcode model prices."}'::jsonb),
    ('standard', 'gpt-5.4-mini', 'openai', 'USD', 'EUR', 0.75000000::numeric, 0.07500000::numeric, 4.50000000::numeric, 0.87290503::numeric, 1.00000000::numeric, '2026-06-22T00:00:00Z'::timestamptz, null::timestamptz, true, 'https://developers.openai.com/api/docs/pricing/', 'OpenAI API pricing snapshot. Prices stored in USD per 1M tokens. EUR display projection uses ECB FX 2026-06-22: 1 EUR = 1.1456 USD. User-facing tier: Standard.', '{"step":"18N-R2","user_facing_tier":"Standard","pricing_source_url":"https://developers.openai.com/api/docs/pricing/","pricing_context":"standard processing, short context, prices per 1M tokens","fx_source_url":"https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html","fx_date":"2026-06-22","eur_to_usd_rate":1.1456,"usd_to_eur_rate":0.872905028,"input_usd_per_1m_tokens":0.75,"cached_input_usd_per_1m_tokens":0.075,"output_usd_per_1m_tokens":4.5,"note":"Versioned backend snapshot. UI must read projections from API and must not hardcode model prices."}'::jsonb),
    ('pro', 'gpt-5.5', 'openai', 'USD', 'EUR', 5.00000000::numeric, 0.50000000::numeric, 30.00000000::numeric, 0.87290503::numeric, 1.00000000::numeric, '2026-06-22T00:00:00Z'::timestamptz, null::timestamptz, true, 'https://developers.openai.com/api/docs/pricing/', 'OpenAI API pricing snapshot. Prices stored in USD per 1M tokens. EUR display projection uses ECB FX 2026-06-22: 1 EUR = 1.1456 USD. User-facing tier: Pro.', '{"step":"18N-R2","user_facing_tier":"Pro","pricing_source_url":"https://developers.openai.com/api/docs/pricing/","pricing_context":"standard processing, short context, prices per 1M tokens","fx_source_url":"https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html","fx_date":"2026-06-22","eur_to_usd_rate":1.1456,"usd_to_eur_rate":0.872905028,"input_usd_per_1m_tokens":5,"cached_input_usd_per_1m_tokens":0.5,"output_usd_per_1m_tokens":30,"note":"Versioned backend snapshot. UI must read projections from API and must not hardcode model prices."}'::jsonb)
) as v (
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
where not exists (
  select 1
  from public.ai_model_price_snapshots existing
  where
    existing.tier_code = v.tier_code
    and existing.model_name = v.model_name
    and existing.valid_from = v.valid_from
);

commit;
