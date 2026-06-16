# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_SAVE_GATE_GUARDED_PERSISTENCE
# Step 02 / 12 — Persistence Service Contract and Row Mapping

Status: contract and row mapping only.
Mode: no DB writes, no SQL execution, no external AI calls, no commit/push.

## Purpose

This step defines how the future guarded persistence service should map a validated save-gate request and no-write execution plan into draft rows.

It does not execute persistence.

## New module

`src/lib/activity/facts/saveGate/persistenceContract.ts`

## Draft row groups

The contract prepares draft row groups for:

- `activity_events`;
- `activity_event_measures`;
- `activity_object_facts`;
- `activity_fact_review_items`;
- `activity_fact_recalculation_queue`.

## Safety

The module is contract-only.

It must not include:

- Supabase import;
- `.from()` / `.select()` calls;
- `.insert()` / `.upsert()` / `.update()` / `.delete()` calls;
- SQL execution;
- external AI calls;
- runtime DB write gate.

## Important limitation

The draft rows are not real database rows. They are an intermediate contract for the later guarded service.

Real persistence must remain blocked until a separate runtime write gate is implemented and tested.

## Next step

Step 03 / 12 should wire this contract into the save-gate route response as another no-write preview section.
