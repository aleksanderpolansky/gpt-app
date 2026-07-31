-- PGC9B — activity-based gift-certificate redemption foundation.
--
-- Redemption contract:
-- - the QR contains a raw one-time token, but the server hashes it before RPC;
-- - the database receives and compares only the SHA-256 token hash;
-- - only the provider owner acting through the stored manager actor may redeem;
-- - active -> redeemed is atomic;
-- - a repeated scan by the same provider manager is idempotent;
-- - redemption changes neither POINTS nor provider reputation;
-- - the original planned activity remains a planned activity.
--
-- Actual-activity creation linked through fulfills_planned_activity_event_id
-- is deliberately left for the next controlled step, after this lifecycle
-- transition is proven in Production.

begin;

alter table public.activity_gift_certificate_terms
add column if not exists redeemed_by_user_id uuid null
  references public.app_users(id) on delete restrict;

alter table public.activity_gift_certificate_terms
add column if not exists redeemed_by_actor_id uuid null
  references public.actors(id) on delete restrict;

do $block$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid =
      'public.activity_gift_certificate_terms'::regclass
      and conname =
        'activity_gift_certificate_redeemed_by_pair_check'
  ) then
    alter table public.activity_gift_certificate_terms
    add constraint
      activity_gift_certificate_redeemed_by_pair_check
    check (
      (
        redeemed_by_user_id is null
        and redeemed_by_actor_id is null
      )
      or
      (
        redeemed_by_user_id is not null
        and redeemed_by_actor_id is not null
      )
    );
  end if;
end;
$block$;

create index if not exists
  activity_gift_certificate_redeemed_by_idx
on public.activity_gift_certificate_terms (
  redeemed_by_user_id,
  redeemed_at desc
)
where redeemed_at is not null;

create or replace function
public.redeem_gift_certificate_activity_v1(
  p_provider_owner_user_id uuid,
  p_provider_manager_actor_id uuid,
  p_activity_event_id uuid,
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
  v_public_code text;
  v_qr_token_hash text;
  v_qr_token_version text;
  v_now timestamptz := clock_timestamp();
  v_today date := current_date;
begin
  if p_provider_owner_user_id is null
     or p_provider_manager_actor_id is null
     or p_activity_event_id is null then
    raise exception using
      errcode = '22023',
      message = 'PGC9B_REDEMPTION_CONTEXT_REQUIRED';
  end if;

  v_public_code :=
    upper(nullif(btrim(coalesce(p_public_code, '')), ''));
  v_qr_token_hash :=
    lower(nullif(btrim(coalesce(p_qr_token_hash, '')), ''));
  v_qr_token_version :=
    lower(nullif(btrim(coalesce(p_qr_token_version, '')), ''));

  if v_public_code is null
     or v_public_code !~ '^GC-[A-F0-9]{20}$' then
    raise exception using
      errcode = '22023',
      message = 'PGC9B_PUBLIC_CODE_INVALID';
  end if;

  if v_qr_token_hash is null
     or v_qr_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'PGC9B_QR_TOKEN_HASH_INVALID';
  end if;

  if v_qr_token_version is distinct from 'hmac-sha256-v1' then
    raise exception using
      errcode = '22023',
      message = 'PGC9B_QR_TOKEN_VERSION_INVALID';
  end if;

  select *
  into v_terms_before
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'PGC9B_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms_before.provider_owner_user_id
       is distinct from p_provider_owner_user_id then
    raise exception using
      errcode = '42501',
      message = 'PGC9B_PROVIDER_OWNER_NOT_AUTHORIZED';
  end if;

  if v_terms_before.provider_manager_actor_id
       is distinct from p_provider_manager_actor_id then
    raise exception using
      errcode = '42501',
      message = 'PGC9B_PROVIDER_MANAGER_NOT_AUTHORIZED';
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
      message = 'PGC9B_PROVIDER_MANAGER_CONTEXT_NOT_AVAILABLE';
  end if;

  if v_terms_before.public_code is distinct from v_public_code
     or v_terms_before.qr_token_hash is distinct from v_qr_token_hash
     or v_terms_before.qr_token_version
       is distinct from v_qr_token_version then
    raise exception using
      errcode = '42501',
      message = 'PGC9B_QR_CREDENTIALS_INVALID';
  end if;

  if v_terms_before.lifecycle_status = 'redeemed' then
    if v_terms_before.redeemed_at is null
       or v_terms_before.redeemed_by_user_id
         is distinct from p_provider_owner_user_id
       or v_terms_before.redeemed_by_actor_id
         is distinct from p_provider_manager_actor_id then
      raise exception using
        errcode = '23514',
        message = 'PGC9B_REDEEMED_STATE_INVALID';
    end if;

    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'activityEventId', v_terms_before.activity_event_id,
      'lifecycleStatus', v_terms_before.lifecycle_status,
      'publicCode', v_terms_before.public_code,
      'providerOwnerUserId', v_terms_before.provider_owner_user_id,
      'providerManagerActorId',
        v_terms_before.provider_manager_actor_id,
      'providerActorId', v_terms_before.provider_actor_id,
      'recipientUserId', v_terms_before.recipient_user_id,
      'recipientActorId', v_terms_before.recipient_actor_id,
      'redeemedAt', v_terms_before.redeemed_at,
      'redeemedByUserId', v_terms_before.redeemed_by_user_id,
      'redeemedByActorId', v_terms_before.redeemed_by_actor_id,
      'pointsChanged', false,
      'reputationChanged', false
    );
  end if;

  if v_terms_before.lifecycle_status is distinct from 'active' then
    raise exception using
      errcode = '23514',
      message = 'PGC9B_ONLY_ACTIVE_CERTIFICATE_CAN_BE_REDEEMED';
  end if;

  if v_terms_before.recipient_user_id is null
     or v_terms_before.recipient_actor_id is null
     or v_terms_before.ordered_at is null then
    raise exception using
      errcode = '23514',
      message = 'PGC9B_ACTIVE_CERTIFICATE_SHAPE_INVALID';
  end if;

  if v_today < v_terms_before.available_from then
    raise exception using
      errcode = '23514',
      message = 'PGC9B_CERTIFICATE_NOT_YET_VALID';
  end if;

  if v_today > v_terms_before.available_until then
    raise exception using
      errcode = '23514',
      message = 'PGC9B_CERTIFICATE_VALIDITY_ENDED';
  end if;

  update public.activity_gift_certificate_terms
  set
    lifecycle_status = 'redeemed',
    redeemed_at = v_now,
    redeemed_by_user_id = p_provider_owner_user_id,
    redeemed_by_actor_id = p_provider_manager_actor_id,
    updated_at = v_now
  where activity_event_id = p_activity_event_id
    and lifecycle_status = 'active'
  returning *
  into v_terms_after;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'PGC9B_REDEMPTION_CONCURRENT_STATE_CHANGE';
  end if;

  update public.activity_events
  set
    metadata_json =
      coalesce(metadata_json, '{}'::jsonb)
      || jsonb_build_object(
        'giftCertificateLifecycle', 'redeemed',
        'giftCertificateRedeemedAt', v_now,
        'giftCertificateRedeemedByActorId',
          p_provider_manager_actor_id
      ),
    updated_at = v_now
  where id = p_activity_event_id;

  return jsonb_build_object(
    'ok', true,
    'disposition', 'redeemed',
    'activityEventId', v_terms_after.activity_event_id,
    'lifecycleStatus', v_terms_after.lifecycle_status,
    'publicCode', v_terms_after.public_code,
    'providerOwnerUserId', v_terms_after.provider_owner_user_id,
    'providerManagerActorId',
      v_terms_after.provider_manager_actor_id,
    'providerActorId', v_terms_after.provider_actor_id,
    'recipientUserId', v_terms_after.recipient_user_id,
    'recipientActorId', v_terms_after.recipient_actor_id,
    'redeemedAt', v_terms_after.redeemed_at,
    'redeemedByUserId', v_terms_after.redeemed_by_user_id,
    'redeemedByActorId', v_terms_after.redeemed_by_actor_id,
    'pointsChanged', false,
    'reputationChanged', false
  );
end;
$function$;

revoke all on function
public.redeem_gift_certificate_activity_v1(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
)
from public, anon, authenticated, service_role;

grant execute on function
public.redeem_gift_certificate_activity_v1(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
)
to service_role;

comment on function
public.redeem_gift_certificate_activity_v1(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
) is
  'Atomically redeems one activity-based gift certificate. '
  'Accepts only a server-side SHA-256 QR token hash, authorizes '
  'the stored provider owner and manager actor, is idempotent on '
  'repeat scan, and changes neither POINTS nor reputation.';

commit;
