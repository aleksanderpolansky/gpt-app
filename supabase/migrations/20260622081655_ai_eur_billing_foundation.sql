begin;

create table if not exists public.ai_credit_wallets (
  id uuid primary key default gen_random_uuid(),

  app_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  balance_eur numeric(14, 6) not null default 0,
  reserved_eur numeric(14, 6) not null default 0,

  currency text not null default 'EUR',
  status text not null default 'active',

  created_by_platform_admin_id uuid
    references public.platform_admins(id)
    on delete set null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint ai_credit_wallets_app_user_unique
    unique (app_user_id),

  constraint ai_credit_wallets_currency_allowed
    check (currency in ('EUR')),

  constraint ai_credit_wallets_status_allowed
    check (status in ('active', 'suspended', 'closed')),

  constraint ai_credit_wallets_non_negative
    check (
      balance_eur >= 0
      and reserved_eur >= 0
    ),

  constraint ai_credit_wallets_reserved_not_above_balance
    check (reserved_eur <= balance_eur),

  constraint ai_credit_wallets_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.ai_credit_wallets is
  'Single EUR wallet for AI usage. This is not a per-model token wallet. Model tiers are only projections over this EUR balance.';

comment on column public.ai_credit_wallets.balance_eur is
  'Current available AI credit balance in EUR. Admin grants increase this balance; AI usage decreases it through server-mediated ledger entries.';

comment on column public.ai_credit_wallets.reserved_eur is
  'Reserved amount for future preflight reservation flow. MVP may keep this at 0 until reservation is implemented.';

create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null
    references public.ai_credit_wallets(id)
    on delete cascade,

  app_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  direction text not null,
  amount_eur numeric(14, 6) not null,

  balance_before_eur numeric(14, 6),
  balance_after_eur numeric(14, 6),

  source_type text not null,
  source_id uuid,

  created_by_platform_admin_id uuid
    references public.platform_admins(id)
    on delete set null,

  reason text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),

  constraint ai_credit_ledger_direction_allowed
    check (
      direction in (
        'credit',
        'debit',
        'reserve',
        'release',
        'reversal',
        'correction'
      )
    ),

  constraint ai_credit_ledger_source_type_allowed
    check (
      source_type in (
        'admin_grant',
        'ai_usage',
        'manual_adjustment',
        'refund',
        'reversal',
        'correction',
        'future_payment'
      )
    ),

  constraint ai_credit_ledger_amount_positive
    check (amount_eur > 0),

  constraint ai_credit_ledger_balance_values_non_negative
    check (
      (balance_before_eur is null or balance_before_eur >= 0)
      and
      (balance_after_eur is null or balance_after_eur >= 0)
    ),

  constraint ai_credit_ledger_reason_length
    check (
      reason is null
      or char_length(reason) <= 1000
    ),

  constraint ai_credit_ledger_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.ai_credit_ledger is
  'Append-only style EUR ledger for AI credit grants, AI usage debits, refunds and corrections. Admin grant must create a ledger row, not silently overwrite balance.';

create table if not exists public.ai_model_tiers (
  id uuid primary key default gen_random_uuid(),

  tier_code text not null,
  display_name text not null,
  description text,
  default_model_name text,

  warning_level text not null default 'normal',
  enabled boolean not null default true,
  sort_order integer not null default 100,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint ai_model_tiers_tier_code_unique
    unique (tier_code),

  constraint ai_model_tiers_tier_code_allowed
    check (
      tier_code in (
        'nano',
        'standard',
        'pro'
      )
    ),

  constraint ai_model_tiers_warning_level_allowed
    check (
      warning_level in (
        'low',
        'normal',
        'high',
        'critical'
      )
    ),

  constraint ai_model_tiers_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.ai_model_tiers is
  'AI model tier catalog. Tiers are not separate wallets. They are model choices and projections over one EUR wallet.';

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
values
  (
    'nano',
    'Nano',
    'Economical model tier for simple routing, short answers and lightweight tasks.',
    null,
    'low',
    true,
    10,
    '{"pricing_seeded": false, "note": "model name must be assigned after price snapshot review"}'::jsonb
  ),
  (
    'standard',
    'Standard',
    'Default working model tier for normal business and analytical tasks.',
    null,
    'normal',
    true,
    20,
    '{"pricing_seeded": false, "note": "model name must be assigned after price snapshot review"}'::jsonb
  ),
  (
    'pro',
    'Pro',
    'Premium model tier for complex reasoning tasks. It should warn users before simple tasks.',
    null,
    'high',
    true,
    30,
    '{"pricing_seeded": false, "note": "model name must be assigned after price snapshot review"}'::jsonb
  )
on conflict (tier_code) do update
set
  display_name = excluded.display_name,
  description = excluded.description,
  warning_level = excluded.warning_level,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  metadata = public.ai_model_tiers.metadata || excluded.metadata,
  updated_at = now();

create table if not exists public.ai_model_price_snapshots (
  id uuid primary key default gen_random_uuid(),

  tier_code text not null
    references public.ai_model_tiers(tier_code)
    on delete restrict,

  model_name text not null,
  provider text not null default 'openai',

  pricing_currency text not null default 'USD',
  display_currency text not null default 'EUR',

  input_cost_per_1m_tokens numeric(14, 8) not null,
  cached_input_cost_per_1m_tokens numeric(14, 8),
  output_cost_per_1m_tokens numeric(14, 8) not null,

  usd_to_eur_rate numeric(14, 8),
  eur_markup_multiplier numeric(10, 6) not null default 1,

  valid_from timestamp with time zone not null default now(),
  valid_to timestamp with time zone,
  is_active boolean not null default true,

  source_url text,
  source_note text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),

  constraint ai_model_price_snapshots_provider_allowed
    check (provider in ('openai')),

  constraint ai_model_price_snapshots_pricing_currency_allowed
    check (pricing_currency in ('USD', 'EUR')),

  constraint ai_model_price_snapshots_display_currency_allowed
    check (display_currency in ('EUR')),

  constraint ai_model_price_snapshots_costs_non_negative
    check (
      input_cost_per_1m_tokens >= 0
      and
      (cached_input_cost_per_1m_tokens is null or cached_input_cost_per_1m_tokens >= 0)
      and
      output_cost_per_1m_tokens >= 0
      and
      (usd_to_eur_rate is null or usd_to_eur_rate > 0)
      and
      eur_markup_multiplier > 0
    ),

  constraint ai_model_price_snapshots_valid_range
    check (
      valid_to is null
      or valid_to > valid_from
    ),

  constraint ai_model_price_snapshots_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.ai_model_price_snapshots is
  'Historical model pricing snapshots. Do not hardcode OpenAI prices in UI. Prices change and must be versioned.';

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),

  app_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  wallet_id uuid
    references public.ai_credit_wallets(id)
    on delete set null,

  selected_tier_code text
    references public.ai_model_tiers(tier_code)
    on delete set null,

  model_name text not null,
  provider text not null default 'openai',

  route_path text,
  operation_kind text not null default 'chat_message',

  input_tokens integer not null default 0,
  cached_input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,

  estimated_cost_eur numeric(14, 8),
  actual_cost_eur numeric(14, 8),
  wallet_debit_eur numeric(14, 8),

  status text not null default 'created',
  error_code text,
  error_message text,

  openai_response_id text,
  request_metadata jsonb not null default '{}'::jsonb,
  response_metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone,

  constraint ai_usage_events_provider_allowed
    check (provider in ('openai')),

  constraint ai_usage_events_operation_kind_allowed
    check (
      operation_kind in (
        'chat_message',
        'activity_preview',
        'semantic_intake',
        'admin_test',
        'other'
      )
    ),

  constraint ai_usage_events_status_allowed
    check (
      status in (
        'created',
        'preflight_blocked',
        'preflight_allowed',
        'openai_completed',
        'openai_failed',
        'wallet_debited',
        'debit_failed',
        'refunded'
      )
    ),

  constraint ai_usage_events_token_values_non_negative
    check (
      input_tokens >= 0
      and cached_input_tokens >= 0
      and output_tokens >= 0
      and total_tokens >= 0
    ),

  constraint ai_usage_events_costs_non_negative
    check (
      (estimated_cost_eur is null or estimated_cost_eur >= 0)
      and
      (actual_cost_eur is null or actual_cost_eur >= 0)
      and
      (wallet_debit_eur is null or wallet_debit_eur >= 0)
    ),

  constraint ai_usage_events_metadata_objects
    check (
      jsonb_typeof(request_metadata) = 'object'
      and
      jsonb_typeof(response_metadata) = 'object'
    )
);

comment on table public.ai_usage_events is
  'AI request usage log. This table is where OpenAI usage, selected tier, token counts and EUR cost should be recorded.';

create index if not exists ai_credit_wallets_app_user_id_idx
  on public.ai_credit_wallets (app_user_id);

create index if not exists ai_credit_wallets_status_idx
  on public.ai_credit_wallets (status);

create index if not exists ai_credit_ledger_wallet_id_idx
  on public.ai_credit_ledger (wallet_id);

create index if not exists ai_credit_ledger_app_user_id_idx
  on public.ai_credit_ledger (app_user_id);

create index if not exists ai_credit_ledger_created_at_idx
  on public.ai_credit_ledger (created_at desc);

create unique index if not exists ai_credit_ledger_idempotency_unique_idx
  on public.ai_credit_ledger (app_user_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists ai_model_price_snapshots_tier_active_idx
  on public.ai_model_price_snapshots (tier_code, is_active, valid_from desc);

create index if not exists ai_model_price_snapshots_model_active_idx
  on public.ai_model_price_snapshots (model_name, is_active, valid_from desc);

create index if not exists ai_usage_events_app_user_created_idx
  on public.ai_usage_events (app_user_id, created_at desc);

create index if not exists ai_usage_events_tier_created_idx
  on public.ai_usage_events (selected_tier_code, created_at desc);

create index if not exists ai_usage_events_status_idx
  on public.ai_usage_events (status);

do $$
begin
  if exists (
    select 1
    from pg_proc
    join pg_namespace
      on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'set_universal_rubricator_updated_at'
  ) then
    if not exists (
      select 1 from pg_trigger
      where tgname = 'ai_credit_wallets_set_updated_at'
    ) then
      create trigger ai_credit_wallets_set_updated_at
      before update on public.ai_credit_wallets
      for each row
      execute function public.set_universal_rubricator_updated_at();
    end if;

    if not exists (
      select 1 from pg_trigger
      where tgname = 'ai_model_tiers_set_updated_at'
    ) then
      create trigger ai_model_tiers_set_updated_at
      before update on public.ai_model_tiers
      for each row
      execute function public.set_universal_rubricator_updated_at();
    end if;
  end if;
end $$;

alter table public.ai_credit_wallets enable row level security;
alter table public.ai_credit_ledger enable row level security;
alter table public.ai_model_tiers enable row level security;
alter table public.ai_model_price_snapshots enable row level security;
alter table public.ai_usage_events enable row level security;

revoke all on table public.ai_credit_wallets from anon;
revoke all on table public.ai_credit_wallets from authenticated;
revoke all on table public.ai_credit_ledger from anon;
revoke all on table public.ai_credit_ledger from authenticated;
revoke all on table public.ai_model_tiers from anon;
revoke all on table public.ai_model_tiers from authenticated;
revoke all on table public.ai_model_price_snapshots from anon;
revoke all on table public.ai_model_price_snapshots from authenticated;
revoke all on table public.ai_usage_events from anon;
revoke all on table public.ai_usage_events from authenticated;

drop policy if exists "No direct client access to ai credit wallets"
on public.ai_credit_wallets;

create policy "No direct client access to ai credit wallets"
on public.ai_credit_wallets
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct client access to ai credit ledger"
on public.ai_credit_ledger;

create policy "No direct client access to ai credit ledger"
on public.ai_credit_ledger
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct client access to ai model tiers"
on public.ai_model_tiers;

create policy "No direct client access to ai model tiers"
on public.ai_model_tiers
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct client access to ai model price snapshots"
on public.ai_model_price_snapshots;

create policy "No direct client access to ai model price snapshots"
on public.ai_model_price_snapshots
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct client access to ai usage events"
on public.ai_usage_events;

create policy "No direct client access to ai usage events"
on public.ai_usage_events
for all
to anon, authenticated
using (false)
with check (false);

grant select, insert, update, delete on table public.ai_credit_wallets to service_role;
grant select, insert, update, delete on table public.ai_credit_ledger to service_role;
grant select, insert, update, delete on table public.ai_model_tiers to service_role;
grant select, insert, update, delete on table public.ai_model_price_snapshots to service_role;
grant select, insert, update, delete on table public.ai_usage_events to service_role;

commit;
