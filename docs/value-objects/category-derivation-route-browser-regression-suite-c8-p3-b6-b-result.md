# P4.10.0-C8-P3-B6-B — Browser Regression Suite PARTIAL Result

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / route-to-bridge browser regression

## 1. Suite result

Browser suite:

- docs/browser-tests/P4.10.0-C8-P3-B6_route_integration_regression_suite.js

Suite result:

- SUITE RESULT: PARTIAL/FAIL

## 2. Case results

CASE 1 — no flag regression:

- PASS
- HTTP 200
- ok: true
- status: created_and_bridge_processed
- additionalValueObjectCategoryLinks: []
- additionalValueObjectCategoryLinkErrors: []

CASE 2 — Category Derivation dryRun=true:

- PASS
- HTTP 200
- ok: true
- status: created_and_bridge_processed
- Category Derivation enabled
- dryRun=true
- resolution produced unresolved candidates without creating categories
- additionalValueObjectCategoryLinks: []
- additionalValueObjectCategoryLinkErrors: []

CASE 3 — Category Derivation dryRun=false:

- PARTIAL/FAIL
- HTTP 200
- status: created_and_bridge_processed
- valueObjectBridge still processed
- categoryDerivation.ok: false
- additionalLinksExpectation: false

## 3. Case 3 failure cause

Category Derivation resolver failed while trying to create contextual_categories.

Observed errors:

- Create failed for walking: null value in column context_id of relation contextual_categories violates not-null constraint
- Create failed for work: null value in column context_id of relation contextual_categories violates not-null constraint
- Create failed for commute-to-work: null value in column context_id of relation contextual_categories violates not-null constraint
- Create failed for walking-to-work: null value in column context_id of relation contextual_categories violates not-null constraint
- Create failed for duration-minutes: null value in column context_id of relation contextual_categories violates not-null constraint

## 4. Interpretation

The old bridge regression remains stable.

The route-side additionalCategoryLinks guard works safely:

- unresolved candidates are not passed
- candidates with null categoryId are not passed
- therefore no invalid additional category links are created

The current blocking issue is not the bridge helper itself.

The blocking issue is Category Derivation resolver/category creation compatibility with the contextual_categories table schema.

## 5. Next required work

Before changing resolver code, inspect:

- contextual_categories table schema/migrations
- required NOT NULL fields
- existing seed data / default context logic
- resolver create path for contextual_categories

Next step:

- P4.10.0-C8-P3-B6-C — map contextual_categories schema and resolver creation path
