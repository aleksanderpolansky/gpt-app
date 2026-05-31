# C33-R.1 — Value Object candidate boundary

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-R — Value Object candidate and exposure productization.

---

## 1. Decision

C33-R begins after C33-Q final lock.

```text
C33-R.1 RESULT: VALUE_OBJECT_CANDIDATE_BOUNDARY_COMMITTED_AND_PUSHED
```

Main decision:

```text
The system may show possible Value Object candidates derived from activity/semantic review context.
It must not create Value Objects or Activity-to-Value-Object links automatically.
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

## 2. Why C33-R is needed

C33-P can produce detached Activity Capture previews.

C33-Q can show Semantic Review / New Concepts candidates.

The next missing product capability is to show possible Value Objects without creating them automatically.

Examples:

```text
"studied math with child" may suggest:
- learning activity;
- math support;
- childcare / parental care;
- family duty;
- child education support.
```

But these are candidates only.

The platform must not silently create:

```text
personal Value Object
organization Value Object
commercial Value Object
offer base
certificate base
activity-to-VO link
```

---

## 3. Current input sources for Value Object candidate display

C33-R may later use outputs from:

```text
POST /api/activity/capture/detached-semantic-preview
POST /api/activity/semantic-review/new-concept-candidates-preview
POST /api/activity/semantic-orchestration-preview
```

Current route modes:

```text
activity_capture_detached_preview_no_write_v0
semantic_review_new_concept_candidates_no_write_v0
product_semantic_preview_no_write_v0
```

These are preview sources only.

They are not persisted Value Object candidate records.

---

## 4. Value Object candidate display boundary

The UI may show:

```text
Possible Value Object
Value Object candidate
Possible personal value target
Possible organization asset/process
Possible commercial product/service base
Possible offer/certificate base later
```

Russian UI phrases may include:

```text
Возможный ценный объект
Кандидат в ценные объекты
Возможная личная ценность
Возможный объект предприятия
Возможная основа товара/услуги
Возможная основа оффера/сертификата позже
```

Required marker:

```text
This is a Value Object candidate, not a created Value Object.
```

Russian marker:

```text
Это кандидат в ценные объекты, а не созданный ценный объект.
```

---

## 5. What UI may display

Allowed display elements:

- source activity text;
- suggested Value Object title;
- candidate type;
- candidate scope;
- suggested relation to activity;
- suggested category/semantic chips;
- source preview route;
- no-write side-effect flags;
- warnings/errors;
- reason why the candidate may be useful;
- disabled/future actions.

Allowed disabled/future action labels:

```text
Create later
Link later
Expose later
Use as offer base later
Use as personal target later
```

If displayed now, these must be disabled or marked:

```text
Not implemented in C33-R.1
Requires future Value Object write gate
```

---

## 6. What UI must not display as truth

The UI must not display candidates as:

```text
created Value Object
active Value Object
saved Value Object
commercial product
published offer
certificate base
activity-linked object
state object
Semantic Capital item
```

Forbidden labels unless later gate implements them:

```text
created
active
saved
published
commercialized
linked
confirmed
approved
```

---

## 7. No automatic Value Object creation

C33-R.1 forbids automatic creation of:

```text
Value Object
personal Value Object
organization Value Object
commercial Value Object
offer base
certificate base
exercise object
learning object
business process object
family/care object
```

Rationale:

```text
AI output is candidate, not truth.
Value Object is a first-class product/analytics entity.
Creating it changes future analytics and product behavior.
```

---

## 8. No automatic Activity-to-Value-Object link

C33-R.1 forbids automatic creation of:

```text
activity_value_object_link
activity-to-VO link
source activity relation
creates/uses/redeems/related_to/result_of link
```

A future link must be explicit, auditable and reversible.

---

## 9. Personal / organization / commercial candidate boundary

Future Value Object candidates must distinguish these scopes:

```text
personal_candidate
organization_candidate
commercial_candidate
```

### personal_candidate

A personal candidate may later support:

```text
personal goals
health/learning/time/money tracking
private analytics
personal next best action
```

It must not become public/commercial automatically.

### organization_candidate

An organization candidate may later support:

```text
organization internal process
service/product description
team knowledge
business optimization
```

It must require organization context and permissions.

### commercial_candidate

A commercial candidate may later support:

```text
offer
certificate
catalog item
public directory object
marketplace exposure
```

It must require enterprise/organization context and publication governance.

---

## 10. No personal-to-commercial silent conversion

Rule:

```text
A personal Value Object candidate must not silently become an organization/commercial Value Object.
```

If a user wants a commercial Value Object, the future system must create a separate organization-context object, not mutate private personal history into public commercial content.

---

## 11. Candidate status model

Recommended conceptual statuses:

```ts
type ValueObjectCandidateStatusV0 =
  | "candidate"
  | "needs_user_review"
  | "needs_organization_context"
  | "needs_commercial_context"
  | "blocked_from_auto_creation";
```

Not allowed in C33-R.1:

```ts
"created"
"active"
"published"
"commercialized"
"linked"
```

These are future persistence/product states.

---

## 12. Candidate display model

Conceptual safe display shape:

```ts
type ValueObjectCandidateDisplayV0 = {
  candidateId?: string;
  sourceRoute: string;
  sourceRouteMode: string;
  sourceActivityText: string;
  suggestedTitle: string;
  candidateStatus:
    | "candidate"
    | "needs_user_review"
    | "needs_organization_context"
    | "needs_commercial_context"
    | "blocked_from_auto_creation";
  candidateScope:
    | "personal_candidate"
    | "organization_candidate"
    | "commercial_candidate";
  candidateKind:
    | "activity_target"
    | "care_function"
    | "learning_object"
    | "business_process"
    | "product_or_service_base"
    | "offer_or_certificate_base";
  notCreatedYet: true;
  notLinkedYet: true;
  notPublishedYet: true;
  canCreateNow: false;
  canLinkNow: false;
  canExposeNow: false;
  requiresFutureValueObjectGate: true;
  sideEffects: {
    dbReadExecuted: false;
    dbWriteExecuted: false;
    valueObjectCreated: false;
    activityValueObjectLinkCreated: false;
    offerCreated: false;
    certificateBaseCreated: false;
    activeCategoryCreated: false;
    externalConceptMappingCreated: false;
    semanticCapitalWritten: false;
    stateFactCreated: false;
    rowsActuallyWritten: 0;
  };
};
```

C33-R.1 does not implement this type in code. It defines the boundary.

---

## 13. Activity interpretation examples

Example activity:

```text
studied math with child for 30 minutes
```

Possible Value Object candidates:

```text
Math learning support
Child education support
Parental care / childcare
Family duty
Learning session
```

But C33-R.1 requires:

```text
notCreatedYet = true
notLinkedYet = true
canCreateNow = false
requiresFutureValueObjectGate = true
```

---

## 14. Relationship to offers and certificates

Commercial Value Object may later become base for:

```text
offer
certificate
bookable service
discount certificate
product/service directory item
```

But C33-R.1 does not create or expose these.

Commercial/public exposure belongs to later steps in C33-R and commercial core phases.

---

## 15. Relationship to Semantic Review

C33-Q candidates can help explain why a Value Object candidate exists.

But:

```text
Semantic Review candidate is not Value Object.
Value Object candidate is not active category.
External concept candidate is not internal Value Object.
```

The system must keep these layers separate.

---

## 16. Relationship to Activity Event

Activity Event remains source of truth for activity occurrence.

A Value Object candidate may be derived from activity interpretation, but it is not the activity occurrence.

Rule:

```text
Value Object candidate is not Activity Event.
Value Object candidate is not Stable Semantic Bundle.
```

---

## 17. Relationship to State and Semantic Capital

Value Object candidates must not create:

```text
State Fact
State Delta
State Snapshot
Semantic Capital
health conclusion
money conclusion
productivity conclusion
```

These belong to later blocks:

```text
C33-S — State hooks safety package
C33-T — State facts/deltas/snapshots MVP
C33-W — Analytics / Semantic Capital / Audit
```

---

## 18. Future Value Object write gate

Future gate concept:

```text
EXECUTE C33-R.VALUE-OBJECT-WRITE-GATE
```

This gate is not opened in C33-R.1.

Before any Value Object write, future implementation must define:

1. exact database tables and columns;
2. personal vs organization vs commercial scope;
3. ownership and Auth0 session chain;
4. creation permissions;
5. duplicate detection;
6. idempotency;
7. audit/provenance;
8. rollback/supersession;
9. link policy to Activity Event and Stable Bundle;
10. no unintended category/state/Semantic Capital writes.

---

## 19. Required future denial cases

Future Value Object creation/linking must deny when:

| Case | Expected result |
|---|---|
| no authenticated session | denied |
| app user not mapped | denied |
| organization context missing for organization/commercial candidate | denied |
| user lacks organization permission | denied |
| candidate id is client-only preview id | denied or converted through server-side candidate creation gate |
| target Activity Event inaccessible | denied |
| client sends user_id | denied |
| client sends forceCommercial | denied |
| client requests State writes | denied |
| client requests Semantic Capital writes | denied |
| Value Object write gate is closed | denied |
| idempotency conflict | denied or idempotently resolved |

Every denial must return explicit side-effect flags.

---

## 20. What C33-R.1 does not implement

C33-R.1 does not implement:

- UI components;
- new API routes;
- database reads;
- database writes;
- Value Object creation;
- Activity-to-Value-Object linking;
- offer creation;
- certificate base creation;
- publication/exposure;
- auth/session checks;
- organization permission checks;
- Semantic Capital writes;
- State writes;
- audit table writes.

C33-R.1 is documentation-only.

---

## 21. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-Q.2 New Concept Candidate display skeleton proof.
2. C33-Q.5 Semantic Review final lock.
3. C33-P.5 Activity Capture final lock.
4. C33-O.5 product preview final lock.
5. C33-N.2 orchestration skeleton proof.
6. C33-M stable bundle service wrapper proofs.

---

## 22. Recommended next step

Next step:

```text
C33-R.2 — Value Object candidate display skeleton
```

C33-R.2 may create a no-write display/route/component skeleton if approved.

C33-R.2 must still keep:

```text
no DB write
no Value Object creation
no Activity-to-Value-Object link creation
no offer/certificate base creation
no Semantic Capital writes
no State writes
```

---

## 23. C33-R.1 expected result

Expected result:

```text
C33-R.1 RESULT: VALUE_OBJECT_CANDIDATE_BOUNDARY_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

