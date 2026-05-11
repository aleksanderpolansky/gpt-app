-- 013_activity_templates_v2.sql
-- Activity Recording Layer v2
-- Template-first model without fixed global codes as the public architecture.
--
-- This migration does not remove or rename activity_code_templates.
-- activity_code_templates remains a legacy / compatibility layer from migration 012.
--
-- New v2 model:
-- activity_templates          = understandable reusable activity capture templates
-- activity_template_links     = default semantic links for templates
-- user_activity_shortcuts     = optional user/system shortcuts, aliases, buttons, NFC tags, voice phrases, legacy codes
--
-- Main rule:
-- The user should not need to remember global numeric codes.
-- A code such as 11-341 can exist only as an optional shortcut, not as the main UX model.

create extension if not exists "pgcrypto";

create or replace function public.set_activity_recording_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.activity_templates (
  id uuid primary key default gen_random_uuid(),

  legacy_activity_code_template_id uuid
    references public.activity_code_templates(id)
    on delete set null,

  owner_user_id uuid
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid
    references public.actors(id)
    on delete set null,

  organization_id uuid
    references public.organizations(id)
    on delete cascade,

  slug text not null,
  title text not null,
  short_title text,
  description text,

  template_group text not null default 'general',

  template_scope text not null default 'system',
  visibility text not null default 'private',
  source_type text not null default 'system_seed',
  status text not null default 'active',

  default_activity_type_id uuid
    references public.activity_types(id)
    on delete set null,

  default_duration_minutes integer,
  quick_duration_minutes integer[] not null default '{}'::integer[],

  default_status text not null default 'completed',
  default_source_type text not null default 'manual_form',
  default_privacy_scope text not null default 'private',

  icon_key text,
  color_key text,

  show_in_quick_capture boolean not null default true,
  show_in_onboarding boolean not null default false,
  allow_manual_duration boolean not null default true,
  allow_comment boolean not null default true,
  allow_started_at_override boolean not null default true,
  allow_ended_at_override boolean not null default true,

  input_schema_json jsonb not null default '{}'::jsonb,
  ui_schema_json jsonb not null default '{}'::jsonb,
  default_metadata_json jsonb not null default '{}'::jsonb,

  sort_order integer not null default 100,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activity_templates_slug_not_empty_check
    check (length(trim(slug)) > 0),

  constraint activity_templates_title_not_empty_check
    check (length(trim(title)) > 0),

  constraint activity_templates_template_scope_check
    check (template_scope in ('system', 'user', 'organization')),

  constraint activity_templates_visibility_check
    check (visibility in ('private', 'shared_with_org', 'public_template', 'public')),

  constraint activity_templates_source_type_check
    check (
      source_type in (
        'system_seed',
        'user_created',
        'organization_created',
        'ai_suggested',
        'imported',
        'legacy_migration'
      )
    ),

  constraint activity_templates_status_check
    check (
      status in (
        'draft',
        'suggested',
        'active',
        'inactive',
        'archived',
        'rejected'
      )
    ),

  constraint activity_templates_default_duration_check
    check (default_duration_minutes is null or default_duration_minutes >= 0),

  constraint activity_templates_default_status_check
    check (
      default_status in (
        'draft',
        'planned',
        'started',
        'paused',
        'completed',
        'cancelled',
        'missed',
        'corrected',
        'imported_pending',
        'archived'
      )
    ),

  constraint activity_templates_default_source_type_check
    check (
      default_source_type in (
        'manual_form',
        'manual_chat',
        'voice_input',
        'app_action',
        'system_event',
        'api_webhook',
        'nfc_sensor',
        'wearable_import',
        'calendar_import',
        'ai_suggested',
        'legacy_code'
      )
    ),

  constraint activity_templates_default_privacy_scope_check
    check (default_privacy_scope in ('private', 'shared_with_org', 'public_masked', 'public')),

  constraint activity_templates_scope_owner_check
    check (
      (template_scope = 'system' and owner_user_id is null and organization_id is null)
      or
      (template_scope = 'user' and owner_user_id is not null)
      or
      (template_scope = 'organization' and organization_id is not null)
    )
);

drop trigger if exists trg_activity_templates_updated_at on public.activity_templates;

create trigger trg_activity_templates_updated_at
before update on public.activity_templates
for each row
execute function public.set_activity_recording_updated_at();

create unique index if not exists idx_activity_templates_system_slug_unique
on public.activity_templates(slug)
where template_scope = 'system'
  and owner_user_id is null
  and organization_id is null;

create unique index if not exists idx_activity_templates_user_slug_unique
on public.activity_templates(owner_user_id, slug)
where template_scope = 'user'
  and owner_user_id is not null;

create unique index if not exists idx_activity_templates_org_slug_unique
on public.activity_templates(organization_id, slug)
where template_scope = 'organization'
  and organization_id is not null;

create index if not exists idx_activity_templates_scope_active
on public.activity_templates(template_scope, is_active, status);

create index if not exists idx_activity_templates_owner_user
on public.activity_templates(owner_user_id);

create index if not exists idx_activity_templates_organization
on public.activity_templates(organization_id);

create index if not exists idx_activity_templates_activity_type
on public.activity_templates(default_activity_type_id);

create index if not exists idx_activity_templates_legacy_code_template
on public.activity_templates(legacy_activity_code_template_id);

create table if not exists public.activity_template_links (
  id uuid primary key default gen_random_uuid(),

  template_id uuid not null
    references public.activity_templates(id)
    on delete cascade,

  linked_entity_type text not null,
  linked_entity_id uuid,
  linked_entity_key text,

  link_role text not null,
  relation_type text not null default 'related_to',

  default_weight numeric(10,4) not null default 1,
  default_confidence numeric(5,4) not null default 1,

  source_type text not null default 'template',
  is_required boolean not null default false,
  is_active boolean not null default true,

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activity_template_links_entity_presence_check
    check (linked_entity_id is not null or linked_entity_key is not null),

  constraint activity_template_links_confidence_check
    check (default_confidence >= 0 and default_confidence <= 1),

  constraint activity_template_links_weight_check
    check (default_weight >= 0),

  constraint activity_template_links_source_type_check
    check (
      source_type in (
        'template',
        'system_seed',
        'user_created',
        'organization_created',
        'ai_suggested',
        'legacy_migration',
        'imported'
      )
    )
);

drop trigger if exists trg_activity_template_links_updated_at on public.activity_template_links;

create trigger trg_activity_template_links_updated_at
before update on public.activity_template_links
for each row
execute function public.set_activity_recording_updated_at();

create index if not exists idx_activity_template_links_template_id
on public.activity_template_links(template_id);

create index if not exists idx_activity_template_links_entity
on public.activity_template_links(linked_entity_type, linked_entity_id);

create index if not exists idx_activity_template_links_entity_key
on public.activity_template_links(linked_entity_type, linked_entity_key);

create index if not exists idx_activity_template_links_role
on public.activity_template_links(template_id, link_role, relation_type);

create table if not exists public.user_activity_shortcuts (
  id uuid primary key default gen_random_uuid(),

  user_id uuid
    references public.app_users(id)
    on delete cascade,

  template_id uuid not null
    references public.activity_templates(id)
    on delete cascade,

  shortcut_scope text not null default 'user',
  shortcut_type text not null,
  shortcut_value text not null,

  label text,
  description text,

  is_favorite boolean not null default false,
  show_in_default_ui boolean not null default true,
  is_deprecated_alias boolean not null default false,

  nfc_tag_id text,
  voice_phrase text,
  device_binding text,

  sort_order integer not null default 100,
  is_active boolean not null default true,

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_activity_shortcuts_value_not_empty_check
    check (length(trim(shortcut_value)) > 0),

  constraint user_activity_shortcuts_scope_check
    check (shortcut_scope in ('system', 'user')),

  constraint user_activity_shortcuts_scope_user_check
    check (
      (shortcut_scope = 'system' and user_id is null)
      or
      (shortcut_scope = 'user' and user_id is not null)
    ),

  constraint user_activity_shortcuts_type_check
    check (
      shortcut_type in (
        'button',
        'alias',
        'phrase',
        'voice_phrase',
        'legacy_code',
        'nfc_tag',
        'api_alias',
        'favorite',
        'quick_repeat'
      )
    )
);

drop trigger if exists trg_user_activity_shortcuts_updated_at on public.user_activity_shortcuts;

create trigger trg_user_activity_shortcuts_updated_at
before update on public.user_activity_shortcuts
for each row
execute function public.set_activity_recording_updated_at();

create unique index if not exists idx_user_activity_shortcuts_system_unique
on public.user_activity_shortcuts(shortcut_type, shortcut_value)
where shortcut_scope = 'system'
  and is_active = true;

create unique index if not exists idx_user_activity_shortcuts_user_unique
on public.user_activity_shortcuts(user_id, shortcut_type, shortcut_value)
where shortcut_scope = 'user'
  and is_active = true;

create index if not exists idx_user_activity_shortcuts_template_id
on public.user_activity_shortcuts(template_id);

create index if not exists idx_user_activity_shortcuts_user_id
on public.user_activity_shortcuts(user_id);

create index if not exists idx_user_activity_shortcuts_favorite
on public.user_activity_shortcuts(user_id, is_favorite, is_active);

do $$
declare
  v_activity_type_id uuid;
  v_legacy_template_id uuid;
  v_template_id uuid;
  v_existing_template_id uuid;
begin
  select id
  into v_activity_type_id
  from public.activity_types
  where code = 'handwriting'
  limit 1;

  if v_activity_type_id is null then
    raise exception 'Required activity type "handwriting" not found. Run 012_activity_recording_backbone.sql first.';
  end if;

  select id
  into v_legacy_template_id
  from public.activity_code_templates
  where code = '11-341'
  limit 1;

  select id
  into v_existing_template_id
  from public.activity_templates
  where slug = 'german-marketing-handwriting-practice'
    and template_scope = 'system'
    and owner_user_id is null
    and organization_id is null
  limit 1;

  if v_existing_template_id is null then
    insert into public.activity_templates (
      legacy_activity_code_template_id,
      owner_user_id,
      owner_actor_id,
      organization_id,
      slug,
      title,
      short_title,
      description,
      template_group,
      template_scope,
      visibility,
      source_type,
      status,
      default_activity_type_id,
      default_duration_minutes,
      quick_duration_minutes,
      default_status,
      default_source_type,
      default_privacy_scope,
      icon_key,
      color_key,
      show_in_quick_capture,
      show_in_onboarding,
      allow_manual_duration,
      allow_comment,
      allow_started_at_override,
      allow_ended_at_override,
      input_schema_json,
      ui_schema_json,
      default_metadata_json,
      sort_order,
      is_active
    )
    values (
      v_legacy_template_id,
      null,
      null,
      null,
      'german-marketing-handwriting-practice',
      'German marketing handwriting practice',
      'DE marketing writing',
      'Template for recording German marketing writing practice by hand. The user chooses this as a clear template; numeric code 11-341 is only a hidden legacy shortcut.',
      'learning',
      'system',
      'private',
      'system_seed',
      'active',
      v_activity_type_id,
      25,
      array[15, 25, 45]::integer[],
      'completed',
      'manual_form',
      'private',
      'pen-line',
      'blue',
      true,
      true,
      true,
      true,
      true,
      true,
      '{
        "required": ["durationMinutes"],
        "optional": ["comment", "startedAt", "endedAt"],
        "fields": {
          "durationMinutes": {
            "type": "number",
            "label": "Duration",
            "unit": "minutes",
            "default": 25
          },
          "comment": {
            "type": "string",
            "label": "Comment",
            "placeholder": "коммерческое письмо"
          }
        }
      }'::jsonb,
      '{
        "cardTitle": "German marketing handwriting practice",
        "cardSubtitle": "Writing by hand: German + marketing + attention + wrist load",
        "primaryButtonLabel": "Record activity",
        "quickDurations": [15, 25, 45],
        "showShortcutAsAdvanced": true
      }'::jsonb,
      '{
        "mvp_seed": true,
        "v2_template_first": true,
        "known_legacy_code": "11-341",
        "legacy_code_is_public_primary_ux": false,
        "ai_required": false,
        "example_manual_form": {
          "templateSlug": "german-marketing-handwriting-practice",
          "durationMinutes": 25,
          "comment": "коммерческое письмо"
        }
      }'::jsonb,
      10,
      true
    )
    returning id into v_template_id;
  else
    update public.activity_templates
    set
      legacy_activity_code_template_id = v_legacy_template_id,
      title = 'German marketing handwriting practice',
      short_title = 'DE marketing writing',
      description = 'Template for recording German marketing writing practice by hand. The user chooses this as a clear template; numeric code 11-341 is only a hidden legacy shortcut.',
      template_group = 'learning',
      visibility = 'private',
      source_type = 'system_seed',
      status = 'active',
      default_activity_type_id = v_activity_type_id,
      default_duration_minutes = 25,
      quick_duration_minutes = array[15, 25, 45]::integer[],
      default_status = 'completed',
      default_source_type = 'manual_form',
      default_privacy_scope = 'private',
      icon_key = 'pen-line',
      color_key = 'blue',
      show_in_quick_capture = true,
      show_in_onboarding = true,
      allow_manual_duration = true,
      allow_comment = true,
      allow_started_at_override = true,
      allow_ended_at_override = true,
      input_schema_json = '{
        "required": ["durationMinutes"],
        "optional": ["comment", "startedAt", "endedAt"],
        "fields": {
          "durationMinutes": {
            "type": "number",
            "label": "Duration",
            "unit": "minutes",
            "default": 25
          },
          "comment": {
            "type": "string",
            "label": "Comment",
            "placeholder": "коммерческое письмо"
          }
        }
      }'::jsonb,
      ui_schema_json = '{
        "cardTitle": "German marketing handwriting practice",
        "cardSubtitle": "Writing by hand: German + marketing + attention + wrist load",
        "primaryButtonLabel": "Record activity",
        "quickDurations": [15, 25, 45],
        "showShortcutAsAdvanced": true
      }'::jsonb,
      default_metadata_json = '{
        "mvp_seed": true,
        "v2_template_first": true,
        "known_legacy_code": "11-341",
        "legacy_code_is_public_primary_ux": false,
        "ai_required": false,
        "example_manual_form": {
          "templateSlug": "german-marketing-handwriting-practice",
          "durationMinutes": 25,
          "comment": "коммерческое письмо"
        }
      }'::jsonb,
      sort_order = 10,
      is_active = true,
      updated_at = now()
    where id = v_existing_template_id
    returning id into v_template_id;
  end if;

  delete from public.activity_template_links
  where template_id = v_template_id;

  insert into public.activity_template_links (
    template_id,
    linked_entity_type,
    linked_entity_id,
    linked_entity_key,
    link_role,
    relation_type,
    default_weight,
    default_confidence,
    source_type,
    is_required,
    is_active,
    metadata_json
  )
  values
    (
      v_template_id,
      'value_object',
      null,
      'german_marketing_writing_practice',
      'primary_value_object',
      'creates_or_improves',
      1,
      1,
      'system_seed',
      true,
      true,
      '{"title":"German marketing writing practice"}'::jsonb
    ),
    (
      v_template_id,
      'context',
      null,
      'learning',
      'context',
      'in_context',
      1,
      1,
      'system_seed',
      true,
      true,
      '{}'::jsonb
    ),
    (
      v_template_id,
      'context',
      null,
      'marketing',
      'context',
      'in_context',
      1,
      1,
      'system_seed',
      true,
      true,
      '{}'::jsonb
    ),
    (
      v_template_id,
      'context',
      null,
      'career',
      'context',
      'in_context',
      1,
      1,
      'system_seed',
      false,
      true,
      '{}'::jsonb
    ),
    (
      v_template_id,
      'context',
      null,
      'productive_development',
      'context',
      'in_context',
      1,
      1,
      'system_seed',
      false,
      true,
      '{}'::jsonb
    ),
    (
      v_template_id,
      'observed_object',
      null,
      'german_skill',
      'observed_object',
      'improves',
      1,
      1,
      'system_seed',
      true,
      true,
      '{}'::jsonb
    ),
    (
      v_template_id,
      'observed_object',
      null,
      'marketing_skill',
      'observed_object',
      'improves',
      1,
      1,
      'system_seed',
      true,
      true,
      '{}'::jsonb
    ),
    (
      v_template_id,
      'observed_object',
      null,
      'right_hand',
      'observed_object',
      'loads',
      1,
      1,
      'system_seed',
      false,
      true,
      '{}'::jsonb
    ),
    (
      v_template_id,
      'observed_object',
      null,
      'wrist',
      'observed_object',
      'loads',
      1,
      1,
      'system_seed',
      false,
      true,
      '{}'::jsonb
    ),
    (
      v_template_id,
      'observed_object',
      null,
      'attention',
      'observed_object',
      'uses',
      1,
      1,
      'system_seed',
      false,
      true,
      '{"cognitive_load":"medium"}'::jsonb
    );

  update public.user_activity_shortcuts
  set
    template_id = v_template_id,
    label = 'Legacy shortcut 11-341',
    description = 'Legacy personal-code style shortcut retained for compatibility. It is not the public primary UX.',
    show_in_default_ui = false,
    is_deprecated_alias = true,
    sort_order = 999,
    is_active = true,
    metadata_json = '{
      "legacy": true,
      "v2_role": "optional_shortcut_only",
      "do_not_use_as_public_primary_ux": true
    }'::jsonb,
    updated_at = now()
  where shortcut_scope = 'system'
    and shortcut_type = 'legacy_code'
    and shortcut_value = '11-341';

  if not found then
    insert into public.user_activity_shortcuts (
      user_id,
      template_id,
      shortcut_scope,
      shortcut_type,
      shortcut_value,
      label,
      description,
      is_favorite,
      show_in_default_ui,
      is_deprecated_alias,
      sort_order,
      is_active,
      metadata_json
    )
    values (
      null,
      v_template_id,
      'system',
      'legacy_code',
      '11-341',
      'Legacy shortcut 11-341',
      'Legacy personal-code style shortcut retained for compatibility. It is not the public primary UX.',
      false,
      false,
      true,
      999,
      true,
      '{
        "legacy": true,
        "v2_role": "optional_shortcut_only",
        "do_not_use_as_public_primary_ux": true
      }'::jsonb
    );
  end if;
end;
$$;

comment on table public.activity_templates is
'Activity Recording Layer v2 templates. User-friendly template-first model for recording activities without requiring fixed global numeric codes.';

comment on table public.activity_template_links is
'Default semantic links for activity_templates: value objects, contexts, observed objects, actors or future source-of-agency hypotheses.';

comment on table public.user_activity_shortcuts is
'Optional shortcuts for activity templates: aliases, buttons, favorite actions, voice phrases, NFC tags, API aliases or legacy numeric codes. Codes are not the public primary architecture.';

comment on column public.activity_templates.legacy_activity_code_template_id is
'Compatibility link to activity_code_templates from migration 012. Do not use as the public primary template model.';

comment on column public.user_activity_shortcuts.is_deprecated_alias is
'Marks legacy shortcuts such as 11-341 that are retained for compatibility but should not be presented as the main UX.';