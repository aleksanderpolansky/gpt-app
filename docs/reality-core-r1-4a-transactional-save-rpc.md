# Reality Core R1-4A — transactional save RPC draft

## Status

Static review only. The SQL draft is not an executable production migration and
must not be applied to Supabase in R1-4A.

## Problem being removed

The current `/api/activity/facts/save-gate` performs independent inserts into:

1. `activity_events`;
2. `activity_event_measures`;
3. `activity_object_facts`;
4. `activity_fact_review_items`;
5. `activity_fact_recalculation_queue`.

If a later insert fails, earlier rows can remain. The route therefore reports
partial `createdIds`.

## R1-4A result

`save_reality_activity_v1(...)` is drafted as one PostgreSQL function call.

A successful call creates:

- one activity event;
- one measure per accepted/edited fact;
- one object fact per measure;
- one review item per fact;
- one recalculation queue row per fact.

The function intentionally has no exception-swallowing handler. Any validation
error, FK error, CHECK error or insert failure aborts the function call and
rolls back every row created by that call.

## Idempotency

The draft adds a unique partial index on:

```text
activity_events(user_id, event_code)
where event_code is not null
```

The route-generated event code remains:

```text
save_gate:<idempotencyKey>
```

The event metadata stores `realityCoreRequestHash`.

- Same user + same idempotency key + same hash: return `idempotent_replay`.
- Same user + same idempotency key + different hash: reject with conflict.
- Concurrent duplicate calls are resolved by PostgreSQL `ON CONFLICT`.

## Current-schema bridge

R1-4A does not yet destructively replace the fact schema.

- canonical `parameterCode` is kept in metadata;
- canonical value and unit are written through the current `measure_type`,
  value and `unit` columns;
- `activity_object_facts` temporarily continues duplicating value/unit;
- actor fields remain nullable but are validated when supplied.

The final schema consolidation remains a later Reality Core block.

## Security

- RPC is `SECURITY DEFINER`;
- `search_path` is fixed to `public, pg_temp`;
- execution is revoked from `public`, `anon`, and `authenticated`;
- only `service_role` receives execute permission;
- `owner_user_id` and actor context must continue to be derived by the
  authenticated Next.js server route, not trusted from browser input.

## Files

- `supabase/patches/20260722_reality_core_r1_4a_transactional_save_rpc_DRAFT_NO_EXECUTION.sql`
- `supabase/diagnostics/20260722_reality_core_r1_4a_transactional_rpc_preflight_READONLY.sql`

## R1-4B acceptance gates

Before an executable migration is created:

1. preflight returns no missing columns;
2. no duplicate `(user_id, event_code)` groups exist;
3. RLS is enabled on all five target tables;
4. no incompatible `save_reality_activity_v1` overload exists;
5. the route payload is mapped to the RPC input;
6. valid runtime test writes all expected rows;
7. forced invalid fact writes zero rows;
8. repeated identical request returns idempotent replay;
9. repeated key with changed payload returns conflict.
