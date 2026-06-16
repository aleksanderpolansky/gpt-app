# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_SAVE_GATE_GUARDED_PERSISTENCE
# Step 04 Retry 5 / 12 — Route Smoke with Minimal Valid Body

Status: route smoke retry.
Mode: no DB writes, no SQL execution, no external AI calls, no commit/push.

## Why retry was needed

Previous smoke attempts used the large fixture-style `contractPreviewRequest` from GET.

This retry uses a minimal valid request body that directly matches `requestValidation.ts`:

- `routeMode`;
- `sourcePackageId`;
- `idempotencyKey`;
- `factDecisions`;
- `editedFactDecisions`;
- `valueObjectCandidateDecisions`;
- `clientSafetyConfirmation`.

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
