begin;

create or replace view public_contextual_categories
with (security_invoker = true)
as
select
  contextual_categories.id as category_id,
  contextual_categories.context_id,
  contexts.code as context_code,
  contexts.name as context_default_name,
  contextual_categories.parent_id,
  parent_categories.slug as parent_slug,
  parent_categories.name as parent_default_name,
  contextual_categories.slug as category_slug,
  contextual_categories.name as category_default_name,
  contextual_categories.description as category_default_description,
  contextual_categories.status,
  contextual_categories.source_type,
  contextual_categories.sort_order,
  contextual_categories.is_active,
  contextual_categories.created_at,
  contextual_categories.updated_at
from contextual_categories
join contexts
  on contexts.id = contextual_categories.context_id
left join contextual_categories parent_categories
  on parent_categories.id = contextual_categories.parent_id
where contextual_categories.is_active = true
  and contextual_categories.status in ('approved', 'published')
  and contexts.is_active = true
  and contexts.status in ('approved', 'published');

create or replace view directory_contextual_categories
with (security_invoker = true)
as
select
  public_contextual_categories.category_id,
  public_contextual_categories.context_id,
  public_contextual_categories.context_code,
  public_contextual_categories.parent_id,
  public_contextual_categories.parent_slug,
  public_contextual_categories.parent_default_name,
  public_contextual_categories.category_slug,
  public_contextual_categories.category_default_name,
  public_contextual_categories.category_default_description,
  public_contextual_categories.status,
  public_contextual_categories.source_type,
  public_contextual_categories.sort_order,
  public_contextual_categories.is_active,
  public_contextual_categories.created_at,
  public_contextual_categories.updated_at
from public_contextual_categories
where public_contextual_categories.context_code = 'business_directory';

drop function if exists get_contextual_categories(text, text);

create function get_contextual_categories(
  p_context_code text default null,
  p_language_code text default 'en'
)
returns table (
  category_id uuid,
  context_id uuid,
  context_code text,
  parent_id uuid,
  parent_slug text,
  category_slug text,
  default_name text,
  default_description text,
  display_name text,
  display_description text,
  locale_used text,
  status text,
  source_type text,
  sort_order integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    contextual_categories.id as category_id,
    contexts.id as context_id,
    contexts.code as context_code,
    contextual_categories.parent_id,
    parent_categories.slug as parent_slug,
    contextual_categories.slug as category_slug,
    contextual_categories.name as default_name,
    contextual_categories.description as default_description,
    coalesce(
      requested_translation.name,
      english_translation.name,
      polish_translation.name,
      contextual_categories.name
    ) as display_name,
    coalesce(
      requested_translation.description,
      english_translation.description,
      polish_translation.description,
      contextual_categories.description
    ) as display_description,
    case
      when requested_translation.id is not null then lower(nullif(trim(p_language_code), ''))
      when english_translation.id is not null then 'en'
      when polish_translation.id is not null then 'pl'
      else 'default'
    end as locale_used,
    contextual_categories.status,
    contextual_categories.source_type,
    contextual_categories.sort_order
  from contextual_categories
  join contexts
    on contexts.id = contextual_categories.context_id
  left join contextual_categories parent_categories
    on parent_categories.id = contextual_categories.parent_id
  left join contextual_category_translations requested_translation
    on requested_translation.contextual_category_id = contextual_categories.id
   and lower(requested_translation.locale) = lower(nullif(trim(p_language_code), ''))
  left join contextual_category_translations english_translation
    on english_translation.contextual_category_id = contextual_categories.id
   and lower(english_translation.locale) = 'en'
  left join contextual_category_translations polish_translation
    on polish_translation.contextual_category_id = contextual_categories.id
   and lower(polish_translation.locale) = 'pl'
  where contextual_categories.is_active = true
    and contextual_categories.status in ('approved', 'published')
    and contexts.is_active = true
    and contexts.status in ('approved', 'published')
    and (
      p_context_code is null
      or nullif(trim(p_context_code), '') is null
      or lower(contexts.code) = lower(trim(p_context_code))
    )
  order by
    contexts.sort_order,
    contextual_categories.sort_order,
    display_name;
$$;

drop function if exists resolve_contextual_category(text, text, text, text);

create function resolve_contextual_category(
  p_object_type_code text,
  p_action_type_code text,
  p_context_code text,
  p_language_code text default 'en'
)
returns table (
  object_type_id uuid,
  object_type_code text,
  object_type_name text,
  action_type_id uuid,
  action_type_code text,
  action_type_name text,
  context_id uuid,
  context_code text,
  context_name text,
  affordance_id uuid,
  is_affordance_allowed boolean,
  category_id uuid,
  category_slug text,
  default_name text,
  display_name text,
  locale_used text,
  resolution_mode text
)
language sql
stable
security invoker
set search_path = public
as $$
  with resolved_affordance as (
    select
      object_types.id as object_type_id,
      object_types.code as object_type_code,
      object_types.name as object_type_name,
      action_types.id as action_type_id,
      action_types.code as action_type_code,
      action_types.name as action_type_name,
      contexts.id as context_id,
      contexts.code as context_code,
      contexts.name as context_name,
      object_action_affordances.id as affordance_id
    from object_types
    join action_types
      on lower(action_types.code) = lower(trim(p_action_type_code))
    join contexts
      on lower(contexts.code) = lower(trim(p_context_code))
    left join object_action_affordances
      on object_action_affordances.object_type_id = object_types.id
     and object_action_affordances.action_type_id = action_types.id
     and object_action_affordances.context_id = contexts.id
     and object_action_affordances.status in ('approved', 'published')
    where lower(object_types.code) = lower(trim(p_object_type_code))
      and object_types.is_active = true
      and object_types.status in ('approved', 'published')
      and action_types.is_active = true
      and action_types.status in ('approved', 'published')
      and contexts.is_active = true
      and contexts.status in ('approved', 'published')
  )
  select
    resolved_affordance.object_type_id,
    resolved_affordance.object_type_code,
    resolved_affordance.object_type_name,
    resolved_affordance.action_type_id,
    resolved_affordance.action_type_code,
    resolved_affordance.action_type_name,
    resolved_affordance.context_id,
    resolved_affordance.context_code,
    resolved_affordance.context_name,
    resolved_affordance.affordance_id,
    resolved_affordance.affordance_id is not null as is_affordance_allowed,
    contextual_categories.id as category_id,
    contextual_categories.slug as category_slug,
    contextual_categories.name as default_name,
    coalesce(
      requested_translation.name,
      english_translation.name,
      polish_translation.name,
      contextual_categories.name
    ) as display_name,
    case
      when requested_translation.id is not null then lower(nullif(trim(p_language_code), ''))
      when english_translation.id is not null then 'en'
      when polish_translation.id is not null then 'pl'
      else 'default'
    end as locale_used,
    'context_categories_for_allowed_affordance' as resolution_mode
  from resolved_affordance
  join contextual_categories
    on contextual_categories.context_id = resolved_affordance.context_id
   and contextual_categories.is_active = true
   and contextual_categories.status in ('approved', 'published')
  left join contextual_category_translations requested_translation
    on requested_translation.contextual_category_id = contextual_categories.id
   and lower(requested_translation.locale) = lower(nullif(trim(p_language_code), ''))
  left join contextual_category_translations english_translation
    on english_translation.contextual_category_id = contextual_categories.id
   and lower(english_translation.locale) = 'en'
  left join contextual_category_translations polish_translation
    on polish_translation.contextual_category_id = contextual_categories.id
   and lower(polish_translation.locale) = 'pl'
  where resolved_affordance.affordance_id is not null
  order by
    contextual_categories.sort_order,
    display_name;
$$;

grant select on public_contextual_categories to anon, authenticated;
grant select on directory_contextual_categories to anon, authenticated;

grant execute on function get_contextual_categories(text, text) to anon, authenticated;
grant execute on function resolve_contextual_category(text, text, text, text) to anon, authenticated;

commit;