# GPT-APP / AI-NAVIGATOR
# ACTIVITY_FACTS_SAVE_GATE_GUARDED_PERSISTENCE
# Step 07 / 12 — UI Labels / Encoding Notes / Pre-Commit Audit Boundary

Status: UI labels normalized and pre-commit boundary prepared.
Mode: no DB writes, no SQL execution, no external AI calls, no commit/push.

## Normalized UI route

`/activity-capture/guarded-persistence-contract-preview`

## What changed

- UI shell labels were normalized to ASCII-stable English labels.
- No-write lock labels were made explicit:
  - `LOCKED: false`;
  - `LOCKED: 0`;
  - `BROKEN: true`;
  - `BROKEN: <number>`.
- Encoding note was added:
  - UI shell labels are ASCII-stable.
  - Route payload can still include multilingual source data inside JSON preview blocks.
- The static smoke marker phrase is preserved:
  - `no-write execution plan returned by the save-gate route`.

## Pre-commit audit boundary

The following files are expected to be part of the guarded persistence block before commit:

- `src/app/api/activity/facts/save-gate/route.ts`;
- `src/lib/activity/facts/saveGate/persistenceContract.ts`;
- `src/components/activity-to-value-objects/guarded-persistence-contract-preview.tsx`;
- `src/app/activity-capture/guarded-persistence-contract-preview/page.tsx`;
- `docs/activity-to-value-objects/facts-guarded-save-step01-preflight.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step02-persistence-contract.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step02-retry1-persistence-contract-audit-fix.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step03-route-contract-wiring.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step03-retry1-route-contract-wiring.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step03-retry2-route-contract-wiring.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step04-route-smoke.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step04-retry1-route-smoke.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step04-retry2-route-smoke.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step04-retry4-route-smoke-utf8-nobom.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step04-retry5-minimal-body-smoke.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step04-retry6-node-fetch-smoke.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step05-readonly-ui.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step06-ui-smoke.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step06-retry1-ui-smoke.md`;
- `docs/activity-to-value-objects/facts-guarded-save-step07-ui-labels-precommit-boundary.md`;
- `docs/activity-to-value-objects/reports/*` relevant to this block.

## Safety rules before commit

- No Supabase client import in this route/UI/contract scope.
- No `.from()`, `.select()`, `.insert()`, `.upsert()`, `.update()`, `.delete()`.
- No raw SQL execution.
- No OpenAI/external AI call.
- UI page has no user input fields, no form, no submit, no save button and no write action.
- UI source uses GET only.
- Route still reports:
  - `productionWriteEnabled=false`;
  - `dbWriteExecuted=false`;
  - `sqlExecuted=false`;
  - `openAiCallExecuted=false`;
  - `rowsActuallyWritten=0`.

## Next step

Step 08 / 12 should run the pre-commit audit using this boundary.
