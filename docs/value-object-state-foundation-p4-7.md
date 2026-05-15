# GPT-APP / P4.7 Value Object State Foundation

Date: 2026-05-15  
Status: P4.7.1 inventory completed; P4.7.2 compatibility decision recorded; P4.7.3 design checkpoint created.

## 1. Inventory result

Existing and protected by RLS:

- value_objects
- offers
- certificates
- purchase_confirmations
- points_transactions
- user_points_wallets
- activity_events
- event_links
- impact_events
- daily_aggregates
- current_snapshots
- activity_corrections
- raw_activity_signals
- activity_processing_logs

Missing bridge/state tables:

- value_object_instances
- activity_event_value_object_instance_links
- value_object_state_deltas
- value_object_state_snapshots
- value_object_daily_aggregates
- value_object_relations
- value_object_closure
- value_object_goal_profiles
- value_object_functions

## 2. Compatibility decision

Existing value_objects is accepted as canonical Value Object table v1.

Do not rename existing columns now.

Existing offers.value_object_id already links offers to value_objects.

Commercial core must not be rewritten:

- certificates stay linked through offer_id -> offers.value_object_id
- purchase_confirmations stay unchanged for now
- points_transactions stay ledger-only
- balances must not be manually edited

Activity foundation remains source of truth:

- activity_events = factual event log
- event_links = generic polymorphic link layer
- impact_events / daily_aggregates / current_snapshots remain current Activity Impact Layer

## 3. P4.7.3 design decision

Create additive bridge/state tables in P4.7.4:

- value_object_instances
- activity_event_value_object_instance_links
- value_object_state_deltas
- value_object_state_snapshots
- value_object_daily_aggregates

These tables must:

- not rename or drop existing tables
- not modify commercial lifecycle
- not replace impact_events
- not create derived state for imported_pending events before confirm
- use RLS enabled
- deny direct public access to anon/authenticated
- be accessed only through backend routes/service logic

## 4. Intended pipeline

Activity Event -> Value Object Instance -> State Delta -> Value Object Daily Aggregates / State Snapshots

Existing pipeline remains:

Raw Activity Signal -> imported_pending Activity Event -> confirm -> completed Activity Event -> impact_events / daily_aggregates / current_snapshots

## 5. Next step

P4.7.4: create one additive migration file.

Expected migration file:

supabase/migrations/0XX_value_object_state_foundation_p4_7.sql

No old table should be dropped, renamed or rewritten.

---

## 7. P4.7.4 migration execution result

Date: 2026-05-15

Migration file:

`supabase/migrations/023_value_object_state_foundation_p4_7.sql`

Applied in Supabase SQL Editor.

Verification result:

| table_name | table_status | rls_status | policy_count |
|---|---|---|---:|
| activity_event_value_object_instance_links | EXISTS | RLS_ENABLED | 1 |
| value_object_daily_aggregates | EXISTS | RLS_ENABLED | 1 |
| value_object_instances | EXISTS | RLS_ENABLED | 1 |
| value_object_state_deltas | EXISTS | RLS_ENABLED | 1 |
| value_object_state_snapshots | EXISTS | RLS_ENABLED | 1 |

Conclusion:

P4.7.4 is completed. The additive Value Object State Foundation tables now exist in Supabase and are protected by RLS with no direct public access.

No existing commercial or activity core tables were dropped, renamed or rewritten.

Next planned step:

P4.7.5 — create helper layer for Activity Event -> Value Object Instance -> State Delta bridge.


---

## P4.7.5-R Smoke and idempotency verification

Date: 2026-05-15

### Scope

This section documents the first controlled rubricator-to-value-object bridge smoke test.

Tested pipeline:

Activity Event
-> rubricator/text fallback mapping
-> Value Object
-> Value Object Instance
-> Event/VOI Link
-> State Delta
-> Daily Aggregate
-> State Snapshot

### Test event

Event:

- id: `3931a981-430e-494d-8b00-fc8f1069f175`
- user_id: `ef87b038-64d4-4ded-8dcd-67ca56093e61`
- status: `completed`
- title: `German marketing handwriting practice`
- duration_minutes: `25`
- started_at: `2026-05-11 15:43:36.235+00`
- ended_at: `2026-05-11 16:08:36.235+00`

### P4.7.5-R-D dry-run smoke

Endpoint:

`POST /api/activity/debug-rubricator-value-object-bridge`

Body:

```json
{
  "eventId": "3931a981-430e-494d-8b00-fc8f1069f175",
  "dryRun": true,
  "createMissingControlledValueObject": true,
  "allowControlledTextFallback": true
}
```

Result:

- HTTP status: `200`
- ok: `true`
- dryRun: `true`
- requestedCreateMissingControlledValueObject: `true`
- effectiveCreateMissingControlledValueObject: `false`
- bridgeExecuted: `false`
- mappingResult.skipReason: `controlled_value_object_missing`
- errors: `[]`

Conclusion:

Dry-run safety works. Dry-run did not create missing controlled Value Objects and did not create VOI/state rows.

### P4.7.5-R-E dry-run no-write verification

After dry-run, all SQL counters were `0`: no controlled value object, no VOI, no event/VOI link, no state delta, no daily aggregate and no state snapshot were created.

### P4.7.5-R-F real controlled bridge run

Real endpoint call was executed with `dryRun: false`, `createMissingControlledValueObject: true`, `allowControlledTextFallback: true`.

Result:

- HTTP status: `200`
- ok: `true`
- stage: `bridge_executed`
- bridgeExecuted: `true`
- mappingResult.mappings.length: `1`
- bridgeResult.created.length: `1`

Created records:

- valueObjectId: `9177fea8-de25-446b-b418-b55a766d53db`
- valueObjectInstanceId: `e395f581-385e-4f68-bffa-33be51ef4b0e`
- linkId: `53d7e339-3ea0-40a6-a64e-6eb98453d2e7`
- stateDeltaId: `0f1583be-1343-4d68-bbe5-37cc465cec0a`
- aggregateId: `8041fbc5-d917-4dc4-9ea3-773198ef43ae`
- snapshotId: `bab651f8-eb3e-480f-aea1-2260e99f74a3`

### P4.7.5-R-G created records count verification

After real run, all required SQL counters were `1`: controlled value object, VOI, event/VOI link, state delta, daily aggregate and state snapshot.

### P4.7.5-R-H details verification

Verified values:

- value_objects.title: `Business German writing practice`
- value_objects.value_type: `skill`
- value_objects.unit_type: `minutes`
- value_objects.default_duration_minutes: `25`
- value_object_instances.duration_minutes: `25`
- value_object_instances.source_event_id: `3931a981-430e-494d-8b00-fc8f1069f175`
- activity_event_value_object_instance_links.relation_type: `executes`
- value_object_state_deltas.metric_key: `duration_minutes`
- value_object_state_deltas.delta_value_numeric: `25`
- value_object_daily_aggregates.metric_value_numeric: `25`
- value_object_state_snapshots.metric_value_numeric: `25`

### P4.7.5-R-I/J/K idempotency guard

Added guard in `lib/activity/valueObjectBridge.ts`: if `value_object_state_deltas` already contains a row for `event_id + value_object_id + metric_key`, the bridge skips duplicate creation and returns `skipReason = already_processed_event_value_object_metric`.

Commit: `c155c17 Add idempotency guard for value object bridge`

### P4.7.5-R-L repeated real run

Repeated real endpoint call returned:

- HTTP status: `200`
- ok: `true`
- bridgeExecuted: `true`
- bridgeResult.created[0].skipped: `true`
- bridgeResult.created[0].skipReason: `already_processed_event_value_object_metric`
- returned existing valueObjectInstanceId: `e395f581-385e-4f68-bffa-33be51ef4b0e`
- returned existing stateDeltaId: `0f1583be-1343-4d68-bbe5-37cc465cec0a`

### P4.7.5-R-M counts after repeated run

After repeated real run, all SQL counters remained `1`, not `2`.

Conclusion:

Idempotency guard works. Repeating the same real bridge call does not duplicate VOI/link/delta rows and does not double-count aggregate/snapshot values.

### Current limitation

This smoke test used `allowControlledTextFallback: true`. `classificationSummary` was empty, so this test did not yet prove the production path through real `entity_classifications`.

Next planned step:

P4.7.6-R — create or use a real approved Object-Action classification for the same activity event and verify the mapper path without controlled text fallback.
