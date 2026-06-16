# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_SAVE_GATE_GUARDED_PERSISTENCE
# Step 04 Retry 6 / 12 — Node Fetch Route Smoke

Status: route smoke retry.
Mode: no DB writes, no SQL execution, no external AI calls, no commit/push.

## Why retry was needed

Previous PowerShell-based POST smoke attempts still returned `400` without enough visible validation detail.

This retry uses Node `fetch()` and prints important validation fields:

- `errorCode`;
- `errorMessage`;
- `requestSummary`;
- `validation.errors`;
- `validation.warnings`;
- guarded persistence contract blockers/warnings.

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

If this step does not pass, the next action should be an exact route/validator fix based on the printed validation errors.
