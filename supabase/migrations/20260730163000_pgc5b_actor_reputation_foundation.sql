begin;

-- PGC5B: actor-level reputation foundation.
-- Reputation is non-spendable, non-transferable and is awarded when a
-- gift certificate is ordered. One hundred reputation points are awarded
-- for each 1.00 POINT burned by the buyer.

create table public.actor_reputation_accounts (
  actor_id uuid primary key
    references public.actors(id) on delete restrict,
  owner_user_id uuid not null
    references public.app_users(id) on delete restrict,
  balance bigint not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint actor_reputation_accounts_balance_nonnegative_check
    check (balance >= 0),

  constraint actor_reputation_accounts_status_check
    check (status in ('active', 'suspended'))
);

create index actor_reputation_accounts_owner_balance_idx
on public.actor_reputation_accounts (
  owner_user_id,
  balance desc,
  actor_id
);

create table public.actor_reputation_ledger (
  id uuid primary key default gen_random_uuid(),

  account_actor_id uuid not null
    references public.actor_reputation_accounts(actor_id) on delete restrict,
  owner_user_id uuid not null
    references public.app_users(id) on delete restrict,

  provider_type text not null,
  provider_organization_id uuid null
    references public.organizations(id) on delete restrict,

  source_type text not null,
  source_activity_event_id uuid not null
    references public.activity_gift_certificate_terms(activity_event_id)
    on delete restrict,

  buyer_user_id uuid not null
    references public.app_users(id) on delete restrict,
  points_transaction_id uuid not null
    references public.points_transactions(id) on delete restrict,

  points_amount numeric(18,2) not null,
  reputation_amount bigint not null,

  balance_before bigint not null,
  balance_after bigint not null,

  status text not null default 'confirmed',
  description text null,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),

  constraint actor_reputation_ledger_provider_type_check
    check (provider_type in ('personal', 'avatar', 'organization')),

  constraint actor_reputation_ledger_provider_shape_check
    check (
      (provider_type = 'organization' and provider_organization_id is not null)
      or
      (provider_type <> 'organization' and provider_organization_id is null)
    ),

  constraint actor_reputation_ledger_source_type_check
    check (source_type = 'gift_certificate_order'),

  constraint actor_reputation_ledger_points_positive_check
    check (points_amount > 0),

  constraint actor_reputation_ledger_reputation_positive_check
    check (reputation_amount > 0),

  constraint actor_reputation_ledger_formula_check
    check (
      reputation_amount = round(points_amount * 100, 0)::bigint
    ),

  constraint actor_reputation_ledger_balance_before_check
    check (balance_before >= 0),

  constraint actor_reputation_ledger_balance_after_check
    check (balance_after = balance_before + reputation_amount),

  constraint actor_reputation_ledger_status_check
    check (status = 'confirmed'),

  constraint actor_reputation_ledger_metadata_object_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create unique index actor_reputation_ledger_certificate_order_uidx
on public.actor_reputation_ledger (
  source_type,
  source_activity_event_id
);

create unique index actor_reputation_ledger_points_transaction_uidx
on public.actor_reputation_ledger (points_transaction_id);

create index actor_reputation_ledger_owner_created_idx
on public.actor_reputation_ledger (
  owner_user_id,
  created_at desc,
  id
);

create index actor_reputation_ledger_actor_created_idx
on public.actor_reputation_ledger (
  account_actor_id,
  created_at desc,
  id
);

alter table public.actor_reputation_accounts enable row level security;
alter table public.actor_reputation_ledger enable row level security;

drop policy if exists actor_reputation_accounts_service_role_select
on public.actor_reputation_accounts;

create policy actor_reputation_accounts_service_role_select
on public.actor_reputation_accounts
for select
to service_role
using (true);

drop policy if exists actor_reputation_ledger_service_role_select
on public.actor_reputation_ledger;

create policy actor_reputation_ledger_service_role_select
on public.actor_reputation_ledger
for select
to service_role
using (true);

revoke all on table public.actor_reputation_accounts
from public, anon, authenticated, service_role;

revoke all on table public.actor_reputation_ledger
from public, anon, authenticated, service_role;

grant select on table public.actor_reputation_accounts to service_role;
grant select on table public.actor_reputation_ledger to service_role;

create or replace function public.enforce_actor_reputation_account_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor public.actors%rowtype;
begin
  select *
  into v_actor
  from public.actors actor
  where actor.id = new.actor_id
    and actor.status = 'active';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'PGC5B_REPUTATION_ACTOR_NOT_AVAILABLE';
  end if;

  if tg_op = 'UPDATE'
     and (
       new.actor_id is distinct from old.actor_id
       or new.owner_user_id is distinct from old.owner_user_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'PGC5B_REPUTATION_ACCOUNT_IDENTITY_IMMUTABLE';
  end if;

  if tg_op = 'UPDATE'
     and new.balance < old.balance then
    raise exception using
      errcode = '23514',
      message = 'PGC5B_REPUTATION_BALANCE_CANNOT_DECREASE';
  end if;

  if v_actor.actor_type = 'organization' then
    if v_actor.organization_id is null
       or not exists (
         select 1
         from public.organizations organization
         join public.actor_public_profiles manager_profile
           on manager_profile.actor_id = organization.owner_actor_id
         where organization.id = v_actor.organization_id
           and organization.status = 'active'
           and manager_profile.owner_user_id = new.owner_user_id
       ) then
      raise exception using
        errcode = '42501',
        message = 'PGC5B_REPUTATION_ORGANIZATION_OWNER_MISMATCH';
    end if;
  elsif not exists (
    select 1
    from public.actor_public_profiles profile
    where profile.actor_id = new.actor_id
      and profile.owner_user_id = new.owner_user_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'PGC5B_REPUTATION_PROFILE_OWNER_MISMATCH';
  end if;

  new.updated_at := clock_timestamp();

  return new;
end;
$function$;

create trigger actor_reputation_accounts_contract_trg
before insert or update on public.actor_reputation_accounts
for each row
execute function public.enforce_actor_reputation_account_v1();

create or replace function public.enforce_actor_reputation_ledger_insert_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_account public.actor_reputation_accounts%rowtype;
  v_terms public.activity_gift_certificate_terms%rowtype;
  v_points_transaction public.points_transactions%rowtype;
begin
  select *
  into v_account
  from public.actor_reputation_accounts account
  where account.actor_id = new.account_actor_id
    and account.status = 'active';

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC5B_REPUTATION_ACCOUNT_NOT_FOUND';
  end if;

  if v_account.owner_user_id is distinct from new.owner_user_id then
    raise exception using
      errcode = '42501',
      message = 'PGC5B_REPUTATION_LEDGER_OWNER_MISMATCH';
  end if;

  if v_account.balance is distinct from new.balance_after then
    raise exception using
      errcode = '23514',
      message = 'PGC5B_REPUTATION_ACCOUNT_BALANCE_MISMATCH';
  end if;

  select *
  into v_terms
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = new.source_activity_event_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC5B_REPUTATION_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms.provider_owner_user_id is distinct from new.owner_user_id
     or v_terms.provider_actor_id is distinct from new.account_actor_id
     or v_terms.provider_type is distinct from new.provider_type
     or v_terms.provider_organization_id
        is distinct from new.provider_organization_id then
    raise exception using
      errcode = '42501',
      message = 'PGC5B_REPUTATION_PROVIDER_MISMATCH';
  end if;

  if v_terms.lifecycle_status is distinct from 'active'
     or v_terms.recipient_user_id is distinct from new.buyer_user_id
     or v_terms.ordered_at is null then
    raise exception using
      errcode = '23514',
      message = 'PGC5B_REPUTATION_CERTIFICATE_NOT_ORDERED';
  end if;

  if round(v_terms.points_price, 2)
     is distinct from round(new.points_amount, 2) then
    raise exception using
      errcode = '23514',
      message = 'PGC5B_REPUTATION_CERTIFICATE_POINTS_MISMATCH';
  end if;

  select *
  into v_points_transaction
  from public.points_transactions transaction_row
  where transaction_row.id = new.points_transaction_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC5B_REPUTATION_POINTS_TRANSACTION_NOT_FOUND';
  end if;

  if v_points_transaction.user_id is distinct from new.buyer_user_id
     or v_points_transaction.transaction_type
        is distinct from 'gift_certificate_points_burned'
     or v_points_transaction.direction is distinct from 'debit'
     or v_points_transaction.status is distinct from 'confirmed'
     or v_points_transaction.source_type
        is distinct from 'gift_certificate_activity'
     or v_points_transaction.source_id
        is distinct from new.source_activity_event_id
     or round(v_points_transaction.amount, 2)
        is distinct from round(new.points_amount, 2) then
    raise exception using
      errcode = '23514',
      message = 'PGC5B_REPUTATION_POINTS_TRANSACTION_INVALID';
  end if;

  return new;
end;
$function$;

create trigger actor_reputation_ledger_insert_contract_trg
before insert on public.actor_reputation_ledger
for each row
execute function public.enforce_actor_reputation_ledger_insert_v1();

create or replace function public.prevent_actor_reputation_ledger_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  raise exception using
    errcode = '55000',
    message = 'PGC5B_REPUTATION_LEDGER_IMMUTABLE';
end;
$function$;

create trigger actor_reputation_ledger_immutable_trg
before update or delete on public.actor_reputation_ledger
for each row
execute function public.prevent_actor_reputation_ledger_mutation_v1();

create or replace function public.award_gift_certificate_order_reputation_v1(
  p_activity_event_id uuid,
  p_buyer_user_id uuid,
  p_points_transaction_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_terms public.activity_gift_certificate_terms%rowtype;
  v_points_transaction public.points_transactions%rowtype;
  v_account public.actor_reputation_accounts%rowtype;
  v_existing public.actor_reputation_ledger%rowtype;
  v_ledger public.actor_reputation_ledger%rowtype;
  v_reputation_amount bigint;
  v_balance_before bigint;
  v_balance_after bigint;
begin
  if p_activity_event_id is null
     or p_buyer_user_id is null
     or p_points_transaction_id is null then
    raise exception using
      errcode = '22023',
      message = 'PGC5B_REPUTATION_AWARD_INPUT_REQUIRED';
  end if;

  select *
  into v_terms
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC5B_REPUTATION_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms.lifecycle_status is distinct from 'active'
     or v_terms.recipient_user_id is distinct from p_buyer_user_id
     or v_terms.ordered_at is null then
    raise exception using
      errcode = '23514',
      message = 'PGC5B_REPUTATION_CERTIFICATE_NOT_ORDERED';
  end if;

  if v_terms.points_price is null
     or round(v_terms.points_price, 2) <= 0 then
    raise exception using
      errcode = '23514',
      message = 'PGC5B_REPUTATION_POINTS_AMOUNT_INVALID';
  end if;

  select *
  into v_points_transaction
  from public.points_transactions transaction_row
  where transaction_row.id = p_points_transaction_id
    and transaction_row.user_id = p_buyer_user_id
    and transaction_row.transaction_type = 'gift_certificate_points_burned'
    and transaction_row.direction = 'debit'
    and transaction_row.status = 'confirmed'
    and transaction_row.source_type = 'gift_certificate_activity'
    and transaction_row.source_id = p_activity_event_id
    and round(transaction_row.amount, 2)
        = round(v_terms.points_price, 2);

  if not found then
    raise exception using
      errcode = '23514',
      message = 'PGC5B_REPUTATION_POINTS_TRANSACTION_INVALID';
  end if;

  select *
  into v_existing
  from public.actor_reputation_ledger ledger
  where ledger.source_type = 'gift_certificate_order'
    and ledger.source_activity_event_id = p_activity_event_id;

  if found then
    if v_existing.account_actor_id
         is distinct from v_terms.provider_actor_id
       or v_existing.owner_user_id
         is distinct from v_terms.provider_owner_user_id
       or v_existing.buyer_user_id
         is distinct from p_buyer_user_id
       or v_existing.points_transaction_id
         is distinct from p_points_transaction_id
       or round(v_existing.points_amount, 2)
         is distinct from round(v_terms.points_price, 2) then
      raise exception using
        errcode = '23505',
        message = 'PGC5B_REPUTATION_IDEMPOTENCY_CONFLICT';
    end if;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'accountActorId', v_existing.account_actor_id,
      'ownerUserId', v_existing.owner_user_id,
      'reputationAmount', v_existing.reputation_amount,
      'balanceAfter', v_existing.balance_after,
      'ledgerEntryId', v_existing.id
    );
  end if;

  v_reputation_amount :=
    round(v_terms.points_price * 100, 0)::bigint;

  if v_reputation_amount <= 0 then
    raise exception using
      errcode = '23514',
      message = 'PGC5B_REPUTATION_AMOUNT_INVALID';
  end if;

  insert into public.actor_reputation_accounts (
    actor_id,
    owner_user_id,
    balance,
    status
  )
  values (
    v_terms.provider_actor_id,
    v_terms.provider_owner_user_id,
    0,
    'active'
  )
  on conflict (actor_id)
  do nothing;

  select *
  into v_account
  from public.actor_reputation_accounts account
  where account.actor_id = v_terms.provider_actor_id
  for update;

  if not found
     or v_account.owner_user_id
        is distinct from v_terms.provider_owner_user_id
     or v_account.status is distinct from 'active' then
    raise exception using
      errcode = '42501',
      message = 'PGC5B_REPUTATION_ACCOUNT_NOT_AVAILABLE';
  end if;

  v_balance_before := v_account.balance;
  v_balance_after := v_balance_before + v_reputation_amount;

  update public.actor_reputation_accounts
  set balance = v_balance_after
  where actor_id = v_account.actor_id
  returning *
  into v_account;

  insert into public.actor_reputation_ledger (
    account_actor_id,
    owner_user_id,
    provider_type,
    provider_organization_id,
    source_type,
    source_activity_event_id,
    buyer_user_id,
    points_transaction_id,
    points_amount,
    reputation_amount,
    balance_before,
    balance_after,
    status,
    description,
    metadata_json
  )
  values (
    v_terms.provider_actor_id,
    v_terms.provider_owner_user_id,
    v_terms.provider_type,
    v_terms.provider_organization_id,
    'gift_certificate_order',
    v_terms.activity_event_id,
    p_buyer_user_id,
    p_points_transaction_id,
    round(v_terms.points_price, 2),
    v_reputation_amount,
    v_balance_before,
    v_balance_after,
    'confirmed',
    'Reputation awarded for an ordered gift certificate',
    jsonb_build_object(
      'contract', 'pgc5b-reputation-v1',
      'formula', 'points_price_x_100',
      'activityEventId', v_terms.activity_event_id,
      'valueObjectId', v_terms.value_object_id,
      'providerActorId', v_terms.provider_actor_id,
      'providerOrganizationId', v_terms.provider_organization_id,
      'buyerUserId', p_buyer_user_id,
      'pointsTransactionId', p_points_transaction_id,
      'pointsAmount', round(v_terms.points_price, 2),
      'reputationAmount', v_reputation_amount,
      'certificateSnapshot', v_terms.public_snapshot_json
    )
  )
  returning *
  into v_ledger;

  return jsonb_build_object(
    'ok', true,
    'disposition', 'created',
    'accountActorId', v_account.actor_id,
    'ownerUserId', v_account.owner_user_id,
    'reputationAmount', v_ledger.reputation_amount,
    'balanceBefore', v_ledger.balance_before,
    'balanceAfter', v_ledger.balance_after,
    'ledgerEntryId', v_ledger.id
  );
exception
  when unique_violation then
    select *
    into v_existing
    from public.actor_reputation_ledger ledger
    where ledger.source_type = 'gift_certificate_order'
      and ledger.source_activity_event_id = p_activity_event_id;

    if v_existing.id is null then
      raise;
    end if;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'accountActorId', v_existing.account_actor_id,
      'ownerUserId', v_existing.owner_user_id,
      'reputationAmount', v_existing.reputation_amount,
      'balanceAfter', v_existing.balance_after,
      'ledgerEntryId', v_existing.id
    );
end;
$function$;

create or replace function public.get_reputation_summary_v1(
  p_owner_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select jsonb_build_object(
    'ownerUserId', p_owner_user_id,
    'totalReputation',
      coalesce(
        (
          select sum(account.balance)
          from public.actor_reputation_accounts account
          where account.owner_user_id = p_owner_user_id
            and account.status = 'active'
        ),
        0
      ),
    'accountCount',
      (
        select count(*)
        from public.actor_reputation_accounts account
        where account.owner_user_id = p_owner_user_id
          and account.status = 'active'
      ),
    'ledgerEntryCount',
      (
        select count(*)
        from public.actor_reputation_ledger ledger
        where ledger.owner_user_id = p_owner_user_id
          and ledger.status = 'confirmed'
      ),
    'accounts',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'actorId', account.actor_id,
              'actorType', actor.actor_type,
              'displayName', actor.display_name,
              'balance', account.balance
            )
            order by account.balance desc, actor.display_name, account.actor_id
          )
          from public.actor_reputation_accounts account
          join public.actors actor
            on actor.id = account.actor_id
          where account.owner_user_id = p_owner_user_id
            and account.status = 'active'
        ),
        '[]'::jsonb
      )
  );
$function$;

create or replace function public.get_reputation_history_v1(
  p_owner_user_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  ledger_entry_id uuid,
  provider_actor_id uuid,
  provider_display_name text,
  provider_type text,
  provider_organization_id uuid,
  source_activity_event_id uuid,
  buyer_user_id uuid,
  points_amount numeric,
  reputation_amount bigint,
  balance_after bigint,
  metadata_json jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    ledger.id,
    ledger.account_actor_id,
    actor.display_name,
    ledger.provider_type,
    ledger.provider_organization_id,
    ledger.source_activity_event_id,
    ledger.buyer_user_id,
    ledger.points_amount,
    ledger.reputation_amount,
    ledger.balance_after,
    ledger.metadata_json,
    ledger.created_at
  from public.actor_reputation_ledger ledger
  join public.actors actor
    on actor.id = ledger.account_actor_id
  where ledger.owner_user_id = p_owner_user_id
    and ledger.status = 'confirmed'
  order by ledger.created_at desc, ledger.id desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(coalesce(p_offset, 0), 0);
$function$;

revoke all on function
  public.enforce_actor_reputation_account_v1()
from public, anon, authenticated, service_role;

revoke all on function
  public.enforce_actor_reputation_ledger_insert_v1()
from public, anon, authenticated, service_role;

revoke all on function
  public.prevent_actor_reputation_ledger_mutation_v1()
from public, anon, authenticated, service_role;

revoke all on function
  public.award_gift_certificate_order_reputation_v1(uuid, uuid, uuid)
from public, anon, authenticated, service_role;

revoke all on function
  public.get_reputation_summary_v1(uuid)
from public, anon, authenticated, service_role;

revoke all on function
  public.get_reputation_history_v1(uuid, integer, integer)
from public, anon, authenticated, service_role;

grant execute on function
  public.award_gift_certificate_order_reputation_v1(uuid, uuid, uuid)
to service_role;

grant execute on function
  public.get_reputation_summary_v1(uuid)
to service_role;

grant execute on function
  public.get_reputation_history_v1(uuid, integer, integer)
to service_role;

comment on table public.actor_reputation_accounts is
  'Non-spendable actor-level reputation totals. One actor has one account.';

comment on table public.actor_reputation_ledger is
  'Immutable reputation awards. PGC5B starts with ordered gift certificates only.';

comment on function
  public.award_gift_certificate_order_reputation_v1(uuid, uuid, uuid)
is
  'Awards points_price * 100 reputation exactly once after a gift certificate order burns POINTS.';

commit;
