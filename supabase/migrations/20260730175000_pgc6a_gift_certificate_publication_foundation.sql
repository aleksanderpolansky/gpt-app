begin;

alter table public.activity_gift_certificate_terms
add column if not exists published_at timestamptz null;

do $block$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.activity_gift_certificate_terms'::regclass
      and conname = 'activity_gift_certificate_available_shape_check'
  ) then
    alter table public.activity_gift_certificate_terms
    add constraint activity_gift_certificate_available_shape_check
    check (
      lifecycle_status <> 'available'
      or (
        published_at is not null
        and recipient_user_id is null
        and recipient_actor_id is null
        and public_code is null
        and qr_token_hash is null
        and ordered_at is null
        and redeemed_at is null
        and expired_at is null
        and annulled_at is null
      )
    );
  end if;
end;
$block$;

create index if not exists
  activity_gift_certificate_available_overlap_idx
on public.activity_gift_certificate_terms (
  provider_actor_id,
  available_from,
  available_until,
  activity_event_id
)
where lifecycle_status = 'available';

create or replace function
public.enforce_gift_certificate_publication_state_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'UPDATE'
     and old.published_at is not null
     and new.published_at is distinct from old.published_at then
    raise exception using
      errcode = '23514',
      message = 'PGC6A_CERTIFICATE_PUBLISHED_AT_IMMUTABLE';
  end if;

  if new.lifecycle_status = 'available'
     and (
       new.published_at is null
       or new.recipient_user_id is not null
       or new.recipient_actor_id is not null
       or new.public_code is not null
       or new.qr_token_hash is not null
       or new.ordered_at is not null
       or new.redeemed_at is not null
       or new.expired_at is not null
       or new.annulled_at is not null
     ) then
    raise exception using
      errcode = '23514',
      message = 'PGC6A_AVAILABLE_CERTIFICATE_SHAPE_INVALID';
  end if;

  return new;
end;
$function$;

drop trigger if exists
  activity_gift_certificate_publication_state_trg
on public.activity_gift_certificate_terms;

create trigger
  activity_gift_certificate_publication_state_trg
before insert or update on public.activity_gift_certificate_terms
for each row
execute function
  public.enforce_gift_certificate_publication_state_v1();

create or replace function
public.publish_gift_certificate_activity_v1(
  p_owner_user_id uuid,
  p_manager_actor_id uuid,
  p_activity_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_terms public.activity_gift_certificate_terms%rowtype;
  v_activity public.activity_events%rowtype;
  v_template_slug text;
  v_overlap_count integer;
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
  where existing.provider_actor_id = v_terms.provider_actor_id
    and existing.lifecycle_status = 'available'
    and existing.activity_event_id <> v_terms.activity_event_id
    and existing.available_from <= v_terms.available_until
    and existing.available_until >= v_terms.available_from;

  if v_overlap_count >= 3 then
    raise exception using
      errcode = '23514',
      message = 'PGC6A_PROVIDER_AVAILABLE_CERTIFICATE_LIMIT_REACHED';
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
    'giftCertificateTerms', to_jsonb(v_terms)
  );
end;
$function$;

revoke all on function
  public.enforce_gift_certificate_publication_state_v1()
from public, anon, authenticated, service_role;

revoke all on function
  public.publish_gift_certificate_activity_v1(uuid, uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function
  public.publish_gift_certificate_activity_v1(uuid, uuid, uuid)
to service_role;

comment on column
  public.activity_gift_certificate_terms.published_at
is
  'First publication timestamp. Immutable after it is set.';

comment on function
  public.publish_gift_certificate_activity_v1(uuid, uuid, uuid)
is
  'Atomically publishes an owned draft certificate and enforces no more than three overlapping available certificates per provider.';

commit;
