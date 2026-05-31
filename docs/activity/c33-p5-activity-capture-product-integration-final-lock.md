# C33-P.5 — Activity Capture product integration final lock

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-P — Activity Capture product integration.

---

## 1. Final decision

C33-P is complete as a detached Activity Capture semantic preview integration block.

```text
C33-P RESULT: ACTIVITY_CAPTURE_PRODUCT_INTEGRATION_BLOCK_COMPLETE
```

C33-P does not open save/confirm persistence.

```text
SAVE/CONFIRM WRITE GATE REMAINS CLOSED.
ACTIVITY EVENT CREATION REMAINS CLOSED.
STABLE SEMANTIC BUNDLE PRODUCTION PERSISTENCE REMAINS CLOSED.
VALUE OBJECT CREATION REMAINS CLOSED.
STATE FACT/DELTA/SNAPSHOT CREATION REMAINS CLOSED.
SEMANTIC CAPITAL WRITES REMAIN CLOSED.
ATTACHED ACTIVITY EVENT PREVIEW REMAINS CLOSED.
READ-ONLY OWNERSHIP LOOKUP REMAINS CLOSED.
```

---

## 2. What C33-P added

### C33-P.1 — Activity Capture detached preview contract

Created:

```text
docs/activity/c33-p1-activity-capture-detached-preview-contract.md
```

Locked decision:

```text
Activity Capture may integrate only with detached product semantic preview route at this stage.
It must not save Activity Event, Stable Semantic Bundle, Value Object or State records.
```

Result:

```text
C33-P.1 RESULT: ACTIVITY_CAPTURE_DETACHED_PREVIEW_CONTRACT_COMMITTED_AND_PUSHED
```

### C33-P.2 — Activity input UI/backend wiring skeleton

Created:

```text
lib/activity/capture/activityCaptureDetachedPreviewAdapterV0.ts
src/app/api/activity/capture/detached-semantic-preview/route.ts
```

Locked behavior:

```text
POST /api/activity/capture/detached-semantic-preview
activity_capture_detached_preview_no_write_v0
```

The route/adapter:

- creates no Activity Event;
- persists no Stable Semantic Bundle;
- creates no Value Object;
- creates no State Fact/Delta/Snapshot;
- performs no DB read;
- performs no DB write;
- returns Activity Review draft:
  - "I understood it like this";
  - "Я понял это так";
  - `savedStatus = not_saved_yet`;
  - `canConfirmNow = false`;
  - `confirmationRequiresLaterGate = true`.

Result:

```text
C33-P.2 RESULT: ACTIVITY_CAPTURE_DETACHED_PREVIEW_SKELETON_COMMITTED_AND_PUSHED
```

### C33-P.3 — Preview result display contract

Created:

```text
docs/activity/c33-p3-preview-result-display-contract.md
```

Locked display rules:

```text
The UI may show a temporary Activity Review draft.
The UI must clearly mark the preview as not saved yet.
The UI must not present preview output as saved, confirmed, permanent, medical, financial or state truth.
```

Recovery note:

```text
C33-P.3R was required because the first C33-P.3 script stopped on an over-strict Russian-title runtime equality check.
No product safety invariant was weakened.
```

Result:

```text
C33-P.3R RESULT: PREVIEW_RESULT_DISPLAY_CONTRACT_RECOVERY_COMMITTED_AND_PUSHED
C33-P.3 RESULT: PREVIEW_RESULT_DISPLAY_CONTRACT_COMMITTED_AND_PUSHED
```

### C33-P.4 — Save/confirm boundary document

Created:

```text
docs/activity/c33-p4-save-confirm-boundary-document.md
```

Locked boundary:

```text
C33-P.4 does not implement save or confirm.
It defines rules that must be satisfied before save/confirm can exist.
```

Future write gate:

```text
EXECUTE C33-P.SAVE-CONFIRM-WRITE-GATE
```

Correct future ordering:

```text
1. User writes raw activity text.
2. System creates detached preview.
3. User reviews and explicitly confirms.
4. Server resolves authenticated app user.
5. Server creates Activity Event as source of truth.
6. Server may persist Stable Semantic Bundle referencing that Activity Event.
7. Server may later create Value Object candidates or State hooks only under separate gates.
```

Result:

```text
C33-P.4 RESULT: SAVE_CONFIRM_BOUNDARY_DOCUMENT_COMMITTED_AND_PUSHED
```

---

## 3. Active Activity Capture preview endpoint after C33-P

Active endpoint:

```text
POST /api/activity/capture/detached-semantic-preview
```

Current class:

```text
Activity Capture detached semantic preview skeleton
```

Current route mode:

```text
activity_capture_detached_preview_no_write_v0
```

Allowed now:

```text
rawText-only detached preview
preview title/draft
not_saved_yet marker
warnings/errors
no-write side-effect flags
```

Rejected now:

```text
activityEventId
user_id
authenticatedUserId
organization_id
allowActivityEventCreation = true
allowValueObjectCreation = true
allowStateWrites = true
productionWriteEnabled = true
sandboxWriteEnabled = true
```

---

## 4. User-facing status after C33-P

The user can be shown:

```text
Я понял это так.
Предпросмотр ещё не сохранён.
```

Meaning:

```text
The system can produce a temporary interpretation of an activity text.
The activity is not saved.
The preview is not history.
The preview did not update state, health, money, Value Objects or Semantic Capital.
```

---

## 5. What remains closed after C33-P

Still closed:

```text
Save Activity
Confirm Activity
Create Activity Event
Persist Stable Semantic Bundle
Create Value Object
Create Activity-to-Value-Object link
Create State Fact
Create State Delta
Create State Snapshot
Create Semantic Capital
Read personal history / Semantic Capital
Attached Activity Event preview
Read-only ownership lookup
Auth/session implementation for saved personal flow
```

---

## 6. Invariants locked by C33-P

The following are locked:

1. Detached preview is not source of truth.
2. Activity Event remains source of truth.
3. Stable Semantic Bundle is semantic evidence, not Activity Event.
4. Activity Event must come before persisted Stable Semantic Bundle.
5. Stable Semantic Bundle must not implicitly create Activity Event.
6. AI output is candidate, not truth.
7. External concept is not internal category.
8. Category is not State Fact.
9. Preview display must not imply persistence.
10. Save/confirm requires a future explicit write gate.

---

## 7. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-P.1 contract document.
2. C33-P.2 detached preview skeleton proof.
3. C33-P.3 preview display contract.
4. C33-P.4 save/confirm boundary.
5. C33-O.5 product preview final lock.
6. C33-N.2 orchestration skeleton proof.
7. C33-M stable bundle service wrapper proofs.
8. C33-K sandbox persistence proof.

---

## 8. Recommended next block

Recommended next block according to Roadmap v2:

```text
C33-Q — Semantic Review / New Concepts UI contract
```

Rationale:

```text
C33-P can now show detached activity preview.
The next missing product capability is how the user reviews unclear concepts, unknown terms, provisional semantic chips and candidate mappings without creating active categories automatically.
```

C33-Q should remain contract/planning first unless separately approved.

---

## 9. Suggested C33-Q sequence

### C33-Q.1 — Semantic Review / New Concepts UI boundary

Define what the review UI may show and what it must not create.

### C33-Q.2 — New concept candidate display skeleton

Create no-write display/route/component skeleton if approved.

### C33-Q.3 — Category resolution action contract

Define approve/reject/merge/request-more-info actions without writing yet.

### C33-Q.4 — Governance/audit boundary

Define how user corrections become local feedback/audit and when they may affect shared ontology.

### C33-Q.5 — C33-Q final lock

Finalize semantic review/new concepts readiness for later resolver/governance implementation.

---

## 10. C33-P.5 expected result

Expected result:

```text
C33-P.5 RESULT: ACTIVITY_CAPTURE_PRODUCT_INTEGRATION_FINAL_LOCK_COMMITTED_AND_PUSHED
C33-P RESULT: ACTIVITY_CAPTURE_PRODUCT_INTEGRATION_BLOCK_COMPLETE
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime production behavior change.

