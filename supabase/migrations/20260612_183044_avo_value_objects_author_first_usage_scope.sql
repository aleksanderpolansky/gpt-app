-- GPT-APP / AI-NAVIGATOR
-- AVO STEP 20.13.6R — Author-first Value Object additive migration
-- MODE: MIGRATION FILE PREPARED FOR REVIEW
-- DO NOT EXECUTE WITHOUT EXPLICIT SQL WRITE GATE
--
-- Purpose:
-- Make public.value_objects ready for author-first draft-first flow:
-- /value-objects/new -> choose private/commercial -> create draft -> /value-objects/{id}/edit
--
-- Architectural decision:
-- Value Object remains one universal entity.
-- private/commercial is a usage characteristic, not a hard subtype.
-- organization_id is optional business context and is required by API only for commercial usage.
-- source column remains the existing creation-source-like field for MVP.
--
-- Safety:
-- Additive migration.
-- Does not drop tables.
-- Does not delete data.
-- Does not create hard object subtypes.
-- Does not execute OpenAI.
-- Keeps RLS backend-mediated via service_role.
--
-- IMPORTANT:
-- This migration intentionally does NOT set usage_scope NOT NULL yet.
-- Reason: old API may still insert rows before API patch.
-- The API patch must write usage_scope explicitly.
-- A later cleanup migration can set NOT NULL after all write paths are updated.

begin;

alter table public.value_objects
  add column if not exists usage_scope text,
  add column if not exists created_by_actor_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'value_objects_usage_scope_check'
      and conrelid = 'public.value_objects'::regclass
  ) then
    alter table public.value_objects
      add constraint value_objects_usage_scope_check
      check (
        usage_scope is null
        or usage_scope in ('private', 'commercial')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'value_objects_created_by_actor_id_fkey'
      and conrelid = 'public.value_objects'::regclass
  ) then
    alter table public.value_objects
      add constraint value_objects_created_by_actor_id_fkey
      foreign key (created_by_actor_id)
      references public.actors(id)
      on delete set null;
  end if;
end $$;

update public.value_objects
set usage_scope =
  case
    when organization_id is not null then 'commercial'
    else 'private'
  end
where usage_scope is null;

update public.value_objects
set created_by_actor_id = coalesce(owner_actor_id, actor_id)
where created_by_actor_id is null
  and (
    owner_actor_id is not null
    or actor_id is not null
  );

create index if not exists idx_value_objects_usage_scope
  on public.value_objects(usage_scope);

create index if not exists idx_value_objects_created_by_actor_id
  on public.value_objects(created_by_actor_id);

comment on column public.value_objects.usage_scope is
'Author-first Value Object usage characteristic. Allowed values: private, commercial. This is not a hard object subtype. organization_id is business context for commercial usage only.';

comment on column public.value_objects.created_by_actor_id is
'Actor that originally created this Value Object. For MVP this is usually the current person actor. owner_actor_id remains ownership/scope field.';

comment on column public.value_objects.organization_id is
'Optional organization/business context for commercial Value Objects. Private Value Objects use organization_id = null.';

comment on column public.value_objects.commercial_usage is
'Commercial usage scenario for a Value Object, for example catalog_info or certificate_base. This does not replace usage_scope and does not define the nature/type of the Value Object.';

comment on column public.value_objects.source is
'Existing creation-source-like field. For draft-first manual creation API should write source = manual; activity/category flows can write semantic_candidate or category_candidate.';

-- Keep backend-mediated access explicit.
-- Do not broaden anon/authenticated access in this migration.
grant select, insert, update, delete on table public.value_objects to service_role;

commit;