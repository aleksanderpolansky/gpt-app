# GPT-APP / AI-NAVIGATOR
# Activity Facts Save Gate - Persistence Service Contract v0.1

Date: 2026-06-16
Block: ACTIVITY_FACTS_SAVE_GATE_SERVICE_DESIGN
Step: 02R / 06
Status: design contract only, no runtime persistence enabled
Safety: no DB writes, no SQL execution, no external AI calls, no commit, no push

## 1. Purpose

This document defines the future server-mediated persistence contract for saving user activity facts.

The future persistence service should save, only after an explicit write gate:
1. activity event;
2. activity event measures;
3. activity object facts;
4. fact review items;
5. recalculation queue items.

The current implementation remains a no-write preview layer.

## 2. Current baseline

The current save-gate route may validate a request and return a no-write execution plan.
It must not create or update database rows.

Baseline rules:
1. No hidden DB writes.
2. No direct browser writes.
3. No SQL execution from this layer.
4. No external AI call from the save-gate route.
5. No automatic Value Object creation without user review.
6. No commit or push from this design step.

## 3. Non-negotiable architecture rules

### 3.1. Server-mediated only

All future persistence must be executed only through server-side code.

The browser must never write directly to:
1. activity_events;
2. activity_event_measures;
3. activity_object_facts;
4. activity_fact_review_items;
5. activity_fact_recalculation_queue;
6. value_objects.

### 3.2. Authenticated actor ownership

The server must derive the user and actor from the authenticated session.
The request body must not be trusted for user ownership.

Forbidden future behavior:
1. accepting user_id from the browser as source of truth;
2. accepting actor_id from the browser as source of truth;
3. saving facts without server-side ownership resolution;
4. saving user facts as public facts because they reference a public/system Value Object.

### 3.3. User-owned facts

A shared/system Value Object may be public, but the fact linked to it remains private and user-owned.

Example: if Alexander records 'slept 10 minutes', the system may link 10 minutes to Sleep, Recovery, Nervous System Recovery, and Regeneration.
The Value Objects may be global/system objects.
The facts and measures remain owned by Alexander only.

### 3.4. No chronological double counting

One activity event is one chronological event.
One activity may generate several facts, but the total chronological time of the activity is not multiplied.

Example: 'Played football with child for 30 minutes' may create facts for football, family time, child play, outdoor time, and physical activity.
Each fact may receive 30 minutes of exposure, but the user's chronological activity time remains 30 minutes, not 150 minutes.

## 4. Future input contract

The future persistence request should contain a reviewed processing package.

Minimum fields:
1. mode: preview or confirm_save;
2. idempotencyKey;
3. source;
4. activityDraft;
5. measures;
6. objectFacts;
7. reviewItems.

The activityDraft should include rawText, occurredAt/startedAt/endedAt when available, durationMinutes, timezone, and locale.

Measures should include measureType, value, unit, confidence, and sourceText.

Object facts should include semanticObjectKey, valueObjectId or proposed Value Object data, relationType, metricType, value, unit, status, and confidence.

Review items should include reviewType, message, semanticObjectKey, proposedValueObjectTitle, and proposedParentValueObjectId.

This contract is design-only in this document. This step does not add runtime TypeScript code.

## 5. Future persistence order

### Step 1 - Validate request
Validate mode, idempotencyKey, activityDraft, measures, objectFacts, and reviewItems before any database mutation.

Expected validation errors:
1. 400 for malformed body;
2. 400 for missing idempotencyKey;
3. 400 for invalid measure values;
4. 400 for accepted objectFacts without value_object_id.

### Step 2 - Authenticate
Resolve authenticated user from server session.
Reject unauthenticated requests with 401.

### Step 3 - Resolve actor
Resolve actor_id server-side.
The browser may suggest context, but the server decides final actor ownership.

### Step 4 - Idempotency check
Use idempotencyKey to prevent duplicate save.

Expected future behavior:
1. if key was never used, continue;
2. if key was used and save succeeded, return previous saved IDs;
3. if key was used and save is in progress, return 409 conflict;
4. if key was used with different payload hash, return 409 conflict.

### Step 5 - Start transaction
All database mutations must be in one transaction where technically possible.
For MVP, partial save should be disabled.
If a later operation fails, the whole persistence operation should roll back.

### Step 6 - Insert activity event
Create the chronological source event.
This is the source of truth for who did it, what was written, when it happened, and which text started the process.

### Step 7 - Insert activity event measures
Create normalized measures linked to the activity event.
Examples: duration, distance, money, repetitions, volume, weight, calories.

### Step 8 - Resolve Value Objects
For each objectFact:
1. if valueObjectId exists and belongs to an allowed visibility/ownership scope, link to it;
2. if valueObjectId is missing and the candidate is not confirmed, do not create Value Object;
3. if Value Object creation is later allowed, it must require explicit user confirmation;
4. system/public Value Object references do not make the user fact public.

### Step 9 - Insert activity object facts
Create one fact per accepted objectFact.

Each fact must include activity_event_id, value_object_id, actor/user ownership, metric type, value, unit, status, semantic relation type, and source confidence if available.

### Step 10 - Insert review items
Create review items for missing Value Objects, low confidence matches, ambiguous measures, rejected candidates, and user-confirmation-needed objects.
Review items are not facts.
Review items must not silently become accepted facts.

### Step 11 - Enqueue recalculation
Create recalculation queue rows for affected Value Objects and analytics windows.
For dynamic parent hierarchy, direct facts should remain attached to the direct/current Value Objects.
Parent analytics should be recalculated through current hierarchy or invalidatable cache, not permanently duplicated as stale parent facts.

### Step 12 - Commit and return response
Return saved IDs: activityEventId, measureIds, factIds, reviewItemIds, recalculationQueueIds, and idempotency status.

## 6. Future response contract

Successful future response should include:
1. ok = true;
2. mode = confirm_save;
3. idempotencyStatus = created or replayed;
4. activityEventId;
5. measureIds;
6. factIds;
7. reviewItemIds;
8. recalculationQueueIds;
9. warnings.

Failed future response should include:
1. ok = false;
2. errorCode;
3. message;
4. details when safe.

Required error codes:
1. ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED;
2. ACTIVITY_FACTS_SAVE_GATE_INVALID_BODY;
3. ACTIVITY_FACTS_SAVE_GATE_UNAUTHENTICATED;
4. ACTIVITY_FACTS_SAVE_GATE_FORBIDDEN;
5. ACTIVITY_FACTS_SAVE_GATE_IDEMPOTENCY_CONFLICT;
6. ACTIVITY_FACTS_SAVE_GATE_VALUE_OBJECT_REVIEW_REQUIRED;
7. ACTIVITY_FACTS_SAVE_GATE_PERSISTENCE_FAILED.

## 7. Current write-disabled behavior

Until the explicit write gate is implemented, confirm_save must return ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED.
The current route may still return no-write execution plans for preview/review purposes.

## 8. Partial save policy

For MVP, partial save is disabled.

If any of these fail, the whole operation fails:
1. activity event insert;
2. measure insert;
3. accepted object fact insert;
4. review item insert;
5. recalculation queue insert.

Later versions may introduce recoverable partial-save behavior, but only after audit design.

## 9. Audit and review policy

Every future save operation should make it clear:
1. what the user wrote;
2. what the system interpreted;
3. what the user accepted;
4. which Value Objects were linked;
5. which facts were saved;
6. which candidates still require review.

AI suggestions are not system decisions.
Preview candidates are not saved facts.
Review items are not accepted facts.

## 10. Acceptance criteria for this design step

This Step 02R is accepted if:
1. the contract document exists;
2. no runtime source file is changed;
3. no SQL file is created;
4. no DB write is executed;
5. no external AI call is executed;
6. no commit is executed;
7. no push is executed;
8. the report confirms the document path and current git status.

## 11. Next step after this document

Step 03 should inspect the current save-gate request/plan code and produce a gap map:
1. current request shape;
2. current execution plan shape;
3. missing fields for persistence;
4. missing ownership fields;
5. missing idempotency fields;
6. missing error codes;
7. exact minimal code files that will need modification later.

Step 03 should still be no-write and no-SQL.
