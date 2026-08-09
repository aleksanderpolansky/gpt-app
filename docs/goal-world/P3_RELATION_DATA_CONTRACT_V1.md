# ARCTor.app Ã¢â‚¬â€ Goal World Constructor
## P3 Relation Architecture v1 Ã¢â‚¬â€ Relation Data Contract
### 9 Aug 2026

## 1. Purpose

P3 turns the existing P10 semantic-link implementation into a closed semantic
relation contract for the Goal World / Reality Graph architecture.

P3 reuses:

- `value_object_relation_types`;
- `value_object_relations`;
- `value_object_relation_operations`;
- the existing manual relation UI/API;
- symmetric canonicalization and lifecycle logic from P10.

P3 adds:

- explicit relation families;
- canonical / reverse-alias orientation rules;
- ontology facet and node-role guards;
- an AI-candidate validation boundary;
- relation evidence;
- an explicit rule that world-specific evaluation does not live on the global edge.

## 2. Structural tree remains separate

`parent_value_object_id` remains the only structural parent.

P3 semantic relations never:

- change `parent_value_object_id`;
- change `root_value_object_id`;
- copy facts or measures;
- create a second structural parent.

## 3. Closed relation families

The closed P3 family registry is:

- `structural_crosslink`
- `motivation`
- `goal`
- `resource`
- `temporal`
- `analytics`

P3 does not invent new active relation codes merely to populate every family.
The current P10 relation vocabulary is preserved and classified.

New motivation / goal / resource / temporal relation codes may be seeded later
only through a reviewed migration or model package contract.

## 4. Current relation vocabulary

Canonical active writes remain:

- `related_to`
- `same_subject_as`
- `supports`
- `depends_on`
- `conflicts_with`
- `influences`

Reverse aliases:

- `prerequisite_for` -> canonical `depends_on`, reversed endpoints
- `influenced_by` -> canonical `influences`, reversed endpoints

`associated_with` stays inactive.

The existing analytical candidates remain `future`:

- `threatens`
- `opportunity_for`
- `indicated_by`

They are not activated in P3 because Goal World roles/evaluation are not yet
stored, and a global relation must not silently become a world-specific judgment.

## 5. Subject/object guards

Every registry row carries explicit allowed:

- source facets;
- target facets;
- source ontology node roles;
- target ontology node roles.

P3 v1 uses the current nine ontology facets and the three semantic node roles as
the broad guard set for the existing generic relation types.

This is intentionally closed-world: a future new facet or node role is not
automatically accepted by an old relation contract.

## 6. Canonical orientation

Symmetric types are stored once in canonical UUID order.

Reverse aliases are validation vocabulary, not a second competing stored edge.

Example:

`A prerequisite_for B`

validates to the canonical stored form:

`B depends_on A`.

This keeps one machine identity for one semantic edge.

## 7. AI boundary

`ai_suggested` is proposal provenance, not permission to mutate canonical truth.

The database trigger rejects direct canonical writes marked `ai_suggested`.

The closed relation-type registry is migration-owned. Runtime `service_role`
has read-only access to it and cannot insert/update/delete relation codes.

AI or other candidate-producing code must first call:

`validate_value_object_relation_candidate_v1(...)`

The validator:

- rejects unknown relation codes;
- rejects future/disabled relation types;
- resolves reverse aliases;
- canonicalizes symmetric endpoints;
- checks actor ownership;
- checks object lifecycle;
- checks source/target facets;
- checks source/target ontology node roles.

A later human/system-controlled write may use the existing canonical write path.

## 8. Relation evidence

P3 creates `relation_evidence`.

Evidence rows are separate from the edge itself. They record:

- whether the item supports or contradicts the relation;
- evidence kind;
- source type;
- optional source reference;
- optional human-readable evidence text;
- provenance actor;
- metadata;
- idempotency.

P3 deliberately does **not** store relation weights, causal scores or invented AI
confidence numbers in this table. These keys are also forbidden at the top level
of evidence metadata.

Runtime `service_role` receives read-only table access; evidence writes must go
through the `add_value_object_relation_evidence_v1(...)` SECURITY DEFINER boundary.

At least one source reference or evidence text is required.

Evidence kinds:

- `user_statement`
- `activity_fact`
- `measure`
- `external_source`
- `expert_model`
- `system_rule`
- `correction`

Evidence direction:

- `supports`
- `contradicts`

Source types:

- `user`
- `activity`
- `fact`
- `measure`
- `external`
- `expert_model`
- `system_rule`

## 9. World-specific evaluation

Global `value_object_relations` are neutral Reality Graph edges.

P3 forbids storing reserved world-evaluation keys in
`value_object_relations.metadata_json`, including global relation:

- polarity;
- weight;
- world role;
- approach/avoid/maintain orientation;
- world score.

Those values belong to the future Goal World projection (P7+) and may differ
between worlds without duplicating the shared relation.

## 10. What P3 intentionally does not implement

P3 does not implement:

- `relation_weight_estimates` Ã¢â‚¬â€ P14;
- causal promotion Ã¢â‚¬â€ P15;
- Goal World tables Ã¢â‚¬â€ P7;
- new active motivation/goal/resource/temporal relation vocabulary without a
  reviewed semantic contract;
- automatic AI confirmation of semantic edges.

## 11. Gate

P3 relation foundation closes only when live acceptance proves:

- unknown type rejected;
- future type rejected;
- reverse alias canonicalized correctly;
- symmetric relation canonicalized;
- self-link guard works;
- wrong owner/actor rejected;
- invalid subject/object ontology state rejected;
- AI direct canonical write rejected;
- world-evaluation metadata rejected;
- evidence can be attached idempotently;
- evidence idempotency mismatch rejected;
- relation evidence creates no Value Object definition version;
- existing P10 relation is preserved;
- all temporary runtime fixtures roll back cleanly.
