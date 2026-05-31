# C33-N.3 — Product-route exposure policy

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-N — Activity capture to stable semantic bundle orchestration planning.

---

## 1. Decision

C33-N.3 defines route exposure rules only.

```text
C33-N.3 RESULT: PRODUCT_ROUTE_EXPOSURE_POLICY_COMMITTED_AND_PUSHED
```

Main decision:

```text
Debug routes remain debug-only.
Future product routes must call internal services directly.
Future product routes must not call debug routes as implementation dependencies.
```

This step does not create any route.

```text
NO ROUTE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO PRODUCTION PERSISTENCE.
```

---

## 2. Route classes

### 2.1 Debug routes

Debug routes are allowed to prove contracts, gates and invariants.

Examples:

```text
/api/activity/debug/stable-semantic-bundle-persistence-service-skeleton
/api/activity/debug/stable-semantic-bundle-persistence-service-dry-run-parity
/api/activity/debug/stable-semantic-bundle-persistence-service-sandbox-write-adapter
/api/activity/debug/stable-semantic-bundle-activity-event-reference-dry-run
/api/activity/debug/activity-semantic-orchestration-skeleton
```

Rules:

- debug routes are QA/proof routes;
- debug routes are not product APIs;
- debug routes must not be linked from normal UI;
- debug routes must not be used as backend dependencies by product routes;
- debug routes may be removed or restricted later without breaking product behavior.

### 2.2 Internal services

Internal services are the stable building blocks.

Examples:

```text
stableSemanticBundlePersistenceServiceV0
activitySemanticOrchestrationServiceV0
```

Rules:

- product routes may call internal services;
- internal services must expose explicit side-effect flags;
- internal services must not hide DB writes;
- internal services must not create unrelated domain records.

### 2.3 Future product routes

Future product routes are user-facing API routes.

Possible future names:

```text
/api/activity/semantic-preview
/api/activity/semantic-orchestration-preview
/api/activity/{activityEventId}/semantic-bundle/preview
```

Rules:

- product preview routes may return semantic preview and stable bundle dry-run output;
- product preview routes must not persist stable bundles;
- product preview routes must not call sandbox/debug write gates;
- product preview routes must not create Activity Events;
- product preview routes must not create Value Objects;
- product preview routes must not create State Facts/Deltas/Snapshots.

---

## 3. Explicitly forbidden exposure

The following must not be exposed as product behavior:

```text
stable-semantic-bundle-explicit-sandbox-write-gate
stable-semantic-bundle-persistence-service-sandbox-write-adapter
post-write verification debug route
schema preflight debug route
write gate readiness debug route
```

Reason:

- they exist for controlled development and regression proofs;
- they may use service-role/sandbox assumptions;
- they are not designed as user-facing product APIs;
- exposing them would blur the line between proof and product behavior.

---

## 4. Product preview route policy

A future product preview route may do this:

```text
authenticated request
→ validate user/session
→ receive raw activity text or existing activityEventId
→ call activitySemanticOrchestrationServiceV0 in preview/dry-run mode
→ return semantic preview / stable bundle dry-run result
```

It may not do this:

```text
→ create Activity Event
→ persist Stable Semantic Bundle
→ create Value Object
→ create Activity Value Object link
→ create State Fact/Delta/Snapshot
→ call sandbox write adapter
→ call debug write gate
```

Until a later gate opens writes, product preview remains no-write.

---

## 5. Future product write route policy

A future product write route must not be introduced until a separate block proves:

1. Auth0/Supabase user identity is resolved server-side.
2. Activity Event ownership is verified.
3. RLS and GRANT posture is checked.
4. Idempotency key is defined.
5. Transaction/rollback behavior is defined.
6. Audit trail is defined.
7. Rate limiting / abuse handling is considered.
8. Production write gate is explicitly approved.
9. Debug-route dependency is removed.
10. Stable bundle write behavior is proven under authenticated ownership context.

Until then:

```text
PRODUCTION STABLE BUNDLE WRITES REMAIN CLOSED.
```

---

## 6. No route-to-debug-route dependency

Product routes must not call debug routes internally.

Forbidden pattern:

```text
product route
→ fetch('/api/activity/debug/...')
```

Allowed pattern:

```text
product route
→ import server-side internal service
→ call service function
```

Reason:

- debug routes are for proof only;
- route-to-route calls hide contracts;
- route-to-route calls make security boundaries unclear;
- internal service calls are easier to test and lock.

---

## 7. Side-effect transparency requirement

Every future product route in this area must return explicit side-effect fields:

```ts
type ProductSemanticRouteSideEffectsV0 = {
  activityEventCreated: boolean;
  stableBundlePersisted: boolean;
  valueObjectCreated: boolean;
  activityValueObjectLinkCreated: boolean;
  stateFactCreated: boolean;
  stateDeltaCreated: boolean;
  stateSnapshotCreated: boolean;
  rowsActuallyWritten: number;
  productionWriteGateOpened: boolean;
};
```

For preview routes, all write flags must be false and `rowsActuallyWritten` must be `0`.

---

## 8. Recommended next route names

### 8.1 First no-write product-style preview route

Recommended later:

```text
/api/activity/semantic-orchestration-preview
```

Allowed behavior:

- authenticated request optional in early preview;
- no write;
- calls `activitySemanticOrchestrationServiceV0`;
- returns semantic evidence and blocked terms;
- may be used by UI preview.

### 8.2 Later existing-activity preview route

Recommended later:

```text
/api/activity/{activityEventId}/semantic-orchestration-preview
```

Allowed behavior:

- requires authenticated user;
- requires ownership check;
- no write;
- activityEventId only as reference;
- no stable bundle persistence.

### 8.3 Future write route, not yet allowed

Not allowed yet:

```text
/api/activity/{activityEventId}/stable-semantic-bundle
```

This requires a later production write gate.

---

## 9. C33-N.3 does not implement

C33-N.3 does not implement:

- product route;
- UI integration;
- auth/ownership check;
- Activity Event creation;
- stable bundle production persistence;
- Value Object creation;
- activity-value-object link creation;
- State Fact/Delta/Snapshot creation;
- SQL or DB access.

C33-N.3 is documentation-only.

---

## 10. Recommended C33-N continuation

### C33-N.4 — Auth/ownership preflight

Define the minimum ownership/auth requirements for any future product-style route.

Expected topics:

- Auth0 user identity;
- Supabase app user mapping;
- Activity Event owner check;
- organization/user context;
- service-role boundary;
- RLS/GRANT expectations;
- explicit denial of client-provided user_id trust.

### C33-N.5 — C33-N final lock

Finalize C33-N and decide whether a later controlled product preview implementation block may begin.

---

## 11. What not to repeat unless code changes

Do not repeat unless relevant code changes:

1. C33-M.2 dry-run parity proof.
2. C33-M.3 duplicate fixture adapter proof.
3. C33-M.4 Activity Event reference-only proof.
4. C33-N.2 orchestration skeleton no-write proof.
5. C33-L.5 production-hardening checklist.

---

## 12. C33-N.3 expected result

Expected result:

```text
C33-N.3 RESULT: PRODUCT_ROUTE_EXPOSURE_POLICY_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

