# P4.10.0-C8-P2-B — Live Constraint Inspection Result

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / value_object_category_links constraint inspection result

## 1. Context

P4.10.0-C8-P2 inspected live DB constraints for:

- public.value_object_category_links

The goal was to decide whether C8-P can safely create category links from resolved Category Derivation candidates.

## 2. Columns confirmed

The table contains the expected columns:

- id
- value_object_id
- category_table
- category_id
- category_role
- source
- confidence
- metadata_json
- created_at
- updated_at

Important defaults:

- category_table default: contextual_categories
- category_role default: semantic_component
- source default: rule
- confidence default: 1
- metadata_json default: empty object

## 3. category_role constraint

Live constraint:

- value_object_category_links_category_role_check

Allowed category_role values:

- primary
- semantic_component
- context
- object
- action
- goal
- protocol
- general_meaning
- system_suggested

Decision:

- C8-P may use category_role = semantic_component.

Reason:

- semantic_component is explicitly allowed by the live DB constraint.
- Category Derivation candidates are semantic components of a derived Value Object.
- More detailed semanticLayer-to-role mapping can be added later.

## 4. source constraint

Live constraint:

- value_object_category_links_source_check

Allowed source values:

- rule
- ai
- manual
- system_seed
- migration

Important result:

- source = category_derivation is NOT allowed.

Decision:

- C8-P must NOT write source = category_derivation.
- C8-P should write source = rule for rule-based Category Derivation links.
- The detailed source must be stored in metadata_json.

Required metadata_json source fields:

- sourceLayer: category_derivation
- sourceProcessor: category_derivation_rule_extractor
- p4Step: P4.10.0-C8-P

## 5. Unique constraint

Live unique constraint:

- value_object_category_links_unique

Definition:

- UNIQUE (value_object_id, category_table, category_id, category_role)

Decision:

- C8-P should use upsert with conflict target:
- value_object_id, category_table, category_id, category_role

This makes Category Derivation category-link creation idempotent.

## 6. metadata_json constraint

Live constraint:

- value_object_category_links_metadata_is_object_check

Definition:

- metadata_json must be a JSON object

Decision:

- C8-P metadata_json must always be an object.
- Do not write null or array metadata_json.

## 7. Existing live rows

Existing value_object_category_links rows currently use:

- category_role: primary
- source: rule

Existing rows were created by the older P4.9.2 bridge mapping metadata path.

## 8. Final C8-P implementation decision

For initial C8-P bridge integration, use:

- category_table: contextual_categories
- category_role: semantic_component
- source: rule
- confidence: candidate confidence or 1
- metadata_json.sourceLayer: category_derivation
- metadata_json.derivationRunId
- metadata_json.activityEventId
- metadata_json.candidateSlug
- metadata_json.candidateTitle
- metadata_json.semanticLayer
- metadata_json.categoryType
- metadata_json.resolutionStatus
- metadata_json.p4Step: P4.10.0-C8-P

## 9. Safety boundary

C8-P must not create value_object_category_links when:

- categoryDerivationDryRun = true
- categoryId is null
- resolutionStatus is unresolved
- candidate is rejected
- candidate has no valid UUID categoryId

## 10. P2-B result

P4.10.0-C8-P2-B result: PASSED.

Live constraints are now understood and are sufficient for safe additive TypeScript integration.

## 11. Next step

Proceed to P4.10.0-C8-P3:

- add optional additionalCategoryLinks contract to valueObjectBridge.ts
- keep old bridge behavior unchanged when additionalCategoryLinks is absent
- use source = rule
- store Category Derivation source in metadata_json.sourceLayer
- create links only for resolved candidates
- do not create links for dryRun/unresolved candidates
