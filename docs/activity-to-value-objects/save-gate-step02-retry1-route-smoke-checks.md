# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_SAVE_GATE_CONTROLLED_IMPLEMENTATION
# Step 02 Retry 1 / 12 — Save Gate Route Contract Smoke Checks

Status: route contract smoke checks with PowerShell ConvertFrom-Json compatibility fix.
Date: 2026-06-15
Mode: no DB writes, no SQL, no external AI calls, no commit/push.

## Why retry was needed

The original Step 02 smoke script used:

`ConvertFrom-Json -Depth 60`

In the current Windows PowerShell environment this parameter is not supported for `ConvertFrom-Json`, so JSON parsing failed even though HTTP status checks matched:

- GET returned 200;
- POST preview returned 200;
- POST write-intent returned 409.

Retry 1 removes the unsupported `-Depth` parameter.

## Route checked

`/api/activity/facts/save-gate`

## Expected behavior

- `GET` returns `200`.
- `POST` with `routeMode=contract_preview_only` returns `200`.
- `POST` with `routeMode=future_server_mediated_write` returns `409`.
- Every response must report:
  - `dbWriteExecuted=false`;
  - `sqlExecuted=false`;
  - `openAiCallExecuted=false`;
  - `productionWriteEnabled=false`;
  - `sideEffects.rowsActuallyWritten=0`.

## Next step

Step 03 / 12 should add server-side request validation helpers for the save-gate body, still without DB writes.
