# C33-P.3 — Preview result display contract

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-P — Activity Capture product integration.

---

## 1. Decision

C33-P.3 defines what the user-facing Activity Capture preview may display after the detached semantic preview skeleton from C33-P.2.

```text
C33-P.3 RESULT: PREVIEW_RESULT_DISPLAY_CONTRACT_COMMITTED_AND_PUSHED
```

Main decision:

```text
The UI may show a temporary Activity Review draft, but it must clearly mark the result as not saved yet.
```

This step is documentation-only.

```text
NO ROUTE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO PRODUCTION PERSISTENCE.
```

---

## 2. Source route and adapter

C33-P.2 created:

```text
lib/activity/capture/activityCaptureDetachedPreviewAdapterV0.ts
src/app/api/activity/capture/detached-semantic-preview/route.ts
```

Current Activity Capture preview route:

```text
POST /api/activity/capture/detached-semantic-preview
```

Current route mode:

```text
activity_capture_detached_preview_no_write_v0
```

The route produces a preview view-model, not a saved record.

---

## 3. Required user-facing card

The Activity Capture UI must show the preview as a temporary review card.

Recommended title:

```text
I understood it like this
```

Russian title:

```text
Я понял это так
```

Required status marker:

```text
This preview is not saved yet.
```

Russian marker:

```text
Предпросмотр ещё не сохранён.
```

The user must be able to understand:

```text
This is an interpretation, not a saved Activity Event.
```

---

## 4. Activity Review Draft display model

The UI may consume and display this safe shape:

```ts
type ActivityReviewDraftDisplayV0 = {
  title: "I understood it like this";
  userFacingTitleRu: "Я понял это так";
  savedStatus: "not_saved_yet";
  rawText: string;
  inputLanguage: string;
  source: string;
  mode: "preview_only";
  notSavedYet: true;
  canEditBeforeSave: true;
  canConfirmNow: false;
  confirmationRequiresLaterGate: true;
};
```

Required interpretation:

```text
canConfirmNow = false means no save/confirm operation is available in C33-P.3.
```

---

## 5. Safe fields to display

The UI may show:

- raw input text;
- input language;
- source;
- route mode;
- preview title;
- not saved marker;
- semanticPreviewReady flag;
- orchestrationReady flag;
- transactionStepCount;
- memberTransactionStepCount;
- blockedAuditTransactionStepCount;
- warnings;
- errors;
- safe no-write side-effect flags.

The UI may show a developer-only/debug section only if clearly labelled:

```text
Technical preview data
```

---

## 6. Fields that must not be shown as saved facts

The UI must not display these as if they were persisted:

```text
Activity Event saved
Stable Semantic Bundle saved
Value Object created
State updated
Timeline updated
Semantic Capital updated
Personal history updated
```

The UI must not label preview output as:

```text
confirmed
verified
permanent
saved
official
final
diagnosis
income recorded
health improved
muscle growth achieved
```

---

## 7. Side-effect banner rules

If all no-write flags are false, the UI may show a safe banner:

```text
Preview only — nothing was saved.
```

Required no-write flags:

```text
dbReadExecuted = false
dbWriteExecuted = false
activityEventCreated = false
stableBundlePersisted = false
valueObjectCreated = false
activityValueObjectLinkCreated = false
stateFactCreated = false
stateDeltaCreated = false
stateSnapshotCreated = false
rowsActuallyWritten = 0
```

If any of these flags is unsafe, UI must show:

```text
Unsafe preview response — do not display as normal user preview.
```

and block the normal confirmation path.

---

## 8. Warning display rules

Warnings may be displayed as soft notices.

Examples:

```text
This preview is not saved yet.
Activity Event is not created in C33-P.2.
Stable Semantic Bundle is not persisted in C33-P.2.
```

UI treatment:

```text
informational, not an error
```

Warnings must not be hidden if they affect user trust or persistence state.

---

## 9. Error display rules

If `ok = false`, the UI must show an error state.

Examples:

```text
rawText is required
activityEventId is not accepted by Activity Capture detached preview
user_id is not accepted by Activity Capture detached preview
allowValueObjectCreation is not allowed in Activity Capture detached preview
allowStateWrites is not allowed in Activity Capture detached preview
```

Required behavior:

```text
do not show semantic chips as valid
do not show "ready to save"
do not allow confirm/save
show editable input so user can correct request
```

---

## 10. Unknown / needs-review display

If preview contains unknown or blocked audit counts, the UI may show:

```text
Some meanings may need review.
```

For C33-P.3, this remains a display signal only.

Not allowed:

```text
create active category
merge category
create external concept mapping
create Semantic Capital
```

These belong to later blocks:

```text
C33-Q — Semantic Review / New Concepts UI contract
C33-W — Analytics / Semantic Capital / Audit
```

---

## 11. Safe semantic chips

The UI may show semantic chips only as provisional.

Recommended label:

```text
Suggested meaning
```

Russian label:

```text
Предполагаемый смысл
```

The UI must not show category chips as:

```text
confirmed category
active ontology
saved category
global category
```

Provisional chips should be visually distinct from confirmed items in future UI.

---

## 12. Health, physiology and state claim safety

The preview may not state medical/physiological facts.

Allowed:

```text
Possible load/recovery signal
May require later review
Proxy signal only
```

Forbidden:

```text
hormone level changed
muscle growth confirmed
diagnosis
medical conclusion
state fact created
state delta created
state snapshot updated
```

State display belongs to later blocks:

```text
C33-S — State hooks safety package
C33-T — State facts/deltas/snapshots MVP
```

---

## 13. Money / work / outcome claim safety

The preview may not state real economic outcomes without evidence.

Allowed:

```text
Possible business/work/money-related activity
Suggested domain: money/work/business
```

Forbidden:

```text
income created
invoice issued
purchase confirmed
points awarded
certificate created
```

Commercial writes remain outside C33-P.3.

---

## 14. Button and action rules

Allowed buttons in C33-P.3 UI design:

```text
Edit text
Preview again
Copy preview
Open detailed technical preview
```

Forbidden buttons unless later gate exists:

```text
Save Activity
Confirm Activity
Create Value Object
Create Category
Update State
Persist Stable Bundle
Attach to Activity Event
```

If shown as disabled future actions, they must be labelled clearly:

```text
Requires future save/confirm gate
```

---

## 15. Privacy display rules

Because detached preview is currently no-auth/no-DB/no-write, UI must not imply personal account persistence.

Required wording:

```text
This preview is temporary and is not added to your history yet.
```

If UI is used inside an authenticated shell, it still must not imply persistence until C33-P.4/C33-P.5 define save/confirm boundary.

---

## 16. Relationship to C33-P.4

C33-P.4 must define what happens before a preview can become saved.

C33-P.4 should answer:

- when raw text becomes Activity Event;
- when stable semantic bundle may be persisted;
- what explicit user confirmation is required;
- what auth/session requirements are needed;
- whether DB write gates are still closed;
- how correction/audit rows will be handled later.

C33-P.3 does not answer these as implementation. It only defines display safety.

---

## 17. What C33-P.3 does not implement

C33-P.3 does not implement:

- UI components;
- route changes;
- database writes;
- Activity Event creation;
- Stable Semantic Bundle persistence;
- Value Object creation;
- State writes;
- Semantic Review workflow;
- Semantic Capital;
- auth/session implementation;
- save/confirm workflow.

C33-P.3 is documentation-only.

---

## 18. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-P.1 Activity Capture detached preview contract.
2. C33-P.2 Activity Capture detached preview skeleton proof.
3. C33-O.2 product route skeleton proof.
4. C33-O.5 final lock.
5. C33-N.2 orchestration skeleton proof.
6. C33-M stable bundle service wrapper proofs.

---

## 19. Recovery note

The first C33-P.3 script stopped on an over-strict Russian-title runtime equality check.

This recovery does not weaken product safety. It keeps the no-write/no-persistence checks and treats the Russian display title as a UI text diagnostic, not as a persistence/security invariant.

---

## 20. Recommended next step

Next step:

```text
C33-P.4 — Save/confirm boundary document
```

C33-P.4 should remain no-write unless the user explicitly approves a separate write gate.

---

## 21. C33-P.3 expected result

Expected result:

```text
C33-P.3R RESULT: PREVIEW_RESULT_DISPLAY_CONTRACT_RECOVERY_COMMITTED_AND_PUSHED
C33-P.3 RESULT: PREVIEW_RESULT_DISPLAY_CONTRACT_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

