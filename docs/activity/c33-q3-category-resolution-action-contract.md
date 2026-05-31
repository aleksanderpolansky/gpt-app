# C33-Q.3 — Category resolution action contract

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-Q — Semantic Review / New Concepts UI contract.

---

## 1. Decision

C33-Q.3 defines the category resolution action contract for review candidates.

```text
C33-Q.3 RESULT: CATEGORY_RESOLUTION_ACTION_CONTRACT_COMMITTED_AND_PUSHED
```

Main decision:

```text
Approve, reject, merge and request-more-info are defined as future governance actions.
They are not implemented as write actions in C33-Q.3.
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

## 2. Current state before C33-Q.3

C33-Q.1 defined the Semantic Review / New Concepts UI boundary.

C33-Q.2 created a no-write candidate display skeleton:

```text
lib/activity/semanticReview/newConceptCandidateDisplayAdapterV0.ts
src/app/api/activity/semantic-review/new-concept-candidates-preview/route.ts
```

Current route:

```text
POST /api/activity/semantic-review/new-concept-candidates-preview
```

Current route mode:

```text
semantic_review_new_concept_candidates_no_write_v0
```

The route may display review candidates, but candidates remain:

```text
notApprovedYet = true
notSavedYet = true
canApproveNow = false
canRejectNow = false
canMergeNow = false
requiresFutureGovernanceGate = true
```

---

## 3. Resolution actions defined by C33-Q.3

C33-Q.3 defines these future action names:

```text
approve_candidate
reject_candidate
merge_candidate
request_more_context
defer_candidate
```

All are contract-level only in C33-Q.3.

Current status:

```text
not implemented
not executable
no write route
no DB write
no governance write gate opened
```

---

## 4. Action: approve_candidate

Conceptual meaning:

```text
User or authorized reviewer accepts a candidate as a valid local or shared category/mapping proposal.
```

Not allowed in C33-Q.3:

```text
create active category
mark candidate approved
create global ontology item
create external concept mapping
write Semantic Capital
create Value Object
create State Fact/Delta/Snapshot
```

Future approve requires:

```text
EXECUTE C33-Q.GOVERNANCE-WRITE-GATE
```

and a separate implementation plan.

---

## 5. Action: reject_candidate

Conceptual meaning:

```text
User or authorized reviewer rejects candidate as incorrect, irrelevant or too ambiguous.
```

Not allowed in C33-Q.3:

```text
write rejection record
update candidate status in DB
reduce Semantic Capital score
create negative ontology rule
auto-ban term globally
```

Future rejection must be audit-safe and reversible where appropriate.

---

## 6. Action: merge_candidate

Conceptual meaning:

```text
User or authorized reviewer proposes that candidate A should be merged with existing category/concept B.
```

Not allowed in C33-Q.3:

```text
merge categories
rewrite ontology
create synonym map
create external concept mapping
change historical Activity Events
change historical Stable Semantic Bundles
```

Future merge must define:

```text
source candidate
target category/concept
scope local/shared/global
conflict handling
audit trail
rollback plan
```

---

## 7. Action: request_more_context

Conceptual meaning:

```text
System asks the user for more context before resolving the candidate.
```

Allowed now as UI idea:

```text
show disabled button
show explanatory text
copy suggested question
```

Not allowed now:

```text
save question
open task
create reminder
write user profile
write Semantic Capital
```

---

## 8. Action: defer_candidate

Conceptual meaning:

```text
Candidate remains visible as something to review later.
```

Allowed now as UI idea:

```text
display "review later" label
```

Not allowed now:

```text
persist deferred status
create review queue item
create notification
write audit record
```

---

## 9. Local vs shared/global boundary

Future resolution must distinguish:

```text
local/user-specific resolution
organization-specific resolution
shared/public ontology resolution
external ontology mapping
```

C33-Q.3 does not implement any of these states.

Important rule:

```text
A local user correction must not silently become a shared/global category.
```

Shared/global ontology changes require separate governance, provenance, moderation and rollback logic.

---

## 10. Candidate identity boundary

C33-Q.2 candidates are preview candidates.

They may have temporary display ids like:

```text
preview-candidate-1
```

These ids are not durable database ids.

C33-Q.3 rule:

```text
Client-provided candidateId is not trusted for writes.
```

Future write implementation must resolve any persisted candidate server-side.

---

## 11. Future conceptual request shape

A future action request may look conceptually like:

```ts
type CategoryResolutionActionRequestV0 = {
  action:
    | "approve_candidate"
    | "reject_candidate"
    | "merge_candidate"
    | "request_more_context"
    | "defer_candidate";
  candidateId: string;
  candidateSource: "preview" | "persisted_review_candidate";
  scope: "local_user" | "organization" | "shared_global";
  userComment?: string;
  targetCategoryId?: string;
  clientRequestId: string;
};
```

This type is conceptual only.

Forbidden client fields:

```text
user_id
authenticatedUserId
owner_user_id
organization_owner_id
serviceRole
forceApprove
forceGlobal
productionWriteEnabled
allowCategoryCreation
allowExternalConceptMapping
allowSemanticCapitalWrite
allowValueObjectCreation
allowStateWrites
```

---

## 12. Future conceptual response shape

A future action response may look conceptually like:

```ts
type CategoryResolutionActionResponseV0 = {
  ok: boolean;
  actionAccepted: boolean;
  actionPersisted: boolean;
  candidateResolved: boolean;
  activeCategoryCreated: boolean;
  externalConceptMappingCreated: boolean;
  semanticCapitalWritten: boolean;
  valueObjectCreated: boolean;
  stateFactCreated: boolean;
  auditRecorded: boolean;
  rowsActuallyWritten: number;
  errors: string[];
  warnings: string[];
};
```

For C33-Q.3, all action response values are conceptual only.

---

## 13. Required future denial cases

Future action implementation must deny when:

| Case | Expected result |
|---|---|
| no authenticated session | denied |
| app user not mapped | denied |
| candidateId is client-only preview id | denied or converted through server-side candidate creation gate |
| action is unsupported | denied |
| scope is shared_global without authorization | denied |
| targetCategoryId missing for merge | denied |
| targetCategoryId inaccessible | denied |
| client sends user_id | denied |
| client sends forceGlobal | denied |
| client requests State writes | denied |
| governance write gate is closed | denied |
| idempotency conflict | denied or idempotently resolved |

Every denial must explicitly return side-effect flags.

---

## 14. Required no-write side-effect flags for C33-Q.3

C33-Q.3 keeps these expected values:

```text
dbReadExecuted = false
dbWriteExecuted = false
activeCategoryCreated = false
externalConceptMappingCreated = false
semanticCapitalWritten = false
valueObjectCreated = false
activityValueObjectLinkCreated = false
stateFactCreated = false
stateDeltaCreated = false
stateSnapshotCreated = false
rowsActuallyWritten = 0
```

---

## 15. User-facing action labels

Allowed disabled/future labels:

```text
Approve later
Reject later
Merge later
Ask me later
Request more context
Defer
```

Russian labels:

```text
Утвердить позже
Отклонить позже
Объединить позже
Спросить меня позже
Запросить контекст
Отложить
```

Required marker:

```text
Resolution actions require a future governance gate.
```

Russian marker:

```text
Действия по разрешению кандидата требуют будущего governance gate.
```

---

## 16. Relationship to Value Objects

Category resolution does not create Value Objects.

Future Value Object candidate/productization belongs to:

```text
C33-R — Value Object candidate and exposure productization
```

C33-Q.3 must not pre-open that layer.

---

## 17. Relationship to State

Category resolution does not create State Facts, Deltas or Snapshots.

State persistence belongs to:

```text
C33-S — State hooks safety package
C33-T — State facts/deltas/snapshots MVP
```

C33-Q.3 must not pre-open those layers.

---

## 18. Relationship to Semantic Capital

Category resolution may later inform Semantic Capital, but C33-Q.3 does not write it.

Semantic Capital / analytics / audit belongs to:

```text
C33-W — Analytics / Semantic Capital / Audit
```

---

## 19. Relationship to C33-Q.4

C33-Q.4 must define governance/audit boundary before any resolution action can become persistent.

C33-Q.4 should answer:

- who can approve/reject/merge;
- what is local vs organization vs shared/global;
- where audit records would live;
- how rollback works;
- how source provenance is stored;
- how external concept mapping differs from internal category;
- how moderation works for shared ontology;
- what remains no-write.

---

## 20. What C33-Q.3 does not implement

C33-Q.3 does not implement:

- UI components;
- new API routes;
- approve/reject/merge endpoints;
- database reads;
- database writes;
- category creation;
- category approval;
- external concept mapping;
- Semantic Capital writes;
- Value Object creation;
- State writes;
- auth/session implementation;
- governance workflow;
- audit table writes.

C33-Q.3 is documentation-only.

---

## 21. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-Q.1 Semantic Review / New Concepts UI boundary.
2. C33-Q.2 New Concept Candidate display skeleton proof.
3. C33-P.5 Activity Capture final lock.
4. C33-O.5 product preview final lock.
5. C33-N.2 orchestration skeleton proof.
6. C33-M stable bundle service wrapper proofs.

---

## 22. Recommended next step

Next step:

```text
C33-Q.4 — Governance/audit boundary
```

C33-Q.4 should remain no-write unless the user explicitly approves a separate governance write gate.

---

## 23. C33-Q.3 expected result

Expected result:

```text
C33-Q.3 RESULT: CATEGORY_RESOLUTION_ACTION_CONTRACT_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

