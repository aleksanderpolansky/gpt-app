# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_SAVE_GATE_GUARDED_PERSISTENCE
# Step 03 / 12 — Route Contract Wiring

Status: route response now includes guarded persistence contract preview.
Mode: no DB writes, no SQL execution, no external AI calls, no commit/push.

## What changed

The save-gate route now imports:

`buildActivityFactsGuardedPersistenceContract`

and adds a no-write response section:

`guardedPersistenceContract`

## Important

This does not enable persistence.

The new response object is a contract preview only. It shows draft row mapping for future guarded persistence.

## Expected route behavior

The route must still preserve:

- `productionWriteEnabled=false`;
- `dbWriteExecuted=false`;
- `sqlExecuted=false`;
- `openAiCallExecuted=false`;
- `sideEffects.rowsActuallyWritten=0`.

Explicit write-intent must remain blocked until a separate runtime write gate is implemented.

## Next step

Step 04 / 12 should run route smoke checks and confirm that:

- GET response contains `guardedPersistenceContract`;
- valid POST response contains `guardedPersistenceContract`;
- write-intent remains blocked with 409;
- invalid requests still return 400;
- no-write flags remain false/zero.
