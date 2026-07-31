-- ARCTor.app — PGC10F
-- Buyer confirmation and 24-hour automatic certificate finalization.
--
-- Simplified accepted rule:
-- - the exact planned service time is informative and does not block use;
-- - after a valid check-in the buyer may answer immediately;
-- - the 24-hour no-response period starts at check-in;
-- - buyer confirmation or automatic confirmation finalizes the certificate;
-- - successful finalization closes the certificate but creates no actual
--   activities yet;
-- - future actual activities are explicitly deferred for both sides:
--   provider/enterprise and recipient/buyer;
-- - dispute and partial/problem states do not redeem the certificate;
-- - no new POINTS or reputation operation is performed.

begin;

create or replace function
public.register_gift_certificate_fulfillment_checkin_v1(
  p_provider_owner_user_id uuid,
  p_provider_manager_actor_id uuid,
  p_qr_session_id uuid,
  p_token_hash text,
  p_token_version text default 'sha256-v1'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_session public.activity_fulfillment_qr_sessions%rowtype;
  v_terms public.activity_gift_certificate_terms%rowtype;
  v_activity public.activity_events%rowtype;
  v_policy public.activity_fulfillment_policies%rowtype;
  v_checkin public.activity_fulfillment_checkins%rowtype;
  v_confirmation public.activity_fulfillment_confirmations%rowtype;
  v_token_hash text;
  v_token_version text;
  v_now timestamptz := clock_timestamp();
  v_request_due_at timestamptz;
begin
  if p_provider_owner_user_id is null
     or p_provider_manager_actor_id is null
     or p_qr_session_id is null then
    raise exception using
      errcode = '22023',
      message = 'PGC10D_CHECKIN_CONTEXT_REQUIRED';
  end if;

  v_token_hash :=
    lower(nullif(btrim(coalesce(p_token_hash, '')), ''));
  v_token_version :=
    lower(nullif(btrim(coalesce(p_token_version, '')), ''));

  if v_token_hash is null
     or v_token_hash !~ '^[a-f0-9]{64}$'
     or v_token_version is distinct from 'sha256-v1' then
    raise exception using
      errcode = '42501',
      message = 'PGC10D_QR_TOKEN_INVALID';
  end if;

  select *
  into v_session
  from public.activity_fulfillment_qr_sessions session
  where session.id = p_qr_session_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC10D_QR_SESSION_NOT_FOUND';
  end if;

  if v_session.token_hash is distinct from v_token_hash
     or v_session.token_version is distinct from v_token_version then
    raise exception using
      errcode = '42501',
      message = 'PGC10D_QR_TOKEN_INVALID';
  end if;

  select *
  into v_terms
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = v_session.planned_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC10D_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms.provider_owner_user_id
       is distinct from p_provider_owner_user_id then
    raise exception using
      errcode = '42501',
      message = 'PGC10D_PROVIDER_OWNER_NOT_AUTHORIZED';
  end if;

  if v_terms.provider_manager_actor_id
       is distinct from p_provider_manager_actor_id then
    raise exception using
      errcode = '42501',
      message = 'PGC10D_PROVIDER_MANAGER_NOT_AUTHORIZED';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.owner_user_id = p_provider_owner_user_id
      and profile.actor_id = p_provider_manager_actor_id
      and profile.profile_kind in ('personal', 'avatar')
  ) then
    raise exception using
      errcode = '42501',
      message = 'PGC10D_PROVIDER_CONTEXT_NOT_AVAILABLE';
  end if;

  if v_terms.lifecycle_status is distinct from 'active' then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_ONLY_ACTIVE_CERTIFICATE_CAN_CHECK_IN';
  end if;

  if current_date < v_terms.available_from then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_CERTIFICATE_NOT_YET_VALID';
  end if;

  if current_date > v_terms.available_until then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_CERTIFICATE_VALIDITY_ENDED';
  end if;

  if v_session.planned_activity_event_id
       is distinct from v_terms.activity_event_id
     or v_session.recipient_user_id
       is distinct from v_terms.recipient_user_id
     or v_session.recipient_actor_id
       is distinct from v_terms.recipient_actor_id
     or v_session.public_code_snapshot
       is distinct from v_terms.public_code then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_QR_CERTIFICATE_BINDING_INVALID';
  end if;

  if v_session.status = 'consumed' then
    select *
    into v_checkin
    from public.activity_fulfillment_checkins checkin
    where checkin.qr_session_id = v_session.id
      and checkin.status = 'registered';

    if not found
       or v_session.consumed_by_user_id
         is distinct from p_provider_owner_user_id
       or v_session.consumed_by_actor_id
         is distinct from p_provider_manager_actor_id then
      raise exception using
        errcode = '23514',
        message = 'PGC10D_CONSUMED_QR_STATE_INVALID';
    end if;

    select *
    into v_confirmation
    from public.activity_fulfillment_confirmations confirmation
    where confirmation.checkin_id = v_checkin.id;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'PGC10D_CONFIRMATION_STATE_INVALID';
    end if;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'activityEventId', v_terms.activity_event_id,
      'qrSessionId', v_session.id,
      'checkinId', v_checkin.id,
      'checkinStatus', v_checkin.status,
      'checkedInAt', v_checkin.checked_in_at,
      'confirmationId', v_confirmation.id,
      'confirmationStatus', v_confirmation.status,
      'requestDueAt', v_confirmation.request_due_at,
      'certificateLifecycleStatus', v_terms.lifecycle_status,
      'pointsChanged', false,
      'reputationChanged', false
    );
  end if;

  if v_session.status = 'revoked' then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_QR_REVOKED';
  end if;

  if v_session.status <> 'issued'
     or v_session.expires_at <= v_now then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_QR_EXPIRED';
  end if;

  if exists (
    select 1
    from public.activity_fulfillment_checkins existing
    where existing.planned_activity_event_id = v_terms.activity_event_id
      and existing.status = 'registered'
  ) then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_ALREADY_CHECKED_IN';
  end if;

  select *
  into v_activity
  from public.activity_events activity
  where activity.id = v_terms.activity_event_id
    and activity.activity_role_code = 'planned';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_PLANNED_ACTIVITY_NOT_AVAILABLE';
  end if;

  select policy.*
  into v_policy
  from public.activity_fulfillment_policies policy
  where policy.activity_template_id = v_activity.activity_template_id
    and policy.policy_code = 'gift-certificate-v1'
    and policy.status = 'active';

  if not found
     or v_policy.requires_checkin is distinct from true
     or v_policy.requires_buyer_confirmation is distinct from true then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_FULFILLMENT_POLICY_NOT_AVAILABLE';
  end if;

  -- The planned date is informative. Once a valid check-in exists,
  -- the buyer may confirm immediately, and the 24-hour silence period starts.
  v_request_due_at := v_now;

  insert into public.activity_fulfillment_checkins (
    planned_activity_event_id,
    actual_activity_event_id,
    qr_session_id,
    provider_owner_user_id,
    provider_actor_id,
    provider_organization_id,
    staff_user_id,
    staff_actor_id,
    recipient_user_id,
    recipient_actor_id,
    authorization_basis,
    authorization_role,
    status,
    checked_in_at,
    metadata_json,
    created_at,
    updated_at
  )
  values (
    v_terms.activity_event_id,
    null,
    v_session.id,
    p_provider_owner_user_id,
    v_terms.provider_actor_id,
    v_terms.provider_organization_id,
    p_provider_owner_user_id,
    p_provider_manager_actor_id,
    v_terms.recipient_user_id,
    v_terms.recipient_actor_id,
    'provider_owner',
    null,
    'registered',
    v_now,
    jsonb_build_object(
      'delegationMode', 'shared_provider_owner_session',
      'publicCode', v_terms.public_code
    ),
    v_now,
    v_now
  )
  returning *
  into v_checkin;

  insert into public.activity_fulfillment_confirmations (
    planned_activity_event_id,
    checkin_id,
    recipient_user_id,
    recipient_actor_id,
    status,
    request_due_at,
    requested_at,
    response_deadline_at,
    created_at,
    updated_at
  )
  values (
    v_terms.activity_event_id,
    v_checkin.id,
    v_terms.recipient_user_id,
    v_terms.recipient_actor_id,
    'pending',
    v_request_due_at,
    v_now,
    v_now + make_interval(
      mins => v_policy.auto_confirm_delay_minutes
    ),
    v_now,
    v_now
  )
  returning *
  into v_confirmation;

  update public.activity_fulfillment_qr_sessions
  set
    status = 'consumed',
    consumed_at = v_now,
    consumed_by_user_id = p_provider_owner_user_id,
    consumed_by_actor_id = p_provider_manager_actor_id,
    updated_at = v_now
  where id = v_session.id
    and status = 'issued';

  if not found then
    raise exception using
      errcode = '40001',
      message = 'PGC10D_QR_CONCURRENT_STATE_CHANGE';
  end if;

  insert into public.activity_fulfillment_event_log (
    planned_activity_event_id,
    qr_session_id,
    event_type,
    performed_by_user_id,
    performed_by_actor_id,
    occurred_at,
    metadata_json
  )
  values (
    v_terms.activity_event_id,
    v_session.id,
    'qr_consumed',
    p_provider_owner_user_id,
    p_provider_manager_actor_id,
    v_now,
    jsonb_build_object('authorizationBasis', 'provider_owner')
  );

  insert into public.activity_fulfillment_event_log (
    planned_activity_event_id,
    qr_session_id,
    checkin_id,
    confirmation_id,
    event_type,
    performed_by_user_id,
    performed_by_actor_id,
    occurred_at,
    metadata_json
  )
  values (
    v_terms.activity_event_id,
    v_session.id,
    v_checkin.id,
    v_confirmation.id,
    'checkin_registered',
    p_provider_owner_user_id,
    p_provider_manager_actor_id,
    v_now,
    jsonb_build_object(
      'authorizationBasis', 'provider_owner',
      'delegationMode', 'shared_provider_owner_session',
      'requestDueAt', v_request_due_at
    )
  );

  insert into public.activity_fulfillment_event_log (
    planned_activity_event_id,
    qr_session_id,
    checkin_id,
    confirmation_id,
    event_type,
    performed_by_user_id,
    performed_by_actor_id,
    occurred_at,
    metadata_json
  )
  values (
    v_terms.activity_event_id,
    v_session.id,
    v_checkin.id,
    v_confirmation.id,
    'completion_requested',
    p_provider_owner_user_id,
    p_provider_manager_actor_id,
    v_now,
    jsonb_build_object(
      'responseDeadlineAt',
        v_confirmation.response_deadline_at,
      'autoConfirmDelayMinutes',
        v_policy.auto_confirm_delay_minutes
    )
  );

  return jsonb_build_object(
    'ok', true,
    'disposition', 'registered',
    'activityEventId', v_terms.activity_event_id,
    'qrSessionId', v_session.id,
    'checkinId', v_checkin.id,
    'checkinStatus', v_checkin.status,
    'checkedInAt', v_checkin.checked_in_at,
    'confirmationId', v_confirmation.id,
    'confirmationStatus', v_confirmation.status,
    'requestDueAt', v_confirmation.request_due_at,
    'requestedAt', v_confirmation.requested_at,
    'responseDeadlineAt',
      v_confirmation.response_deadline_at,
    'autoConfirmDelayMinutes', v_policy.auto_confirm_delay_minutes,
    'certificateLifecycleStatus', v_terms.lifecycle_status,
    'pointsChanged', false,
    'reputationChanged', false
  );
end;
$function$;

create or replace function
public.finalize_gift_certificate_fulfillment_success_v1(
  p_confirmation_id uuid,
  p_method text,
  p_recipient_user_id uuid default null,
  p_recipient_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_confirmation public.activity_fulfillment_confirmations%rowtype;
  v_checkin public.activity_fulfillment_checkins%rowtype;
  v_terms public.activity_gift_certificate_terms%rowtype;
  v_plan public.activity_events%rowtype;
  v_now timestamptz := clock_timestamp();
  v_target_status text;
  v_event_type text;
begin
  if p_confirmation_id is null
     or p_method not in ('buyer', 'auto') then
    raise exception using
      errcode = '22023',
      message = 'PGC10F_FINALIZATION_INPUT_INVALID';
  end if;

  select *
  into v_confirmation
  from public.activity_fulfillment_confirmations confirmation
  where confirmation.id = p_confirmation_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC10F_CONFIRMATION_NOT_FOUND';
  end if;

  select *
  into v_checkin
  from public.activity_fulfillment_checkins checkin
  where checkin.id = v_confirmation.checkin_id
  for update;

  if not found
     or v_checkin.status is distinct from 'registered' then
    raise exception using
      errcode = '23514',
      message = 'PGC10F_REGISTERED_CHECKIN_REQUIRED';
  end if;

  select *
  into v_terms
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id =
    v_confirmation.planned_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC10F_CERTIFICATE_NOT_FOUND';
  end if;

  select *
  into v_plan
  from public.activity_events activity
  where activity.id = v_confirmation.planned_activity_event_id
    and activity.activity_role_code = 'planned'
  for update;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'PGC10F_PLANNED_ACTIVITY_NOT_FOUND';
  end if;

  if p_method = 'buyer' then
    if p_recipient_user_id is null
       or p_recipient_actor_id is null
       or v_confirmation.recipient_user_id
          is distinct from p_recipient_user_id
       or v_confirmation.recipient_actor_id
          is distinct from p_recipient_actor_id then
      raise exception using
        errcode = '42501',
        message = 'PGC10F_RECIPIENT_NOT_AUTHORIZED';
    end if;

    v_target_status := 'confirmed_by_buyer';
    v_event_type := 'buyer_confirmed';
  else
    v_target_status := 'auto_confirmed';
    v_event_type := 'auto_confirmed';
  end if;

  if v_confirmation.status in (
    'confirmed_by_buyer',
    'auto_confirmed'
  ) then
    if v_terms.lifecycle_status is distinct from 'redeemed' then
      raise exception using
        errcode = '23514',
        message = 'PGC10F_FINALIZED_STATE_INVALID';
    end if;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'status', v_confirmation.status,
      'checkedIn', true,
      'checkedInAt', v_checkin.checked_in_at,
      'requestedAt', v_confirmation.requested_at,
      'responseDeadlineAt',
        v_confirmation.response_deadline_at,
      'finalizedAt', v_confirmation.finalized_at,
      'actualActivityEventId', null,
      'actualActivitiesCreated', false,
      'actualActivitiesDeferred', true,
      'lifecycleStatus', v_terms.lifecycle_status,
      'pointsChanged', false,
      'reputationChanged', false
    );
  end if;

  if v_confirmation.status is distinct from 'pending' then
    raise exception using
      errcode = '23514',
      message = 'PGC10F_CONFIRMATION_ALREADY_FINALIZED';
  end if;

  if p_method = 'buyer' then
    update public.activity_fulfillment_confirmations
    set
      status = v_target_status,
      buyer_responded_at = v_now,
      buyer_response_actor_id = p_recipient_actor_id,
      auto_confirmed_at = null,
      finalized_at = v_now,
      updated_at = v_now
    where id = v_confirmation.id
      and status = 'pending'
    returning *
    into v_confirmation;
  else
    update public.activity_fulfillment_confirmations
    set
      status = v_target_status,
      auto_confirmed_at = v_now,
      finalized_at = v_now,
      updated_at = v_now
    where id = v_confirmation.id
      and status = 'pending'
    returning *
    into v_confirmation;
  end if;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'PGC10F_CONFIRMATION_CONCURRENT_STATE_CHANGE';
  end if;

  update public.activity_gift_certificate_terms
  set
    lifecycle_status = 'redeemed',
    redeemed_at = v_now,
    redeemed_by_user_id =
      case
        when p_method = 'buyer'
          then p_recipient_user_id
        else null
      end,
    redeemed_by_actor_id =
      case
        when p_method = 'buyer'
          then p_recipient_actor_id
        else null
      end,
    updated_at = v_now
  where activity_event_id = v_terms.activity_event_id
    and lifecycle_status = 'active'
  returning *
  into v_terms;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'PGC10F_CERTIFICATE_FINALIZATION_CONFLICT';
  end if;

  update public.activity_events
  set
    metadata_json =
      coalesce(metadata_json, '{}'::jsonb)
      || jsonb_build_object(
        'giftCertificateLifecycle', 'redeemed',
        'giftCertificateFulfillmentStatus',
          v_target_status,
        'giftCertificateFulfillmentFinalizedAt', v_now,
        'giftCertificateActualActivitiesCreated', false,
        'giftCertificateActualActivitiesDeferred', true,
        'giftCertificateFutureActivitySides',
          jsonb_build_array('provider', 'recipient')
      ),
    updated_at = v_now
  where id = v_plan.id;

  insert into public.activity_fulfillment_event_log (
    planned_activity_event_id,
    checkin_id,
    confirmation_id,
    event_type,
    performed_by_user_id,
    performed_by_actor_id,
    occurred_at,
    metadata_json
  )
  values (
    v_plan.id,
    v_checkin.id,
    v_confirmation.id,
    v_event_type,
    case
      when p_method = 'buyer'
        then p_recipient_user_id
      else null
    end,
    case
      when p_method = 'buyer'
        then p_recipient_actor_id
      else null
    end,
    v_now,
    jsonb_build_object(
      'method', p_method,
      'actualActivitiesCreated', false,
      'actualActivitiesDeferred', true,
      'futureActivitySides',
        jsonb_build_array('provider', 'recipient'),
      'pointsChanged', false,
      'reputationChanged', false
    )
  );

  return jsonb_build_object(
    'ok', true,
    'disposition', 'finalized',
    'status', v_confirmation.status,
    'checkedIn', true,
    'checkedInAt', v_checkin.checked_in_at,
    'requestedAt', v_confirmation.requested_at,
    'responseDeadlineAt',
      v_confirmation.response_deadline_at,
    'finalizedAt', v_confirmation.finalized_at,
    'actualActivityEventId', null,
    'actualActivitiesCreated', false,
    'actualActivitiesDeferred', true,
    'lifecycleStatus', v_terms.lifecycle_status,
    'pointsChanged', false,
    'reputationChanged', false
  );
end;
$function$;

create or replace function
public.get_gift_certificate_fulfillment_confirmation_v1(
  p_recipient_user_id uuid,
  p_recipient_actor_id uuid,
  p_activity_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_terms public.activity_gift_certificate_terms%rowtype;
  v_checkin public.activity_fulfillment_checkins%rowtype;
  v_confirmation public.activity_fulfillment_confirmations%rowtype;
  v_policy public.activity_fulfillment_policies%rowtype;
  v_plan public.activity_events%rowtype;
  v_now timestamptz := clock_timestamp();
  v_result jsonb;
begin
  if p_recipient_user_id is null
     or p_recipient_actor_id is null
     or p_activity_event_id is null then
    raise exception using
      errcode = '22023',
      message = 'PGC10F_RECIPIENT_CONTEXT_REQUIRED';
  end if;

  select *
  into v_terms
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = p_activity_event_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC10F_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms.recipient_user_id
       is distinct from p_recipient_user_id
     or v_terms.recipient_actor_id
       is distinct from p_recipient_actor_id then
    raise exception using
      errcode = '42501',
      message = 'PGC10F_RECIPIENT_NOT_AUTHORIZED';
  end if;

  select *
  into v_checkin
  from public.activity_fulfillment_checkins checkin
  where checkin.planned_activity_event_id =
      p_activity_event_id
    and checkin.status = 'registered';

  if not found then
    return jsonb_build_object(
      'ok', true,
      'status', 'not_started',
      'checkedIn', false,
      'lifecycleStatus', v_terms.lifecycle_status
    );
  end if;

  select *
  into v_confirmation
  from public.activity_fulfillment_confirmations confirmation
  where confirmation.checkin_id = v_checkin.id
  for update;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'PGC10F_CONFIRMATION_NOT_FOUND';
  end if;

  if v_confirmation.status = 'pending'
     and v_confirmation.requested_at is null then
    select *
    into v_plan
    from public.activity_events activity
    where activity.id = p_activity_event_id;

    select policy.*
    into v_policy
    from public.activity_fulfillment_policies policy
    where policy.activity_template_id =
      v_plan.activity_template_id
      and policy.status = 'active';

    update public.activity_fulfillment_confirmations
    set
      request_due_at = v_now,
      requested_at = v_now,
      response_deadline_at =
        v_now + make_interval(
          mins => v_policy.auto_confirm_delay_minutes
        ),
      updated_at = v_now
    where id = v_confirmation.id
    returning *
    into v_confirmation;

    insert into public.activity_fulfillment_event_log (
      planned_activity_event_id,
      checkin_id,
      confirmation_id,
      event_type,
      performed_by_user_id,
      performed_by_actor_id,
      occurred_at,
      metadata_json
    )
    values (
      p_activity_event_id,
      v_checkin.id,
      v_confirmation.id,
      'completion_requested',
      p_recipient_user_id,
      p_recipient_actor_id,
      v_now,
      jsonb_build_object(
        'responseDeadlineAt',
          v_confirmation.response_deadline_at,
        'recoveredMissingRequestTimestamp', true
      )
    );
  end if;

  if v_confirmation.status = 'pending'
     and v_confirmation.response_deadline_at is not null
     and v_confirmation.response_deadline_at <= v_now then
    v_result :=
      public.finalize_gift_certificate_fulfillment_success_v1(
        v_confirmation.id,
        'auto',
        null,
        null
      );

    return v_result;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', v_confirmation.status,
    'checkedIn', true,
    'checkedInAt', v_checkin.checked_in_at,
    'requestedAt', v_confirmation.requested_at,
    'responseDeadlineAt',
      v_confirmation.response_deadline_at,
    'finalizedAt', v_confirmation.finalized_at,
    'actualActivityEventId',
      v_checkin.actual_activity_event_id,
    'lifecycleStatus', v_terms.lifecycle_status,
    'pointsChanged', false,
    'reputationChanged', false
  );
end;
$function$;

create or replace function
public.respond_gift_certificate_fulfillment_v1(
  p_recipient_user_id uuid,
  p_recipient_actor_id uuid,
  p_activity_event_id uuid,
  p_response_status text,
  p_buyer_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_terms public.activity_gift_certificate_terms%rowtype;
  v_checkin public.activity_fulfillment_checkins%rowtype;
  v_confirmation public.activity_fulfillment_confirmations%rowtype;
  v_response_status text;
  v_buyer_message text;
  v_now timestamptz := clock_timestamp();
begin
  v_response_status :=
    lower(nullif(btrim(coalesce(p_response_status, '')), ''));
  v_buyer_message :=
    left(nullif(btrim(coalesce(p_buyer_message, '')), ''), 2000);

  if p_recipient_user_id is null
     or p_recipient_actor_id is null
     or p_activity_event_id is null
     or v_response_status not in (
       'confirmed_by_buyer',
       'disputed',
       'partial_problem'
     ) then
    raise exception using
      errcode = '22023',
      message = 'PGC10F_RESPONSE_INPUT_INVALID';
  end if;

  select *
  into v_terms
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC10F_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms.recipient_user_id
       is distinct from p_recipient_user_id
     or v_terms.recipient_actor_id
       is distinct from p_recipient_actor_id then
    raise exception using
      errcode = '42501',
      message = 'PGC10F_RECIPIENT_NOT_AUTHORIZED';
  end if;

  select *
  into v_checkin
  from public.activity_fulfillment_checkins checkin
  where checkin.planned_activity_event_id =
      p_activity_event_id
    and checkin.status = 'registered'
  for update;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'PGC10F_CHECKIN_REQUIRED';
  end if;

  select *
  into v_confirmation
  from public.activity_fulfillment_confirmations confirmation
  where confirmation.checkin_id = v_checkin.id
  for update;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'PGC10F_CONFIRMATION_NOT_FOUND';
  end if;

  if v_confirmation.status <> 'pending' then
    if v_confirmation.status = v_response_status then
      return jsonb_build_object(
        'ok', true,
        'disposition', 'idempotent_replay',
        'status', v_confirmation.status,
        'checkedIn', true,
        'checkedInAt', v_checkin.checked_in_at,
        'requestedAt', v_confirmation.requested_at,
        'responseDeadlineAt',
          v_confirmation.response_deadline_at,
        'finalizedAt', v_confirmation.finalized_at,
        'actualActivityEventId',
          v_checkin.actual_activity_event_id,
        'lifecycleStatus', v_terms.lifecycle_status,
        'pointsChanged', false,
        'reputationChanged', false
      );
    end if;

    raise exception using
      errcode = '23514',
      message = 'PGC10F_CONFIRMATION_ALREADY_FINALIZED';
  end if;

  if v_confirmation.requested_at is null
     or v_confirmation.response_deadline_at is null then
    raise exception using
      errcode = '23514',
      message = 'PGC10F_CONFIRMATION_REQUEST_STATE_INVALID';
  end if;

  if v_confirmation.response_deadline_at <= v_now then
    return public.finalize_gift_certificate_fulfillment_success_v1(
      v_confirmation.id,
      'auto',
      null,
      null
    );
  end if;

  if v_response_status = 'confirmed_by_buyer' then
    return public.finalize_gift_certificate_fulfillment_success_v1(
      v_confirmation.id,
      'buyer',
      p_recipient_user_id,
      p_recipient_actor_id
    );
  end if;

  update public.activity_fulfillment_confirmations
  set
    status = v_response_status,
    buyer_responded_at = v_now,
    buyer_response_actor_id = p_recipient_actor_id,
    buyer_message = v_buyer_message,
    finalized_at = v_now,
    updated_at = v_now
  where id = v_confirmation.id
    and status = 'pending'
  returning *
  into v_confirmation;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'PGC10F_CONFIRMATION_CONCURRENT_STATE_CHANGE';
  end if;

  update public.activity_events
  set
    metadata_json =
      coalesce(metadata_json, '{}'::jsonb)
      || jsonb_build_object(
        'giftCertificateFulfillmentStatus',
          v_response_status,
        'giftCertificateFulfillmentFinalizedAt', v_now
      ),
    updated_at = v_now
  where id = p_activity_event_id;

  insert into public.activity_fulfillment_event_log (
    planned_activity_event_id,
    checkin_id,
    confirmation_id,
    event_type,
    performed_by_user_id,
    performed_by_actor_id,
    occurred_at,
    metadata_json
  )
  values (
    p_activity_event_id,
    v_checkin.id,
    v_confirmation.id,
    case
      when v_response_status = 'disputed'
        then 'buyer_disputed'
      else 'buyer_partial_problem'
    end,
    p_recipient_user_id,
    p_recipient_actor_id,
    v_now,
    jsonb_build_object(
      'buyerMessage', v_buyer_message,
      'certificateLifecycleUnchanged', true,
      'actualActivityCreated', false,
      'pointsChanged', false,
      'reputationChanged', false
    )
  );

  return jsonb_build_object(
    'ok', true,
    'disposition', 'buyer_response_saved',
    'status', v_confirmation.status,
    'checkedIn', true,
    'checkedInAt', v_checkin.checked_in_at,
    'requestedAt', v_confirmation.requested_at,
    'responseDeadlineAt',
      v_confirmation.response_deadline_at,
    'finalizedAt', v_confirmation.finalized_at,
    'actualActivityEventId', null,
    'lifecycleStatus', v_terms.lifecycle_status,
    'pointsChanged', false,
    'reputationChanged', false
  );
end;
$function$;

revoke all on function
public.finalize_gift_certificate_fulfillment_success_v1(
  uuid,
  text,
  uuid,
  uuid
)
from public, anon, authenticated, service_role;

revoke all on function
public.get_gift_certificate_fulfillment_confirmation_v1(
  uuid,
  uuid,
  uuid
)
from public, anon, authenticated, service_role;

grant execute on function
public.get_gift_certificate_fulfillment_confirmation_v1(
  uuid,
  uuid,
  uuid
)
to service_role;

revoke all on function
public.respond_gift_certificate_fulfillment_v1(
  uuid,
  uuid,
  uuid,
  text,
  text
)
from public, anon, authenticated, service_role;

grant execute on function
public.respond_gift_certificate_fulfillment_v1(
  uuid,
  uuid,
  uuid,
  text,
  text
)
to service_role;

comment on function
public.finalize_gift_certificate_fulfillment_success_v1(
  uuid,
  text,
  uuid,
  uuid
) is
  'Internal idempotent successful fulfillment finalizer. Redeems the certificate but intentionally defers actual activities for both provider and recipient until the AI activity-analysis pipeline is ready.';

comment on function
public.get_gift_certificate_fulfillment_confirmation_v1(
  uuid,
  uuid,
  uuid
) is
  'Returns recipient fulfillment state and lazily performs 24-hour auto-confirmation when the response deadline has passed.';

comment on function
public.respond_gift_certificate_fulfillment_v1(
  uuid,
  uuid,
  uuid,
  text,
  text
) is
  'Stores the exact recipient response. Successful confirmation redeems the certificate while actual activities remain deferred; dispute or partial/problem keeps the certificate unresolved.';

commit;
