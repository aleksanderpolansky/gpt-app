# C33-Q.5 — Semantic Review / New Concepts final lock

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-Q — Semantic Review / New Concepts UI contract.

---

## 1. Final decision

C33-Q is complete as a no-write Semantic Review / New Concepts UI contract block.

```text
C33-Q RESULT: SEMANTIC_REVIEW_NEW_CONCEPTS_UI_CONTRACT_BLOCK_COMPLETE
```

C33-Q does not open governance persistence.

```text
GOVERNANCE WRITE GATE REMAINS CLOSED.
CATEGORY RESOLUTION WRITE ACTIONS REMAIN CLOSED.
ACTIVE CATEGORY CREATION REMAINS CLOSED.
EXTERNAL CONCEPT MAPPING CREATION REMAINS CLOSED.
SEMANTIC CAPITAL WRITES REMAIN CLOSED.
VALUE OBJECT CREATION REMAINS CLOSED.
STATE FACT/DELTA/SNAPSHOT CREATION REMAINS CLOSED.
AUDIT TABLE WRITES REMAIN CLOSED.
```

---

## 2. What C33-Q added

### C33-Q.1 — Semantic Review / New Concepts UI boundary

Created:

```text
docs/activity/c33-q1-semantic-review-new-concepts-ui-boundary.md
```

Locked decision:

```text
Semantic Review / New Concepts UI may show unclear meanings, unknown terms, provisional semantic chips and candidate mappings.
It must not create active categories, external concept mappings, Semantic Capital, Value Objects or State records automatically.
```

Result:

```text
C33-Q.1 RESULT: SEMANTIC_REVIEW_NEW_CONCEPTS_UI_BOUNDARY_COMMITTED_AND_PUSHED
```

### C33-Q.2 — New concept candidate display skeleton

Created:

```text
lib/activity/semanticReview/newConceptCandidateDisplayAdapterV0.ts
src/app/api/activity/semantic-review/new-concept-candidates-preview/route.ts
```

Active no-write route:

```text
POST /api/activity/semantic-review/new-concept-candidates-preview
semantic_review_new_concept_candidates_no_write_v0
```

Locked behavior:

```text
known/simple preview can return zero candidates
unknown/unclear preview can return provisional candidates
candidates remain not approved
candidates remain not saved
approve/reject/merge are disabled
future governance gate is required
```

Result:

```text
C33-Q.2 RESULT: NEW_CONCEPT_CANDIDATE_DISPLAY_SKELETON_COMMITTED_AND_PUSHED
```

### C33-Q.3 — Category resolution action contract

Created:

```text
docs/activity/c33-q3-category-resolution-action-contract.md
```

Defined future action names:

```text
approve_candidate
reject_candidate
merge_candidate
request_more_context
defer_candidate
```

Locked decision:

```text
These are future governance actions only.
They are not implemented as write actions in C33-Q.3.
```

Result:

```text
C33-Q.3 RESULT: CATEGORY_RESOLUTION_ACTION_CONTRACT_COMMITTED_AND_PUSHED
```

### C33-Q.4 — Governance/audit boundary

Created:

```text
docs/activity/c33-q4-governance-audit-boundary.md
```

Locked governance boundary:

```text
Semantic review actions may become persistent only after a future explicit governance write gate.
C33-Q.4 does not open that gate.
```

Future gate:

```text
EXECUTE C33-Q.GOVERNANCE-WRITE-GATE
```

Result:

```text
C33-Q.4 RESULT: GOVERNANCE_AUDIT_BOUNDARY_COMMITTED_AND_PUSHED
```

---

## 3. Active Semantic Review endpoint after C33-Q

Active endpoint:

```text
POST /api/activity/semantic-review/new-concept-candidates-preview
```

Current class:

```text
Semantic Review new concept candidate display skeleton
```

Current route mode:

```text
semantic_review_new_concept_candidates_no_write_v0
```

Allowed now:

```text
display provisional review candidates
show unknown term / unclear concept signals
show notApprovedYet marker
show notSavedYet marker
show disabled/future governance actions
show no-write side-effect flags
```

Rejected or not available now:

```text
approve candidate
reject candidate
merge candidate
create active category
create external concept mapping
write Semantic Capital
create Value Object
create State Fact/Delta/Snapshot
write audit event
```

---

## 4. User-facing status after C33-Q

The user can be shown:

```text
Это кандидат на проверку, а не утверждённая категория.
```

Meaning:

```text
The system can show provisional candidates for unclear terms or meanings.
The candidate is not approved.
The candidate is not saved.
The candidate did not change ontology, category lists, Semantic Capital, Value Objects or State.
```

---

## 5. What remains closed after C33-Q

Still closed:

```text
Governance write gate
Approve candidate
Reject candidate
Merge candidate
Persist candidate status
Create active category
Create local user category
Create organization category
Create shared/global category
Create external concept mapping
Write Semantic Capital
Create Value Object
Create Activity-to-Value-Object link
Create State Fact
Create State Delta
Create State Snapshot
Write audit event
Read/write review queues
Auth/session implementation for governance flow
```

---

## 6. Invariants locked by C33-Q

The following are locked:

1. Review candidate is not approved category.
2. Review candidate is not saved ontology item.
3. AI output is candidate, not truth.
4. External concept is not internal category.
5. Category is not State Fact.
6. Local user correction must not silently become shared/global category.
7. Governance event is not Activity Event.
8. Governance event is not Stable Semantic Bundle.
9. Semantic Review display must not imply persistence.
10. Category resolution requires a future explicit governance write gate.

---

## 7. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-Q.1 Semantic Review / New Concepts UI boundary.
2. C33-Q.2 New Concept Candidate display skeleton proof.
3. C33-Q.3 Category resolution action contract.
4. C33-Q.4 Governance/audit boundary.
5. C33-P.5 Activity Capture final lock.
6. C33-O.5 product preview final lock.
7. C33-N.2 orchestration skeleton proof.
8. C33-M stable bundle service wrapper proofs.
9. C33-K sandbox persistence proof.

---

## 8. Recommended next block

Recommended next block according to Roadmap v2:

```text
C33-R — Value Object candidate and exposure productization
```

Rationale:

```text
C33-Q can show semantic review candidates without writing governance.
The next missing product capability is how semantic/activity interpretation can expose possible Value Object candidates without automatically creating Value Objects.
```

C33-R should remain contract/planning first unless separately approved.

---

## 9. Suggested C33-R sequence

### C33-R.1 — Value Object candidate boundary

Define what may be shown as a Value Object candidate and what must not be created automatically.

### C33-R.2 — Value Object candidate display skeleton

Create no-write display/route/component skeleton if approved.

### C33-R.3 — Exposure/productization action contract

Define future actions such as expose/create/link/suggest without opening writes.

### C33-R.4 — Commercial/personal VO governance boundary

Define how personal, organization and commercial Value Object candidates differ.

### C33-R.5 — C33-R final lock

Finalize Value Object candidate readiness for later productization.

---

## 10. C33-Q.5 expected result

Expected result:

```text
C33-Q.5 RESULT: SEMANTIC_REVIEW_NEW_CONCEPTS_FINAL_LOCK_COMMITTED_AND_PUSHED
C33-Q RESULT: SEMANTIC_REVIEW_NEW_CONCEPTS_UI_CONTRACT_BLOCK_COMPLETE
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime production behavior change.

