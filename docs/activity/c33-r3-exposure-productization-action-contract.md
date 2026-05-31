# C33-R.3 — Exposure/productization action contract

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-R — Value Object candidate and exposure productization.

---

## 1. Decision

C33-R.3 defines future exposure/productization actions for Value Object candidates.

```text
C33-R.3 RESULT: EXPOSURE_PRODUCTIZATION_ACTION_CONTRACT_COMMITTED_AND_PUSHED
```

Main decision:

```text
Create, link, expose, productize, use-as-offer-base and use-as-certificate-base are future actions.
They are not implemented as write actions in C33-R.3.
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

## 2. Current state before C33-R.3

C33-R.1 defined the Value Object candidate boundary.

C33-R.2 created a no-write Value Object candidate display skeleton:

```text
lib/activity/valueObjects/valueObjectCandidateDisplayAdapterV0.ts
src/app/api/activity/value-objects/candidates-preview/route.ts
```

Current route:

```text
POST /api/activity/value-objects/candidates-preview
```

Current route mode:

```text
value_object_candidates_preview_no_write_v0
```

The route may display Value Object candidates, but candidates remain:

```text
notCreatedYet = true
notLinkedYet = true
notPublishedYet = true
canCreateNow = false
canLinkNow = false
canExposeNow = false
requiresFutureValueObjectGate = true
```

---

## 3. Future actions defined by C33-R.3

C33-R.3 defines these future action names:

```text
create_value_object
link_to_activity_event
expose_personal
expose_organization
expose_commercial
use_as_offer_base
use_as_certificate_base
publish_to_directory
defer_value_object_candidate
reject_value_object_candidate
```

All are contract-level only in C33-R.3.

Current status:

```text
not implemented
not executable
no write route
no DB write
no Value Object write gate opened
no exposure/productization write gate opened
```

---

## 4. Action: create_value_object

Conceptual meaning:

```text
Create a real Value Object from a reviewed candidate.
```

Not allowed in C33-R.3:

```text
insert value_objects row
create personal Value Object
create organization Value Object
create commercial Value Object
mark candidate created
write audit event
write Semantic Capital
write State Fact/Delta/Snapshot
```

Future creation requires:

```text
EXECUTE C33-R.VALUE-OBJECT-WRITE-GATE
```

and a separate implementation plan.

---

## 5. Action: link_to_activity_event

Conceptual meaning:

```text
Link an existing or newly-created Value Object to an Activity Event.
```

Not allowed in C33-R.3:

```text
create activity_value_object_links row
attach candidate to Activity Event
rewrite Activity Event
rewrite Stable Semantic Bundle
create result_of / related_to / creates / uses link
```

Future link must be explicit, auditable and reversible.

---

## 6. Action: expose_personal

Conceptual meaning:

```text
Expose a Value Object candidate inside a private personal workspace.
```

Not allowed in C33-R.3:

```text
create personal dashboard item
write personal ontology/profile
write Semantic Capital
create personal analytics target
create state tracking object
```

Personal exposure remains future.

---

## 7. Action: expose_organization

Conceptual meaning:

```text
Expose a Value Object candidate inside an organization/workspace context.
```

Not allowed in C33-R.3:

```text
create organization Value Object
create organization process object
create organization catalog item
write organization governance/audit
grant team visibility
```

Organization exposure requires future permission checks.

---

## 8. Action: expose_commercial

Conceptual meaning:

```text
Prepare a Value Object for commercial use, such as catalog, marketplace, offer or certificate logic.
```

Not allowed in C33-R.3:

```text
create commercial Value Object
publish public listing
create directory item
create offer
create certificate base
create price/terms
create booking service
```

Commercial exposure requires organization context and future publication governance.

---

## 9. Action: use_as_offer_base

Conceptual meaning:

```text
Use a commercial Value Object as the semantic/commercial base for an offer.
```

Not allowed in C33-R.3:

```text
create offer
create offer draft
create price terms
create discount terms
create booking mode
create marketplace exposure
```

This belongs to later commercial/product phases.

---

## 10. Action: use_as_certificate_base

Conceptual meaning:

```text
Use a commercial Value Object as the base for a certificate.
```

Not allowed in C33-R.3:

```text
create certificate
create certificate template
create certificate payment values
create QR/token
reserve points
burn points
```

Certificate mechanics are outside C33-R.3.

---

## 11. Action: publish_to_directory

Conceptual meaning:

```text
Make a commercial Value Object visible in a directory/public catalog context.
```

Not allowed in C33-R.3:

```text
publish directory listing
set visibility public
create SEO/public slug
create geo/category exposure
create public commercial page
```

Directory publication requires later publication governance and organization permission checks.

---

## 12. Action: defer/reject candidate

Conceptual meaning:

```text
Candidate can be deferred or rejected later.
```

Not allowed in C33-R.3:

```text
persist deferred status
persist rejected status
write audit event
write negative preference
write Semantic Capital
```

---

## 13. Personal / organization / commercial boundary

Future actions must distinguish:

```text
personal_candidate
organization_candidate
commercial_candidate
```

Rule:

```text
A personal Value Object candidate must not silently become an organization/commercial Value Object.
```

Commercial/product exposure must be created separately in organization context.

---

## 14. Future conceptual request shape

A future action request may look conceptually like:

```ts
type ValueObjectExposureActionRequestV0 = {
  action:
    | "create_value_object"
    | "link_to_activity_event"
    | "expose_personal"
    | "expose_organization"
    | "expose_commercial"
    | "use_as_offer_base"
    | "use_as_certificate_base"
    | "publish_to_directory"
    | "defer_value_object_candidate"
    | "reject_value_object_candidate";
  candidateId: string;
  candidateSource: "preview" | "persisted_value_object_candidate";
  scope: "personal_user" | "organization" | "commercial";
  organizationId?: string;
  targetActivityEventId?: string;
  targetValueObjectId?: string;
  userComment?: string;
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
forceCreate
forceCommercial
forcePublish
productionWriteEnabled
allowValueObjectCreation
allowActivityValueObjectLinkCreation
allowOfferCreation
allowCertificateCreation
allowSemanticCapitalWrite
allowStateWrites
```

Server must resolve identity and permissions.

---

## 15. Future conceptual response shape

A future action response may look conceptually like:

```ts
type ValueObjectExposureActionResponseV0 = {
  ok: boolean;
  actionAccepted: boolean;
  actionPersisted: boolean;
  valueObjectCreated: boolean;
  valueObjectId: string | null;
  activityValueObjectLinkCreated: boolean;
  activityValueObjectLinkId: string | null;
  exposedPersonal: boolean;
  exposedOrganization: boolean;
  exposedCommercial: boolean;
  offerCreated: boolean;
  certificateBaseCreated: boolean;
  directoryPublished: boolean;
  semanticCapitalWritten: boolean;
  stateFactCreated: boolean;
  auditRecorded: boolean;
  rowsActuallyWritten: number;
  errors: string[];
  warnings: string[];
};
```

For C33-R.3, all action response values are conceptual only.

---

## 16. Required no-write side-effect flags for C33-R.3

C33-R.3 keeps these expected values:

```text
dbReadExecuted = false
dbWriteExecuted = false
valueObjectCreated = false
activityValueObjectLinkCreated = false
offerCreated = false
certificateBaseCreated = false
directoryPublished = false
semanticCapitalWritten = false
stateFactCreated = false
stateDeltaCreated = false
stateSnapshotCreated = false
auditRecorded = false
rowsActuallyWritten = 0
```

---

## 17. User-facing action labels

Allowed disabled/future labels:

```text
Create later
Link later
Expose later
Use as offer base later
Use as certificate base later
Publish later
Reject later
Defer
```

Russian labels:

```text
Создать позже
Связать позже
Показать/использовать позже
Использовать как основу оффера позже
Использовать как основу сертификата позже
Опубликовать позже
Отклонить позже
Отложить
```

Required marker:

```text
Value Object actions require a future Value Object write gate.
```

Russian marker:

```text
Действия с ценным объектом требуют будущего Value Object write gate.
```

---

## 18. Relationship to Activity Event

Activity Event remains the source of truth for activity occurrence.

Value Object action must not rewrite Activity Event.

Future link action may reference Activity Event only after:

```text
server-side ownership/access check
explicit user confirmation
write gate opened
audit policy defined
```

---

## 19. Relationship to Stable Semantic Bundle

Stable Semantic Bundle remains semantic evidence.

Value Object action must not rewrite Stable Semantic Bundle.

Future action may reference Stable Semantic Bundle as provenance only.

---

## 20. Relationship to Semantic Review

Semantic Review candidate is not Value Object.

Value Object candidate may be supported by semantic review evidence, but it must remain separate.

Rule:

```text
Semantic Review candidate does not automatically become Value Object.
```

---

## 21. Relationship to Semantic Capital and State

Value Object exposure/productization actions must not create:

```text
Semantic Capital
State Fact
State Delta
State Snapshot
health conclusion
money conclusion
productivity conclusion
```

These remain future blocks:

```text
C33-S — State hooks safety package
C33-T — State facts/deltas/snapshots MVP
C33-W — Analytics / Semantic Capital / Audit
```

---

## 22. Future write gates

Future gate concepts:

```text
EXECUTE C33-R.VALUE-OBJECT-WRITE-GATE
EXECUTE C33-R.EXPOSURE-PRODUCTIZATION-WRITE-GATE
```

These gates are not opened in C33-R.3.

Before opening any gate, future implementation must define:

1. exact database tables and columns;
2. auth/session chain;
3. personal vs organization vs commercial permission model;
4. duplicate detection;
5. idempotency;
6. audit/provenance;
7. rollback/supersession;
8. conflict handling;
9. denial cases;
10. no unintended category/state/Semantic Capital writes.

---

## 23. Required future denial cases

Future implementation must deny when:

| Case | Expected result |
|---|---|
| no authenticated session | denied |
| app user not mapped | denied |
| organization context missing for organization/commercial scope | denied |
| user lacks organization permission | denied |
| candidate id is client-only preview id | denied or converted through server-side candidate creation gate |
| target Activity Event inaccessible | denied |
| target Value Object inaccessible | denied |
| action unsupported | denied |
| client sends user_id | denied |
| client sends forceCommercial | denied |
| client sends forcePublish | denied |
| client requests State writes | denied |
| client requests Semantic Capital writes | denied |
| Value Object write gate is closed | denied |
| exposure/productization write gate is closed | denied |
| idempotency conflict | denied or idempotently resolved |

Every denial must return explicit side-effect flags.

---

## 24. Relationship to C33-R.4

C33-R.4 must define the commercial/personal VO governance boundary before any real creation/exposure action.

C33-R.4 should answer:

- how personal VO candidate differs from organization/commercial VO;
- when organization context is required;
- how commercial/public visibility is governed;
- how offer/certificate bases are separated from normal personal Value Objects;
- how publication is moderated;
- how rollback/supersession works;
- how source provenance is stored;
- what remains no-write.

---

## 25. What C33-R.3 does not implement

C33-R.3 does not implement:

- UI components;
- new API routes;
- create/link/expose endpoints;
- database reads;
- database writes;
- Value Object creation;
- Activity-to-Value-Object linking;
- offer creation;
- certificate base creation;
- directory publication;
- auth/session implementation;
- organization permission checks;
- publication governance;
- Semantic Capital writes;
- State writes;
- audit table writes.

C33-R.3 is documentation-only.

---

## 26. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-R.1 Value Object candidate boundary.
2. C33-R.2 Value Object candidate display skeleton proof.
3. C33-Q.5 Semantic Review final lock.
4. C33-P.5 Activity Capture final lock.
5. C33-O.5 product preview final lock.
6. C33-N.2 orchestration skeleton proof.
7. C33-M stable bundle service wrapper proofs.

---

## 27. Recommended next step

Next step:

```text
C33-R.4 — Commercial/personal VO governance boundary
```

C33-R.4 should remain no-write unless the user explicitly approves a separate Value Object or exposure/productization write gate.

---

## 28. C33-R.3 expected result

Expected result:

```text
C33-R.3 RESULT: EXPOSURE_PRODUCTIZATION_ACTION_CONTRACT_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

