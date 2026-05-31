# C33-U.3 — State schema draft packet

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block: C33-U — State schema draft / persistence readiness.

---

## 1. Decision

C33-U.3 creates a non-executable State schema draft packet.

```text
C33-U.3 RESULT: STATE_SCHEMA_DRAFT_PACKET_COMMITTED_AND_PUSHED
```

Main decision:

```text
C33-U.3 prepares the future State schema draft payload as a documentation packet only.
The State schema draft gate was not explicitly opened.
Therefore C33-U.3 does not create a migration file under supabase/migrations.
C33-U.3 does not execute SQL.
```

C33-U.3 is documentation-only.

```text
NO MIGRATION FILE CREATION.
NO SQL EXECUTION.
NO DB READ.
NO DB WRITE.
NO ROUTE CREATION.
NO PRODUCTION PERSISTENCE.
```

---

## 2. Context inherited from C33-U.2

C33-U.2 defined the future draft file contract.

Future draft creation requires the explicit gate:

```text
EXECUTE C33-T.STATE-SCHEMA-DRAFT-GATE
```

This gate has not been opened.

Therefore this C33-U.3 document is a packet, not a migration.

---

## 3. Packet purpose

The packet prepares what a future SQL draft should contain after a gate.

It is useful because it separates:

```text
schema thinking
security review
future SQL drafting
future migration execution
future State writes
```

The packet allows review before any actual SQL file is created.

---

## 4. Files created by C33-U.3

C33-U.3 creates only this file:

```text
docs/activity/c33-u3-state-schema-draft-packet.md
```

C33-U.3 does not create:

```text
supabase/migrations/20260531_state_persistence_schema_draft.sql
any SQL migration file
any route
any service
any seed data
any Supabase change
```

---

## 5. Future draft packet header

A future migration draft file should start with:

```text
C33-U State persistence schema draft
DRAFT ONLY
DO NOT EXECUTE WITHOUT EXPLICIT GATE
Required future execution gate:
EXECUTE C33-T.STATE-SCHEMA-SANDBOX-MIGRATION-GATE
```

It should also include:

```text
source docs:
  C33-T.1 schema boundary
  C33-T.2 transaction contract
  C33-T.3 schema preflight packet
  C33-T.4 gate packet
  C33-T.5 final lock
  C33-U.1 draft boundary
  C33-U.2 draft file contract
```

---

## 6. Future draft packet table list

Future migration draft candidate tables:

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

Recommended for audit/provenance:

```text
state_evidence_links
state_governance_events
```

C33-U.3 does not create any table.

---

## 7. Future draft section order

The future draft should use this structure:

```text
1. header and execution warning
2. assumptions and non-goals
3. table definitions
4. constraints
5. indexes
6. enable row level security
7. RLS policies
8. explicit GRANT
9. comments/documentation
10. final safety summary
```

Required order:

```text
create table → indexes → enable row level security → policies → explicit GRANT
```

---

## 8. Future state_facts table packet

Future `state_facts` should represent confirmed state evidence.

Recommended fields:

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

Required invariant:

```text
AI signal only must not create confirmed State Fact.
```

---

## 9. Future state_deltas table packet

Future `state_deltas` should represent confirmed changes.

Recommended fields:

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

Required invariant:

```text
State Delta must not silently update State Snapshot.
```

---

## 10. Future state_snapshots table packet

Future `state_snapshots` should represent derived/current views.

Recommended fields:

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

Required invariant:

```text
State Snapshot is derived/current view, not source-of-truth history.
```

---

## 11. Future state_evidence_links table packet

Future `state_evidence_links` should connect State records to evidence.

Recommended fields:

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

Allowed target types:

```text
state_fact
state_delta
state_snapshot
```

Allowed source types:

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

## 12. Future state_governance_events table packet

Future `state_governance_events` should be append-only in spirit.

Recommended fields:

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

Required future behavior:

```text
idempotency trace
decision trace
denial trace
rollback/supersession trace
side-effect transparency
```

---

## 13. Future constraints packet

Future schema draft should consider check constraints for:

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

But over-hardening should be avoided while the product model is still evolving.

Recommendation:

```text
use text + check constraints first
avoid database enum lock-in unless stable
```

---

## 14. Future index packet

Future indexes should support common private-user queries:

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

Indexing rule:

```text
indexes improve speed
indexes do not replace RLS
indexes must not imply public exposure
```

---

## 15. Future RLS packet

Future private State tables must use RLS.

Expected intent:

```text
anon:
  no private State table access

authenticated:
  owner-only access by user_id

service_role:
  backend/server routes only
```

Future RLS policies must prevent cross-user access.

---

## 16. Future explicit GRANT packet

Future migration draft must include explicit GRANT statements near RLS policies.

Expected minimal approach:

```text
authenticated may receive only required operations
anon receives no private State table access
service_role remains backend-only
```

Important rule:

```text
GRANT does not replace RLS.
RLS does not replace GRANT.
Both are required for Supabase Data API safety.
```

---

## 17. Future no-seed-data packet

The first schema draft must not insert seed data.

Forbidden in future draft unless separately approved:

```text
insert state_facts
insert state_deltas
insert state_snapshots
insert state_evidence_links
insert state_governance_events
```

C33-U.3 does not create seed data.

---

## 18. Future no-trigger/function packet

The first schema draft should avoid triggers and functions.

Reason:

```text
State Snapshot updates and governance side effects must remain explicit and testable.
Hidden trigger side effects would be dangerous in health/fatigue/risk/money domains.
```

Separate future gate required for:

```text
database functions
triggers
security definer functions
automatic snapshot recomputation
```

---

## 19. Future source reference packet

Future schema draft may use nullable source reference fields first.

Rationale:

```text
source table names and foreign key targets should be verified before hard links
provenance can exist before strict foreign keys
foreign keys can be added later after schema audit
```

Possible source fields:

```text
source_activity_event_id
source_stable_bundle_id
source_state_hook_id
source_value_object_id
source_manual_evidence_id
source_sensor_evidence_id
```

---

## 20. Future JSONB packet

Future schema draft may use JSONB for flexible payloads:

```text
state_value_json
delta_value_json
current_value_json
provenance_json
metadata_json
side_effects_json
derived_from_facts_json
derived_from_deltas_json
derived_from_events_json
```

But JSONB must not become uncontrolled sensitive-data dumping ground.

---

## 21. Future privacy packet

Default privacy:

```text
private
```

Sensitive by default:

```text
health
fatigue
risk
money
financial confidence
burnout-like signals
family/care load
```

Forbidden in first schema draft:

```text
public State records
directory exposure
marketplace exposure
organization-shared State records
```

---

## 22. Future safety packet

Future schema must support safety classes:

```text
low_sensitivity
medium_sensitivity
high_sensitivity
```

High sensitivity requires:

```text
stricter wording
explicit user confirmation
provenance
rollback/supersession path
no diagnosis/advice/truth claims
```

---

## 23. Future side-effect packet

Future schema and write implementation must support side-effect reporting:

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

For C33-U.3, expected values remain:

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

## 24. Future draft safety scan packet

When a future SQL draft is actually created, the creation script must scan it.

Allowed in future migration draft file:

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

C33-U.3 has no SQL draft to scan.

---

## 25. Future review packet

Before any schema draft can be applied, review must confirm:

1. State tables are private-user scoped.
2. RLS is enabled.
3. Explicit GRANT is present and minimal.
4. anon has no access to private State tables.
5. authenticated is owner-limited by RLS.
6. service_role is backend/server only.
7. health/fatigue/risk/money are sensitive.
8. State Snapshot is not source-of-truth history.
9. AI-only confirmation is forbidden.
10. Semantic Capital writes are absent.
11. Value Object writes are absent.
12. seed data is absent.
13. triggers/functions are absent unless separately approved.
14. sandbox/non-production target is confirmed.

---

## 26. Gates remain closed

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

C33-U.3 does not open any gate.

---

## 27. What C33-U.3 does not implement

C33-U.3 does not implement:

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

C33-U.3 is documentation-only.

---

## 28. What not to repeat unless code changes

Do not repeat unless related code changes:

1. C33-U.2 State schema draft file contract.
2. C33-U.1 State schema draft boundary.
3. C33-T.5 final lock.
4. C33-T.4 gate packet.
5. C33-T.3 SELECT-only preflight packet.
6. C33-T.2 transaction contract.
7. C33-T.1 schema boundary.
8. C33-S.5 State hooks final lock.
9. C33-S.2 State hook preview skeleton proof.
10. C33-R.5 Value Object final lock.

---

## 29. Recommended next step

Next step:

```text
C33-U.4 — State schema draft final review gate
```

C33-U.4 should review whether the project should:

```text
continue documentation-only
prepare a real migration draft under explicit schema draft gate
run SELECT-only preflight first
stop and transfer context
```

No gate should be opened automatically.

---

## 30. C33-U.3 expected result

Expected result:

```text
C33-U.3 RESULT: STATE_SCHEMA_DRAFT_PACKET_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No migration creation.  
No route creation.  
No runtime behavior change.

