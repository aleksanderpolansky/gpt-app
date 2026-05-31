# C33-U.1 — State schema draft boundary

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-U — State schema draft / persistence readiness.

---

## 1. Decision

C33-U starts after C33-T final lock.

```text
C33-U.1 RESULT: STATE_SCHEMA_DRAFT_BOUNDARY_COMMITTED_AND_PUSHED
```

Main decision:

```text
C33-U may prepare State schema draft readiness, but C33-U.1 does not create a migration file and does not execute SQL.
```

C33-U.1 is documentation-only.

```text
NO MIGRATION FILE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO ROUTE CREATION.
NO PRODUCTION PERSISTENCE.
```

---

## 2. Context inherited from C33-T

C33-T completed as a planning-only block:

```text
C33-T RESULT: STATE_FACTS_DELTAS_SNAPSHOTS_MVP_PLANNING_BLOCK_COMPLETE
```

C33-T created these planning artifacts:

```text
docs/activity/c33-t1-state-persistence-schema-boundary.md
docs/activity/c33-t2-state-write-transaction-contract.md
docs/activity/c33-t3-state-write-schema-preflight.md
docs/activity/c33-t3-state-write-schema-preflight-select-only.sql
docs/activity/c33-t4-state-write-gate-packet.md
docs/activity/c33-t5-state-persistence-final-lock.md
```

C33-T did not execute:

```text
SQL
migration
DB read
DB write
route creation
State Fact creation
State Delta creation
State Snapshot creation/update
```

---

## 3. Why C33-U is needed

C33-T defined conceptual boundaries.

C33-U must decide how to move toward a real State schema without losing safety.

C33-U must answer:

```text
Should we run SELECT-only preflight first?
Can a schema draft be created from planning docs only?
Which tables are MVP-critical?
Which fields are required now vs postponed?
Which RLS/GRANT policy should be used?
What remains blocked until explicit gate?
```

---

## 4. C33-U.1 boundary

C33-U.1 may document:

```text
future table list
future column list
future security rules
future RLS/GRANT expectations
future migration draft file naming
future schema review checklist
future blockers
future non-goals
```

C33-U.1 must not:

```text
create SQL migration file
execute SQL
read DB
write DB
create tables
create policies
create grants
create route
create service
create State Fact
create State Delta
create State Snapshot
```

---

## 5. Candidate MVP schema draft scope

Candidate future MVP tables:

```text
state_facts
state_deltas
state_snapshots
state_evidence_links
state_governance_events
```

MVP-critical:

```text
state_facts
state_deltas
state_snapshots
```

Recommended but maybe optional in first migration:

```text
state_evidence_links
state_governance_events
```

C33-U.1 does not decide final SQL details.

---

## 6. Candidate table: state_facts

State Facts should store confirmed state evidence.

Minimum draft categories:

```text
identity:
  id
  user_id

state identity:
  state_domain
  state_key
  state_label

value:
  state_value_kind
  state_value_numeric
  state_value_text
  state_value_json

evidence:
  evidence_level
  confidence_level
  confirmation_source
  confirmed_by_user

safety/privacy:
  safety_class
  is_sensitive
  privacy_level

provenance:
  source_activity_event_id
  source_stable_bundle_id
  source_state_hook_id
  source_value_object_id
  provenance_json
  metadata_json

time:
  occurred_at
  observed_at
  created_at
  updated_at

correction:
  superseded_at
  superseded_by_state_fact_id
  rollback_group_id
```

No table is created in C33-U.1.

---

## 7. Candidate table: state_deltas

State Deltas should store confirmed state changes.

Minimum draft categories:

```text
identity:
  id
  user_id

state identity:
  state_domain
  state_key

delta:
  delta_kind
  delta_direction
  delta_magnitude_numeric
  delta_value_json

evidence:
  evidence_level
  confidence_level
  confirmation_source
  confirmed_by_user

safety/privacy:
  safety_class
  is_sensitive
  privacy_level

snapshot relation:
  applied_to_snapshot
  target_snapshot_id

provenance:
  source_state_fact_id
  source_activity_event_id
  source_stable_bundle_id
  source_state_hook_id
  provenance_json
  metadata_json

time:
  occurred_at
  created_at
  updated_at

correction:
  superseded_at
  rolled_back_at
  rollback_of_state_delta_id
  rollback_group_id
```

No table is created in C33-U.1.

---

## 8. Candidate table: state_snapshots

State Snapshots should store derived/current views.

Minimum draft categories:

```text
identity:
  id
  user_id

snapshot identity:
  snapshot_scope
  state_domain
  state_key

current value:
  current_value_kind
  current_value_numeric
  current_value_text
  current_value_json

window:
  aggregation_window_start
  aggregation_window_end

source counters:
  source_fact_count
  source_delta_count
  source_event_count

safety/confidence:
  confidence_level
  safety_class
  is_sensitive
  privacy_level

calculation:
  calculation_rule_version
  is_current

provenance:
  derived_from_facts_json
  derived_from_deltas_json
  derived_from_events_json
  provenance_json
  metadata_json

time:
  created_at
  updated_at
  recomputed_at

correction:
  superseded_at
  rollback_group_id
```

No table is created in C33-U.1.

---

## 9. Candidate table: state_evidence_links

State Evidence Links should connect persisted State records to evidence sources.

Possible columns:

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

This table may be optional in first MVP if provenance_json is enough.

But it is useful for:

```text
auditability
source traceability
future analytics
future evidence review UI
```

No table is created in C33-U.1.

---

## 10. Candidate table: state_governance_events

State Governance Events should store append-only governance/audit events.

Possible columns:

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

This table may be essential if State writes become user-visible and reversible.

No table is created in C33-U.1.

---

## 11. Security boundary for future schema draft

Any future schema draft must follow this order:

```text
create table
indexes
enable row level security
policies
explicit GRANT
```

Policy expectation:

```text
anon:
  no access to private State tables

authenticated:
  owner-only access through RLS

service_role:
  backend/server routes only
```

GRANT expectation:

```text
authenticated gets only the minimum operations required by RLS-backed app routes
anon gets no private State table access
service_role remains backend-only
```

C33-U.1 does not create policies or GRANTs.

---

## 12. Ownership boundary

Initial State persistence MVP is private-user scoped.

Default:

```text
user_id required
organization_id absent or postponed
privacy_level = private
is_sensitive = true for health/fatigue/risk/money/family-care sensitive cases
```

Forbidden now:

```text
organization-shared State records
directory-exposed State records
marketplace-exposed State records
public State records
```

---

## 13. Source reference boundary

Future State schema may reference:

```text
activity_events
stable_semantic_bundles
state hooks
value objects / value object candidates
manual evidence
sensor evidence
calendar context
```

But C33-U.1 does not assume exact existing DB column names unless already verified.

If SELECT-only preflight is not executed, future schema draft must be conservative.

---

## 14. SELECT-only preflight decision

C33-U has a decision point.

Option A:

```text
Run C33-T.3 SELECT-only preflight first.
```

Future phrase:

```text
EXECUTE C33-T.3 SELECT-ONLY PREFLIGHT
```

Option B:

```text
Prepare a schema draft from planning docs only, marking all DB assumptions as unverified.
```

Future phrase:

```text
EXECUTE C33-T.STATE-SCHEMA-DRAFT-GATE
```

C33-U.1 does not choose or execute either option.

---

## 15. Migration draft file boundary

A future schema draft file, if approved later, should be clearly named, for example:

```text
supabase/migrations/20260531_state_persistence_schema_draft.sql
```

But C33-U.1 does not create any file under:

```text
supabase/migrations/
```

No migration file is created now.

---

## 16. Future schema draft must not include

The first State schema draft must not include:

```text
Semantic Capital writes
Value Object writes
Activity Event rewrites
Stable Semantic Bundle rewrites
medical diagnosis tables
financial advice tables
productivity truth tables
public exposure tables
organization shared State tables
automatic snapshot recomputation triggers
AI-only confirmed facts
```

---

## 17. Future route boundary

No State write route should be created before:

```text
schema exists
RLS/GRANT is reviewed
server identity chain is defined
transaction contract is implemented
denial cases are implemented
idempotency is implemented
side-effect flags are implemented
```

C33-U.1 does not create routes.

---

## 18. Future side-effect flags

Any future gate must report:

```text
sqlExecuted
dbReadExecuted
dbWriteExecuted
migrationFileCreated
migrationApplied
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

For C33-U.1, expected values remain:

```text
sqlExecuted = false
dbReadExecuted = false
dbWriteExecuted = false
migrationFileCreated = false
migrationApplied = false
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

## 19. What C33-U.1 does not implement

C33-U.1 does not implement:

- SQL execution;
- SELECT-only execution;
- migration file creation;
- migration application;
- Supabase schema changes;
- database reads;
- database writes;
- API route;
- service implementation;
- State Fact creation;
- State Delta creation;
- State Snapshot creation/update;
- evidence persistence;
- audit writes;
- Semantic Capital writes;
- Value Object writes;
- Auth/session implementation;
- production behavior change.

C33-U.1 is documentation-only.

---

## 20. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-T.5 final lock.
2. C33-T.4 gate packet.
3. C33-T.3 SELECT-only preflight packet.
4. C33-T.2 transaction contract.
5. C33-T.1 schema boundary.
6. C33-S.5 State hooks final lock.
7. C33-S.2 State hook preview skeleton proof.
8. C33-R.5 Value Object final lock.
9. C33-Q.5 Semantic Review final lock.
10. C33-P.5 Activity Capture final lock.

---

## 21. Recommended next step

Next step:

```text
C33-U.2 — State schema draft file contract
```

C33-U.2 should define exact future migration draft file structure, naming, expected sections and safety scan rules.

C33-U.2 should still not create a migration file unless the user explicitly approves the schema draft gate.

---

## 22. C33-U.1 expected result

Expected result:

```text
C33-U.1 RESULT: STATE_SCHEMA_DRAFT_BOUNDARY_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No migration creation.  
No route creation.  
No runtime behavior change.

