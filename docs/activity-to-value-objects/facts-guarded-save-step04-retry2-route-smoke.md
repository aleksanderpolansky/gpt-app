# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_SAVE_GATE_GUARDED_PERSISTENCE
# Step 04 Retry 2 / 12 — Contract Preview Request + Route Smoke

Status: route response patch + smoke retry.
Mode: no DB writes, no SQL execution, no external AI calls, no commit/push.

## Why retry was needed

Step 04 Retry 1 proved that GET already exposes `guardedPersistenceContract`, but it did not expose a reusable valid request body for POST smoke.

## Change

The route now exposes:

`contractPreviewRequest`

beside the no-write response preview.

## Safety

This is still no-write.

The route must still report:

- `productionWriteEnabled=false`;
- `dbWriteExecuted=false`;
- `sqlExecuted=false`;
- `openAiCallExecuted=false`;
- `rowsActuallyWritten=0`.

## Next step

If this step passes, Step 05 / 12 should expose the guarded persistence contract in the read-only UI.
