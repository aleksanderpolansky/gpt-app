# C33-T.1 — State persistence schema boundary

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-T — State facts/deltas/snapshots MVP planning.

---

## 1. Decision

C33-T begins after C33-S final lock.

```text
C33-T.1 RESULT: STATE_PERSISTENCE_SCHEMA_BOUNDARY_COMMITTED_AND_PUSHED
```

Main decision:

```text
State persistence must be designed around three separate record classes:
1. State Fact;
2. State Delta;
3. State Snapshot.
```

C33-T.1 defines schema boundaries only.

```text
NO MIGRATION FILE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO ROUTE CREATION.
NO PRODUCTION PERSISTENCE.
```

---

## 2. Why C33-T is needed

C33-S can show State hooks safely:

```text
POST /api/activity/state-hooks/preview
state_hooks_preview_no_write_v0
```

C33-S does not create truth records.

C33-T is needed to design how the platform may later persist confirmed State records without mixing:

```text
AI suggestion
State hook
State Fact
State Delta
State Snapshot
Semantic Capital
Value Object
Activity Event
Stable Semantic Bundle
```

---

## 3. Core separation

The following must remain separate:

```text
State hook = tentative signal
State Fact = confirmed evidence record
State Delta = confirmed change event
State Snapshot = derived/current view
```

Forbidden:

```text
State hook automatically becomes State Fact
State hook automatically becomes State Delta
State hook automatically updates State Snapshot
AI output alone becomes confirmed state
State Snapshot becomes source-of-truth history
State Fact silently writes Semantic Capital
State Delta silently creates Value Object
```

---

## 4. Candidate table boundary: state_facts

Candidate purpose:

```text
state_facts stores confirmed or explicitly accepted state evidence.
```

Conceptual columns:

```text
id
user_id
source_activity_event_id
source_stable_bundle_id
source_state_hook_id
source_value_object_id
state_domain
state_key
state_label
state_value_kind
state_value_numeric
state_value_text
state_value_json
evidence_level
confidence_level
safety_class
confirmation_source
confirmed_by_user
is_sensitive
privacy_level
occurred_at
observed_at
created_at
updated_at
superseded_at
superseded_by_state_fact_id
rollback_group_id
provenance_json
metadata_json
```

C33-T.1 does not create this table.

---

## 5. State Fact meaning

State Fact should mean:

```text
A confirmed or accepted observation/evidence about a state at a point or interval.
```

Examples:

```text
user self-rated fatigue as 6/10
user confirmed high attention load
user confirmed recovery need
sensor evidence indicates sleep duration
manual note confirms stress context
```

State Fact must not mean:

```text
AI guessed the user is tired
AI diagnosed a condition
AI declared financial state
AI assigned productivity truth
```

---

## 6. Candidate table boundary: state_deltas

Candidate purpose:

```text
state_deltas stores confirmed changes to state dimensions.
```

Conceptual columns:

```text
id
user_id
source_state_fact_id
source_activity_event_id
source_stable_bundle_id
source_state_hook_id
state_domain
state_key
delta_kind
delta_direction
delta_magnitude_numeric
delta_value_json
evidence_level
confidence_level
safety_class
confirmation_source
confirmed_by_user
applied_to_snapshot
target_snapshot_id
occurred_at
created_at
updated_at
superseded_at
rolled_back_at
rollback_of_state_delta_id
rollback_group_id
provenance_json
metadata_json
```

C33-T.1 does not create this table.

---

## 7. State Delta meaning

State Delta should mean:

```text
A confirmed change event that may later affect a derived/current state view.
```

Examples:

```text
fatigue increased after long work block
attention decreased after context switching
recovery need increased after poor sleep
learning confidence increased after completed session
```

State Delta must not mean:

```text
raw AI prediction
automatic score mutation
silent snapshot update
irreversible conclusion
```

---

## 8. Candidate table boundary: state_snapshots

Candidate purpose:

```text
state_snapshots stores derived/current or interval aggregate state views.
```

Conceptual columns:

```text
id
user_id
snapshot_scope
state_domain
state_key
current_value_kind
current_value_numeric
current_value_text
current_value_json
aggregation_window_start
aggregation_window_end
source_fact_count
source_delta_count
source_event_count
confidence_level
safety_class
derived_from_facts_json
derived_from_deltas_json
derived_from_events_json
calculation_rule_version
is_current
created_at
updated_at
recomputed_at
superseded_at
rollback_group_id
provenance_json
metadata_json
```

C33-T.1 does not create this table.

---

## 9. State Snapshot meaning

State Snapshot should mean:

```text
A derived/current state view calculated from confirmed evidence and explicit rules.
```

Examples:

```text
current fatigue estimate
current attention load view
weekly recovery balance
daily family/care load view
learning effort trend
```

State Snapshot must not mean:

```text
raw source of truth
medical diagnosis
financial advice
official productivity score
irreversible user profile truth
```

---

## 10. Candidate table boundary: state_evidence_links

Candidate purpose:

```text
state_evidence_links may connect State Facts/Deltas/Snapshots to evidence sources.
```

Conceptual columns:

```text
id
user_id
target_type
target_id
source_type
source_id
source_route
source_route_mode
evidence_level
evidence_role
created_at
metadata_json
```

Possible `target_type`:

```text
state_fact
state_delta
state_snapshot
```

Possible `source_type`:

```text
activity_event
stable_semantic_bundle
state_hook_preview
value_object_candidate
manual_evidence
sensor_evidence
calendar_context
```

C33-T.1 does not create this table.

---

## 11. Candidate table boundary: state_governance_events

Candidate purpose:

```text
state_governance_events may store append-only governance/audit events.
```

Conceptual columns:

```text
id
user_id
action
target_type
target_id
source_state_hook_id
source_activity_event_id
state_domain
state_key
safety_class
evidence_level
client_request_id
result_status
side_effects_json
provenance_json
created_at
metadata_json
```

Possible actions:

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

C33-T.1 does not create this table.

---

## 12. Required user ownership boundary

State persistence is private-user scoped unless a later organization/enterprise state model is explicitly designed.

Initial MVP default:

```text
user_id required
organization_id absent or null
private by default
```

Forbidden in future write requests:

```text
client-provided user_id
client-provided authenticatedUserId
client-provided owner_user_id
client-provided serviceRole
```

Server must resolve:

```text
Auth0 session
internal app user
ownership/access permissions
```

C33-T.1 does not implement auth/session.

---

## 13. Privacy boundary

State records may include sensitive personal data.

Default privacy:

```text
private
```

Sensitive domains:

```text
health
fatigue
risk
money
financial confidence
burnout-like signals
family/care load
```

Required future design:

```text
privacy_level
is_sensitive
data minimization
no public exposure by default
no directory/marketplace exposure
no organization exposure without explicit future model
```

---

## 14. Safety class boundary

Recommended conceptual safety class:

```ts
type StateSafetyClassV0 =
  | "low_sensitivity"
  | "medium_sensitivity"
  | "high_sensitivity";
```

Suggested mapping:

```text
low_sensitivity:
  learning
  time allocation
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

---

## 15. Evidence level boundary

Recommended conceptual evidence level:

```ts
type StateEvidenceLevelV0 =
  | "ai_signal_only"
  | "user_manual_confirmation"
  | "user_manual_rating"
  | "sensor_evidence"
  | "calendar_context"
  | "activity_event_reference"
  | "stable_semantic_bundle_reference"
  | "value_object_candidate_reference"
  | "multi_source_evidence";
```

Rule:

```text
ai_signal_only must not create confirmed State Fact without later explicit policy and user confirmation.
```

---

## 16. Source provenance boundary

Each future persisted State record must be traceable.

Required source references should include zero or more of:

```text
source_activity_event_id
source_stable_bundle_id
source_state_hook_id
source_value_object_id
source_manual_evidence_id
source_sensor_evidence_id
source_route
source_route_mode
source_rule_version
```

No orphan state truth should be created without provenance.

---

## 17. Idempotency boundary

Future State writes must use:

```text
client_request_id
```

Purpose:

```text
prevent duplicate facts
prevent duplicate deltas
prevent double snapshot updates
make retries safe
support rollback/recompute
```

C33-T.1 does not implement idempotency.

---

## 18. Snapshot derivation boundary

State Snapshot must be derived from facts/deltas/events.

Required future policy:

```text
snapshot is not source-of-truth
snapshot must store calculation rule version
snapshot must be recomputable
snapshot must record source counts and provenance
snapshot update must be idempotent
snapshot update must be reversible through recompute
```

---

## 19. Rollback/supersession boundary

Future model must support:

```text
supersede prior fact
rollback/neutralize delta
recompute snapshot
preserve append-only audit history
do not silently delete prior state history
```

C33-T.1 does not implement rollback.

---

## 20. No Semantic Capital writes

Confirmed State records may later contribute to Semantic Capital, but not in C33-T.1.

Rule:

```text
State persistence planning must not write Semantic Capital.
```

Future Semantic Capital belongs to:

```text
C33-W — Analytics / Semantic Capital / Audit
```

---

## 21. No Value Object writes

State persistence must not create or modify Value Objects.

Rule:

```text
State Fact is not Value Object.
State Delta is not Value Object.
State Snapshot is not Value Object.
```

Value Object writes remain closed under C33-R gates.

---

## 22. No Activity Event rewrites

State persistence may reference Activity Event, but must not rewrite it silently.

Rule:

```text
State Fact/Delta/Snapshot is not Activity Event.
```

---

## 23. No Stable Semantic Bundle rewrites

State persistence may reference Stable Semantic Bundle, but must not rewrite it silently.

Rule:

```text
State Fact/Delta/Snapshot is not Stable Semantic Bundle.
```

---

## 24. Future SQL/migration boundary

C33-T.1 explicitly does not create:

```text
migration file
SQL file
Supabase SQL editor packet
database table
database function
trigger
RLS policy
index
view
```

A future C33-T SQL gate must be separate and explicit.

Possible future gate phrase:

```text
EXECUTE C33-T.STATE-SCHEMA-DRAFT-GATE
```

Possible later sandbox write gate phrase:

```text
EXECUTE C33-T.STATE-SCHEMA-SANDBOX-MIGRATION-GATE
```

These gates are not opened in C33-T.1.

---

## 25. Required future denial cases

Future State persistence must deny when:

| Case | Expected result |
|---|---|
| no authenticated session | denied |
| app user not mapped | denied |
| source State hook inaccessible | denied |
| source Activity Event inaccessible | denied |
| source Stable Bundle inaccessible | denied |
| health/risk domain lacks confirmation | denied |
| fatigue domain lacks manual/sensor confirmation where required | denied |
| money domain lacks confirmation | denied |
| required evidence is missing | denied |
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

## 26. Required side-effect flags

Future implementation must report:

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

For C33-T.1, expected values remain:

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

## 27. What C33-T.1 does not implement

C33-T.1 does not implement:

- SQL;
- migrations;
- Supabase schema changes;
- RLS policies;
- indexes;
- triggers;
- database functions;
- API routes;
- UI components;
- State Fact creation;
- State Delta creation;
- State Snapshot creation/update;
- evidence persistence;
- audit table writes;
- Semantic Capital writes;
- Value Object writes;
- auth/session implementation;
- production persistence.

C33-T.1 is documentation-only.

---

## 28. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-S.5 State hooks final lock.
2. C33-S.2 State hook preview skeleton proof.
3. C33-S.4 State safety/governance boundary.
4. C33-R.5 Value Object final lock.
5. C33-Q.5 Semantic Review final lock.
6. C33-P.5 Activity Capture final lock.
7. C33-O.5 product preview final lock.
8. C33-N.2 orchestration skeleton proof.
9. C33-M stable bundle service wrapper proofs.
10. C33-K sandbox persistence proof.

---

## 29. Recommended next step

Next step:

```text
C33-T.2 — State write transaction contract
```

C33-T.2 should define exact future transaction steps, side-effect flags, idempotency and denial cases.

C33-T.2 must remain no-write unless the user explicitly approves a separate gate.

---

## 30. C33-T.1 expected result

Expected result:

```text
C33-T.1 RESULT: STATE_PERSISTENCE_SCHEMA_BOUNDARY_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No migration creation.  
No route creation.  
No runtime behavior change.

