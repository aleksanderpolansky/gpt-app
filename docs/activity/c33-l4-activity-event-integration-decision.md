# C33-L.4 — Activity Event integration decision

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block status: C33-L.4 decision checkpoint.

---

## 1. Decision

Stable semantic bundle persistence may reference an existing Activity Event, but it must not create an Activity Event as a side effect.

Default decision:

```text
STABLE BUNDLE CAN REFERENCE EXISTING ACTIVITY EVENT.
STABLE BUNDLE MUST NOT CREATE ACTIVITY EVENT.
PREVIEW-ONLY / DETACHED STABLE BUNDLE CONTEXT IS ALLOWED.
```

This decision preserves the key source-of-truth invariant:

```text
Activity Event = source of truth for real activity occurrence.
Stable Semantic Bundle = stable semantic interpretation/evidence attached to the event or preview context.
```

---

## 2. Why this boundary is necessary

The platform has two different responsibilities:

1. Activity Event captures that something happened, was planned, or was recorded.
2. Stable Semantic Bundle captures the stable semantic interpretation of an activity input.

These must not be silently merged.

If stable bundle persistence also creates Activity Events, then one semantic route could accidentally become a full activity recording route, creating hidden side effects.

Therefore:

```text
Activity Event creation belongs to activity capture / activity recording flow.
Stable Semantic Bundle persistence belongs to semantic stabilization flow.
```

---

## 3. Allowed integration modes

### Mode A — Existing Activity Event reference

Allowed.

```text
activity_event_id = existing activity event id
```

Use when:

- Activity Event already exists;
- semantic bundle is derived after or during activity processing;
- user has already recorded or confirmed the activity;
- backend has a trusted event id.

This is the future preferred production path.

### Mode B — Preview-only detached bundle

Allowed for QA, preview, sandbox and draft flows.

```text
activity_event_id = null
```

Use when:

- user is previewing semantic interpretation;
- activity is not yet confirmed;
- sandbox write test is running;
- there is no real Activity Event yet;
- the bundle is used as evidence, not source of truth.

### Mode C — Stable bundle creates Activity Event

Forbidden.

```text
stable bundle persistence → create activity event
```

This must not happen in the stable bundle service.

If needed later, a separate orchestration layer may call:

```text
Activity Event capture service
→ Stable Bundle persistence service
```

But these must remain separate service calls with separate contracts.

---

## 4. Future orchestration order

Recommended future order for a real confirmed activity:

```text
1. User input enters activity capture flow.
2. Activity Event input contract validates source/time/duration/status.
3. Activity Event is created or found through its own write gate/service.
4. Semantic derivation produces candidate categories/terms.
5. Resolver decision contract decides member vs blocked audit items.
6. Stable semantic bundle service receives existing activityEventId.
7. Stable bundle rows are persisted.
8. Post-write verification confirms stable bundle rows.
9. Value Object suggestion layer may propose links, but does not auto-create them.
10. User confirmation or separate service creates VO/link later.
```

This prevents hidden cascading writes.

---

## 5. Future preview order

Recommended future order for preview-only flow:

```text
1. User input enters semantic preview.
2. Activity Event is not created.
3. Semantic derivation produces candidates.
4. Resolver decision contract marks accepted/blocked candidates.
5. Stable bundle may remain preview-only and detached.
6. No Value Object is created.
7. No Activity Event is created.
8. No state facts/deltas/snapshots are created.
```

If preview is later confirmed, a new orchestration step must decide whether to create Activity Event first and then attach/persist semantic bundle.

---

## 6. Data model implication

The existing stable bundle table already supports the correct model:

```text
activity_event_id = nullable
```

Meaning:

- `NULL` is valid for sandbox/preview/detached bundle;
- non-null reference is valid only when Activity Event already exists;
- stable bundle persistence must not invent or backfill Activity Event id.

Recommended semantic meaning:

| activity_event_id | Meaning |
|---|---|
| `NULL` | preview, sandbox, detached semantic evidence |
| existing UUID | semantic bundle attached to already existing Activity Event |

---

## 7. Service wrapper implication

The future `stableSemanticBundlePersistenceServiceV0` should accept:

```ts
activityEventId: string | null
```

But it must not accept an instruction like:

```ts
createActivityEventIfMissing: true
```

That flag should not exist in the stable bundle service.

If future orchestration needs creation, it belongs in a higher-level service:

```text
activityCaptureOrchestrationServiceV0
```

Possible higher-level orchestration responsibility:

```text
create/confirm Activity Event
→ call stableSemanticBundlePersistenceServiceV0 with activityEventId
→ optionally call later VO/link suggestion service
```

---

## 8. Idempotency implication

Stable semantic bundle idempotency should include enough context to avoid duplicates.

For existing Activity Event path:

```text
idempotency key should include activityEventId + semantic policy + normalized payload hash
```

For detached preview/sandbox path:

```text
idempotency key should include sandboxRunKey or previewRunKey + semantic policy + normalized payload hash
```

This avoids confusing a real Activity Event bundle with a detached preview bundle.

---

## 9. What C33-L.4 does not implement

C33-L.4 does not implement:

- Activity Event creation;
- Activity Event write gate;
- Activity Event lookup;
- stable bundle service wrapper runtime;
- product route integration;
- UI changes;
- cleanup;
- production persistence.

C33-L.4 is documentation-only.

---

## 10. Safety invariants confirmed by this decision

The following invariants remain active:

1. Activity Event is the source of truth for real activity occurrence.
2. Stable Semantic Bundle is semantic evidence, not the activity itself.
3. Stable Bundle may reference an Activity Event, but cannot create it.
4. Detached preview bundle is allowed only as preview/sandbox/draft evidence.
5. Value Object creation remains separate and user-confirmed.
6. State Fact creation remains separate and data-driven.
7. Production writes remain disabled until production-hardening gates.
8. Debug routes remain QA tools, not product API.

---

## 11. Recommended future service boundary

Future service separation:

| Service | Responsibility |
|---|---|
| `activityEventCaptureServiceV0` | create/confirm real Activity Event |
| `stableSemanticBundlePersistenceServiceV0` | persist stable semantic bundle for existing event or detached preview |
| `valueObjectSuggestionServiceV0` | suggest possible Value Objects/links |
| `valueObjectLinkPersistenceServiceV0` | create VO/link only after confirmation |
| `stateObservationServiceV0` | create state facts/deltas only from explicit state contracts |

Do not collapse these services into one side-effect-heavy function.

---

## 12. Recommended C33-L.5 focus

Proceed to:

```text
C33-L.5 — production-hardening gate checklist
```

C33-L.5 should not implement production persistence.

It should create a checklist that defines what must be true before any production-like write path can be opened:

- environment guard;
- Auth0/Supabase user binding;
- RLS/GRANT review;
- service-role isolation;
- audit trail;
- idempotency under concurrency;
- rate limiting;
- fixture cleanup/retention rule;
- monitoring;
- rollback/error policy;
- route exposure policy;
- migration/security advisor review.

---

## 13. C33-L.4 result

Expected result:

```text
C33-L.4 RESULT: ACTIVITY_EVENT_INTEGRATION_DECISION_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

