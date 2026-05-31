# C33-L.5 — Production-hardening gate checklist

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block status: C33-L.5 final checklist checkpoint.

---

## 1. Decision

C33-L.5 does not open production persistence.

Default decision:

```text
PRODUCTION STABLE SEMANTIC BUNDLE WRITES REMAIN CLOSED.
C33-K PROVED SANDBOX PERSISTENCE ONLY.
C33-L DEFINES THE BOUNDARIES BEFORE ANY PRODUCTION-LIKE WRITE PATH.
```

C33-L.5 is documentation-only.

---

## 2. Current proven state

C33-K proved a sandbox-only stable semantic bundle persistence chain.

Proven sandbox fixture:

```text
stableBundleId = 87067c54-f8b3-46e7-8451-69e28bc9a69b
sandboxRunKey = c33-k4-sandbox-20260531101917
```

Verified shape:

| Area | Verified |
|---|---:|
| stable_semantic_bundles | 1 |
| stable_semantic_bundle_members | 5 |
| stable_semantic_bundle_blocked_audit_items | 0 |
| stable_semantic_bundle_source_snapshots | 1 |
| stable_semantic_bundle_resolver_snapshots | 1 |
| Total rows | 8 |

Final verified status:

```text
finalLockPassed = true
idempotentDuplicateDetected = true on duplicate retry
duplicate rowsActuallyWritten = 0
```

---

## 3. C33-L decisions now locked

### C33-L.1

C33-K completion and integration/hardening checkpoint recorded.

### C33-L.2

Sandbox fixture is retained for now as a known regression anchor.

### C33-L.3

A future internal service wrapper is required before product integration:

```text
stableSemanticBundlePersistenceServiceV0
```

Debug/test routes must not become normal product APIs.

### C33-L.4

Stable bundle may reference an existing Activity Event, but must not create Activity Event as a side effect.

```text
Stable Bundle can reference existing Activity Event.
Stable Bundle must not create Activity Event.
Preview-only / detached stable bundle context is allowed.
```

---

## 4. Production-hardening gate: mandatory checklist

No production-like write path may be opened until every item below is explicitly checked.

### 4.1 Environment guard

Required before production-like write:

- [ ] production environment detection is explicit;
- [ ] sandbox write mode cannot accidentally run in production;
- [ ] production write mode is disabled by default;
- [ ] production write requires a separate production gate;
- [ ] debug routes are blocked or protected in production;
- [ ] service-role usage is impossible from client-side code;
- [ ] environment variables are documented and validated at startup.

Required output before opening:

```text
environmentGuardPassed = true
productionWriteGateExplicitlyOpened = true
debugRoutesNotPublicProductApi = true
```

### 4.2 Auth0 / Supabase user binding

Required before production-like write:

- [ ] authenticated user id is available server-side;
- [ ] Auth0 user is mapped to Supabase/app user identity;
- [ ] stable bundle row can record creator/owner context where needed;
- [ ] client-provided user id is not trusted;
- [ ] ownership is derived server-side;
- [ ] impersonation and missing-user cases are blocked.

Required output before opening:

```text
serverAuthenticatedUserBound = true
clientUserIdTrusted = false
```

### 4.3 RLS / GRANT / security posture

Required before production-like write:

- [ ] RLS policy decision exists for all five stable bundle tables;
- [ ] service_role privileges are understood and intentionally used;
- [ ] authenticated/user grants are reviewed;
- [ ] public/anon access is blocked unless explicitly justified;
- [ ] row visibility model is documented;
- [ ] user cannot read another user's stable bundle data;
- [ ] security advisor findings are reviewed;
- [ ] schema exposure is reviewed.

Required tables:

```text
stable_semantic_bundles
stable_semantic_bundle_members
stable_semantic_bundle_blocked_audit_items
stable_semantic_bundle_source_snapshots
stable_semantic_bundle_resolver_snapshots
```

### 4.4 Idempotency and concurrency

Required before production-like write:

- [ ] deterministic idempotency key includes proper context;
- [ ] payload hash is deterministic;
- [ ] duplicate retry writes zero rows;
- [ ] concurrent duplicate requests cannot create duplicate bundle rows;
- [ ] unique constraint exists or is intentionally designed;
- [ ] retry behavior is documented;
- [ ] partial failure behavior is documented.

For existing Activity Event path:

```text
idempotency key should include activityEventId + semantic policy + normalized payload hash
```

For detached preview/sandbox path:

```text
idempotency key should include previewRunKey/sandboxRunKey + semantic policy + normalized payload hash
```

### 4.5 Transaction / rollback behavior

Required before production-like write:

- [ ] writes are atomic or equivalent compensating rollback exists;
- [ ] header/member/audit/snapshot consistency is guaranteed;
- [ ] partial insert cannot leave broken production data;
- [ ] rollback errors are reported;
- [ ] post-write verification is mandatory;
- [ ] transaction contract is implemented outside debug-only proof.

Target production write unit:

```text
stable bundle header
+ member rows
+ blocked audit rows
+ source snapshot
+ resolver snapshot
```

### 4.6 Audit trail

Required before production-like write:

- [ ] every production-like write has audit evidence;
- [ ] actor identity is recorded where appropriate;
- [ ] request/source context is recorded;
- [ ] semantic policy version is recorded;
- [ ] resolver policy version is recorded;
- [ ] idempotency key is recorded;
- [ ] payload hash is recorded;
- [ ] blocked candidates are auditable but not promoted to members.

### 4.7 Activity Event boundary

Required before production-like write:

- [ ] stable bundle can reference only an existing Activity Event;
- [ ] stable bundle service cannot create Activity Event;
- [ ] `activityEventId: string | null` is accepted;
- [ ] `createActivityEventIfMissing` flag does not exist in stable bundle service;
- [ ] detached preview/sandbox case is documented;
- [ ] activity capture orchestration is separate.

Locked rule:

```text
Activity Event = source of truth.
Stable Semantic Bundle = semantic evidence.
```

### 4.8 Value Object boundary

Required before production-like write:

- [ ] stable bundle service cannot create Value Objects;
- [ ] stable bundle service cannot create activity-value-object links;
- [ ] Value Object suggestion is separate from persistence;
- [ ] Value Object/link creation requires separate user confirmation or a separate service gate;
- [ ] no automatic VO explosion from category candidates.

Locked rule:

```text
Stable Semantic Bundle does not create Value Object.
```

### 4.9 State boundary

Required before production-like write:

- [ ] stable bundle service cannot create State Facts;
- [ ] stable bundle service cannot create State Deltas;
- [ ] stable bundle service cannot create State Snapshots;
- [ ] physiological/state claims remain outside semantic bundle persistence;
- [ ] state observation service is separate.

Locked rule:

```text
Category is not State Fact.
Semantic evidence is not physiological truth.
```

### 4.10 Route exposure policy

Required before production-like write:

- [ ] debug routes are marked QA/debug only;
- [ ] product routes do not call debug URLs directly;
- [ ] internal service wrapper is used server-side;
- [ ] public endpoints do not expose service-role behavior;
- [ ] POST routes have auth/ownership checks before production use;
- [ ] rate limiting is planned;
- [ ] abuse cases are considered.

### 4.11 Monitoring and logging

Required before production-like write:

- [ ] structured logs exist for persistence attempts;
- [ ] failures include safe diagnostic details;
- [ ] sensitive data is not logged unnecessarily;
- [ ] row counts are logged;
- [ ] idempotent duplicate detection is logged;
- [ ] post-write verification result is logged;
- [ ] alerting or review path exists for persistence failures.

### 4.12 Test and regression suite

Required before production-like write:

- [ ] known sample still persists expected member count;
- [ ] unknown sample still blocks unresolved/external terms;
- [ ] duplicate retry still writes zero rows;
- [ ] semantic preview remains no-write;
- [ ] next action preview remains no-write;
- [ ] invariant route remains green;
- [ ] regression matrix remains green;
- [ ] C33-K sandbox fixture verification remains green or fixture lifecycle is replaced.

---

## 5. Explicit production non-goals now

C33-L.5 does not authorize:

- production stable bundle writes;
- product UI integration;
- Activity Event write integration;
- Value Object creation;
- activity-value-object link creation;
- state fact/delta/snapshot creation;
- cleanup route execution;
- public exposure of debug write-gate routes.

---

## 6. Recommended next block

Recommended next block:

```text
C33-M — Stable semantic bundle service implementation planning
```

Suggested C33-M sequence:

### C33-M.1 — Service wrapper skeleton, no DB write

Create `stableSemanticBundlePersistenceServiceV0` as a pure/server-only orchestration wrapper.

No DB write. No product route.

### C33-M.2 — Service wrapper dry-run parity

Prove the wrapper produces the same plan as C33-K debug route.

No DB write.

### C33-M.3 — Service wrapper sandbox-write adapter

Allow service wrapper to call the sandbox write logic under existing sandbox gates.

Sandbox only.

### C33-M.4 — Activity Event reference dry-run

Prove an existing Activity Event id can be accepted as reference only.

No Activity Event creation.

### C33-M.5 — C33-M final lock

Document whether wrapper is ready for a later product integration block.

---

## 7. What not to repeat in the next block

Do not repeat unless relevant code changes:

1. C33-K.2 schema preflight already proved 5/5 tables and 45/45 required columns.
2. C33-K.4R already proved one sandbox write and idempotent duplicate retry.
3. C33-K.5R already proved 13/13 post-write verification checks.
4. C33-L.2 already decided to retain the sandbox fixture for now.
5. C33-L.4 already decided that stable bundle must not create Activity Event.

---

## 8. C33-L.5 result

Expected result:

```text
C33-L.5 RESULT: PRODUCTION_HARDENING_GATE_CHECKLIST_COMMITTED_AND_PUSHED
C33-L RESULT: INTEGRATION_CLEANUP_AND_PRODUCTION_HARDENING_DECISIONS_COMPLETE
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

