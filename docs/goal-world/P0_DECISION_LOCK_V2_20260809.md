# ARCTor.app — Goal World Constructor
## P0 Decision Lock v2 — 2026-08-09

Baseline used for this lock:

- source: `main @ 5ddff837a07145457a90161817f1f547ff43a09f`
- worktree: clean
- `HEAD...origin/main = 0 0`
- live public schema: 152 tables / 2479 columns / 1214 constraints / 757 indexes / 95 triggers / 109 RLS policies / 96 public functions
- live audit mode: `BEGIN READ ONLY -> ROLLBACK`

This file closes the roadmap question: **what already exists?**

## 1. REUSE — keep as the existing foundation

### Actor layer
- `actors`
- existing person/avatar/organization actor ownership mechanisms

### Value Object identity and tree infrastructure
- `value_objects` as the single identity table
- `parent_value_object_id`
- `root_value_object_id`
- `owner_actor_id`
- `created_by_actor_id`
- `valid_from / valid_to`
- existing one-parent / no-self / no-cycle / root-pointer enforcement logic
- existing controlled tree restructure operations and hierarchy event history

### Relations
- `value_object_relation_types` as the canonical existing relation-type registry to extend later
- `value_object_relations` as the canonical existing semantic relation table

Do **not** create a second competing `relation_type_registry` table.

### Parameters and targets
- `value_object_parameter_definitions`
- `value_object_parameter_assignments`
- `value_object_target_standard_versions`
- `value_object_outcome_criteria`
- normalization policies / unit conversions / target-kind registries

The flat `value_object_target_standards` table is legacy and is not the future canonical version model.

### Activity / fact layer
- `activity_events`
- `activity_event_measures`
- `activity_object_facts`
- existing activity-to-Value-Object link mechanisms
- existing PP1 canonical planned/actual activity model

### Existing analytical foundations that may be evolved later
- `impact_rules`
- `value_object_state_snapshots`
- `value_object_daily_aggregates`
- `value_object_relevance_edges`
- `value_object_similarity_edges`

They are not yet accepted as final Goal World / derived-learning contracts.

---

## 2. ALTER / EXTEND — existing structures do not yet match the new Semantic Lock

### `value_objects`
The table remains canonical, but its current ontology columns reflect the July model:

- current `node_role_code = structural | activity_leaf`
- current `branch_type_code` points to the five old branch policies
- current `object_kind` is constrained by a hard-coded CHECK
- no `canonical_key`
- no new semantic `facet_code`
- no explicit hierarchy relation code
- no stable definition-version ledger
- privacy/visibility concepts are represented by overlapping legacy columns

Target ontology needs:

- `canonical_key`
- `facet_code`
- `object_kind_code`
- semantic role `root | intermediate | leaf`
- `hierarchy_relation_code`
- `scope_code = global | actor`
- `visibility_code = private | shared | public`
- `privacy_class_code = public_ontology | standard | sensitive | restricted`
- `definition_version`
- `origin_type_code`

### Important compatibility decision
P1A is additive and does **not** immediately reinterpret the production
`node_role_code` column because current tree operations, parameter/target guards,
product/service creation and gift-certificate functions still reference
`structural | activity_leaf`.

Therefore P1A introduces `ontology_node_role_code` as the new semantic role.
The assembled P1 object card exposes it as logical `node_role_code`.

The legacy production field is retired only after a controlled runtime cutover
inside P1B/P1C.

### Old branch policies
`value_object_branch_types` is retained only because current routes/functions use it.

Its five values are **not** the new facet ontology and must not become the Goal World router.

### Privacy
Current storage has overlapping:
- `visibility`
- `privacy_level`
- `sensitivity_level`
- `ui_visibility`

P1 introduces a clear canonical pair:
- visibility: who can see the object
- privacy class: how the object may be processed

Legacy columns remain until the runtime cutover.

---

## 3. CREATE — missing core structures

P1:
- `value_object_facet_registry`
- `value_object_kind_registry`
- `value_object_definition_versions`

P2:
- `value_object_recognition_profiles`

P3:
- relation evidence layer and additional relation-type guards

Later roadmap stages:
- relation weight estimates
- protocol version registry
- analysis question registry
- final impact-rule outputs
- aggregation rules
- derived-feature snapshots/current materialization
- Goal World tables

---

## 4. CONTRADICTIONS RESOLVED

1. Old `branch_type_code` is not the new `facet_code`.
2. Old `structural/activity_leaf` is not the final root/intermediate/leaf semantic role.
3. Leaf no longer means only activity pattern; a leaf is any terminal fact target in its facet.
4. Existing `value_object_relation_types` is reused instead of creating a duplicate relation registry.
5. Existing parameter and target version tables are reused instead of recreating them.
6. Goal World will reference Reality Core objects/facts; it will not duplicate them.
7. Existing activity/fact infrastructure is preserved and audited later under the final Measure -> Leaf contract.
8. Existing state-snapshot tables are candidates for later reuse, but are not silently declared equal to the future derived feature store.

---

## 5. P0 GATE

**P0 CLOSED.**

There is no unresolved schema question blocking P1.
All following migrations must be based on `main @ 5ddff837a0` or on a later explicitly audited baseline.
