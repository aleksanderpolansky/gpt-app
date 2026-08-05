begin;

-- GC-R6B
-- Complete, server-authenticated and immutable FX snapshot for
-- activity-based gift certificates.

create table if not exists
public.exchange_rate_reference_snapshots (
  base_currency text not null default 'EUR',
  quote_currency text not null,
  provider_currency_per_euro numeric(18,8) not null,
  reference_date date not null,
  source_code text not null,
  source_url text not null,
  fetched_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint exchange_rate_snapshot_base_currency_check
    check (base_currency = 'EUR'),

  constraint exchange_rate_snapshot_quote_currency_check
    check (quote_currency ~ '^[A-Z]{3}$'),

  constraint exchange_rate_snapshot_rate_positive_check
    check (provider_currency_per_euro > 0),

  constraint exchange_rate_snapshot_source_check
    check (
      source_code in (
        'ECB_EURO_REFERENCE_RATE',
        'EUR_IDENTITY'
      )
    ),

  constraint exchange_rate_snapshot_source_url_check
    check (length(btrim(source_url)) between 1 and 1000),

  constraint exchange_rate_snapshot_future_check
    check (
      reference_date <= (fetched_at at time zone 'UTC')::date + 1
    ),

  primary key (
    base_currency,
    quote_currency,
    reference_date,
    source_code
  )
);

create index if not exists
  exchange_rate_reference_snapshots_lookup_idx
on public.exchange_rate_reference_snapshots (
  quote_currency,
  source_code,
  reference_date desc,
  fetched_at desc
);

alter table public.exchange_rate_reference_snapshots
enable row level security;

drop policy if exists
  exchange_rate_reference_snapshots_service_role_all
on public.exchange_rate_reference_snapshots;

create policy
  exchange_rate_reference_snapshots_service_role_all
on public.exchange_rate_reference_snapshots
for all
to service_role
using (true)
with check (true);

revoke all on table public.exchange_rate_reference_snapshots
from public, anon, authenticated;

grant all on table public.exchange_rate_reference_snapshots
to service_role;

alter table public.activity_gift_certificate_terms
  add column if not exists
    reference_exchange_rate_source text null,
  add column if not exists
    reference_exchange_rate_date date null,
  add column if not exists
    reference_exchange_rate_fetched_at timestamptz null,
  add column if not exists
    reference_exchange_rate_source_url text null,
  add column if not exists
    reference_exchange_rate_is_fallback boolean null;

update public.activity_gift_certificate_terms
set
  reference_exchange_rate_source =
    case
      when provider_currency = 'EUR'
        then 'EUR_IDENTITY'
      else 'LEGACY_PRE_GCR6B'
    end,
  reference_exchange_rate_date =
    coalesce(reference_exchange_rate_date, created_at::date),
  reference_exchange_rate_fetched_at =
    coalesce(reference_exchange_rate_fetched_at, created_at),
  reference_exchange_rate_source_url =
    case
      when provider_currency = 'EUR'
        then 'urn:arctor:exchange-rate:eur-identity'
      else 'urn:arctor:legacy:pre-gcr6b'
    end,
  reference_exchange_rate_is_fallback =
    case
      when provider_currency = 'EUR' then false
      else true
    end
where reference_exchange_rate_source is null
   or reference_exchange_rate_date is null
   or reference_exchange_rate_fetched_at is null
   or reference_exchange_rate_source_url is null
   or reference_exchange_rate_is_fallback is null;

alter table public.activity_gift_certificate_terms
  alter column reference_exchange_rate_source set not null,
  alter column reference_exchange_rate_date set not null,
  alter column reference_exchange_rate_fetched_at set not null,
  alter column reference_exchange_rate_source_url set not null,
  alter column reference_exchange_rate_is_fallback
    set default false,
  alter column reference_exchange_rate_is_fallback set not null;

do $block$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.activity_gift_certificate_terms'::regclass
      and conname =
        'activity_gift_certificate_rate_source_check'
  ) then
    alter table public.activity_gift_certificate_terms
    add constraint activity_gift_certificate_rate_source_check
    check (
      reference_exchange_rate_source in (
        'ECB_EURO_REFERENCE_RATE',
        'EUR_IDENTITY',
        'LEGACY_PRE_GCR6B'
      )
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.activity_gift_certificate_terms'::regclass
      and conname =
        'activity_gift_certificate_rate_source_url_check'
  ) then
    alter table public.activity_gift_certificate_terms
    add constraint
      activity_gift_certificate_rate_source_url_check
    check (
      length(btrim(reference_exchange_rate_source_url))
        between 1 and 1000
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.activity_gift_certificate_terms'::regclass
      and conname =
        'activity_gift_certificate_rate_time_check'
  ) then
    alter table public.activity_gift_certificate_terms
    add constraint activity_gift_certificate_rate_time_check
    check (
      reference_exchange_rate_date <=
        (
          reference_exchange_rate_fetched_at
          at time zone 'UTC'
        )::date + 1
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.activity_gift_certificate_terms'::regclass
      and conname =
        'activity_gift_certificate_eur_identity_check'
  ) then
    alter table public.activity_gift_certificate_terms
    add constraint activity_gift_certificate_eur_identity_check
    check (
      provider_currency <> 'EUR'
      or (
        reference_exchange_rate = 1
        and reference_exchange_rate_source =
          'EUR_IDENTITY'
        and reference_exchange_rate_is_fallback = false
        and reference_exchange_rate_source_url =
          'urn:arctor:exchange-rate:eur-identity'
      )
    );
  end if;
end;
$block$;

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

    if v_activity.schedule_mode_code is distinct from 'exact' then
      raise exception using
        errcode = '23514',
        message = 'PGC3B_SERVICE_REQUIRES_EXACT_SCHEDULE';
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

  v_points := round(v_covered / v_exchange_rate, 2);

  new.provider_currency_covered_amount := v_covered;
  new.money_remainder_provider_currency := v_remainder;
  new.reference_exchange_rate := v_exchange_rate;
  new.points_price := v_points;

  new.public_snapshot_json := jsonb_build_object(
    'contract', 'pgc3b-gift-certificate-activity-v1',
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

  return new;
end;
$function$;


drop function if exists
  public.create_gift_certificate_activity_draft_v1(
  uuid,
  uuid,
  uuid,
  text,
  text,
  date,
  date,
  text,
  numeric,
  numeric,
  numeric,
  text,
  timestamptz,
  timestamptz
);

create or replace function public.create_gift_certificate_activity_draft_v1(
  p_owner_user_id uuid,
  p_manager_actor_id uuid,
  p_value_object_id uuid,
  p_idempotency_key text,
  p_delivery_mode text,
  p_available_from date,
  p_available_until date,
  p_points_coverage_mode text default 'percentage',
  p_points_coverage_percent numeric default 100,
  p_points_covered_amount numeric default null,
  p_reference_exchange_rate numeric default null,
  p_reference_exchange_rate_source text default null,
  p_reference_exchange_rate_date date default null,
  p_reference_exchange_rate_fetched_at timestamptz default null,
  p_reference_exchange_rate_source_url text default null,
  p_reference_exchange_rate_is_fallback boolean default false,
  p_terms_text text default null,
  p_started_at timestamptz default null,
  p_ended_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_value_object public.value_objects%rowtype;
  v_template_id uuid;
  v_provider_actor_id uuid;
  v_provider_type text;
  v_provider_organization_id uuid;
  v_activity_payload jsonb;
  v_create_result jsonb;
  v_activity_event_id uuid;
  v_activity public.activity_events%rowtype;
  v_terms public.activity_gift_certificate_terms%rowtype;
begin
  if p_owner_user_id is null
     or p_manager_actor_id is null
     or p_value_object_id is null then
    raise exception using
      errcode = '22023',
      message = 'PGC3B_OWNER_CONTEXT_REQUIRED';
  end if;

  if nullif(btrim(p_idempotency_key), '') is null then
    raise exception using
      errcode = '22023',
      message = 'PGC3B_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  if p_available_from is null or p_available_until is null then
    raise exception using
      errcode = '22023',
      message = 'PGC3B_AVAILABILITY_REQUIRED';
  end if;

  if p_available_until < p_available_from
     or (p_available_until - p_available_from) > 31 then
    raise exception using
      errcode = '22023',
      message = 'PGC3B_AVAILABILITY_INVALID';
  end if;

  select *
  into v_value_object
  from public.value_objects value_object
  where value_object.id = p_value_object_id
    and value_object.owner_user_id = p_owner_user_id
    and value_object.owner_actor_id = p_manager_actor_id
    and value_object.node_role_code = 'activity_leaf'
    and value_object.object_kind in ('product_type', 'service_type')
    and value_object.status in ('draft', 'active');

  if not found then
    raise exception using
      errcode = '42501',
      message = 'PGC3B_VALUE_OBJECT_NOT_AVAILABLE';
  end if;

  select template.id
  into v_template_id
  from public.activity_templates template
  where template.template_scope = 'system'
    and template.slug = 'gift-certificate-v1'
    and template.status = 'active'
    and template.is_active = true
  order by template.created_at
  limit 1;

  if v_template_id is null then
    raise exception using
      errcode = '55000',
      message = 'PGC3B_TEMPLATE_NOT_AVAILABLE';
  end if;

  v_provider_organization_id := v_value_object.organization_id;

  if v_provider_organization_id is null then
    select profile.profile_kind
    into v_provider_type
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.owner_user_id = p_owner_user_id
      and profile.actor_id = p_manager_actor_id;

    if v_provider_type is null then
      raise exception using
        errcode = '42501',
        message = 'PGC3B_PRIVATE_PROVIDER_NOT_AVAILABLE';
    end if;

    v_provider_actor_id := p_manager_actor_id;
  else
    select actor.id
    into v_provider_actor_id
    from public.organizations organization
    join public.actors actor
      on actor.organization_id = organization.id
     and actor.actor_type = 'organization'
     and actor.status = 'active'
    where organization.id = v_provider_organization_id
      and organization.owner_actor_id = p_manager_actor_id
      and organization.status = 'active'
    order by actor.created_at
    limit 1;

    if v_provider_actor_id is null then
      raise exception using
        errcode = '42501',
        message = 'PGC3B_ORGANIZATION_PROVIDER_NOT_AVAILABLE';
    end if;

    v_provider_type := 'organization';
  end if;

  if v_value_object.object_kind = 'product_type' then
    if p_delivery_mode not in ('product_pickup', 'product_delivery') then
      raise exception using
        errcode = '22023',
        message = 'PGC3B_PRODUCT_DELIVERY_MODE_INVALID';
    end if;

    v_activity_payload := jsonb_build_object(
      'activityRoleCode', 'planned',
      'title', 'Gift certificate: ' || v_value_object.title,
      'description', v_value_object.description,
      'status', 'draft',
      'source', 'manual_form',
      'privacyScope', 'public_masked',
      'temporalDirection', 'future',
      'scheduleModeCode', 'date_range',
      'scheduleStartDate', p_available_from,
      'scheduleEndDate', p_available_until,
      'createCalendarProjection', false,
      'metadata', jsonb_build_object(
        'giftCertificateContract', 'pgc3b-gift-certificate-activity-v1',
        'giftCertificateLifecycle', 'draft',
        'providerActorId', v_provider_actor_id,
        'providerOrganizationId', v_provider_organization_id,
        'valueObjectId', v_value_object.id,
        'deliveryMode', p_delivery_mode,
        'availableFrom', p_available_from,
        'availableUntil', p_available_until,
        'pointsCoverageMode', p_points_coverage_mode,
        'pointsCoveragePercent', p_points_coverage_percent,
        'pointsCoveredAmount', p_points_covered_amount,
        'referenceExchangeRate', p_reference_exchange_rate,
        'referenceExchangeRateSource',
          p_reference_exchange_rate_source,
        'referenceExchangeRateDate',
          p_reference_exchange_rate_date,
        'referenceExchangeRateFetchedAt',
          p_reference_exchange_rate_fetched_at,
        'referenceExchangeRateSourceUrl',
          p_reference_exchange_rate_source_url,
        'referenceExchangeRateIsFallback',
          p_reference_exchange_rate_is_fallback,
        'termsText', p_terms_text
      )
    );
  else
    if p_delivery_mode not in ('service_offline', 'service_online') then
      raise exception using
        errcode = '22023',
        message = 'PGC3B_SERVICE_DELIVERY_MODE_INVALID';
    end if;

    if p_started_at is null
       or p_ended_at is null
       or p_ended_at <= p_started_at then
      raise exception using
        errcode = '22023',
        message = 'PGC3B_SERVICE_EXACT_TIME_REQUIRED';
    end if;

    v_activity_payload := jsonb_build_object(
      'activityRoleCode', 'planned',
      'title', 'Gift certificate: ' || v_value_object.title,
      'description', v_value_object.description,
      'status', 'draft',
      'source', 'manual_form',
      'privacyScope', 'public_masked',
      'temporalDirection', 'future',
      'scheduleModeCode', 'exact',
      'startedAt', p_started_at,
      'endedAt', p_ended_at,
      'durationMinutes',
        floor(extract(epoch from (p_ended_at - p_started_at)) / 60)::integer,
      'createCalendarProjection', false,
      'metadata', jsonb_build_object(
        'giftCertificateContract', 'pgc3b-gift-certificate-activity-v1',
        'giftCertificateLifecycle', 'draft',
        'providerActorId', v_provider_actor_id,
        'providerOrganizationId', v_provider_organization_id,
        'valueObjectId', v_value_object.id,
        'deliveryMode', p_delivery_mode,
        'availableFrom', p_available_from,
        'availableUntil', p_available_until,
        'pointsCoverageMode', p_points_coverage_mode,
        'pointsCoveragePercent', p_points_coverage_percent,
        'pointsCoveredAmount', p_points_covered_amount,
        'referenceExchangeRate', p_reference_exchange_rate,
        'referenceExchangeRateSource',
          p_reference_exchange_rate_source,
        'referenceExchangeRateDate',
          p_reference_exchange_rate_date,
        'referenceExchangeRateFetchedAt',
          p_reference_exchange_rate_fetched_at,
        'referenceExchangeRateSourceUrl',
          p_reference_exchange_rate_source_url,
        'referenceExchangeRateIsFallback',
          p_reference_exchange_rate_is_fallback,
        'termsText', p_terms_text
      )
    );
  end if;

  v_create_result := public.create_activity_event_pp1_v1(
    p_owner_user_id,
    p_manager_actor_id,
    'gift-certificate:' || btrim(p_idempotency_key),
    v_activity_payload,
    array[p_value_object_id]::uuid[]
  );

  v_activity_event_id :=
    nullif(v_create_result -> 'activityEvent' ->> 'id', '')::uuid;

  if v_activity_event_id is null then
    raise exception using
      errcode = '55000',
      message = 'PGC3B_ACTIVITY_CREATE_FAILED';
  end if;

  update public.activity_events
  set
    activity_template_id = v_template_id,
    metadata_json = coalesce(metadata_json, '{}'::jsonb)
      || jsonb_build_object(
        'giftCertificateContract', 'pgc3b-gift-certificate-activity-v1',
        'giftCertificateLifecycle', 'draft',
        'providerActorId', v_provider_actor_id,
        'providerOrganizationId', v_provider_organization_id,
        'valueObjectId', v_value_object.id
      ),
    updated_at = clock_timestamp()
  where id = v_activity_event_id
    and activity_role_code = 'planned'
  returning *
  into v_activity;

  if v_activity.id is null then
    raise exception using
      errcode = '55000',
      message = 'PGC3B_ACTIVITY_TEMPLATE_ASSIGNMENT_FAILED';
  end if;

  insert into public.activity_gift_certificate_terms (
    activity_event_id,
    value_object_id,
    provider_owner_user_id,
    provider_manager_actor_id,
    provider_actor_id,
    provider_organization_id,
    provider_type,
    delivery_mode,
    lifecycle_status,
    available_from,
    available_until,
    regular_price_snapshot,
    provider_currency,
    points_coverage_mode,
    points_coverage_percent,
    requested_points_covered_amount,
    provider_currency_covered_amount,
    money_remainder_provider_currency,
    points_currency_code,
    reference_currency,
    reference_value_per_point,
    reference_exchange_rate,
    reference_exchange_rate_source,
    reference_exchange_rate_date,
    reference_exchange_rate_fetched_at,
    reference_exchange_rate_source_url,
    reference_exchange_rate_is_fallback,
    points_price,
    terms_text
  )
  values (
    v_activity_event_id,
    v_value_object.id,
    p_owner_user_id,
    p_manager_actor_id,
    v_provider_actor_id,
    v_provider_organization_id,
    v_provider_type,
    p_delivery_mode,
    'draft',
    p_available_from,
    p_available_until,
    0,
    'EUR',
    coalesce(nullif(btrim(p_points_coverage_mode), ''), 'percentage'),
    p_points_coverage_percent,
    p_points_covered_amount,
    0,
    0,
    'POINT',
    'EUR',
    1,
    p_reference_exchange_rate,
    nullif(btrim(coalesce(
      p_reference_exchange_rate_source,
      ''
    )), ''),
    p_reference_exchange_rate_date,
    p_reference_exchange_rate_fetched_at,
    nullif(btrim(coalesce(
      p_reference_exchange_rate_source_url,
      ''
    )), ''),
    coalesce(p_reference_exchange_rate_is_fallback, false),
    0,
    nullif(btrim(coalesce(p_terms_text, '')), '')
  )
  on conflict (activity_event_id)
  do nothing
  returning *
  into v_terms;

  if v_terms.activity_event_id is null then
    select *
    into v_terms
    from public.activity_gift_certificate_terms terms
    where terms.activity_event_id = v_activity_event_id;
  end if;

  if v_terms.activity_event_id is null
     or v_terms.value_object_id is distinct from p_value_object_id
     or v_terms.provider_owner_user_id is distinct from p_owner_user_id
     or v_terms.provider_manager_actor_id is distinct from p_manager_actor_id then
    raise exception using
      errcode = '23505',
      message = 'PGC3B_IDEMPOTENCY_CONFLICT';
  end if;

  return jsonb_build_object(
    'ok', true,
    'disposition', coalesce(v_create_result ->> 'disposition', 'created'),
    'activityEvent', to_jsonb(v_activity),
    'giftCertificateTerms', to_jsonb(v_terms),
    'plannedTargetValueObjectIds',
      v_create_result -> 'plannedTargetValueObjectIds'
  );
end;
$function$;



revoke all on function
  public.create_gift_certificate_activity_draft_v1(
  uuid,
  uuid,
  uuid,
  text,
  text,
  date,
  date,
  text,
  numeric,
  numeric,
  numeric,
  text,
  date,
  timestamptz,
  text,
  boolean,
  text,
  timestamptz,
  timestamptz
)
from public, anon, authenticated;

grant execute on function
  public.create_gift_certificate_activity_draft_v1(
  uuid,
  uuid,
  uuid,
  text,
  text,
  date,
  date,
  text,
  numeric,
  numeric,
  numeric,
  text,
  date,
  timestamptz,
  text,
  boolean,
  text,
  timestamptz,
  timestamptz
)
to service_role;

revoke all on function
  public.enforce_activity_gift_certificate_terms_v1()
from public, anon, authenticated;

grant execute on function
  public.enforce_activity_gift_certificate_terms_v1()
to service_role;

-- Rebuild the public JSON snapshot once with the new FX metadata.
update public.activity_gift_certificate_terms
set updated_at = updated_at;

comment on table
  public.exchange_rate_reference_snapshots
is
  'Server-only cache of official EUR reference rates. It is used only as a bounded fallback source; certificate rows store their own immutable snapshot.';

comment on column
  public.activity_gift_certificate_terms.reference_exchange_rate_source
is
  'Immutable source code of the FX snapshot used to calculate POINTS.';

comment on column
  public.activity_gift_certificate_terms.reference_exchange_rate_date
is
  'Official reference date of the FX snapshot.';

comment on column
  public.activity_gift_certificate_terms.reference_exchange_rate_fetched_at
is
  'Time when ARCTor obtained the official snapshot.';

comment on column
  public.activity_gift_certificate_terms.reference_exchange_rate_source_url
is
  'Official source URL or the explicit EUR identity URN.';

comment on column
  public.activity_gift_certificate_terms.reference_exchange_rate_is_fallback
is
  'True only when a recent saved official ECB snapshot was used because the live request failed.';

commit;
