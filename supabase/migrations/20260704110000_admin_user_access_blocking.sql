begin;

alter table public.app_users
  add column if not exists access_status text not null default 'active';

alter table public.app_users
  add column if not exists access_blocked_at timestamp with time zone;

alter table public.app_users
  add column if not exists access_blocked_by_admin_user_id uuid
  references public.app_users(id) on delete set null;

alter table public.app_users
  add column if not exists access_block_reason text;

alter table public.app_users
  add column if not exists access_unblocked_at timestamp with time zone;

alter table public.app_users
  add column if not exists access_unblocked_by_admin_user_id uuid
  references public.app_users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_access_status_allowed'
      and conrelid = 'public.app_users'::regclass
  ) then
    alter table public.app_users
      add constraint app_users_access_status_allowed
      check (access_status in ('active', 'blocked'));
  end if;
end $$;

create index if not exists app_users_access_status_idx
  on public.app_users(access_status);

create index if not exists app_users_access_blocked_at_idx
  on public.app_users(access_blocked_at desc)
  where access_status = 'blocked';

update public.app_users
set
  access_status = 'active',
  access_blocked_at = null,
  access_blocked_by_admin_user_id = null,
  access_block_reason = null
where lower(coalesce(email, '')) in (
  'alexanderpolansky@gmail.com',
  'aleksanderpolansky@gmail.com'
);

comment on column public.app_users.access_status is
  'Admin moderation access status. active allows normal use; blocked denies app sync/heartbeat and should be treated as blocked access.';

comment on column public.app_users.access_block_reason is
  'Admin-provided reason for blocking a user account.';

comment on column public.app_users.access_blocked_by_admin_user_id is
  'Admin app_users.id that blocked this account. Protected owner accounts must never be blocked.';

commit;