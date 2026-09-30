-- ARCTor.app
-- AI Billing B1.3 hotfix
-- Fix PL/pgSQL output-column / table-column ambiguity in admin_set_ai_available_eur_v1.
-- 2026-09-30
--
-- ROOT CAUSE
-- The B1 function RETURNS TABLE includes app_user_id, while the INSERT used
-- ON CONFLICT (app_user_id) DO NOTHING. In PL/pgSQL this identifier can collide
-- with the output variable and fail at execution time.
--
-- FIX
-- 1) #variable_conflict use_column
-- 2) ON CONFLICT ON CONSTRAINT ai_credit_wallets_app_user_unique DO NOTHING
-- 3) explicit aliases for table references
--
-- This migration changes only the function definition and privileges.
-- It does not modify wallet, ledger or usage rows.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
begin
  if to_regclass('public.app_users') is null
     or to_regclass('public.platform_admins') is null
     or to_regclass('public.ai_credit_wallets') is null
     or to_regclass('public.ai_credit_ledger') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_AI_BILLING_B1_3_REQUIRED_TABLES_MISSING';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'ai_credit_wallets'
      and c.conname = 'ai_credit_wallets_app_user_unique'
  ) then
    raise exception using
      errcode = '42704',
      message = 'ARCTOR_AI_BILLING_B1_3_WALLET_UNIQUE_CONSTRAINT_MISSING';
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
#variable_conflict use_column
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

  select pa.*
  into v_admin
  from public.platform_admins as pa
  where pa.id = p_platform_admin_id
    and pa.status = 'active'
    and pa.role in ('owner','admin')
  limit 1;

  if not found then
    raise exception using errcode='42501', message='ACTIVE_OWNER_OR_ADMIN_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.app_users as au
    where au.id = p_target_app_user_id
  ) then
    raise exception using errcode='23503', message='TARGET_APP_USER_NOT_FOUND';
  end if;

  v_target_available := round(p_target_available_eur::numeric, 6);

  if nullif(btrim(coalesce(p_idempotency_key,'')), '') is not null then
    select acl.*
    into v_existing_ledger
    from public.ai_credit_ledger as acl
    where acl.app_user_id = p_target_app_user_id
      and acl.idempotency_key = btrim(p_idempotency_key)
      and acl.source_type = 'manual_adjustment'
    limit 1;

    if found then
      select acw.*
      into v_wallet
      from public.ai_credit_wallets as acw
      where acw.id = v_existing_ledger.wallet_id;

      wallet_id := v_wallet.id;
      ledger_id := v_existing_ledger.id;
      app_user_id := p_target_app_user_id;
      available_before_eur :=
        greatest(
          coalesce(v_existing_ledger.balance_before_eur,0)
          - coalesce(v_wallet.reserved_eur,0),
          0
        );
      available_after_eur :=
        greatest(
          coalesce(v_existing_ledger.balance_after_eur,0)
          - coalesce(v_wallet.reserved_eur,0),
          0
        );
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
  on conflict on constraint ai_credit_wallets_app_user_unique do nothing;

  select acw.*
  into v_wallet
  from public.ai_credit_wallets as acw
  where acw.app_user_id = p_target_app_user_id
  for update;

  if not found then
    raise exception using
      errcode='P0001',
      message='AI_CREDIT_WALLET_CREATE_OR_LOCK_FAILED';
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

  update public.ai_credit_wallets as acw
  set
    balance_eur = v_balance_after,
    metadata = coalesce(acw.metadata,'{}'::jsonb) || jsonb_build_object(
      'last_admin_balance_set_at', clock_timestamp(),
      'last_admin_balance_set_available_eur', v_target_available,
      'last_admin_balance_set_by_platform_admin_id', p_platform_admin_id
    ),
    updated_at = clock_timestamp()
  where acw.id = v_wallet.id;

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
  'B1.3: atomically sets AVAILABLE AI EUR using ledger-first adjustment. Adds explicit PL/pgSQL variable-conflict handling and ON CONSTRAINT conflict handling.';

revoke all on function public.admin_set_ai_available_eur_v1(
  uuid,uuid,numeric,text,text,jsonb
) from public, anon, authenticated;

grant execute on function public.admin_set_ai_available_eur_v1(
  uuid,uuid,numeric,text,text,jsonb
) to service_role;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_AI_BILLING_B1_3_ADMIN_BALANCE_RPC_FIX',
    'rpcExists',
      to_regprocedure(
        'public.admin_set_ai_available_eur_v1(uuid,uuid,numeric,text,text,jsonb)'
      ) is not null,
    'walletRows',
      (select count(*) from public.ai_credit_wallets),
    'ledgerRows',
      (select count(*) from public.ai_credit_ledger),
    'dataRowsModifiedByMigration',
      0
  )
) as arctor_ai_billing_b1_3_admin_balance_rpc_fix;
