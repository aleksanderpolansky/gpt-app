# C33-J.4 — Schema missing gate blocker and migration draft

## Result from C33-J.3

Live schema preflight returned `missing` for all five required stable semantic bundle persistence tables:

- `stable_semantic_bundles`
- `stable_semantic_bundle_members`
- `stable_semantic_bundle_blocked_audit_items`
- `stable_semantic_bundle_source_snapshots`
- `stable_semantic_bundle_resolver_snapshots`

## Decision

C33-J.4 must not open the explicit sandbox write gate yet.

Reason: the transaction contract from C33-J.2 is valid as a read-only mutation order contract, but the live schema does not contain the target persistence tables.

## C33-J.4 scope

C33-J.4 creates and commits a migration draft only.

It does not execute SQL.
It does not read DB.
It does not write DB.
It does not open the stable semantic bundle persistence gate.

## Migration draft

Migration file:

`supabase/migrations/20260531_c33j4_stable_semantic_bundle_schema.sql`

The migration follows the current Supabase security rule:

`create table -> indexes -> enable row level security -> policies -> explicit GRANT`

## Next decision

After the migration draft is committed, the next safe block should be one of:

1. C33-J.5 final blocked/no-write lock, then C33-K schema execution gate.
2. Or C33-J.5 manual SQL execution gate if the user explicitly chooses to run the schema migration in sandbox.

No write-gate route should be implemented until schema exists and C33-J.3-style SELECT-only preflight returns ready.

