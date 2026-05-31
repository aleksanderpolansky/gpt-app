# C33-S.1 — State hook boundary

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-S — State hooks safety package.

---

## 1. Decision

C33-S begins after C33-R final lock.

```text
C33-S.1 RESULT: STATE_HOOK_BOUNDARY_COMMITTED_AND_PUSHED
```

Main decision:

```text
The system may show possible State hooks derived from activity, semantic review and Value Object candidate context.
It must not create State Facts, State Deltas or State Snapshots automatically.
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

## 2. Why C33-S is needed

C33-P can produce detached Activity Capture previews.

C33-Q can show Semantic Review / New Concepts candidates.

C33-R can show Value Object candidates.

The next missing safety layer is to show possible State hooks without treating them as confirmed state.

Examples:

```text
"studied math with child for 30 minutes" may suggest possible hooks:
- cognitive effort;
- family/care duty load;
- learning progress;
- attention load;
- time allocation.
```

But these are hooks only.

The platform must not silently create:

```text
State Fact
State Delta
State Snapshot
health conclusion
fatigue conclusion
money conclusion
productivity conclusion
Semantic Capital change
```

---

## 3. Current input sources for State hook display

C33-S may later use outputs from:

```text
POST /api/activity/capture/detached-semantic-preview
POST /api/activity/semantic-review/new-concept-candidates-preview
POST /api/activity/value-objects/candidates-preview
POST /api/activity/semantic-orchestration-preview
```

Current route modes:

```text
activity_capture_detached_preview_no_write_v0
semantic_review_new_concept_candidates_no_write_v0
value_object_candidates_preview_no_write_v0
product_semantic_preview_no_write_v0
```

These are preview sources only.

They are not persisted State records.

---

## 4. State hook display boundary

The UI may show:

```text
Possible State hook
Possible fatigue signal
Possible attention load signal
Possible recovery need
Possible learning effort signal
Possible family/care load signal
Possible productivity signal
Possible money/business signal
```

Russian UI phrases may include:

```text
Возможный сигнал состояния
Возможный сигнал усталости
Возможная нагрузка внимания
Возможная потребность в восстановлении
Возможный сигнал учебного усилия
Возможная семейная/опекунская нагрузка
Возможный сигнал продуктивности
Возможный денежный/бизнес-сигнал
```

Required marker:

```text
This is a State hook, not a confirmed State Fact.
```

Russian marker:

```text
Это сигнал состояния, а не подтверждённый факт состояния.
```

---

## 5. What UI may display

Allowed display elements:

- source activity text;
- suggested state hook label;
- state domain;
- hook kind;
- hook direction;
- confidence/review priority if available;
- source preview route;
- no-write side-effect flags;
- warnings/errors;
- reason why the hook may be relevant;
- disabled/future actions.

Allowed disabled/future action labels:

```text
Confirm later
Ignore later
Ask me later
Track later
Create State Fact later
Create State Delta later
Create State Snapshot later
```

If displayed now, these must be disabled or marked:

```text
Not implemented in C33-S.1
Requires future State write gate
```

---

## 6. What UI must not display as truth

The UI must not display hooks as:

```text
confirmed fatigue
confirmed health state
confirmed stress state
confirmed productivity state
confirmed money state
diagnosis
financial advice
medical conclusion
saved state fact
state delta already applied
state snapshot already updated
```

Forbidden labels unless later gate implements them:

```text
confirmed
diagnosed
measured
saved
applied
updated
true
official
```

---

## 7. No automatic State Fact creation

C33-S.1 forbids automatic creation of:

```text
State Fact
health state fact
fatigue state fact
attention state fact
productivity state fact
money state fact
family/care load state fact
```

Rationale:

```text
AI output is candidate, not truth.
Category is not State Fact.
Value Object candidate is not State Fact.
State Fact is a source-of-truth state record and requires confirmation/governance.
```

---

## 8. No automatic State Delta creation

C33-S.1 forbids automatic creation of:

```text
State Delta
fatigue increase
attention decrease
motivation increase
recovery need increase
money confidence change
productivity score change
```

A future State Delta must be explicit, auditable and reversible.

---

## 9. No automatic State Snapshot creation

C33-S.1 forbids automatic creation or update of:

```text
State Snapshot
current fatigue snapshot
current attention snapshot
current health snapshot
current productivity snapshot
current money snapshot
current family load snapshot
```

Snapshots must not be updated from preview/hook display alone.

---

## 10. Safety domains

Future State hooks must distinguish domains:

```text
health
fatigue
attention
cognitive_load
recovery
learning
family_care
productivity
money
business
risk
```

The domain determines safety level.

Health, fatigue, risk and money domains require stricter wording and stronger confirmation before persistence.

---

## 11. Medical and health safety boundary

Health-related hooks may be shown only as non-diagnostic signals.

Allowed wording:

```text
possible fatigue signal
possible recovery need
may be worth monitoring
consider rest if you feel tired
```

Forbidden wording:

```text
you have a condition
you are ill
medical diagnosis
treatment instruction
confirmed health state
```

C33-S.1 does not provide medical advice or create medical records.

---

## 12. Money and business safety boundary

Money/business hooks may be shown only as planning/attention signals.

Allowed wording:

```text
possible business opportunity signal
possible money-related activity
may be useful for later review
```

Forbidden wording:

```text
guaranteed income
financial recommendation
investment advice
confirmed financial state
```

C33-S.1 does not create financial records or advice records.

---

## 13. Productivity and attention safety boundary

Productivity/attention hooks may be shown as tentative signals.

Allowed wording:

```text
possible attention load
possible productivity effort
possible recovery need
```

Forbidden wording:

```text
confirmed low productivity
confirmed burnout
confirmed cognitive problem
```

---

## 14. Candidate status model

Recommended conceptual statuses:

```ts
type StateHookCandidateStatusV0 =
  | "candidate"
  | "needs_user_review"
  | "needs_sensor_or_manual_confirmation"
  | "needs_context"
  | "blocked_from_auto_state_write";
```

Not allowed in C33-S.1:

```ts
"confirmed"
"measured"
"persisted"
"applied"
"snapshot_updated"
```

These are future persistence states.

---

## 15. Hook display model

Conceptual safe display shape:

```ts
type StateHookDisplayV0 = {
  hookId?: string;
  sourceRoute: string;
  sourceRouteMode: string;
  sourceActivityText: string;
  suggestedStateLabel: string;
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
  hookKind:
    | "possible_state_fact"
    | "possible_state_delta"
    | "possible_state_snapshot_input"
    | "monitoring_suggestion"
    | "review_prompt";
  hookDirection?: "increase" | "decrease" | "neutral" | "unknown";
  candidateStatus:
    | "candidate"
    | "needs_user_review"
    | "needs_sensor_or_manual_confirmation"
    | "needs_context"
    | "blocked_from_auto_state_write";
  notConfirmedYet: true;
  notMeasuredYet: true;
  notSavedYet: true;
  notAppliedYet: true;
  canCreateStateFactNow: false;
  canCreateStateDeltaNow: false;
  canUpdateStateSnapshotNow: false;
  requiresFutureStateWriteGate: true;
  sideEffects: {
    dbReadExecuted: false;
    dbWriteExecuted: false;
    stateFactCreated: false;
    stateDeltaCreated: false;
    stateSnapshotCreated: false;
    semanticCapitalWritten: false;
    valueObjectCreated: false;
    activityValueObjectLinkCreated: false;
    rowsActuallyWritten: 0;
  };
};
```

C33-S.1 does not implement this type in code. It defines the boundary.

---

## 16. Activity interpretation examples

Example activity:

```text
studied math with child for 30 minutes
```

Possible State hooks:

```text
learning effort signal
cognitive load signal
family/care duty load signal
attention load signal
time allocation signal
```

But C33-S.1 requires:

```text
notConfirmedYet = true
notSavedYet = true
notAppliedYet = true
canCreateStateFactNow = false
canCreateStateDeltaNow = false
canUpdateStateSnapshotNow = false
requiresFutureStateWriteGate = true
```

---

## 17. Relationship to Activity Event

Activity Event remains source of truth for activity occurrence.

A State hook may be derived from activity interpretation, but it is not the activity occurrence.

Rule:

```text
State hook is not Activity Event.
```

---

## 18. Relationship to Stable Semantic Bundle

Stable Semantic Bundle remains semantic evidence.

A State hook may use semantic evidence, but it is not a Stable Semantic Bundle.

Rule:

```text
State hook is not Stable Semantic Bundle.
```

---

## 19. Relationship to Semantic Review

Semantic Review candidate may help explain why a State hook exists.

But:

```text
Semantic Review candidate is not State Fact.
Unknown term is not State Fact.
External concept candidate is not State Fact.
```

---

## 20. Relationship to Value Object

Value Object candidate may help explain which value area a State hook relates to.

But:

```text
Value Object candidate is not State Fact.
Value Object candidate is not State Delta.
Value Object candidate is not State Snapshot.
```

---

## 21. Relationship to Semantic Capital

State hooks must not write Semantic Capital.

Semantic Capital may later use confirmed state evidence, but C33-S.1 does not write it.

Rule:

```text
State hook is not Semantic Capital.
```

---

## 22. Future State write gate

Future gate concept:

```text
EXECUTE C33-S.STATE-WRITE-GATE
```

This gate is not opened in C33-S.1.

Before any State write, future implementation must define:

1. exact database tables and columns;
2. state domains and safety classes;
3. manual vs sensor vs AI evidence policy;
4. confidence thresholds;
5. user confirmation flow;
6. medical/financial/productivity disclaimers;
7. auth/session and ownership checks;
8. idempotency;
9. audit/provenance;
10. rollback/supersession;
11. no unintended VO/Semantic Capital/category writes.

---

## 23. Required future denial cases

Future State Fact/Delta/Snapshot creation must deny when:

| Case | Expected result |
|---|---|
| no authenticated session | denied |
| app user not mapped | denied |
| source Activity Event inaccessible | denied |
| source hook id is client-only preview id | denied or converted through server-side candidate creation gate |
| health/risk domain lacks confirmation | denied |
| money domain lacks confirmation | denied |
| sensor/manual confirmation required but missing | denied |
| client sends user_id | denied |
| client sends forceConfirmed | denied |
| client requests Semantic Capital writes | denied |
| client requests Value Object writes | denied |
| State write gate is closed | denied |
| idempotency conflict | denied or idempotently resolved |

Every denial must return explicit side-effect flags.

---

## 24. What C33-S.1 does not implement

C33-S.1 does not implement:

- UI components;
- new API routes;
- database reads;
- database writes;
- State Fact creation;
- State Delta creation;
- State Snapshot creation;
- health diagnosis;
- financial advice;
- productivity scoring;
- Semantic Capital writes;
- Value Object creation;
- Activity-to-Value-Object linking;
- auth/session checks;
- audit table writes.

C33-S.1 is documentation-only.

---

## 25. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-R.2 Value Object candidate display skeleton proof.
2. C33-R.5 Value Object final lock.
3. C33-Q.5 Semantic Review final lock.
4. C33-P.5 Activity Capture final lock.
5. C33-O.5 product preview final lock.
6. C33-N.2 orchestration skeleton proof.
7. C33-M stable bundle service wrapper proofs.

---

## 26. Recommended next step

Next step:

```text
C33-S.2 — State hook preview skeleton
```

C33-S.2 may create a no-write display/route/component skeleton if approved.

C33-S.2 must still keep:

```text
no DB write
no State Fact creation
no State Delta creation
no State Snapshot creation
no Semantic Capital writes
no Value Object writes
no medical/financial/productivity conclusion as truth
```

---

## 27. C33-S.1 expected result

Expected result:

```text
C33-S.1 RESULT: STATE_HOOK_BOUNDARY_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

