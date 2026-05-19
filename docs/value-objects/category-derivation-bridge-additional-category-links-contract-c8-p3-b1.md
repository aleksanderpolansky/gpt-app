# P4.10.0-C8-P3-B1 — additionalCategoryLinks Type Contract

Date: 2026-05-19
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / Value Object Bridge additive category-link contract

## 1. Result

Updated:

- lib/activity/valueObjectBridge.ts

## 2. What changed

Added exported type:

- AdditionalValueObjectCategoryLink

Added optional field to ProcessValueObjectBridgeInput:

- additionalCategoryLinks?: AdditionalValueObjectCategoryLink[]

## 3. Runtime impact

No runtime behavior was changed in this checkpoint.

The new field is optional and is not used yet.

If additionalCategoryLinks is absent, bridge behavior remains unchanged.

## 4. Why this step is isolated

valueObjectBridge.ts is large and already has verified behavior.

C8-P must be additive and must not break the existing VOI/event-link/aggregate/snapshot pipeline.

Therefore P3-B1 only introduces the type contract.

## 5. Constraint decisions carried forward from P2-B

- category_role = semantic_component is allowed.
- source = category_derivation is not allowed.
- C8-P runtime must use source = rule.
- Category Derivation origin must be stored in metadata_json.sourceLayer.
- Upsert conflict target must remain value_object_id, category_table, category_id, category_role.
- No links for dryRun, unresolved, or null categoryId.

## 6. Next step

Proceed to P4.10.0-C8-P3-B2:

- add runtime helper that converts additionalCategoryLinks into value_object_category_links
- keep it additive
- keep old behavior unchanged when additionalCategoryLinks is absent
