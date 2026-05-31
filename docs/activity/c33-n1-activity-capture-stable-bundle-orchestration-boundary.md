# C33-N.1 — Activity capture to stable semantic bundle orchestration boundary

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-N — Activity capture to stable semantic bundle orchestration planning.

---

## 1. Decision

C33-N starts the orchestration layer, but does not implement production persistence.

```text
C33-N.1 RESULT: ORCHESTRATION_BOUNDARY_DOCUMENT_COMMITTED_AND_PUSHED
```

Main decision:

```text
Activity capture and Stable Semantic Bundle persistence remain separate services.
The future orchestration layer may call both, but it must not merge their responsibilities.
```

Locked boundary:

```text
Activity Event = source of truth for real activity occurrence.
Stable Semantic Bundle = semantic evidence / interpretation.
Orchestration = controlled sequence that connects them.
```

---

## 2. Why C33-N exists

C33-M created the stable semantic bundle service wrapper block:

```text
service wrapper skeleton
dry-run parity proof
duplicate-fixture sandbox adapter
Activity Event reference-only dry-run
```

But C33-M intentionally did not connect this service to normal user activity capture.

C33-N exists to define how the next layer should connect:

```text
user activity input
→ activity capture / existing Activity Event context
→ semantic derivation
→ resolver decisions
→ stable semantic bundle service
```

This must be done without hidden side effects.

---

## 3. Hard separation of responsibilities

### 3.1 Activity capture responsibility

Activity capture is responsible for:

- deciding whether a real Activity Event should exist;
- validating time/duration/status/source;
- creating or selecting an existing Activity Event;
- binding the event to authenticated user / owner context;
- preserving the event as source of truth.

Activity capture must not silently promote semantic candidates to Value Objects.

### 3.2 Stable Semantic Bundle responsibility

Stable Semantic Bundle service is responsible for:

- receiving semantic derivation/resolver results;
- accepting `activityEventId: string | null`;
- persisting or previewing semantic evidence;
- preserving member vs blocked audit distinction;
- not creating Activity Events;
- not creating Value Objects;
- not creating State Facts/Deltas/Snapshots.

### 3.3 Orchestration responsibility

The future orchestration layer is responsible for sequence only:

```text
1. receive activity context;
2. require either preview context or existing Activity Event context;
3. call semantic derivation;
4. call resolver contract;
5. call stable bundle service in allowed mode;
6. return a combined result to caller;
7. never hide extra writes.
```

---

## 4. Allowed orchestration flows

### Flow A — Preview-only semantic flow

Allowed.

```text
User input
→ semantic derivation
→ resolver decision contract
→ stable bundle service dry-run
→ preview result
```

Properties:

- no Activity Event created;
- no Stable Bundle persisted unless a later sandbox/debug gate explicitly allows it;
- no Value Object created;
- no state data created;
- safe for early UI preview.

### Flow B — Existing Activity Event reference flow

Allowed.

```text
Existing Activity Event id
→ semantic derivation
→ resolver decision contract
→ stable bundle service receives activityEventId
→ stable bundle result
```

Properties:

- Activity Event must already exist;
- stable bundle service may reference the id;
- stable bundle service must not create the event;
- user/owner binding must be checked before any production-like write.

### Flow C — Activity capture creates event, then orchestration calls stable bundle

Allowed only in a future block after separate gates.

```text
Activity capture service creates/returns Activity Event
→ orchestration receives activityEventId
→ orchestration calls stable bundle service
```

Required future conditions:

- Activity Event write gate exists;
- Auth0/Supabase ownership binding exists;
- RLS/GRANT/security review exists;
- idempotency and rollback behavior is defined;
- production write gate remains separate.

### Flow D — Stable bundle service creates Activity Event

Forbidden.

```text
Stable Bundle service
→ creates Activity Event
```

This remains forbidden.

---

## 5. Future service names and roles

Recommended future names:

| Future service | Role |
|---|---|
| `activityCaptureServiceV0` | create or confirm real Activity Event under separate gate |
| `stableSemanticBundlePersistenceServiceV0` | persist/preview semantic bundle for existing event or detached context |
| `activitySemanticOrchestrationServiceV0` | sequence activity context → semantic derivation → stable bundle service |
| `valueObjectSuggestionServiceV0` | suggest possible Value Objects/links after semantic evidence exists |
| `valueObjectLinkPersistenceServiceV0` | create VO/link only after explicit confirmation |
| `stateObservationServiceV0` | create state facts/deltas only from state-specific contracts |

Do not collapse these into a single side-effect-heavy route.

---

## 6. Orchestration input contract draft

Future orchestration input should look like this conceptually:

```ts
type ActivitySemanticOrchestrationInputV0 = {
  mode: "preview_only" | "dry_run_existing_event" | "sandbox_duplicate_fixture_only";
  rawText: string;
  inputLanguage: string;
  source: "manual" | "chat_ai" | "calendar" | "booking" | "rule" | "import" | "system";
  activityEventId: string | null;
  authenticatedUserId: string | null;
  allowActivityEventCreation: false;
  allowValueObjectCreation: false;
  allowStateWrites: false;
};
```

Important:

```text
allowActivityEventCreation must remain false in the stable bundle orchestration layer
until a separate activity-capture write gate exists.
```

---

## 7. Orchestration output contract draft

Future orchestration output should explicitly expose side-effect flags:

```ts
type ActivitySemanticOrchestrationOutputV0 = {
  ok: boolean;
  activityEventId: string | null;
  stableBundleId: string | null;
  mode: string;
  semanticPreviewReady: boolean;
  stableBundleReady: boolean;
  rowsActuallyWritten: number;
  activityEventCreated: false;
  stableBundlePersisted: boolean;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
  productionWriteGateOpened: false;
  errors: string[];
  warnings: string[];
};
```

Every write-capable future route must state which writes happened and which writes did not happen.

---

## 8. Security and ownership constraints

Before any product-like integration:

- authenticated user must be resolved server-side;
- client-provided user id must not be trusted;
- Activity Event ownership must be verified;
- stable bundle visibility must be scoped to owner/context;
- service role must remain server-side only;
- debug routes must not become product APIs;
- production persistence must remain disabled until a separate gate.

---

## 9. What C33-N.1 does not implement

C33-N.1 does not implement:

- `activitySemanticOrchestrationServiceV0`;
- activity capture write path;
- Activity Event creation;
- stable bundle production persistence;
- product route;
- UI integration;
- Value Object suggestion;
- Value Object/link creation;
- State Fact/Delta/Snapshot creation;
- any SQL or DB access.

C33-N.1 is documentation-only.

---

## 10. Recommended C33-N sequence

### C33-N.1 — Orchestration boundary document

This document.

### C33-N.2 — Orchestration skeleton, no DB write

Create pure wrapper skeleton:

```text
activitySemanticOrchestrationServiceV0
```

It should call existing dry-run service wrapper only.

### C33-N.3 — Product-route exposure policy

Decide which routes stay debug-only and what a product route may expose.

### C33-N.4 — Auth/ownership preflight

Define user binding and ownership requirements before any product route.

### C33-N.5 — C33-N final lock

Decide whether the project is ready for a later controlled product integration block.

---

## 11. What not to repeat in C33-N unless code changes

Do not repeat without relevant code changes:

1. C33-K.5R post-write fixture final lock.
2. C33-M.2 dry-run parity proof.
3. C33-M.3 duplicate fixture adapter proof.
4. C33-M.4 Activity Event reference-only proof.
5. C33-L.5 production-hardening checklist.

---

## 12. C33-N.1 expected result

Expected result:

```text
C33-N.1 RESULT: ACTIVITY_CAPTURE_STABLE_BUNDLE_ORCHESTRATION_BOUNDARY_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

