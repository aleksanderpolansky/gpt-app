# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_SAVE_GATE_GUARDED_PERSISTENCE
# Step 05 / 12 — Read-only UI for Guarded Persistence Contract

Status: read-only UI added.
Mode: UI only, no DB writes, no SQL execution, no external AI calls, no commit/push.

## Route

`/activity-capture/guarded-persistence-contract-preview`

## What the page shows

The page displays:

- save-gate route status;
- no-write locks;
- validation summary;
- future draft row counts;
- contract blockers;
- contract warnings;
- no-write execution plan JSON;
- guarded persistence contract JSON.

## Safety

The page has no input fields and no save/confirm buttons.

It only performs a GET request to:

`/api/activity/facts/save-gate`

The route must still report:

- `productionWriteEnabled=false`;
- `dbWriteExecuted=false`;
- `sqlExecuted=false`;
- `openAiCallExecuted=false`;
- `rowsActuallyWritten=0`.

## Next step

Step 06 / 12 should run UI smoke/static checks for this page.
