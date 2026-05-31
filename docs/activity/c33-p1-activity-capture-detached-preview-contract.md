# C33-P.1 — Activity Capture → detached semantic preview contract

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-P — Activity Capture product integration.

---

## 1. Decision

C33-P begins after C33-O final lock.

```text
C33-P.1 RESULT: ACTIVITY_CAPTURE_DETACHED_PREVIEW_CONTRACT_COMMITTED_AND_PUSHED
```

Main decision:

```text
Activity Capture may integrate only with the detached product semantic preview route at this stage.
It must not save Activity Event, Stable Semantic Bundle, Value Object or State records.
```

Allowed route:

```text
POST /api/activity/semantic-orchestration-preview
```

Current route class:

```text
product-style detached preview skeleton
product_semantic_preview_no_write_v0
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

## 2. Why C33-P starts with detached preview

C33-O created and locked a product-style route that can preview semantic understanding from text while remaining safe.

C33-O explicitly did not open:

```text
attached Activity Event preview
read-only ownership lookup
auth/session adapter implementation
stable bundle production persistence
Value Object creation
State Fact/Delta/Snapshot creation
```

Therefore C33-P must connect Activity Capture to the detached preview route first, before any save/confirm/persistence workflow.

---

## 3. Activity Capture input contract v0

Activity Capture may send only a preview-safe request:

```ts
type ActivityCaptureDetachedPreviewRequestV0 = {
  rawText: string;
  inputLanguage?: "ru" | "pl" | "en" | "de" | "es" | "uk" | "unknown" | string;
  source?: "manual" | "chat_ai" | "calendar" | "booking" | "rule" | "import" | "system";
  mode?: "preview_only";
};
```

Required normalization before sending:

```text
rawText must be non-empty
mode must be preview_only or omitted
source defaults to manual
inputLanguage may be unknown if not detected yet
```

Forbidden request fields:

```text
activityEventId
user_id
userId
authenticatedUserId
owner_user_id
ownerUserId
organization_id
organization_owner_id
visibility_scope
allowActivityEventCreation = true
allowValueObjectCreation = true
allowStateWrites = true
productionWriteEnabled = true
sandboxWriteEnabled = true
```

---

## 4. Activity Capture UI contract: "I understood it like this"

The UI may show a temporary preview card:

```text
"I understood it like this"
```

Allowed content:

- raw user text;
- normalized/preview text if returned;
- semantic chips from preview response;
- metrics if present;
- warnings;
- unknown/needs-review signals;
- no-write side-effect flags;
- "not saved yet" marker.

Required marker:

```text
This preview is not saved yet.
```

Recommended user-facing language:

```text
Я понял это так. Проверь, всё ли верно.
```

The UI must not claim:

```text
activity saved
stable bundle persisted
Value Object created
state updated
health improved
income created
personal history updated
```

---

## 5. Product preview response consumption

Activity Capture may consume this safe subset:

```ts
type ActivityCaptureDetachedPreviewViewModelV0 = {
  ok: boolean;
  rawText: string;
  routeMode: "product_semantic_preview_no_write_v0";
  semanticPreviewReady: boolean;
  orchestrationReady: boolean;
  transactionStepCount: number;
  memberTransactionStepCount: number;
  blockedAuditTransactionStepCount: number;
  warnings: string[];
  errors: string[];
  sideEffects: {
    dbReadExecuted: false;
    dbWriteExecuted: false;
    activityEventCreated: false;
    stableBundlePersisted: false;
    valueObjectCreated: false;
    activityValueObjectLinkCreated: false;
    stateFactCreated: false;
    stateDeltaCreated: false;
    stateSnapshotCreated: false;
    rowsActuallyWritten: 0;
  };
};
```

C33-P.1 does not require final UI field names. It defines the safety boundary.

---

## 6. Current allowed Activity Capture flow

Allowed now:

```text
User enters text
→ Activity Capture prepares detached preview request
→ calls POST /api/activity/semantic-orchestration-preview
→ receives no-write semantic preview
→ shows "I understood it like this"
→ user can edit text or continue
```

Not allowed now:

```text
User enters text
→ system saves Activity Event
→ system persists Stable Semantic Bundle
→ system creates Value Object
→ system writes State Fact/Delta/Snapshot
```

Save/confirm requires later gate.

---

## 7. Required no-write flags

Every Activity Capture preview response must preserve this meaning:

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

If any flag is true, Activity Capture must treat the response as unsafe for the current C33-P preview flow.

---

## 8. Relationship to Activity Event source of truth

Activity Event remains source of truth.

But at this stage:

```text
Activity Event is not created.
```

Detached preview is not source of truth.

Detached preview is:

```text
temporary interpretation of raw text before save/confirm
```

Future save/confirm boundary must define when raw text becomes Activity Event.

---

## 9. Relationship to Stable Semantic Bundle

Stable Semantic Bundle remains semantic evidence.

But at this stage:

```text
Stable Semantic Bundle is not persisted.
```

The preview may show semantic evidence as temporary preview.

Future save/confirm boundary must define when preview can be persisted as Stable Semantic Bundle.

---

## 10. Relationship to Semantic Review

If preview finds unknown/ambiguous concepts, Activity Capture may display a soft review signal:

```text
This contains a new or unclear concept.
```

But C33-P must not create active categories.

Actual review workflow belongs to later blocks:

```text
C33-Q — Semantic Review / New Concepts UI contract
C33-W — Analytics / Semantic Capital / Audit
C33-X — Review UI / Workspace integration MVP
```

---

## 11. Relationship to auth/session

C33-P.1 does not implement auth.

Current detached preview route is:

```text
no-auth
no-DB
no-write
detached
```

Real personal activity flow must become authenticated before using:

```text
saved Activity Events
user history
Semantic Capital
Value Objects
organization context
private analytics
```

---

## 12. Candidate Activity Capture surfaces to inspect in C33-P.2

C33-P.2 should inspect and/or wire actual surfaces, for example:

```text
main workspace AI input
quick action "record activity"
activity forms
today/timeline entry points
debug/demo semantic panels
mobile quick action shell
```

C33-P.1 does not perform this audit. It defines the contract used by the next wiring step.

---

## 13. C33-P.2 expected direction

Next step should be:

```text
C33-P.2 — Activity input UI/backend wiring skeleton
```

C33-P.2 may create a minimal integration path that calls the detached product preview route.

C33-P.2 must still keep:

```text
no DB write
no Activity Event creation
no Stable Bundle persistence
no Value Object creation
no State writes
```

---

## 14. What C33-P.1 does not implement

C33-P.1 does not implement:

- UI changes;
- route changes;
- Activity Capture component wiring;
- Auth0 session logic;
- Activity Event creation;
- Stable Bundle persistence;
- Value Object creation;
- State writes;
- SQL;
- DB reads;
- DB writes.

C33-P.1 is documentation-only.

---

## 15. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-O.2 product route skeleton proof.
2. C33-O.3 auth/session adapter decision.
3. C33-O.4 ownership check preflight plan.
4. C33-O.5 final lock.
5. C33-N.2 orchestration skeleton proof.
6. C33-M stable bundle service wrapper proofs.

---

## 16. C33-P.1 expected result

Expected result:

```text
C33-P.1 RESULT: ACTIVITY_CAPTURE_DETACHED_PREVIEW_CONTRACT_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

