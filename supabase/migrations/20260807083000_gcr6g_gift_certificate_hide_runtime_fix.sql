-- ARCTor GCR6G: runtime correction for Hide / Show superoffer.
-- Keeps first published_at immutable while reusing draft/planned as the internal hidden/visible states.
-- No table shape changes.

begin;

create or replace function public.hide_gift_certificate_activity_v1(
  p_owner_user_id uuid,
  p_manager_actor_id uuid,
  p_activity_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_terms public.activity_gift_certificate_terms%rowtype;
  v_activity public.activity_events%rowtype;
  v_template_slug text;
  v_now timestamptz := clock_timestamp();
begin
  if p_owner_user_id is null
     or p_manager_actor_id is null
     or p_activity_event_id is null then
    raise exception using
      errcode = '22023',
      message = 'GCR6G_HIDE_CONTEXT_REQUIRED';
  end if;

  select *
  into v_terms
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'GCR6G_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms.provider_owner_user_id is distinct from p_owner_user_id
     or v_terms.provider_manager_actor_id is distinct from p_manager_actor_id then
    raise exception using
      errcode = '42501',
      message = 'GCR6G_CERTIFICATE_OWNER_MISMATCH';
  end if;

  select *
  into v_activity
  from public.activity_events activity
  where activity.id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'GCR6G_ACTIVITY_NOT_FOUND';
  end if;

  select template.slug
  into v_template_slug
  from public.activity_templates template
  where template.id = v_activity.activity_template_id;

  if v_activity.user_id is distinct from p_owner_user_id
     or v_activity.acting_as_actor_id is distinct from p_manager_actor_id
     or v_activity.activity_role_code is distinct from 'planned'
     or v_template_slug is distinct from 'gift-certificate-v1' then
    raise exception using
      errcode = '42501',
      message = 'GCR6G_ACTIVITY_OWNER_OR_TEMPLATE_INVALID';
  end if;

  if v_terms.lifecycle_status = 'draft' then
    if v_activity.status is distinct from 'draft'
       or v_terms.published_at is null
       or v_terms.recipient_user_id is not null
       or v_terms.recipient_actor_id is not null
       or v_terms.ordered_at is not null then
      raise exception using
        errcode = '23514',
        message = 'GCR6G_HIDDEN_STATE_INCONSISTENT';
    end if;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'activityEventId', v_terms.activity_event_id,
      'lifecycleStatus', v_terms.lifecycle_status,
      'activityStatus', v_activity.status,
      'publishedAt', v_terms.published_at,
      'hiddenAt', v_activity.metadata_json ->> 'giftCertificateHiddenAt'
    );
  end if;

  if v_terms.lifecycle_status is distinct from 'available'
     or v_activity.status is distinct from 'planned' then
    raise exception using
      errcode = '23514',
      message = 'GCR6G_ONLY_AVAILABLE_CAN_BE_HIDDEN';
  end if;

  if v_terms.published_at is null then
    raise exception using
      errcode = '23514',
      message = 'GCR6G_AVAILABLE_WITHOUT_FIRST_PUBLICATION';
  end if;

  if v_terms.recipient_user_id is not null
     or v_terms.recipient_actor_id is not null
     or v_terms.ordered_at is not null
     or v_terms.public_code is not null
     or v_terms.qr_token_hash is not null
     or v_terms.redeemed_at is not null
     or v_terms.expired_at is not null
     or v_terms.annulled_at is not null then
    raise exception using
      errcode = '23514',
      message = 'GCR6G_RECIPIENT_ALREADY_ASSIGNED';
  end if;

  update public.activity_events
  set
    status = 'draft',
    metadata_json = coalesce(metadata_json, '{}'::jsonb)
      || jsonb_build_object(
        'giftCertificateLifecycle', 'hidden',
        'giftCertificateHiddenAt', v_now
      ),
    updated_at = v_now
  where id = v_activity.id
  returning * into v_activity;

  update public.activity_gift_certificate_terms
  set
    lifecycle_status = 'draft',
    updated_at = v_now
  where activity_event_id = v_terms.activity_event_id
  returning * into v_terms;

  return jsonb_build_object(
    'ok', true,
    'disposition', 'hidden',
    'activityEventId', v_terms.activity_event_id,
    'providerActorId', v_terms.provider_actor_id,
    'lifecycleStatus', v_terms.lifecycle_status,
    'activityStatus', v_activity.status,
    'publishedAt', v_terms.published_at,
    'hiddenAt', v_now
  );
end;
$function$;

revoke all on function public.hide_gift_certificate_activity_v1(uuid, uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.hide_gift_certificate_activity_v1(uuid, uuid, uuid)
to service_role;

comment on function public.hide_gift_certificate_activity_v1(uuid, uuid, uuid) is
  'Hides an available unowned gift-certificate offer without clearing immutable first published_at. Repeated hide is idempotent for an already published hidden offer.';

create or replace function public.publish_gift_certificate_activity_v1(
  p_owner_user_id uuid,
  p_manager_actor_id uuid,
  p_activity_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_terms public.activity_gift_certificate_terms%rowtype;
  v_activity public.activity_events%rowtype;
  v_template_slug text;
  v_overlap_count integer;
  v_owner_limit integer;
  v_now timestamptz := clock_timestamp();
  v_first_published_at timestamptz;
  v_is_reshow boolean;
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

  if v_terms.provider_owner_user_id is distinct from p_owner_user_id
     or v_terms.provider_manager_actor_id is distinct from p_manager_actor_id then
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
     or v_activity.acting_as_actor_id is distinct from p_manager_actor_id
     or v_activity.activity_role_code is distinct from 'planned'
     or v_template_slug is distinct from 'gift-certificate-v1' then
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
      'activityStatus', v_activity.status,
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

  v_is_reshow := v_terms.published_at is not null;
  v_first_published_at := coalesce(v_terms.published_at, v_now);

  if v_terms.recipient_user_id is not null
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
    metadata_json = (
      coalesce(metadata_json, '{}'::jsonb) - 'giftCertificateHiddenAt'
    ) || jsonb_build_object(
      'giftCertificateLifecycle', 'available',
      'giftCertificatePublishedAt', v_first_published_at,
      'giftCertificateShownAt', v_now
    ),
    updated_at = v_now
  where id = v_activity.id
  returning * into v_activity;

  update public.activity_gift_certificate_terms
  set
    lifecycle_status = 'available',
    published_at = v_first_published_at
  where activity_event_id = v_terms.activity_event_id
  returning * into v_terms;

  return jsonb_build_object(
    'ok', true,
    'disposition', case when v_is_reshow then 'shown' else 'published' end,
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

revoke all on function public.publish_gift_certificate_activity_v1(uuid, uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.publish_gift_certificate_activity_v1(uuid, uuid, uuid)
to service_role;

comment on function public.publish_gift_certificate_activity_v1(uuid, uuid, uuid) is
  'Publishes a first-time draft or shows a previously published hidden gift-certificate offer while preserving immutable first published_at and owner-level availability quota.';

commit;
