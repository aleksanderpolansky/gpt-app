# Right AI No-Write Patch Plan — Activity Facts Save Gate

General Plan: Phase 7 / 12 — Activity facts save flow
General microstep: Step 50 / 76 — Wire save from right AI column
Technical block: ACTIVITY_FACTS_SAVE_GATE_RIGHT_AI_WIRING
Document version: v01
Status: patch plan only, no-write, no-execution

## 1. Purpose

This document defines the next implementation patch for Step 50.

Goal: add a visible no-write save intent from the right AI column to the existing server-mediated save-gate route.

The user-facing action is:

Записать активность

This must be shown as a guarded save intent, not as real persistence yet.

## 2. Required UX direction

The user continues to communicate through the right AI column.

Target wording:

- Save intent card
- Записать активность
- blocked no-write preview
- server-mediated save-gate route

The right AI column should explain:

- the request goes to /api/activity/facts/save-gate
- the route is guarded
- confirm_save is still blocked
- productionWriteEnabled=false
- ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED is the current block code

## 3. Patch target files

Primary patch targets:

- src/components/workspace/contextual-ai/contextual-ai-column.tsx
- src/components/workspace/workspace-right-ai-column.tsx

Reference / optional targets:

- src/components/workspace/contextual-ai/ai-context-header.tsx
- src/components/workspace/activity-review/review-actions-section.tsx
- src/components/workspace/activity-review/activity-review-actions.ts
- src/components/workspace/activity-review/activity-review-types.ts

Server route stays unchanged unless a type-only response compatibility issue appears:

- /api/activity/facts/save-gate
- src/app/api/activity/facts/save-gate/route.ts

## 4. Request contract to display in UI

The patch should display or prepare a preview payload with these fields:

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

Expected future values for save intent:

- routeMode: future_server_mediated_write
- futurePersistenceMode: confirm_save

But the actual current behavior remains blocked.

## 5. Required response contexts

The UI should preserve these contexts and show them if returned:

- partialSaveContext
- ownershipContext
- idempotencyContext

## 6. No-write behavior to preserve

The next patch must preserve:

- confirm_save remains blocked
- ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED remains active
- productionWriteEnabled=false
- dbWriteExecuted=false
- sqlExecuted=false
- openAiCallExecuted=false

## 7. Hard prohibitions

The patch must not add:

- no direct browser Supabase write
- Supabase client write
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

## 8. Suggested visual block

The right AI column may add a compact action/status block:

Title:

Записать активность

Status:

blocked no-write preview

Route:

/api/activity/facts/save-gate

Mode:

future_server_mediated_write / confirm_save

Blocked by:

ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED

Visible contexts:

partialSaveContext, ownershipContext, idempotencyContext

Safety:

productionWriteEnabled=false

## 9. Local smoke expectations after no-write patch

Expected checks after implementation:

1. `/workspace` or right AI page loads.
2. right AI column renders.
3. text “Записать активность” is visible.
4. text “/api/activity/facts/save-gate” is visible.
5. text “ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED” is visible.
6. text “productionWriteEnabled=false” is visible.
7. text “partialSaveContext” is visible.
8. text “ownershipContext” is visible.
9. text “idempotencyContext” is visible.
10. no DB writes occur.
11. no SQL execution occurs.
12. no OpenAI call occurs.
13. no direct browser Supabase write appears.
14. confirm_save remains blocked.

## 10. Acceptance markers

Required markers after no-write patch:

- Right AI No-Write Patch Plan
- Step 50 / 76
- ACTIVITY_FACTS_SAVE_GATE_RIGHT_AI_WIRING
- Записать активность
- right AI column
- contextual-ai-column
- workspace-right-ai-column
- /api/activity/facts/save-gate
- future_server_mediated_write
- confirm_save
- routeMode
- sourcePackageId
- idempotencyKey
- clientSafetyConfirmation
- userReviewedPreview
- userConfirmedFactWrite
- userConfirmedMissingValueObjectCreation
- factDecisions
- editedFactDecisions
- valueObjectCandidateDecisions
- partialSaveContext
- ownershipContext
- idempotencyContext
- productionWriteEnabled=false
- ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED
- no direct browser Supabase write
- Save intent card
- blocked no-write preview
- No DB writes
- No SQL execution
- No OpenAI
- No commit
- No push
- No log update

## 11. Final rule

This Step 50 patch only wires a visible right AI save intent to the guarded save-gate contract. It does not unlock real persistence.