# C33-O.4 — Ownership check preflight plan

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-O — Product semantic preview route planning.

---

## 1. Decision

C33-O.4 defines the future ownership preflight required before a product semantic preview route may accept `activityEventId` or use user-owned context.

```text
C33-O.4 RESULT: OWNERSHIP_CHECK_PREFLIGHT_PLAN_COMMITTED_AND_PUSHED
```

Main decision:

```text
The current C33-O.2 product semantic preview route must continue rejecting activityEventId.
A future route may accept activityEventId only after a separate read-only ownership lookup gate is designed and approved.
```

This step does not implement ownership lookup.

```text
NO ROUTE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO PRODUCTION PERSISTENCE.
```

---

## 2. Why C33-O.2 rejects activityEventId

C33-O.2 created:

```text
POST /api/activity/semantic-orchestration-preview
```

Current route class:

```text
product-style detached preview skeleton
```

Current route intentionally uses:

```text
activityEventId = null
authenticatedUserId = null
allowActivityEventCreation = false
allowValueObjectCreation = false
allowStateWrites = false
```

Reason:

```text
Without server-side auth/session and ownership lookup, accepting activityEventId would allow a client to claim access to an event the route has not verified.
```

Therefore:

```text
activityEventId must remain rejected until ownership preflight is implemented under a separate gate.
```

---

## 3. Future ownership preflight chain

Before a future route accepts `activityEventId`, it must perform this chain:

```text
request
→ server reads Auth0 session/token
→ server maps Auth0 subject to internal app user
→ server receives activityEventId
→ server performs read-only ownership lookup
→ server verifies user/context/organization access
→ server passes verified activityEventId to internal orchestration service
→ server returns explicit no-write/write flags
```

No step may trust client-provided identity.

---

## 4. Authoritative ownership source

The authoritative source should be the Activity Event layer.

Conceptual check:

```text
activity_events.id = requested activityEventId
AND activity_events belongs to authenticated app user or allowed context
AND activity_events is not deleted/invalid for semantic processing
```

The exact table/column names must be confirmed later from the current schema.

C33-O.4 does not inspect schema and does not run SQL.

---

## 5. Minimum ownership verification result shape

A future read-only ownership helper should return a shape like this:

```ts
type ActivityEventOwnershipPreflightV0 = {
  ok: boolean;
  activityEventId: string;
  auth0Subject: string | null;
  appUserId: string | null;
  ownershipVerified: boolean;
  organizationContextVerified: boolean;
  actorContextVerified: boolean;
  canPreviewSemantics: boolean;
  canPersistStableBundle: false;
  dbReadExecuted: boolean;
  dbWriteExecuted: false;
  rowsActuallyWritten: 0;
  denialReason: string | null;
};
```

Important:

```text
canPersistStableBundle remains false in C33-O.
```

C33-O is still product preview planning, not production persistence.

---

## 6. Read-only ownership lookup gate

Ownership lookup requires a DB read.

Therefore it must not be silently added inside C33-O.4.

Future gate required:

```text
EXECUTE C33-O.READ-ONLY-OWNERSHIP-PREFLIGHT
```

Before that gate, implementation must provide:

1. exact table/column inventory;
2. RLS/GRANT posture;
3. server-side auth source;
4. app user mapping rule;
5. ownership denial cases;
6. no-write proof;
7. regression cases for cross-user denial;
8. route response side-effect fields.

Until then:

```text
dbReadExecuted = false
dbWriteExecuted = false
activityEventId is rejected
```

---

## 7. Organization / actor context

If Activity Event can belong to an organization, actor, team or space, ownership is not enough.

Required future checks:

```text
authenticated user has role in the organization/context
role allows semantic preview
activityEventId belongs to that organization/context
actor/context relation is valid for the requested semantic operation
privacy level allows this preview
```

Forbidden:

```text
client sends organization_id and route trusts it
client sends actor_id and route trusts it
client sends space_id and route trusts it
route derives organization access from email alone
route uses service_role to bypass ownership rules
```

---

## 8. Detached preview vs attached event preview

### Detached preview

Current C33-O.2 route:

```text
rawText only
activityEventId = null
no user-owned history
no ownership lookup
no DB read
no DB write
```

Status:

```text
allowed now
```

### Attached event preview

Future route or future mode:

```text
activityEventId provided
server verifies ownership
route can call orchestration with verified activityEventId
no write unless separate gate
```

Status:

```text
not allowed yet
```

---

## 9. Future route shape options

### Option A — Same route, strict mode

Possible future path:

```text
POST /api/activity/semantic-orchestration-preview
```

If request includes `activityEventId`, route requires auth and ownership check.

Risk:

```text
one route has both detached and attached semantics
```

### Option B — Separate attached preview route

Recommended later:

```text
POST /api/activity/{activityEventId}/semantic-orchestration-preview
```

Benefits:

- clearer ownership boundary;
- easier denial cases;
- easier UI routing;
- easier audit and future persistence gate.

Decision for C33-O.4:

```text
Prefer Option B for future attached Activity Event preview.
Keep current route detached-only for now.
```

---

## 10. Required denial cases for future ownership lookup

Future attached preview must deny no-write:

| Case | Expected result |
|---|---|
| no session | denied |
| invalid session | denied |
| app user not mapped | denied |
| malformed activityEventId | denied |
| activityEventId not found | denied |
| activityEventId belongs to another user | denied |
| organization context not accessible | denied |
| activity is deleted/archived/invalid | denied |
| privacy level disallows semantic preview | denied |
| request asks for stable bundle persistence | denied |
| request asks for Activity Event creation | denied |
| request asks for VO/State writes | denied |

Every denial must return:

```text
ok = false
ownershipVerified = false
dbWriteExecuted = false
rowsActuallyWritten = 0
```

---

## 11. Response side-effect fields after ownership lookup

Future ownership-aware route must return:

```ts
type ProductSemanticOwnershipAwareSideEffectsV0 = {
  dbReadExecuted: boolean;
  dbWriteExecuted: false;
  activityEventCreated: false;
  stableBundlePersisted: false;
  valueObjectCreated: false;
  activityValueObjectLinkCreated: false;
  stateFactCreated: false;
  stateDeltaCreated: false;
  stateSnapshotCreated: false;
  productionWriteGateOpened: false;
  sandboxWriteGateOpened: false;
  rowsActuallyWritten: 0;
};
```

For current C33-O, `dbReadExecuted` remains false.

---

## 12. Relationship to C33-O.5

C33-O.5 should finalize C33-O with this status:

```text
detached product semantic preview route skeleton is ready
attached Activity Event preview is planned but not implemented
ownership lookup requires future read-only gate
production writes remain closed
```

C33-O.5 must not open persistence.

---

## 13. Relationship to C33-P

C33-P Activity Capture product integration may use the detached preview route.

Allowed in C33-P:

```text
user writes activity text
UI calls detached preview route
UI shows "I understood it like this"
no Activity Event id is passed
no stable bundle is persisted
```

Not allowed in C33-P unless later gated:

```text
UI sends existing activityEventId to preview route
UI claims preview belongs to saved event without ownership check
UI saves stable bundle from preview result
UI creates Value Objects or State facts from preview result
```

---

## 14. What C33-O.4 does not implement

C33-O.4 does not implement:

- Auth0 session reader;
- app user mapping;
- Supabase query;
- Activity Event ownership query;
- organization role lookup;
- attached preview route;
- product write route;
- SQL;
- DB read;
- DB write;
- Stable Bundle persistence;
- Value Object creation;
- State writes;
- UI integration.

C33-O.4 is documentation-only.

---

## 15. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-O.1 contract document.
2. C33-O.2 product route skeleton proof.
3. C33-O.3 auth/session adapter decision.
4. C33-N.2 orchestration skeleton proof.
5. C33-N.4 auth/ownership preflight.
6. C33-M stable bundle service wrapper proofs.

---

## 16. Recommended next step

Next step:

```text
C33-O.5 — C33-O final lock
```

C33-O.5 should lock:

```text
product detached preview skeleton ready
auth/session decision recorded
ownership lookup planned but not implemented
attached event preview not opened
production writes closed
```

---

## 17. C33-O.4 expected result

Expected result:

```text
C33-O.4 RESULT: OWNERSHIP_CHECK_PREFLIGHT_PLAN_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

