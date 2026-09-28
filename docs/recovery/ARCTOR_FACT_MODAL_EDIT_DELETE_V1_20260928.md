# ARCTOR_FACT_MODAL_EDIT_DELETE_V1_20260928

Live intake: 44 facts; 41 measure-backed source facts; 3 standalone snapshots; 0 derivation edges; 0 snapshot-chain links; 0 measure/fact consistency mismatches.

Design: modal details; transactional edit of canonical measure + fact projections; standalone snapshot edit; derived-result read-only; dependency gates; optimistic concurrency; idempotency; audit; soft delete via fact_status=deleted.

Migration is included but installer does NOT apply it to live Supabase. Apply it separately after successful commit/push, before testing Edit/Delete.
