-- ARCTor GCR6H: public visibility is independent from certificate lifecycle.
-- Hiding never rolls back order, POINTS, reputation, fulfillment, or timestamps.

begin;

alter table public.activity_gift_certificate_terms
  add column if not exists public_visibility_status text;

alter table public.activity_gift_certificate_terms
  add column if not exists visibility_changed_at timestamptz;

update public.activity_gift_certificate_terms
set
  public_visibility_status = case
    when lifecycle_status = 'draft' then 'hidden'
    else 'visible'
  end,
  visibility_changed_at = coalesce(visibility_changed_at, updated_at, created_at, clock_timestamp())
where public_visibility_status is null;

alter table public.activity_gift_certificate_terms
  alter column public_visibility_status set default 'visible';

alter table public.activity_gift_certificate_terms
  alter column public_visibility_status set not null;

alter table public.activity_gift_certificate_terms
  drop constraint if exists activity_gift_certificate_terms_public_visibility_check;

alter table public.activity_gift_certificate_terms
  add constraint activity_gift_certificate_terms_public_visibility_check
  check (public_visibility_status in ('visible', 'hidden')) not valid;

alter table public.activity_gift_certificate_terms
  validate constraint activity_gift_certificate_terms_public_visibility_check;

create index if not exists idx_activity_gift_certificate_terms_public_visibility
  on public.activity_gift_certificate_terms (
    public_visibility_status,
    lifecycle_status,
    updated_at desc
  );

create or replace function public.set_gift_certificate_public_visibility_v1(
  p_owner_user_id uuid,
  p_manager_actor_id uuid,
  p_activity_event_id uuid,
  p_visibility_status text
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
      message = 'GCR6H_VISIBILITY_CONTEXT_REQUIRED';
  end if;

  if p_visibility_status not in ('visible', 'hidden') then
    raise exception using
      errcode = '22023',
      message = 'GCR6H_VISIBILITY_INVALID';
  end if;

  select *
  into v_terms
  from public.activity_gift_certificate_terms terms
  where terms.activity_event_id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'GCR6H_CERTIFICATE_NOT_FOUND';
  end if;

  if v_terms.provider_owner_user_id is distinct from p_owner_user_id
     or v_terms.provider_manager_actor_id is distinct from p_manager_actor_id then
    raise exception using
      errcode = '42501',
      message = 'GCR6H_CERTIFICATE_OWNER_MISMATCH';
  end if;

  select *
  into v_activity
  from public.activity_events activity
  where activity.id = p_activity_event_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'GCR6H_ACTIVITY_NOT_FOUND';
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
      message = 'GCR6H_ACTIVITY_OWNER_OR_TEMPLATE_INVALID';
  end if;

  if p_visibility_status = 'visible'
     and v_terms.lifecycle_status = 'draft' then
    raise exception using
      errcode = '23514',
      message = 'GCR6H_LEGACY_DRAFT_REQUIRES_PUBLISH';
  end if;

  if v_terms.public_visibility_status = p_visibility_status then
    return jsonb_build_object(
      'ok', true,
      'disposition', 'idempotent_replay',
      'activityEventId', v_terms.activity_event_id,
      'lifecycleStatus', v_terms.lifecycle_status,
      'publicVisibilityStatus', v_terms.public_visibility_status,
      'visibilityChangedAt', v_terms.visibility_changed_at
    );
  end if;

  update public.activity_gift_certificate_terms
  set
    public_visibility_status = p_visibility_status,
    visibility_changed_at = v_now,
    updated_at = v_now
  where activity_event_id = p_activity_event_id
  returning * into v_terms;

  return jsonb_build_object(
    'ok', true,
    'disposition', case when p_visibility_status = 'hidden' then 'hidden' else 'shown' end,
    'activityEventId', v_terms.activity_event_id,
    'lifecycleStatus', v_terms.lifecycle_status,
    'publicVisibilityStatus', v_terms.public_visibility_status,
    'visibilityChangedAt', v_terms.visibility_changed_at,
    'publishedAt', v_terms.published_at,
    'orderedAt', v_terms.ordered_at,
    'redeemedAt', v_terms.redeemed_at,
    'pointsTransactionId', v_terms.points_transaction_id
  );
end;
$function$;

revoke all on function public.set_gift_certificate_public_visibility_v1(uuid, uuid, uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.set_gift_certificate_public_visibility_v1(uuid, uuid, uuid, text)
to service_role;

comment on function public.set_gift_certificate_public_visibility_v1(uuid, uuid, uuid, text) is
  'Changes only public visibility of a gift-certificate activity. Lifecycle, recipient, POINTS transaction, reputation, fulfillment, and publication timestamps are not rolled back.';

-- Legacy V11/V12 hide RPC encoded hidden as lifecycle=draft. It must not remain callable.
drop function if exists public.hide_gift_certificate_activity_v1(uuid, uuid, uuid);

create or replace function public.guard_gift_certificate_visibility_lifecycle_v1()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  -- Legacy drafts that are explicitly published become visible again.
  if old.lifecycle_status = 'draft'
     and new.lifecycle_status = 'available' then
    new.public_visibility_status := 'visible';
    new.visibility_changed_at := clock_timestamp();
  end if;

  -- A hidden available offer cannot be ordered through a stale/direct link.
  if old.lifecycle_status = 'available'
     and new.lifecycle_status = 'active'
     and old.public_visibility_status = 'hidden' then
    raise exception using
      errcode = '23514',
      message = 'GCR6H_HIDDEN_CERTIFICATE_CANNOT_BE_ORDERED';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_guard_gift_certificate_visibility_lifecycle_v1
on public.activity_gift_certificate_terms;

create trigger trg_guard_gift_certificate_visibility_lifecycle_v1
before update on public.activity_gift_certificate_terms
for each row
execute function public.guard_gift_certificate_visibility_lifecycle_v1();

commit;
