# ARCTOR — System Typical Activity Authoring Parity V1.1

Date: 2026-09-22
Release: ARCTOR_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_PARITY_V1_1_20260922
Baseline: 36cae67eefe16371e923810504eca0eafe8ecdb0

## Reason for V1.1

V1 stopped before build/commit because scoped ESLint rejected a synchronous
`loadParameters()` call from inside `useEffect`:

`react-hooks/set-state-in-effect`

No commit or push occurred. The failed V1 runner left the three intended product files
modified in the local working tree.

## Fix

- `loadParameters` is now stable via `useCallback`.
- Initial catalog loading from `useEffect` is deferred through `window.setTimeout`.
- `loadParameters` is included in the effect dependency list.
- `openForm` only changes open state; the effect performs the load.
- No product behavior from V1 is removed.

## Functional scope preserved

The direct SYSTEM Typical Activity constructor now:

1. reuses `/api/activity-template-impact-profiles/catalog` for the same SYSTEM parameter
   catalog used by the working typical-activity tooling;
2. exposes `Выбрать существующий / Создать новый`;
3. creates new SYSTEM parameters through the existing
   `/api/admin/activity-parameter-definitions`;
4. lets the administrator choose active GLOBAL / system_model / leaf Observation Objects;
5. creates or reuses missing SYSTEM `parameter -> ON` assignments before invoking the
   existing canonical system-template materializer.

## Architecture boundary

This release still does NOT implement source-value formulas.

The next stage attaches source-value resolution to each concrete:

`parameter -> Observation Object`

mapping with planned modes:

- direct;
- direct then calculated fallback;
- calculated.

Formula Registry output role `source` and snapshot -> source execution remain separate
work.

## Recovery from failed V1

The V1.1 installer accepts either:

- a clean baseline at `36cae67eefe16371e923810504eca0eafe8ecdb0`, or
- the exact three tracked product modifications left by the failed V1 package.

Any other tracked modification fails closed.

## Acceptance

After deployment open:

`/activity-templates?scope=system&locale=ru`

The parameter section must show existing SYSTEM parameters including `Масса`.

For the protein pilot select:

`Масса -> Употребление протеиновой добавки`

and publish the SYSTEM Typical Activity.

## Actual execution evidence

- Installer entry state: EXACT_FAILED_V1_DIRTY_STATE
- Product commit: `ab35ee6ae8122ab7ca76f8cc8a9c1c811d6beae6`
- git diff --check: PASS
- scoped ESLint: PASS
- production build: PASS
- DB migration: NOT REQUIRED
- Formula Registry changed: NO
- Source Formula Executor changed: NO
