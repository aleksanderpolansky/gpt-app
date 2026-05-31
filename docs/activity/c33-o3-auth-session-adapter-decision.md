# C33-O.3 — Auth/session adapter decision

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-O — Product semantic preview route planning.

---

## 1. Decision

C33-O.3 defines the auth/session position for the product semantic preview route.

```text
C33-O.3 RESULT: AUTH_SESSION_ADAPTER_DECISION_COMMITTED_AND_PUSHED
```

Main decision:

```text
The current C33-O.2 route skeleton is a no-auth, no-DB, no-write preview skeleton.
It may be used only as a demo-safe / technical product-style preview skeleton.
It is not yet a real personal authenticated product route.
```

Second decision:

```text
Any real personal activity product flow must be authenticated-only before it uses user-owned data,
Activity Event ids, history, Semantic Capital, Value Objects, organization context, or ownership-sensitive fields.
```

This step does not implement auth code.

```text
NO ROUTE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO PRODUCTION PERSISTENCE.
```

---

## 2. Why this decision is needed

C33-O.1 allowed two possible positions for the first product-style preview route:

1. authenticated preview only;
2. demo no-auth preview.

C33-O.2 created a product-style route skeleton:

```text
POST /api/activity/semantic-orchestration-preview
```

The C33-O.2 skeleton:

- performs no SQL;
- performs no DB read;
- performs no DB write;
- calls internal `activitySemanticOrchestrationServiceV0` directly;
- does not call debug routes;
- rejects client-provided identity fields;
- rejects write flags;
- rejects Activity Event ids.

Therefore it is safe only as a detached preview skeleton, not as a real user-owned activity route.

---

## 3. Current route status after C33-O.2

Current route:

```text
src/app/api/activity/semantic-orchestration-preview/route.ts
```

Current status:

```text
mode = product_semantic_preview_no_write_v0
activityEventId = null
authenticatedUserId = null
allowActivityEventCreation = false
allowValueObjectCreation = false
allowStateWrites = false
dbReadExecuted = false
dbWriteExecuted = false
rowsActuallyWritten = 0
```

Interpretation:

```text
The route can preview meaning from submitted text.
The route cannot prove user ownership.
The route cannot attach to a real Activity Event.
The route cannot use personal history.
The route cannot use private Semantic Capital.
```

---

## 4. Accepted route class for now

For the current C33-O block, the route is classified as:

```text
product-style detached preview skeleton
```

Allowed:

- text-only preview;
- no Activity Event id;
- no app user id;
- no organization id;
- no personal history;
- no Semantic Capital lookup;
- no persistence;
- no DB read/write.

Not allowed:

- presenting it as a complete authenticated product route;
- linking it to personal history;
- accepting `activityEventId`;
- accepting `user_id` or `authenticatedUserId`;
- using client identity;
- reading user data;
- persisting stable bundles.

---

## 5. Future authenticated route position

For real personal use, the route must become authenticated-only or be wrapped by an authenticated caller.

Minimum future server-side identity chain:

```text
request
→ server reads Auth0 session/token
→ server maps Auth0 subject to internal app user
→ server decides route mode and allowed context
→ server verifies Activity Event ownership if activityEventId is used
→ server calls internal service
→ server returns explicit side-effect flags
```

Forbidden:

```text
client sends user_id and route trusts it
client sends authenticatedUserId and route trusts it
client sends organization_id and route trusts it
client sends activityEventId and route assumes ownership
```

---

## 6. Auth adapter options

### Option A — Keep current route demo-safe, add auth later

Decision for C33-O:

```text
ACCEPTED FOR NOW.
```

Reason:

- current route is no-DB and no-write;
- it does not accept Activity Event ids;
- it rejects client identity;
- it is useful for UI contract shaping;
- it avoids opening auth/ownership complexity before C33-O.4.

### Option B — Add Auth0 session read directly in C33-O.3

Decision for C33-O.3:

```text
NOT IMPLEMENTED NOW.
```

Reason:

- this step is a decision/preflight step;
- auth code changes may require existing project auth helper inspection;
- app user mapping may require DB read or a separate read-only gate;
- C33-O.4 is the correct place to plan ownership lookup;
- C33-P or a later implementation block should wire real UI/auth behavior.

### Option C — Allow anonymous real product flow

Decision:

```text
REJECTED FOR PERSONAL ACTIVITY DATA.
```

Reason:

- personal activity text may contain health/family/work/money/private context;
- the system must not create a false sense of personal continuity without identity;
- anonymous preview can exist only as demo detached preview.

---

## 7. Current C33-O.2 route handling of auth-sensitive fields

The route must continue to reject or ignore dangerous client-provided fields.

Required denial list:

```text
user_id
userId
authenticatedUserId
owner_user_id
ownerUserId
organization_owner_id
organizationOwnerId
visibility_scope
visibilityScope
activityEventId
allowActivityEventCreation = true
allowValueObjectCreation = true
allowStateWrites = true
productionWriteEnabled = true
sandboxWriteEnabled = true
```

Preferred current behavior:

```text
return HTTP 400
internalServiceCalled = false
rowsActuallyWritten = 0
```

---

## 8. Future response metadata

When auth is later introduced, response should include safe high-level auth metadata:

```ts
type ProductSemanticPreviewAuthStatusV0 = {
  authMode: "demo_detached_preview" | "authenticated_preview";
  authenticated: boolean;
  appUserResolved: boolean;
  clientIdentityTrusted: false;
  activityEventOwnershipChecked: boolean;
  organizationContextChecked: boolean;
};
```

For current C33-O.2 route, the conceptual values are:

```text
authMode = demo_detached_preview
authenticated = false
appUserResolved = false
clientIdentityTrusted = false
activityEventOwnershipChecked = false
organizationContextChecked = false
```

C33-O.3 does not require changing the route to add this field. It defines the decision for future implementation.

---

## 9. Relationship to C33-O.4

C33-O.4 must plan ownership checks, not implement persistence.

C33-O.4 should answer:

- what has to be checked before accepting `activityEventId`;
- which table or service is authoritative for Activity Event ownership;
- whether ownership lookup is read-only and whether it needs an explicit DB-read gate;
- how organization/actor context is validated;
- how the product route should behave if ownership cannot be verified.

C33-O.4 must not open production writes.

---

## 10. Relationship to C33-P

C33-P will connect real Activity Capture product input to product semantic preview.

C33-P must not assume the route is fully authenticated unless a later step implements auth/session resolution.

Recommended C33-P behavior if auth is not implemented by then:

```text
use product preview route only for detached preview;
do not pass Activity Event id;
do not pass user id;
do not claim personal history or ownership;
show preview result as temporary / not saved;
```

---

## 11. What C33-O.3 does not implement

C33-O.3 does not implement:

- Auth0 session code;
- app user mapping;
- Supabase user lookup;
- Activity Event ownership lookup;
- organization role lookup;
- route code changes;
- SQL;
- DB read;
- DB write;
- production persistence;
- UI integration.

C33-O.3 is documentation-only.

---

## 12. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-O.1 product route contract document.
2. C33-O.2 product route skeleton proof.
3. C33-N.2 orchestration skeleton no-write proof.
4. C33-N.3 product-route exposure policy.
5. C33-N.4 auth/ownership preflight.
6. C33-M stable bundle service wrapper proofs.

---

## 13. Recommended next step

Next block step:

```text
C33-O.4 — Ownership check preflight plan
```

C33-O.4 should remain no-write and should not query DB unless the user explicitly approves a read-only gate.

---

## 14. C33-O.3 expected result

Expected result:

```text
C33-O.3 RESULT: AUTH_SESSION_ADAPTER_DECISION_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

