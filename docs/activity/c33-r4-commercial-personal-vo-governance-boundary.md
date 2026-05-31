# C33-R.4 — Commercial/personal VO governance boundary

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-R — Value Object candidate and exposure productization.

---

## 1. Decision

C33-R.4 defines the governance boundary between personal, organization and commercial Value Objects.

```text
C33-R.4 RESULT: COMMERCIAL_PERSONAL_VO_GOVERNANCE_BOUNDARY_COMMITTED_AND_PUSHED
```

Main decision:

```text
Personal Value Object candidates, organization Value Object candidates and commercial Value Object candidates must remain separate governance tracks.
A personal candidate must not silently become an organization/commercial Value Object.
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

## 2. Current state before C33-R.4

C33-R.1 defined the Value Object candidate boundary.

C33-R.2 created a no-write candidate display skeleton:

```text
POST /api/activity/value-objects/candidates-preview
value_object_candidates_preview_no_write_v0
```

C33-R.3 defined future exposure/productization actions:

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

All actions remain no-write and not executable.

---

## 3. Governance gates remain closed

Future gate concepts:

```text
EXECUTE C33-R.VALUE-OBJECT-WRITE-GATE
EXECUTE C33-R.EXPOSURE-PRODUCTIZATION-WRITE-GATE
EXECUTE C33-R.COMMERCIAL-VO-GOVERNANCE-GATE
```

C33-R.4 keeps all these gates closed.

Before any gate can open, a future implementation must define exact tables/columns, auth/session chain, app user mapping, personal ownership, organization membership, commercial/publication permissions, duplicate detection, idempotency, audit/provenance, rollback/supersession, conflict handling, denial cases and guarantees that no category/state/Semantic Capital writes happen unintentionally.

---

## 4. Three governance tracks

Future Value Object flow must distinguish:

```text
personal_value_object
organization_value_object
commercial_value_object
```

These tracks are not interchangeable. They may share semantic origin, but they must not share lifecycle without explicit governance.

---

## 5. Personal Value Object track

Personal Value Object means:

```text
private user-owned value target / activity target / analytic object
```

Examples:

```text
Math learning support
Child education support
Parental care / childcare
Learning session
Exercise target
Language practice target
Time-management target
```

Personal VO may later support private analytics, personal planning, next best action, private progress charts and private semantic preferences.

Personal VO must not automatically become organization asset, commercial product/service, offer base, certificate base, public directory item or shared/global ontology item.

---

## 6. Organization Value Object track

Organization Value Object means:

```text
object/process/asset/service concept owned in organization context
```

Examples:

```text
B2B sales process
customer onboarding process
service delivery process
internal training object
business optimization object
organization-specific product/service description
```

Organization VO requires future checks:

```text
organization exists
user belongs to organization
user has required role
organization context is explicit
ownership/audit is recorded
```

Organization VO must not automatically become public/commercial.

---

## 7. Commercial Value Object track

Commercial Value Object means:

```text
organization-context object intended for commercial/product exposure
```

It may later become base for:

```text
offer
certificate
bookable service
product/service catalog item
directory listing
marketplace exposure
public landing page
```

Commercial VO requires future organization context, commercial permission, publication readiness, visibility policy, pricing/terms policy, consumer-facing legal/compliance checks if applicable, and audit/provenance.

C33-R.4 does not create commercial VO.

---

## 8. No silent personal-to-commercial conversion

Critical rule:

```text
A personal Value Object candidate must not silently become an organization/commercial Value Object.
```

If a user wants to use a personal concept commercially, the future system must create a separate organization-context candidate or Value Object.

Recommended future flow:

```text
1. Personal candidate exists in private context.
2. User chooses "use in organization/commercial context".
3. Server resolves organization membership and permission.
4. System creates a new organization/commercial candidate or Value Object under explicit gate.
5. Personal history remains private and separate.
6. Audit/provenance stores that the idea was user-inspired, without exposing private history.
```

---

## 9. No silent organization-to-commercial conversion

Organization VO must not become commercial/public automatically.

Future commercial exposure must require:

```text
explicit organization role permission
explicit commercial intent
publication/exposure gate
visibility decision
audit/provenance
rollback/unpublish plan
```

---

## 10. Publication, offer and certificate boundaries

Commercial/publication concepts include:

```text
public directory listing
catalog item
marketplace exposure
public organization page
SEO/public slug
public offer card
certificate/public redemption page
```

C33-R.4 forbids:

```text
offer creation
offer draft creation
price/terms creation
certificate base creation
certificate template creation
directory publication
public visibility change
points reservation/burn/release
payment calculation
```

Publication and productization require later commercial/product gates.

---

## 11. Ownership and transition concepts

Future ownership must be resolved server-side.

```ts
type ValueObjectOwnershipTrackV0 =
  | "personal_user_owned"
  | "organization_owned"
  | "commercial_organization_owned";
```

Forbidden:

```text
client-provided owner_user_id
client-provided organization_owner_id
client-provided user_id
client-provided serviceRole
```

Future scope transition concept:

```ts
type ValueObjectScopeTransitionV0 = {
  fromScope:
    | "personal_candidate"
    | "organization_candidate"
    | "commercial_candidate"
    | "personal_value_object"
    | "organization_value_object"
    | "commercial_value_object";
  toScope:
    | "personal_candidate"
    | "organization_candidate"
    | "commercial_candidate"
    | "personal_value_object"
    | "organization_value_object"
    | "commercial_value_object";
  allowed: boolean;
  requiresNewObject: boolean;
  requiresOrganizationPermission: boolean;
  requiresPublicationGovernance: boolean;
  requiresAudit: boolean;
};
```

Recommended rule:

```text
personal → organization/commercial requiresNewObject = true
organization → commercial requiresPublicationGovernance = true
commercial → public directory requiresPublicationGovernance = true
```

---

## 12. Future governance event model

Conceptual only:

```ts
type ValueObjectGovernanceEventV0 = {
  eventId: string;
  action:
    | "create_value_object"
    | "link_to_activity_event"
    | "expose_personal"
    | "expose_organization"
    | "expose_commercial"
    | "use_as_offer_base"
    | "use_as_certificate_base"
    | "publish_to_directory"
    | "unpublish"
    | "supersede"
    | "rollback";
  ownershipTrack:
    | "personal_user_owned"
    | "organization_owned"
    | "commercial_organization_owned";
  actorUserId: string;
  organizationId?: string;
  candidateId?: string;
  valueObjectId?: string;
  targetActivityEventId?: string;
  targetOfferId?: string;
  targetCertificateBaseId?: string;
  clientRequestId: string;
  createdAt: string;
  provenance: ValueObjectGovernanceProvenanceV0;
  sideEffects: ValueObjectGovernanceSideEffectsV0;
};
```

No governance table is created in C33-R.4.

---

## 13. Future provenance model

Conceptual only:

```ts
type ValueObjectGovernanceProvenanceV0 = {
  sourceRoute: string;
  sourceRouteMode: string;
  sourceActivityText?: string;
  sourceActivityEventId?: string;
  sourceStableBundleId?: string;
  sourceSemanticReviewCandidateId?: string;
  sourceValueObjectCandidateId?: string;
  sourceCandidateDisplayAdapterVersion?: string;
  sourceInputLanguage?: string;
  sourceRuleVersion?: string;
  sourceUserConfirmation?: boolean;
};
```

Every created/exposed Value Object must be traceable to candidate/source context.

---

## 14. Future side-effect model

Conceptual only:

```ts
type ValueObjectGovernanceSideEffectsV0 = {
  dbReadExecuted: boolean;
  dbWriteExecuted: boolean;
  valueObjectCreated: boolean;
  activityValueObjectLinkCreated: boolean;
  offerCreated: boolean;
  certificateBaseCreated: boolean;
  directoryPublished: boolean;
  visibilityChanged: boolean;
  semanticCapitalWritten: boolean;
  stateFactCreated: boolean;
  stateDeltaCreated: boolean;
  stateSnapshotCreated: boolean;
  auditRecorded: boolean;
  rowsActuallyWritten: number;
};
```

For C33-R.4, expected values remain:

```text
dbReadExecuted = false
dbWriteExecuted = false
valueObjectCreated = false
activityValueObjectLinkCreated = false
offerCreated = false
certificateBaseCreated = false
directoryPublished = false
visibilityChanged = false
semanticCapitalWritten = false
stateFactCreated = false
stateDeltaCreated = false
stateSnapshotCreated = false
auditRecorded = false
rowsActuallyWritten = 0
```

---

## 15. Duplicate, merge and idempotency boundary

Future VO creation must handle duplicates across personal, organization and commercial scopes.

Future implementation must define exact matching rules, semantic similarity rules, manual merge/supersession, scope-specific duplicate logic, audit of merge decisions and rollback.

Future VO creation/exposure must include:

```text
clientRequestId
```

Purpose:

```text
prevent duplicate Value Objects
prevent duplicate Activity-to-VO links
prevent duplicate offer/certificate base drafts
make retries safe
support double-click protection
```

---

## 16. Required future denial cases

Future implementation must deny when:

| Case | Expected result |
|---|---|
| no authenticated session | denied |
| app user not mapped | denied |
| organization context missing for organization/commercial track | denied |
| user lacks organization permission | denied |
| publication/commercial permission missing | denied |
| candidate id is client-only preview id | denied or converted through server-side candidate creation gate |
| target Activity Event inaccessible | denied |
| target Value Object inaccessible | denied |
| target organization inaccessible | denied |
| action unsupported | denied |
| client sends user_id | denied |
| client sends forceCommercial | denied |
| client sends forcePublish | denied |
| client requests State writes | denied |
| client requests Semantic Capital writes | denied |
| Value Object write gate is closed | denied |
| exposure/productization write gate is closed | denied |
| commercial VO governance gate is closed | denied |
| idempotency conflict | denied or idempotently resolved |

Every denial must return explicit side-effect flags.

---

## 17. Layer relationships

Activity Event remains source of truth for activity occurrence.

Stable Semantic Bundle remains semantic evidence.

Value Object governance event is not Activity Event.  
Value Object governance event is not Stable Semantic Bundle.

Semantic Review candidate is not Value Object.  
Value Object candidate is not active category.  
External concept candidate is not internal Value Object.

Value Object governance must not automatically write Semantic Capital or State records.

---

## 18. Relationship to commercial core

Commercial Value Object may later support offer, certificate, bookable service, directory item and external purchase confirmation context.

But C33-R.4 does not change the commercial core.

Important existing commercial rule:

```text
Purchase confirmation is not an item/cart/order flow.
External purchase happens outside platform.
Platform confirms external purchase and may calculate points under separate commercial logic.
```

Value Object commercial exposure must not accidentally reintroduce cart/order/item flow into purchase confirmations.

---

## 19. What C33-R.4 does not implement

C33-R.4 does not implement:

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
- visibility changes;
- auth/session implementation;
- organization permission checks;
- commercial publication governance;
- Semantic Capital writes;
- State writes;
- audit table writes.

C33-R.4 is documentation-only.

---

## 20. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-R.1 Value Object candidate boundary.
2. C33-R.2 Value Object candidate display skeleton proof.
3. C33-R.3 Exposure/productization action contract.
4. C33-Q.5 Semantic Review final lock.
5. C33-P.5 Activity Capture final lock.
6. C33-O.5 product preview final lock.
7. C33-N.2 orchestration skeleton proof.
8. C33-M stable bundle service wrapper proofs.

---

## 21. Recommended next step

Next step:

```text
C33-R.5 — C33-R final lock
```

C33-R.5 should finalize:

```text
Value Object candidate boundary is defined
Value Object candidate display skeleton exists
Exposure/productization actions are defined but disabled
Commercial/personal VO governance boundary is defined but closed
No persistence has been opened
```

---

## 22. C33-R.4 expected result

Expected result:

```text
C33-R.4 RESULT: COMMERCIAL_PERSONAL_VO_GOVERNANCE_BOUNDARY_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

