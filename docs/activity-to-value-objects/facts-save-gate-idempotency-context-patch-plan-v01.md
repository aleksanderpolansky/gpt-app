# Idempotency Context Patch Plan - Activity Facts Save Gate

General Plan: Phase 7 / 12 - Guarded Activity Facts save flow
General microstep: Step 48 / 76 - Idempotency key
Technical block: ACTIVITY_FACTS_SAVE_GATE_IDEMPOTENCY
Patch plan version: v01
Status: planning only, no-write, no-execution

## 1. Purpose

This plan defines the next no-write source patch for the Activity Facts save gate.

The patch should expose an idempotencyContext object in the save-gate preview response and UI.
The goal is to make replay-safety visible before any real persistence is enabled.

## 2. Core safety rule

- no direct browser Supabase write
- Preview is not write
- confirm_save remains blocked
- ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED remains active
- productionWriteEnabled=false
- No SQL execution
- No OpenAI
- No DB writes
- No commit
- No push

## 3. Target behavior after patch

GET /api/activity/facts/save-gate:
- returns preview response
- includes ownershipContext
- includes idempotencyContext
- productionWriteEnabled=false
- no DB write

POST /api/activity/facts/save-gate with preview mode:
- returns preview response
- includes idempotencyContext
- futurePersistenceMode = preview
- no DB write

POST /api/activity/facts/save-gate with futurePersistenceMode = confirm_save:
- confirm_save remains blocked
- returns or contains ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED
- includes or preserves idempotencyContext
- no DB write

## 4. Proposed idempotencyContext shape

Type name: ActivityFactsSaveGateIdempotencyContext

Required fields:
- mode: no_write_preview
- idempotencyKeyRequiredForConfirmSave: true
- sourcePackageIdRequiredForConfirmSave: true
- replaySafe: true
- duplicateClickCreatesDuplicateFacts: false
- duplicateRequestPolicy: same key same payload returns same result
- conflictPolicy: same key different payload rejects conflict
- uniquenessScope: user_id + idempotency_key
- requestHashRequiredForRealWrites: true
- serverMediatedPersistenceRequired: true
- directBrowserSupabaseWriteAllowed: false
- protectedTargets: activity_events, activity_event_measures, activity_object_facts, activity_fact_review_items, activity_fact_recalculation_queue
- confirmSaveEnabled: false
- confirmSaveBlockedBy: ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED
- currentImplementation: contract_only_no_persistence

Required exact vocabulary markers:
- idempotencyContext
- idempotencyKey
- sourcePackageId
- replaySafe
- duplicate click
- duplicateRequestPolicy
- requestHashRequiredForRealWrites
- user_id + idempotency_key
- same key same payload returns same result
- same key different payload rejects conflict
- one processing package must not create duplicate activity_event

## 5. Source patch targets

New helper file:
src/lib/activity/facts/saveGate/idempotencyContext.ts

Purpose:
- define ActivityFactsSaveGateIdempotencyContext
- export buildNoWriteIdempotencyContext
- accept sourcePackageId and idempotencyKey from validated request summary
- avoid Supabase imports
- avoid OpenAI imports
- avoid DB access
- avoid SQL execution

Expected function name:
buildNoWriteIdempotencyContext

Route target file:
src/app/api/activity/facts/save-gate/route.ts

Route patch:
- import buildNoWriteIdempotencyContext
- add idempotencyContext to buildNoWriteResponse
- pass sourcePackageId from params.validation.summary.sourcePackageId
- pass idempotencyKey from params.validation.summary.idempotencyKey
- keep productionWriteEnabled=false
- keep confirmSaveEnabled=false
- keep ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED

UI target file:
src/components/activity-to-value-objects/save-gate-plan-preview.tsx

UI patch:
- extend response type with idempotencyContext
- render Idempotency context
- render Replay safe
- render Duplicate click creates duplicate facts
- render Idempotency uniqueness scope
- render Idempotency block code

## 6. What must not be added

The next patch must not add:
- Supabase client import
- service role secret access
- insert/upsert/update/delete execution
- RPC execution
- SQL execution
- OpenAI call
- real idempotency DB lookup
- real request hash persistence
- real save ledger
- real persistence transaction

The patch is still no-write.

## 7. Why no real DB idempotency yet

Real idempotency requires a storage layer or unique constraint.
That belongs to a later SQL/write gate.
Step 48 should first expose and verify the contract in API/UI without enabling persistence.

## 8. Acceptance criteria for next no-write patch

The next patch can be accepted only if:
1. source compiles/lints
2. idempotencyContext appears in API response
3. UI displays idempotency safety information
4. ownershipContext remains present
5. confirm_save still returns or contains ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED
6. productionWriteEnabled remains false
7. no DB writes
8. no SQL execution
9. no OpenAI call
10. no direct browser Supabase write
11. local smoke confirms GET preview, POST preview, POST confirm_save block

## 9. Current conclusion

The next implementation should be a no-write idempotencyContext exposure patch.
It should make replay-safety visible without enabling persistence.
