# P4.10.0-C8-P3-B3-fix1 — additionalCategoryLinks Scope Fix

Date: 2026-05-20
Project: gpt-app / AI-NAVIGATOR
Scope: Category Derivation Layer v1 / Value Object Bridge runtime scope fix

## 1. Runtime failure

P4.10.0-C8-P3-B4 browser no-flag regression returned:

- HTTP 200
- event created
- categoryDerivation disabled correctly
- valueObjectBridge failed
- error: v42Projection is not defined

## 2. Cause

The B3 helper call was inserted after the block where v42Projection is declared.

Therefore v42Projection was out of scope in the additionalCategoryLinks block.

## 3. Fix

Replaced out-of-scope references:

- v42Projection.activityEventValueObjectLinkId

with the already available created item field:

- createdItem.activityEventValueObjectLinkId

## 4. Why this is safe

createdItem.activityEventValueObjectLinkId is initialized as null.

When v4.2 projection succeeds, it is assigned from v42Projection.activityEventValueObjectLinkId inside the valid scope.

Outside that scope, createdItem.activityEventValueObjectLinkId is the correct stable carrier value.

## 5. Expected result

The no-flag browser regression should no longer fail with:

- v42Projection is not defined

## 6. Next step

Repeat P4.10.0-C8-P3-B4-B browser no-flag regression.
