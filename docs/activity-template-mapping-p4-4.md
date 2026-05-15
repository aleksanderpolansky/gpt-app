# Activity Template Mapping P4.4 Documentation

Date: 2026-05-15
Project: gpt-app / Activity Recording Layer
Scope: imported activity template mapping after P4.2 raw/imported lifecycle

## 1. Confirmed state

P4.4.1-P4.4.5 are completed, smoke-tested, committed and pushed.

Main result:

Imported raw signals can now be promoted into imported_pending activity_events with attached semantic identifiers:

- activity_template_id
- activity_type_id
- template_id / legacyTemplateId

This means confirmed imported events can now reach processActivityImpacts with real template/type context.

## 2. P4.4.1 - Discovery

Discovery confirmed:

- activity_templates table exists
- activity_types table exists
- impact_rules are queried by activity_template_id and activity_type_id
- promote route previously inserted null values for activity_template_id, activity_type_id and template_id
- activitySourceIntake.ts should not be used for semantic template mapping

Architectural decision:

- activitySourceIntake.ts remains responsible only for source/trust/status decisions
- activityImpactProcessor.ts remains unchanged
- imported template mapping is implemented as a separate helper
- promote route calls the helper before inserting activity_events

## 3. P4.4.2 - Imported activity template mapping helper

New helper:

- lib/activity/importedActivityTemplateMapping.ts

Function:

- mapImportedActivityToTemplate(input)

Mapping strategy:

1. explicit activityTemplateId / activity_template_id
2. explicit legacyTemplateId / legacy_template_id
3. explicit activityTypeId / activity_type_id
4. high-confidence deterministic text match
5. no match if confidence is too low

Important rule:

- mapping does not complete the activity
- mapping does not create impacts
- mapping only prepares imported_pending event for later review/confirm

## 4. P4.4.2 - Promote route integration

Updated file:

- src/app/api/activity/intake/signals/[id]/promote/route.ts

Promote now writes:

- activity_type_id: templateMapping.activityTypeId
- activity_template_id: templateMapping.activityTemplateId
- template_id: templateMapping.legacyTemplateId
- metadata_json.importedTemplateMapping
- metadata_json.templateMappingFlow: P4.4.2

Promote response now includes:

- templateMapping
- activityEvent.activityTemplateId
- activityEvent.activityTypeId
- activityEvent.templateId

Lifecycle remains unchanged:

- raw signal -> imported_pending event
- no completed activity on promote
- no impacts on promote
- no daily aggregates on promote
- no current snapshots on promote

## 5. P4.4.2-C Smoke test

Test used active template:

- templateId: 8eef44f7-9e29-461d-8af0-3db4af1d3c92
- title: German marketing handwriting practice
- activityTypeId: 80e43db3-46c4-4fd2-8c2a-de050cbaca7f
- legacyTemplateId: 0bd61bda-3dea-45a4-a8e0-ca336219df9d

Created test raw signal:

- rawSignalId: 2c24c552-9d25-40a5-ac6d-f5bbf41ed620

Created imported_pending event:

- eventId: ca5ebc30-8b6b-4bc9-ac52-497ecea774fb

Assertions passed:

- ok: true
- status promoted: true
- event imported_pending: true
- mapping matched: true
- mapping explicit template: true
- activityTemplateId attached: true
- activityTypeId attached or template has none: true
- detail activityTemplateId attached: true
- still reviewable before confirm: true
- no impacts on promote: true

## 6. P4.4.3 - Legacy template id display fix

Problem found:

- PROMOTE.activityEvent.templateId was correctly populated
- DETAIL.event.legacyTemplateId was null

Cause:

- some summaries read legacy_template_id
- real activity_events column is template_id

Fixed files:

- src/app/api/activity/intake/events/[id]/route.ts
- src/app/api/activity/intake/events/route.ts
- src/app/api/activity/debug-trace/route.ts

Smoke test passed:

- detail legacyTemplateId fixed: true
- queue legacyTemplateId fixed: true
- debug-trace legacyTemplateId fixed: true

## 7. P4.4.4 - Confirm mapped imported event

Confirmed mapped event:

- eventId: ca5ebc30-8b6b-4bc9-ac52-497ecea774fb

Before confirm:

- status: imported_pending
- activityTemplateId: 8eef44f7-9e29-461d-8af0-3db4af1d3c92
- activityTypeId: 80e43db3-46c4-4fd2-8c2a-de050cbaca7f
- legacyTemplateId: 0bd61bda-3dea-45a4-a8e0-ca336219df9d

After confirm:

- status: completed
- processingStatus: processed
- event is no longer reviewable
- template/type identifiers are preserved

Impact processor result:

- impactRules: 5
- impactEvents: 5
- dailyAggregates: 5
- currentSnapshots: 5

This confirms that template mapping really reaches processActivityImpacts.

## 8. P4.4.5 - Debug trace impact summary aliases

Problem found:

- debug-trace saw 5 impact events
- but impactSummary fields were null

Cause:

- debug-trace used old field names such as target_type and metric
- real impact_events fields are impact_target_type, impact_metric, impact_unit, etc.

Fixed file:

- src/app/api/activity/debug-trace/route.ts

Fixed aliases:

- impact_target_type / target_type
- impact_target_key / target_key
- impact_metric / metric
- impact_direction / direction
- impact_unit / unit
- impact_value_numeric / value_numeric

Smoke test passed:

- targetType filled: true
- targetKey filled: true
- metric filled: true
- direction filled: true
- unit filled: true
- has german writing minutes: true
- has marketing exposure minutes: true
- health impactsFound: true

Confirmed impact summary:

- german_skill / writing_practice_minutes / 9 minutes
- marketing_skill / exposure_minutes / 9 minutes
- right_hand / load_minutes / 9 minutes
- attention / cognitive_load / qualitative
- wrist / load_minutes / 9 minutes

## 9. Tests not to repeat without reason

Do not repeat these unless code changes, something breaks, or auth/RLS/security-sensitive logic changes:

- P4.4.1 discovery
- P4.4.2 explicit template mapping smoke test
- P4.4.3 legacyTemplateId display smoke test
- P4.4.4 confirm mapped imported event smoke test
- P4.4.5 debug-trace impactSummary alias smoke test

## 10. Current endpoint behavior after P4.4

Promote imported signal:

- POST /api/activity/intake/signals/[id]/promote
- creates imported_pending event
- may attach activityTemplateId/activityTypeId/templateId
- does not create impacts

Confirm imported event:

- POST /api/activity/intake/events/[id]/confirm
- imported_pending -> completed
- processActivityImpacts receives mapped template/type
- matching impact_rules create impact_events, daily aggregates and current snapshots

Debug trace:

- GET /api/activity/debug-trace?eventId=<eventId>&mode=summary
- shows rawImportedLinkage
- shows activityTemplateId/activityTypeId/legacyTemplateId
- shows readable impactSummary

## 11. Next recommended block

Next block:

- P4.4.7 / P4.5.x - template mapping review UX and lifecycle polish

Recommended next tasks:

1. Show templateMapping result in imported event detail/review queue.
2. Allow reviewer to change activityTemplateId/activityTypeId before confirm.
3. Add PATCH support for template/type correction on imported_pending events.
4. Add debug-trace visibility for importedTemplateMapping metadata.
5. Later connect this with UI, not now.

## 12. What not to do yet

- Do not redesign full Activity Today Panel yet.
- Do not build mobile quick capture yet.
- Do not use AI mapping by default.
- Do not auto-complete external/imported signals.
- Do not move to Value Object State Layer before review/correction of mapped imported events is stable.

## 13. Completion status

P4.4.6 is done when this document is committed and pushed.

---

## P4.5 Imported pending template/type correction before confirm/reject

Date: 2026-05-15  
Scope: imported_pending events created from raw_activity_signals.

### P4.5.1 — Template/type/legacy PATCH smoke test

Status: DONE / SMOKE TESTED / COMMITTED

Verified:
- imported_pending event can preserve already attached:
  - activity_template_id
  - activity_type_id
  - template_id / legacyTemplateId
- PATCH with the same activityTemplateId returns no_changes when no reviewNote is provided.
- PATCH with the same activityTemplateId + activityTypeId + legacyTemplateId returns no_changes.
- invalid activityTypeId is rejected with HTTP 400.
- event remains imported_pending and reviewable after no-change PATCH.
- no impacts, daily aggregates or current snapshots are created during PATCH.

Important note:
- PATCH with reviewNote is expected to change description/comment, therefore it is not a pure no_changes case.

### P4.5.2 — Confirm after manual template correction

Status: DONE / SMOKE TESTED

Verified flow:
- raw api_webhook signal without high-confidence template match
- promote to imported_pending without template/type/legacy
- PATCH imported_pending with activityTemplateId
- mapper attaches:
  - activity_template_id
  - activity_type_id
  - template_id / legacyTemplateId
- confirm converts imported_pending to completed
- template/type/legacy values are preserved after confirm
- impact processor uses matched rules after confirm
- impact events are created only after confirm
- debug trace shows impactsFound = true

Known observation:
- a repeated confirm returns already_confirmed and skips duplicate impact processing when impact events already exist.
- in that already_confirmed response, dailyAggregates/currentSnapshots may be 0 because duplicate processing is skipped; this is expected.

### P4.5.3 — Reject after manual template correction

Status: DONE / SMOKE TESTED

Verified flow:
- raw api_webhook signal without high-confidence template match
- promote to imported_pending without template/type/legacy
- PATCH imported_pending with activityTemplateId
- mapper attaches:
  - activity_template_id
  - activity_type_id
  - template_id / legacyTemplateId
- reject archives imported_pending event
- event status becomes archived
- processingStatus becomes skipped
- event is removed from default imported_pending review queue
- no impacts, daily aggregates or current snapshots are created
- debug trace shows impactsFound = false

### P4.5.4 — Reject response legacyTemplateId fix

Status: DONE / SMOKE TESTED / COMMITTED

Problem:
- reject response already had activityTemplateId and activityTypeId,
  but legacyTemplateId could be null because the real DB column is template_id,
  not legacy_template_id.

Fix:
- src/app/api/activity/intake/events/[id]/reject/route.ts
- summarizeActivityEvent now reads legacyTemplateId from:
  - legacy_template_id
  - legacyTemplateId
  - template_id
  - templateId

Verified:
- POST /api/activity/intake/events/[id]/reject on already archived event returns:
  - status = already_rejected
  - event.status = archived
  - event.legacyTemplateId = expected template_id
- no impacts, daily aggregates or current snapshots are created.

### Current conclusion after P4.5.4

The imported_pending review lifecycle now supports:

1. Raw external/imported signal intake.
2. Promotion to imported_pending.
3. Automatic or explicit template mapping during promote.
4. Manual template/type correction before confirm/reject.
5. Confirm after correction:
   - completed event
   - template/type preserved
   - impacts only after confirm
6. Reject after correction:
   - archived event
   - skipped processing
   - no impacts
7. Debug trace can show linkage, lifecycle metadata and impact summaries.

### What not to do yet

Do not start full UX/design work yet.
Do not build mobile quick capture yet.
Do not use AI for every imported event by default.
Do not auto-complete external/imported signals.
Do not move to Value Object State Layer before review/correction of mapped imported events is stable.

### Next suggested step

P4.5.5 is complete when this documentation update is committed.

After that, the next technical block should be selected from:
- P4.6: cleanup/stabilization of imported_pending review queue,
- P4.6: correction/audit rows for imported_pending template corrections,
- P4.6: stricter debug trace for template correction lifecycle,
- or move to the next planned Activity Recording Layer block if no additional review-lifecycle gaps remain.

