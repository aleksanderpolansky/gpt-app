# C33-Q.1 — Semantic Review / New Concepts UI boundary

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-Q — Semantic Review / New Concepts UI contract.

---

## 1. Decision

C33-Q begins after C33-P final lock.

```text
C33-Q.1 RESULT: SEMANTIC_REVIEW_NEW_CONCEPTS_UI_BOUNDARY_COMMITTED_AND_PUSHED
```

Main decision:

```text
Semantic Review / New Concepts UI may show unclear meanings, unknown terms, provisional semantic chips and candidate mappings.
It must not create active categories, external concept mappings, Semantic Capital, Value Objects or State records automatically.
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

## 2. Why C33-Q is needed

C33-P made Activity Capture capable of producing a detached semantic preview.

That preview can include:

```text
unknown terms
ambiguous meanings
blocked audit signals
candidate concepts
provisional semantic chips
possible review needs
```

The next missing product capability is a safe user-facing review boundary.

The user must be able to see that something may need review without the system silently changing ontology, categories, Value Objects, State Facts or Semantic Capital.

---

## 3. Current input sources for Semantic Review

C33-Q may use preview output from:

```text
POST /api/activity/capture/detached-semantic-preview
POST /api/activity/semantic-orchestration-preview
```

Current route modes:

```text
activity_capture_detached_preview_no_write_v0
product_semantic_preview_no_write_v0
```

These are preview sources only.

They are not persisted review records.

---

## 4. Semantic Review display boundary

Semantic Review UI may show:

```text
Suggested meaning
Unknown term
Unclear concept
Needs review
Possible category
Possible external concept
Candidate mapping
Review later
```

Russian UI phrases may include:

```text
Предполагаемый смысл
Неизвестный термин
Неясное понятие
Нужна проверка
Возможная категория
Кандидат на сопоставление
Проверить позже
```

All such items are provisional.

Required marker:

```text
This is a review candidate, not an approved category.
```

Russian marker:

```text
Это кандидат на проверку, а не утверждённая категория.
```

---

## 5. What UI may display

Allowed display elements:

- raw text fragment;
- suggested meaning;
- uncertain term;
- suggested category label;
- external concept label;
- confidence or review priority if available;
- source preview route;
- no-write side-effect flags;
- warnings/errors;
- reason why review is needed;
- safe actions that do not write.

Allowed action labels as disabled/future actions:

```text
Approve later
Reject later
Merge later
Ask me later
Request more context
```

If these are displayed now, they must be disabled or marked:

```text
Not implemented in C33-Q.1
```

---

## 6. What UI must not display as truth

The UI must not display candidates as:

```text
approved category
active ontology
confirmed mapping
saved category
global category
state fact
personal history
Semantic Capital
Value Object
```

Forbidden labels:

```text
confirmed
approved
saved
activated
global
official
truth
```

unless a later governance/write gate explicitly implements that state.

---

## 7. No automatic category creation

C33-Q.1 forbids automatic creation of:

```text
active category
global category
local category
business category
state category
role/care/duty category
```

Rationale:

```text
AI output is candidate, not truth.
Category is not State Fact.
External concept is not internal category.
```

---

## 8. No automatic external concept mapping

C33-Q.1 forbids automatic creation of:

```text
external concept mapping
ontology link
Wikidata/DBpedia/other external ontology link
synonym map
translation map
category-source mapping
```

External concept candidates may be displayed only as candidates.

---

## 9. No automatic Semantic Capital writes

C33-Q.1 forbids automatic writes to:

```text
Semantic Capital
user semantic memory
review score
confidence aggregate
learning profile
category trust score
personal ontology profile
```

Semantic Capital belongs to later analytics/governance blocks.

---

## 10. No Value Object or State writes

Semantic Review UI must not create:

```text
Value Object
Activity-to-Value-Object link
State Fact
State Delta
State Snapshot
health state
money state
productivity state
fatigue state
```

State and Value Object writes require separate future gates.

---

## 11. Review candidate status model

Recommended conceptual statuses:

```ts
type SemanticReviewCandidateStatusV0 =
  | "candidate"
  | "needs_user_review"
  | "needs_more_context"
  | "rejected_in_preview"
  | "blocked_from_auto_creation";
```

Not allowed in C33-Q.1:

```ts
"approved"
"active"
"global"
"persisted"
```

These are future governance states.

---

## 12. Review candidate display model

Conceptual safe display shape:

```ts
type SemanticReviewCandidateDisplayV0 = {
  candidateId?: string;
  sourceRoute: string;
  sourceRouteMode: string;
  rawTextFragment: string;
  suggestedMeaning: string;
  candidateStatus: "candidate" | "needs_user_review" | "needs_more_context" | "blocked_from_auto_creation";
  candidateKind: "unknown_term" | "unclear_concept" | "possible_category" | "external_concept_candidate" | "mapping_candidate";
  notApprovedYet: true;
  notSavedYet: true;
  canApproveNow: false;
  canRejectNow: false;
  canMergeNow: false;
  requiresFutureGovernanceGate: true;
  sideEffects: {
    dbReadExecuted: false;
    dbWriteExecuted: false;
    activeCategoryCreated: false;
    externalConceptMappingCreated: false;
    semanticCapitalWritten: false;
    valueObjectCreated: false;
    stateFactCreated: false;
    rowsActuallyWritten: 0;
  };
};
```

C33-Q.1 does not implement this type in code. It defines the boundary.

---

## 13. Unknown term handling

If an unknown term appears, the UI may show:

```text
Unknown term: <term>
Needs review before it becomes a category.
```

Allowed user flow in C33-Q.1:

```text
view only
copy term
edit original activity text
preview again
```

Not allowed:

```text
create category from term
create synonym from term
create external ontology mapping
save term into Semantic Capital
```

---

## 14. Ambiguous meaning handling

If a phrase could mean multiple things, the UI may show:

```text
This may mean A or B.
```

Allowed:

```text
show alternatives
ask for context later
show "needs review"
```

Not allowed:

```text
choose one meaning silently as truth
write the selected meaning into ontology
update state facts from ambiguous meaning
```

---

## 15. Governance boundary

Real approve/reject/merge requires later governance.

Future gate concept:

```text
EXECUTE C33-Q.GOVERNANCE-WRITE-GATE
```

This gate is not opened in C33-Q.1.

Before governance writes, future implementation must define:

1. who can approve;
2. whether approval is local/user-specific or shared/global;
3. audit/correction records;
4. rollback strategy;
5. conflict handling;
6. source provenance;
7. RLS/ownership;
8. moderation rules for shared ontology;
9. separation between external concept and internal category.

---

## 16. Relationship to C33-P

C33-P preview result can show:

```text
This preview is not saved yet.
```

C33-Q review result must similarly show:

```text
This review candidate is not approved yet.
```

C33-P handles activity preview.  
C33-Q handles concept/category/mapping review.

Neither creates source-of-truth records automatically at this point.

---

## 17. Relationship to later blocks

C33-Q prepares for:

```text
C33-R — Value Object candidate and exposure productization
C33-S — State hooks safety package
C33-T — State facts/deltas/snapshots MVP
C33-W — Analytics / Semantic Capital / Audit
C33-X — Review UI / Workspace integration MVP
```

C33-Q must not pre-open those layers.

---

## 18. What C33-Q.1 does not implement

C33-Q.1 does not implement:

- UI components;
- new API routes;
- database reads;
- database writes;
- category creation;
- category approval;
- external concept mapping;
- Semantic Capital writes;
- Value Object creation;
- State writes;
- governance workflow;
- audit table writes;
- auth/session checks.

C33-Q.1 is documentation-only.

---

## 19. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-P.2 detached preview skeleton proof.
2. C33-P.3 preview display contract.
3. C33-P.4 save/confirm boundary.
4. C33-P.5 final lock.
5. C33-O.5 product preview final lock.
6. C33-N.2 orchestration skeleton proof.
7. C33-M stable bundle service wrapper proofs.

---

## 20. Recommended next step

Next step:

```text
C33-Q.2 — New concept candidate display skeleton
```

C33-Q.2 may create a no-write display/route/component skeleton if approved.

C33-Q.2 must still keep:

```text
no DB write
no active category creation
no external concept mapping
no Semantic Capital writes
no Value Object writes
no State writes
```

---

## 21. C33-Q.1 expected result

Expected result:

```text
C33-Q.1 RESULT: SEMANTIC_REVIEW_NEW_CONCEPTS_UI_BOUNDARY_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

