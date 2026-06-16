# Partial Save Policy - Activity Facts Save Gate

General Plan: Phase 7 / 12 - Activity facts save flow
General microstep: Step 49 / 76 - Partial save rules
Technical block: ACTIVITY_FACTS_SAVE_GATE_PARTIAL_SAVE
Document version: v01
Status: policy contract, no-write, no-execution

## 1. Purpose

This document defines the partial save policy for the future Activity Facts save gate.

The core problem: a user may review only part of a processing package.
Some fact decisions may be accepted, edited, rejected, deferred, ignored, or still pending.
Some Value Object candidates may be missing, deferred, skipped, or not yet confirmed.

The save gate must not fail the entire package merely because some items are incomplete.

Core rule:

partial review is allowed

## 2. Current no-write baseline

The current implementation remains a no-write preview contract.

Current safety context:
- confirm_save remains blocked
- ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED remains the write-intent block
- productionWriteEnabled=false
- ownershipContext is present
- idempotencyContext is present
- No DB writes
- No SQL execution
- No OpenAI
- No commit
- No push

## 3. Vocabulary

### accepted

A user accepted an AI-proposed fact without changing its substance.

Policy:
- accepted facts can be planned for activity_object_facts
- accepted facts count as saveable facts
- accepted facts may create review items for audit visibility

### edited

A user changed a proposed fact before accepting it.

Policy:
- edited facts can be planned for activity_object_facts
- edited facts count as saveable facts
- edited facts must preserve the edited payload and review/audit visibility

### acceptedOrEditedFactLocalIds

This is the future saveable fact set.

Policy:
- acceptedOrEditedFactLocalIds = accepted fact IDs + edited fact IDs
- activity_event can be created only when at least one accepted or edited fact exists
- if acceptedOrEditedFactLocalIds.length > 0, future save may create activity_event and linked fact rows

### rejected

A user explicitly rejected a proposed fact.

Policy:
- rejected facts must not create activity_object_facts
- rejected facts may create activity_fact_review_items for audit visibility
- rejected facts may appear in skipped / review summary

### deferred

A user decided to postpone the fact decision.

Policy:
- deferred facts must not create activity_object_facts
- deferred facts should remain visible as skipped/deferred review state
- deferred facts must not block accepted/edited facts from being saved

### ignored

A proposed fact is treated as not relevant or intentionally ignored.

Policy:
- ignored facts must not create activity_object_facts
- ignored facts may create review items only if audit visibility is useful
- ignored should not be confused with rejected: rejected is an explicit negative decision; ignored may be low-relevance dismissal

### pending

A decision has not been completed.

Policy:
- pending facts must not create activity_object_facts
- pending facts must not block accepted/edited facts
- pending review state must stay visible if the package remains open

### missing Value Object

A proposed fact refers to a semantic object where no confirmed Value Object exists yet.

Policy:
- missing Value Object must not break the whole save
- if the fact is not linked to a confirmed Value Object, it must not create a final activity_object_fact
- the user should be offered create/use-existing/defer/skip decisions for the Value Object candidate
- confirmed facts with confirmed Value Objects can still be saved

## 4. Activity Event creation policy

Future persistence rule:

activity_event can be created only when at least one accepted or edited fact exists

If there is at least one accepted or edited fact:
- create one activity_event as chronological source of truth
- do not duplicate chronological time per object
- create measures only as linked measures for the event/facts according to the final persistence contract
- create activity_object_facts only for saveable facts
- create activity_fact_review_items for audit/review visibility
- enqueue activity_fact_recalculation_queue only for affected objects/facts

If there are zero accepted or edited facts:
- do not create activity_event
- do not create activity_object_facts
- return a clear block reason
- recommended block code: NO_ACCEPTED_OR_EDITED_FACTS
- existing vocabulary may also include no_accepted_or_edited_fact_decisions

## 5. Table-level future policy

### activity_events

Create only when acceptedOrEditedFactLocalIds.length > 0.

### activity_event_measures

Create only for measures that support accepted/edited facts or the accepted event context.

### activity_object_facts

Create only for accepted or edited facts with enough confirmed Value Object linkage.

Do not create rows for:
- rejected
- deferred
- ignored
- pending
- missing Value Object without confirmation

### activity_fact_review_items

May be created for:
- accepted
- edited
- rejected
- deferred
- ignored
- pending

Purpose:
- audit visibility
- user correction
- rollback/undo in later correction UI

### activity_fact_recalculation_queue

Create only for actually saved accepted/edited facts and confirmed object links.

## 6. Partial save context

The next no-write patch should expose a partialSaveContext object.

Proposed shape:

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

## 7. UI policy

The preview UI should show:

- Partial save policy
- Accepted facts are saveable
- Edited facts are saveable
- Rejected/deferred/ignored/pending facts do not create fact rows
- Missing VO does not break the whole save
- Zero accepted/edited facts blocks save
- confirm_save remains blocked now

## 8. What must not be added now

The Step 49 no-write patch must not add:
- DB insert/update/upsert/delete
- Supabase direct browser write
- SQL migration
- RPC execution
- OpenAI call
- real persistence transaction
- real partial save execution

## 9. Acceptance criteria for Step 49

Step 49 can be accepted only if:

1. Partial save policy is documented.
2. API response exposes no-write partialSaveContext.
3. UI displays the partial save policy.
4. existing ownershipContext remains present.
5. existing idempotencyContext remains present.
6. confirm_save remains blocked.
7. ACTIVITY_FACTS_SAVE_GATE_WRITE_NOT_ENABLED remains active.
8. productionWriteEnabled=false.
9. no DB writes.
10. no SQL execution.
11. no OpenAI call.
12. local smoke checks partial/mixed review scenarios.

## 10. Final rule

Partial save means: save only what the user accepted or edited, skip what is rejected/deferred/ignored/pending, and never let missing Value Objects silently create facts or break unrelated accepted facts.

## 11. Exact marker repair

The following exact policy markers are intentionally repeated for automated acceptance:

- review items may be planned for audit visibility
- missing VO must not break the whole save
