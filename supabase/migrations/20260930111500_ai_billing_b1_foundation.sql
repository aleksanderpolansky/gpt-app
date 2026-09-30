-- ARCTor.app
-- AI Billing B1 Foundation
-- 2026-09-30
--
-- PURPOSE
-- 1) Ledger-first admin editing of a user's AVAILABLE AI EUR.
-- 2) Lifetime AI usage aggregation without the admin page's 2000-row cap.
-- 3) Atomic settlement primitive for future unified AI Billing Gateway migration.
--
-- IMPORTANT
-- This migration does NOT migrate existing OpenAI call sites yet.
-- It provides the database contract they will use.
--
-- SAFETY
-- * service_role only
-- * all wallet mutations happen inside PostgreSQL functions
-- * ledger rows are written in the same transaction as wallet mutations
-- * no direct browser table access is enabled
-- * rerunnable: CREATE OR REPLACE and IF EXISTS-safe grants

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.app_users') is null
     or to_regclass('public.platform_admins') is null
     or to_regclass('public.ai_credit_wallets') is null
     or to_regclass('public.ai_credit_ledger') is null
     or to_regclass('public.ai_usage_events') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_AI_BILLING_B1_REQUIRED_TABLES_MISSING';
  end if;
end;
$preflight$;

create or replace function public.admin_set_ai_available_eur_v1(
  p_target_app_user_id uuid,
  p_platform_admin_id uuid,
  p_target_available_eur numeric,
  p_reason text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  wallet_id uuid,
  ledger_id uuid,
  app_user_id uuid,
  available_before_eur numeric,
  available_after_eur numeric,
  balance_before_eur numeric,
  balance_after_eur numeric,
  reserved_eur numeric,
  adjustment_direction text,
  adjustment_amount_eur numeric,
  currency text,
  changed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_admin public.platform_admins%rowtype;
  v_wallet public.ai_credit_wallets%rowtype;
  v_existing_ledger public.ai_credit_ledger%rowtype;
  v_ledger public.ai_credit_ledger%rowtype;
  v_target_available numeric(14,6);
  v_balance_before numeric(14,6);
  v_balance_after numeric(14,6);
  v_reserved numeric(14,6);
  v_available_before numeric(14,6);
  v_delta numeric(14,6);
  v_direction text;
  v_amount numeric(14,6);
  v_metadata jsonb;
begin
  if p_target_app_user_id is null then
    raise exception using errcode='22023', message='TARGET_APP_USER_ID_REQUIRED';
  end if;

  if p_platform_admin_id is null then
    raise exception using errcode='22023', message='PLATFORM_ADMIN_ID_REQUIRED';
  end if;

  if p_target_available_eur is null
     or p_target_available_eur < 0
     or p_target_available_eur > 100000 then
    raise exception using errcode='22023', message='INVALID_TARGET_AVAILABLE_EUR';
  end if;

  if p_reason is not null and char_length(p_reason) > 1000 then
    raise exception using errcode='22023', message='REASON_TOO_LONG';
  end if;

  if p_idempotency_key is not null and char_length(p_idempotency_key) > 200 then
    raise exception using errcode='22023', message='IDEMPOTENCY_KEY_TOO_LONG';
  end if;

  v_metadata := coalesce(p_metadata, '{}'::jsonb);
  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception using errcode='22023', message='METADATA_MUST_BE_OBJECT';
  end if;

  select *
  into v_admin
  from public.platform_admins
  where id = p_platform_admin_id
    and status = 'active'
    and role in ('owner','admin')
  limit 1;

  if not found then
    raise exception using errcode='42501', message='ACTIVE_OWNER_OR_ADMIN_REQUIRED';
  end if;

  if not exists (
    select 1 from public.app_users where id = p_target_app_user_id
  ) then
    raise exception using errcode='23503', message='TARGET_APP_USER_NOT_FOUND';
  end if;

  v_target_available := round(p_target_available_eur::numeric, 6);

  if nullif(btrim(coalesce(p_idempotency_key,'')), '') is not null then
    select l.*
    into v_existing_ledger
    from public.ai_credit_ledger l
    where l.app_user_id = p_target_app_user_id
      and l.idempotency_key = btrim(p_idempotency_key)
      and l.source_type = 'manual_adjustment'
    limit 1;

    if found then
      select w.*
      into v_wallet
      from public.ai_credit_wallets w
      where w.id = v_existing_ledger.wallet_id;

      wallet_id := v_wallet.id;
      ledger_id := v_existing_ledger.id;
      app_user_id := p_target_app_user_id;
      available_before_eur :=
        greatest(coalesce(v_existing_ledger.balance_before_eur,0) - coalesce(v_wallet.reserved_eur,0), 0);
      available_after_eur :=
        greatest(coalesce(v_existing_ledger.balance_after_eur,0) - coalesce(v_wallet.reserved_eur,0), 0);
      balance_before_eur := v_existing_ledger.balance_before_eur;
      balance_after_eur := v_existing_ledger.balance_after_eur;
      reserved_eur := coalesce(v_wallet.reserved_eur,0);
      adjustment_direction := v_existing_ledger.direction;
      adjustment_amount_eur := v_existing_ledger.amount_eur;
      currency := coalesce(v_wallet.currency,'EUR');
      changed := true;
      return next;
      return;
    end if;
  end if;

  insert into public.ai_credit_wallets (
    app_user_id,
    balance_eur,
    reserved_eur,
    currency,
    status,
    created_by_platform_admin_id,
    metadata
  )
  values (
    p_target_app_user_id,
    0,
    0,
    'EUR',
    'active',
    p_platform_admin_id,
    jsonb_build_object(
      'created_by_rpc','admin_set_ai_available_eur_v1',
      'created_by_platform_admin_id',p_platform_admin_id
    )
  )
  on conflict (app_user_id) do nothing;

  select w.*
  into v_wallet
  from public.ai_credit_wallets w
  where w.app_user_id = p_target_app_user_id
  for update;

  if not found then
    raise exception using errcode='P0001', message='AI_CREDIT_WALLET_CREATE_OR_LOCK_FAILED';
  end if;

  if v_wallet.status <> 'active' then
    raise exception using errcode='42501', message='AI_CREDIT_WALLET_NOT_ACTIVE';
  end if;

  if v_wallet.currency <> 'EUR' then
    raise exception using errcode='22023', message='AI_CREDIT_WALLET_CURRENCY_MISMATCH';
  end if;

  v_reserved := round(coalesce(v_wallet.reserved_eur,0)::numeric,6);
  v_balance_before := round(coalesce(v_wallet.balance_eur,0)::numeric,6);
  v_available_before := greatest(v_balance_before - v_reserved,0);
  v_balance_after := round(v_reserved + v_target_available,6);
  v_delta := round(v_balance_after - v_balance_before,6);

  wallet_id := v_wallet.id;
  app_user_id := p_target_app_user_id;
  available_before_eur := v_available_before;
  available_after_eur := v_target_available;
  balance_before_eur := v_balance_before;
  balance_after_eur := v_balance_after;
  reserved_eur := v_reserved;
  currency := v_wallet.currency;

  if v_delta = 0 then
    ledger_id := null;
    adjustment_direction := 'none';
    adjustment_amount_eur := 0;
    changed := false;
    return next;
    return;
  end if;

  v_direction := case when v_delta > 0 then 'credit' else 'debit' end;
  v_amount := abs(v_delta);

  update public.ai_credit_wallets
  set
    balance_eur = v_balance_after,
    metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
      'last_admin_balance_set_at', clock_timestamp(),
      'last_admin_balance_set_available_eur', v_target_available,
      'last_admin_balance_set_by_platform_admin_id', p_platform_admin_id
    ),
    updated_at = clock_timestamp()
  where id = v_wallet.id;

  insert into public.ai_credit_ledger (
    wallet_id,
    app_user_id,
    direction,
    amount_eur,
    balance_before_eur,
    balance_after_eur,
    source_type,
    source_id,
    created_by_platform_admin_id,
    reason,
    idempotency_key,
    metadata
  )
  values (
    v_wallet.id,
    p_target_app_user_id,
    v_direction,
    v_amount,
    v_balance_before,
    v_balance_after,
    'manual_adjustment',
    null,
    p_platform_admin_id,
    nullif(btrim(coalesce(p_reason,'')),''),
    nullif(btrim(coalesce(p_idempotency_key,'')),''),
    v_metadata || jsonb_build_object(
      'rpc','admin_set_ai_available_eur_v1',
      'mode','set_available_balance',
      'targetAvailableEur',v_target_available,
      'reservedEur',v_reserved,
      'adjustedAt',clock_timestamp()
    )
  )
  returning *
  into v_ledger;

  ledger_id := v_ledger.id;
  adjustment_direction := v_direction;
  adjustment_amount_eur := v_amount;
  changed := true;
  return next;
end;
$function$;

comment on function public.admin_set_ai_available_eur_v1(
  uuid,uuid,numeric,text,text,jsonb
) is
  'Atomically sets AVAILABLE AI EUR for one user by calculating a credit/debit delta, updating the single EUR wallet and writing a manual_adjustment ledger row in the same database transaction.';

revoke all on function public.admin_set_ai_available_eur_v1(
  uuid,uuid,numeric,text,text,jsonb
) from public, anon, authenticated;

grant execute on function public.admin_set_ai_available_eur_v1(
  uuid,uuid,numeric,text,text,jsonb
) to service_role;

create or replace function public.admin_get_ai_usage_lifetime_summary_v1(
  p_app_user_ids uuid[]
)
returns table (
  app_user_id uuid,
  usage_event_count bigint,
  provider_call_count bigint,
  input_tokens bigint,
  cached_input_tokens bigint,
  output_tokens bigint,
  total_tokens bigint,
  usage_cost_eur numeric,
  wallet_debit_eur numeric,
  last_ai_usage_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with selected as (
    select
      u.*,
      (
        u.status in ('openai_completed','wallet_debited','debit_failed','refunded')
        or u.openai_response_id is not null
      ) as has_provider_usage
    from public.ai_usage_events u
    where
      p_app_user_ids is not null
      and cardinality(p_app_user_ids) > 0
      and u.app_user_id = any(p_app_user_ids)
  )
  select
    s.app_user_id,
    count(*)::bigint as usage_event_count,
    count(*) filter (
      where s.has_provider_usage or s.status = 'openai_failed'
    )::bigint as provider_call_count,
    coalesce(sum(s.input_tokens) filter (where s.has_provider_usage),0)::bigint,
    coalesce(sum(s.cached_input_tokens) filter (where s.has_provider_usage),0)::bigint,
    coalesce(sum(s.output_tokens) filter (where s.has_provider_usage),0)::bigint,
    coalesce(sum(s.total_tokens) filter (where s.has_provider_usage),0)::bigint,
    coalesce(sum(
      case
        when s.has_provider_usage then
          coalesce(s.actual_cost_eur, s.wallet_debit_eur, 0)
        else 0
      end
    ),0)::numeric as usage_cost_eur,
    coalesce(sum(coalesce(s.wallet_debit_eur,0)),0)::numeric as wallet_debit_eur,
    max(coalesce(s.completed_at,s.created_at)) as last_ai_usage_at
  from selected s
  group by s.app_user_id;
$function$;

comment on function public.admin_get_ai_usage_lifetime_summary_v1(uuid[]) is
  'Lifetime server-side aggregation of AI usage for selected app users. Actual token totals exclude preflight-only estimates.';

revoke all on function public.admin_get_ai_usage_lifetime_summary_v1(uuid[])
from public, anon, authenticated;

grant execute on function public.admin_get_ai_usage_lifetime_summary_v1(uuid[])
to service_role;

create or replace function public.settle_ai_usage_debit_v1(
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
  ledger_id uuid,
  app_user_id uuid,
  balance_before_eur numeric,
  balance_after_eur numeric,
  reserved_eur numeric,
  wallet_debit_eur numeric,
  actual_cost_eur numeric,
  usage_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_usage public.ai_usage_events%rowtype;
  v_wallet public.ai_credit_wallets%rowtype;
  v_existing_ledger public.ai_credit_ledger%rowtype;
  v_ledger public.ai_credit_ledger%rowtype;
  v_balance_before numeric(14,6);
  v_balance_after numeric(14,6);
  v_reserved numeric(14,6);
  v_debit numeric(14,6);
  v_actual numeric(14,8);
  v_metadata jsonb;
  v_idempotency_key text;
begin
  if p_usage_event_id is null or p_app_user_id is null then
    raise exception using errcode='22023', message='USAGE_EVENT_AND_APP_USER_REQUIRED';
  end if;

  if p_actual_cost_eur is null or p_actual_cost_eur < 0 then
    raise exception using errcode='22023', message='INVALID_ACTUAL_COST_EUR';
  end if;

  if p_wallet_debit_eur is null or p_wallet_debit_eur <= 0 then
    raise exception using errcode='22023', message='INVALID_WALLET_DEBIT_EUR';
  end if;

  if p_reason is not null and char_length(p_reason) > 1000 then
    raise exception using errcode='22023', message='REASON_TOO_LONG';
  end if;

  v_metadata := coalesce(p_metadata,'{}'::jsonb);
  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception using errcode='22023', message='METADATA_MUST_BE_OBJECT';
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

  v_idempotency_key := 'ai_usage:' || p_usage_event_id::text;

  select l.*
  into v_existing_ledger
  from public.ai_credit_ledger l
  where l.app_user_id = p_app_user_id
    and l.idempotency_key = v_idempotency_key
    and l.source_type = 'ai_usage'
    and l.source_id = p_usage_event_id
  limit 1;

  if found then
    usage_event_id := p_usage_event_id;
    wallet_id := v_existing_ledger.wallet_id;
    ledger_id := v_existing_ledger.id;
    app_user_id := p_app_user_id;
    balance_before_eur := v_existing_ledger.balance_before_eur;
    balance_after_eur := v_existing_ledger.balance_after_eur;
    select w.reserved_eur into reserved_eur
      from public.ai_credit_wallets w
      where w.id = v_existing_ledger.wallet_id;
    wallet_debit_eur := v_existing_ledger.amount_eur;
    actual_cost_eur := coalesce(v_usage.actual_cost_eur,p_actual_cost_eur);
    usage_status := v_usage.status;
    return next;
    return;
  end if;

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

  v_balance_before := round(coalesce(v_wallet.balance_eur,0)::numeric,6);
  v_reserved := round(coalesce(v_wallet.reserved_eur,0)::numeric,6);
  v_debit := round(p_wallet_debit_eur::numeric,6);
  v_actual := round(p_actual_cost_eur::numeric,8);

  if greatest(v_balance_before - v_reserved,0) < v_debit then
    raise exception using errcode='23514', message='AI_CREDIT_WALLET_INSUFFICIENT_AVAILABLE_BALANCE';
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
    'debit',
    v_debit,
    v_balance_before,
    v_balance_after,
    'ai_usage',
    p_usage_event_id,
    nullif(btrim(coalesce(p_reason,'')),''),
    v_idempotency_key,
    v_metadata || jsonb_build_object(
      'rpc','settle_ai_usage_debit_v1',
      'settledAt',clock_timestamp()
    )
  )
  returning *
  into v_ledger;

  update public.ai_credit_wallets
  set
    balance_eur = v_balance_after,
    updated_at = clock_timestamp()
  where id = v_wallet.id;

  update public.ai_usage_events
  set
    wallet_id = v_wallet.id,
    actual_cost_eur = v_actual,
    wallet_debit_eur = v_debit,
    status = 'wallet_debited',
    completed_at = coalesce(completed_at,clock_timestamp()),
    response_metadata = coalesce(response_metadata,'{}'::jsonb)
      || jsonb_build_object(
        'billingSettlementRpc','settle_ai_usage_debit_v1',
        'billingSettledAt',clock_timestamp()
      )
  where id = p_usage_event_id;

  usage_event_id := p_usage_event_id;
  wallet_id := v_wallet.id;
  ledger_id := v_ledger.id;
  app_user_id := p_app_user_id;
  balance_before_eur := v_balance_before;
  balance_after_eur := v_balance_after;
  reserved_eur := v_reserved;
  wallet_debit_eur := v_debit;
  actual_cost_eur := v_actual;
  usage_status := 'wallet_debited';
  return next;
end;
$function$;

comment on function public.settle_ai_usage_debit_v1(
  uuid,uuid,numeric,numeric,text,jsonb
) is
  'Atomic settlement primitive for the unified ARCTor AI Billing Gateway: one usage event, one ledger debit and one wallet balance mutation in one database transaction.';

revoke all on function public.settle_ai_usage_debit_v1(
  uuid,uuid,numeric,numeric,text,jsonb
) from public, anon, authenticated;

grant execute on function public.settle_ai_usage_debit_v1(
  uuid,uuid,numeric,numeric,text,jsonb
) to service_role;

do $acceptance$
begin
  if to_regprocedure(
       'public.admin_set_ai_available_eur_v1(uuid,uuid,numeric,text,text,jsonb)'
     ) is null
     or to_regprocedure(
       'public.admin_get_ai_usage_lifetime_summary_v1(uuid[])'
     ) is null
     or to_regprocedure(
       'public.settle_ai_usage_debit_v1(uuid,uuid,numeric,numeric,text,jsonb)'
     ) is null then
    raise exception using
      errcode='42883',
      message='ARCTOR_AI_BILLING_B1_RPC_MISSING_AFTER_WRITE';
  end if;

  if has_function_privilege(
       'anon',
       'public.admin_set_ai_available_eur_v1(uuid,uuid,numeric,text,text,jsonb)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.admin_set_ai_available_eur_v1(uuid,uuid,numeric,text,text,jsonb)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.admin_set_ai_available_eur_v1(uuid,uuid,numeric,text,text,jsonb)',
       'EXECUTE'
     ) then
    raise exception using errcode='42501', message='ARCTOR_AI_BILLING_B1_ADMIN_SET_PRIVILEGE_GUARD_FAILED';
  end if;

  if has_function_privilege(
       'anon',
       'public.admin_get_ai_usage_lifetime_summary_v1(uuid[])',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.admin_get_ai_usage_lifetime_summary_v1(uuid[])',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.admin_get_ai_usage_lifetime_summary_v1(uuid[])',
       'EXECUTE'
     ) then
    raise exception using errcode='42501', message='ARCTOR_AI_BILLING_B1_SUMMARY_PRIVILEGE_GUARD_FAILED';
  end if;
end;
$acceptance$;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_AI_BILLING_B1_FOUNDATION',
    'adminSetAvailableRpc',
      to_regprocedure('public.admin_set_ai_available_eur_v1(uuid,uuid,numeric,text,text,jsonb)') is not null,
    'lifetimeSummaryRpc',
      to_regprocedure('public.admin_get_ai_usage_lifetime_summary_v1(uuid[])') is not null,
    'settlementRpc',
      to_regprocedure('public.settle_ai_usage_debit_v1(uuid,uuid,numeric,numeric,text,jsonb)') is not null,
    'walletRows',(select count(*) from public.ai_credit_wallets),
    'ledgerRows',(select count(*) from public.ai_credit_ledger),
    'usageRows',(select count(*) from public.ai_usage_events),
    'dataRowsModifiedByMigration',0
  )
) as arctor_ai_billing_b1_foundation;
