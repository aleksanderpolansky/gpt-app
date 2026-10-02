begin;

create table if not exists public.ai_provider_treasury_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  balance_amount numeric(14,6) not null,
  currency text not null,
  source_code text not null,
  source_note text null,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by_app_user_id uuid null references public.app_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,

  constraint ai_provider_treasury_snapshots_provider_check
    check (provider = 'openai'),

  constraint ai_provider_treasury_snapshots_currency_check
    check (currency = 'USD'),

  constraint ai_provider_treasury_snapshots_balance_check
    check (balance_amount >= -100000 and balance_amount <= 100000),

  constraint ai_provider_treasury_snapshots_source_check
    check (
      source_code in (
        'OPENAI_DASHBOARD_MANUAL',
        'OPENAI_DASHBOARD_MANUAL_SEED'
      )
    )
);

comment on table public.ai_provider_treasury_snapshots is
  'Server-only factual snapshots of the OpenAI API prepaid credit balance. OpenAI does not expose a documented credit-balance API; current snapshots are confirmed from the OpenAI Platform dashboard.';

alter table public.ai_provider_treasury_snapshots enable row level security;

revoke all
  on table public.ai_provider_treasury_snapshots
  from public, anon, authenticated;

grant select, insert
  on table public.ai_provider_treasury_snapshots
  to service_role;

create index if not exists
  ai_provider_treasury_snapshots_provider_captured_idx
  on public.ai_provider_treasury_snapshots (
    provider,
    captured_at desc,
    created_at desc
  );

-- Initial factual snapshot comes from the OpenAI Platform screenshot supplied
-- by the ARCTor owner on 2026-10-02. It is intentionally stored in the provider
-- currency shown by OpenAI: USD, not EUR.
insert into public.ai_provider_treasury_snapshots (
  provider,
  balance_amount,
  currency,
  source_code,
  source_note,
  captured_at,
  created_by_app_user_id,
  metadata
)
select
  'openai',
  1.900000,
  'USD',
  'OPENAI_DASHBOARD_MANUAL_SEED',
  'Initial confirmed OpenAI Platform credit balance from owner-provided dashboard screenshot.',
  '2026-10-02T11:43:00Z'::timestamptz,
  null,
  jsonb_build_object(
    'contract', 'ARCTOR_AI_BILLING_B4_PROVIDER_TREASURY_V1',
    'source', 'owner_provided_openai_dashboard_screenshot',
    'displayedCreditBalanceUsd', 1.90
  )
where not exists (
  select 1
  from public.ai_provider_treasury_snapshots s
  where s.provider = 'openai'
);

commit;

select jsonb_pretty(
  jsonb_build_object(
    'check',
      'ARCTOR_AI_BILLING_B4_PROVIDER_TREASURY_MIGRATION_V1',

    'pass',
      to_regclass('public.ai_provider_treasury_snapshots') is not null
      and exists (
        select 1
        from public.ai_provider_treasury_snapshots s
        where s.provider = 'openai'
          and s.currency = 'USD'
      ),

    'latestSnapshot',
      (
        select jsonb_build_object(
          'id', s.id,
          'provider', s.provider,
          'balanceAmount', s.balance_amount,
          'currency', s.currency,
          'sourceCode', s.source_code,
          'capturedAt', s.captured_at
        )
        from public.ai_provider_treasury_snapshots s
        where s.provider = 'openai'
        order by s.captured_at desc, s.created_at desc
        limit 1
      ),

    'readOnlyAfterMigration', true
  )
) as arctor_ai_billing_b4_provider_treasury_migration_v1;
