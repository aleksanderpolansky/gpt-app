-- ARCTor GCR6F: hide/show visibility support for available gift-certificate activities.
-- User-facing "hidden" reuses the internal draft lifecycle; no new domain entity/state is added.

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
      message = 'GCR6F_HIDE_CONTEXT_REQUIRED';
  end if;

  select *
  into v_terms
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'GCR6F_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms.provider_owner_user_id is distinct from p_owner_user_id
     or v_terms.provider_manager_actor_id is distinct from p_manager_actor_id then
    raise exception using
      errcode = '42501',
      message = 'GCR6F_CERTIFICATE_OWNER_MISMATCH';
  end if;

  select *
  into v_activity
  from public.activity_events activity
  where activity.id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'GCR6F_ACTIVITY_NOT_FOUND';
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
      message = 'GCR6F_ACTIVITY_OWNER_OR_TEMPLATE_INVALID';
  end if;

  -- Idempotent replay for an already hidden offer.
  if v_terms.lifecycle_status = 'draft' then
    if v_activity.status is distinct from 'draft'
       or v_terms.published_at is not null
       or v_terms.recipient_user_id is not null
       or v_terms.recipient_actor_id is not null
       or v_terms.ordered_at is not null then
      raise exception using
        errcode = '23514',
        message = 'GCR6F_HIDDEN_STATE_INCONSISTENT';
    end if;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'activityEventId', v_terms.activity_event_id,
      'lifecycleStatus', v_terms.lifecycle_status,
      'activityStatus', v_activity.status,
      'hiddenAt', v_activity.metadata_json ->> 'giftCertificateHiddenAt'
    );
  end if;

  if v_terms.lifecycle_status is distinct from 'available'
     or v_activity.status is distinct from 'planned' then
    raise exception using
      errcode = '23514',
      message = 'GCR6F_ONLY_AVAILABLE_CAN_BE_HIDDEN';
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
      message = 'GCR6F_RECIPIENT_ALREADY_ASSIGNED';
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
    published_at = null,
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
    'hiddenAt', v_now
  );
end;
$function$;

revoke all on function public.hide_gift_certificate_activity_v1(uuid, uuid, uuid) from public;
revoke all on function public.hide_gift_certificate_activity_v1(uuid, uuid, uuid) from anon;
revoke all on function public.hide_gift_certificate_activity_v1(uuid, uuid, uuid) from authenticated;
grant execute on function public.hide_gift_certificate_activity_v1(uuid, uuid, uuid) to service_role;

comment on function public.hide_gift_certificate_activity_v1(uuid, uuid, uuid) is
  'Atomically hides an unowned available gift-certificate activity by returning it to the internal draft state. The same activity can later be made available again through publish_gift_certificate_activity_v1.';
