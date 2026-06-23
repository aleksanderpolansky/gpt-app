-- GPT-APP / AI-NAVIGATOR
-- Step 19G-R15
-- Presence + app user sessions foundation
--
-- Purpose:
--   Add the minimal backend-owned persistence needed for:
--     - app_users.last_seen_at
--     - admin users list presenceStatus
--     - activeSessionsCount / totalSessionsCount
--     - future heartbeat route
--
-- Safety model:
--   This migration must be executed only through an explicit SQL gate.
--   The app should update these fields only from server-side routes.
--   Direct anon/authenticated client access to app_user_sessions is denied.

begin;

alter table public.app_users
  add column if not exists last_seen_at timestamp with time zone;

create index if not exists app_users_last_seen_at_idx
  on public.app_users (last_seen_at desc);

create table if not exists public.app_user_sessions (
  id uuid primary key default gen_random_uuid(),

  app_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  client_session_id_hash text not null,
  user_agent_hash text,

  first_seen_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),

  request_count integer not null default 1,
  status text not null default 'active',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint app_user_sessions_client_session_hash_length
    check (char_length(client_session_id_hash) between 16 and 256),

  constraint app_user_sessions_user_agent_hash_length
    check (
      user_agent_hash is null
      or char_length(user_agent_hash) between 16 and 256
    ),

  constraint app_user_sessions_request_count_non_negative
    check (request_count >= 0),

  constraint app_user_sessions_status_allowed
    check (status in ('active', 'expired', 'revoked')),

  constraint app_user_sessions_time_order
    check (
      first_seen_at <= last_seen_at
      and created_at <= updated_at
    ),

  constraint app_user_sessions_metadata_object
    check (jsonb_typeof(metadata) = 'object'),

  constraint app_user_sessions_user_client_unique
    unique (app_user_id, client_session_id_hash)
);

create index if not exists app_user_sessions_app_user_last_seen_idx
  on public.app_user_sessions (app_user_id, last_seen_at desc);

create index if not exists app_user_sessions_last_seen_idx
  on public.app_user_sessions (last_seen_at desc);

create index if not exists app_user_sessions_status_last_seen_idx
  on public.app_user_sessions (status, last_seen_at desc);

create or replace function public.set_app_user_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_user_sessions_set_updated_at on public.app_user_sessions;

create trigger app_user_sessions_set_updated_at
before update on public.app_user_sessions
for each row
execute function public.set_app_user_sessions_updated_at();

alter table public.app_user_sessions enable row level security;

revoke all on table public.app_user_sessions from anon;
revoke all on table public.app_user_sessions from authenticated;

grant select, insert, update, delete on table public.app_user_sessions to service_role;

drop policy if exists "No direct client access to app_user_sessions" on public.app_user_sessions;

create policy "No direct client access to app_user_sessions"
on public.app_user_sessions
for all
to anon, authenticated
using (false)
with check (false);

comment on column public.app_users.last_seen_at is
  'Server-owned presence timestamp. Used for admin presence summaries. Null means not tracked yet.';

comment on table public.app_user_sessions is
  'Server-owned app user session heartbeat table. Direct client access is denied; server routes update it.';

comment on column public.app_user_sessions.client_session_id_hash is
  'Hash of a browser/session generated clientSessionId. Raw client session IDs must not be stored.';

comment on column public.app_user_sessions.user_agent_hash is
  'Optional hash of normalized user agent. Raw user agent should not be required for MVP analytics.';

commit;
