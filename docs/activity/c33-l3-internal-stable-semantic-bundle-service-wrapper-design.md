# C33-L.3 — Internal stable semantic bundle service wrapper design

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block status: C33-L.3 design checkpoint.

---

## 1. Decision

C33-L.3 does not implement runtime code.

It defines the future internal application service wrapper that should sit between product routes and the existing stable semantic bundle debug/test chain.

Default decision:

```text
DESIGN THE INTERNAL SERVICE WRAPPER FIRST.
DO NOT CONNECT PRODUCT UI OR NORMAL ACTIVITY CAPTURE TO THE C33-K WRITE GATE YET.
```

---

## 2. Why a wrapper is needed

C33-K proved that the sandbox-only stable semantic bundle persistence chain works.

However, the C33-K route is still a debug/test route:

```text
/api/activity/debug/stable-semantic-bundle-explicit-sandbox-write-gate
```

A normal product flow must not call that route directly.

A future internal wrapper is needed to:

1. hide debug endpoints from product flows;
2. centralize environment guards;
3. centralize service-role usage;
4. centralize idempotency and payload hashing;
5. prevent accidental production writes;
6. prevent side effects into Activity Events, State, or Value Objects;
7. make future test/prod gates explicit.

---

## 3. Proposed wrapper location

Recommended future file:

```text
lib/activity/categoryDerivation/stableSemanticBundlePersistenceServiceV0.ts
```

Recommended future route only if needed for QA:

```text
src/app/api/activity/debug/stable-semantic-bundle-persistence-service-proof/route.ts
```

For product use, prefer direct server-side service invocation from backend application routes rather than public/debug endpoints.

---

## 4. Wrapper responsibility

The wrapper should own only stable semantic bundle persistence orchestration.

Allowed responsibilities:

1. receive already-normalized semantic bundle input;
2. require source-order and resolver decision results;
3. build deterministic idempotency key;
4. build deterministic payload hash;
5. check environment and gate mode;
6. call stable semantic bundle persistence logic;
7. return stable bundle ID and verification status;
8. return blocked audit info;
9. expose read-only proof fields for debugging;
10. avoid all unrelated domain writes.

---

## 5. Wrapper non-responsibilities

The wrapper must not:

1. create Activity Events;
2. create Value Objects;
3. create Activity Value Object links;
4. create State Facts;
5. create State Deltas;
6. create State Snapshots;
7. approve external concepts as internal categories;
8. mutate resolver candidate tables unless a separate resolver persistence service is explicitly created;
9. perform user-facing recommendation decisions;
10. run production writes without a separate production-hardening gate.

---

## 6. Safe target flow

The future safe target flow should be:

```text
Product/server route
→ Activity Event already exists OR preview-only context exists
→ semantic candidate derivation
→ local controlled source lookup
→ unknown/external blocker handling
→ resolver decision contract
→ stableSemanticBundlePersistenceServiceV0
→ stable semantic bundle rows
→ post-write verification
```

Important:

```text
Stable bundle persistence references Activity Event only if Activity Event already exists.
Stable bundle persistence does not create Activity Event as a side effect.
```

---

## 7. Service input contract draft

Future wrapper input should be explicit:

```ts
type StableSemanticBundlePersistenceServiceInputV0 = {
  mode: "dry_run" | "sandbox_write" | "production_disabled";
  activityEventId: string | null;
  rawText: string;
  normalizedText: string;
  inputLanguage: string;
  source: "manual" | "chat_ai" | "calendar" | "booking" | "rule" | "import" | "system";
  resolverDecisionContract: unknown;
  manualSchemaReadinessSummary?: unknown;
  sandboxRunKey?: string;
  explicitConfirmation?: string;
  authenticatedUserId?: string | null;
};
```

Production mode must stay disabled until a later production hardening gate.

---

## 8. Service output contract draft

Future wrapper output should be explicit:

```ts
type StableSemanticBundlePersistenceServiceOutputV0 = {
  ok: boolean;
  mode: "dry_run" | "sandbox_write" | "production_disabled";
  stableBundleId: string | null;
  rowsActuallyWritten: number;
  idempotentDuplicateDetected: boolean;
  memberRows: number;
  blockedAuditRows: number;
  sourceSnapshotRows: number;
  resolverSnapshotRows: number;
  stateWritesExecuted: false;
  valueObjectWritesExecuted: false;
  activityEventWritesExecuted: false;
  activityValueObjectLinkWritesExecuted: false;
  errors: string[];
  warnings: string[];
};
```

---

## 9. Environment guard policy

The wrapper must centralize environment guard rules.

Minimum future guards:

| Guard | Requirement |
|---|---|
| Production disabled by default | true |
| Sandbox write requires explicit mode | true |
| Service-role only server-side | true |
| Client identity cannot open write gate | true |
| Authenticated user binding required before production | true |
| Direct debug route use forbidden in product flow | true |
| Idempotency required | true |
| Payload hash required | true |
| Post-write verification required | true |

---

## 10. Relationship to C33-K debug routes

Existing C33-K debug routes remain QA tools.

They should not be deleted now because they are useful for regression tests.

Current debug/test routes:

| Route | Purpose |
|---|---|
| `/api/activity/debug/stable-semantic-bundle-explicit-sandbox-write-gate` | explicit sandbox write proof |
| `/api/activity/debug/stable-semantic-bundle-post-write-verification` | post-write read-only verification |
| `/api/activity/debug/stable-semantic-bundle-post-schema-write-gate-readiness` | readiness proof |
| `/api/activity/debug/stable-semantic-bundle-transaction-contract` | transaction contract proof |
| `/api/activity/debug/stable-semantic-bundle-write-gate-dry-run` | dry-run proof |

Future product routes should not directly depend on debug route URLs.

---

## 11. Activity Event linkage remains a separate decision

C33-L.3 does not decide how real Activity Events are linked.

That is reserved for C33-L.4.

Open options:

1. stable bundle references existing Activity Event only;
2. separate Activity Event write gate creates the event first;
3. preview-only stable bundle remains detached;
4. product activity capture orchestrates both through separate services, with separate gates.

Recommended default before C33-L.4:

```text
Existing Activity Event can be referenced.
No Activity Event should be created as side effect of stable bundle persistence.
```

---

## 12. Value Object separation remains mandatory

Stable bundle persistence must not create Value Objects.

Future Value Object creation should be handled by a separate service and a separate user-confirmed decision flow.

Reason:

```text
Stable semantic bundle = semantic evidence / stable category bundle.
Value Object = user/domain value entity requiring separate ownership and intent.
```

The wrapper must preserve this boundary.

---

## 13. C33-L.3 result

C33-L.3 is documentation-only.

Expected result:

```text
C33-L.3 RESULT: INTERNAL_STABLE_BUNDLE_SERVICE_WRAPPER_DESIGN_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

---

## 14. Next recommended step

Proceed to:

```text
C33-L.4 — Activity Event integration decision
```

Purpose of C33-L.4:

1. define whether stable bundle can reference existing Activity Event;
2. define how preview-only/detached stable bundle cases are handled;
3. define where Activity Event creation belongs;
4. prevent stable bundle persistence from silently creating activities;
5. prepare for a future backend service wrapper implementation.

