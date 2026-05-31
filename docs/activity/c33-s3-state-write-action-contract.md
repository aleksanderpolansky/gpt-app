# C33-S.3 — State write action contract

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-S — State hooks safety package.

---

## 1. Decision

C33-S.3 defines future State write actions for State hook candidates.

```text
C33-S.3 RESULT: STATE_WRITE_ACTION_CONTRACT_COMMITTED_AND_PUSHED
```

Main decision:

```text
Confirm, ignore, defer, create State Fact, create State Delta and update State Snapshot are future actions.
They are not implemented as write actions in C33-S.3.
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

## 2. Current state before C33-S.3

C33-S.1 defined the State hook boundary.

C33-S.2 created a no-write State hook preview skeleton:

```text
lib/activity/stateHooks/stateHookPreviewAdapterV0.ts
src/app/api/activity/state-hooks/preview/route.ts
```

Current route:

```text
POST /api/activity/state-hooks/preview
```

Current route mode:

```text
state_hooks_preview_no_write_v0
```

The route may display State hooks, but hooks remain:

```text
notConfirmedYet = true
notMeasuredYet = true
notSavedYet = true
notAppliedYet = true
canCreateStateFactNow = false
canCreateStateDeltaNow = false
canUpdateStateSnapshotNow = false
requiresFutureStateWriteGate = true
```

---

## 3. Future actions defined by C33-S.3

C33-S.3 defines these future action names:

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

All are contract-level only in C33-S.3.

Current status:

```text
not implemented
not executable
no write route
no DB write
no State write gate opened
no health/money/productivity truth gate opened
```

---

## 4. Action: confirm_state_hook

Conceptual meaning:

```text
User confirms that a hook is relevant and may be used as evidence later.
```

Not allowed in C33-S.3:

```text
persist confirmed status
create State Fact
create State Delta
update State Snapshot
write Semantic Capital
write medical/financial/productivity conclusion
```

Confirmation must not equal persistence until a future explicit State write gate exists.

---

## 5. Action: ignore_state_hook

Conceptual meaning:

```text
User marks a hook as not useful for the current context.
```

Not allowed in C33-S.3:

```text
persist ignore status
write negative preference
write audit event
write Semantic Capital
change future recommendation weights
```

Ignore remains future.

---

## 6. Action: defer_state_hook

Conceptual meaning:

```text
User postpones review of the hook.
```

Not allowed in C33-S.3:

```text
persist deferred status
create reminder
create review queue row
write audit event
write Semantic Capital
```

Defer remains future.

---

## 7. Action: request_more_context

Conceptual meaning:

```text
System asks the user for more information before any State write.
```

Examples:

```text
How tired do you feel?
Was this stressful or neutral?
Was the activity voluntary or forced?
Do you want to track this?
Was there sensor/manual evidence?
```

Not allowed in C33-S.3:

```text
persist answer
create state record
create diagnostic conclusion
write Semantic Capital
```

---

## 8. Action: attach_manual_evidence

Conceptual meaning:

```text
User adds manual evidence such as self-rating, comment or confirmation.
```

Examples:

```text
fatigue 6/10
attention 7/10
mood neutral
recovery need moderate
```

Not allowed in C33-S.3:

```text
persist manual evidence
create State Fact
create State Delta
update State Snapshot
```

Manual evidence remains future.

---

## 9. Action: attach_sensor_evidence

Conceptual meaning:

```text
System links external sensor/tracker evidence to a State hook.
```

Examples:

```text
sleep data
heart rate
steps
watch data
focus timer
calendar context
```

Not allowed in C33-S.3:

```text
read tracker data
persist tracker data
create State Fact
create State Delta
update State Snapshot
```

Sensor evidence remains future.

---

## 10. Action: create_state_fact

Conceptual meaning:

```text
Create a confirmed State Fact from reviewed evidence.
```

Not allowed in C33-S.3:

```text
insert state_facts row
persist health/fatigue/attention/money/productivity state
write diagnosis
write financial advice
write productivity truth
write Semantic Capital
```

Future creation requires:

```text
EXECUTE C33-S.STATE-WRITE-GATE
```

and a separate implementation plan.

---

## 11. Action: create_state_delta

Conceptual meaning:

```text
Create a State Delta representing a change direction/magnitude.
```

Examples:

```text
fatigue increased
attention decreased
recovery need increased
motivation increased
money confidence changed
```

Not allowed in C33-S.3:

```text
insert state_deltas row
apply delta to snapshot
write aggregate
write Semantic Capital
```

Future delta creation must be explicit, auditable and reversible.

---

## 12. Action: update_state_snapshot

Conceptual meaning:

```text
Update the current snapshot/aggregate view of a state dimension.
```

Not allowed in C33-S.3:

```text
insert/update state_snapshots row
update current fatigue
update current attention
update current productivity
update current money confidence
write snapshot aggregate
```

Future snapshot updates must be derived from confirmed facts/deltas and governed by a separate gate.

---

## 13. Action: supersede_state_fact

Conceptual meaning:

```text
Mark a prior State Fact as superseded by better evidence.
```

Not allowed in C33-S.3:

```text
update existing state fact
write supersession event
change snapshot
delete historical record
```

Future supersession must be append-only or audit-safe.

---

## 14. Action: rollback_state_delta

Conceptual meaning:

```text
Reverse or neutralize a previously applied State Delta.
```

Not allowed in C33-S.3:

```text
delete delta
mutate snapshot
write correction
write audit event
```

Future rollback must be explicit, auditable and reversible.

---

## 15. Evidence boundary

Future State actions must distinguish evidence type:

```text
ai_suggestion
user_manual_confirmation
user_manual_rating
sensor_evidence
calendar_context
activity_event_reference
stable_semantic_bundle_reference
value_object_candidate_reference
```

Core rule:

```text
AI suggestion alone is not enough to create a confirmed State Fact.
```

Health, fatigue, risk and money domains require stricter confirmation than ordinary productivity/time-allocation hooks.

---

## 16. Future conceptual request shape

A future action request may look conceptually like:

```ts
type StateWriteActionRequestV0 = {
  action:
    | "confirm_state_hook"
    | "ignore_state_hook"
    | "defer_state_hook"
    | "request_more_context"
    | "attach_manual_evidence"
    | "attach_sensor_evidence"
    | "create_state_fact"
    | "create_state_delta"
    | "update_state_snapshot"
    | "supersede_state_fact"
    | "rollback_state_delta";
  hookId: string;
  hookSource: "preview" | "persisted_state_hook_candidate";
  stateDomain:
    | "health"
    | "fatigue"
    | "attention"
    | "cognitive_load"
    | "recovery"
    | "learning"
    | "family_care"
    | "productivity"
    | "money"
    | "business"
    | "risk";
  targetActivityEventId?: string;
  targetStableBundleId?: string;
  targetValueObjectId?: string;
  manualRating?: number;
  manualComment?: string;
  sensorEvidenceId?: string;
  clientRequestId: string;
};
```

This type is conceptual only.

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
productionWriteEnabled
allowStateFactCreation
allowStateDeltaCreation
allowStateSnapshotCreation
allowSemanticCapitalWrite
allowValueObjectCreation
```

Server must resolve identity and permissions.

---

## 17. Future conceptual response shape

A future action response may look conceptually like:

```ts
type StateWriteActionResponseV0 = {
  ok: boolean;
  actionAccepted: boolean;
  actionPersisted: boolean;
  stateFactCreated: boolean;
  stateFactId: string | null;
  stateDeltaCreated: boolean;
  stateDeltaId: string | null;
  stateSnapshotUpdated: boolean;
  stateSnapshotId: string | null;
  manualEvidenceAttached: boolean;
  sensorEvidenceAttached: boolean;
  semanticCapitalWritten: boolean;
  medicalDiagnosisCreated: boolean;
  financialAdviceCreated: boolean;
  productivityScoreCreated: boolean;
  auditRecorded: boolean;
  rowsActuallyWritten: number;
  errors: string[];
  warnings: string[];
};
```

For C33-S.3, all action response values are conceptual only.

---

## 18. Required no-write side-effect flags for C33-S.3

C33-S.3 keeps these expected values:

```text
dbReadExecuted = false
dbWriteExecuted = false
stateFactCreated = false
stateDeltaCreated = false
stateSnapshotCreated = false
stateSnapshotUpdated = false
manualEvidenceAttached = false
sensorEvidenceAttached = false
semanticCapitalWritten = false
medicalDiagnosisCreated = false
financialAdviceCreated = false
productivityScoreCreated = false
valueObjectCreated = false
activityValueObjectLinkCreated = false
auditRecorded = false
rowsActuallyWritten = 0
```

---

## 19. User-facing action labels

Allowed disabled/future labels:

```text
Confirm later
Ignore later
Defer
Ask me later
Add manual evidence later
Attach sensor evidence later
Create State Fact later
Create State Delta later
Update Snapshot later
Rollback later
```

Russian labels:

```text
Подтвердить позже
Игнорировать позже
Отложить
Спросить меня позже
Добавить ручное подтверждение позже
Прикрепить данные трекера позже
Создать факт состояния позже
Создать изменение состояния позже
Обновить снимок состояния позже
Откатить позже
```

Required marker:

```text
State write actions require a future State write gate.
```

Russian marker:

```text
Действия записи состояния требуют будущего State write gate.
```

---

## 20. Relationship to Activity Event

Activity Event remains the source of truth for activity occurrence.

State write actions may reference Activity Event only after:

```text
server-side ownership/access check
explicit confirmation
write gate opened
audit policy defined
```

State write action must not rewrite Activity Event.

---

## 21. Relationship to Stable Semantic Bundle

Stable Semantic Bundle remains semantic evidence.

State write actions may reference Stable Semantic Bundle as provenance only.

State write action must not rewrite Stable Semantic Bundle.

---

## 22. Relationship to Value Object

Value Object candidate may help identify which value area a State hook relates to.

But:

```text
Value Object candidate is not State Fact.
Value Object candidate is not State Delta.
Value Object candidate is not State Snapshot.
```

State write action must not create Value Object.

---

## 23. Relationship to Semantic Capital

Confirmed State evidence may later contribute to Semantic Capital.

But C33-S.3 keeps this closed:

```text
semanticCapitalWritten = false
```

Semantic Capital belongs to:

```text
C33-W — Analytics / Semantic Capital / Audit
```

---

## 24. Future write gates

Future gate concepts:

```text
EXECUTE C33-S.STATE-WRITE-GATE
EXECUTE C33-S.STATE-EVIDENCE-GATE
EXECUTE C33-S.STATE-SNAPSHOT-GATE
```

These gates are not opened in C33-S.3.

Before opening any gate, future implementation must define:

1. exact database tables and columns;
2. auth/session chain;
3. personal ownership/access model;
4. manual/sensor/AI evidence policy;
5. domain safety class;
6. confidence and confirmation thresholds;
7. medical/financial/productivity wording policy;
8. idempotency;
9. audit/provenance;
10. rollback/supersession;
11. no unintended Value Object/category/Semantic Capital writes.

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
| sensor/manual evidence required but missing | denied |
| action unsupported | denied |
| client sends user_id | denied |
| client sends forceConfirmed | denied |
| client sends forceDiagnosis | denied |
| client requests financial advice as truth | denied |
| client requests productivity score as truth | denied |
| client requests Semantic Capital writes | denied |
| client requests Value Object writes | denied |
| State write gate is closed | denied |
| evidence gate is closed | denied |
| snapshot gate is closed | denied |
| idempotency conflict | denied or idempotently resolved |

Every denial must return explicit side-effect flags.

---

## 26. Relationship to C33-S.4

C33-S.4 must define the State safety/governance boundary before any real State write action.

C33-S.4 should answer:

- how health/fatigue/risk/money domains are handled safely;
- what wording is allowed and forbidden;
- when manual confirmation is mandatory;
- when sensor evidence is mandatory or optional;
- how confidence should be represented;
- how rollback/supersession works;
- how source provenance is stored;
- what remains no-write.

---

## 27. What C33-S.3 does not implement

C33-S.3 does not implement:

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

C33-S.3 is documentation-only.

---

## 28. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-S.1 State hook boundary.
2. C33-S.2 State hook preview skeleton proof.
3. C33-R.5 Value Object final lock.
4. C33-Q.5 Semantic Review final lock.
5. C33-P.5 Activity Capture final lock.
6. C33-O.5 product preview final lock.
7. C33-N.2 orchestration skeleton proof.
8. C33-M stable bundle service wrapper proofs.

---

## 29. Recommended next step

Next step:

```text
C33-S.4 — State safety/governance boundary
```

C33-S.4 should remain no-write unless the user explicitly approves a separate State write gate.

---

## 30. C33-S.3 expected result

Expected result:

```text
C33-S.3 RESULT: STATE_WRITE_ACTION_CONTRACT_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

