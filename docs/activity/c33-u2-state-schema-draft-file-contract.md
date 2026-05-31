# C33-U.2 — State schema draft file contract

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-U — State schema draft / persistence readiness.

---

## 1. Decision

C33-U.2 defines the contract for a future State schema draft file.

```text
C33-U.2 RESULT: STATE_SCHEMA_DRAFT_FILE_CONTRACT_COMMITTED_AND_PUSHED
```

Main decision:

```text
A future State schema draft may be prepared only under an explicit schema draft gate.
C33-U.2 does not create the migration draft file.
C33-U.2 does not execute SQL.
```

C33-U.2 is documentation-only.

```text
NO MIGRATION FILE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO ROUTE CREATION.
NO PRODUCTION PERSISTENCE.
```

---

## 2. Context inherited from C33-U.1

C33-U.1 defined the State schema draft boundary.

C33-U.1 kept the following closed:

```text
migration file creation
SQL execution
DB read
DB write
route creation
State Fact creation
State Delta creation
State Snapshot creation/update
Semantic Capital writes
Value Object writes
```

C33-U.2 continues the same no-write boundary.

---

## 3. Future gate required before draft file creation

A future migration draft file may be created only after this phrase is explicitly approved:

```text
EXECUTE C33-T.STATE-SCHEMA-DRAFT-GATE
```

C33-U.2 does not use this phrase as authorization.

C33-U.2 records the phrase only as a future gate.

---

## 4. Future draft file path contract

Future draft file, if approved later, should use a clear timestamped name:

```text
supabase/migrations/20260531_state_persistence_schema_draft.sql
```

Alternative if date changes:

```text
supabase/migrations/YYYYMMDD_state_persistence_schema_draft.sql
```

Rules:

```text
one future schema draft file
no execution inside draft creation script
no Supabase SQL Editor execution
no automatic migration application
no production target
```

C33-U.2 does not create anything under `supabase/migrations/`.

---

## 5. Future draft file header contract

The future SQL draft must start with a non-execution warning:

```sql
-- C33-U State persistence schema draft
-- DRAFT ONLY.
-- DO NOT EXECUTE WITHOUT EXPLICIT GATE.
-- Required future gate:
-- EXECUTE C33-T.STATE-SCHEMA-SANDBOX-MIGRATION-GATE
```

The header must also list:

```text
project
date
scope
target environment
authoring block
source planning documents
known assumptions
known blockers
```

---

## 6. Future draft file section order

A future State schema draft must follow this order:

```text
1. preflight comments and scope
2. optional extensions check/comment
3. table definitions
4. constraints
5. indexes
6. enable row level security
7. RLS policies
8. explicit GRANT
9. comments/documentation
10. no seed data section unless separately approved
11. final safety summary
```

Supabase security order:

```text
create table → indexes → enable row level security → policies → explicit GRANT
```

---

## 7. Future table order

Recommended future table creation order:

```text
state_facts
state_deltas
state_snapshots
state_evidence_links
state_governance_events
```

Reason:

```text
facts and deltas are the evidence/change source;
snapshots are derived views;
evidence links and governance events refer to facts/deltas/snapshots.
```

---

## 8. Future state_facts draft contract

Future `state_facts` should include:

```text
id
user_id
state_domain
state_key
state_label
state_value_kind
state_value_numeric
state_value_text
state_value_json
evidence_level
confidence_level
confirmation_source
confirmed_by_user
safety_class
is_sensitive
privacy_level
source_activity_event_id
source_stable_bundle_id
source_state_hook_id
source_value_object_id
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

Future draft must not make AI-only signals confirmed facts by default.

---

## 9. Future state_deltas draft contract

Future `state_deltas` should include:

```text
id
user_id
state_domain
state_key
delta_kind
delta_direction
delta_magnitude_numeric
delta_value_json
evidence_level
confidence_level
confirmation_source
confirmed_by_user
safety_class
is_sensitive
privacy_level
applied_to_snapshot
target_snapshot_id
source_state_fact_id
source_activity_event_id
source_stable_bundle_id
source_state_hook_id
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

Future draft must not apply deltas to snapshots automatically unless explicitly designed.

---

## 10. Future state_snapshots draft contract

Future `state_snapshots` should include:

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
is_sensitive
privacy_level
calculation_rule_version
is_current
derived_from_facts_json
derived_from_deltas_json
derived_from_events_json
created_at
updated_at
recomputed_at
superseded_at
rollback_group_id
provenance_json
metadata_json
```

Future draft must preserve this invariant:

```text
State Snapshot is derived/current view, not source-of-truth history.
```

---

## 11. Future state_evidence_links draft contract

Future `state_evidence_links` should include:

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

Allowed future target types:

```text
state_fact
state_delta
state_snapshot
```

Allowed future source types:

```text
activity_event
stable_semantic_bundle
state_hook_preview
value_object_candidate
manual_evidence
sensor_evidence
calendar_context
```

---

## 12. Future state_governance_events draft contract

Future `state_governance_events` should include:

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

This table should be append-only in spirit.

Future draft must support:

```text
idempotency
auditable decision path
rollback/supersession trace
denial reason trace
side-effect transparency
```

---

## 13. Future index contract

Future schema draft should include indexes for:

```text
user_id
user_id + state_domain
user_id + state_domain + state_key
source_activity_event_id
source_stable_bundle_id
source_state_hook_id
created_at
occurred_at
is_current
client_request_id
```

Indexes must not imply public exposure.

Indexes must not replace RLS.

---

## 14. Future RLS contract

Future private State tables must enable RLS:

```text
alter table ... enable row level security;
```

Policy intent:

```text
authenticated users can access only their own rows
anon has no private State table access
service_role remains backend/server only
```

RLS must be paired with explicit GRANT policy.

---

## 15. Future explicit GRANT contract

Following Supabase Data API safety rules, future draft must include explicit GRANT near RLS policies.

Expected pattern:

```text
GRANT SELECT, INSERT, UPDATE ON ... TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE ... TO authenticated if needed;
```

But the exact grant must be minimal.

Forbidden:

```text
grant broad private State access to anon
grant write access without RLS
grant public exposure to health/fatigue/risk/money State rows
```

---

## 16. Future comments/documentation contract

Future draft should add SQL comments where useful:

```text
state_facts = confirmed evidence records
state_deltas = confirmed change records
state_snapshots = derived/current views
state_evidence_links = provenance/evidence links
state_governance_events = append-only governance trace
```

Comments must not replace security checks.

---

## 17. Future safety scan contract

A future migration draft creation script must scan the draft for forbidden patterns depending on mode.

Allowed in a migration draft file:

```text
create table
create index
alter table enable row level security
create policy
grant
comment on
```

Forbidden unless separately approved:

```text
insert into
update
delete
truncate
drop table
drop schema
drop policy
drop function
create trigger
create function
security definer
call
perform
execute
rpc
```

For C33-U.2 there is no SQL draft to scan.

---

## 18. Future no-seed-data rule

The future schema draft must not include seed data unless separately approved.

Forbidden in first draft:

```text
insert into state_facts
insert into state_deltas
insert into state_snapshots
insert into state_evidence_links
insert into state_governance_events
```

No sandbox test records should be inserted by schema draft.

---

## 19. Future no-trigger rule

The first schema draft should avoid triggers and functions.

Reason:

```text
State Snapshot logic and side effects must remain explicit and testable.
Automatic triggers could silently update snapshots or create audit/semantic side effects.
```

Triggers/functions require a separate future gate.

---

## 20. Future rollback/repair contract

Future migration draft must include a rollback/repair note, not necessarily destructive SQL.

Required note:

```text
This migration is intended for sandbox review first.
Rollback/repair must be handled by a reviewed follow-up migration.
No destructive rollback is included by default.
```

No destructive down migration should be included without explicit approval.

---

## 21. Future source reference contract

Future draft may use nullable source reference fields first rather than hard foreign keys if the source table names are not fully verified.

Reason:

```text
avoid blocking schema draft on uncertain existing table names
preserve provenance fields
add foreign keys later after schema preflight or audit
```

If foreign keys are added, they must be reviewed explicitly.

---

## 22. Future JSON field contract

Future draft may use JSONB fields for flexible provenance/metadata:

```text
provenance_json
metadata_json
state_value_json
delta_value_json
current_value_json
side_effects_json
derived_from_facts_json
derived_from_deltas_json
derived_from_events_json
```

JSONB must not become a dumping ground for unbounded sensitive data.

---

## 23. Future enum/check contract

Future draft may use text fields with check constraints or postpone enum hardening.

Suggested fields for checks:

```text
state_value_kind
evidence_level
confidence_level
safety_class
privacy_level
delta_direction
snapshot_scope
target_type
source_type
result_status
```

Initial draft should avoid overfitting if the product model is still evolving.

---

## 24. What future schema draft must not solve

The future schema draft must not solve:

```text
State write service
State write route
State hook confirmation UI
manual evidence UI
sensor evidence import
Semantic Capital calculation
Value Object creation
Activity Event correction
Stable Semantic Bundle mutation
medical diagnosis engine
financial advice engine
productivity scoring engine
```

Those belong to later blocks.

---

## 25. Required future draft review checklist

Before any schema draft can be applied, review:

1. Are all private State tables RLS-enabled?
2. Are explicit GRANT statements present and minimal?
3. Is anon blocked from private State tables?
4. Does authenticated access depend on owner-only RLS?
5. Are service_role assumptions backend-only?
6. Are health/fatigue/risk/money fields treated as sensitive?
7. Are State Snapshot rows clearly derived views?
8. Is AI-only confirmation forbidden?
9. Are Semantic Capital writes absent?
10. Are Value Object writes absent?
11. Are seed inserts absent?
12. Are triggers/functions absent unless separately approved?
13. Is rollback/repair strategy documented?
14. Is the target sandbox/non-production?

---

## 26. Future gate map after C33-U.2

Still closed:

```text
EXECUTE C33-T.3 SELECT-ONLY PREFLIGHT
EXECUTE C33-T.STATE-SCHEMA-DRAFT-GATE
EXECUTE C33-T.STATE-SCHEMA-SANDBOX-MIGRATION-GATE
EXECUTE C33-T.STATE-WRITE-SANDBOX-GATE
EXECUTE C33-S.STATE-WRITE-GATE
EXECUTE C33-S.STATE-EVIDENCE-GATE
EXECUTE C33-S.STATE-SNAPSHOT-GATE
EXECUTE C33-S.STATE-SAFETY-GOVERNANCE-GATE
```

C33-U.2 does not open any gate.

---

## 27. Side-effect flags for C33-U.2

Expected values:

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

## 28. What C33-U.2 does not implement

C33-U.2 does not implement:

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

C33-U.2 is documentation-only.

---

## 29. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-U.1 State schema draft boundary.
2. C33-T.5 final lock.
3. C33-T.4 gate packet.
4. C33-T.3 SELECT-only preflight packet.
5. C33-T.2 transaction contract.
6. C33-T.1 schema boundary.
7. C33-S.5 State hooks final lock.
8. C33-S.2 State hook preview skeleton proof.
9. C33-R.5 Value Object final lock.
10. C33-Q.5 Semantic Review final lock.

---

## 30. Recommended next step

Next step:

```text
C33-U.3 — State schema draft packet
```

C33-U.3 should create a draft packet only if allowed by the contract.

Default safe path:

```text
C33-U.3 remains documentation-only unless the user explicitly approves EXECUTE C33-T.STATE-SCHEMA-DRAFT-GATE.
```

---

## 31. C33-U.2 expected result

Expected result:

```text
C33-U.2 RESULT: STATE_SCHEMA_DRAFT_FILE_CONTRACT_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No migration creation.  
No route creation.  
No runtime behavior change.

