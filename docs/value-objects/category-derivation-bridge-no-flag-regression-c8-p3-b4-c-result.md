# P4.10.0-C8-P3-B4-C — No-Flag Regression PASS Result

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / bridge no-flag regression after B3-fix1

## 1. Context

P4.10.0-C8-P3-B3 introduced a bridge loop call to:

- createAdditionalValueObjectCategoryLinks()

The first browser regression test found a runtime failure:

- v42Projection is not defined

P4.10.0-C8-P3-B3-fix1 fixed the scope problem by replacing out-of-scope:

- v42Projection.activityEventValueObjectLinkId

with stable carrier field:

- createdItem.activityEventValueObjectLinkId

## 2. Browser regression test

Browser test script:

- docs/browser-tests/P4.10.0-C8-P3-B4_no_flag_bridge_regression.js

Endpoint:

- /api/activity/debug/free-text-value-object-test

Payload:

- inputText: walked to work for 15 minutes
- durationMinutes: 15
- no enableCategoryDerivation flag
- no additionalCategoryLinks input

## 3. Runtime result

Result:

- HTTP status: 200
- response ok: true
- status: created_and_bridge_processed
- Category Derivation: disabled / skipped because feature flag is disabled
- valueObjectBridge.ok: true
- valueObjectBridge.bridge.createdCount: 1
- valueObjectBridge.bridge.errors: []

Event created during PASS test:

- ca6fbfef-b0cd-4e98-b512-a55099b5ca04

Processing run:

- 330d1ed9-5f9e-4dbf-8429-200eb5bee537

Value Object Bridge created item:

- valueObjectId: 291b2613-0f5b-406f-8bfc-f57eb619c107
- valueObjectInstanceId: f11fc871-f28d-4213-8a8a-cfc15272d06f
- activityEventValueObjectLinkId: 5c42e76f-45c1-4442-aede-5a25ae08bfb3
- stateDeltaId: 4f077690-4020-43dd-84b1-8d6fbec297af
- aggregateId: 013b58eb-5a1f-415c-935b-44d2b9b2a35f
- snapshotId: 360eac20-9cd2-426d-aea8-ccceae9f6f9d
- usageAggregateId: 8bbe137f-edf3-402b-ae90-f4c800eb78e2

## 4. Checks table

All browser checks passed:

- http200: true
- responseOkTrue: true
- validJson: true
- bridgeLikeObjectFound: true
- createdItemsPositive: true
- additionalFieldsVisibleOnCreatedItems: true
- additionalLinksEmpty: true
- additionalErrorsEmpty: true
- categoryDerivationNotEnabled: true

Final browser result:

- RESULT: PASS — C8-P3-B4 no-flag regression is stable.

## 5. Meaning

The bridge loop call for additionalCategoryLinks is now safe when no additionalCategoryLinks are provided.

Old no-flag behavior is preserved:

- event is created
- mapper produces one mapping
- bridge processes one created item
- v4.2 projection works
- state delta is created
- aggregate is updated
- snapshot is updated
- Category Derivation remains disabled
- no additional value_object_category_links are created
- no additional category-link errors are produced

## 6. Current safety boundary

At this point:

- bridge accepts optional additionalCategoryLinks
- helper exists
- helper is called from bridge loop
- no-flag regression passes

But debug route still does not pass resolved Category Derivation candidates into additionalCategoryLinks.

## 7. Next step

Proceed to P4.10.0-C8-P3-B5:

- prepare route-side integration map
- convert resolved Category Derivation candidates into additionalCategoryLinks
- pass them into processActivityValueObjectBridge only when categoryDerivationDryRun=false and candidates are resolved
- keep dryRun/unresolved behavior unchanged
