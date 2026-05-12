begin;

insert into entity_classifications (
  entity_type,
  entity_id,
  object_type_id,
  action_type_id,
  context_id,
  contextual_category_id,
  classification_role,
  is_primary,
  confidence,
  status,
  source_type,
  evidence_json,
  notes
)
select
  'organization' as entity_type,
  organization_categories.organization_id as entity_id,
  object_types.id as object_type_id,
  action_types.id as action_type_id,
  contexts.id as context_id,
  contextual_categories.id as contextual_category_id,
  case
    when organization_categories.is_primary then 'primary'
    else 'secondary'
  end as classification_role,
  organization_categories.is_primary as is_primary,
  1 as confidence,
  'approved' as status,
  'migrated' as source_type,
  jsonb_build_object(
    'source_table',
    'organization_categories',
    'source_id',
    organization_categories.id,
    'legacy_category_id',
    business_categories.id,
    'legacy_category_slug',
    business_categories.slug,
    'legacy_category_name',
    business_categories.name,
    'migration',
    '003_backfill_organization_directory_classifications'
  ) as evidence_json,
  $$Migrated from legacy business_categories / organization_categories into the Object-Action Rubricator.$$ as notes
from organization_categories
join business_categories
  on business_categories.id = organization_categories.category_id
join object_types
  on lower(object_types.code) = 'organization'
join action_types
  on lower(action_types.code) = 'classify'
join contexts
  on lower(contexts.code) = 'business_directory'
join contextual_categories
  on contextual_categories.context_id = contexts.id
 and lower(contextual_categories.slug) = lower(business_categories.slug)
where not exists (
  select 1
  from entity_classifications existing
  where lower(existing.entity_type) = 'organization'
    and existing.entity_id = organization_categories.organization_id
    and existing.object_type_id = object_types.id
    and existing.action_type_id = action_types.id
    and existing.context_id = contexts.id
    and existing.contextual_category_id = contextual_categories.id
    and existing.classification_role =
      case
        when organization_categories.is_primary then 'primary'
        else 'secondary'
      end
);

commit;