/*
ARCTor.app — Goal World Constructor
P1A Ontology Kernel Foundation

ADDITIVE FOUNDATION ONLY.

Creates:
- value_object_facet_registry
- value_object_kind_registry
- value_object_definition_versions
- additive ontology columns on value_objects

Does NOT:
- backfill current rows
- reinterpret legacy node_role_code
- reinterpret legacy branch_type_code
- alter gift-certificate/product/service behavior
- execute Goal World runtime
*/

begin;

create table if not exists public.value_object_facet_registry (
  facet_code text primary key,
  title_key text not null,
  description_key text not null,
  display_order integer not null,
  status text not null default 'active',
  version integer not null default 1,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint value_object_facet_registry_code_check
    check (facet_code ~ '^[A-Z][A-Z0-9_]{1,79}$'),

  constraint value_object_facet_registry_status_check
    check (status in ('active', 'inactive')),

  constraint value_object_facet_registry_version_check
    check (version > 0),

  constraint value_object_facet_registry_display_order_check
    check (display_order > 0),

  constraint value_object_facet_registry_metadata_check
    check (jsonb_typeof(metadata_json) = 'object')
);

insert into public.value_object_facet_registry (
  facet_code,
  title_key,
  description_key,
  display_order,
  status,
  version
)
values
  ('DOMAIN',       'valueObject.facet.domain.title',       'valueObject.facet.domain.description',       10, 'active', 1),
  ('ENTITY',       'valueObject.facet.entity.title',       'valueObject.facet.entity.description',       20, 'active', 1),
  ('PROCESS',      'valueObject.facet.process.title',      'valueObject.facet.process.description',      30, 'active', 1),
  ('STATE',        'valueObject.facet.state.title',        'valueObject.facet.state.description',        40, 'active', 1),
  ('RELATIONSHIP', 'valueObject.facet.relationship.title', 'valueObject.facet.relationship.description', 50, 'active', 1),
  ('ROLE',         'valueObject.facet.role.title',         'valueObject.facet.role.description',         60, 'active', 1),
  ('KNOWLEDGE',    'valueObject.facet.knowledge.title',    'valueObject.facet.knowledge.description',    70, 'active', 1),
  ('BEHAVIOR',     'valueObject.facet.behavior.title',     'valueObject.facet.behavior.description',     80, 'active', 1),
  ('CONTEXT',      'valueObject.facet.context.title',      'valueObject.facet.context.description',      90, 'active', 1)
on conflict (facet_code) do update
set
  title_key = excluded.title_key,
  description_key = excluded.description_key,
  display_order = excluded.display_order,
  status = excluded.status,
  version = greatest(public.value_object_facet_registry.version, excluded.version),
  updated_at = now();

create table if not exists public.value_object_kind_registry (
  object_kind_code text primary key,
  facet_code text not null
    references public.value_object_facet_registry(facet_code)
    on update restrict
    on delete restrict,
  title_key text not null,
  description_key text not null,
  allowed_node_roles_json jsonb not null default '["root","intermediate","leaf"]'::jsonb,
  policy_json jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint value_object_kind_registry_code_check
    check (object_kind_code ~ '^[a-z][a-z0-9_]{1,119}$'),

  constraint value_object_kind_registry_roles_check
    check (jsonb_typeof(allowed_node_roles_json) = 'array'),

  constraint value_object_kind_registry_policy_check
    check (jsonb_typeof(policy_json) = 'object'),

  constraint value_object_kind_registry_status_check
    check (status in ('active', 'inactive')),

  constraint value_object_kind_registry_version_check
    check (version > 0)
);

insert into public.value_object_kind_registry (
  object_kind_code,
  facet_code,
  title_key,
  description_key,
  allowed_node_roles_json,
  policy_json,
  status,
  version
)
values
  ('domain_root',              'DOMAIN',       'valueObject.kind.domainRoot.title',              'valueObject.kind.domainRoot.description',              '["root"]'::jsonb,                          '{}'::jsonb, 'active', 1),
  ('generic_entity',           'ENTITY',       'valueObject.kind.genericEntity.title',           'valueObject.kind.genericEntity.description',           '["root","intermediate","leaf"]'::jsonb,    '{}'::jsonb, 'active', 1),
  ('generic_process',          'PROCESS',      'valueObject.kind.genericProcess.title',          'valueObject.kind.genericProcess.description',          '["root","intermediate","leaf"]'::jsonb,    '{}'::jsonb, 'active', 1),
  ('generic_state',            'STATE',        'valueObject.kind.genericState.title',            'valueObject.kind.genericState.description',            '["root","intermediate","leaf"]'::jsonb,    '{}'::jsonb, 'active', 1),
  ('generic_relationship',     'RELATIONSHIP', 'valueObject.kind.genericRelationship.title',     'valueObject.kind.genericRelationship.description',     '["root","intermediate","leaf"]'::jsonb,    '{}'::jsonb, 'active', 1),
  ('generic_role',             'ROLE',         'valueObject.kind.genericRole.title',             'valueObject.kind.genericRole.description',             '["root","intermediate","leaf"]'::jsonb,    '{}'::jsonb, 'active', 1),
  ('generic_knowledge',        'KNOWLEDGE',    'valueObject.kind.genericKnowledge.title',        'valueObject.kind.genericKnowledge.description',        '["root","intermediate","leaf"]'::jsonb,    '{}'::jsonb, 'active', 1),
  ('generic_behavior',         'BEHAVIOR',     'valueObject.kind.genericBehavior.title',         'valueObject.kind.genericBehavior.description',         '["root","intermediate","leaf"]'::jsonb,    '{}'::jsonb, 'active', 1),
  ('generic_context',          'CONTEXT',      'valueObject.kind.genericContext.title',          'valueObject.kind.genericContext.description',          '["root","intermediate","leaf"]'::jsonb,    '{}'::jsonb, 'active', 1),
  ('anatomical_structure',     'ENTITY',       'valueObject.kind.anatomicalStructure.title',     'valueObject.kind.anatomicalStructure.description',     '["root","intermediate","leaf"]'::jsonb,    '{}'::jsonb, 'active', 1),
  ('professional_role',        'ROLE',         'valueObject.kind.professionalRole.title',        'valueObject.kind.professionalRole.description',        '["intermediate","leaf"]'::jsonb,           '{}'::jsonb, 'active', 1),
  ('knowledge_item',           'KNOWLEDGE',    'valueObject.kind.knowledgeItem.title',           'valueObject.kind.knowledgeItem.description',           '["intermediate","leaf"]'::jsonb,           '{}'::jsonb, 'active', 1),
  ('behavior_pattern',         'BEHAVIOR',     'valueObject.kind.behaviorPattern.title',         'valueObject.kind.behaviorPattern.description',         '["intermediate","leaf"]'::jsonb,           '{}'::jsonb, 'active', 1),
  ('state_observation',        'STATE',        'valueObject.kind.stateObservation.title',        'valueObject.kind.stateObservation.description',        '["intermediate","leaf"]'::jsonb,           '{}'::jsonb, 'active', 1),
  ('relationship_observation', 'RELATIONSHIP', 'valueObject.kind.relationshipObservation.title', 'valueObject.kind.relationshipObservation.description', '["intermediate","leaf"]'::jsonb,           '{}'::jsonb, 'active', 1),
  ('context_observation',      'CONTEXT',      'valueObject.kind.contextObservation.title',      'valueObject.kind.contextObservation.description',      '["intermediate","leaf"]'::jsonb,           '{}'::jsonb, 'active', 1),
  ('product_type',             'ENTITY',       'valueObject.kind.productType.title',             'valueObject.kind.productType.description',             '["leaf"]'::jsonb,                          '{"legacy_compatible":true}'::jsonb, 'active', 1),
  ('service_type',             'PROCESS',      'valueObject.kind.serviceType.title',             'valueObject.kind.serviceType.description',             '["leaf"]'::jsonb,                          '{"legacy_compatible":true}'::jsonb, 'active', 1),
  ('activity_pattern',         'PROCESS',      'valueObject.kind.activityPattern.title',         'valueObject.kind.activityPattern.description',         '["leaf"]'::jsonb,                          '{"legacy_compatible":true}'::jsonb, 'active', 1)
on conflict (object_kind_code) do update
set
  facet_code = excluded.facet_code,
  title_key = excluded.title_key,
  description_key = excluded.description_key,
  allowed_node_roles_json = excluded.allowed_node_roles_json,
  policy_json = excluded.policy_json,
  status = excluded.status,
  version = greatest(public.value_object_kind_registry.version, excluded.version),
  updated_at = now();

alter table public.value_objects
  add column if not exists canonical_key text,
  add column if not exists facet_code text,
  add column if not exists object_kind_code text,
  add column if not exists ontology_node_role_code text,
  add column if not exists hierarchy_relation_code text,
  add column if not exists scope_code text,
  add column if not exists visibility_code text,
  add column if not exists privacy_class_code text,
  add column if not exists definition_version integer,
  add column if not exists origin_type_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_canonical_key_p1a_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_canonical_key_p1a_check
      check (
        canonical_key is null
        or canonical_key ~ '^[a-z][a-z0-9_.:-]{2,239}$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_facet_code_p1a_fkey'
  ) then
    alter table public.value_objects
      add constraint value_objects_facet_code_p1a_fkey
      foreign key (facet_code)
      references public.value_object_facet_registry(facet_code)
      on update restrict
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_object_kind_code_p1a_fkey'
  ) then
    alter table public.value_objects
      add constraint value_objects_object_kind_code_p1a_fkey
      foreign key (object_kind_code)
      references public.value_object_kind_registry(object_kind_code)
      on update restrict
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_ontology_node_role_p1a_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_ontology_node_role_p1a_check
      check (
        ontology_node_role_code is null
        or ontology_node_role_code in ('root', 'intermediate', 'leaf')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_hierarchy_relation_p1a_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_hierarchy_relation_p1a_check
      check (
        hierarchy_relation_code is null
        or hierarchy_relation_code in ('is_a', 'part_of', 'aspect_of', 'subprocess_of')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_scope_code_p1a_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_scope_code_p1a_check
      check (
        scope_code is null
        or scope_code in ('global', 'actor')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_visibility_code_p1a_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_visibility_code_p1a_check
      check (
        visibility_code is null
        or visibility_code in ('private', 'shared', 'public')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_privacy_class_p1a_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_privacy_class_p1a_check
      check (
        privacy_class_code is null
        or privacy_class_code in ('public_ontology', 'standard', 'sensitive', 'restricted')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_definition_version_p1a_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_definition_version_p1a_check
      check (
        definition_version is null
        or definition_version > 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_origin_type_p1a_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_origin_type_p1a_check
      check (
        origin_type_code is null
        or origin_type_code in (
          'system_model',
          'expert_model',
          'user_declared',
          'ai_candidate',
          'imported_standard',
          'legacy'
        )
      );
  end if;
end
$$;

create index if not exists value_objects_p1a_facet_idx
  on public.value_objects(facet_code)
  where facet_code is not null;

create index if not exists value_objects_p1a_kind_idx
  on public.value_objects(object_kind_code)
  where object_kind_code is not null;

create index if not exists value_objects_p1a_semantic_role_idx
  on public.value_objects(ontology_node_role_code)
  where ontology_node_role_code is not null;

create index if not exists value_objects_p1a_canonical_key_idx
  on public.value_objects(canonical_key)
  where canonical_key is not null;

create table if not exists public.value_object_definition_versions (
  id uuid primary key default gen_random_uuid(),
  value_object_id uuid not null
    references public.value_objects(id)
    on delete cascade,
  version integer not null,

  canonical_key text not null,
  title text not null,
  description text,

  facet_code text not null
    references public.value_object_facet_registry(facet_code)
    on update restrict
    on delete restrict,

  object_kind_code text not null
    references public.value_object_kind_registry(object_kind_code)
    on update restrict
    on delete restrict,

  node_role_code text not null,
  parent_value_object_id uuid
    references public.value_objects(id)
    on delete restrict,
  root_value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,
  hierarchy_relation_code text,

  scope_code text not null,
  owner_actor_id uuid
    references public.actors(id)
    on delete set null,

  status_code text not null,
  visibility_code text not null,
  privacy_class_code text not null,
  origin_type_code text not null,

  valid_from timestamptz,
  valid_to timestamptz,

  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,

  definition_snapshot_json jsonb not null default '{}'::jsonb,
  source_context text,
  created_at timestamptz not null default now(),

  constraint value_object_definition_versions_version_check
    check (version > 0),

  constraint value_object_definition_versions_node_role_check
    check (node_role_code in ('root', 'intermediate', 'leaf')),

  constraint value_object_definition_versions_hierarchy_relation_check
    check (
      hierarchy_relation_code is null
      or hierarchy_relation_code in ('is_a', 'part_of', 'aspect_of', 'subprocess_of')
    ),

  constraint value_object_definition_versions_scope_check
    check (scope_code in ('global', 'actor')),

  constraint value_object_definition_versions_status_check
    check (status_code in ('candidate', 'draft', 'active', 'inactive', 'retired')),

  constraint value_object_definition_versions_visibility_check
    check (visibility_code in ('private', 'shared', 'public')),

  constraint value_object_definition_versions_privacy_check
    check (privacy_class_code in ('public_ontology', 'standard', 'sensitive', 'restricted')),

  constraint value_object_definition_versions_origin_check
    check (
      origin_type_code in (
        'system_model',
        'expert_model',
        'user_declared',
        'ai_candidate',
        'imported_standard',
        'legacy'
      )
    ),

  constraint value_object_definition_versions_snapshot_check
    check (jsonb_typeof(definition_snapshot_json) = 'object'),

  constraint value_object_definition_versions_valid_interval_check
    check (valid_to is null or valid_from is null or valid_to >= valid_from),

  constraint value_object_definition_versions_series_unique
    unique (value_object_id, version)
);

create index if not exists value_object_definition_versions_object_created_idx
  on public.value_object_definition_versions(value_object_id, created_at desc);

alter table public.value_object_facet_registry enable row level security;
alter table public.value_object_kind_registry enable row level security;
alter table public.value_object_definition_versions enable row level security;

drop policy if exists value_object_facet_registry_read_all_p1a
  on public.value_object_facet_registry;

create policy value_object_facet_registry_read_all_p1a
  on public.value_object_facet_registry
  for select
  to anon, authenticated
  using (status = 'active');

drop policy if exists value_object_kind_registry_read_all_p1a
  on public.value_object_kind_registry;

create policy value_object_kind_registry_read_all_p1a
  on public.value_object_kind_registry
  for select
  to anon, authenticated
  using (status = 'active');

revoke insert, update, delete, truncate, references, trigger
  on table public.value_object_facet_registry
  from anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
  on table public.value_object_kind_registry
  from anon, authenticated;

revoke all
  on table public.value_object_definition_versions
  from public, anon, authenticated;

grant select
  on table public.value_object_facet_registry,
           public.value_object_kind_registry
  to anon, authenticated;

grant all
  on table public.value_object_facet_registry,
           public.value_object_kind_registry,
           public.value_object_definition_versions
  to service_role;

comment on table public.value_object_facet_registry is
'Goal World P1 ontology facet registry. Old value_object_branch_types is legacy runtime storage and is not the new facet router.';

comment on table public.value_object_kind_registry is
'Goal World P1 object-kind policy registry. Ambiguous legacy object kinds are not auto-mapped by P1A.';

comment on table public.value_object_definition_versions is
'Goal World P1 immutable definition snapshot ledger. Automatic snapshot lifecycle is activated only after controlled runtime cutover.';

comment on column public.value_objects.ontology_node_role_code is
'Goal World P1 semantic node role root/intermediate/leaf. Legacy node_role_code remains structural/activity_leaf until controlled cutover.';

commit;
