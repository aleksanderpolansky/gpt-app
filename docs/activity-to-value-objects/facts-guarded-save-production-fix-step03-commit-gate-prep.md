# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_GUARDED_SAVE_PRODUCTION_BUILD_FIX
# Step 03 / 5 — Commit Gate Preparation

Status: commit gate prepared.
Mode: no DB writes, no SQL execution, no external AI calls, no commit/push.

## Commit approval phrase

`ACTIVITY_FACTS_GUARDED_SAVE_PRODUCTION_FIX_COMMIT_APPROVED`

## Intended commit message

`Fix guarded activity facts production build`

## Reason for fix

Vercel production build failed on commit `00e9639` because `src/app/api/activity/facts/save-gate/route.ts` had two `routeLayer` properties in the same object literal.

After the first fix, local TypeScript also revealed that `persistenceContract.ts` used `validation.normalizedBody`, while `ActivityFactsSaveGateValidationResult` did not expose that field.

## Fix scope

- `src/app/api/activity/facts/save-gate/route.ts`
  - keeps canonical `routeLayer: ROUTE_LAYER`;
  - changes the audit marker property to `routeMarker`.

- `src/lib/activity/facts/saveGate/requestValidation.ts`
  - adds `normalizedBody: Record<string, unknown>` to `ActivityFactsSaveGateValidationResult`;
  - returns `normalizedBody: requestRecord`.

- documentation/report files for the production build fix.

## Verification already completed in Step 02

- targeted lint passed;
- typecheck passed after excluding local backup artifacts;
- production build passed after excluding local backup artifacts;
- `_local_artifacts` was restored after verification.

## Safety

- No DB write.
- No SQL.
- No external AI.
- No commit in this gate-prep step.
- No push in this gate-prep step.

## Next step

After the exact approval phrase is received, Step 04 / 5 should perform commit only.
