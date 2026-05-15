# Activity Intake Lifecycle P4.2 Documentation

Date: 2026-05-15
Project: gpt-app / Activity Recording Layer
Branch: main
Scope: raw intake -> imported_pending review -> edit/reject/confirm -> debug trace

## 1. Confirmed state

P4.2.5-P4.2.19 are completed, smoke-tested, committed and pushed.

Core lifecycle:

external/API/NFC/wearable/calendar/app signal
  -> raw_activity_signal
  -> duplicate OR ignored OR promoted
  -> activity_event(status: imported_pending)
  -> edit/reject/confirm
  -> archived OR completed
  -> impacts only after confirm

Important rules:

- raw_signal is not a completed activity
- imported_pending is not a completed activity
- completed is allowed only after confirm
- impacts, daily aggregates and current snapshots are created only after completed + matching rules

## 2. Implemented endpoints

### P4.2.5 / P4.2.7 - Raw intake and duplicate handling

Endpoints:
- GET /api/activity/intake
- POST /api/activity/intake

Behavior:
- creates raw_activity_signals only
- returns activityEvent: null
- does not create completed activity events
- repeated external signals return status=duplicate instead of 500
- duplicate matching works by idempotency_key or source_event_id

Tests passed:
- GET ready
- anonymous POST 401
- authenticated POST creates raw signal only
- duplicate returns controlled duplicate response

### P4.2.8 / P4.2.9 - Raw signals list

Endpoint:
- GET /api/activity/intake/signals

Behavior:
- owner-only list of raw signals
- default summary mode
- supports limit, processingStatus, processingStatuses, sourceType, sourceTypes, mode
- summary mode does not expose rawPayload, normalizedPreview or full metadata

Tests passed:
- authenticated summary returns pending/received/processing signals
- summary mode hides heavy payload

### P4.2.10 - Promote raw signal

Endpoint:
- POST /api/activity/intake/signals/[id]/promote

Behavior:
- raw_signal -> imported_pending activity_event
- raw signal gets output_event_id
- no impacts, no daily aggregates, no current snapshots
- repeat promote returns already_promoted

Stored promotion metadata:
- promotionFlow: P4.2.10
- rawSignalId
- rawSignalSourceType
- rawSignalSourceEventId
- rawSignalIdempotencyKey
- rawSignalProcessingStatusBeforePromotion
- noImpactsCreated: true
- noDailyAggregatesCreated: true
- noCurrentSnapshotsCreated: true

### P4.2.11 - Confirm imported_pending

Endpoint:
- POST /api/activity/intake/events/[id]/confirm

Behavior:
- only imported_pending can be confirmed
- imported_pending -> completed
- processing_status -> processed
- processActivityImpacts is called
- repeat confirm returns already_confirmed

Expected current skip:
- If event has no activity_template_id, no activity_type_id and no active rules, impact processor returns skipped=true.
- This is not a defect.

Stored confirmation metadata:
- confirmationFlow: P4.2.11
- importedPendingConfirmed: true
- importedPendingConfirmedAt
- importedPendingPreviousStatus
- reviewNote

### P4.2.12 / P4.2.13 - Review queue

Endpoint:
- GET /api/activity/intake/events

Behavior:
- read-only review queue
- owner-only
- default status=imported_pending
- supports limit, status, statuses, processingStatus, processingStatuses, source, sources, mode

Tests passed:
- anonymous GET 401
- authenticated GET 200
- default queue shows only imported_pending
- completed events do not appear in default queue

### P4.2.14 - Event detail

Endpoint:
- GET /api/activity/intake/events/[id]

Behavior:
- owner-only
- read-only
- returns event summary
- returns linked raw signal summary
- returns reviewReadiness

For imported_pending:
- canConfirm: true
- canReject: true
- canEditBeforeConfirm: true
- shouldCreateImpactsNow: false

For completed or archived:
- canConfirm: false
- canReject: false
- canEditBeforeConfirm: false

### P4.2.15 - Ignore raw signal

Endpoint:
- POST /api/activity/intake/signals/[id]/ignore

Behavior:
- only raw signals without output_event_id can be ignored
- processing_status -> ignored
- output_event_id remains null
- activity_event is not created
- repeat ignore returns already_ignored
- already promoted raw signal must be handled through event reject/archive flow

Tests passed:
- anonymous POST 401
- authenticated ignore returns status=ignored
- repeat ignore returns already_ignored
- activityEvent remains null

### P4.2.16 - Reject imported_pending

Endpoint:
- POST /api/activity/intake/events/[id]/reject

Behavior:
- only imported_pending can be rejected
- status -> archived
- processing_status -> skipped
- raw signal linkage is preserved
- no impacts, no daily aggregates, no current snapshots
- repeat reject returns already_rejected

Tests passed:
- anonymous POST 401
- authenticated reject returns rejected_archived
- repeat reject returns already_rejected
- detail after reject is not reviewable

### P4.2.17 - Edit imported_pending before confirm

Endpoint:
- PATCH /api/activity/intake/events/[id]

Editable fields:
- title
- description / comment
- startedAt / started_at
- endedAt / ended_at
- durationMinutes / duration_minutes
- reviewNote / review_note

Behavior:
- only imported_pending can be edited
- completed, archived, cancelled, started or manual events return not_editable
- no impacts, no daily aggregates, no current snapshots
- empty PATCH returns no_changes

Defect found and fixed:
- Before fix: empty PATCH recalculated duration_minutes.
- After fix: empty PATCH returns status=no_changes and changedFields=[]

Tests passed:
- anonymous PATCH 401
- authenticated PATCH updates imported_pending
- event remains imported_pending
- duration recalculates only when timing fields change
- empty PATCH returns no_changes

### P4.2.18 - Full chain smoke test

Tested chains:
- intake -> signals list -> promote -> events queue -> detail -> edit -> reject -> queue cleanup
- intake -> signals list -> promote -> events queue -> detail -> edit -> confirm -> queue cleanup

Reject branch passed:
- rawSignalId: c23de941-527d-4d5f-a606-f9e452abb6d7
- eventId: 791c0490-54a3-40c1-8bd6-0b09691cfed4
- final status: archived / skipped

Confirm branch passed:
- rawSignalId: e7e0dd2d-6472-4978-a8c7-366bf610d0ba
- eventId: bc1e5a84-6fa8-45a5-a50c-89a590ee336c
- final status: completed / processed

All full-chain assertions passed.

### P4.2.19 - Debug trace raw/imported linkage

Endpoint extended:
- GET /api/activity/debug-trace?eventId=<event_id>&mode=summary

Summary mode now includes:
- trace.rawImportedLinkage
- rawSignal.sourceEventId
- rawSignal.idempotencyKey
- promotion metadata
- confirmation metadata
- linkageChecks

Confirmed test:
- eventId: bc1e5a84-6fa8-45a5-a50c-89a590ee336c
- rawSignalId: e7e0dd2d-6472-4978-a8c7-366bf610d0ba

Assertions passed:
- ok: true
- mode summary: true
- has rawImportedLinkage: true
- eventId matches: true
- has raw signal: true
- has sourceEventId: true
- has idempotencyKey: true
- promotionFlow P4.2.10: true
- confirmationFlow P4.2.11: true
- raw signal points to event: true

Summary mode remains safe:
- no rawPayload exposed
- no audit snapshots exposed
- no recalculation JSON exposed

## 3. Current endpoint map

- GET  /api/activity/intake
- POST /api/activity/intake
- GET  /api/activity/intake/signals
- POST /api/activity/intake/signals/[id]/promote
- POST /api/activity/intake/signals/[id]/ignore
- GET   /api/activity/intake/events
- GET   /api/activity/intake/events/[id]
- PATCH /api/activity/intake/events/[id]
- POST  /api/activity/intake/events/[id]/confirm
- POST  /api/activity/intake/events/[id]/reject
- GET   /api/activity/debug-trace

## 4. Tests not to repeat without reason

Do not repeat these unless code changes, something breaks, or security-sensitive logic changes:

- P4.2.6 raw intake smoke tests
- P4.2.7 duplicate handling tests
- P4.2.9 signals list tests
- P4.2.10 promote tests
- P4.2.11 confirm tests
- P4.2.13 review queue tests
- P4.2.14 detail endpoint tests
- P4.2.15 ignore tests
- P4.2.16 reject tests
- P4.2.17 edit tests
- P4.2.18 full chain smoke test
- P4.2.19 debug trace linkage test

Allowed reasons to repeat tests:
- new endpoint
- new status transition
- changed helper used by several endpoints
- changed auth/RLS/ownership/security-sensitive code
- reported breakage
- periodic security check

## 5. Known remaining test data

Old imported_pending test events may remain in the review queue:

- 85a589f9-fb53-49e6-a3ff-d7cc522d282f
- bf7afe58-1784-4173-835a-615306d6ab53

They are not defects. They can be rejected or confirmed later if queue cleanup is needed.

## 6. Next recommended block

Next block:
- P4.4.x - Template mapping for imported events

Purpose:
- source payload/title/adapter -> activity_template / activity_type
- activity_template / activity_type -> event links
- event links -> impact rules
- impact rules -> meaningful impacts after confirm

Reason:
- imported events currently confirm successfully
- but events without activity_template_id or activity_type_id usually produce impactProcessor skipped=true
- this is expected now
- P4.4.x should make imported events semantically useful

## 7. What not to do yet

- Do not start full UX/design yet.
- Do not redesign Activity Today Panel yet.
- Do not add mobile quick capture yet.
- Do not move to Value Object State Layer before imported lifecycle and template mapping are stable.
- Do not use AI for every imported event.
- Do not turn external/API/calendar/wearable signals directly into completed activities.

## 8. Completion status

P4.2.20 is done when this document is committed and pushed.
