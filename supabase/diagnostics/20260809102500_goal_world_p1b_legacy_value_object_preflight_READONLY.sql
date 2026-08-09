-- ARCTor.app Goal World P1B
-- READ ONLY PRE-FLIGHT.

select
  count(*) as exact_objects_found
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

select
  count(*) filter (where node_role_code='structural') as legacy_structural,
  count(*) filter (where node_role_code='activity_leaf') as legacy_activity_leaf
from public.value_objects;

select
  count(*) as rows_with_existing_p1_mapping
from public.value_objects
where (
  canonical_key is not null
  or facet_code is not null
  or object_kind_code is not null
  or ontology_node_role_code is not null
  or definition_version is not null
);

select
  count(*) as definition_version_rows
from public.value_object_definition_versions;
