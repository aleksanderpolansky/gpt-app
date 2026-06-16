# GPT-APP / AI-NAVIGATOR
# Activity Facts Save Gate - Persistence Gap Map v0.1

Date: 2026-06-16
Block: ACTIVITY_FACTS_SAVE_GATE_SERVICE_DESIGN
Step: 03 / 06
Status: design / inspection only
Safety: no DB writes, no SQL execution, no external AI calls, no commit, no push

## 1. Purpose

This document maps the current no-write save-gate implementation against the future server-mediated persistence contract.

It identifies what is already present, what is only mentioned as preview/planned behavior, and what must be implemented later under a separate write gate.

## 2. Inspected files

- FOUND: src\app\api\activity\facts\save-gate\route.ts - 163 lines, 5598 bytes
- FOUND: src\lib\activity\facts\saveGate\requestValidation.ts - 405 lines, 14204 bytes
- FOUND: src\lib\activity\facts\saveGate\executionPlan.ts - 289 lines, 10091 bytes
- FOUND: src\components\activity-to-value-objects\save-gate-plan-preview.tsx - 627 lines, 22999 bytes
- FOUND: src\app\activity-capture\save-gate-plan-preview\page.tsx - 10 lines, 364 bytes

## 3. Current confirmed baseline

- The save-gate block is still treated as no-write preview.
- Browser-side UI may show planned writes, but it must not persist facts.
- Future persistence must be server-mediated only.
- Facts linked to public/system Value Objects must remain user-owned.
- One activity may create multiple object facts, but chronological time must not be double-counted.

## 4. Requirement presence table

| Key | Pattern | Current status | Required meaning |
|---|---|---|---|
| write_disabled_error | ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED | present_or_mentioned | Current route must still block confirm_save until explicit write gate exists. |
| no_write_execution_plan | noWriteExecutionPlan | present_or_mentioned | Current route should expose only preview/no-write execution plan. |
| planned_writes_preview | plannedWrites | present_or_mentioned | UI should show planned writes without saving them. |
| idempotency_key | idempotencyKey | present_or_mentioned | Future persistence needs idempotencyKey for duplicate-save protection. |
| confirm_save_mode | confirm_save | missing_or_not_detected | Future persistence needs explicit confirm_save mode. |
| activity_event_target | activity_event | present_or_mentioned | Future persistence needs activity event target. |
| measure_target | activity_event_measures | present_or_mentioned | Future persistence needs activity_event_measures target. |
| object_fact_target | activity_object_facts | present_or_mentioned | Future persistence needs activity_object_facts target. |
| review_item_target | activity_fact_review_items | present_or_mentioned | Future persistence needs activity_fact_review_items target. |
| recalculation_queue_target | activity_fact_recalculation_queue | present_or_mentioned | Future persistence needs activity_fact_recalculation_queue target. |

## 5. Current marker evidence

- No marker evidence found.

## 6. Forbidden executable scan result

No forbidden executable write / AI / SQL patterns were detected in the inspected save-gate files.

## 7. Main gaps for future persistence

### GAP-01 - Explicit persistence mode
Future implementation needs a strict separation between preview and confirm_save. confirm_save must remain blocked until write gate is approved.

### GAP-02 - Idempotency
Future implementation needs an idempotencyKey and payload hash policy to prevent duplicate activity/fact creation.

### GAP-03 - Authentication and actor ownership
Future implementation must derive user and actor server-side. user_id or actor_id from browser must not be trusted as source of truth.

### GAP-04 - Value Object resolution
Future implementation must verify that each accepted valueObjectId is visible/usable by the authenticated actor. Missing Value Objects must become review items, not silent facts.

### GAP-05 - Transaction policy
Future implementation needs all-or-nothing persistence for MVP: activity event, measures, facts, review items, and recalculation queue should succeed or roll back together.

### GAP-06 - Review item semantics
Review items must not become accepted facts automatically. They should preserve ambiguity and user-confirmation requirements.

### GAP-07 - Recalculation queue
Future implementation must enqueue affected direct Value Objects and analytics windows. Parent analytics should be recalculated dynamically or by invalidatable cache.

### GAP-08 - Response contract
Future implementation must return saved IDs for activityEventId, measureIds, factIds, reviewItemIds, recalculationQueueIds, and idempotency status.

## 8. Minimal future code areas

Likely future code areas, still not modified by this step:

1. src/app/api/activity/facts/save-gate/route.ts
2. src/lib/activity/facts/saveGate/requestValidation.ts
3. src/lib/activity/facts/saveGate/executionPlan.ts
4. future server-side persistence service file under src/lib/activity/facts/saveGate/
5. future tests or scripts for write-disabled and confirm_save behavior

## 9. Acceptance criteria for Step 03

Step 03 is accepted if:

1. this gap map document exists;
2. no src file is changed;
3. no SQL file is created;
4. no DB write is executed;
5. no external AI call is executed;
6. no commit is executed;
7. no push is executed.

## 10. Next step

Step 04 should prepare a minimal no-write TypeScript contract patch only if needed, or create a commit-gate package if Steps 02 and 03 are accepted as documentation-only changes.
