-- PGC8B — owner-account commercial limits.
--
-- Personal profile, every avatar and every enterprise owned by one account
-- share the same free limits. Paid tariffs may increase limits through
-- active entitlements; exact paid values are intentionally not hard-coded.

begin;

create table if not exists public.owner_commercial_limit_policies (
  limit_code text primary key,
  free_limit_value integer not null,
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint owner_commercial_limit_policies_code_check
    check (limit_code ~ '^[a-z][a-z0-9_]*$'),
  constraint owner_commercial_limit_policies_value_check
    check (free_limit_value >= 0)
);

create table if not exists public.owner_commercial_limit_entitlements (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,
  limit_code text not null
    references public.owner_commercial_limit_policies(limit_code)
    on update cascade
    on delete restrict,
  limit_value integer not null,
  source_type text not null default 'paid_tariff',
  source_reference text,
  valid_from timestamptz not null default clock_timestamp(),
  valid_until timestamptz,
  status text not null default 'active',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint owner_commercial_limit_entitlements_value_check
    check (limit_value >= 0),
  constraint owner_commercial_limit_entitlements_source_check
    check (
      source_type in (
        'paid_tariff',
        'admin_override',
        'promotion',
        'system'
      )
    ),
  constraint owner_commercial_limit_entitlements_status_check
    check (status in ('active', 'revoked', 'expired')),
  constraint owner_commercial_limit_entitlements_validity_check
    check (valid_until is null or valid_until > valid_from),
  constraint owner_commercial_limit_entitlements_metadata_check
    check (jsonb_typeof(metadata_json) = 'object')
);

insert into public.owner_commercial_limit_policies (
  limit_code,
  free_limit_value,
  description,
  is_active,
  updated_at
)
values
  (
    'gift_certificates_available',
    3,
    'Maximum overlapping available gift certificates across all personal profiles, avatars and enterprises owned by one account.',
    true,
    clock_timestamp()
  ),
  (
    'points_awarded_monthly',
    2000,
    'Maximum POINTS awarded from confirmed purchases to one account in one calendar month.',
    true,
    clock_timestamp()
  ),
  (
    'purchase_confirmations_monthly',
    5,
    'Maximum purchases confirmed in one calendar month across every enterprise owned by one account.',
    true,
    clock_timestamp()
  )
on conflict (limit_code)
do update set
  free_limit_value = excluded.free_limit_value,
  description = excluded.description,
  is_active = true,
  updated_at = clock_timestamp();

create index if not exists
  owner_commercial_limit_entitlements_lookup_idx
on public.owner_commercial_limit_entitlements (
  owner_user_id,
  limit_code,
  status,
  valid_from,
  valid_until
);

create unique index if not exists
  owner_commercial_limit_entitlements_source_uidx
on public.owner_commercial_limit_entitlements (
  owner_user_id,
  limit_code,
  source_type,
  source_reference
)
where source_reference is not null
  and status = 'active';

alter table public.owner_commercial_limit_policies
  enable row level security;

alter table public.owner_commercial_limit_entitlements
  enable row level security;

revoke all on table public.owner_commercial_limit_policies
  from public, anon, authenticated;

revoke all on table public.owner_commercial_limit_entitlements
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.owner_commercial_limit_policies
  to service_role;

grant select, insert, update, delete
  on table public.owner_commercial_limit_entitlements
  to service_role;

create or replace function public.resolve_owner_commercial_limit_v1(
  p_owner_user_id uuid,
  p_limit_code text,
  p_at timestamptz default now()
)
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_limit_code text := lower(btrim(coalesce(p_limit_code, '')));
  v_free_limit integer;
  v_entitled_limit integer;
begin
  if p_owner_user_id is null or v_limit_code = '' then
    raise exception using
      errcode = '22023',
      message = 'PGC8B_OWNER_LIMIT_CONTEXT_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.app_users app_user
    where app_user.id = p_owner_user_id
      and app_user.access_status is distinct from 'blocked'
  ) then
    raise exception using
      errcode = '42501',
      message = 'PGC8B_OWNER_LIMIT_ACCOUNT_NOT_AVAILABLE';
  end if;

  select policy.free_limit_value
  into v_free_limit
  from public.owner_commercial_limit_policies policy
  where policy.limit_code = v_limit_code
    and policy.is_active = true;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC8B_OWNER_LIMIT_POLICY_NOT_FOUND',
      detail = v_limit_code;
  end if;

  select max(entitlement.limit_value)
  into v_entitled_limit
  from public.owner_commercial_limit_entitlements entitlement
  where entitlement.owner_user_id = p_owner_user_id
    and entitlement.limit_code = v_limit_code
    and entitlement.status = 'active'
    and entitlement.valid_from <= coalesce(p_at, now())
    and (
      entitlement.valid_until is null
      or entitlement.valid_until > coalesce(p_at, now())
    );

  return greatest(v_free_limit, coalesce(v_entitled_limit, v_free_limit));
end;
$function$;

revoke all on function public.resolve_owner_commercial_limit_v1(
  uuid,
  text,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.resolve_owner_commercial_limit_v1(
  uuid,
  text,
  timestamptz
) to service_role;

comment on table public.owner_commercial_limit_policies is
  'Free/default account-level commercial limits. Actors and enterprises do not receive separate free allowances.';

comment on table public.owner_commercial_limit_entitlements is
  'Time-bounded paid tariff or administrative increases to account-level commercial limits. The resolver never lowers a free limit.';

comment on function public.resolve_owner_commercial_limit_v1(
  uuid,
  text,
  timestamptz
) is
  'Returns the greater of the active free limit and active owner entitlement.';

-- publish_gift_certificate_activity_v1(p_owner_user_id uuid, p_manager_actor_id uuid, p_activity_event_id uuid)
CREATE OR REPLACE FUNCTION public.publish_gift_certificate_activity_v1(p_owner_user_id uuid, p_manager_actor_id uuid, p_activity_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_terms public.activity_gift_certificate_terms%rowtype;
  v_activity public.activity_events%rowtype;
  v_template_slug text;
  v_overlap_count integer;
  v_owner_limit integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_owner_user_id is null
     or p_manager_actor_id is null
     or p_activity_event_id is null then
    raise exception using
      errcode = '22023',
      message = 'PGC6A_PUBLICATION_CONTEXT_REQUIRED';
  end if;

  select *
  into v_terms
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC6A_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms.provider_owner_user_id
       is distinct from p_owner_user_id
     or v_terms.provider_manager_actor_id
       is distinct from p_manager_actor_id then
    raise exception using
      errcode = '42501',
      message = 'PGC6A_CERTIFICATE_OWNER_MISMATCH';
  end if;

  select *
  into v_activity
  from public.activity_events activity
  where activity.id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC6A_ACTIVITY_NOT_FOUND';
  end if;

  select template.slug
  into v_template_slug
  from public.activity_templates template
  where template.id = v_activity.activity_template_id;

  if v_activity.user_id is distinct from p_owner_user_id
     or v_activity.acting_as_actor_id
        is distinct from p_manager_actor_id
     or v_activity.activity_role_code
        is distinct from 'planned'
     or v_template_slug
        is distinct from 'gift-certificate-v1' then
    raise exception using
      errcode = '42501',
      message = 'PGC6A_ACTIVITY_OWNER_OR_TEMPLATE_INVALID';
  end if;

  if v_terms.lifecycle_status = 'available' then
    if v_terms.published_at is null
       or v_activity.status is distinct from 'planned' then
      raise exception using
        errcode = '23514',
        message = 'PGC6A_AVAILABLE_STATE_INCONSISTENT';
    end if;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'activityEventId', v_terms.activity_event_id,
      'providerActorId', v_terms.provider_actor_id,
      'lifecycleStatus', v_terms.lifecycle_status,
      'publishedAt', v_terms.published_at,
      'availableFrom', v_terms.available_from,
      'availableUntil', v_terms.available_until
    );
  end if;

  if v_terms.lifecycle_status is distinct from 'draft'
     or v_activity.status is distinct from 'draft' then
    raise exception using
      errcode = '23514',
      message = 'PGC6A_ONLY_DRAFT_CAN_BE_PUBLISHED';
  end if;

  if v_terms.published_at is not null
     or v_terms.recipient_user_id is not null
     or v_terms.recipient_actor_id is not null
     or v_terms.public_code is not null
     or v_terms.qr_token_hash is not null
     or v_terms.ordered_at is not null
     or v_terms.redeemed_at is not null
     or v_terms.expired_at is not null
     or v_terms.annulled_at is not null then
    raise exception using
      errcode = '23514',
      message = 'PGC6A_DRAFT_STATE_INVALID';
  end if;

  if v_terms.available_until < current_date then
    raise exception using
      errcode = '22023',
      message = 'PGC6A_VALIDITY_ALREADY_ENDED';
  end if;

  if v_terms.available_until < v_terms.available_from
     or (v_terms.available_until - v_terms.available_from) > 31 then
    raise exception using
      errcode = '22023',
      message = 'PGC6A_VALIDITY_INVALID';
  end if;

  if v_terms.regular_price_snapshot <= 0
     or v_terms.provider_currency_covered_amount <= 0
     or v_terms.points_price <= 0 then
    raise exception using
      errcode = '22023',
      message = 'PGC6A_POSITIVE_CERTIFICATE_VALUE_REQUIRED';
  end if;

  -- One owner-account lock serializes publication across the personal
  -- profile, every avatar and every enterprise owned by the account.
  perform 1
  from public.app_users app_user
  where app_user.id = p_owner_user_id
    and app_user.access_status is distinct from 'blocked'
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'PGC8B_OWNER_ACCOUNT_NOT_AVAILABLE';
  end if;

  v_owner_limit := public.resolve_owner_commercial_limit_v1(
    p_owner_user_id,
    'gift_certificates_available',
    v_now
  );

  perform 1
  from public.actors actor
  where actor.id = v_terms.provider_actor_id
    and actor.status = 'active'
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'PGC6A_PROVIDER_NOT_AVAILABLE';
  end if;

  select count(*)
  into v_overlap_count
  from public.activity_gift_certificate_terms existing
  where existing.provider_owner_user_id = p_owner_user_id
    and existing.lifecycle_status = 'available'
    and existing.activity_event_id <> v_terms.activity_event_id
    and existing.available_from <= v_terms.available_until
    and existing.available_until >= v_terms.available_from;

  if v_overlap_count >= v_owner_limit then
    raise exception using
      errcode = '23514',
      message = 'PGC8B_OWNER_AVAILABLE_CERTIFICATE_LIMIT_REACHED',
      detail = format(
        'owner_user_id=%s overlapping_available=%s limit=%s',
        p_owner_user_id,
        v_overlap_count,
        v_owner_limit
      );
  end if;

  update public.activity_events
  set
    status = 'planned',
    metadata_json = coalesce(metadata_json, '{}'::jsonb)
      || jsonb_build_object(
        'giftCertificateLifecycle', 'available',
        'giftCertificatePublishedAt', v_now
      ),
    updated_at = v_now
  where id = v_activity.id
  returning *
  into v_activity;

  update public.activity_gift_certificate_terms
  set
    lifecycle_status = 'available',
    published_at = v_now
  where activity_event_id = v_terms.activity_event_id
  returning *
  into v_terms;

  return jsonb_build_object(
    'ok', true,
    'disposition', 'published',
    'activityEventId', v_terms.activity_event_id,
    'valueObjectId', v_terms.value_object_id,
    'providerActorId', v_terms.provider_actor_id,
    'providerType', v_terms.provider_type,
    'lifecycleStatus', v_terms.lifecycle_status,
    'activityStatus', v_activity.status,
    'publishedAt', v_terms.published_at,
    'availableFrom', v_terms.available_from,
    'availableUntil', v_terms.available_until,
    'overlappingAvailableCount', v_overlap_count + 1,
    'ownerAvailableCertificateLimit', v_owner_limit,
    'giftCertificateTerms', to_jsonb(v_terms)
  );
end;
$function$;

comment on function public.publish_gift_certificate_activity_v1(
  uuid,
  uuid,
  uuid
) is
  'Publishes a gift-certificate activity using one overlapping availability quota shared by all providers of the owner account.';

-- submit_purchase_confirmation(p_buyer_user_id uuid, p_organization_id uuid, p_purchase_amount numeric, p_purchase_currency text, p_user_comment text, p_receipt_url text)
CREATE OR REPLACE FUNCTION public.submit_purchase_confirmation(p_buyer_user_id uuid, p_organization_id uuid, p_purchase_amount numeric, p_purchase_currency text DEFAULT NULL::text, p_user_comment text DEFAULT NULL::text, p_receipt_url text DEFAULT NULL::text)
 RETURNS TABLE(purchase_confirmation_id uuid, buyer_public_code text, organization_id uuid, purchase_amount numeric, purchase_currency text, status text)
 LANGUAGE plpgsql
AS $function$
declare
  v_organization public.organizations%rowtype;
  v_purchase public.purchase_confirmations%rowtype;
  v_buyer_public_code text;
  v_purchase_currency text;
begin
  if p_purchase_amount is null or p_purchase_amount <= 0 then
    raise exception 'Purchase amount must be positive';
  end if;

  select o.*
  into v_organization
  from public.organizations o
  where o.id = p_organization_id
  limit 1;

  if not found then
    raise exception 'Organization not found';
  end if;

  if v_organization.created_by_user_id
       is not distinct from p_buyer_user_id then
    raise exception using
      errcode = '42501',
      message = 'PGC8B_BUYER_CANNOT_SUBMIT_PURCHASE_AT_OWN_ORGANIZATION';
  end if;

  v_purchase_currency := upper(
    coalesce(
      nullif(trim(p_purchase_currency), ''),
      nullif(trim(v_organization.default_currency), ''),
      'PLN'
    )
  );

  v_buyer_public_code := upper(
    'USR-' ||
    substring(
      encode(
        extensions.digest(
          p_buyer_user_id::text || '-' || p_organization_id::text,
          'sha256'
        ),
        'hex'
      )
      from 1 for 8
    )
  );

  insert into public.purchase_confirmations (
    organization_id,
    buyer_user_id,
    buyer_public_code,
    purchase_amount,
    purchase_currency,
    user_comment,
    receipt_url,
    status
  )
  values (
    p_organization_id,
    p_buyer_user_id,
    v_buyer_public_code,
    p_purchase_amount,
    v_purchase_currency,
    p_user_comment,
    p_receipt_url,
    'requested'
  )
  returning * into v_purchase;

  insert into public.purchase_confirmation_events (
    purchase_confirmation_id,
    organization_id,
    buyer_user_id,
    actor_user_id,
    event_type,
    status_before,
    status_after,
    purchase_amount,
    purchase_currency,
    points_awarded,
    buyer_public_code,
    user_comment,
    seller_comment
  )
  values (
    v_purchase.id,
    v_purchase.organization_id,
    v_purchase.buyer_user_id,
    v_purchase.buyer_user_id,
    'submitted',
    null,
    v_purchase.status,
    v_purchase.purchase_amount,
    v_purchase.purchase_currency,
    v_purchase.points_awarded,
    v_purchase.buyer_public_code,
    v_purchase.user_comment,
    v_purchase.seller_comment
  );

  return query
  select
    v_purchase.id,
    v_purchase.buyer_public_code,
    v_purchase.organization_id,
    v_purchase.purchase_amount,
    v_purchase.purchase_currency,
    v_purchase.status;
end;
$function$;

comment on function public.submit_purchase_confirmation(
  uuid,
  uuid,
  numeric,
  text,
  text,
  text
) is
  'Creates an external purchase confirmation request and rejects a purchase at an organization owned by the same account.';

-- confirm_purchase_and_award_points(p_purchase_confirmation_id uuid, p_confirmed_by_user_id uuid, p_seller_comment text)
CREATE OR REPLACE FUNCTION public.confirm_purchase_and_award_points(p_purchase_confirmation_id uuid, p_confirmed_by_user_id uuid, p_seller_comment text DEFAULT NULL::text)
 RETURNS TABLE(purchase_confirmation_id uuid, buyer_user_id uuid, organization_id uuid, points_awarded numeric, status text, transaction_id uuid)
 LANGUAGE plpgsql
AS $function$
declare
  v_purchase public.purchase_confirmations%rowtype;
  v_rule public.points_reward_rules%rowtype;
  v_organization public.organizations%rowtype;
  v_month_start timestamp with time zone;
  v_month_end timestamp with time zone;
  v_user_points_this_month numeric;
  v_owner_confirmations_this_month integer;
  v_monthly_points_limit integer;
  v_monthly_confirmation_limit integer;
  v_points_to_award numeric;
  v_points_result record;
  v_status_before text;
  v_event_type text;
begin
  select pc.*
  into v_purchase
  from public.purchase_confirmations pc
  where pc.id = p_purchase_confirmation_id
  for update;

  if not found then
    raise exception 'Purchase confirmation not found';
  end if;

  if v_purchase.status = 'confirmed' then
    raise exception 'Purchase confirmation is already confirmed';
  end if;

  if v_purchase.status not in ('requested', 'rejected') then
    raise exception 'Only requested or rejected purchase confirmations can be confirmed';
  end if;

  select organization.*
  into v_organization
  from public.organizations organization
  where organization.id = v_purchase.organization_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC8B_PURCHASE_ORGANIZATION_NOT_FOUND';
  end if;

  if v_organization.created_by_user_id
       is distinct from p_confirmed_by_user_id then
    raise exception using
      errcode = '42501',
      message = 'PGC8B_ONLY_ORGANIZATION_OWNER_CAN_CONFIRM_PURCHASE';
  end if;

  if v_purchase.buyer_user_id
       is not distinct from v_organization.created_by_user_id then
    raise exception using
      errcode = '42501',
      message = 'PGC8B_OWNER_CANNOT_CONFIRM_OWN_PURCHASE';
  end if;

  -- Lock both accounts in deterministic order so simultaneous confirmations
  -- cannot pass the same monthly-limit check.
  perform 1
  from public.app_users app_user
  where app_user.id in (
    v_purchase.buyer_user_id,
    v_organization.created_by_user_id
  )
  order by app_user.id
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'PGC8B_PURCHASE_ACCOUNT_CONTEXT_NOT_AVAILABLE';
  end if;

  v_status_before := v_purchase.status;

  if v_status_before = 'rejected' then
    v_event_type := 'corrected_to_confirmed';
  else
    v_event_type := 'confirmed';
  end if;

  select r.*
  into v_rule
  from public.points_reward_rules r
  where r.organization_id = v_purchase.organization_id
    and r.is_active = true
    and r.status = 'active'
    and r.purchase_currency = v_purchase.purchase_currency
  order by r.created_at desc
  limit 1;

  if not found then
    raise exception 'Active reward rule not found for this organization and currency';
  end if;

  if v_purchase.purchase_amount < v_rule.min_purchase_amount then
    raise exception 'Purchase amount is lower than minimum purchase amount';
  end if;

  v_month_start := date_trunc('month', now());
  v_month_end := v_month_start + interval '1 month';

  select coalesce(sum(pc.points_awarded), 0)
  into v_user_points_this_month
  from public.purchase_confirmations pc
  where pc.buyer_user_id = v_purchase.buyer_user_id
    and pc.status = 'confirmed'
    and pc.confirmed_at >= v_month_start
    and pc.confirmed_at < v_month_end;

  v_points_to_award := v_rule.points_per_confirmed_purchase;

  v_monthly_points_limit := public.resolve_owner_commercial_limit_v1(
    v_purchase.buyer_user_id,
    'points_awarded_monthly',
    now()
  );

  if v_user_points_this_month + v_points_to_award
       > v_monthly_points_limit then
    raise exception using
      errcode = '23514',
      message = 'PGC8B_OWNER_MONTHLY_POINTS_LIMIT_EXCEEDED',
      detail = format(
        'buyer_user_id=%s current=%s requested=%s limit=%s',
        v_purchase.buyer_user_id,
        v_user_points_this_month,
        v_points_to_award,
        v_monthly_points_limit
      );
  end if;

  select count(*)::integer
  into v_owner_confirmations_this_month
  from public.purchase_confirmations pc
  join public.organizations organization
    on organization.id = pc.organization_id
  where organization.created_by_user_id =
      v_organization.created_by_user_id
    and pc.status = 'confirmed'
    and pc.confirmed_at >= v_month_start
    and pc.confirmed_at < v_month_end;

  v_monthly_confirmation_limit :=
    public.resolve_owner_commercial_limit_v1(
      v_organization.created_by_user_id,
      'purchase_confirmations_monthly',
      now()
    );

  if v_owner_confirmations_this_month
       >= v_monthly_confirmation_limit then
    raise exception using
      errcode = '23514',
      message = 'PGC8B_OWNER_MONTHLY_CONFIRMATION_LIMIT_EXCEEDED',
      detail = format(
        'owner_user_id=%s current=%s limit=%s',
        v_organization.created_by_user_id,
        v_owner_confirmations_this_month,
        v_monthly_confirmation_limit
      );
  end if;

  select *
  into v_points_result
  from public.add_points_to_wallet(
    v_purchase.buyer_user_id,
    v_purchase.organization_id,
    v_points_to_award,
    'purchase_confirmation',
    v_purchase.id,
    null,
    null,
    'Points awarded for confirmed purchase'
  );

  update public.purchase_confirmations pc
  set
    confirmed_by_user_id = p_confirmed_by_user_id,
    seller_comment = p_seller_comment,
    points_awarded = v_points_to_award,
    status = 'confirmed',
    confirmed_at = now(),
    rejected_at = null,
    last_decision_at = now(),
    updated_at = now()
  where pc.id = v_purchase.id
  returning pc.* into v_purchase;

  insert into public.purchase_confirmation_events (
    purchase_confirmation_id,
    organization_id,
    buyer_user_id,
    actor_user_id,
    event_type,
    status_before,
    status_after,
    purchase_amount,
    purchase_currency,
    points_awarded,
    buyer_public_code,
    user_comment,
    seller_comment
  )
  values (
    v_purchase.id,
    v_purchase.organization_id,
    v_purchase.buyer_user_id,
    p_confirmed_by_user_id,
    v_event_type,
    v_status_before,
    v_purchase.status,
    v_purchase.purchase_amount,
    v_purchase.purchase_currency,
    v_purchase.points_awarded,
    v_purchase.buyer_public_code,
    v_purchase.user_comment,
    v_purchase.seller_comment
  );

  return query
  select
    v_purchase.id,
    v_purchase.buyer_user_id,
    v_purchase.organization_id,
    v_purchase.points_awarded,
    v_purchase.status,
    v_points_result.transaction_id::uuid;
end;
$function$;

comment on function public.confirm_purchase_and_award_points(
  uuid,
  uuid,
  text
) is
  'Confirms only by the organization owner, blocks self-confirmation and applies account-level monthly limits.';

commit;
