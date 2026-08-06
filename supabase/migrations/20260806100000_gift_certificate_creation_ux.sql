-- ARCTor.app
-- Gift-certificate creation UX: individual visit agreement + exact-slot option.
-- Generated for main @ 288d9451e87d89c89e0b39dd84aa1deb2ad770a9.

begin;

do $preflight$
begin
  if to_regprocedure(
    'public.create_gift_certificate_activity_draft_v1(uuid,uuid,uuid,text,text,date,date,text,numeric,numeric,numeric,text,date,timestamp with time zone,text,boolean,text,timestamp with time zone,timestamp with time zone)'
  ) is null then
    raise exception using
      errcode = '42883',
      message = 'GCR6C_GIFT_CERTIFICATE_DRAFT_RPC_MISSING';
  end if;

  if to_regclass('public.activity_events') is null
     or to_regclass('public.activity_gift_certificate_terms') is null then
    raise exception using
      errcode = '42P01',
      message = 'GCR6C_GIFT_CERTIFICATE_TABLES_MISSING';
  end if;
end;
$preflight$;

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

    if (p_started_at is null) <> (p_ended_at is null) then
      raise exception using
        errcode = '22023',
        message = 'GCR6C_SERVICE_TIME_MODE_INCOMPLETE';
    end if;

    if p_started_at is not null
       and p_ended_at <= p_started_at then
      raise exception using
        errcode = '22023',
        message = 'GCR6C_SERVICE_EXACT_TIME_INVALID';
    end if;

    if p_started_at is null then
      v_activity_payload := jsonb_build_object(
        'activityRoleCode', 'planned',
        'title', 'Gift certificate: ' || v_value_object.title,
        'description', v_value_object.description,
        'status', 'draft',
        'source', 'manual_form',
        'privacyScope', 'public_masked',
        'temporalDirection', 'future',
        'scheduleModeCode', 'unscheduled',
        'createCalendarProjection', false,
        'metadata', jsonb_build_object(
          'giftCertificateContract', 'pgc3b-gift-certificate-activity-v1',
          'giftCertificateLifecycle', 'draft',
          'serviceTimeAgreement', 'individual',
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
          'serviceTimeAgreement', 'exact',
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

comment on function
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
is
  'Creates an activity-based gift-certificate draft. Service time may be individually agreed (unscheduled) or stored as one exact interval; financial and FX snapshot rules remain unchanged.';

commit;
