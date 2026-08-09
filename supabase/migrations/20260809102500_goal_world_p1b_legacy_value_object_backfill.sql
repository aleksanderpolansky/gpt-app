/*
ARCTor.app — Goal World Constructor
P1B Legacy Value Object Backfill

EXACT-ID CONTROLLED MIGRATION.

Backfills ONLY the 15 Value Objects audited on 2026-08-09.
Does not alter IDs, titles, parent/root structure or legacy runtime role fields.
Creates immutable definition_version = 1 snapshots.
*/

begin;

do $$
declare
  v_total integer;
  v_already_mapped integer;
  v_existing_versions integer;
begin
  select count(*)
  into v_total
  from public.value_objects
  where id in (
    'b3bf6207-da9b-48c4-b5bc-2427d1ce88b8'::uuid,
    '17de1928-0732-4649-a7d4-46212b24d532'::uuid,
    '84e97b0e-6f95-4ace-a857-d83b9ce1e819'::uuid,
    'bc634974-73f7-4be5-9e44-4e2e84df215a'::uuid,
    'ab68352e-fa2d-4ebd-b53c-6bb8a91154ba'::uuid,
    '50e1a111-7165-4cae-bfae-0bb21bf92f3a'::uuid,
    'cb6a40b6-c607-4ec4-9964-f4723d2db78a'::uuid,
    '38bbbed0-4204-4ff0-af1a-76826def39aa'::uuid,
    'a83f62ce-9cf4-4f84-86e5-fe222a963506'::uuid,
    'bb06a3fa-01ce-41fb-bd41-7744fe6c1173'::uuid,
    'af60a106-7147-4ce8-9bb4-d45bff0328b0'::uuid,
    'a7532037-428c-4f27-9ce9-fd006fb54ba1'::uuid,
    'd8213d7a-427b-4d42-8ff3-10cd4badfa59'::uuid,
    '43b86bc3-aab6-49f1-afff-b11a52e01f66'::uuid,
    '687b8d5a-2c45-4ed5-9ccd-3fbaeb68a050'::uuid
  );

  if v_total <> 15 then
    raise exception 'P1B_BASELINE_OBJECT_COUNT_MISMATCH: expected 15, found %', v_total;
  end if;

  select count(*)
  into v_already_mapped
  from public.value_objects
  where id in (
    'b3bf6207-da9b-48c4-b5bc-2427d1ce88b8'::uuid,
    '17de1928-0732-4649-a7d4-46212b24d532'::uuid,
    '84e97b0e-6f95-4ace-a857-d83b9ce1e819'::uuid,
    'bc634974-73f7-4be5-9e44-4e2e84df215a'::uuid,
    'ab68352e-fa2d-4ebd-b53c-6bb8a91154ba'::uuid,
    '50e1a111-7165-4cae-bfae-0bb21bf92f3a'::uuid,
    'cb6a40b6-c607-4ec4-9964-f4723d2db78a'::uuid,
    '38bbbed0-4204-4ff0-af1a-76826def39aa'::uuid,
    'a83f62ce-9cf4-4f84-86e5-fe222a963506'::uuid,
    'bb06a3fa-01ce-41fb-bd41-7744fe6c1173'::uuid,
    'af60a106-7147-4ce8-9bb4-d45bff0328b0'::uuid,
    'a7532037-428c-4f27-9ce9-fd006fb54ba1'::uuid,
    'd8213d7a-427b-4d42-8ff3-10cd4badfa59'::uuid,
    '43b86bc3-aab6-49f1-afff-b11a52e01f66'::uuid,
    '687b8d5a-2c45-4ed5-9ccd-3fbaeb68a050'::uuid
  )
  and (
    canonical_key is not null
    or facet_code is not null
    or object_kind_code is not null
    or ontology_node_role_code is not null
    or hierarchy_relation_code is not null
    or scope_code is not null
    or visibility_code is not null
    or privacy_class_code is not null
    or definition_version is not null
    or origin_type_code is not null
  );

  if v_already_mapped <> 0 then
    raise exception 'P1B_BASELINE_ALREADY_MAPPED: % rows already contain P1 values', v_already_mapped;
  end if;

  select count(*)
  into v_existing_versions
  from public.value_object_definition_versions
  where value_object_id in (
    'b3bf6207-da9b-48c4-b5bc-2427d1ce88b8'::uuid,
    '17de1928-0732-4649-a7d4-46212b24d532'::uuid,
    '84e97b0e-6f95-4ace-a857-d83b9ce1e819'::uuid,
    'bc634974-73f7-4be5-9e44-4e2e84df215a'::uuid,
    'ab68352e-fa2d-4ebd-b53c-6bb8a91154ba'::uuid,
    '50e1a111-7165-4cae-bfae-0bb21bf92f3a'::uuid,
    'cb6a40b6-c607-4ec4-9964-f4723d2db78a'::uuid,
    '38bbbed0-4204-4ff0-af1a-76826def39aa'::uuid,
    'a83f62ce-9cf4-4f84-86e5-fe222a963506'::uuid,
    'bb06a3fa-01ce-41fb-bd41-7744fe6c1173'::uuid,
    'af60a106-7147-4ce8-9bb4-d45bff0328b0'::uuid,
    'a7532037-428c-4f27-9ce9-fd006fb54ba1'::uuid,
    'd8213d7a-427b-4d42-8ff3-10cd4badfa59'::uuid,
    '43b86bc3-aab6-49f1-afff-b11a52e01f66'::uuid,
    '687b8d5a-2c45-4ed5-9ccd-3fbaeb68a050'::uuid
  );

  if v_existing_versions <> 0 then
    raise exception 'P1B_BASELINE_VERSION_LEDGER_NOT_EMPTY: % rows', v_existing_versions;
  end if;
end
$$;

with mapping (
  id,
  canonical_key,
  facet_code,
  object_kind_code,
  ontology_node_role_code,
  hierarchy_relation_code
) as (
  values
    ('b3bf6207-da9b-48c4-b5bc-2427d1ce88b8'::uuid, 'legacy.domain.cux5_test_object.b3bf6207',       'DOMAIN',  'domain_root',    'root', null),
    ('17de1928-0732-4649-a7d4-46212b24d532'::uuid, 'legacy.domain.professional_skills.17de1928',   'DOMAIN',  'domain_root',    'root', null),
    ('84e97b0e-6f95-4ace-a857-d83b9ce1e819'::uuid, 'legacy.domain.goods_services.84e97b0e',        'DOMAIN',  'domain_root',    'root', null),
    ('bc634974-73f7-4be5-9e44-4e2e84df215a'::uuid, 'legacy.domain.goods_services.bc634974',        'DOMAIN',  'domain_root',    'root', null),
    ('ab68352e-fa2d-4ebd-b53c-6bb8a91154ba'::uuid, 'legacy.process.service.ab68352e',              'PROCESS', 'service_type',   'leaf', 'aspect_of'),
    ('50e1a111-7165-4cae-bfae-0bb21bf92f3a'::uuid, 'legacy.entity.product.50e1a111',               'ENTITY',  'product_type',   'leaf', 'aspect_of'),
    ('cb6a40b6-c607-4ec4-9964-f4723d2db78a'::uuid, 'legacy.process.service.cb6a40b6',              'PROCESS', 'service_type',   'leaf', 'aspect_of'),
    ('38bbbed0-4204-4ff0-af1a-76826def39aa'::uuid, 'legacy.entity.product.38bbbed0',               'ENTITY',  'product_type',   'leaf', 'aspect_of'),
    ('a83f62ce-9cf4-4f84-86e5-fe222a963506'::uuid, 'legacy.entity.product.a83f62ce',               'ENTITY',  'product_type',   'leaf', 'aspect_of'),
    ('bb06a3fa-01ce-41fb-bd41-7744fe6c1173'::uuid, 'legacy.process.service.bb06a3fa',              'PROCESS', 'service_type',   'leaf', 'aspect_of'),
    ('af60a106-7147-4ce8-9bb4-d45bff0328b0'::uuid, 'legacy.process.service.af60a106',              'PROCESS', 'service_type',   'leaf', 'aspect_of'),
    ('a7532037-428c-4f27-9ce9-fd006fb54ba1'::uuid, 'legacy.process.service.a7532037',              'PROCESS', 'service_type',   'leaf', 'aspect_of'),
    ('d8213d7a-427b-4d42-8ff3-10cd4badfa59'::uuid, 'legacy.entity.product.d8213d7a',               'ENTITY',  'product_type',   'leaf', 'aspect_of'),
    ('43b86bc3-aab6-49f1-afff-b11a52e01f66'::uuid, 'legacy.domain.economic_capital.43b86bc3',      'DOMAIN',  'domain_root',    'root', null),
    ('687b8d5a-2c45-4ed5-9ccd-3fbaeb68a050'::uuid, 'legacy.entity.family_budget.687b8d5a',         'ENTITY',  'generic_entity', 'leaf', 'aspect_of')
)
update public.value_objects vo
set
  canonical_key = m.canonical_key,
  facet_code = m.facet_code,
  object_kind_code = m.object_kind_code,
  ontology_node_role_code = m.ontology_node_role_code,
  hierarchy_relation_code = m.hierarchy_relation_code,
  scope_code = 'actor',
  visibility_code = 'private',
  privacy_class_code = 'standard',
  definition_version = 1,
  origin_type_code = 'legacy'
from mapping m
where vo.id = m.id;

insert into public.value_object_definition_versions (
  value_object_id,
  version,
  canonical_key,
  title,
  description,
  facet_code,
  object_kind_code,
  node_role_code,
  parent_value_object_id,
  root_value_object_id,
  hierarchy_relation_code,
  scope_code,
  owner_actor_id,
  status_code,
  visibility_code,
  privacy_class_code,
  origin_type_code,
  valid_from,
  valid_to,
  created_by_actor_id,
  definition_snapshot_json,
  source_context
)
select
  vo.id,
  1,
  vo.canonical_key,
  vo.title,
  vo.description,
  vo.facet_code,
  vo.object_kind_code,
  vo.ontology_node_role_code,
  vo.parent_value_object_id,
  vo.root_value_object_id,
  vo.hierarchy_relation_code,
  vo.scope_code,
  vo.owner_actor_id,
  vo.status,
  vo.visibility_code,
  vo.privacy_class_code,
  vo.origin_type_code,
  vo.valid_from,
  vo.valid_to,
  vo.created_by_actor_id,
  jsonb_build_object(
    'legacy_object_kind', vo.object_kind,
    'legacy_node_role_code', vo.node_role_code,
    'legacy_branch_type_code', vo.branch_type_code,
    'legacy_visibility', vo.visibility,
    'legacy_privacy_level', vo.privacy_level,
    'legacy_sensitivity_level', vo.sensitivity_level,
    'mapping_protocol', 'P1B_LEGACY_VALUE_OBJECT_MAPPING_V1'
  ),
  'P1B_LEGACY_VALUE_OBJECT_MAPPING_V1'
from public.value_objects vo
where vo.id in (
  'b3bf6207-da9b-48c4-b5bc-2427d1ce88b8'::uuid,
  '17de1928-0732-4649-a7d4-46212b24d532'::uuid,
  '84e97b0e-6f95-4ace-a857-d83b9ce1e819'::uuid,
  'bc634974-73f7-4be5-9e44-4e2e84df215a'::uuid,
  'ab68352e-fa2d-4ebd-b53c-6bb8a91154ba'::uuid,
  '50e1a111-7165-4cae-bfae-0bb21bf92f3a'::uuid,
  'cb6a40b6-c607-4ec4-9964-f4723d2db78a'::uuid,
  '38bbbed0-4204-4ff0-af1a-76826def39aa'::uuid,
  'a83f62ce-9cf4-4f84-86e5-fe222a963506'::uuid,
  'bb06a3fa-01ce-41fb-bd41-7744fe6c1173'::uuid,
  'af60a106-7147-4ce8-9bb4-d45bff0328b0'::uuid,
  'a7532037-428c-4f27-9ce9-fd006fb54ba1'::uuid,
  'd8213d7a-427b-4d42-8ff3-10cd4badfa59'::uuid,
  '43b86bc3-aab6-49f1-afff-b11a52e01f66'::uuid,
  '687b8d5a-2c45-4ed5-9ccd-3fbaeb68a050'::uuid
);

commit;
