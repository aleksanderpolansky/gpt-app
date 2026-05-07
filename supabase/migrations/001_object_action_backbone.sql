begin;

create extension if not exists pgcrypto;

create or replace function set_universal_rubricator_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists object_classes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  status text not null default 'approved',
  source_type text not null default 'system_seed',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint object_classes_code_not_empty
    check (length(trim(code)) > 0),

  constraint object_classes_name_not_empty
    check (length(trim(name)) > 0),

  constraint object_classes_status_allowed
    check (
      status in (
        'draft',
        'suggested',
        'needs_review',
        'approved',
        'published',
        'hidden',
        'flagged',
        'rejected',
        'archived'
      )
    ),

  constraint object_classes_source_type_allowed
    check (
      source_type in (
        'system_seed',
        'manual',
        'ai_suggested',
        'imported',
        'migrated',
        'owner_confirmed',
        'platform_verified'
      )
    )
);

create unique index if not exists object_classes_code_unique_idx
on object_classes (lower(code));

create index if not exists object_classes_status_idx
on object_classes (status);

create index if not exists object_classes_is_active_idx
on object_classes (is_active);

create table if not exists object_types (
  id uuid primary key default gen_random_uuid(),
  object_class_id uuid not null references object_classes(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  status text not null default 'approved',
  source_type text not null default 'system_seed',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint object_types_code_not_empty
    check (length(trim(code)) > 0),

  constraint object_types_name_not_empty
    check (length(trim(name)) > 0),

  constraint object_types_status_allowed
    check (
      status in (
        'draft',
        'suggested',
        'needs_review',
        'approved',
        'published',
        'hidden',
        'flagged',
        'rejected',
        'archived'
      )
    ),

  constraint object_types_source_type_allowed
    check (
      source_type in (
        'system_seed',
        'manual',
        'ai_suggested',
        'imported',
        'migrated',
        'owner_confirmed',
        'platform_verified'
      )
    )
);

create unique index if not exists object_types_code_unique_idx
on object_types (lower(code));

create index if not exists object_types_object_class_id_idx
on object_types (object_class_id);

create index if not exists object_types_status_idx
on object_types (status);

create index if not exists object_types_is_active_idx
on object_types (is_active);

create table if not exists action_types (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  status text not null default 'approved',
  source_type text not null default 'system_seed',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint action_types_code_not_empty
    check (length(trim(code)) > 0),

  constraint action_types_name_not_empty
    check (length(trim(name)) > 0),

  constraint action_types_status_allowed
    check (
      status in (
        'draft',
        'suggested',
        'needs_review',
        'approved',
        'published',
        'hidden',
        'flagged',
        'rejected',
        'archived'
      )
    ),

  constraint action_types_source_type_allowed
    check (
      source_type in (
        'system_seed',
        'manual',
        'ai_suggested',
        'imported',
        'migrated',
        'owner_confirmed',
        'platform_verified'
      )
    )
);

create unique index if not exists action_types_code_unique_idx
on action_types (lower(code));

create index if not exists action_types_status_idx
on action_types (status);

create index if not exists action_types_is_active_idx
on action_types (is_active);

create table if not exists contexts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  status text not null default 'approved',
  source_type text not null default 'system_seed',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint contexts_code_not_empty
    check (length(trim(code)) > 0),

  constraint contexts_name_not_empty
    check (length(trim(name)) > 0),

  constraint contexts_status_allowed
    check (
      status in (
        'draft',
        'suggested',
        'needs_review',
        'approved',
        'published',
        'hidden',
        'flagged',
        'rejected',
        'archived'
      )
    ),

  constraint contexts_source_type_allowed
    check (
      source_type in (
        'system_seed',
        'manual',
        'ai_suggested',
        'imported',
        'migrated',
        'owner_confirmed',
        'platform_verified'
      )
    )
);

create unique index if not exists contexts_code_unique_idx
on contexts (lower(code));

create index if not exists contexts_status_idx
on contexts (status);

create index if not exists contexts_is_active_idx
on contexts (is_active);

create table if not exists object_action_affordances (
  id uuid primary key default gen_random_uuid(),
  object_type_id uuid not null references object_types(id) on delete cascade,
  action_type_id uuid not null references action_types(id) on delete cascade,
  context_id uuid references contexts(id) on delete cascade,
  is_default boolean not null default false,
  status text not null default 'approved',
  source_type text not null default 'system_seed',
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint object_action_affordances_status_allowed
    check (
      status in (
        'draft',
        'suggested',
        'needs_review',
        'approved',
        'published',
        'hidden',
        'flagged',
        'rejected',
        'archived'
      )
    ),

  constraint object_action_affordances_source_type_allowed
    check (
      source_type in (
        'system_seed',
        'manual',
        'ai_suggested',
        'imported',
        'migrated',
        'owner_confirmed',
        'platform_verified'
      )
    )
);

create unique index if not exists object_action_affordances_unique_idx
on object_action_affordances (
  object_type_id,
  action_type_id,
  coalesce(context_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create index if not exists object_action_affordances_object_type_id_idx
on object_action_affordances (object_type_id);

create index if not exists object_action_affordances_action_type_id_idx
on object_action_affordances (action_type_id);

create index if not exists object_action_affordances_context_id_idx
on object_action_affordances (context_id);

create table if not exists contextual_categories (
  id uuid primary key default gen_random_uuid(),
  context_id uuid not null references contexts(id) on delete cascade,
  parent_id uuid references contextual_categories(id) on delete set null,
  slug text not null,
  name text not null,
  description text,
  status text not null default 'approved',
  source_type text not null default 'system_seed',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint contextual_categories_slug_not_empty
    check (length(trim(slug)) > 0),

  constraint contextual_categories_name_not_empty
    check (length(trim(name)) > 0),

  constraint contextual_categories_status_allowed
    check (
      status in (
        'draft',
        'suggested',
        'needs_review',
        'approved',
        'published',
        'hidden',
        'flagged',
        'rejected',
        'archived'
      )
    ),

  constraint contextual_categories_source_type_allowed
    check (
      source_type in (
        'system_seed',
        'manual',
        'ai_suggested',
        'imported',
        'migrated',
        'owner_confirmed',
        'platform_verified'
      )
    )
);

create unique index if not exists contextual_categories_context_slug_unique_idx
on contextual_categories (context_id, lower(slug));

create index if not exists contextual_categories_context_id_idx
on contextual_categories (context_id);

create index if not exists contextual_categories_parent_id_idx
on contextual_categories (parent_id);

create index if not exists contextual_categories_status_idx
on contextual_categories (status);

create index if not exists contextual_categories_is_active_idx
on contextual_categories (is_active);

create table if not exists entity_classifications (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  object_type_id uuid not null references object_types(id) on delete restrict,
  action_type_id uuid references action_types(id) on delete restrict,
  context_id uuid not null references contexts(id) on delete restrict,
  contextual_category_id uuid references contextual_categories(id) on delete restrict,
  classification_role text not null default 'primary',
  is_primary boolean not null default false,
  confidence numeric,
  status text not null default 'approved',
  source_type text not null default 'manual',
  classified_by_user_id uuid,
  evidence_json jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint entity_classifications_entity_type_not_empty
    check (length(trim(entity_type)) > 0),

  constraint entity_classifications_role_allowed
    check (
      classification_role in (
        'primary',
        'secondary',
        'tag',
        'system',
        'ai_suggestion',
        'owner_selected',
        'admin_selected'
      )
    ),

  constraint entity_classifications_confidence_range
    check (
      confidence is null
      or (confidence >= 0 and confidence <= 1)
    ),

  constraint entity_classifications_status_allowed
    check (
      status in (
        'draft',
        'suggested',
        'needs_review',
        'approved',
        'published',
        'hidden',
        'flagged',
        'rejected',
        'archived'
      )
    ),

  constraint entity_classifications_source_type_allowed
    check (
      source_type in (
        'system_seed',
        'manual',
        'ai_suggested',
        'imported',
        'migrated',
        'owner_confirmed',
        'platform_verified'
      )
    )
);

create unique index if not exists entity_classifications_unique_dimension_idx
on entity_classifications (
  lower(entity_type),
  entity_id,
  object_type_id,
  coalesce(action_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
  context_id,
  coalesce(contextual_category_id, '00000000-0000-0000-0000-000000000000'::uuid),
  classification_role
);

create index if not exists entity_classifications_entity_idx
on entity_classifications (lower(entity_type), entity_id);

create index if not exists entity_classifications_object_type_id_idx
on entity_classifications (object_type_id);

create index if not exists entity_classifications_action_type_id_idx
on entity_classifications (action_type_id);

create index if not exists entity_classifications_context_id_idx
on entity_classifications (context_id);

create index if not exists entity_classifications_contextual_category_id_idx
on entity_classifications (contextual_category_id);

create index if not exists entity_classifications_status_idx
on entity_classifications (status);

create index if not exists entity_classifications_is_primary_idx
on entity_classifications (is_primary);

create table if not exists object_type_translations (
  id uuid primary key default gen_random_uuid(),
  object_type_id uuid not null references object_types(id) on delete cascade,
  locale text not null,
  name text not null,
  description text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint object_type_translations_locale_not_empty
    check (length(trim(locale)) > 0),

  constraint object_type_translations_name_not_empty
    check (length(trim(name)) > 0)
);

create unique index if not exists object_type_translations_unique_idx
on object_type_translations (object_type_id, lower(locale));

create table if not exists action_type_translations (
  id uuid primary key default gen_random_uuid(),
  action_type_id uuid not null references action_types(id) on delete cascade,
  locale text not null,
  name text not null,
  description text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint action_type_translations_locale_not_empty
    check (length(trim(locale)) > 0),

  constraint action_type_translations_name_not_empty
    check (length(trim(name)) > 0)
);

create unique index if not exists action_type_translations_unique_idx
on action_type_translations (action_type_id, lower(locale));

create table if not exists context_translations (
  id uuid primary key default gen_random_uuid(),
  context_id uuid not null references contexts(id) on delete cascade,
  locale text not null,
  name text not null,
  description text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint context_translations_locale_not_empty
    check (length(trim(locale)) > 0),

  constraint context_translations_name_not_empty
    check (length(trim(name)) > 0)
);

create unique index if not exists context_translations_unique_idx
on context_translations (context_id, lower(locale));

create table if not exists contextual_category_translations (
  id uuid primary key default gen_random_uuid(),
  contextual_category_id uuid not null references contextual_categories(id) on delete cascade,
  locale text not null,
  name text not null,
  description text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint contextual_category_translations_locale_not_empty
    check (length(trim(locale)) > 0),

  constraint contextual_category_translations_name_not_empty
    check (length(trim(name)) > 0)
);

create unique index if not exists contextual_category_translations_unique_idx
on contextual_category_translations (contextual_category_id, lower(locale));

create table if not exists concept_aliases (
  id uuid primary key default gen_random_uuid(),
  concept_type text not null,
  concept_id uuid not null,
  alias_text text not null,
  alias_normalized text generated always as (lower(btrim(alias_text))) stored,
  locale text,
  status text not null default 'approved',
  source_type text not null default 'system_seed',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint concept_aliases_concept_type_allowed
    check (
      concept_type in (
        'object_class',
        'object_type',
        'action_type',
        'context',
        'contextual_category'
      )
    ),

  constraint concept_aliases_alias_text_not_empty
    check (length(trim(alias_text)) > 0),

  constraint concept_aliases_status_allowed
    check (
      status in (
        'draft',
        'suggested',
        'needs_review',
        'approved',
        'published',
        'hidden',
        'flagged',
        'rejected',
        'archived'
      )
    ),

  constraint concept_aliases_source_type_allowed
    check (
      source_type in (
        'system_seed',
        'manual',
        'ai_suggested',
        'imported',
        'migrated',
        'owner_confirmed',
        'platform_verified'
      )
    )
);

create unique index if not exists concept_aliases_unique_idx
on concept_aliases (
  concept_type,
  concept_id,
  alias_normalized,
  coalesce(lower(locale), '')
);

create index if not exists concept_aliases_lookup_idx
on concept_aliases (alias_normalized);

create index if not exists concept_aliases_concept_idx
on concept_aliases (concept_type, concept_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'object_classes_set_updated_at'
  ) then
    create trigger object_classes_set_updated_at
    before update on object_classes
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'object_types_set_updated_at'
  ) then
    create trigger object_types_set_updated_at
    before update on object_types
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'action_types_set_updated_at'
  ) then
    create trigger action_types_set_updated_at
    before update on action_types
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'contexts_set_updated_at'
  ) then
    create trigger contexts_set_updated_at
    before update on contexts
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'object_action_affordances_set_updated_at'
  ) then
    create trigger object_action_affordances_set_updated_at
    before update on object_action_affordances
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'contextual_categories_set_updated_at'
  ) then
    create trigger contextual_categories_set_updated_at
    before update on contextual_categories
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'entity_classifications_set_updated_at'
  ) then
    create trigger entity_classifications_set_updated_at
    before update on entity_classifications
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'object_type_translations_set_updated_at'
  ) then
    create trigger object_type_translations_set_updated_at
    before update on object_type_translations
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'action_type_translations_set_updated_at'
  ) then
    create trigger action_type_translations_set_updated_at
    before update on action_type_translations
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'context_translations_set_updated_at'
  ) then
    create trigger context_translations_set_updated_at
    before update on context_translations
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'contextual_category_translations_set_updated_at'
  ) then
    create trigger contextual_category_translations_set_updated_at
    before update on contextual_category_translations
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'concept_aliases_set_updated_at'
  ) then
    create trigger concept_aliases_set_updated_at
    before update on concept_aliases
    for each row
    execute function set_universal_rubricator_updated_at();
  end if;
end $$;

commit;