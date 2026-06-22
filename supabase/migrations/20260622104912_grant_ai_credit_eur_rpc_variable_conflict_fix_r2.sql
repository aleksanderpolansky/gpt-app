begin;

create or replace function public.grant_ai_credit_eur(
  p_target_app_user_id uuid,
  p_platform_admin_id uuid,
  p_amount_eur numeric,
  p_reason text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  wallet_id uuid,
  ledger_id uuid,
  app_user_id uuid,
  balance_before_eur numeric,
  balance_after_eur numeric,
  amount_eur numeric,
  currency text,
  idempotency_key text,
  ledger_created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_admin public.platform_admins%rowtype;
  v_wallet public.ai_credit_wallets%rowtype;
  v_existing_ledger public.ai_credit_ledger%rowtype;
  v_balance_before numeric(14, 6);
  v_balance_after numeric(14, 6);
  v_ledger public.ai_credit_ledger%rowtype;
  v_metadata jsonb;
begin
  if p_target_app_user_id is null then
    raise exception 'TARGET_APP_USER_ID_REQUIRED'
      using errcode = '22023';
  end if;

  if p_platform_admin_id is null then
    raise exception 'PLATFORM_ADMIN_ID_REQUIRED'
      using errcode = '22023';
  end if;

  if p_amount_eur is null
    or p_amount_eur <= 0
    or p_amount_eur > 100000
  then
    raise exception 'INVALID_AMOUNT_EUR'
      using errcode = '22023';
  end if;

  if p_reason is not null and char_length(p_reason) > 1000 then
    raise exception 'REASON_TOO_LONG'
      using errcode = '22023';
  end if;

  if p_idempotency_key is not null and char_length(p_idempotency_key) > 200 then
    raise exception 'IDEMPOTENCY_KEY_TOO_LONG'
      using errcode = '22023';
  end if;

  v_metadata := coalesce(p_metadata, '{}'::jsonb);

  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'METADATA_MUST_BE_OBJECT'
      using errcode = '22023';
  end if;

  select pa.*
  into v_admin
  from public.platform_admins as pa
  where pa.id = p_platform_admin_id
    and pa.status = 'active'
    and pa.role in ('owner', 'admin')
  limit 1;

  if not found then
    raise exception 'ACTIVE_OWNER_OR_ADMIN_REQUIRED'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.app_users as au
    where au.id = p_target_app_user_id
  ) then
    raise exception 'TARGET_APP_USER_NOT_FOUND'
      using errcode = '23503';
  end if;

  if p_idempotency_key is not null then
    select acl.*
    into v_existing_ledger
    from public.ai_credit_ledger as acl
    where acl.app_user_id = p_target_app_user_id
      and acl.idempotency_key = p_idempotency_key
      and acl.source_type = 'admin_grant'
      and acl.direction = 'credit'
    limit 1;

    if found then
      select acw.*
      into v_wallet
      from public.ai_credit_wallets as acw
      where acw.id = v_existing_ledger.wallet_id;

      wallet_id := v_existing_ledger.wallet_id;
      ledger_id := v_existing_ledger.id;
      app_user_id := v_existing_ledger.app_user_id;
      balance_before_eur := v_existing_ledger.balance_before_eur;
      balance_after_eur := v_existing_ledger.balance_after_eur;
      amount_eur := v_existing_ledger.amount_eur;
      currency := coalesce(v_wallet.currency, 'EUR');
      idempotency_key := v_existing_ledger.idempotency_key;
      ledger_created_at := v_existing_ledger.created_at;

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
      'created_by_rpc',
      'grant_ai_credit_eur',
      'created_by_platform_admin_id',
      p_platform_admin_id
    )
  )
  on conflict on constraint ai_credit_wallets_app_user_unique do nothing;

  select acw.*
  into v_wallet
  from public.ai_credit_wallets as acw
  where acw.app_user_id = p_target_app_user_id
  for update;

  if not found then
    raise exception 'AI_CREDIT_WALLET_CREATE_OR_LOCK_FAILED'
      using errcode = 'P0001';
  end if;

  if v_wallet.status <> 'active' then
    raise exception 'AI_CREDIT_WALLET_NOT_ACTIVE'
      using errcode = '42501';
  end if;

  if v_wallet.currency <> 'EUR' then
    raise exception 'AI_CREDIT_WALLET_CURRENCY_MISMATCH'
      using errcode = '22023';
  end if;

  v_balance_before := coalesce(v_wallet.balance_eur, 0);
  v_balance_after := v_balance_before + p_amount_eur;

  update public.ai_credit_wallets as acw
  set
    balance_eur = v_balance_after,
    metadata = coalesce(acw.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'last_admin_grant_at',
        now(),
        'last_admin_grant_amount_eur',
        p_amount_eur,
        'last_admin_grant_by_platform_admin_id',
        p_platform_admin_id
      ),
    updated_at = now()
  where acw.id = v_wallet.id
  returning acw.*
  into v_wallet;

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
    'credit',
    p_amount_eur,
    v_balance_before,
    v_balance_after,
    'admin_grant',
    null,
    p_platform_admin_id,
    nullif(trim(coalesce(p_reason, '')), ''),
    nullif(trim(coalesce(p_idempotency_key, '')), ''),
    v_metadata
      || jsonb_build_object(
        'rpc',
        'grant_ai_credit_eur',
        'granted_at',
        now(),
        'granted_by_platform_admin_id',
        p_platform_admin_id
      )
  )
  returning *
  into v_ledger;

  wallet_id := v_wallet.id;
  ledger_id := v_ledger.id;
  app_user_id := p_target_app_user_id;
  balance_before_eur := v_balance_before;
  balance_after_eur := v_balance_after;
  amount_eur := p_amount_eur;
  currency := v_wallet.currency;
  idempotency_key := v_ledger.idempotency_key;
  ledger_created_at := v_ledger.created_at;

  return next;
end;
$$;

comment on function public.grant_ai_credit_eur(
  uuid,
  uuid,
  numeric,
  text,
  text,
  jsonb
) is
  'Atomically grants AI EUR credit to one app_user wallet and writes an admin_grant ledger row. Requires active platform_admin role owner/admin. Step 17J-R4 adds #variable_conflict use_column and ON CONSTRAINT to avoid output-column/table-column ambiguity. Intended for service_role server routes only.';

revoke all on function public.grant_ai_credit_eur(
  uuid,
  uuid,
  numeric,
  text,
  text,
  jsonb
) from public;

revoke all on function public.grant_ai_credit_eur(
  uuid,
  uuid,
  numeric,
  text,
  text,
  jsonb
) from anon;

revoke all on function public.grant_ai_credit_eur(
  uuid,
  uuid,
  numeric,
  text,
  text,
  jsonb
) from authenticated;

grant execute on function public.grant_ai_credit_eur(
  uuid,
  uuid,
  numeric,
  text,
  text,
  jsonb
) to service_role;

commit;

