# C33-P.4 — Save/confirm boundary document

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-P — Activity Capture product integration.

---

## 1. Decision

C33-P.4 defines the boundary between a detached semantic preview and a future saved Activity Event.

```text
C33-P.4 RESULT: SAVE_CONFIRM_BOUNDARY_DOCUMENT_COMMITTED_AND_PUSHED
```

Main decision:

```text
C33-P.4 does not implement save or confirm.
It defines the rules that must be satisfied before save/confirm can exist.
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

## 2. Current state before C33-P.4

C33-P.2 created a detached Activity Capture preview skeleton:

```text
POST /api/activity/capture/detached-semantic-preview
```

Current route mode:

```text
activity_capture_detached_preview_no_write_v0
```

Current route returns:

```text
Activity Review draft
savedStatus = not_saved_yet
canConfirmNow = false
confirmationRequiresLaterGate = true
```

Interpretation:

```text
The user can see a preview of what the system understood.
Nothing has been saved.
```

---

## 3. Save/confirm is still closed

In C33-P.4, the following remain closed:

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
Attach preview to existing Activity Event
```

The UI may show disabled future actions only if they are labelled:

```text
Requires future save/confirm gate
```

---

## 4. Required future save/confirm gate

Any future save/confirm implementation must require an explicit gate.

Suggested gate name:

```text
EXECUTE C33-P.SAVE-CONFIRM-WRITE-GATE
```

This gate is not opened in C33-P.4.

Before that gate, an implementation plan must define:

1. server-side auth/session resolution;
2. app user mapping;
3. Activity Event creation route or service;
4. exact DB tables/columns used for Activity Event creation;
5. Stable Semantic Bundle persistence policy;
6. audit/correction metadata;
7. RLS/GRANT posture;
8. denial cases;
9. rollback/idempotency behavior;
10. no unintended Value Object or State writes.

---

## 5. Correct future ordering

The correct ordering for a future save/confirm flow is:

```text
1. User writes raw activity text.
2. System creates detached preview.
3. User reviews and explicitly confirms.
4. Server resolves authenticated app user.
5. Server creates Activity Event as source of truth.
6. Server may persist Stable Semantic Bundle referencing that Activity Event.
7. Server may later create Value Object candidates or State hooks only under separate gates.
```

Important:

```text
Activity Event comes before persisted Stable Semantic Bundle.
Stable Semantic Bundle must not create Activity Event implicitly.
```

---

## 6. Activity Event as source of truth

Activity Event remains the source of truth.

Future Activity Event save must contain at minimum:

```text
raw user text or normalized activity text
authenticated app user / owner context
source
timestamp or capture time
status / lifecycle state
audit metadata
```

C33-P.4 does not define exact schema fields.  
Exact fields must be confirmed from the current database schema before any write gate.

---

## 7. Stable Semantic Bundle after save

Stable Semantic Bundle may be persisted only after:

```text
Activity Event exists
Activity Event id is server-created or server-verified
ownership is resolved server-side
user confirmation exists
write gate is explicitly opened
```

Stable Semantic Bundle must remain:

```text
semantic evidence / interpretation
not the source-of-truth activity occurrence
```

---

## 8. No automatic Value Object creation

Preview or save must not automatically create:

```text
Value Object
Activity-to-Value-Object link
Category
External Concept mapping
Semantic Capital
```

Those may appear later as candidates or review tasks.

Rationale:

```text
AI output is a candidate, not truth.
External concept is not internal category.
Category is not State Fact.
```

---

## 9. No automatic State writes

Preview or save must not automatically create:

```text
State Fact
State Delta
State Snapshot
health state
fatigue state
hormonal state
income state
productivity state
```

State hooks and state persistence belong to later blocks:

```text
C33-S — State hooks safety package
C33-T — State facts/deltas/snapshots MVP
```

---

## 10. Future confirmation UX

Future confirmation UX may show:

```text
Save this activity
Confirm and save
Edit before saving
Preview again
Cancel
```

But these actions are not enabled in C33-P.4.

Required labels:

```text
Preview only — nothing was saved.
Save/confirm is not implemented yet.
```

The user must not think the preview already changed history.

---

## 11. Future save request shape

A future save request may look conceptually like:

```ts
type ActivityCaptureSaveRequestV0 = {
  previewId?: string;
  rawText: string;
  inputLanguage?: string;
  source: "manual" | "chat_ai" | "calendar" | "booking" | "rule" | "import" | "system";
  userConfirmed: true;
  clientRequestId: string;
};
```

Forbidden future client fields:

```text
user_id
authenticatedUserId
owner_user_id
organization_owner_id
activityEventOwnerId
allowValueObjectCreation
allowStateWrites
productionWriteEnabled
serviceRole
```

Server must provide identity.

---

## 12. Future save response shape

A future save response may look conceptually like:

```ts
type ActivityCaptureSaveResponseV0 = {
  ok: boolean;
  activityEventCreated: boolean;
  activityEventId: string | null;
  stableBundlePersisted: boolean;
  stableBundleId: string | null;
  valueObjectCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
  rowsActuallyWritten: number;
  auditRecorded: boolean;
  errors: string[];
  warnings: string[];
};
```

For C33-P.4, all save response values are only conceptual.

---

## 13. Required future denial cases

Future save/confirm must deny when:

| Case | Expected result |
|---|---|
| no authenticated session | denied |
| app user not mapped | denied |
| rawText empty | denied |
| user did not explicitly confirm | denied |
| client sends user_id | denied |
| client requests VO creation | denied |
| client requests State writes | denied |
| write gate not opened | denied |
| duplicate clientRequestId conflict | denied or idempotently resolved |
| Activity Event insert fails | denied / rollback |
| Stable Bundle persist fails after Activity Event | must have defined recovery/audit behavior |

Every denial must make side effects explicit.

---

## 14. Idempotency requirement

Future save/confirm must include idempotency.

Recommended concept:

```text
clientRequestId
```

Purpose:

```text
avoid duplicate Activity Events if user double-clicks Save
avoid duplicate Stable Bundles if request is retried
make recovery/audit easier
```

C33-P.4 does not implement idempotency.

---

## 15. Audit and correction requirement

Future save/confirm must plan:

```text
created_by_user
created_from_preview
preview_contract_version
adapter_version
route_mode
clientRequestId
correction/audit trail
```

If user later edits time/text/category interpretation, corrections must be separate audit records, not silent mutation.

---

## 16. Relationship to Auth/session

Save/confirm cannot be anonymous for personal activity history.

Required future chain:

```text
request
→ server reads Auth0 session/token
→ server maps Auth0 subject to internal app user
→ server validates permission/context
→ server performs write operation under explicit gate
```

Client-provided identity remains untrusted.

---

## 17. Relationship to attached Activity Event preview

C33-O.4 kept attached Activity Event preview closed.

C33-P.4 keeps it closed.

Attached preview requires read-only ownership lookup before accepting:

```text
activityEventId
```

This is separate from creating a new Activity Event after explicit user confirmation.

---

## 18. What C33-P.4 does not implement

C33-P.4 does not implement:

- UI components;
- save button;
- confirm button behavior;
- route changes;
- Activity Event creation route;
- Stable Bundle persistence;
- Auth0 session code;
- app user mapping;
- SQL;
- DB reads;
- DB writes;
- Value Object creation;
- State writes;
- audit table writes.

C33-P.4 is documentation-only.

---

## 19. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-P.1 Activity Capture detached preview contract.
2. C33-P.2 Activity Capture detached preview skeleton proof.
3. C33-P.3 Preview result display contract.
4. C33-O.5 final lock.
5. C33-N.2 orchestration skeleton proof.
6. C33-M stable bundle service wrapper proofs.

---

## 20. Recommended next step

Next step:

```text
C33-P.5 — C33-P final lock
```

C33-P.5 should finalize:

```text
Activity Capture can produce detached preview
Display contract is defined
Save/confirm boundary is defined but still closed
No persistence has been opened
```

---

## 21. C33-P.4 expected result

Expected result:

```text
C33-P.4 RESULT: SAVE_CONFIRM_BOUNDARY_DOCUMENT_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

