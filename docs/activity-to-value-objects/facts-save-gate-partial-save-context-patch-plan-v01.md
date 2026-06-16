# Partial Save Context Patch Plan - Activity Facts Save Gate

General Plan: Phase 7 / 12 - Activity facts save flow
General microstep: Step 49 / 76 - Partial save rules
Technical block: ACTIVITY_FACTS_SAVE_GATE_PARTIAL_SAVE
Patch plan version: v01
Status: planning only, no-write, no-execution

## 1. Purpose

This plan defines the next no-write source patch for partial save visibility.

The patch should expose a partialSaveContext object in the save-gate preview response and UI.
The goal is to make partial review behavior visible before any real persistence is enabled.

## 2. Core rule

partial review is allowed

Only accepted and edited facts are future-saveable.
Rejected, deferred, ignored, pending facts must not create activity_object_facts.
A missing Value Object must not break unrelated accepted facts.

## 3. Current safety rules

- no direct browser Supabase write
- Preview is not write
- confirm_save remains blocked
- ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED remains active
- productionWriteEnabled=false
- ownershipContext remains present
- idempotencyContext remains present
- No DB writes
- No SQL execution
- No OpenAI
- No commit
- No push

## 4. Proposed source patch

New helper file:

src/lib/activity/facts/saveGate/partialSaveContext.ts

Type name:

ActivityFactsSaveGatePartialSaveContext

Function name:

buildNoWritePartialSaveContext

The helper must not import Supabase, OpenAI, SQL, or runtime DB code.

## 5. Proposed partialSaveContext shape

Required fields:

- contextKey: partialSaveContext
- mode: no_write_preview
- partialReviewAllowed: true
- acceptedFactsSaveable: true
- editedFactsSaveable: true
- rejectedFactsCreateFacts: false
- deferredFactsCreateFacts: false
- ignoredFactsCreateFacts: false
- pendingFactsCreateFacts: false
- missingValueObjectBlocksWholeSave: false
- activityEventRequiresAcceptedOrEditedFact: true
- zeroAcceptedOrEditedFactsBlockCode: NO_ACCEPTED_OR_EDITED_FACTS
- legacyNoAcceptedOrEditedFactsCode: no_accepted_or_edited_fact_decisions
- confirmSaveEnabled: false
- confirmSaveBlockedBy: ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED
- productionWriteEnabled: false

Vocabulary that must be visible:

- accepted
- edited
- rejected
- deferred
- ignored
- pending
- missing Value Object
- partialSaveContext
- partialReviewAllowed
- acceptedFactsSaveable
- editedFactsSaveable
- rejectedFactsCreateFacts
- deferredFactsCreateFacts
- ignoredFactsCreateFacts
- pendingFactsCreateFacts
- missingValueObjectBlocksWholeSave
- activityEventRequiresAcceptedOrEditedFact
- zeroAcceptedOrEditedFactsBlockCode
- NO_ACCEPTED_OR_EDITED_FACTS
- no_accepted_or_edited_fact_decisions

## 6. Route patch target

File:

src/app/api/activity/facts/save-gate/route.ts

Route patch:
- import buildNoWritePartialSaveContext
- add partialSaveContext to buildNoWriteResponse
- keep ownershipContext
- keep idempotencyContext
- keep productionWriteEnabled=false
- keep confirmSaveEnabled=false
- keep ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED

No runtime writes may be added.

## 7. UI patch target

File:

src/components/activity-to-value-objects/save-gate-plan-preview.tsx

UI patch:
- extend response type with partialSaveContext
- render Partial save context
- render Partial review allowed
- render Accepted facts saveable
- render Edited facts saveable
- render Rejected facts create facts
- render Deferred facts create facts
- render Missing VO blocks whole save
- render Zero accepted/edited block code

## 8. What must not be added

The next patch must not add:

- DB insert
- DB update
- DB upsert
- DB delete
- Supabase client import
- RPC execution
- SQL execution
- OpenAI call
- real persistence transaction
- real partial save execution

## 9. Local smoke expectations after patch

GET preview should return:
- status 200
- partialSaveContext
- ownershipContext
- idempotencyContext
- productionWriteEnabled=false
- dbWriteExecuted=false
- sqlExecuted=false
- openAiCallExecuted=false

POST preview should return:
- status 200
- partialSaveContext
- partialReviewAllowed=true
- acceptedFactsSaveable=true
- editedFactsSaveable=true

POST confirm_save should remain blocked:
- status 409
- ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED
- partialSaveContext still visible or preserved
- dbWriteExecuted=false
- sqlExecuted=false
- openAiCallExecuted=false

## 10. Acceptance criteria

The next no-write patch can be accepted only if:

1. helper compiles/lints
2. route exposes partialSaveContext
3. UI displays partial save policy
4. ownershipContext remains present
5. idempotencyContext remains present
6. confirm_save remains blocked
7. productionWriteEnabled=false
8. no DB writes
9. no SQL execution
10. no OpenAI call
11. no direct browser Supabase write

## 11. Final implementation note

Step 49 is still a no-write contract step.
It must make partial save rules visible but must not execute persistence.
