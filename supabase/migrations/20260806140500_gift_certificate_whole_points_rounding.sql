-- ARCTor.app
-- GCR6E: whole-point ceiling for activity-based gift certificates.
--
-- Canonical rule:
-- 1 POINT = 1 EUR.
-- Required POINTS are always rounded upward to a whole number.
-- Provider-currency gift and buyer cash remainder stay at two decimals.
-- Published/ordered legacy snapshots are preserved unchanged.

begin;

do $preflight$
begin
  if to_regprocedure(
    'public.enforce_activity_gift_certificate_terms_v1()'
  ) is null then
    raise exception using
      errcode = '42883',
      message = 'GCR6E_GIFT_CERTIFICATE_GUARD_MISSING';
  end if;

  if to_regclass('public.activity_gift_certificate_terms') is null
     or to_regclass('public.activity_events') is null
     or to_regclass('public.value_objects') is null then
    raise exception using
      errcode = '42P01',
      message = 'GCR6E_GIFT_CERTIFICATE_TABLES_MISSING';
  end if;
end;
$preflight$;

create or replace function public.enforce_activity_gift_certificate_terms_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_activity public.activity_events%rowtype;
  v_value_object public.value_objects%rowtype;
  v_template_slug text;
  v_manager_profile public.actor_public_profiles%rowtype;
  v_provider_actor public.actors%rowtype;
  v_organization public.organizations%rowtype;
  v_expected_provider_type text;
  v_expected_currency text;
  v_regular_price numeric(18,2);
  v_covered numeric(18,2);
  v_remainder numeric(18,2);
  v_exchange_rate numeric(18,8);
  v_points numeric(18,2);
  v_current_currency text;
begin
  select *
  into v_activity
  from public.activity_events activity_event
  where activity_event.id = new.activity_event_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC3B_ACTIVITY_NOT_FOUND';
  end if;

  select template.slug
  into v_template_slug
  from public.activity_templates template
  where template.id = v_activity.activity_template_id;

  if v_activity.activity_role_code is distinct from 'planned'
     or v_template_slug is distinct from 'gift-certificate-v1' then
    raise exception using
      errcode = '23514',
      message = 'PGC3B_ACTIVITY_TEMPLATE_INVALID';
  end if;

  if v_activity.user_id is distinct from new.provider_owner_user_id
     or v_activity.acting_as_actor_id is distinct from new.provider_manager_actor_id then
    raise exception using
      errcode = '42501',
      message = 'PGC3B_ACTIVITY_OWNER_MISMATCH';
  end if;

  if tg_op = 'UPDATE'
     and (
       new.activity_event_id is distinct from old.activity_event_id
       or new.value_object_id is distinct from old.value_object_id
       or new.provider_owner_user_id is distinct from old.provider_owner_user_id
       or new.provider_manager_actor_id is distinct from old.provider_manager_actor_id
       or new.provider_actor_id is distinct from old.provider_actor_id
       or new.provider_organization_id is distinct from old.provider_organization_id
       or new.provider_type is distinct from old.provider_type
     ) then
    raise exception using
      errcode = '23514',
      message = 'PGC3B_CERTIFICATE_IDENTITY_IMMUTABLE';
  end if;

  if tg_op = 'UPDATE'
     and old.published_at is not null
     and (
       new.regular_price_snapshot
         is distinct from old.regular_price_snapshot
       or new.provider_currency
         is distinct from old.provider_currency
       or new.points_coverage_mode
         is distinct from old.points_coverage_mode
       or new.points_coverage_percent
         is distinct from old.points_coverage_percent
       or new.requested_points_covered_amount
         is distinct from old.requested_points_covered_amount
       or new.provider_currency_covered_amount
         is distinct from old.provider_currency_covered_amount
       or new.money_remainder_provider_currency
         is distinct from old.money_remainder_provider_currency
       or new.points_currency_code
         is distinct from old.points_currency_code
       or new.reference_currency
         is distinct from old.reference_currency
       or new.reference_value_per_point
         is distinct from old.reference_value_per_point
       or new.reference_exchange_rate
         is distinct from old.reference_exchange_rate
       or new.reference_exchange_rate_source
         is distinct from old.reference_exchange_rate_source
       or new.reference_exchange_rate_date
         is distinct from old.reference_exchange_rate_date
       or new.reference_exchange_rate_fetched_at
         is distinct from old.reference_exchange_rate_fetched_at
       or new.reference_exchange_rate_source_url
         is distinct from old.reference_exchange_rate_source_url
       or new.reference_exchange_rate_is_fallback
         is distinct from old.reference_exchange_rate_is_fallback
       or new.points_price
         is distinct from old.points_price
     ) then
    raise exception using
      errcode = '23514',
      message = 'GCR6B_PUBLISHED_FINANCIAL_SNAPSHOT_IMMUTABLE';
  end if;

  select *
  into v_manager_profile
  from public.actor_public_profiles profile
  where profile.owner_user_id = new.provider_owner_user_id
    and profile.actor_id = new.provider_manager_actor_id;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'PGC3B_MANAGER_PROFILE_NOT_AVAILABLE';
  end if;

  select *
  into v_provider_actor
  from public.actors actor
  where actor.id = new.provider_actor_id
    and actor.status = 'active';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'PGC3B_PROVIDER_ACTOR_NOT_AVAILABLE';
  end if;

  select *
  into v_value_object
  from public.value_objects value_object
  where value_object.id = new.value_object_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC3B_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_value_object.node_role_code is distinct from 'activity_leaf'
     or v_value_object.object_kind not in ('product_type', 'service_type') then
    raise exception using
      errcode = '23514',
      message = 'PGC3B_VALUE_OBJECT_KIND_INVALID';
  end if;

  if v_value_object.owner_user_id is distinct from new.provider_owner_user_id
     or v_value_object.owner_actor_id is distinct from new.provider_manager_actor_id
     or v_value_object.organization_id is distinct from new.provider_organization_id then
    raise exception using
      errcode = '42501',
      message = 'PGC3B_VALUE_OBJECT_OWNER_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.activity_value_object_links link
    where link.activity_event_id = new.activity_event_id
      and link.value_object_id = new.value_object_id
      and link.link_type = 'planned_target'
      and link.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'PGC3B_PLANNED_TARGET_LINK_REQUIRED';
  end if;

  if new.provider_organization_id is null then
    v_expected_provider_type := v_manager_profile.profile_kind;
    v_current_currency := 'EUR';

    if new.provider_actor_id is distinct from new.provider_manager_actor_id then
      raise exception using
        errcode = '42501',
        message = 'PGC3B_PRIVATE_PROVIDER_ACTOR_MISMATCH';
    end if;
  else
    select *
    into v_organization
    from public.organizations organization
    where organization.id = new.provider_organization_id
      and organization.owner_actor_id = new.provider_manager_actor_id
      and organization.status = 'active';

    if not found then
      raise exception using
        errcode = '42501',
        message = 'PGC3B_ORGANIZATION_NOT_AVAILABLE';
    end if;

    if v_provider_actor.actor_type is distinct from 'organization'
       or v_provider_actor.organization_id is distinct from new.provider_organization_id then
      raise exception using
        errcode = '42501',
        message = 'PGC3B_ORGANIZATION_PROVIDER_ACTOR_MISMATCH';
    end if;

    v_expected_provider_type := 'organization';
    v_current_currency := upper(btrim(v_organization.default_currency));
  end if;

  if new.provider_type is distinct from v_expected_provider_type then
    raise exception using
      errcode = '23514',
      message = 'PGC3B_PROVIDER_TYPE_INVALID';
  end if;

  if v_current_currency is null
     or v_current_currency !~ '^[A-Z]{3}$' then
    raise exception using
      errcode = '23514',
      message = 'PGC3B_PROVIDER_CURRENCY_INVALID';
  end if;

  if tg_op = 'INSERT' then
    v_expected_currency := v_current_currency;

    if upper(btrim(coalesce(v_value_object.default_currency, '')))
       is distinct from v_expected_currency then
      raise exception using
        errcode = '23514',
        message = 'PGC3B_VALUE_OBJECT_CURRENCY_MISMATCH';
    end if;
  else
    v_expected_currency := old.provider_currency;

    if v_expected_currency is null
       or v_expected_currency !~ '^[A-Z]{3}$' then
      raise exception using
        errcode = '23514',
        message = 'PGC3B_STORED_PROVIDER_CURRENCY_INVALID';
    end if;
  end if;

  if v_value_object.object_kind = 'product_type'
     and new.delivery_mode not in ('product_pickup', 'product_delivery') then
    raise exception using
      errcode = '23514',
      message = 'PGC3B_PRODUCT_DELIVERY_MODE_INVALID';
  end if;

  if v_value_object.object_kind = 'service_type' then
    if new.delivery_mode not in ('service_offline', 'service_online') then
      raise exception using
        errcode = '23514',
        message = 'PGC3B_SERVICE_DELIVERY_MODE_INVALID';
    end if;

    if v_activity.schedule_mode_code = 'exact' then
      null;
    elsif v_activity.schedule_mode_code = 'unscheduled'
      and coalesce(
        v_activity.metadata_json ->> 'serviceTimeAgreement',
        ''
      ) = 'individual' then
      null;
    else
      raise exception using
        errcode = '23514',
        message = 'GCR6D_SERVICE_SCHEDULE_MODE_INVALID';
    end if;
  elsif v_activity.schedule_mode_code is distinct from 'date_range' then
    raise exception using
      errcode = '23514',
      message = 'PGC3B_PRODUCT_REQUIRES_DATE_RANGE';
  end if;

  if tg_op = 'INSERT' then
    v_regular_price := round(
      coalesce(v_value_object.default_price, 0)::numeric,
      2
    );
  else
    v_regular_price := old.regular_price_snapshot;
  end if;

  if v_regular_price is null or v_regular_price < 0 then
    raise exception using
      errcode = '23514',
      message = 'PGC3B_REGULAR_PRICE_INVALID';
  end if;

  new.regular_price_snapshot := v_regular_price;
  new.provider_currency := v_expected_currency;
  new.points_currency_code := 'POINT';
  new.reference_currency := 'EUR';
  new.reference_value_per_point := 1;

  if tg_op = 'UPDATE' then
    new.reference_exchange_rate :=
      old.reference_exchange_rate;
    new.reference_exchange_rate_source :=
      old.reference_exchange_rate_source;
    new.reference_exchange_rate_date :=
      old.reference_exchange_rate_date;
    new.reference_exchange_rate_fetched_at :=
      old.reference_exchange_rate_fetched_at;
    new.reference_exchange_rate_source_url :=
      old.reference_exchange_rate_source_url;
    new.reference_exchange_rate_is_fallback :=
      old.reference_exchange_rate_is_fallback;
  end if;

  if new.reference_exchange_rate_source is null
     or btrim(new.reference_exchange_rate_source) = ''
     or new.reference_exchange_rate_date is null
     or new.reference_exchange_rate_fetched_at is null
     or new.reference_exchange_rate_source_url is null
     or btrim(new.reference_exchange_rate_source_url) = ''
     or new.reference_exchange_rate_is_fallback is null then
    raise exception using
      errcode = '22023',
      message = 'GCR6B_REFERENCE_RATE_SNAPSHOT_REQUIRED';
  end if;

  if tg_op = 'INSERT'
     and new.reference_exchange_rate_is_fallback
     and new.reference_exchange_rate_fetched_at <
       clock_timestamp() - interval '7 days' then
    raise exception using
      errcode = '22023',
      message = 'GCR6B_REFERENCE_RATE_FALLBACK_TOO_OLD';
  end if;

  if new.reference_exchange_rate_date > current_date + 1
     or new.reference_exchange_rate_fetched_at >
        clock_timestamp() + interval '5 minutes' then
    raise exception using
      errcode = '22023',
      message = 'GCR6B_REFERENCE_RATE_SNAPSHOT_TIME_INVALID';
  end if;

  if new.points_coverage_mode = 'percentage' then
    new.points_coverage_percent := coalesce(new.points_coverage_percent, 100);
    new.requested_points_covered_amount := null;

    if new.points_coverage_percent < 0
       or new.points_coverage_percent > 100 then
      raise exception using
        errcode = '22023',
        message = 'PGC3B_POINTS_PERCENT_INVALID';
    end if;

    v_covered := round(
      v_regular_price * new.points_coverage_percent / 100,
      2
    );
  elsif new.points_coverage_mode = 'provider_currency_amount' then
    new.points_coverage_percent := null;

    if new.requested_points_covered_amount is null
       or new.requested_points_covered_amount < 0
       or new.requested_points_covered_amount > v_regular_price then
      raise exception using
        errcode = '22023',
        message = 'PGC3B_POINTS_AMOUNT_INVALID';
    end if;

    v_covered := round(new.requested_points_covered_amount, 2);
  else
    raise exception using
      errcode = '22023',
      message = 'PGC3B_POINTS_COVERAGE_MODE_INVALID';
  end if;

  v_remainder := round(v_regular_price - v_covered, 2);

  if v_expected_currency = 'EUR' then
    v_exchange_rate := 1;

    if new.reference_exchange_rate_source
         is distinct from 'EUR_IDENTITY'
       or new.reference_exchange_rate_is_fallback
       or new.reference_exchange_rate_source_url
          is distinct from
            'urn:arctor:exchange-rate:eur-identity' then
      raise exception using
        errcode = '22023',
        message = 'GCR6B_EUR_IDENTITY_SNAPSHOT_INVALID';
    end if;
  else
    v_exchange_rate := new.reference_exchange_rate;

    if v_exchange_rate is null or v_exchange_rate <= 0 then
      raise exception using
        errcode = '22023',
        message = 'GCR6B_ECB_REFERENCE_RATE_SNAPSHOT_INVALID';
    end if;

    if tg_op = 'UPDATE' then
      if old.reference_exchange_rate_source =
           'LEGACY_PRE_GCR6B' then
        if new.reference_exchange_rate_source
             is distinct from 'LEGACY_PRE_GCR6B'
           or new.reference_exchange_rate_source_url
             is distinct from
               'urn:arctor:legacy:pre-gcr6b' then
          raise exception using
            errcode = '22023',
            message =
              'GCR6B_LEGACY_REFERENCE_RATE_SNAPSHOT_INVALID';
        end if;
      elsif new.reference_exchange_rate_source
              is distinct from
                'ECB_EURO_REFERENCE_RATE'
         or new.reference_exchange_rate_source_url
              not like 'https://www.ecb.europa.eu/%' then
        raise exception using
          errcode = '22023',
          message =
            'GCR6B_ECB_REFERENCE_RATE_SNAPSHOT_INVALID';
      end if;
    elsif new.reference_exchange_rate_source
            is distinct from 'ECB_EURO_REFERENCE_RATE'
       or new.reference_exchange_rate_source_url
            not like 'https://www.ecb.europa.eu/%' then
      raise exception using
        errcode = '22023',
        message = 'GCR6B_ECB_REFERENCE_RATE_SNAPSHOT_INVALID';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.published_at is not null then
    v_points := old.points_price;
  else
    v_points := ceil(v_covered / v_exchange_rate);
  end if;

  new.provider_currency_covered_amount := v_covered;
  new.money_remainder_provider_currency := v_remainder;
  new.reference_exchange_rate := v_exchange_rate;
  new.points_price := v_points;

  if tg_op = 'UPDATE' and old.published_at is not null then
    new.public_snapshot_json := old.public_snapshot_json;
  else
    new.public_snapshot_json := jsonb_build_object(
      'contract', 'pgc3b-gift-certificate-activity-v1',
      'pointsRoundingPolicy', 'ceiling_whole_point_v1',
      'activityEventId', new.activity_event_id,
      'valueObjectId', new.value_object_id,
      'productOrServiceKind', v_value_object.object_kind,
      'publicTitle', v_value_object.title,
      'publicDescription', v_value_object.description,
      'deliveryMode', new.delivery_mode,
      'availableFrom', new.available_from,
      'availableUntil', new.available_until,
      'regularPrice', v_regular_price,
      'providerCurrency', v_expected_currency,
      'pointsCoverageMode', new.points_coverage_mode,
      'pointsCoveragePercent', new.points_coverage_percent,
      'pointsCoveredProviderAmount', v_covered,
      'pointsPrice', v_points,
      'moneyRemainderProviderCurrency', v_remainder,
      'referenceCurrency', 'EUR',
      'referenceValuePerPoint', 1,
      'referenceExchangeRate', v_exchange_rate,
      'referenceExchangeRateSource',
        new.reference_exchange_rate_source,
      'referenceExchangeRateDate',
        new.reference_exchange_rate_date,
      'referenceExchangeRateFetchedAt',
        new.reference_exchange_rate_fetched_at,
      'referenceExchangeRateSourceUrl',
        new.reference_exchange_rate_source_url,
      'referenceExchangeRateIsFallback',
        new.reference_exchange_rate_is_fallback,
      'exchangeRateConvention', 'provider_currency_per_EUR',
      'terms', new.terms_text
    );
  end if;

  return new;
end;
$function$;

comment on function public.enforce_activity_gift_certificate_terms_v1()
is
  'Validates gift-certificate terms. New and unpublished certificates use ceiling whole-point pricing; published legacy financial snapshots remain unchanged.';

alter table public.activity_gift_certificate_terms
  drop constraint if exists
    activity_gift_certificate_whole_points_policy_check;

alter table public.activity_gift_certificate_terms
  add constraint activity_gift_certificate_whole_points_policy_check
  check (
    case
      when coalesce(
        public_snapshot_json ->> 'pointsRoundingPolicy',
        'legacy'
      ) = 'ceiling_whole_point_v1'
      then
        points_price = ceil(points_price)
        and points_price = ceil(
          provider_currency_covered_amount / reference_exchange_rate
        )
        and case
          when jsonb_typeof(
            public_snapshot_json -> 'pointsPrice'
          ) = 'number'
          then
            (public_snapshot_json ->> 'pointsPrice')::numeric
              = points_price
          else false
        end
      else true
    end
  )
  not valid;

-- Reprice only unpublished drafts. Published or ordered financial snapshots are
-- deliberately excluded. A stale draft that cannot pass the current contract
-- is skipped and remains a legacy draft instead of blocking the migration.
do $reprice_unpublished$
declare
  v_row record;
begin
  for v_row in
    select terms.activity_event_id
    from public.activity_gift_certificate_terms terms
    where terms.published_at is null
      and terms.ordered_at is null
      and terms.recipient_user_id is null
      and terms.lifecycle_status = 'draft'
      and (
        terms.points_price is distinct from ceil(
          terms.provider_currency_covered_amount
          / terms.reference_exchange_rate
        )
        or coalesce(
          terms.public_snapshot_json ->> 'pointsRoundingPolicy',
          ''
        ) is distinct from 'ceiling_whole_point_v1'
      )
    order by terms.created_at, terms.activity_event_id
  loop
    begin
      update public.activity_gift_certificate_terms
      set updated_at = clock_timestamp()
      where activity_event_id = v_row.activity_event_id;
    exception
      when others then
        raise warning
          'GCR6E_SKIPPED_STALE_DRAFT activity_event_id=% sqlstate=% message=%',
          v_row.activity_event_id,
          sqlstate,
          sqlerrm;
    end;
  end loop;
end;
$reprice_unpublished$;

alter table public.activity_gift_certificate_terms
  validate constraint
    activity_gift_certificate_whole_points_policy_check;

comment on constraint
  activity_gift_certificate_whole_points_policy_check
on public.activity_gift_certificate_terms
is
  'Rows tagged ceiling_whole_point_v1 must store points_price as ceil(provider_currency_covered_amount / reference_exchange_rate) and mirror it in the public snapshot.';

notify pgrst, 'reload schema';

commit;
