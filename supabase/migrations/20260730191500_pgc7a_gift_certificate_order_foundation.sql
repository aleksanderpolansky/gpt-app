begin;

-- PGC7A
-- Atomic order foundation for activity-based gift certificates.
--
-- The gift certificate remains one planned activity_event.
-- Ordering:
-- - assigns the buyer's active personal/avatar actor as recipient;
-- - burns the buyer's POINTS immediately;
-- - does not transfer POINTS to the provider;
-- - awards provider reputation through the PGC5B ledger;
-- - stores only a QR-token hash, never the raw QR secret;
-- - leaves the planned activity in status planned.

alter table public.activity_gift_certificate_terms
add column if not exists order_idempotency_key text null;

alter table public.activity_gift_certificate_terms
add column if not exists points_transaction_id uuid null
  references public.points_transactions(id) on delete restrict;

alter table public.activity_gift_certificate_terms
add column if not exists qr_token_version text null;

alter table public.activity_gift_certificate_terms
drop constraint if exists
  activity_gift_certificate_available_shape_check;

alter table public.activity_gift_certificate_terms
add constraint activity_gift_certificate_available_shape_check
check (
  lifecycle_status <> 'available'
  or (
    published_at is not null
    and recipient_user_id is null
    and recipient_actor_id is null
    and public_code is null
    and qr_token_hash is null
    and qr_token_version is null
    and order_idempotency_key is null
    and points_transaction_id is null
    and ordered_at is null
    and redeemed_at is null
    and expired_at is null
    and annulled_at is null
  )
);

do $block$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.activity_gift_certificate_terms'::regclass
      and conname = 'activity_gift_certificate_ordered_shape_check'
  ) then
    alter table public.activity_gift_certificate_terms
    add constraint activity_gift_certificate_ordered_shape_check
    check (
      lifecycle_status not in ('active', 'redeemed', 'expired', 'annulled')
      or (
        published_at is not null
        and recipient_user_id is not null
        and recipient_actor_id is not null
        and public_code is not null
        and qr_token_hash is not null
        and qr_token_version is not null
        and order_idempotency_key is not null
        and points_transaction_id is not null
        and ordered_at is not null
      )
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.activity_gift_certificate_terms'::regclass
      and conname = 'activity_gift_certificate_order_key_format_check'
  ) then
    alter table public.activity_gift_certificate_terms
    add constraint activity_gift_certificate_order_key_format_check
    check (
      order_idempotency_key is null
      or (
        length(order_idempotency_key) between 16 and 200
        and order_idempotency_key ~ '^[A-Za-z0-9:_-]+$'
      )
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.activity_gift_certificate_terms'::regclass
      and conname = 'activity_gift_certificate_public_code_format_check'
  ) then
    alter table public.activity_gift_certificate_terms
    add constraint activity_gift_certificate_public_code_format_check
    check (
      public_code is null
      or public_code ~ '^GC-[A-F0-9]{20}$'
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.activity_gift_certificate_terms'::regclass
      and conname = 'activity_gift_certificate_qr_hash_format_check'
  ) then
    alter table public.activity_gift_certificate_terms
    add constraint activity_gift_certificate_qr_hash_format_check
    check (
      qr_token_hash is null
      or qr_token_hash ~ '^[a-f0-9]{64}$'
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.activity_gift_certificate_terms'::regclass
      and conname = 'activity_gift_certificate_qr_version_check'
  ) then
    alter table public.activity_gift_certificate_terms
    add constraint activity_gift_certificate_qr_version_check
    check (
      qr_token_version is null
      or qr_token_version = 'hmac-sha256-v1'
    );
  end if;
end;
$block$;

create unique index if not exists
  activity_gift_certificate_points_transaction_uidx
on public.activity_gift_certificate_terms (points_transaction_id)
where points_transaction_id is not null;

create unique index if not exists
  activity_gift_certificate_qr_token_hash_uidx
on public.activity_gift_certificate_terms (qr_token_hash)
where qr_token_hash is not null;

create unique index if not exists
  activity_gift_certificate_recipient_order_key_uidx
on public.activity_gift_certificate_terms (
  recipient_user_id,
  order_idempotency_key
)
where recipient_user_id is not null
  and order_idempotency_key is not null;

create unique index if not exists
  points_transactions_gift_certificate_activity_burn_uidx
on public.points_transactions (
  user_id,
  source_id
)
where transaction_type = 'gift_certificate_points_burned'
  and direction = 'debit'
  and source_type = 'gift_certificate_activity'
  and status = 'confirmed';

create or replace function
public.request_gift_certificate_activity_v1(
  p_buyer_user_id uuid,
  p_recipient_actor_id uuid,
  p_activity_event_id uuid,
  p_idempotency_key text,
  p_public_code text,
  p_qr_token_hash text,
  p_qr_token_version text default 'hmac-sha256-v1'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_terms_before public.activity_gift_certificate_terms%rowtype;
  v_terms_after public.activity_gift_certificate_terms%rowtype;
  v_activity public.activity_events%rowtype;
  v_recipient_actor public.actors%rowtype;
  v_wallet public.user_points_wallets%rowtype;
  v_points_transaction public.points_transactions%rowtype;
  v_reputation_result jsonb;
  v_reputation_ledger public.actor_reputation_ledger%rowtype;

  v_idempotency_key text;
  v_public_code text;
  v_qr_token_hash text;
  v_qr_token_version text;

  v_points_amount numeric(18,2);
  v_balance_before numeric;
  v_balance_after numeric;
  v_available_before numeric;
  v_available_after numeric;
  v_reserved_before numeric;
  v_reserved_after numeric;
  v_spent_before numeric;
  v_spent_after numeric;
  v_released_before numeric;
  v_released_after numeric;

  v_now timestamptz := clock_timestamp();
begin
  if p_buyer_user_id is null
     or p_recipient_actor_id is null
     or p_activity_event_id is null then
    raise exception using
      errcode = '22023',
      message = 'PGC7A_ORDER_CONTEXT_REQUIRED';
  end if;

  v_idempotency_key := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_public_code := upper(nullif(btrim(coalesce(p_public_code, '')), ''));
  v_qr_token_hash := lower(nullif(btrim(coalesce(p_qr_token_hash, '')), ''));
  v_qr_token_version :=
    lower(nullif(btrim(coalesce(p_qr_token_version, '')), ''));

  if v_idempotency_key is null
     or length(v_idempotency_key) not between 16 and 200
     or v_idempotency_key !~ '^[A-Za-z0-9:_-]+$' then
    raise exception using
      errcode = '22023',
      message = 'PGC7A_IDEMPOTENCY_KEY_INVALID';
  end if;

  if v_public_code is null
     or v_public_code !~ '^GC-[A-F0-9]{20}$' then
    raise exception using
      errcode = '22023',
      message = 'PGC7A_PUBLIC_CODE_INVALID';
  end if;

  if v_qr_token_hash is null
     or v_qr_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'PGC7A_QR_TOKEN_HASH_INVALID';
  end if;

  if v_qr_token_version is distinct from 'hmac-sha256-v1' then
    raise exception using
      errcode = '22023',
      message = 'PGC7A_QR_TOKEN_VERSION_INVALID';
  end if;

  select *
  into v_terms_before
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC7A_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms_before.lifecycle_status = 'active' then
    if v_terms_before.recipient_user_id
         is distinct from p_buyer_user_id
       or v_terms_before.recipient_actor_id
         is distinct from p_recipient_actor_id
       or v_terms_before.order_idempotency_key
         is distinct from v_idempotency_key
       or v_terms_before.public_code
         is distinct from v_public_code
       or v_terms_before.qr_token_hash
         is distinct from v_qr_token_hash
       or v_terms_before.qr_token_version
         is distinct from v_qr_token_version
       or v_terms_before.points_transaction_id is null
       or v_terms_before.ordered_at is null then
      raise exception using
        errcode = '23505',
        message = 'PGC7A_ORDER_IDEMPOTENCY_CONFLICT';
    end if;

    select *
    into v_points_transaction
    from public.points_transactions transaction_row
    where transaction_row.id = v_terms_before.points_transaction_id;

    select *
    into v_reputation_ledger
    from public.actor_reputation_ledger ledger
    where ledger.source_type = 'gift_certificate_order'
      and ledger.source_activity_event_id = p_activity_event_id;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'activityEventId', v_terms_before.activity_event_id,
      'providerActorId', v_terms_before.provider_actor_id,
      'recipientUserId', v_terms_before.recipient_user_id,
      'recipientActorId', v_terms_before.recipient_actor_id,
      'lifecycleStatus', v_terms_before.lifecycle_status,
      'pointsAmount', v_terms_before.points_price,
      'pointsTransactionId', v_terms_before.points_transaction_id,
      'walletBalanceAfter', v_points_transaction.balance_after,
      'walletAvailableAfter', v_points_transaction.available_balance_after,
      'walletSpentAfter', v_points_transaction.spent_balance_after,
      'reputationAmount', v_reputation_ledger.reputation_amount,
      'providerReputationAfter', v_reputation_ledger.balance_after,
      'publicCode', v_terms_before.public_code,
      'qrTokenVersion', v_terms_before.qr_token_version,
      'orderedAt', v_terms_before.ordered_at
    );
  end if;

  if v_terms_before.lifecycle_status is distinct from 'available'
     or v_terms_before.published_at is null then
    raise exception using
      errcode = '23514',
      message = 'PGC7A_ONLY_AVAILABLE_CERTIFICATE_CAN_BE_ORDERED';
  end if;

  if v_terms_before.available_until < current_date then
    raise exception using
      errcode = '22023',
      message = 'PGC7A_CERTIFICATE_VALIDITY_ENDED';
  end if;

  if v_terms_before.provider_owner_user_id
       is not distinct from p_buyer_user_id then
    raise exception using
      errcode = '42501',
      message = 'PGC7A_PROVIDER_CANNOT_ORDER_OWN_CERTIFICATE';
  end if;

  select *
  into v_activity
  from public.activity_events activity
  where activity.id = p_activity_event_id
  for update;

  if not found
     or v_activity.activity_role_code is distinct from 'planned'
     or v_activity.status is distinct from 'planned'
     or v_activity.user_id
        is distinct from v_terms_before.provider_owner_user_id
     or v_activity.acting_as_actor_id
        is distinct from v_terms_before.provider_manager_actor_id then
    raise exception using
      errcode = '23514',
      message = 'PGC7A_PLANNED_ACTIVITY_STATE_INVALID';
  end if;

  if not exists (
    select 1
    from public.activity_templates template
    where template.id = v_activity.activity_template_id
      and template.slug = 'gift-certificate-v1'
      and template.status = 'active'
      and template.is_active = true
  ) then
    raise exception using
      errcode = '23514',
      message = 'PGC7A_ACTIVITY_TEMPLATE_INVALID';
  end if;

  perform 1
  from public.actors provider_actor
  where provider_actor.id = v_terms_before.provider_actor_id
    and provider_actor.status = 'active'
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'PGC7A_PROVIDER_NOT_AVAILABLE';
  end if;

  select actor.*
  into v_recipient_actor
  from public.actors actor
  join public.actor_public_profiles profile
    on profile.actor_id = actor.id
   and profile.owner_user_id = p_buyer_user_id
   and profile.profile_kind in ('personal', 'avatar')
  where actor.id = p_recipient_actor_id
    and actor.status = 'active'
  for update of actor;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'PGC7A_RECIPIENT_ACTOR_NOT_AVAILABLE';
  end if;

  if exists (
    select 1
    from public.activity_gift_certificate_terms existing
    where existing.recipient_user_id = p_buyer_user_id
      and existing.provider_actor_id = v_terms_before.provider_actor_id
      and existing.lifecycle_status = 'active'
      and existing.activity_event_id <> p_activity_event_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'PGC7A_BUYER_ALREADY_HAS_ACTIVE_CERTIFICATE_FOR_PROVIDER';
  end if;

  v_points_amount := round(v_terms_before.points_price, 2);

  if v_points_amount <= 0 then
    raise exception using
      errcode = '23514',
      message = 'PGC7A_CERTIFICATE_POINTS_PRICE_INVALID';
  end if;

  select *
  into v_wallet
  from public.user_points_wallets wallet
  where wallet.user_id = p_buyer_user_id
    and wallet.status = 'active'
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC7A_ACTIVE_POINTS_WALLET_NOT_FOUND';
  end if;

  v_balance_before := coalesce(v_wallet.balance, 0);
  v_available_before := coalesce(v_wallet.available_balance, 0);
  v_reserved_before := coalesce(v_wallet.reserved_balance, 0);
  v_spent_before := coalesce(v_wallet.spent_balance, 0);
  v_released_before := coalesce(v_wallet.released_balance, 0);

  if v_balance_before < v_points_amount
     or v_available_before < v_points_amount then
    raise exception using
      errcode = '22003',
      message = 'PGC7A_INSUFFICIENT_AVAILABLE_POINTS',
      detail = format(
        'required=%s balance=%s available=%s',
        v_points_amount,
        v_balance_before,
        v_available_before
      );
  end if;

  v_balance_after := v_balance_before - v_points_amount;
  v_available_after := v_available_before - v_points_amount;
  v_reserved_after := v_reserved_before;
  v_spent_after := v_spent_before + v_points_amount;
  v_released_after := v_released_before;

  update public.user_points_wallets
  set
    balance = v_balance_after,
    available_balance = v_available_after,
    reserved_balance = v_reserved_after,
    spent_balance = v_spent_after,
    released_balance = v_released_after,
    updated_at = v_now
  where id = v_wallet.id
  returning *
  into v_wallet;

  insert into public.points_transactions (
    wallet_id,
    user_id,
    organization_id,
    transaction_type,
    direction,
    amount,
    balance_before,
    balance_after,
    available_balance_before,
    available_balance_after,
    reserved_balance_before,
    reserved_balance_after,
    spent_balance_before,
    spent_balance_after,
    released_balance_before,
    released_balance_after,
    source_type,
    source_id,
    offer_id,
    certificate_id,
    description,
    points_currency_code,
    reference_currency,
    reference_value_per_point,
    reference_value_total,
    status,
    created_at,
    updated_at
  )
  values (
    v_wallet.id,
    p_buyer_user_id,
    v_terms_before.provider_organization_id,
    'gift_certificate_points_burned',
    'debit',
    v_points_amount,
    v_balance_before,
    v_balance_after,
    v_available_before,
    v_available_after,
    v_reserved_before,
    v_reserved_after,
    v_spent_before,
    v_spent_after,
    v_released_before,
    v_released_after,
    'gift_certificate_activity',
    p_activity_event_id,
    null,
    null,
    'POINTS burned when an activity-based gift certificate was ordered',
    v_terms_before.points_currency_code,
    v_terms_before.reference_currency,
    v_terms_before.reference_value_per_point,
    round(
      v_points_amount * v_terms_before.reference_value_per_point,
      2
    ),
    'confirmed',
    v_now,
    v_now
  )
  returning *
  into v_points_transaction;

  update public.activity_gift_certificate_terms
  set
    lifecycle_status = 'active',
    recipient_user_id = p_buyer_user_id,
    recipient_actor_id = p_recipient_actor_id,
    public_code = v_public_code,
    qr_token_hash = v_qr_token_hash,
    qr_token_version = v_qr_token_version,
    order_idempotency_key = v_idempotency_key,
    points_transaction_id = v_points_transaction.id,
    ordered_at = v_now
  where activity_event_id = p_activity_event_id
  returning *
  into v_terms_after;

  if v_terms_after.activity_event_id is null then
    raise exception using
      errcode = '55000',
      message = 'PGC7A_CERTIFICATE_ORDER_UPDATE_FAILED';
  end if;

  -- The PGC3B contract trigger still validates the current product/service.
  -- An order must not silently change the public or financial snapshot that
  -- was published. If the source object changed after publication, the order
  -- is rejected and the complete transaction is rolled back.
  if v_terms_after.value_object_id
       is distinct from v_terms_before.value_object_id
     or v_terms_after.provider_owner_user_id
       is distinct from v_terms_before.provider_owner_user_id
     or v_terms_after.provider_manager_actor_id
       is distinct from v_terms_before.provider_manager_actor_id
     or v_terms_after.provider_actor_id
       is distinct from v_terms_before.provider_actor_id
     or v_terms_after.provider_organization_id
       is distinct from v_terms_before.provider_organization_id
     or v_terms_after.provider_type
       is distinct from v_terms_before.provider_type
     or v_terms_after.delivery_mode
       is distinct from v_terms_before.delivery_mode
     or v_terms_after.available_from
       is distinct from v_terms_before.available_from
     or v_terms_after.available_until
       is distinct from v_terms_before.available_until
     or round(v_terms_after.regular_price_snapshot, 2)
       is distinct from round(v_terms_before.regular_price_snapshot, 2)
     or v_terms_after.provider_currency
       is distinct from v_terms_before.provider_currency
     or v_terms_after.points_coverage_mode
       is distinct from v_terms_before.points_coverage_mode
     or v_terms_after.points_coverage_percent
       is distinct from v_terms_before.points_coverage_percent
     or v_terms_after.requested_points_covered_amount
       is distinct from v_terms_before.requested_points_covered_amount
     or round(v_terms_after.provider_currency_covered_amount, 2)
       is distinct from round(
         v_terms_before.provider_currency_covered_amount,
         2
       )
     or round(v_terms_after.money_remainder_provider_currency, 2)
       is distinct from round(
         v_terms_before.money_remainder_provider_currency,
         2
       )
     or v_terms_after.points_currency_code
       is distinct from v_terms_before.points_currency_code
     or v_terms_after.reference_currency
       is distinct from v_terms_before.reference_currency
     or v_terms_after.reference_value_per_point
       is distinct from v_terms_before.reference_value_per_point
     or v_terms_after.reference_exchange_rate
       is distinct from v_terms_before.reference_exchange_rate
     or round(v_terms_after.points_price, 2)
       is distinct from round(v_terms_before.points_price, 2)
     or v_terms_after.terms_text
       is distinct from v_terms_before.terms_text
     or v_terms_after.public_snapshot_json
       is distinct from v_terms_before.public_snapshot_json then
    raise exception using
      errcode = '23514',
      message = 'PGC7A_PUBLISHED_SNAPSHOT_CHANGED';
  end if;

  update public.activity_events
  set
    metadata_json = coalesce(metadata_json, '{}'::jsonb)
      || jsonb_build_object(
        'giftCertificateLifecycle', 'active',
        'giftCertificateRecipientUserId', p_buyer_user_id,
        'giftCertificateRecipientActorId', p_recipient_actor_id,
        'giftCertificateOrderedAt', v_now,
        'giftCertificatePublicCode', v_public_code
      ),
    updated_at = v_now
  where id = p_activity_event_id
    and status = 'planned';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'PGC7A_ACTIVITY_METADATA_UPDATE_FAILED';
  end if;

  v_reputation_result :=
    public.award_gift_certificate_order_reputation_v1(
      p_activity_event_id,
      p_buyer_user_id,
      v_points_transaction.id
    );

  return jsonb_build_object(
    'ok', true,
    'disposition', 'ordered',
    'activityEventId', v_terms_after.activity_event_id,
    'valueObjectId', v_terms_after.value_object_id,
    'providerActorId', v_terms_after.provider_actor_id,
    'recipientUserId', v_terms_after.recipient_user_id,
    'recipientActorId', v_terms_after.recipient_actor_id,
    'lifecycleStatus', v_terms_after.lifecycle_status,
    'pointsAmount', v_points_amount,
    'pointsTransactionId', v_points_transaction.id,
    'walletBalanceBefore', v_balance_before,
    'walletBalanceAfter', v_balance_after,
    'walletAvailableBefore', v_available_before,
    'walletAvailableAfter', v_available_after,
    'walletSpentBefore', v_spent_before,
    'walletSpentAfter', v_spent_after,
    'providerPointsAwarded', 0,
    'reputation', v_reputation_result,
    'publicCode', v_terms_after.public_code,
    'qrTokenVersion', v_terms_after.qr_token_version,
    'orderedAt', v_terms_after.ordered_at
  );
exception
  when unique_violation then
    select *
    into v_terms_after
    from public.activity_gift_certificate_terms terms
    where terms.activity_event_id = p_activity_event_id;

    if v_terms_after.lifecycle_status = 'active'
       and v_terms_after.recipient_user_id
          is not distinct from p_buyer_user_id
       and v_terms_after.recipient_actor_id
          is not distinct from p_recipient_actor_id
       and v_terms_after.order_idempotency_key
          is not distinct from v_idempotency_key
       and v_terms_after.public_code
          is not distinct from v_public_code
       and v_terms_after.qr_token_hash
          is not distinct from v_qr_token_hash
       and v_terms_after.qr_token_version
          is not distinct from v_qr_token_version
       and v_terms_after.points_transaction_id is not null
       and v_terms_after.ordered_at is not null then
      return jsonb_build_object(
        'ok', true,
        'disposition', 'idempotent_replay',
        'activityEventId', v_terms_after.activity_event_id,
        'recipientUserId', v_terms_after.recipient_user_id,
        'recipientActorId', v_terms_after.recipient_actor_id,
        'lifecycleStatus', v_terms_after.lifecycle_status,
        'pointsAmount', v_terms_after.points_price,
        'pointsTransactionId', v_terms_after.points_transaction_id,
        'publicCode', v_terms_after.public_code,
        'qrTokenVersion', v_terms_after.qr_token_version,
        'orderedAt', v_terms_after.ordered_at
      );
    end if;

    raise;
end;
$function$;

revoke all on function
  public.request_gift_certificate_activity_v1(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text
  )
from public, anon, authenticated, service_role;

grant execute on function
  public.request_gift_certificate_activity_v1(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text
  )
to service_role;

comment on column
  public.activity_gift_certificate_terms.order_idempotency_key
is
  'Buyer order request key. Used only by the controlled service-role RPC.';

comment on column
  public.activity_gift_certificate_terms.points_transaction_id
is
  'Confirmed POINTS burn transaction created atomically at certificate order.';

comment on column
  public.activity_gift_certificate_terms.qr_token_version
is
  'Server-side deterministic QR token derivation contract. Raw token is not stored.';

comment on function
  public.request_gift_certificate_activity_v1(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text
  )
is
  'Atomically orders an available activity-based gift certificate, burns buyer POINTS, assigns recipient and awards provider reputation.';

commit;
