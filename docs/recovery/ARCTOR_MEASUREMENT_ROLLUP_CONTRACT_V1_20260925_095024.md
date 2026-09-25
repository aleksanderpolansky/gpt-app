# ARCTor Measurement Rollup Contract V1

Date: 2026-09-25 09:52:14
Baseline: fd0c8e3edce764271fcb69ef5b5fd3400b2b6e68

## Decision

- Parameters remain universal; semantic specificity stays in observation objects.
- rollup_target is an analytics role, not a new ontology node type.
- Missing component values remain UNKNOWN; they are never replaced with zero.
- Explicit zero remains a real observed value.
- A direct aggregate target is preferred when it exists.
- Complete components may derive the target with SUM.
- Direct + complete components are reconciled/checked, never added together.
- Different activity events or measurement bundles are not mixed silently.
- Night sleep candidate uses one universal parameter code: duration.
- Target: Night sleep duration.
- Components: Light sleep duration + Deep sleep duration + REM sleep duration.
- No Supabase schema change and no DB writes in this patch.

## Verification

- dedicated rollup validator: PASS
- ESLint: PASS
- TypeScript --noEmit: PASS
- git diff --check: PASS
- production build: PASS

## Publication state

Commit/push/deploy were not performed by the source patch installer.
This checkpoint is part of the five-file Measurement Rollup Contract V1 source package.
