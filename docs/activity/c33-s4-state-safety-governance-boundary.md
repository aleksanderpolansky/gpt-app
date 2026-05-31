# C33-S.4 — State safety/governance boundary

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-S — State hooks safety package.

---

## 1. Decision

C33-S.4 defines the State safety and governance boundary before any future State write implementation.

```text
C33-S.4 RESULT: STATE_SAFETY_GOVERNANCE_BOUNDARY_COMMITTED_AND_PUSHED
```

Main decision:

```text
State hooks may be displayed as tentative signals.
They must not become State Facts, State Deltas, State Snapshots, medical conclusions, financial advice, productivity truth or Semantic Capital without explicit future gates, evidence policy and confirmation.
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

## 2. Current state before C33-S.4

C33-S.1 defined the State hook boundary.

C33-S.2 created a no-write State hook preview skeleton:

```text
POST /api/activity/state-hooks/preview
state_hooks_preview_no_write_v0
```

C33-S.3 defined future State write action names:

```text
confirm_state_hook
ignore_state_hook
defer_state_hook
request_more_context
attach_manual_evidence
attach_sensor_evidence
create_state_fact
create_state_delta
update_state_snapshot
supersede_state_fact
rollback_state_delta
```

All actions remain:

```text
not implemented
not executable
no write route
no DB write
no State write gate opened
no State evidence gate opened
no State snapshot gate opened
```

---

## 3. Gates remain closed

Future gate concepts:

```text
EXECUTE C33-S.STATE-WRITE-GATE
EXECUTE C33-S.STATE-EVIDENCE-GATE
EXECUTE C33-S.STATE-SNAPSHOT-GATE
EXECUTE C33-S.STATE-SAFETY-GOVERNANCE-GATE
```

C33-S.4 keeps all these gates closed.

Before any gate can open, a future implementation must define:

1. exact database tables and columns;
2. auth/session chain;
3. app user mapping;
4. state domain safety classes;
5. manual/sensor/AI evidence policy;
6. confirmation thresholds;
7. confidence display model;
8. medical/financial/productivity wording policy;
9. idempotency;
10. audit/provenance;
11. rollback/supersession;
12. denial cases;
13. no unintended Value Object/category/Semantic Capital writes.

---

## 4. State domain safety classes

Future State hooks must be classified by safety level.

```text
low_sensitivity:
  learning
  general_time_allocation
  non-sensitive productivity planning

medium_sensitivity:
  attention
  cognitive_load
  recovery
  family_care
  business planning

high_sensitivity:
  health
  fatigue
  risk
  money
  financial confidence
  burnout-like signals
```

High-sensitivity domains require stricter wording, stronger confirmation and more explicit disclaimers before persistence.

---

## 5. Health and medical boundary

Health-related hooks may only be displayed as non-diagnostic signals.

Allowed wording:

```text
possible fatigue signal
possible recovery need
may be worth monitoring
consider rest if you feel tired
this is not a diagnosis
this is not medical advice
```

Forbidden wording:

```text
you have a disease
you are ill
you are burned out
diagnosis
treatment instruction
confirmed health state
confirmed medical condition
```

C33-S.4 does not create medical records, diagnoses or treatment instructions.

---

## 6. Fatigue and recovery boundary

Fatigue/recovery hooks may be useful for planning, but must remain tentative.

Allowed wording:

```text
possible fatigue/recovery signal
possible need for rest
may indicate higher load
check how you feel before deciding
```

Forbidden wording:

```text
confirmed fatigue
confirmed burnout
you cannot continue
you must stop immediately
medical conclusion
```

Future persistence requires user confirmation and, where relevant, manual or sensor evidence.

---

## 7. Risk boundary

Risk hooks require strict wording.

Allowed wording:

```text
possible risk signal
needs review
requires more context
do not treat as confirmed
```

Forbidden wording:

```text
danger confirmed
unsafe confirmed
legal/medical/financial risk confirmed
official risk classification
```

Risk hooks must not automatically trigger punitive restrictions or irreversible decisions.

---

## 8. Money and financial boundary

Money/business hooks may be shown as planning/attention signals only.

Allowed wording:

```text
possible money-related review signal
possible business opportunity signal
may be useful for later review
not financial advice
```

Forbidden wording:

```text
guaranteed income
investment advice
confirmed financial state
confirmed profit opportunity
financial recommendation as truth
```

C33-S.4 does not create financial advice or financial state records.

---

## 9. Productivity and attention boundary

Productivity/attention hooks may be shown as tentative planning signals.

Allowed wording:

```text
possible attention load
possible productivity effort
possible recovery need
possible context-switching load
```

Forbidden wording:

```text
confirmed low productivity
confirmed cognitive problem
confirmed burnout
official productivity score
```

Productivity score creation remains closed.

---

## 10. Family/care boundary

Family/care hooks may show responsibility load, but must not judge the user.

Allowed wording:

```text
possible family/care duty load
possible caregiving context
may be relevant for energy balance
```

Forbidden wording:

```text
bad parenting
confirmed overload
failed family duty
moral judgment
```

Caregiving context is a role/responsibility signal, not a diagnosis or moral evaluation.

---

## 11. Evidence levels

Future State logic must distinguish evidence levels:

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
AI signal only must not create a confirmed State Fact.
```

Minimum expected future policy:

| Domain | Minimum evidence before persistence |
|---|---|
| learning/time allocation | user confirmation or explicit low-risk policy |
| productivity/attention | user confirmation |
| family/care | user confirmation |
| fatigue/recovery | user confirmation; sensor/manual evidence recommended |
| health/risk | explicit user confirmation; sensor/manual evidence preferred; non-diagnostic wording mandatory |
| money/financial | explicit user confirmation; no financial advice wording |

---

## 12. Confidence boundary

Confidence may be displayed only as interpretation confidence, not truth confidence.

Allowed:

```text
low confidence signal
medium confidence signal
high-confidence pattern suggestion
needs confirmation
```

Forbidden:

```text
100% true
confirmed by AI
certain state
official measurement
```

Recommended conceptual confidence model:

```ts
type StateHookConfidenceV0 = {
  interpretationConfidence: "low" | "medium" | "high";
  evidenceStrength: "ai_signal_only" | "user_confirmed" | "sensor_supported" | "multi_source";
  persistenceReadiness:
    | "not_ready"
    | "needs_user_confirmation"
    | "needs_manual_or_sensor_evidence"
    | "ready_for_future_gate_only";
  truthClaimAllowed: false;
};
```

This type is conceptual only.

---

## 13. Required confirmation boundary

A future State write must require confirmation when:

```text
domain is health
domain is fatigue
domain is risk
domain is money
hook would affect recommendations
hook would affect aggregates
hook would affect Semantic Capital
hook would update a snapshot
hook would be visible outside the private user context
```

C33-S.4 does not implement confirmation.

---

## 14. Manual evidence boundary

Manual evidence may include:

```text
self-rating
comment
yes/no confirmation
intensity score
duration estimate
context explanation
```

Manual evidence must not be silently fabricated by AI.

Future manual evidence writes require:

```text
EXECUTE C33-S.STATE-EVIDENCE-GATE
```

---

## 15. Sensor evidence boundary

Sensor evidence may include:

```text
sleep data
heart rate
steps
watch data
focus timer
calendar context
workout data
```

Sensor evidence must not be fetched, interpreted or persisted in C33-S.4.

Future sensor evidence requires:

```text
consent/source connection
data minimization
time-window mapping
provenance
privacy policy
evidence gate
```

---

## 16. Future governance event model

A future governance event may conceptually include:

```ts
type StateGovernanceEventV0 = {
  eventId: string;
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
  actorUserId: string;
  sourceHookId?: string;
  sourceActivityEventId?: string;
  sourceStableBundleId?: string;
  sourceValueObjectCandidateId?: string;
  stateDomain: string;
  safetyClass: "low_sensitivity" | "medium_sensitivity" | "high_sensitivity";
  evidenceLevel: string;
  clientRequestId: string;
  createdAt: string;
  provenance: StateGovernanceProvenanceV0;
  sideEffects: StateGovernanceSideEffectsV0;
};
```

This type is conceptual only.

No governance table is created in C33-S.4.

---

## 17. Future provenance model

A future provenance record may conceptually include:

```ts
type StateGovernanceProvenanceV0 = {
  sourceRoute: string;
  sourceRouteMode: string;
  sourceActivityText?: string;
  sourceActivityEventId?: string;
  sourceStableBundleId?: string;
  sourceValueObjectCandidateId?: string;
  sourceStateHookId?: string;
  sourceHookPreviewAdapterVersion?: string;
  sourceInputLanguage?: string;
  sourceRuleVersion?: string;
  sourceUserConfirmation?: boolean;
  sourceManualRating?: number;
  sourceSensorEvidenceId?: string;
};
```

Purpose:

```text
Every created State Fact/Delta/Snapshot must be traceable to source evidence and confirmation.
```

---

## 18. Future side-effect model

A future side-effect model must explicitly show what happened:

```ts
type StateGovernanceSideEffectsV0 = {
  dbReadExecuted: boolean;
  dbWriteExecuted: boolean;
  stateFactCreated: boolean;
  stateDeltaCreated: boolean;
  stateSnapshotCreated: boolean;
  stateSnapshotUpdated: boolean;
  manualEvidenceAttached: boolean;
  sensorEvidenceAttached: boolean;
  medicalDiagnosisCreated: boolean;
  financialAdviceCreated: boolean;
  productivityScoreCreated: boolean;
  semanticCapitalWritten: boolean;
  valueObjectCreated: boolean;
  activityValueObjectLinkCreated: boolean;
  auditRecorded: boolean;
  rowsActuallyWritten: number;
};
```

For C33-S.4, expected values remain:

```text
dbReadExecuted = false
dbWriteExecuted = false
stateFactCreated = false
stateDeltaCreated = false
stateSnapshotCreated = false
stateSnapshotUpdated = false
manualEvidenceAttached = false
sensorEvidenceAttached = false
medicalDiagnosisCreated = false
financialAdviceCreated = false
productivityScoreCreated = false
semanticCapitalWritten = false
valueObjectCreated = false
activityValueObjectLinkCreated = false
auditRecorded = false
rowsActuallyWritten = 0
```

---

## 19. Rollback and supersession boundary

Future State writes must support correction.

Required concepts:

```text
supersede previous fact
rollback/neutralize delta
recompute snapshot from facts/deltas
append-only audit
do not silently delete history
show changed/will be applied before applying
```

C33-S.4 does not implement rollback/supersession.

---

## 20. Snapshot governance boundary

State Snapshot must be treated as derived/current view, not raw truth.

Future snapshot update must require:

```text
confirmed fact or delta
clear aggregation rule
source provenance
idempotency
rollback/recompute path
```

C33-S.4 does not create or update snapshots.

---

## 21. Relationship to Activity Event

Activity Event remains the source of truth for activity occurrence.

State governance may reference Activity Event as provenance, but must not rewrite it silently.

Rule:

```text
State governance event is not Activity Event.
```

---

## 22. Relationship to Stable Semantic Bundle

Stable Semantic Bundle remains semantic evidence.

State governance may reference Stable Semantic Bundle as provenance, but must not rewrite it silently.

Rule:

```text
State governance event is not Stable Semantic Bundle.
```

---

## 23. Relationship to Value Object

Value Object candidate may help identify which value area a State hook relates to.

But State governance must not create Value Object.

Rule:

```text
State governance event is not Value Object.
```

---

## 24. Relationship to Semantic Capital

Confirmed State evidence may later contribute to Semantic Capital.

But C33-S.4 keeps this closed:

```text
semanticCapitalWritten = false
```

Semantic Capital belongs to:

```text
C33-W — Analytics / Semantic Capital / Audit
```

---

## 25. Required future denial cases

Future implementation must deny when:

| Case | Expected result |
|---|---|
| no authenticated session | denied |
| app user not mapped | denied |
| source Activity Event inaccessible | denied |
| source Stable Bundle inaccessible | denied |
| source hook id is client-only preview id | denied or converted through server-side candidate creation gate |
| health/risk domain lacks confirmation | denied |
| fatigue domain lacks manual/sensor confirmation | denied |
| money domain lacks confirmation | denied |
| required evidence is missing | denied |
| action unsupported | denied |
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

Every denial must return explicit side-effect flags.

---

## 26. What C33-S.4 does not implement

C33-S.4 does not implement:

- UI components;
- new API routes;
- confirm/ignore/defer endpoints;
- evidence endpoints;
- State Fact creation;
- State Delta creation;
- State Snapshot update;
- database reads;
- database writes;
- medical diagnosis;
- financial advice;
- productivity scoring;
- Semantic Capital writes;
- Value Object writes;
- auth/session implementation;
- audit table writes.

C33-S.4 is documentation-only.

---

## 27. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-S.1 State hook boundary.
2. C33-S.2 State hook preview skeleton proof.
3. C33-S.3 State write action contract.
4. C33-R.5 Value Object final lock.
5. C33-Q.5 Semantic Review final lock.
6. C33-P.5 Activity Capture final lock.
7. C33-O.5 product preview final lock.
8. C33-N.2 orchestration skeleton proof.
9. C33-M stable bundle service wrapper proofs.

---

## 28. Recommended next step

Next step:

```text
C33-S.5 — C33-S final lock
```

C33-S.5 should finalize:

```text
State hook boundary is defined
State hook preview skeleton exists
State write actions are defined but disabled
State safety/governance boundary is defined but closed
No State persistence has been opened
```

---

## 29. C33-S.4 expected result

Expected result:

```text
C33-S.4 RESULT: STATE_SAFETY_GOVERNANCE_BOUNDARY_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

