# Idempotency Contract Plan - Activity Facts Save Gate

General Plan: Phase 7 / 12 - Guarded Activity Facts save flow
General microstep: Step 48 / 76 - Idempotency key
Technical block: ACTIVITY_FACTS_SAVE_GATE_IDEMPOTENCY
Document version: v01
Status: planning contract, no-write, no-execution

## 1. Purpose

This document locks the idempotency contract for the future Activity Facts save gate.

The goal is to make the future confirm_save operation replay-safe.
A duplicate click, browser retry, network retry, or repeated POST must not create duplicate activity_event, activity_event_measures, activity_object_facts, activity_fact_review_items, or activity_fact_recalculation_queue rows.

Core rule:

one processing package must not create duplicate activity_event

## 2. Current baseline

The current route is still a no-write contract route.

Known current facts:
- requestValidation already requires and summarizes idempotencyKey.
- executionPlan already carries idempotencyKey in the no-write plan.
- persistenceContract already carries idempotencyKey into the future activity_events draft row and contract root.
- UI already shows Idempotency key from requestSummary.
- route itself does not execute persistence and does not yet perform an idempotency lookup.
- ownershipContext is present and says server-derived ownership is required.
- productionWriteEnabled=false.
- confirm_save remains blocked.
- ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED remains the blocking code.

## 3. Non-negotiable safety rules

- Preview is not write.
- no direct browser Supabase write
- confirm_save remains blocked
- productionWriteEnabled=false
- No SQL execution
- No OpenAI
- No DB writes
- No commit
- No push

## 4. Idempotency vocabulary

### sourcePackageId

sourcePackageId identifies the processing package or review package that the user is trying to save.

Rules:
- It must be present in every future save request.
- It must be visible in preview and review UI.
- It helps tie the save request to the reviewed package.
- It is not sufficient alone for deduplication because the same package may be reviewed again with different decisions.

### idempotencyKey

idempotencyKey is the replay-safety key for a future server-mediated save.

Rules:
- It must be required before confirm_save can ever be enabled.
- It must be validated as a safe ID.
- It must be included in the future persistence contract.
- It must be attached to the future activity_events row or a dedicated save ledger.
- It must be scoped to the authenticated owner.
- Recommended uniqueness scope: user_id + idempotency_key.
- If organization-scoped saves appear later, the scope must be revisited.

## 5. Future server-mediated idempotency behavior

The future save route should behave as follows:

1. Receive reviewed package and idempotencyKey.
2. Derive user/actor ownership from server context.
3. Reject if idempotencyKey is missing or invalid.
4. Check whether the current user already used the same idempotencyKey.
5. If not used, perform one transaction for activity_events, activity_event_measures, activity_object_facts, activity_fact_review_items, and activity_fact_recalculation_queue.
6. Store the idempotency result.
7. If the same key is repeated, return the original save result instead of creating duplicates.
8. If the same key is repeated with materially different payload, reject as idempotency conflict.

## 6. Target tables affected by idempotency

Future idempotency must protect writes to:

- activity_events
- activity_event_measures
- activity_object_facts
- activity_fact_review_items
- activity_fact_recalculation_queue

The contract must also support a future save ledger or unique constraint.

## 7. Possible implementation options

Option A - unique field on activity_events:
- Add idempotency_key to activity_events.
- Add unique index on user_id + idempotency_key.
- Simple for one event per save.
- Less flexible if a save package later creates more than one event.

Option B - dedicated save ledger:
- Create a table such as activity_fact_save_requests.
- Store user_id, idempotency_key, source_package_id, request_hash, result pointers, status.
- Best long-term replay-safe design.
- Requires a later SQL gate.

Option C - no DB idempotency, only client key:
- Not acceptable for real persistence.
- Browser-side prevention is not enough.

Recommended future direction: dedicated server-side save ledger, but this document does not execute SQL.

## 8. Request hash rule

The future idempotency layer should store a stable request hash.

Reason:
- same user_id + idempotency_key + same request hash = return same result
- same user_id + idempotency_key + different request hash = reject conflict

The first no-write patch may expose this as contract vocabulary only.

## 9. UI implications

The preview UI should show:

- sourcePackageId
- idempotencyKey
- futurePersistenceMode
- ownershipContext
- whether the save is replay-safe
- that duplicate click should not duplicate facts in the future
- that confirm_save remains blocked now

## 10. Acceptance criteria for Step 48

Step 48 can be accepted only if:

1. idempotencyKey contract is documented.
2. route/response exposes no-write idempotency safety context.
3. UI shows idempotency safety information.
4. confirm_save remains blocked.
5. ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED remains active for write intent.
6. no direct browser Supabase write is introduced.
7. no DB writes occur.
8. no SQL execution occurs.
9. no OpenAI call occurs.
10. local smoke proves GET preview, POST preview, and blocked POST confirm_save.

## 11. Hard rule

A repeated save request with the same user_id + idempotency_key must not create duplicate facts.

Until real persistence is implemented, this remains a no-write contract and UI/API safety signal.
