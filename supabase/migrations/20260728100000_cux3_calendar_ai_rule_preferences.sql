-- ARCTor.app CUX3
-- Persistent personal calendar AI interpretation rules.
-- Global defaults remain immutable in application source.

create table if not exists public.calendar_ai_rule_preferences (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  locale text not null,
  custom_rule_text text,

  rule_version integer not null default 1,
  updated_by_actor_id uuid not null
    references public.actors(id)
    on delete restrict,

  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint calendar_ai_rule_preferences_owner_locale_key
    unique (owner_user_id, locale),

  constraint calendar_ai_rule_preferences_locale_check
    check (locale in ('en', 'pl', 'ru', 'uk', 'de', 'es', 'cs')),

  constraint calendar_ai_rule_preferences_text_check
    check (
      custom_rule_text is null
      or (
        char_length(btrim(custom_rule_text)) between 1 and 12000
      )
    ),

  constraint calendar_ai_rule_preferences_version_check
    check (rule_version > 0),

  constraint calendar_ai_rule_preferences_metadata_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create table if not exists public.calendar_ai_rule_revisions (
  id uuid primary key default gen_random_uuid(),

  preference_id uuid not null
    references public.calendar_ai_rule_preferences(id)
    on delete cascade,

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  locale text not null,
  rule_version integer not null,
  action_code text not null,
  rule_text text,
  updated_by_actor_id uuid not null
    references public.actors(id)
    on delete restrict,
  created_at timestamptz not null default now(),

  constraint calendar_ai_rule_revisions_version_key
    unique (preference_id, rule_version),

  constraint calendar_ai_rule_revisions_locale_check
    check (locale in ('en', 'pl', 'ru', 'uk', 'de', 'es', 'cs')),

  constraint calendar_ai_rule_revisions_action_check
    check (action_code in ('save_custom', 'restore_default')),

  constraint calendar_ai_rule_revisions_text_check
    check (
      rule_text is null
      or (
        char_length(btrim(rule_text)) between 1 and 12000
      )
    ),

  constraint calendar_ai_rule_revisions_version_check
    check (rule_version > 0)
);

create index if not exists calendar_ai_rule_preferences_owner_idx
  on public.calendar_ai_rule_preferences(owner_user_id, locale);

create index if not exists calendar_ai_rule_revisions_owner_idx
  on public.calendar_ai_rule_revisions(owner_user_id, locale, rule_version desc);

create or replace function public.cux3_prepare_calendar_ai_rule_preference()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if tg_op = 'UPDATE' then
    if new.owner_user_id is distinct from old.owner_user_id
       or new.locale is distinct from old.locale then
      raise exception using
        errcode = '23514',
        message = 'CUX3_RULE_OWNER_AND_LOCALE_IMMUTABLE';
    end if;

    new.rule_version := old.rule_version + 1;
    new.updated_at := now();
  else
    new.rule_version := 1;
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := coalesce(new.updated_at, new.created_at);
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.owner_user_id = new.owner_user_id
      and profile.actor_id = new.updated_by_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'CUX3_RULE_ACTOR_NOT_OWNED_BY_USER';
  end if;

  return new;
end;
$function$;

create or replace function public.cux3_append_calendar_ai_rule_revision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  insert into public.calendar_ai_rule_revisions (
    preference_id,
    owner_user_id,
    locale,
    rule_version,
    action_code,
    rule_text,
    updated_by_actor_id
  )
  values (
    new.id,
    new.owner_user_id,
    new.locale,
    new.rule_version,
    case
      when new.custom_rule_text is null then 'restore_default'
      else 'save_custom'
    end,
    new.custom_rule_text,
    new.updated_by_actor_id
  );

  return new;
end;
$function$;

drop trigger if exists calendar_ai_rule_preferences_prepare_trg
  on public.calendar_ai_rule_preferences;

create trigger calendar_ai_rule_preferences_prepare_trg
before insert or update
on public.calendar_ai_rule_preferences
for each row
execute function public.cux3_prepare_calendar_ai_rule_preference();

drop trigger if exists calendar_ai_rule_preferences_revision_trg
  on public.calendar_ai_rule_preferences;

create trigger calendar_ai_rule_preferences_revision_trg
after insert or update
on public.calendar_ai_rule_preferences
for each row
execute function public.cux3_append_calendar_ai_rule_revision();

alter table public.calendar_ai_rule_preferences enable row level security;
alter table public.calendar_ai_rule_revisions enable row level security;

revoke all on table public.calendar_ai_rule_preferences from anon, authenticated;
revoke all on table public.calendar_ai_rule_revisions from anon, authenticated;

grant select, insert, update, delete
  on table public.calendar_ai_rule_preferences
  to service_role;

grant select, insert
  on table public.calendar_ai_rule_revisions
  to service_role;

comment on table public.calendar_ai_rule_preferences is
'CUX3 current personal calendar AI rule text by app user and locale. NULL custom_rule_text means immutable ARCTor system default.';

comment on table public.calendar_ai_rule_revisions is
'CUX3 append-only revision history for personal calendar AI rule changes and default restores.';

comment on column public.calendar_ai_rule_preferences.locale is
'Content locale. Deterministic fallback is exact locale, then personal English, then localized system default.';
