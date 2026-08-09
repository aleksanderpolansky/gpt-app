/**
 * ARCTor.app — Goal World Constructor
 * P1B exact legacy mapping.
 *
 * IMPORTANT:
 * These are existing development/test Value Objects.
 * This mapping is migration lineage, not a global ontology seed.
 */

export const P1B_LEGACY_VALUE_OBJECT_MAPPING_V1 = [
  {
    id: "b3bf6207-da9b-48c4-b5bc-2427d1ce88b8",
    canonicalKey: "legacy.domain.cux5_test_object.b3bf6207",
    facetCode: "DOMAIN",
    objectKindCode: "domain_root",
    nodeRoleCode: "root",
    hierarchyRelationCode: null,
  },
  {
    id: "17de1928-0732-4649-a7d4-46212b24d532",
    canonicalKey: "legacy.domain.professional_skills.17de1928",
    facetCode: "DOMAIN",
    objectKindCode: "domain_root",
    nodeRoleCode: "root",
    hierarchyRelationCode: null,
  },
  {
    id: "84e97b0e-6f95-4ace-a857-d83b9ce1e819",
    canonicalKey: "legacy.domain.goods_services.84e97b0e",
    facetCode: "DOMAIN",
    objectKindCode: "domain_root",
    nodeRoleCode: "root",
    hierarchyRelationCode: null,
  },
  {
    id: "bc634974-73f7-4be5-9e44-4e2e84df215a",
    canonicalKey: "legacy.domain.goods_services.bc634974",
    facetCode: "DOMAIN",
    objectKindCode: "domain_root",
    nodeRoleCode: "root",
    hierarchyRelationCode: null,
  },
  {
    id: "ab68352e-fa2d-4ebd-b53c-6bb8a91154ba",
    canonicalKey: "legacy.process.service.ab68352e",
    facetCode: "PROCESS",
    objectKindCode: "service_type",
    nodeRoleCode: "leaf",
    hierarchyRelationCode: "aspect_of",
  },
  {
    id: "50e1a111-7165-4cae-bfae-0bb21bf92f3a",
    canonicalKey: "legacy.entity.product.50e1a111",
    facetCode: "ENTITY",
    objectKindCode: "product_type",
    nodeRoleCode: "leaf",
    hierarchyRelationCode: "aspect_of",
  },
  {
    id: "cb6a40b6-c607-4ec4-9964-f4723d2db78a",
    canonicalKey: "legacy.process.service.cb6a40b6",
    facetCode: "PROCESS",
    objectKindCode: "service_type",
    nodeRoleCode: "leaf",
    hierarchyRelationCode: "aspect_of",
  },
  {
    id: "38bbbed0-4204-4ff0-af1a-76826def39aa",
    canonicalKey: "legacy.entity.product.38bbbed0",
    facetCode: "ENTITY",
    objectKindCode: "product_type",
    nodeRoleCode: "leaf",
    hierarchyRelationCode: "aspect_of",
  },
  {
    id: "a83f62ce-9cf4-4f84-86e5-fe222a963506",
    canonicalKey: "legacy.entity.product.a83f62ce",
    facetCode: "ENTITY",
    objectKindCode: "product_type",
    nodeRoleCode: "leaf",
    hierarchyRelationCode: "aspect_of",
  },
  {
    id: "bb06a3fa-01ce-41fb-bd41-7744fe6c1173",
    canonicalKey: "legacy.process.service.bb06a3fa",
    facetCode: "PROCESS",
    objectKindCode: "service_type",
    nodeRoleCode: "leaf",
    hierarchyRelationCode: "aspect_of",
  },
  {
    id: "af60a106-7147-4ce8-9bb4-d45bff0328b0",
    canonicalKey: "legacy.process.service.af60a106",
    facetCode: "PROCESS",
    objectKindCode: "service_type",
    nodeRoleCode: "leaf",
    hierarchyRelationCode: "aspect_of",
  },
  {
    id: "a7532037-428c-4f27-9ce9-fd006fb54ba1",
    canonicalKey: "legacy.process.service.a7532037",
    facetCode: "PROCESS",
    objectKindCode: "service_type",
    nodeRoleCode: "leaf",
    hierarchyRelationCode: "aspect_of",
  },
  {
    id: "d8213d7a-427b-4d42-8ff3-10cd4badfa59",
    canonicalKey: "legacy.entity.product.d8213d7a",
    facetCode: "ENTITY",
    objectKindCode: "product_type",
    nodeRoleCode: "leaf",
    hierarchyRelationCode: "aspect_of",
  },
  {
    id: "43b86bc3-aab6-49f1-afff-b11a52e01f66",
    canonicalKey: "legacy.domain.economic_capital.43b86bc3",
    facetCode: "DOMAIN",
    objectKindCode: "domain_root",
    nodeRoleCode: "root",
    hierarchyRelationCode: null,
  },
  {
    id: "687b8d5a-2c45-4ed5-9ccd-3fbaeb68a050",
    canonicalKey: "legacy.entity.family_budget.687b8d5a",
    facetCode: "ENTITY",
    objectKindCode: "generic_entity",
    nodeRoleCode: "leaf",
    hierarchyRelationCode: "aspect_of",
  },
] as const;

export type P1BLegacyValueObjectMappingV1 =
  (typeof P1B_LEGACY_VALUE_OBJECT_MAPPING_V1)[number];
