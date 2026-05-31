# C33-Q.4 — Governance/audit boundary

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-Q — Semantic Review / New Concepts UI contract.

---

## 1. Decision

C33-Q.4 defines the governance/audit boundary for future semantic review actions.

```text
C33-Q.4 RESULT: GOVERNANCE_AUDIT_BOUNDARY_COMMITTED_AND_PUSHED
```

Main decision:

```text
Semantic review actions may become persistent only after a future explicit governance write gate.
C33-Q.4 does not open that gate.
```

This step is documentation-only.

```text
NO ROUTE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO PRODUCTION PERSISTENCE.
```

---

## 2. Current state before C33-Q.4

C33-Q.1 defined what Semantic Review / New Concepts UI may display.

C33-Q.2 created a no-write candidate display skeleton:

```text
POST /api/activity/semantic-review/new-concept-candidates-preview
semantic_review_new_concept_candidates_no_write_v0
```

C33-Q.3 defined future category resolution actions:

```text
approve_candidate
reject_candidate
merge_candidate
request_more_context
defer_candidate
```

All actions remain:

```text
not implemented
not executable
no write route
no DB write
no governance write gate opened
```

---

## 3. Governance write gate remains closed

Future gate name:

```text
EXECUTE C33-Q.GOVERNANCE-WRITE-GATE
```

C33-Q.4 keeps this gate closed.

Before this gate can be opened, the implementation must define:

1. exact database tables and columns;
2. auth/session chain;
3. reviewer permissions;
4. local vs organization vs shared/global scope;
5. provenance model;
6. audit record model;
7. rollback/supersession model;
8. conflict handling;
9. RLS/GRANT posture;
10. idempotency behavior;
11. denial cases;
12. no unintended VO/State/Semantic Capital writes.

---

## 4. Scope boundary

Future governance actions must distinguish these scopes:

```text
local_user
organization
shared_global
external_ontology_reference
```

Important rule:

```text
A local user correction must not silently become a shared/global category.
```

Shared/global changes require explicit authorization, moderation and audit.

---

## 5. Local user scope

Local user scope means:

```text
the correction helps this user only
```

It may later affect:

```text
this user's suggestions
this user's semantic preferences
this user's personal review queue
```

It must not automatically affect:

```text
global category list
organization category list
other users
external ontology mapping
```

---

## 6. Organization scope

Organization scope means:

```text
the correction applies inside a specific organization/workspace/business context
```

It may later require:

```text
organization role check
manager/admin permission
organization-specific audit
organization-specific rollback
```

It must not automatically become shared/global.

---

## 7. Shared/global scope

Shared/global scope means:

```text
the correction can affect shared ontology or public category behavior.
```

It requires the strictest governance.

Required future controls:

```text
moderation
provenance
approval role
rollback/supersession
conflict handling
versioning
abuse prevention
```

C33-Q.4 does not implement shared/global writes.

---

## 8. External ontology reference scope

External ontology reference is not the same as internal category.

Rule:

```text
External concept is not internal category.
```

A future external reference may link to:

```text
Wikidata
DBpedia
schema.org
medical taxonomy
business taxonomy
local custom ontology
```

But C33-Q.4 does not create external mappings.

---

## 9. Future audit event model

A future audit event may conceptually include:

```ts
type SemanticGovernanceAuditEventV0 = {
  auditEventId: string;
  action:
    | "approve_candidate"
    | "reject_candidate"
    | "merge_candidate"
    | "request_more_context"
    | "defer_candidate";
  scope: "local_user" | "organization" | "shared_global" | "external_ontology_reference";
  actorUserId: string;
  organizationId?: string;
  candidateSource: "preview" | "persisted_review_candidate";
  candidateId: string;
  rawTextFragment: string;
  suggestedMeaning: string;
  candidateKind: string;
  targetCategoryId?: string;
  targetExternalConceptId?: string;
  clientRequestId: string;
  createdAt: string;
  provenance: SemanticGovernanceProvenanceV0;
  sideEffects: SemanticGovernanceSideEffectsV0;
};
```

This type is conceptual only.

No audit table is created in C33-Q.4.

---

## 10. Future provenance model

A future provenance record may conceptually include:

```ts
type SemanticGovernanceProvenanceV0 = {
  sourceRoute: string;
  sourceRouteMode: string;
  sourcePreviewRouteMode: string;
  sourceActivityEventId?: string;
  sourceStableBundleId?: string;
  sourceRawText?: string;
  sourceInputLanguage?: string;
  sourceModel?: string;
  sourceRuleVersion?: string;
  sourceCandidateDisplayAdapterVersion?: string;
  sourceReviewDocumentVersion?: string;
};
```

Purpose:

```text
Every category resolution must be traceable to where it came from.
```

---

## 11. Future side-effect model

A future side-effect model must explicitly show what happened:

```ts
type SemanticGovernanceSideEffectsV0 = {
  dbReadExecuted: boolean;
  dbWriteExecuted: boolean;
  activeCategoryCreated: boolean;
  candidateStatusWritten: boolean;
  externalConceptMappingCreated: boolean;
  semanticCapitalWritten: boolean;
  valueObjectCreated: boolean;
  activityValueObjectLinkCreated: boolean;
  stateFactCreated: boolean;
  stateDeltaCreated: boolean;
  stateSnapshotCreated: boolean;
  auditRecorded: boolean;
  rowsActuallyWritten: number;
};
```

For C33-Q.4, expected values remain:

```text
dbReadExecuted = false
dbWriteExecuted = false
activeCategoryCreated = false
candidateStatusWritten = false
externalConceptMappingCreated = false
semanticCapitalWritten = false
valueObjectCreated = false
activityValueObjectLinkCreated = false
stateFactCreated = false
stateDeltaCreated = false
stateSnapshotCreated = false
auditRecorded = false
rowsActuallyWritten = 0
```

---

## 12. Rollback and supersession boundary

Future governance must not silently delete historical semantic decisions.

Recommended future model:

```text
supersede instead of destructive overwrite
deprecate instead of hard delete
append correction/audit event instead of silent mutation
```

Rollback must define:

```text
who can rollback
what records are affected
whether shared/global effects are reversed
how dependent suggestions are recalculated
how old Activity Events / Stable Bundles are treated
```

C33-Q.4 does not implement rollback.

---

## 13. Conflict handling boundary

Future governance must handle conflicts such as:

```text
two users approve different meanings
local user correction conflicts with organization rule
organization rule conflicts with shared/global taxonomy
external ontology reference changes meaning
merge target is deprecated
candidate was already resolved by another action
```

C33-Q.4 does not implement conflict resolution.

---

## 14. Idempotency boundary

Future governance writes must include idempotency.

Recommended concept:

```text
clientRequestId
```

Purpose:

```text
prevent duplicate approvals
prevent duplicate audit events
make retries safe
support double-click protection
```

C33-Q.4 does not implement idempotency.

---

## 15. Required future denial cases

Future governance implementation must deny when:

| Case | Expected result |
|---|---|
| no authenticated session | denied |
| app user not mapped | denied |
| candidate id is not server-resolved | denied |
| action unsupported | denied |
| scope unauthorized | denied |
| shared/global action without moderator permission | denied |
| target category missing for merge | denied |
| target category inaccessible | denied |
| target external concept not verified | denied |
| client sends user_id | denied |
| client sends forceGlobal | denied |
| client requests Value Object creation | denied |
| client requests State writes | denied |
| governance write gate closed | denied |
| idempotency conflict | denied or idempotently resolved |

Every denial must return explicit side-effect flags.

---

## 16. Relationship to Semantic Capital

Semantic Capital may later use governance events as evidence.

But C33-Q.4 keeps this closed:

```text
semanticCapitalWritten = false
```

Semantic Capital belongs to:

```text
C33-W — Analytics / Semantic Capital / Audit
```

---

## 17. Relationship to Value Objects

Semantic governance does not create Value Objects.

Value Object candidate/productization belongs to:

```text
C33-R — Value Object candidate and exposure productization
```

C33-Q.4 must not pre-open that layer.

---

## 18. Relationship to State

Semantic governance does not create State Facts, Deltas or Snapshots.

State persistence belongs to:

```text
C33-S — State hooks safety package
C33-T — State facts/deltas/snapshots MVP
```

C33-Q.4 must not pre-open those layers.

---

## 19. Relationship to Activity Event and Stable Semantic Bundle

Activity Event remains source of truth for activity occurrence.

Stable Semantic Bundle remains semantic evidence.

Semantic governance may later reference them as provenance, but must not rewrite them silently.

Rule:

```text
Governance event is not Activity Event.
Governance event is not Stable Semantic Bundle.
Governance event is audit/provenance around candidate resolution.
```

---

## 20. What C33-Q.4 does not implement

C33-Q.4 does not implement:

- UI components;
- new API routes;
- approve/reject/merge endpoints;
- database reads;
- database writes;
- audit tables;
- category creation;
- category approval;
- external concept mapping;
- Semantic Capital writes;
- Value Object creation;
- State writes;
- auth/session implementation;
- governance workflow;
- rollback workflow.

C33-Q.4 is documentation-only.

---

## 21. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-Q.1 Semantic Review / New Concepts UI boundary.
2. C33-Q.2 New Concept Candidate display skeleton proof.
3. C33-Q.3 Category resolution action contract.
4. C33-P.5 Activity Capture final lock.
5. C33-O.5 product preview final lock.
6. C33-N.2 orchestration skeleton proof.
7. C33-M stable bundle service wrapper proofs.

---

## 22. Recommended next step

Next step:

```text
C33-Q.5 — C33-Q final lock
```

C33-Q.5 should finalize:

```text
Semantic Review UI boundary is defined
New concept candidate display skeleton exists
Category resolution actions are defined but disabled
Governance/audit boundary is defined but closed
No persistence has been opened
```

---

## 23. C33-Q.4 expected result

Expected result:

```text
C33-Q.4 RESULT: GOVERNANCE_AUDIT_BOUNDARY_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

