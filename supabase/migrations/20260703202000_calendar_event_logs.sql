begin;

-- Calendar Event Logs
-- Append-oriented user-facing log for calendar event actions.
-- This table records actions such as created, updated, cancelled and restored.
-- Server routes use service role and keep backend ownership checks.
-- Direct anon/authenticated access remains blocked by RLS.

create table if not exists public.calendar_event_logs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.app_users(id) on delete cascade,
  calendar_event_id uuid references public.calendar_events(id) on delete set null,
  actor_id uuid references public.actors(id) on delete set null,

  actor_name text,
  actor_email text,

  action text not null,
  event_title text not null,
  event_start_time timestamptz,
  event_end_time timestamptz,
  event_status text,

  event_snapshot jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint calendar_event_logs_action_check
    check (action in ('created', 'updated', 'cancelled', 'restored'))
);

create index if not exists calendar_event_logs_user_created_at_idx
  on public.calendar_event_logs(user_id, created_at desc);

create index if not exists calendar_event_logs_event_created_at_idx
  on public.calendar_event_logs(calendar_event_id, created_at desc);

alter table public.calendar_event_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_event_logs'
      and policyname = 'calendar_event_logs_block_direct_access'
  ) then
    create policy calendar_event_logs_block_direct_access
      on public.calendar_event_logs
      for all
      using (false)
      with check (false);
  end if;
end $$;

commit;
