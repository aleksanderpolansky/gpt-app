# C33-O.1 — Product semantic preview route contract document

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-O — product-style semantic preview route planning.

---

## 1. Decision

C33-O starts planning for a product-style semantic preview route.

```text
C33-O.1 RESULT: PRODUCT_SEMANTIC_PREVIEW_ROUTE_CONTRACT_COMMITTED_AND_PUSHED
```

This is a contract-only step.

```text
NO ROUTE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO PRODUCTION PERSISTENCE.
```

Main decision:

```text
The first product-style semantic route must be preview-only and no-write.
It may call internal orchestration service directly.
It must not call debug routes.
It must return explicit side-effect flags.
```

---

## 2. Proposed future route

Recommended future route:

```text
POST /api/activity/semantic-orchestration-preview
```

Purpose:

```text
Return a semantic preview for user-provided activity text without persisting anything.
```

This future route is product-style because it is shaped for UI/product usage, but the first implementation must still be no-write.

---

## 3. Relationship to C33-N

C33-N locked the planning boundary:

```text
Activity Event = source of truth.
Stable Semantic Bundle = semantic evidence.
Orchestration = controlled sequence.
Product routes must call internal services directly.
Product routes must not call debug routes.
Product routes must not trust client-provided identity.
```

C33-O.1 applies that to a concrete future route contract.

---

## 4. Allowed behavior for first product-style preview route

The future route may:

- accept raw activity text;
- accept input language;
- accept source value if allowed by contract;
- call `activitySemanticOrchestrationServiceV0` directly;
- run only `preview_only` mode in the first route implementation;
- return semantic preview/orchestration result;
- return blocked/unknown/needs-review indicators if provided by service;
- return explicit no-write side-effect flags.

The route must return enough information for UI preview but must not persist.

---

## 5. Forbidden behavior for first product-style preview route

The future route must not:

- call `/api/activity/debug/*`;
- call sandbox write adapter;
- call explicit sandbox write gate;
- create Activity Event;
- persist Stable Semantic Bundle;
- create Value Object;
- create Activity Value Object link;
- create State Fact;
- create State Delta;
- create State Snapshot;
- trust client-provided `user_id`;
- trust client-provided `authenticatedUserId`;
- trust client-provided `owner_user_id`;
- open production write gate;
- execute SQL;
- read DB unless a later auth/session step explicitly allows it.

---

## 6. Request contract draft

Future request shape:

```ts
type ProductSemanticPreviewRequestV0 = {
  rawText: string;
  inputLanguage?: string;
  source?: "manual" | "chat_ai" | "calendar" | "booking" | "rule" | "import" | "system";
  mode?: "preview_only";
};
```

First implementation rule:

```text
mode must normalize to preview_only.
activityEventId must be null.
allowActivityEventCreation must be false.
allowValueObjectCreation must be false.
allowStateWrites must be false.
```

Do not include trusted identity fields in the public request contract.

Forbidden request fields:

```text
user_id
authenticatedUserId
owner_user_id
organization_owner_id
visibility_scope
productionWriteEnabled
sandboxWriteEnabled
allowActivityEventCreation = true
allowValueObjectCreation = true
allowStateWrites = true
```

---

## 7. Internal call contract draft

The product route should call internal service like this conceptually:

```ts
runActivitySemanticOrchestrationServiceV0({
  mode: "preview_only",
  rawText,
  inputLanguage,
  source,
  activityEventId: null,
  authenticatedUserId: null,
  allowActivityEventCreation: false,
  allowValueObjectCreation: false,
  allowStateWrites: false,
});
```

Important:

```text
This is an internal call, not a route-to-route fetch.
```

Forbidden implementation pattern:

```ts
fetch("/api/activity/debug/activity-semantic-orchestration-skeleton")
```

Allowed implementation pattern:

```ts
import { runActivitySemanticOrchestrationServiceV0 } from "@/lib/activity/categoryDerivation/activitySemanticOrchestrationServiceV0";
```

---

## 8. Response contract draft

Future response shape:

```ts
type ProductSemanticPreviewResponseV0 = {
  ok: boolean;
  routeMode: "product_semantic_preview_no_write_v0";
  semanticPreviewReady: boolean;
  orchestrationReady: boolean;
  activityEventId: null;
  stableBundleId: null;
  transactionStepCount: number;
  memberTransactionStepCount: number;
  blockedAuditTransactionStepCount: number;
  sideEffects: {
    sqlExecuted: false;
    dbReadExecuted: false;
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
  errors: string[];
  warnings: string[];
};
```

For the first product-style preview route, all side-effect flags must remain false.

---

## 9. Error/denial cases

The future route must deny or normalize:

| Case | Expected result |
|---|---|
| empty rawText | 400 no-write |
| too long rawText | 400 no-write or trimmed by explicit rule |
| mode asks for write | 400 no-write |
| activityEventId provided | ignore or 400; recommended 400 in first version |
| client sends user_id | ignore or 400; recommended 400 if treated as trusted |
| allowActivityEventCreation true | 400 no-write |
| allowValueObjectCreation true | 400 no-write |
| allowStateWrites true | 400 no-write |
| request tries sandboxWriteEnabled | 400 no-write |
| request tries productionWriteEnabled | 400 no-write |

---

## 10. Auth position for C33-O.1

C33-O.1 does not implement auth.

For the first no-write preview route, two options remain possible:

### Option A — Auth required

Recommended for real personal activity product flow.

```text
server resolves Auth0 session
server does not trust client user id
route still performs no DB write
```

### Option B — Demo no-auth preview

Allowed only if:

```text
no personal data is used
no Activity Event id is accepted
no DB read is performed
no persistence is performed
response clearly marks demo/preview mode
```

C33-O.2 should decide which option is used for the first skeleton.

---

## 11. Security notes

The route must not expose:

- raw debug route internals;
- service-role behavior;
- sandbox run keys;
- database ids from sandbox fixtures;
- resolver debug details that are not meant for UI;
- production write switches.

The route may expose:

- safe semantic preview;
- safe blocked/unknown indicators;
- safe no-write side-effect flags;
- warnings that a category needs review.

---

## 12. What C33-O.1 does not implement

C33-O.1 does not implement:

- product route;
- UI integration;
- Auth0 session handling;
- app-user mapping;
- Activity Event ownership lookup;
- DB reads;
- DB writes;
- Stable Bundle persistence;
- Value Object creation;
- State writes;
- RLS/GRANT changes.

C33-O.1 is documentation-only.

---

## 13. Recommended C33-O continuation

### C33-O.2 — Product-style semantic preview route skeleton, no DB write

Create the route skeleton:

```text
src/app/api/activity/semantic-orchestration-preview/route.ts
```

Strict rules:

```text
no DB read
no DB write
no debug route calls
internal service call only
side-effect flags returned
```

### C33-O.3 — Auth/session adapter decision

Decide whether the first route skeleton is authenticated-only or demo/no-auth preview.

### C33-O.4 — Ownership check preflight plan

Plan future Activity Event ownership lookup but do not implement it unless a separate read-only gate is approved.

### C33-O.5 — C33-O final lock

Decide whether a later block may add a real product route implementation or read-only ownership lookup.

---

## 14. What not to repeat unless code changes

Do not repeat unless relevant code changes:

1. C33-M.2 dry-run parity proof.
2. C33-M.4 Activity Event reference-only proof.
3. C33-N.2 orchestration skeleton no-write proof.
4. C33-N.3 product-route exposure policy.
5. C33-N.4 auth/ownership preflight.
6. C33-N.5 orchestration final lock.

---

## 15. C33-O.1 expected result

Expected result:

```text
C33-O.1 RESULT: PRODUCT_SEMANTIC_PREVIEW_ROUTE_CONTRACT_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

