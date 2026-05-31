# C33-O.5 — Product semantic preview final lock

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-O — Product semantic preview route planning.

---

## 1. Final decision

C33-O is complete as a product-style detached semantic preview route planning and skeleton block.

```text
C33-O RESULT: PRODUCT_SEMANTIC_PREVIEW_ROUTE_PLANNING_BLOCK_COMPLETE
```

C33-O does not open production persistence.

```text
PRODUCTION STABLE BUNDLE WRITES REMAIN CLOSED.
PRODUCT WRITE ROUTES REMAIN CLOSED.
ATTACHED ACTIVITY EVENT PREVIEW REMAINS CLOSED.
READ-ONLY OWNERSHIP LOOKUP REMAINS CLOSED.
ACTIVITY EVENT CREATION REMAINS SEPARATE.
VALUE OBJECT CREATION REMAINS SEPARATE.
STATE FACT/DELTA/SNAPSHOT CREATION REMAINS SEPARATE.
```

---

## 2. What C33-O added

### C33-O.1 — Product semantic preview route contract

Created:

```text
docs/activity/c33-o1-product-semantic-preview-route-contract.md
```

Locked decisions:

```text
The first product-style semantic route must be preview-only and no-write.
It may call internal orchestration service directly.
It must not call debug routes.
It must return explicit side-effect flags.
```

Planned route:

```text
POST /api/activity/semantic-orchestration-preview
```

Result:

```text
C33-O.1 RESULT: PRODUCT_SEMANTIC_PREVIEW_ROUTE_CONTRACT_COMMITTED_AND_PUSHED
```

### C33-O.2 — Product-style semantic preview route skeleton

Created:

```text
src/app/api/activity/semantic-orchestration-preview/route.ts
```

Locked behavior:

- product-style route exists;
- route is detached preview only;
- route calls `activitySemanticOrchestrationServiceV0` directly;
- route does not call debug routes;
- route rejects `activityEventId`;
- route rejects client identity fields;
- route rejects write flags;
- route returns explicit no-write side-effect flags;
- route performs no SQL;
- route performs no DB read;
- route performs no DB write.

Result:

```text
C33-O.2 RESULT: PRODUCT_SEMANTIC_PREVIEW_ROUTE_SKELETON_COMMITTED_AND_PUSHED
```

### C33-O.3 — Auth/session adapter decision

Created:

```text
docs/activity/c33-o3-auth-session-adapter-decision.md
```

Locked decisions:

```text
The current C33-O.2 route skeleton is a no-auth, no-DB, no-write detached preview skeleton.
It may be used only as demo-safe / technical product-style preview skeleton.
It is not yet a real personal authenticated product route.
Any real personal activity product flow must be authenticated-only before it uses user-owned data.
```

Result:

```text
C33-O.3 RESULT: AUTH_SESSION_ADAPTER_DECISION_COMMITTED_AND_PUSHED
```

### C33-O.4 — Ownership check preflight plan

Created:

```text
docs/activity/c33-o4-ownership-check-preflight-plan.md
```

Locked decisions:

```text
The current C33-O.2 route must continue rejecting activityEventId.
A future route may accept activityEventId only after a separate read-only ownership lookup gate is designed and approved.
```

Future attached route preference:

```text
POST /api/activity/{activityEventId}/semantic-orchestration-preview
```

Result:

```text
C33-O.4 RESULT: OWNERSHIP_CHECK_PREFLIGHT_PLAN_COMMITTED_AND_PUSHED
```

---

## 3. Active route after C33-O

Active product-style route:

```text
POST /api/activity/semantic-orchestration-preview
```

Current class:

```text
product-style detached preview skeleton
```

Current route mode:

```text
product_semantic_preview_no_write_v0
```

Allowed now:

```text
rawText-only semantic preview
inputLanguage
source
internal orchestration service call
no-write side-effect reporting
```

Rejected now:

```text
activityEventId
user_id
authenticatedUserId
owner_user_id
organization_owner_id
visibility_scope
allowActivityEventCreation = true
allowValueObjectCreation = true
allowStateWrites = true
productionWriteEnabled = true
sandboxWriteEnabled = true
```

---

## 4. What remains closed after C33-O

Still closed:

```text
attached Activity Event preview
read-only ownership lookup
auth/session adapter implementation
app user mapping
Activity Event ownership query
organization/actor role query
stable bundle production persistence
Activity Event creation from preview route
Value Object creation from preview route
State Fact/Delta/Snapshot creation from preview route
Semantic Capital lookup
user-owned history lookup
```

---

## 5. C33-O invariants

The following invariants are locked:

1. Product route must call internal services, not debug routes.
2. Current product preview route is detached-only.
3. Current product preview route is no-auth but also no-DB/no-write.
4. Current product preview route must not be treated as a personal authenticated route.
5. Current product preview route must reject client identity fields.
6. Current product preview route must reject `activityEventId`.
7. Activity Event ownership lookup requires a future read-only gate.
8. Attached event preview is future work.
9. Stable Bundle production writes remain closed.
10. Value Object and State writes remain separate future layers.

---

## 6. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-O.1 route contract document.
2. C33-O.2 product route skeleton proof.
3. C33-O.3 auth/session adapter decision.
4. C33-O.4 ownership check preflight plan.
5. C33-N.2 orchestration skeleton proof.
6. C33-N.3 product-route exposure policy.
7. C33-N.4 auth/ownership preflight.
8. C33-M stable bundle service wrapper proofs.

---

## 7. Recommended next block

Recommended next block according to Roadmap v2:

```text
C33-P — Activity Capture product integration
```

C33-P should connect activity input UX to detached product semantic preview.

Allowed at the beginning of C33-P:

```text
user enters activity text
UI/product layer calls POST /api/activity/semantic-orchestration-preview
UI shows semantic understanding preview
no Activity Event id is passed
no stable bundle is persisted
no Value Object is created
no State Fact/Delta/Snapshot is created
```

Not allowed at the beginning of C33-P:

```text
saving stable bundle as production data
passing existing activityEventId
using private history/Semantic Capital
claiming ownership without auth/session
creating Activity Event from semantic preview
creating Value Object or State facts from preview result
```

---

## 8. Suggested C33-P sequence

### C33-P.1 — Activity Capture → detached semantic preview contract

Define how activity capture UI/backend should call the detached preview route.

No code unless separately approved.

### C33-P.2 — Activity input UI/backend wiring skeleton

Create minimal integration path from activity input to product preview route.

No persistence.

### C33-P.3 — Preview result display contract

Define what the UI may show from semantic preview.

No Value Object creation and no State claims.

### C33-P.4 — Save/confirm boundary document

Define what must happen before preview can become saved Activity Event / Stable Bundle.

No writes unless separately gated.

### C33-P.5 — C33-P final lock

Finalize product preview integration readiness and decide whether to move to Review UI / concept resolution planning.

---

## 9. C33-O.5 expected result

Expected result:

```text
C33-O.5 RESULT: PRODUCT_SEMANTIC_PREVIEW_FINAL_LOCK_COMMITTED_AND_PUSHED
C33-O RESULT: PRODUCT_SEMANTIC_PREVIEW_ROUTE_PLANNING_BLOCK_COMPLETE
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime production behavior change.

