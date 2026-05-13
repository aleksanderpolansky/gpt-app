begin;

-- Activity Security Foundation
-- Current architecture note:
-- Server API routes currently use SUPABASE_SERVICE_ROLE_KEY and must keep backend ownership checks.
-- These RLS policies protect anon/authenticated direct access and prepare the project for future user-scoped clients.

-- 1. Enable RLS on Activity Layer tables

alter table public.activity_types enable row level security;
alter table public.activity_code_templates enable row level security;
alter table public.activity_events enable row level security;
alter table public.event_links enable row level security;
alter table public.impact_rules enable row level security;
alter table public.impact_events enable row level security;
alter table public.current_snapshots enable row level security;
alter table public.daily_aggregates enable row level security;
alter table public.activity_templates enable row level security;
alter table public.activity_template_links enable row level security;
alter table public.user_activity_shortcuts enable row level security;
alter table public.activity_corrections enable row level security;

-- 2. Private/personal activity data: no direct anon/authenticated access.
-- Access must go through backend API routes with appUser.id ownership checks.

revoke all on table public.activity_events from anon, authenticated;
revoke all on table public.event_links from anon, authenticated;
revoke all on table public.impact_events from anon, authenticated;
revoke all on table public.current_snapshots from anon, authenticated;
revoke all on table public.daily_aggregates from anon, authenticated;
revoke all on table public.activity_corrections from anon, authenticated;
revoke all on table public.user_activity_shortcuts from anon, authenticated;
revoke all on table public.impact_rules from anon, authenticated;

drop policy if exists "No direct public activity events access" on public.activity_events;
create policy "No direct public activity events access"
on public.activity_events
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct public event links access" on public.event_links;
create policy "No direct public event links access"
on public.event_links
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct public impact events access" on public.impact_events;
create policy "No direct public impact events access"
on public.impact_events
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct public current snapshots access" on public.current_snapshots;
create policy "No direct public current snapshots access"
on public.current_snapshots
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct public daily aggregates access" on public.daily_aggregates;
create policy "No direct public daily aggregates access"
on public.daily_aggregates
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct public activity corrections access" on public.activity_corrections;
create policy "No direct public activity corrections access"
on public.activity_corrections
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct public user activity shortcuts access" on public.user_activity_shortcuts;
create policy "No direct public user activity shortcuts access"
on public.user_activity_shortcuts
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No direct public impact rules access" on public.impact_rules;
create policy "No direct public impact rules access"
on public.impact_rules
for all
to anon, authenticated
using (false)
with check (false);

-- 3. Safe system dictionaries: read-only public access for active system/reference data.
-- These tables do not expose personal user activity records.

grant select on table public.activity_types to anon, authenticated;
grant select on table public.activity_code_templates to anon, authenticated;
grant select on table public.activity_templates to anon, authenticated;
grant select on table public.activity_template_links to anon, authenticated;

drop policy if exists "Public can read active activity types" on public.activity_types;
create policy "Public can read active activity types"
on public.activity_types
for select
to anon, authenticated
using (
  status = 'active'
);

drop policy if exists "Public can read active legacy activity code templates" on public.activity_code_templates;
create policy "Public can read active legacy activity code templates"
on public.activity_code_templates
for select
to anon, authenticated
using (
  is_active = true
);

drop policy if exists "Public can read active system activity templates" on public.activity_templates;
create policy "Public can read active system activity templates"
on public.activity_templates
for select
to anon, authenticated
using (
  template_scope = 'system'
  and status = 'active'
  and is_active = true
);

drop policy if exists "Public can read links of active system activity templates" on public.activity_template_links;
create policy "Public can read links of active system activity templates"
on public.activity_template_links
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.activity_templates
    where activity_templates.id = activity_template_links.template_id
      and activity_templates.template_scope = 'system'
      and activity_templates.status = 'active'
      and activity_templates.is_active = true
  )
);

commit;
