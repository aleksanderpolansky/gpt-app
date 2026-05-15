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

