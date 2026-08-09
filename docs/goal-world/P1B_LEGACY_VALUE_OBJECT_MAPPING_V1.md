# ARCTor.app — Goal World Constructor
## P1B Legacy Value Object Mapping v1

Baseline:

- P1A commit: `8c2ff75f788d758c153d802521dbb210ade172dc`
- P1A database migration: applied and all 12 postchecks passed
- live Value Objects inspected: 15
- legacy roles: 6 `structural`, 9 `activity_leaf`
- direct fact rows on these objects: 0
- parameter assignments on these objects: 0
- outcome criteria on these objects: 0
- current dependencies are primarily activity-to-object links
- all current content is development/test content

## 1. Mapping rule

P1B does not invent a new business meaning for legacy test content.

It only provides enough ontology information for the 15 existing rows to coexist
with the new P1 ontology contract.

### Root rule

Legacy `structural` rows with no structural parent are mapped to:

- `facet_code = DOMAIN`
- `object_kind_code = domain_root`
- `ontology_node_role_code = root`
- `hierarchy_relation_code = null`

### Legacy product leaf rule

Legacy `activity_leaf + product_type` is mapped to:

- `facet_code = ENTITY`
- `object_kind_code = product_type`
- `ontology_node_role_code = leaf`
- `hierarchy_relation_code = aspect_of`

### Legacy service leaf rule

Legacy `activity_leaf + service_type` is mapped to:

- `facet_code = PROCESS`
- `object_kind_code = service_type`
- `ontology_node_role_code = leaf`
- `hierarchy_relation_code = aspect_of`

### Семейный бюджет

`Семейный бюджет` is the only row for which structure alone did not determine
the new node role.

Decision:

- keep the object as a terminal observation address now;
- `facet_code = ENTITY`;
- `object_kind_code = generic_entity`;
- `ontology_node_role_code = leaf`;
- `hierarchy_relation_code = aspect_of`.

This follows the roadmap rule that a branch may initially be short
`root -> leaf`. If later refinement is needed, new intermediate nodes or more
precise sibling/descendant structures are created without changing the historical
identity of this leaf.

## 2. Conservative treatment of test inconsistencies

One test row named `тестовая услуга 07 августа` is stored by the old system as
`product_type`.

P1B does **not** silently repair this semantic inconsistency. It preserves the
legacy machine classification and therefore maps it to `ENTITY / product_type`.

The row is test content and may be retired/recreated later without affecting the
ontology contract.

## 3. Shared fields for all 15 rows

All current rows have an owner actor, therefore:

- `scope_code = actor`

All current rows are private:

- `visibility_code = private`

Current sensitivity is standard:

- `privacy_class_code = standard`

Migration origin:

- `origin_type_code = legacy`
- `definition_version = 1`

Canonical keys use a conservative legacy namespace.
They are unique and stable for these rows but are not promoted as global reusable
ontology meanings.

## 4. Exact mapping

| ID | Title | Facet | Kind | Role |
|---|---|---|---|---|
| b3bf6207-da9b-48c4-b5bc-2427d1ce88b8 | CUX5 TEST OBJECT | DOMAIN | domain_root | root |
| 17de1928-0732-4649-a7d4-46212b24d532 | Профессиональные навыки | DOMAIN | domain_root | root |
| 84e97b0e-6f95-4ace-a857-d83b9ce1e819 | Товары и услуги | DOMAIN | domain_root | root |
| bc634974-73f7-4be5-9e44-4e2e84df215a | Товары и услуги | DOMAIN | domain_root | root |
| ab68352e-fa2d-4ebd-b53c-6bb8a91154ba | GC-R6 PLN Test Service | PROCESS | service_type | leaf |
| 50e1a111-7165-4cae-bfae-0bb21bf92f3a | PGC2G Test Product | ENTITY | product_type | leaf |
| cb6a40b6-c607-4ec4-9964-f4723d2db78a | PGC2G Test Service | PROCESS | service_type | leaf |
| 38bbbed0-4204-4ff0-af1a-76826def39aa | test | ENTITY | product_type | leaf |
| a83f62ce-9cf4-4f84-86e5-fe222a963506 | тестовая услуга 07 августа | ENTITY | product_type | leaf |
| bb06a3fa-01ce-41fb-bd41-7744fe6c1173 | тестовая услуга 118 | PROCESS | service_type | leaf |
| af60a106-7147-4ce8-9bb4-d45bff0328b0 | тестовая услуга клиенториентирванная | PROCESS | service_type | leaf |
| a7532037-428c-4f27-9ce9-fd006fb54ba1 | тестовая услуга после упрощения | PROCESS | service_type | leaf |
| d8213d7a-427b-4d42-8ff3-10cd4badfa59 | фывафывафыав | ENTITY | product_type | leaf |
| 43b86bc3-aab6-49f1-afff-b11a52e01f66 | Экономический капитал | DOMAIN | domain_root | root |
| 687b8d5a-2c45-4ed5-9ccd-3fbaeb68a050 | Семейный бюджет | ENTITY | generic_entity | leaf |

Result after backfill:

- root = 5
- intermediate = 0
- leaf = 10
- DOMAIN = 5
- ENTITY = 5
- PROCESS = 5

No intermediate object is created artificially merely to demonstrate the model.

## 5. Version ledger

After the backfill each of the 15 Value Objects receives immutable
`definition_version = 1` in `value_object_definition_versions`.

Existing IDs, titles, parent IDs, root IDs, owner IDs and legacy runtime fields
are not changed.

## 6. P1B gate

P1B mapping is acceptable only if postcheck confirms:

1. exactly 15 rows mapped;
2. exactly 5 roots and 10 leaves;
3. DOMAIN/ENTITY/PROCESS = 5/5/5;
4. all 15 have definition version 1;
5. legacy `structural/activity_leaf` counts remain 6/9;
6. no parent/root ID changed;
7. existing activity links still reference the same IDs.
