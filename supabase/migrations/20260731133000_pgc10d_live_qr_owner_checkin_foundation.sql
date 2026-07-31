-- ARCTor.app — PGC10D
-- Live 60-second QR and provider-owner check-in foundation.
--
-- Locked scope:
-- - the buyer creates a random short-lived QR from the authenticated account;
-- - only the stored provider owner acting through the stored manager profile
--   can register arrival;
-- - if an employee holds the device, it remains logged in as the owner;
-- - staff_user_id/staff_actor_id therefore record the owner session;
-- - scanning registers arrival only;
-- - certificate lifecycle, POINTS and reputation remain unchanged;
-- - employee delegation and actor_space_roles authorization are deferred.

begin;

create or replace function
public.issue_gift_certificate_fulfillment_qr_v1(
  p_recipient_user_id uuid,
  p_recipient_actor_id uuid,
  p_activity_event_id uuid,
  p_token_hash text,
  p_token_version text default 'sha256-v1'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_terms public.activity_gift_certificate_terms%rowtype;
  v_activity public.activity_events%rowtype;
  v_policy public.activity_fulfillment_policies%rowtype;
  v_previous public.activity_fulfillment_qr_sessions%rowtype;
  v_session public.activity_fulfillment_qr_sessions%rowtype;
  v_token_hash text;
  v_token_version text;
  v_now timestamptz := clock_timestamp();
  v_expires_at timestamptz;
begin
  if p_recipient_user_id is null
     or p_recipient_actor_id is null
     or p_activity_event_id is null then
    raise exception using
      errcode = '22023',
      message = 'PGC10D_QR_ISSUE_CONTEXT_REQUIRED';
  end if;

  v_token_hash :=
    lower(nullif(btrim(coalesce(p_token_hash, '')), ''));
  v_token_version :=
    lower(nullif(btrim(coalesce(p_token_version, '')), ''));

  if v_token_hash is null
     or v_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'PGC10D_QR_TOKEN_HASH_INVALID';
  end if;

  if v_token_version is distinct from 'sha256-v1' then
    raise exception using
      errcode = '22023',
      message = 'PGC10D_QR_TOKEN_VERSION_INVALID';
  end if;

  select *
  into v_terms
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC10D_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms.lifecycle_status is distinct from 'active' then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_ONLY_ACTIVE_CERTIFICATE_CAN_ISSUE_QR';
  end if;

  if v_terms.recipient_user_id is distinct from p_recipient_user_id
     or v_terms.recipient_actor_id
       is distinct from p_recipient_actor_id then
    raise exception using
      errcode = '42501',
      message = 'PGC10D_RECIPIENT_NOT_AUTHORIZED';
  end if;

  if v_terms.public_code is null
     or v_terms.public_code !~ '^GC-[A-F0-9]{20}$' then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_PUBLIC_CODE_NOT_AVAILABLE';
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

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.owner_user_id = p_recipient_user_id
      and profile.actor_id = p_recipient_actor_id
      and profile.profile_kind in ('personal', 'avatar')
  ) then
    raise exception using
      errcode = '42501',
      message = 'PGC10D_RECIPIENT_CONTEXT_NOT_AVAILABLE';
  end if;

  if exists (
    select 1
    from public.activity_fulfillment_checkins checkin
    where checkin.planned_activity_event_id = p_activity_event_id
      and checkin.status = 'registered'
  ) then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_ALREADY_CHECKED_IN';
  end if;

  select *
  into v_activity
  from public.activity_events activity
  where activity.id = p_activity_event_id
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
     or v_policy.requires_checkin is distinct from true then
    raise exception using
      errcode = '23514',
      message = 'PGC10D_FULFILLMENT_POLICY_NOT_AVAILABLE';
  end if;

  for v_previous in
    select session.*
    from public.activity_fulfillment_qr_sessions session
    where session.planned_activity_event_id = p_activity_event_id
      and session.recipient_user_id = p_recipient_user_id
      and session.status = 'issued'
    for update
  loop
    if v_previous.expires_at <= v_now then
      update public.activity_fulfillment_qr_sessions
      set
        status = 'expired',
        updated_at = v_now
      where id = v_previous.id;

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
        p_activity_event_id,
        v_previous.id,
        'qr_expired',
        p_recipient_user_id,
        p_recipient_actor_id,
        v_now,
        jsonb_build_object('reason', 'replacement_after_expiry')
      );
    else
      update public.activity_fulfillment_qr_sessions
      set
        status = 'revoked',
        revoked_at = v_now,
        updated_at = v_now
      where id = v_previous.id;

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
        p_activity_event_id,
        v_previous.id,
        'qr_revoked',
        p_recipient_user_id,
        p_recipient_actor_id,
        v_now,
        jsonb_build_object('reason', 'replaced_by_new_live_qr')
      );
    end if;
  end loop;

  v_expires_at :=
    v_now + make_interval(secs => v_policy.qr_ttl_seconds);

  insert into public.activity_fulfillment_qr_sessions (
    planned_activity_event_id,
    recipient_user_id,
    recipient_actor_id,
    public_code_snapshot,
    token_hash,
    token_version,
    status,
    issued_at,
    expires_at,
    created_at,
    updated_at
  )
  values (
    p_activity_event_id,
    p_recipient_user_id,
    p_recipient_actor_id,
    v_terms.public_code,
    v_token_hash,
    v_token_version,
    'issued',
    v_now,
    v_expires_at,
    v_now,
    v_now
  )
  returning *
  into v_session;

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
    p_activity_event_id,
    v_session.id,
    'qr_issued',
    p_recipient_user_id,
    p_recipient_actor_id,
    v_now,
    jsonb_build_object(
      'ttlSeconds', v_policy.qr_ttl_seconds,
      'tokenVersion', v_token_version,
      'publicCode', v_terms.public_code
    )
  );

  return jsonb_build_object(
    'ok', true,
    'disposition', 'issued',
    'qrSessionId', v_session.id,
    'activityEventId', p_activity_event_id,
    'recipientUserId', p_recipient_user_id,
    'recipientActorId', p_recipient_actor_id,
    'publicCode', v_terms.public_code,
    'issuedAt', v_session.issued_at,
    'expiresAt', v_session.expires_at,
    'ttlSeconds', v_policy.qr_ttl_seconds,
    'certificateLifecycleStatus', v_terms.lifecycle_status,
    'pointsChanged', false,
    'reputationChanged', false
  );
end;
$function$;

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

  if v_terms.delivery_mode in ('service_offline', 'service_online')
     and v_activity.ended_at is not null then
    v_request_due_at := greatest(v_now, v_activity.ended_at);
  else
    v_request_due_at := v_now;
  end if;

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
    null,
    null,
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
    'autoConfirmDelayMinutes', v_policy.auto_confirm_delay_minutes,
    'certificateLifecycleStatus', v_terms.lifecycle_status,
    'pointsChanged', false,
    'reputationChanged', false
  );
end;
$function$;

revoke all on function
public.issue_gift_certificate_fulfillment_qr_v1(
  uuid,
  uuid,
  uuid,
  text,
  text
)
from public, anon, authenticated, service_role;

grant execute on function
public.issue_gift_certificate_fulfillment_qr_v1(
  uuid,
  uuid,
  uuid,
  text,
  text
)
to service_role;

revoke all on function
public.register_gift_certificate_fulfillment_checkin_v1(
  uuid,
  uuid,
  uuid,
  text,
  text
)
from public, anon, authenticated, service_role;

grant execute on function
public.register_gift_certificate_fulfillment_checkin_v1(
  uuid,
  uuid,
  uuid,
  text,
  text
)
to service_role;

-- The old static QR path performed final redemption during scanning.
-- It is incompatible with the accepted two-stage process and is disabled.
revoke execute on function
public.redeem_gift_certificate_activity_v1(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
)
from service_role;

comment on function
public.issue_gift_certificate_fulfillment_qr_v1(
  uuid,
  uuid,
  uuid,
  text,
  text
) is
  'Issues one random 60-second buyer QR, revoking any previous live QR. Receives only a SHA-256 token hash and stores no raw token.';

comment on function
public.register_gift_certificate_fulfillment_checkin_v1(
  uuid,
  uuid,
  uuid,
  text,
  text
) is
  'Consumes a live QR and registers buyer arrival under the provider owner account. Does not finalize the certificate, change POINTS, or change reputation.';

comment on function
public.redeem_gift_certificate_activity_v1(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
) is
  'Legacy static-QR final redemption function. Disabled for service_role after PGC10D; retained for historical schema traceability.';

commit;
