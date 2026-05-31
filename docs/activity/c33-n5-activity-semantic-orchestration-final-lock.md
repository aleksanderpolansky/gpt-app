# C33-N.5 — Activity semantic orchestration final lock

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-N — Activity capture to stable semantic bundle orchestration planning.

---

## 1. Final decision

C33-N is complete as an orchestration planning and no-write skeleton block.

```text
C33-N RESULT: ACTIVITY_SEMANTIC_ORCHESTRATION_PLANNING_BLOCK_COMPLETE
```

C33-N does not open production persistence.

```text
PRODUCTION STABLE BUNDLE WRITES REMAIN CLOSED.
PRODUCT WRITE ROUTES REMAIN CLOSED.
ACTIVITY EVENT CREATION REMAINS SEPARATE.
VALUE OBJECT CREATION REMAINS SEPARATE.
STATE FACT/DELTA/SNAPSHOT CREATION REMAINS SEPARATE.
```

---

## 2. What C33-N added

### C33-N.1 — Orchestration boundary

Created:

```text
docs/activity/c33-n1-activity-capture-stable-bundle-orchestration-boundary.md
```

Locked decisions:

```text
Activity capture and Stable Semantic Bundle persistence remain separate services.
Activity Event = source of truth.
Stable Semantic Bundle = semantic evidence / interpretation.
Orchestration = controlled sequence.
```

Result:

```text
C33-N.1 RESULT: ACTIVITY_CAPTURE_STABLE_BUNDLE_ORCHESTRATION_BOUNDARY_COMMITTED_AND_PUSHED
```

### C33-N.2 — Orchestration skeleton, no DB write

Created:

```text
lib/activity/categoryDerivation/activitySemanticOrchestrationServiceV0.ts
src/app/api/activity/debug/activity-semantic-orchestration-skeleton/route.ts
```

Locked behavior:

- supports `preview_only`;
- supports `dry_run_existing_event`;
- calls `stableSemanticBundlePersistenceServiceV0` only in `dry_run`;
- blocks Activity Event creation requests;
- blocks Value Object creation requests;
- blocks State write requests;
- no SQL;
- no DB read;
- no DB write.

Result:

```text
C33-N.2 RESULT: ACTIVITY_SEMANTIC_ORCHESTRATION_SKELETON_COMMITTED_AND_PUSHED
```

### C33-N.3 — Product-route exposure policy

Created:

```text
docs/activity/c33-n3-product-route-exposure-policy.md
```

Locked decisions:

```text
Debug routes remain debug-only.
Future product routes must call internal services directly.
Future product routes must not call debug routes as implementation dependencies.
```

C33-N.3 explicitly keeps these closed:

```text
stable-semantic-bundle-explicit-sandbox-write-gate as product behavior
stable-semantic-bundle-persistence-service-sandbox-write-adapter as product behavior
post-write verification route as product behavior
schema preflight route as product behavior
```

Result:

```text
C33-N.3 RESULT: PRODUCT_ROUTE_EXPOSURE_POLICY_COMMITTED_AND_PUSHED
```

### C33-N.4 — Auth/ownership preflight

Created:

```text
docs/activity/c33-n4-auth-ownership-preflight.md
```

Locked decisions:

```text
No product semantic route may trust client-provided user_id.
No product semantic route may trust client-provided authenticatedUserId.
No product semantic route may trust client-provided activity owner.
No product semantic route may trust client-provided organization owner.
No product semantic route may trust client-provided visibility scope.
```

Required future route sequence:

```text
request
→ server-side Auth0 session/token
→ app user mapping
→ ownership/context verification
→ internal orchestration service
→ explicit no-write/write flags
```

Result:

```text
C33-N.4 RESULT: AUTH_OWNERSHIP_PREFLIGHT_COMMITTED_AND_PUSHED
```

---

## 3. Active boundary after C33-N

After C33-N, the system has these layers:

```text
Activity Event layer
  source of truth for real activity occurrence

Stable Semantic Bundle layer
  semantic evidence / interpretation

Activity Semantic Orchestration layer
  controlled sequence connecting activity context to stable semantic bundle service

Product route layer
  not implemented yet
```

The product route layer remains future work.

---

## 4. What is ready after C33-N

Ready:

```text
orchestration boundary
orchestration skeleton no-write service
debug proof route for orchestration skeleton
product-route exposure policy
auth/ownership preflight policy
```

Not ready yet:

```text
user-facing product route
real product preview route
real Activity Event ownership query
Auth0/Supabase app-user mapping in this path
stable bundle production persistence
product write route
```

---

## 5. What remains forbidden

Still forbidden:

```text
debug routes as product APIs
product route calling /api/activity/debug/*
client-provided user_id trust
client-provided authenticatedUserId trust
client-provided organization_id trust
client-provided activity owner trust
stable bundle service creating Activity Event
semantic preview creating Value Object
semantic preview creating State Fact/Delta/Snapshot
production stable bundle write without separate gate
```

---

## 6. Final C33-N invariants

The following invariants are locked:

1. Activity Event remains source of truth.
2. Stable Semantic Bundle remains semantic evidence.
3. Orchestration sequences services but does not merge their responsibilities.
4. Stable bundle service may receive `activityEventId`, but must not create Activity Event.
5. Product routes must call internal services, not debug routes.
6. Product route identity must be resolved server-side.
7. Client-provided identity/ownership must not be trusted.
8. Stable Bundle production writes remain closed.
9. Value Object and State writes remain separate future layers.
10. All future product routes must expose side-effect flags.

---

## 7. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-M.2 dry-run parity proof.
2. C33-M.3 duplicate fixture adapter proof.
3. C33-M.4 Activity Event reference-only proof.
4. C33-N.2 orchestration skeleton no-write proof.
5. C33-N.3 product-route exposure policy.
6. C33-N.4 auth/ownership preflight.
7. C33-L.5 production-hardening checklist.

---

## 8. Recommended next block

Recommended next block:

```text
C33-O — product-style semantic preview route planning
```

C33-O should start with no-write product-style preview planning, not production persistence.

Suggested C33-O sequence:

### C33-O.1 — Product preview route contract document

Define a future no-write product route contract:

```text
/api/activity/semantic-orchestration-preview
```

No code or route yet.

### C33-O.2 — Auth-aware product preview route skeleton

Create a product-style route skeleton that still performs no DB read/write.

It may only call internal orchestration service.

### C33-O.3 — Auth/session adapter decision

Decide how to resolve Auth0 session and map it to app user.

No ownership DB query yet unless separately gated.

### C33-O.4 — Ownership check preflight plan

Plan Activity Event ownership lookup contract.

No write.

### C33-O.5 — C33-O final lock

Decide whether later implementation can add read-only ownership lookup.

---

## 9. C33-N.5 expected result

Expected result:

```text
C33-N.5 RESULT: ACTIVITY_SEMANTIC_ORCHESTRATION_FINAL_LOCK_COMMITTED_AND_PUSHED
C33-N RESULT: ACTIVITY_SEMANTIC_ORCHESTRATION_PLANNING_BLOCK_COMPLETE
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime production behavior change.

