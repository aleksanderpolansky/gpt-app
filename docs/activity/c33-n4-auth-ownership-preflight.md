# C33-N.4 — Auth/ownership preflight

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-N — Activity capture to stable semantic bundle orchestration planning.

---

## 1. Decision

C33-N.4 defines the minimum auth and ownership rules required before any future product-style semantic orchestration route can be implemented.

```text
C33-N.4 RESULT: AUTH_OWNERSHIP_PREFLIGHT_COMMITTED_AND_PUSHED
```

Main decision:

```text
No product semantic route may trust a client-provided user_id, authenticatedUserId, activity owner, organization owner, or visibility scope.
All product-route identity and ownership must be resolved server-side.
```

This step does not implement auth logic and does not create routes.

```text
NO ROUTE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO PRODUCTION PERSISTENCE.
```

---

## 2. Why this preflight exists

C33-N.2 created `activitySemanticOrchestrationServiceV0`.

That skeleton currently accepts `authenticatedUserId` as an input field only for dry-run contract shaping.

Important lock:

```text
The C33-N.2 authenticatedUserId field is not trusted identity.
It is a placeholder/preflight field, not a product security mechanism.
```

Before any product route can call orchestration in a real user context, the route must resolve identity from the server-side auth session.

---

## 3. Identity chain required for future product routes

A future product route must derive identity in this order:

```text
1. Request arrives.
2. Server reads Auth0 session/token.
3. Server maps Auth0 subject to internal app user.
4. Server loads/validates the user's allowed context.
5. Server verifies Activity Event ownership or access.
6. Server calls orchestration service.
7. Server returns result with explicit side-effect flags.
```

Forbidden:

```text
client sends user_id
client sends authenticatedUserId
client sends owner_user_id
client sends organization_id and route trusts it without verification
client sends activityEventId and route assumes ownership
```

Allowed only after verification:

```text
client sends activityEventId
server checks that this activityEventId belongs to the authenticated user/context
server passes verified activityEventId to internal service
```

---

## 4. Activity Event ownership requirement

Stable Semantic Bundle may reference an Activity Event, but only after ownership is checked by the caller.

Required future checks:

```text
activity_events.id = requested activityEventId
activity_events.owner_user_id or actor/user binding matches authenticated app user
activity_events.context/space/organization access is allowed
activity_events.deleted_at or archived status does not invalidate access
```

Do not rely on:

```text
activityEventId alone
client-provided user id
client-provided organization id
debug-route caller identity
```

C33-N.4 does not define the final table names if the current schema uses different names. The actual implementation must inspect the current schema before coding.

---

## 5. Stable Bundle ownership and visibility requirement

Before production persistence is opened, stable bundle records must be scoped.

Minimum expected scope fields or equivalent logic:

```text
stable bundle owner/user context
activityEventId if attached
visibility/privacy level
source route/service
created_by app user
audit source
```

Required behavior:

- if `activityEventId` is present, stable bundle access follows the verified activity event access;
- if `activityEventId` is null, detached preview must not become a persistent user-owned bundle without explicit owner scope;
- sandbox fixtures must never become user-visible product data;
- debug-route artifacts must not appear in product UI.

---

## 6. Organization and actor context

If the future activity belongs to an organization or enterprise context:

Required future checks:

```text
authenticated user has role in organization/context
role allows semantic preview or persistence
activityEventId belongs to that organization/context
stable bundle visibility matches organization policy
```

Forbidden:

```text
user sends organization_id and route trusts it
user sends actor_id and route trusts it
route infers enterprise rights from email alone
route uses service_role to bypass ownership rules
```

---

## 7. Service role boundary

Service role may be used only inside server-side code that has already performed authorization.

Rules:

- service role must never be exposed to client;
- service role must never be used to skip ownership checks;
- service role routes must be narrow and auditable;
- debug routes using privileged assumptions must not become product APIs;
- product routes must prefer RLS-aligned behavior where possible.

Production write path cannot open until service-role boundary is documented in the implementation block.

---

## 8. RLS and GRANT preflight

Before any product write route, the implementation block must check:

```text
table RLS enabled
policies match user/organization ownership
explicit GRANT posture is correct
anon has no private semantic write access
authenticated has only intended access under RLS
service_role use is limited to backend-only paths
```

C33-N.4 does not execute SQL and does not inspect live RLS.

The later implementation block must run an explicit schema/security audit if it changes auth, RLS, grants, ownership, or production persistence.

---

## 9. Product preview route auth requirement

A future preview route may be allowed before write persistence, but it still needs a clear auth policy.

Possible options:

### Option A — authenticated preview only

Recommended for personal activity data.

```text
/api/activity/semantic-orchestration-preview
```

Requires:

- server-side session;
- app user mapping;
- no persistence;
- explicit no-write flags.

### Option B — anonymous demo preview

Allowed only if it does not use personal data.

Requires:

- no Activity Event id;
- no user-owned data lookup;
- no persistence;
- no use of private context;
- clear demo mode flag.

Default recommendation:

```text
personal activity semantic preview should require authenticated user.
```

---

## 10. Product write route auth requirement

A future write route is not allowed yet.

Not allowed yet:

```text
/api/activity/{activityEventId}/stable-semantic-bundle
```

This requires a later block proving:

1. server-side authenticated user resolution;
2. Activity Event ownership check;
3. stable bundle scope/visibility;
4. idempotency key;
5. rollback/transaction behavior;
6. audit trail;
7. RLS/GRANT posture;
8. rate limits/abuse handling;
9. production write gate;
10. regression suite.

Until then:

```text
PRODUCTION STABLE BUNDLE WRITES REMAIN CLOSED.
```

---

## 11. API contract implications

Future product routes must return identity/ownership metadata without exposing sensitive internals.

Example output shape:

```ts
type ProductSemanticAuthPreflightV0 = {
  authenticated: boolean;
  appUserResolved: boolean;
  activityEventOwnershipVerified: boolean;
  organizationContextVerified: boolean;
  productRouteAllowed: boolean;
  productionWriteGateOpened: false;
  rowsActuallyWritten: 0;
};
```

For no-write preview routes:

```text
productionWriteGateOpened = false
rowsActuallyWritten = 0
activityEventCreated = false
stableBundlePersisted = false
valueObjectCreated = false
stateFactCreated = false
```

---

## 12. Required denial cases

Future product routes must deny:

| Case | Expected result |
|---|---|
| no session and personal route | denied |
| invalid session | denied |
| session exists but app user not mapped | denied |
| activityEventId belongs to another user | denied |
| organization_id not accessible to user | denied |
| client-provided user_id conflicts with session | denied |
| request asks for production write but gate closed | denied |
| request asks to create VO/State from semantic preview | denied |

Every denial must remain no-write.

---

## 13. Relationship to C33-N.3 route policy

C33-N.3 decided:

```text
Future product routes must call internal services directly.
Future product routes must not call debug routes as implementation dependencies.
```

C33-N.4 adds:

```text
Future product routes must resolve identity and ownership before calling internal services.
```

Therefore the future product route sequence is:

```text
request
→ server-side auth/session
→ app user mapping
→ ownership/context verification
→ internal orchestration service
→ explicit no-write/write flags in response
```

---

## 14. What C33-N.4 does not implement

C33-N.4 does not implement:

- Auth0 code;
- Supabase app user lookup;
- Activity Event ownership query;
- organization role query;
- product route;
- RLS policies;
- GRANT changes;
- SQL;
- DB access;
- production persistence;
- UI integration.

C33-N.4 is documentation-only.

---

## 15. Recommended C33-N continuation

### C33-N.5 — C33-N final lock

Finalize C33-N and decide whether the next block may begin.

Recommended next block after C33-N:

```text
C33-O — product-style semantic preview route planning
```

C33-O should still be no-write unless a separate decision opens a controlled route implementation.

---

## 16. What not to repeat unless code changes

Do not repeat unless relevant code changes:

1. C33-M.2 dry-run parity proof.
2. C33-M.3 duplicate fixture adapter proof.
3. C33-M.4 Activity Event reference-only proof.
4. C33-N.2 orchestration skeleton no-write proof.
5. C33-N.3 product-route exposure policy.
6. C33-L.5 production-hardening checklist.

---

## 17. C33-N.4 expected result

Expected result:

```text
C33-N.4 RESULT: AUTH_OWNERSHIP_PREFLIGHT_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

