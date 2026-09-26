# Recovery — ARCTOR_ACTIVITY_INTAKE_ROUTING_REVIEW_UI_V1_PATCH_20260926

Baseline: `main @ d0504893d429ab7812bb79da4bf5388e3906143e`

## Trigger

Acceptance test for system typical activity `Ночной сон`:

`Спал 6 часов`

The analyzer correctly found:
- duration = 6 h;
- typical activity = Ночной сон.

The review UI, however, showed four generic missing rows (`Длительность`,
`Длительность`, `Длительность`, `Количество`) without saying which Observation
Object each row belongs to. It also did not show where the detected six hours
would be routed, and manual completion controls appeared only after initial
fact materialization.

## Decision

The review must be semantic and universal:

- show `value -> parameter -> Observation Object` before confirmation;
- show missing/optional values with their target Observation Object;
- distinguish explicit-only optional values from required missing values;
- let the user enter optional values before confirmation;
- after the primary controlled write, supplement only the filled drafts through
  the existing controlled supplement endpoint.

This applies to sleep phases, food components, body composition and any other
parameter with multiple qualified targets.

## Files

Modified:
- `src/lib/activity/activity-intake-source-fact-materializer.server.ts`
- `src/lib/activity/activity-intake-source-fact-supplement.server.ts`
- `src/components/activity/activity-basic-intake-analysis-card.tsx`

Added:
- `scripts/validate-activity-intake-routing-review-ui-v1.mjs`
- `docs/architecture/activity-intake-routing-review-ui-v1.md`
- this recovery note

## Safety

- no SQL;
- no migration;
- no commit/push/deploy in patch installer;
- exact baseline HEAD required;
- clean tracked worktree/staging required;
- rollback on failure;
- pre-existing untracked files preserved.
