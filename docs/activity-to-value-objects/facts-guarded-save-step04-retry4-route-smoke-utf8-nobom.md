# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_SAVE_GATE_GUARDED_PERSISTENCE
# Step 04 Retry 4 / 12 — Route Smoke with UTF-8 No-BOM POST

Status: route smoke retry.
Mode: no DB writes, no SQL execution, no external AI calls, no commit/push.

## Why retry was needed

Step 04 Retry 3 proved that the exposed `contractPreviewRequest` already has the fields required by the validator.

The previous POST smoke was failing with:

`ACTIVITY_FACTS_SAVE_GATE_INVALID_JSON`

That means the route could not parse the HTTP request body with `request.json()`.

## Retry strategy

This retry sends POST request bodies as UTF-8 without BOM.

## Safety

This retry only calls the route.

The route must still report:

- `productionWriteEnabled=false`;
- `dbWriteExecuted=false`;
- `sqlExecuted=false`;
- `openAiCallExecuted=false`;
- `rowsActuallyWritten=0`.

## Next step

If this step passes, Step 05 / 12 should expose the guarded persistence contract in the read-only UI.
