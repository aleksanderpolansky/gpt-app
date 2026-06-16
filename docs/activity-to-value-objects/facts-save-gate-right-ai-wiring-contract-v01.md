# Right AI Save Wiring Contract — Activity Facts Save Gate

General Plan: Phase 7 / 12 — Activity facts save flow
General microstep: Step 50 / 76 — Wire save from right AI column
Technical block: ACTIVITY_FACTS_SAVE_GATE_RIGHT_AI_WIRING
Document version: v01
Status: contract plan only, no-write, no-execution

## 1. Purpose

This document defines how the right AI column should start the Activity Facts save flow after user review.

The General Plan says that after review the user clicks “Записать активность”, and the real flow starts in the right AI column.

This Step 50 contract does not enable real database writes yet. It wires the user-visible save intent and the server-mediated request shape to the existing save-gate route.

## 2. Canonical user surface

The canonical user-facing entry point remains the right AI column.

Relevant UI files:

- src/components/workspace/contextual-ai/contextual-ai-column.tsx
- src/components/workspace/workspace-right-ai-column.tsx
- src/components/workspace/contextual-ai/ai-context-header.tsx

Important labels / concepts:

- right AI column
- contextual-ai-column
- workspace-right-ai-column
- Записать активность

## 3. Existing server-mediated route

The wiring must use the existing route:

/api/activity/facts/save-gate

The right AI column must not write directly to Supabase tables.

Hard rule:

- no direct browser Supabase write

## 4. Save intent request shape

When the user clicks “Записать активность” after review, the future request shape must be compatible with the save-gate route.

Required request fields:

- routeMode
- futurePersistenceMode
- sourcePackageId
- idempotencyKey
- clientSafetyConfirmation
- userReviewedPreview
- userConfirmedFactWrite
- userConfirmedMissingValueObjectCreation
- factDecisions
- editedFactDecisions
- valueObjectCandidateDecisions

For a user-visible save attempt, the future request may use:

- routeMode: future_server_mediated_write
- futurePersistenceMode: confirm_save

But this block must still preserve the current no-write guard.

## 5. Current no-write guard

The current wiring must still return the guarded no-write behavior:

- confirm_save remains blocked
- ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED remains active
- productionWriteEnabled=false
- dbWriteExecuted=false
- sqlExecuted=false
- openAiCallExecuted=false

The right AI column may show the intent and route preview, but must not pretend that persistence has already happened.

## 6. Required response contexts

The UI should preserve and display the save-gate contexts already introduced in previous steps:

- partialSaveContext
- ownershipContext
- idempotencyContext

The user should be able to see that the save request is:

- server-mediated
- guarded
- idempotent
- user-owned
- partial-save aware
- still no-write until the dedicated persistence gate

## 7. UI behavior contract

The right AI column should eventually show a save action card with:

- title: Записать активность
- explanation: action starts the server-mediated save flow
- route: /api/activity/facts/save-gate
- current status: blocked / no-write preview
- blocked by: ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED
- visible contexts: partialSaveContext, ownershipContext, idempotencyContext

The UI must avoid duplicate input points. The user still communicates through the single right AI message field, and the action card is an interpreted/reviewed action, not a second free-form activity input.

## 8. What this Step 50 block may patch later

Allowed future no-write patch targets:

- src/components/workspace/contextual-ai/contextual-ai-column.tsx
- src/components/workspace/workspace-right-ai-column.tsx
- src/components/workspace/contextual-ai/ai-context-header.tsx
- src/components/workspace/activity-review/review-actions-section.tsx
- src/components/workspace/activity-review/activity-review-actions.ts
- src/components/workspace/activity-review/activity-review-types.ts

Allowed later behavior:

- add a visible “Записать активность” action card
- build a request preview payload
- call /api/activity/facts/save-gate in preview/no-write mode
- show blocked confirm_save state
- show partialSaveContext
- show ownershipContext
- show idempotencyContext

## 9. What must not be added in this block

This block must not add:

- direct browser Supabase write
- DB insert
- DB update
- DB upsert
- DB delete
- SQL execution
- OpenAI write decision
- hidden activity_event creation
- hidden activity_object_facts creation
- hidden Value Object creation
- real persistence transaction

## 10. Safety markers

No DB writes
No SQL execution
No OpenAI
No commit
No push
No log update

## 11. Acceptance criteria for Step 50

Step 50 can be accepted only if:

1. right AI save wiring contract is documented.
2. no-write wiring is implemented only after this contract.
3. right AI action surface points to /api/activity/facts/save-gate.
4. confirm_save remains blocked by ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED.
5. productionWriteEnabled=false remains visible.
6. partialSaveContext remains visible.
7. ownershipContext remains visible.
8. idempotencyContext remains visible.
9. no direct browser Supabase write appears.
10. no DB writes are executed.
11. no SQL execution occurs.
12. no OpenAI call occurs.
13. no new activity input point is created outside the right AI column.

## 12. Final rule

Step 50 wires the user-visible save intent from the right AI column to the guarded save-gate route. It does not yet unlock real persistence.