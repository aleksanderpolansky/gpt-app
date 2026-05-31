# C33-T.2 — State write transaction contract

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-T — State facts/deltas/snapshots MVP planning.

---

## 1. Decision

C33-T.2 defines the future transaction contract for State persistence.

```text
C33-T.2 RESULT: STATE_WRITE_TRANSACTION_CONTRACT_COMMITTED_AND_PUSHED
```

Main decision:

```text
Future State writes must be explicit, gated, idempotent, provenance-rich and side-effect-transparent.
C33-T.2 does not implement State writes.
```

This step is documentation-only.

```text
NO MIGRATION FILE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO ROUTE CREATION.
NO PRODUCTION PERSISTENCE.
```

---

## 2. Current state before C33-T.2

C33-S completed the no-write State hooks safety package.

Current safe preview route:

```text
POST /api/activity/state-hooks/preview
state_hooks_preview_no_write_v0
```

C33-T.1 defined schema boundaries for:

```text
state_facts
state_deltas
state_snapshots
state_evidence_links
state_governance_events
```

C33-T.2 now defines future transaction phases and invariants only.

---

## 3. Transaction classes

Future State persistence transactions must be separated by class:

```text
state_fact_transaction
state_delta_transaction
state_snapshot_transaction
state_evidence_transaction
state_governance_transaction
```

Forbidden:

```text
one endpoint silently doing all writes
AI signal becoming persisted truth
snapshot update without explicit facts/deltas
Semantic Capital write inside State transaction
Value Object write inside State transaction
medical/financial/productivity conclusion created as truth
```

---

## 4. Gate boundary

Future gate concepts remain closed:

```text
EXECUTE C33-S.STATE-WRITE-GATE
EXECUTE C33-S.STATE-EVIDENCE-GATE
EXECUTE C33-S.STATE-SNAPSHOT-GATE
EXECUTE C33-S.STATE-SAFETY-GOVERNANCE-GATE
EXECUTE C33-T.STATE-SCHEMA-DRAFT-GATE
EXECUTE C33-T.STATE-SCHEMA-SANDBOX-MIGRATION-GATE
EXECUTE C33-T.STATE-WRITE-SANDBOX-GATE
```

C33-T.2 opens none of these gates.

---

## 5. Future transaction phase 0 — request intake

Purpose:

```text
Receive a future State write request without trusting client-side identity or truth claims.
```

Required checks:

```text
request JSON parsed
action recognized
clientRequestId present
source hook/fact/delta/snapshot reference present where required
no forbidden client identity fields
no forbidden force/truth fields
```

Forbidden client fields:

```text
user_id
authenticatedUserId
owner_user_id
serviceRole
forceConfirmed
forceMeasured
forceApplied
forceDiagnosis
forceFinancialAdvice
forceProductivityScore
allowSemanticCapitalWrite
allowValueObjectCreation
allowActivityValueObjectLinkCreation
productionWriteEnabled
```

---

## 6. Future transaction phase 1 — server identity resolution

Purpose:

```text
Resolve identity server-side.
```

Required future steps:

```text
Auth0 session resolved
internal app user resolved
user ownership/access checked
organization context ignored unless explicit future enterprise-state model exists
```

Default MVP rule:

```text
State persistence is private-user scoped.
```

C33-T.2 does not implement identity resolution.

---

## 7. Future transaction phase 2 — source access check

Purpose:

```text
Verify the source records are accessible to the resolved user.
```

Possible sources:

```text
state_hook_preview
activity_event
stable_semantic_bundle
value_object_candidate
manual_evidence
sensor_evidence
calendar_context
```

Required future checks:

```text
source Activity Event belongs to user or is accessible
source Stable Bundle belongs to user or is accessible
source hook is not blindly trusted if it is only client-side preview
source Value Object/candidate is accessible
source evidence is accessible
```

C33-T.2 does not perform DB reads.

---

## 8. Future transaction phase 3 — action classification

Allowed future actions:

```text
confirm_state_hook
ignore_state_hook
defer_state_hook
attach_manual_evidence
attach_sensor_evidence
create_state_fact
create_state_delta
update_state_snapshot
supersede_state_fact
rollback_state_delta
```

Required classification:

```text
action kind
target type
state domain
safety class
evidence level
snapshot impact
semantic capital impact
privacy impact
```

Current status:

```text
contract-only
not executable
no route
no write
```

---

## 9. Future transaction phase 4 — domain safety check

Safety class must be evaluated before persistence.

Recommended classes:

```text
low_sensitivity
medium_sensitivity
high_sensitivity
```

High-sensitivity domains:

```text
health
fatigue
risk
money
financial confidence
burnout-like signals
```

Required future behavior:

```text
high_sensitivity requires stricter wording
high_sensitivity requires explicit confirmation
health/risk domains must not become diagnosis
money domains must not become financial advice
productivity domains must not become official productivity truth
```

---

## 10. Future transaction phase 5 — evidence sufficiency check

Evidence levels:

```text
ai_signal_only
user_manual_confirmation
user_manual_rating
sensor_evidence
calendar_context
activity_event_reference
stable_semantic_bundle_reference
value_object_candidate_reference
multi_source_evidence
```

Core rule:

```text
ai_signal_only must not create confirmed State Fact without later explicit policy and user confirmation.
```

Minimum future requirements:

| Domain | Minimum evidence before persistence |
|---|---|
| learning/time allocation | user confirmation or explicit low-risk policy |
| productivity/attention | user confirmation |
| family/care | user confirmation |
| fatigue/recovery | user confirmation; sensor/manual evidence recommended |
| health/risk | explicit user confirmation; non-diagnostic wording mandatory |
| money/financial | explicit user confirmation; no financial advice wording |

---

## 11. Future transaction phase 6 — idempotency check

Every future write request must include:

```text
clientRequestId
```

Required future behavior:

```text
same clientRequestId + same action + same target returns previous result
same clientRequestId + conflicting action is denied
double-click does not create duplicate facts
retry does not create duplicate deltas
snapshot update is not applied twice
```

C33-T.2 does not implement idempotency.

---

## 12. Future transaction phase 7 — mutation plan construction

Before a future write, the system must construct a mutation plan.

Plan must show:

```text
tables to be written
rows to be inserted
rows to be updated
side-effect flags expected after write
snapshot recompute policy
audit/governance event policy
rollback/supersession policy
```

Forbidden:

```text
hidden writes
implicit Semantic Capital update
implicit Value Object creation
implicit Activity Event rewrite
implicit Stable Bundle rewrite
implicit medical/financial/productivity truth creation
```

---

## 13. Future transaction phase 8 — write execution

Write execution may happen only after explicit future gate.

Possible future writes:

```text
insert state_facts
insert state_deltas
insert/update state_snapshots
insert state_evidence_links
insert state_governance_events
```

Required order for future write execution:

```text
1. governance/idempotency guard
2. evidence link or evidence row if applicable
3. state fact or state delta
4. snapshot update only if enabled and justified
5. governance/audit event
6. final side-effect summary
```

C33-T.2 does not execute this phase.

---

## 14. Future transaction phase 9 — snapshot recompute/update

Snapshot update must be separated from fact/delta creation.

Required future rules:

```text
snapshot update requires State snapshot gate
snapshot is derived/current view, not source-of-truth history
snapshot stores calculation rule version
snapshot is recomputable from facts/deltas
snapshot update is idempotent
snapshot update can be recomputed after rollback
```

C33-T.2 does not update snapshots.

---

## 15. Future transaction phase 10 — response construction

Every future response must include explicit side-effect flags.

Required response fields:

```text
ok
action
actionAccepted
actionPersisted
stateFactCreated
stateFactId
stateDeltaCreated
stateDeltaId
stateSnapshotCreated
stateSnapshotUpdated
stateSnapshotId
manualEvidenceAttached
sensorEvidenceAttached
semanticCapitalWritten
valueObjectCreated
activityValueObjectLinkCreated
medicalDiagnosisCreated
financialAdviceCreated
productivityScoreCreated
auditRecorded
rowsActuallyWritten
errors
warnings
```

---

## 16. Future request contract

Conceptual future request:

```ts
type StateWriteTransactionRequestV0 = {
  action:
    | "confirm_state_hook"
    | "ignore_state_hook"
    | "defer_state_hook"
    | "attach_manual_evidence"
    | "attach_sensor_evidence"
    | "create_state_fact"
    | "create_state_delta"
    | "update_state_snapshot"
    | "supersede_state_fact"
    | "rollback_state_delta";
  clientRequestId: string;
  sourceHookId?: string;
  sourceActivityEventId?: string;
  sourceStableBundleId?: string;
  sourceValueObjectCandidateId?: string;
  sourceManualEvidenceId?: string;
  sourceSensorEvidenceId?: string;
  targetStateFactId?: string;
  targetStateDeltaId?: string;
  targetStateSnapshotId?: string;
  stateDomain: string;
  stateKey: string;
  safetyClass: "low_sensitivity" | "medium_sensitivity" | "high_sensitivity";
  evidenceLevel:
    | "ai_signal_only"
    | "user_manual_confirmation"
    | "user_manual_rating"
    | "sensor_evidence"
    | "calendar_context"
    | "activity_event_reference"
    | "stable_semantic_bundle_reference"
    | "value_object_candidate_reference"
    | "multi_source_evidence";
  manualRating?: number;
  manualComment?: string;
  occurredAt?: string;
};
```

This type is conceptual only.

---

## 17. Future response contract

Conceptual future response:

```ts
type StateWriteTransactionResponseV0 = {
  ok: boolean;
  httpStatus: 200 | 400 | 401 | 403 | 409 | 500;
  transactionMode: "state_write_transaction_v0";
  actionAccepted: boolean;
  actionPersisted: boolean;
  idempotency: {
    clientRequestId: string;
    idempotentReplay: boolean;
    conflictDetected: boolean;
  };
  created: {
    stateFactId: string | null;
    stateDeltaId: string | null;
    stateSnapshotId: string | null;
    governanceEventId: string | null;
  };
  sideEffects: {
    sqlExecuted: boolean;
    dbReadExecuted: boolean;
    dbWriteExecuted: boolean;
    stateFactCreated: boolean;
    stateDeltaCreated: boolean;
    stateSnapshotCreated: boolean;
    stateSnapshotUpdated: boolean;
    manualEvidenceAttached: boolean;
    sensorEvidenceAttached: boolean;
    semanticCapitalWritten: boolean;
    valueObjectCreated: boolean;
    activityValueObjectLinkCreated: boolean;
    medicalDiagnosisCreated: boolean;
    financialAdviceCreated: boolean;
    productivityScoreCreated: boolean;
    auditRecorded: boolean;
    rowsActuallyWritten: number;
  };
  errors: string[];
  warnings: string[];
};
```

This type is conceptual only.

---

## 18. Transaction mode variants

Future transaction modes should be explicit:

```text
state_write_dry_run_v0
state_write_validate_only_v0
state_write_sandbox_v0
state_write_production_v0
```

Default until future gate:

```text
state_write_validate_only_v0
```

Forbidden default:

```text
state_write_production_v0
```

---

## 19. Future dry-run requirements

Before any write mode, dry-run must show:

```text
wouldReadTables
wouldWriteTables
wouldInsertRows
wouldUpdateRows
wouldCreateStateFact
wouldCreateStateDelta
wouldUpdateStateSnapshot
wouldWriteAudit
wouldWriteSemanticCapital
wouldCreateMedicalDiagnosis
wouldCreateFinancialAdvice
wouldCreateProductivityScore
denialReasons
warnings
```

Dry-run must not write.

---

## 20. Future denial cases

Future implementation must deny when:

| Case | Expected result |
|---|---|
| no authenticated session | denied |
| app user not mapped | denied |
| clientRequestId missing | denied |
| unsupported action | denied |
| source hook inaccessible | denied |
| source Activity Event inaccessible | denied |
| source Stable Bundle inaccessible | denied |
| source Value Object/candidate inaccessible | denied |
| health/risk domain lacks confirmation | denied |
| fatigue domain lacks manual/sensor confirmation where required | denied |
| money domain lacks confirmation | denied |
| evidence insufficient | denied |
| client sends user_id | denied |
| client sends forceConfirmed | denied |
| client sends forceDiagnosis | denied |
| client requests financial advice as truth | denied |
| client requests productivity score as truth | denied |
| client requests Semantic Capital writes | denied |
| client requests Value Object writes | denied |
| State write gate is closed | denied |
| State evidence gate is closed | denied |
| State snapshot gate is closed | denied |
| State safety governance gate is closed | denied |
| idempotency conflict | denied or idempotently resolved |

Every denial must return explicit no-write side-effect flags.

---

## 21. Side-effect flags required for all future responses

Required flags:

```text
sqlExecuted
dbReadExecuted
dbWriteExecuted
stateFactCreated
stateDeltaCreated
stateSnapshotCreated
stateSnapshotUpdated
manualEvidenceAttached
sensorEvidenceAttached
semanticCapitalWritten
valueObjectCreated
activityValueObjectLinkCreated
medicalDiagnosisCreated
financialAdviceCreated
productivityScoreCreated
auditRecorded
rowsActuallyWritten
```

For C33-T.2, expected values remain:

```text
sqlExecuted = false
dbReadExecuted = false
dbWriteExecuted = false
stateFactCreated = false
stateDeltaCreated = false
stateSnapshotCreated = false
stateSnapshotUpdated = false
manualEvidenceAttached = false
sensorEvidenceAttached = false
semanticCapitalWritten = false
valueObjectCreated = false
activityValueObjectLinkCreated = false
medicalDiagnosisCreated = false
financialAdviceCreated = false
productivityScoreCreated = false
auditRecorded = false
rowsActuallyWritten = 0
```

---

## 22. Rollback and supersession transaction boundary

Future rollback/supersession must be explicit.

Required behavior:

```text
do not delete historical fact silently
append supersession/governance event
rollback delta by neutralizing/reversing with provenance
recompute snapshot after rollback if snapshot gate is open
show affected records before applying
```

C33-T.2 does not implement rollback.

---

## 23. Relationship to State hook preview

State hook preview remains no-write.

Rule:

```text
State hook preview is not State write transaction.
```

Future transaction may use a State hook as source only after server-side validation or persisted candidate conversion.

---

## 24. Relationship to Activity Event

Activity Event remains source of truth for activity occurrence.

Rule:

```text
State write transaction may reference Activity Event.
State write transaction must not rewrite Activity Event.
```

---

## 25. Relationship to Stable Semantic Bundle

Stable Semantic Bundle remains semantic evidence.

Rule:

```text
State write transaction may reference Stable Semantic Bundle.
State write transaction must not rewrite Stable Semantic Bundle.
```

---

## 26. Relationship to Value Object

Value Object may help locate a value area.

Rule:

```text
State write transaction must not create Value Object.
State write transaction must not create Activity-to-Value-Object link.
```

---

## 27. Relationship to Semantic Capital

Semantic Capital remains closed.

Rule:

```text
State write transaction must not write Semantic Capital in C33-T.
```

Future Semantic Capital belongs to:

```text
C33-W — Analytics / Semantic Capital / Audit
```

---

## 28. No SQL/migration in C33-T.2

C33-T.2 explicitly does not create:

```text
SQL file
migration file
Supabase SQL editor packet
database table
database function
trigger
RLS policy
index
view
API route
service implementation
```

---

## 29. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-T.1 State persistence schema boundary.
2. C33-S.5 State hooks final lock.
3. C33-S.2 State hook preview skeleton proof.
4. C33-R.5 Value Object final lock.
5. C33-Q.5 Semantic Review final lock.
6. C33-P.5 Activity Capture final lock.
7. C33-O.5 product preview final lock.
8. C33-N.2 orchestration skeleton proof.
9. C33-M stable bundle service wrapper proofs.
10. C33-K sandbox persistence proof.

---

## 30. Recommended next step

Next step:

```text
C33-T.3 — State write schema preflight
```

C33-T.3 should perform SELECT-only/read-only schema preflight only if needed, or create a no-write preflight packet.

No SQL write should occur without an explicit later gate.

---

## 31. C33-T.2 expected result

Expected result:

```text
C33-T.2 RESULT: STATE_WRITE_TRANSACTION_CONTRACT_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No migration creation.  
No route creation.  
No runtime behavior change.

