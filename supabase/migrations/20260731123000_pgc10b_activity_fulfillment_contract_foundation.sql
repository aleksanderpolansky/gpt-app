-- ARCTor.app — PGC10B
-- Generic planned-activity fulfillment contract foundation.
--
-- Locked behavior for gift-certificate services:
-- 1. The authenticated buyer opens a short-lived, one-time QR.
-- 2. An individually authenticated provider staff member scans it.
-- 3. The scan records buyer arrival/check-in; it is not final redemption.
-- 4. After the planned service end, the buyer is asked to confirm fulfillment.
-- 5. The buyer may confirm, dispute, or report partial/problematic fulfillment.
-- 6. If the buyer does not answer for 24 hours and a valid check-in exists,
--    fulfillment is auto-confirmed.
--
-- This migration creates only the generic protected data contracts.
-- It does not issue QR tokens, check in a buyer, create an actual activity,
-- finalize a certificate, change POINTS, or change reputation.

begin;

create table public.activity_fulfillment_policies (
  id uuid primary key default gen_random_uuid(),
  activity_template_id uuid not null
    references public.activity_templates(id) on delete restrict,
  policy_code text not null,
  qr_ttl_seconds integer not null default 60,
  requires_checkin boolean not null default true,
  requires_buyer_confirmation boolean not null default true,
  auto_confirm_delay_minutes integer not null default 1440,
  status text not null default 'active',
  contract_version integer not null default 1,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint activity_fulfillment_policies_template_unique
    unique (activity_template_id),
  constraint activity_fulfillment_policies_code_unique
    unique (policy_code),
  constraint activity_fulfillment_policies_qr_ttl_check
    check (qr_ttl_seconds between 15 and 300),
  constraint activity_fulfillment_policies_auto_delay_check
    check (auto_confirm_delay_minutes between 1 and 10080),
  constraint activity_fulfillment_policies_status_check
    check (status in ('active', 'inactive', 'future')),
  constraint activity_fulfillment_policies_contract_version_check
    check (contract_version >= 1)
);

create table public.activity_fulfillment_qr_sessions (
  id uuid primary key default gen_random_uuid(),
  planned_activity_event_id uuid not null
    references public.activity_events(id) on delete restrict,
  recipient_user_id uuid not null
    references public.app_users(id) on delete restrict,
  recipient_actor_id uuid not null
    references public.actors(id) on delete restrict,
  public_code_snapshot text not null,
  token_hash text not null,
  token_version text not null default 'sha256-v1',
  status text not null default 'issued',
  issued_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  consumed_by_user_id uuid null
    references public.app_users(id) on delete restrict,
  consumed_by_actor_id uuid null
    references public.actors(id) on delete restrict,
  revoked_at timestamptz null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint activity_fulfillment_qr_public_code_check
    check (public_code_snapshot ~ '^GC-[A-F0-9]{20}$'),
  constraint activity_fulfillment_qr_token_hash_check
    check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint activity_fulfillment_qr_token_version_check
    check (token_version = 'sha256-v1'),
  constraint activity_fulfillment_qr_status_check
    check (status in ('issued', 'consumed', 'revoked', 'expired')),
  constraint activity_fulfillment_qr_time_check
    check (expires_at > issued_at),
  constraint activity_fulfillment_qr_consumed_pair_check
    check (
      (
        consumed_by_user_id is null
        and consumed_by_actor_id is null
      )
      or
      (
        consumed_by_user_id is not null
        and consumed_by_actor_id is not null
      )
    ),
  constraint activity_fulfillment_qr_consumed_state_check
    check (
      (
        status = 'consumed'
        and consumed_at is not null
        and consumed_by_user_id is not null
        and consumed_by_actor_id is not null
      )
      or
      (
        status <> 'consumed'
        and consumed_at is null
      )
    ),
  constraint activity_fulfillment_qr_revoked_state_check
    check (
      (status = 'revoked' and revoked_at is not null)
      or
      (status <> 'revoked' and revoked_at is null)
    )
);

create unique index activity_fulfillment_qr_token_hash_uidx
  on public.activity_fulfillment_qr_sessions(token_hash);

create unique index activity_fulfillment_one_issued_qr_uidx
  on public.activity_fulfillment_qr_sessions(
    planned_activity_event_id,
    recipient_user_id
  )
  where status = 'issued';

create index activity_fulfillment_qr_expiry_idx
  on public.activity_fulfillment_qr_sessions(status, expires_at)
  where status = 'issued';

create table public.activity_fulfillment_checkins (
  id uuid primary key default gen_random_uuid(),
  planned_activity_event_id uuid not null
    references public.activity_events(id) on delete restrict,
  actual_activity_event_id uuid null
    references public.activity_events(id) on delete restrict,
  qr_session_id uuid not null
    references public.activity_fulfillment_qr_sessions(id)
    on delete restrict,
  provider_owner_user_id uuid not null
    references public.app_users(id) on delete restrict,
  provider_actor_id uuid not null
    references public.actors(id) on delete restrict,
  provider_organization_id uuid null
    references public.organizations(id) on delete restrict,
  staff_user_id uuid not null
    references public.app_users(id) on delete restrict,
  staff_actor_id uuid not null
    references public.actors(id) on delete restrict,
  recipient_user_id uuid not null
    references public.app_users(id) on delete restrict,
  recipient_actor_id uuid not null
    references public.actors(id) on delete restrict,
  authorization_basis text not null,
  authorization_role text null,
  status text not null default 'registered',
  checked_in_at timestamptz not null default clock_timestamp(),
  voided_at timestamptz null,
  voided_by_user_id uuid null
    references public.app_users(id) on delete restrict,
  voided_by_actor_id uuid null
    references public.actors(id) on delete restrict,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint activity_fulfillment_checkins_actual_unique
    unique (actual_activity_event_id),
  constraint activity_fulfillment_checkins_qr_unique
    unique (qr_session_id),
  constraint activity_fulfillment_checkins_status_check
    check (status in ('registered', 'voided')),
  constraint activity_fulfillment_checkins_authorization_check
    check (
      authorization_basis in (
        'provider_owner',
        'provider_manager',
        'organization_space_role'
      )
    ),
  constraint activity_fulfillment_checkins_void_pair_check
    check (
      (
        voided_by_user_id is null
        and voided_by_actor_id is null
      )
      or
      (
        voided_by_user_id is not null
        and voided_by_actor_id is not null
      )
    ),
  constraint activity_fulfillment_checkins_void_state_check
    check (
      (
        status = 'voided'
        and voided_at is not null
        and voided_by_user_id is not null
        and voided_by_actor_id is not null
      )
      or
      (
        status = 'registered'
        and voided_at is null
      )
    )
);

create unique index activity_fulfillment_one_registered_checkin_uidx
  on public.activity_fulfillment_checkins(planned_activity_event_id)
  where status = 'registered';

create index activity_fulfillment_checkins_provider_idx
  on public.activity_fulfillment_checkins(
    provider_owner_user_id,
    provider_actor_id,
    checked_in_at desc
  );

create index activity_fulfillment_checkins_staff_idx
  on public.activity_fulfillment_checkins(
    staff_user_id,
    staff_actor_id,
    checked_in_at desc
  );

create index activity_fulfillment_checkins_recipient_idx
  on public.activity_fulfillment_checkins(
    recipient_user_id,
    recipient_actor_id,
    checked_in_at desc
  );

create table public.activity_fulfillment_confirmations (
  id uuid primary key default gen_random_uuid(),
  planned_activity_event_id uuid not null
    references public.activity_events(id) on delete restrict,
  checkin_id uuid not null
    references public.activity_fulfillment_checkins(id)
    on delete restrict,
  recipient_user_id uuid not null
    references public.app_users(id) on delete restrict,
  recipient_actor_id uuid not null
    references public.actors(id) on delete restrict,
  status text not null default 'pending',
  request_due_at timestamptz not null,
  requested_at timestamptz null,
  response_deadline_at timestamptz null,
  buyer_responded_at timestamptz null,
  buyer_response_actor_id uuid null
    references public.actors(id) on delete restrict,
  buyer_message text null,
  auto_confirmed_at timestamptz null,
  finalized_at timestamptz null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint activity_fulfillment_confirmations_plan_unique
    unique (planned_activity_event_id),
  constraint activity_fulfillment_confirmations_checkin_unique
    unique (checkin_id),
  constraint activity_fulfillment_confirmations_status_check
    check (
      status in (
        'pending',
        'confirmed_by_buyer',
        'auto_confirmed',
        'disputed',
        'partial_problem'
      )
    ),
  constraint activity_fulfillment_confirmations_request_time_check
    check (
      requested_at is null
      or requested_at >= request_due_at
    ),
  constraint activity_fulfillment_confirmations_deadline_check
    check (
      response_deadline_at is null
      or (
        requested_at is not null
        and response_deadline_at > requested_at
      )
    ),
  constraint activity_fulfillment_confirmations_buyer_state_check
    check (
      (
        status in (
          'confirmed_by_buyer',
          'disputed',
          'partial_problem'
        )
        and buyer_responded_at is not null
        and buyer_response_actor_id is not null
        and finalized_at is not null
      )
      or
      (
        status not in (
          'confirmed_by_buyer',
          'disputed',
          'partial_problem'
        )
        and buyer_responded_at is null
        and buyer_response_actor_id is null
      )
    ),
  constraint activity_fulfillment_confirmations_auto_state_check
    check (
      (
        status = 'auto_confirmed'
        and auto_confirmed_at is not null
        and finalized_at is not null
      )
      or
      (
        status <> 'auto_confirmed'
        and auto_confirmed_at is null
      )
    ),
  constraint activity_fulfillment_confirmations_pending_state_check
    check (
      status <> 'pending'
      or finalized_at is null
    )
);

create index activity_fulfillment_confirmations_due_idx
  on public.activity_fulfillment_confirmations(
    status,
    request_due_at,
    response_deadline_at
  )
  where status = 'pending';

create index activity_fulfillment_confirmations_recipient_idx
  on public.activity_fulfillment_confirmations(
    recipient_user_id,
    recipient_actor_id,
    created_at desc
  );

create table public.activity_fulfillment_event_log (
  id uuid primary key default gen_random_uuid(),
  planned_activity_event_id uuid not null
    references public.activity_events(id) on delete restrict,
  qr_session_id uuid null
    references public.activity_fulfillment_qr_sessions(id)
    on delete restrict,
  checkin_id uuid null
    references public.activity_fulfillment_checkins(id)
    on delete restrict,
  confirmation_id uuid null
    references public.activity_fulfillment_confirmations(id)
    on delete restrict,
  event_type text not null,
  performed_by_user_id uuid null
    references public.app_users(id) on delete restrict,
  performed_by_actor_id uuid null
    references public.actors(id) on delete restrict,
  occurred_at timestamptz not null default clock_timestamp(),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  constraint activity_fulfillment_event_log_type_check
    check (
      event_type in (
        'qr_issued',
        'qr_revoked',
        'qr_expired',
        'qr_consumed',
        'checkin_registered',
        'checkin_voided',
        'completion_requested',
        'buyer_confirmed',
        'buyer_disputed',
        'buyer_partial_problem',
        'auto_confirmed'
      )
    ),
  constraint activity_fulfillment_event_log_actor_pair_check
    check (
      (
        performed_by_user_id is null
        and performed_by_actor_id is null
      )
      or
      (
        performed_by_user_id is not null
        and performed_by_actor_id is not null
      )
    )
);

create index activity_fulfillment_event_log_plan_idx
  on public.activity_fulfillment_event_log(
    planned_activity_event_id,
    occurred_at,
    id
  );

create or replace function
public.prevent_activity_fulfillment_event_log_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  raise exception using
    errcode = '42501',
    message = 'PGC10B_FULFILLMENT_EVENT_LOG_IMMUTABLE';
end;
$function$;

create trigger activity_fulfillment_event_log_immutable_trg
before update or delete on public.activity_fulfillment_event_log
for each row execute function
  public.prevent_activity_fulfillment_event_log_mutation_v1();

create trigger activity_fulfillment_policies_updated_at_trg
before update on public.activity_fulfillment_policies
for each row execute function public.set_activity_recording_updated_at();

create trigger activity_fulfillment_qr_sessions_updated_at_trg
before update on public.activity_fulfillment_qr_sessions
for each row execute function public.set_activity_recording_updated_at();

create trigger activity_fulfillment_checkins_updated_at_trg
before update on public.activity_fulfillment_checkins
for each row execute function public.set_activity_recording_updated_at();

create trigger activity_fulfillment_confirmations_updated_at_trg
before update on public.activity_fulfillment_confirmations
for each row execute function public.set_activity_recording_updated_at();

alter table public.activity_fulfillment_policies enable row level security;
alter table public.activity_fulfillment_qr_sessions enable row level security;
alter table public.activity_fulfillment_checkins enable row level security;
alter table public.activity_fulfillment_confirmations enable row level security;
alter table public.activity_fulfillment_event_log enable row level security;

revoke all on public.activity_fulfillment_policies
  from public, anon, authenticated;
revoke all on public.activity_fulfillment_qr_sessions
  from public, anon, authenticated;
revoke all on public.activity_fulfillment_checkins
  from public, anon, authenticated;
revoke all on public.activity_fulfillment_confirmations
  from public, anon, authenticated;
revoke all on public.activity_fulfillment_event_log
  from public, anon, authenticated;

grant select, insert, update
  on public.activity_fulfillment_policies
  to service_role;
grant select, insert, update
  on public.activity_fulfillment_qr_sessions
  to service_role;
grant select, insert, update
  on public.activity_fulfillment_checkins
  to service_role;
grant select, insert, update
  on public.activity_fulfillment_confirmations
  to service_role;
grant select, insert
  on public.activity_fulfillment_event_log
  to service_role;

insert into public.activity_fulfillment_policies (
  activity_template_id,
  policy_code,
  qr_ttl_seconds,
  requires_checkin,
  requires_buyer_confirmation,
  auto_confirm_delay_minutes,
  status,
  contract_version
)
select
  template.id,
  'gift-certificate-v1',
  60,
  true,
  true,
  1440,
  'active',
  1
from public.activity_templates template
where template.slug = 'gift-certificate-v1'
  and template.status = 'active'
  and template.is_active = true
on conflict (activity_template_id)
do update set
  policy_code = excluded.policy_code,
  qr_ttl_seconds = excluded.qr_ttl_seconds,
  requires_checkin = excluded.requires_checkin,
  requires_buyer_confirmation =
    excluded.requires_buyer_confirmation,
  auto_confirm_delay_minutes =
    excluded.auto_confirm_delay_minutes,
  status = excluded.status,
  contract_version =
    greatest(
      public.activity_fulfillment_policies.contract_version,
      excluded.contract_version
    ),
  updated_at = clock_timestamp();

do $pgc10b_seed_guard$
begin
  if not exists (
    select 1
    from public.activity_fulfillment_policies policy
    join public.activity_templates template
      on template.id = policy.activity_template_id
    where template.slug = 'gift-certificate-v1'
      and policy.policy_code = 'gift-certificate-v1'
      and policy.qr_ttl_seconds = 60
      and policy.requires_checkin = true
      and policy.requires_buyer_confirmation = true
      and policy.auto_confirm_delay_minutes = 1440
      and policy.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'PGC10B_GIFT_CERTIFICATE_POLICY_SEED_FAILED';
  end if;
end;
$pgc10b_seed_guard$;

comment on table public.activity_fulfillment_policies is
  'Template-level fulfillment policy. Gift certificates use 60-second one-time QR check-in and 24-hour no-response auto-confirmation.';
comment on table public.activity_fulfillment_qr_sessions is
  'Short-lived one-time buyer QR sessions. Raw QR tokens are never stored.';
comment on table public.activity_fulfillment_checkins is
  'Auditable provider-side buyer arrival records with individual staff identity.';
comment on table public.activity_fulfillment_confirmations is
  'Buyer completion confirmation, dispute, partial-problem, and no-response auto-confirmation state.';
comment on table public.activity_fulfillment_event_log is
  'Immutable fulfillment audit trail for QR, check-in, buyer response, and auto-confirmation events.';

commit;
