# ARCTor Dashboard Observation Fact Analytics V3 — patch checkpoint

Date: 2026-09-25

Expected baseline:

`main @ 5c00e3313fdd57316ca914165429e5cf9a6f9298`

## Previous accepted state

Manual `measurementRollupV1` authoring is already published. The target leaf stores the aggregation contract in `metadata_json.measurementRollupV1`.

## This local patch

Adds the first generic Dashboard path:

`line/bar/metric -> facts -> selected leaf observation object -> selected assigned numeric parameter -> daily series`

The semantic selection is persisted in existing `dashboard_analytics_blocks.config_json`.

The runtime reads canonical numeric values from `activity_fact_analytics_inputs_v1` and, when the selected target has a compatible stored rollup rule, executes the existing deterministic `resolveMeasurementRollupV1`.

## Important invariants

- object identity is persisted by UUID;
- parameter identity is persisted by definition UUID + canonical code/unit;
- no sleep-specific analytics branch is introduced;
- missing required rollup components remain UNKNOWN/no point;
- direct value is preferred;
- direct value plus complete components is not double counted;
- no DB migration is introduced;
- no fact, ontology, parameter or rollup write is performed by this installer.

## Acceptance gates

Installer requires:

- branch `main`;
- HEAD exactly `5c00e3313fdd57316ca914165429e5cf9a6f9298`;
- no staged changes;
- no tracked worktree changes;
- exact baseline SHA256 for the four modified tracked files.

After installation it runs:

- `validate-dashboard-observation-fact-analytics-v3.mjs` — expected 39/39 PASS;
- existing `validate-measurement-rollup-target-authoring-v1.mjs` — expected 25/25 PASS;
- ESLint;
- TypeScript `--noEmit`;
- `git diff --check`;
- production Next.js build;
- exact tracked/new-untracked scope checks;
- staging-empty check.

The installer does not commit, push or deploy.

## Next point

After PASS, manually test on the Dashboard:

`Изменение во времени -> Факты по объектам наблюдения -> Продолжительность ночного сна -> duration -> По дням -> 30 дней`

Then return the generated report before commit/push.
