# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_SAVE_GATE_GUARDED_PERSISTENCE
# Step 04 / 12 — Route Smoke Checks for Guarded Persistence Contract

Status: runtime smoke-check step.
Mode: route smoke only, no DB writes, no SQL execution, no external AI calls, no commit/push.

## Checks

This step verifies:

- GET `/api/activity/facts/save-gate`;
- valid POST preview;
- explicit write-intent remains blocked with 409;
- invalid JSON returns 400;
- invalid structured body returns 400;
- response contains `guardedPersistenceContract`;
- no-write flags remain false/zero.

## Safety

This smoke step only calls the route.

The route must still report:

- `productionWriteEnabled=false`;
- `dbWriteExecuted=false`;
- `sqlExecuted=false`;
- `openAiCallExecuted=false`;
- `rowsActuallyWritten=0`.

## Next step

If this step passes, Step 05 / 12 should expose the guarded persistence contract in the read-only UI so the user can see the future database row mapping.
