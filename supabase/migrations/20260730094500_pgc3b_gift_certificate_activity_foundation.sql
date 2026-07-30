begin;

-- PGC3B: a gift certificate is a planned activity_event with one-to-one
-- commercial terms. The legacy offers/certificates tables are not used.

insert into public.activity_templates (
  slug,
  title,
  short_title,
  description,
  template_group,
  template_scope,
  visibility,
  source_type,
  status,
  default_duration_minutes,
  quick_duration_minutes,
  default_status,
  default_source_type,
  default_privacy_scope,
  icon_key,
  color_key,
  show_in_quick_capture,
  show_in_onboarding,
  allow_manual_duration,
  allow_comment,
  allow_started_at_override,
  allow_ended_at_override,
  input_schema_json,
  ui_schema_json,
  default_metadata_json,
  sort_order,
  is_active
)
select
  'gift-certificate-v1',
  'Gift certificate',
  'Gift certificate',
  'A planned activity that represents a public gift certificate for one product or service leaf.',
  'commerce',
  'system',
  'public_template',
  'system_seed',
  'active',
  null,
  '{}'::integer[],
  'draft',
  'manual_form',
  'public_masked',
  'gift',
  'violet',
  false,
  false,
  true,
  true,
  true,
  true,
  jsonb_build_object(
    'contract', 'pgc3b-gift-certificate-activity-v1',
    'valueObjectKinds', jsonb_build_array('product_type', 'service_type'),
    'deliveryModes', jsonb_build_array(
      'product_pickup',
      'product_delivery',
      'service_offline',
      'service_online'
    ),
    'coverageModes', jsonb_build_array(
      'percentage',
      'provider_currency_amount'
    ),
    'exchangeRateConvention', 'provider_currency_per_EUR'
  ),
  jsonb_build_object(
    'authoringRoute', '/value-objects/[id]/gift-certificates/new',
    'catalogRoute', '/offers'
  ),
  jsonb_build_object(
    'giftCertificateContract', 'pgc3b-gift-certificate-activity-v1',
    'canonicalEntity', 'activity_events',
    'exchangeRateConvention', 'provider_currency_per_EUR'
  ),
  40,
  true
where not exists (
  select 1
  from public.activity_templates template
  where template.template_scope = 'system'
    and template.owner_user_id is null
    and template.organization_id is null
    and template.slug = 'gift-certificate-v1'
);

update public.activity_templates
set
  title = 'Gift certificate',
  short_title = 'Gift certificate',
  description = 'A planned activity that represents a public gift certificate for one product or service leaf.',
  template_group = 'commerce',
  visibility = 'public_template',
  source_type = 'system_seed',
  status = 'active',
  default_status = 'draft',
  default_source_type = 'manual_form',
  default_privacy_scope = 'public_masked',
  show_in_quick_capture = false,
  show_in_onboarding = false,
  allow_manual_duration = true,
  allow_comment = true,
  allow_started_at_override = true,
  allow_ended_at_override = true,
  input_schema_json = jsonb_build_object(
    'contract', 'pgc3b-gift-certificate-activity-v1',
    'valueObjectKinds', jsonb_build_array('product_type', 'service_type'),
    'deliveryModes', jsonb_build_array(
      'product_pickup',
      'product_delivery',
      'service_offline',
      'service_online'
    ),
    'coverageModes', jsonb_build_array(
      'percentage',
      'provider_currency_amount'
    ),
    'exchangeRateConvention', 'provider_currency_per_EUR'
  ),
  ui_schema_json = jsonb_build_object(
    'authoringRoute', '/value-objects/[id]/gift-certificates/new',
    'catalogRoute', '/offers'
  ),
  default_metadata_json = jsonb_build_object(
    'giftCertificateContract', 'pgc3b-gift-certificate-activity-v1',
    'canonicalEntity', 'activity_events',
    'exchangeRateConvention', 'provider_currency_per_EUR'
  ),
  sort_order = 40,
  is_active = true,
  updated_at = clock_timestamp()
where template_scope = 'system'
  and owner_user_id is null
  and organization_id is null
  and slug = 'gift-certificate-v1';

create table if not exists public.activity_gift_certificate_terms (
  activity_event_id uuid primary key
    references public.activity_events(id) on delete cascade,
  value_object_id uuid not null
    references public.value_objects(id) on delete restrict,

  provider_owner_user_id uuid not null
    references public.app_users(id) on delete restrict,
  provider_manager_actor_id uuid not null
    references public.actors(id) on delete restrict,
  provider_actor_id uuid not null
    references public.actors(id) on delete restrict,
  provider_organization_id uuid null
    references public.organizations(id) on delete restrict,
  provider_type text not null,

  delivery_mode text not null,
  lifecycle_status text not null default 'draft',

  available_from date not null,
  available_until date not null,

  regular_price_snapshot numeric(18,2) not null,
  provider_currency text not null,

  points_coverage_mode text not null default 'percentage',
  points_coverage_percent numeric(7,4) null,
  requested_points_covered_amount numeric(18,2) null,

  provider_currency_covered_amount numeric(18,2) not null,
  money_remainder_provider_currency numeric(18,2) not null,

  points_currency_code text not null default 'POINT',
  reference_currency text not null default 'EUR',
  reference_value_per_point numeric(18,6) not null default 1,
  reference_exchange_rate numeric(18,8) not null,
  points_price numeric(18,2) not null,

  terms_text text null,
  public_snapshot_json jsonb not null default '{}'::jsonb,

  recipient_user_id uuid null
    references public.app_users(id) on delete restrict,
  recipient_actor_id uuid null
    references public.actors(id) on delete restrict,

  public_code text null,
  qr_token_hash text null,

  ordered_at timestamptz null,
  redeemed_at timestamptz null,
  expired_at timestamptz null,
  annulled_at timestamptz null,
  archived_at timestamptz null,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint activity_gift_certificate_provider_type_check
    check (provider_type in ('personal', 'avatar', 'organization')),

  constraint activity_gift_certificate_delivery_mode_check
    check (
      delivery_mode in (
        'product_pickup',
        'product_delivery',
        'service_offline',
        'service_online'
      )
    ),

  constraint activity_gift_certificate_lifecycle_check
    check (
      lifecycle_status in (
        'draft',
        'available',
        'active',
        'redeemed',
        'expired',
        'annulled',
        'archived'
      )
    ),

  constraint activity_gift_certificate_validity_order_check
    check (available_until >= available_from),

  constraint activity_gift_certificate_validity_max_31_days_check
    check ((available_until - available_from) between 0 and 31),

  constraint activity_gift_certificate_price_nonnegative_check
    check (regular_price_snapshot >= 0),

  constraint activity_gift_certificate_currency_format_check
    check (provider_currency ~ '^[A-Z]{3}$'),

  constraint activity_gift_certificate_coverage_mode_check
    check (
      points_coverage_mode in (
        'percentage',
        'provider_currency_amount'
      )
    ),

  constraint activity_gift_certificate_percentage_range_check
    check (
      points_coverage_percent is null
      or (
        points_coverage_percent >= 0
        and points_coverage_percent <= 100
      )
    ),

  constraint activity_gift_certificate_requested_amount_nonnegative_check
    check (
      requested_points_covered_amount is null
      or requested_points_covered_amount >= 0
    ),

  constraint activity_gift_certificate_covered_amount_range_check
    check (
      provider_currency_covered_amount >= 0
      and provider_currency_covered_amount <= regular_price_snapshot
    ),

  constraint activity_gift_certificate_remainder_nonnegative_check
    check (money_remainder_provider_currency >= 0),

  constraint activity_gift_certificate_financial_balance_check
    check (
      round(
        provider_currency_covered_amount
        + money_remainder_provider_currency,
        2
      ) = regular_price_snapshot
    ),

  constraint activity_gift_certificate_reference_currency_check
    check (reference_currency = 'EUR'),

  constraint activity_gift_certificate_point_value_check
    check (reference_value_per_point = 1),

  constraint activity_gift_certificate_exchange_rate_positive_check
    check (reference_exchange_rate > 0),

  constraint activity_gift_certificate_points_price_nonnegative_check
    check (points_price >= 0),

  constraint activity_gift_certificate_public_snapshot_object_check
    check (jsonb_typeof(public_snapshot_json) = 'object'),

  constraint activity_gift_certificate_recipient_pair_check
    check (
      (recipient_user_id is null and recipient_actor_id is null)
      or
      (recipient_user_id is not null and recipient_actor_id is not null)
    ),

  constraint activity_gift_certificate_active_requires_recipient_check
    check (
      lifecycle_status not in ('active', 'redeemed', 'expired', 'annulled')
      or
      (recipient_user_id is not null and recipient_actor_id is not null)
    ),

  constraint activity_gift_certificate_organization_shape_check
    check (
      (provider_type = 'organization' and provider_organization_id is not null)
      or
      (provider_type <> 'organization' and provider_organization_id is null)
    )
);

create index if not exists
  activity_gift_certificate_terms_value_object_idx
on public.activity_gift_certificate_terms (
  value_object_id,
  lifecycle_status,
  created_at desc
);

create index if not exists
  activity_gift_certificate_terms_provider_status_idx
on public.activity_gift_certificate_terms (
  provider_actor_id,
  lifecycle_status,
  available_from,
  available_until
);

create index if not exists
  activity_gift_certificate_terms_recipient_status_idx
on public.activity_gift_certificate_terms (
  recipient_user_id,
  provider_actor_id,
  lifecycle_status,
  ordered_at desc
)
where recipient_user_id is not null;

create unique index if not exists
  activity_gift_certificate_terms_public_code_uidx
on public.activity_gift_certificate_terms (public_code)
where public_code is not null;

create unique index if not exists
  activity_gift_certificate_one_active_per_user_provider_uidx
on public.activity_gift_certificate_terms (
  recipient_user_id,
  provider_actor_id
)
where lifecycle_status = 'active'
  and recipient_user_id is not null;

alter table public.activity_gift_certificate_terms enable row level security;

drop policy if exists
  activity_gift_certificate_terms_service_role_all
on public.activity_gift_certificate_terms;

create policy
  activity_gift_certificate_terms_service_role_all
on public.activity_gift_certificate_terms
for all
to service_role
using (true)
with check (true);

create or replace function public.set_activity_gift_certificate_updated_at_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

drop trigger if exists
  activity_gift_certificate_terms_updated_at_trg
on public.activity_gift_certificate_terms;

create trigger activity_gift_certificate_terms_updated_at_trg
before update on public.activity_gift_certificate_terms
for each row
execute function public.set_activity_gift_certificate_updated_at_v1();

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
  else
    v_exchange_rate := new.reference_exchange_rate;

    if v_exchange_rate is null or v_exchange_rate <= 0 then
      raise exception using
        errcode = '22023',
        message = 'PGC3B_REFERENCE_EXCHANGE_RATE_REQUIRED';
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
    'exchangeRateConvention', 'provider_currency_per_EUR',
    'terms', new.terms_text
  );

  return new;
end;
$function$;

drop trigger if exists
  activity_gift_certificate_terms_contract_trg
on public.activity_gift_certificate_terms;

create trigger activity_gift_certificate_terms_contract_trg
before insert or update on public.activity_gift_certificate_terms
for each row
execute function public.enforce_activity_gift_certificate_terms_v1();

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

revoke all on table public.activity_gift_certificate_terms
from public, anon, authenticated;

grant all on table public.activity_gift_certificate_terms
to service_role;

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

revoke all on function
  public.set_activity_gift_certificate_updated_at_v1()
from public, anon, authenticated;

grant execute on function
  public.set_activity_gift_certificate_updated_at_v1()
to service_role;

commit;
