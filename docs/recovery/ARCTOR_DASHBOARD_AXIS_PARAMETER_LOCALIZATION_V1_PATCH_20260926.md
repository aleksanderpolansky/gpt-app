# Recovery — ARCTOR_DASHBOARD_AXIS_PARAMETER_LOCALIZATION_V1_PATCH_20260926

Дата: 2026-09-26
Baseline: `main @ 3748f2e460cae4073622b132902f7b0e6afcdcf9`

## Предыдущее состояние

UI Polish V1 успешно закоммичен и отправлен в `origin/main`:

`3748f2e460cae4073622b132902f7b0e6afcdcf9`

Live-проверка после публикации подтвердила корректный внешний вид составного
графика, но выявила два остаточных дефекта:

1. на duration Y-axis пропущена отметка `480` между `360` и `600`;
2. при `locale=pl` / других locale названия ОН локализованы, но названия
   параметров в legend и band title остаются на русском.

## Решение

1. Dashboard analytics-data использует общий
   `getActivityParameterPresentation`, уже используемый каталогом параметров.
2. Для небольших explicit tick sets (`<=8`) YAxis получает `interval=0`.
   Для больших наборов остаётся `preserveStartEnd`.

## Scope

Modified:
- `src/app/api/dashboard/analytics-data/route.ts`
- `src/components/figma-dashboard/dashboard-analytics-builder.tsx`

Added:
- `scripts/validate-dashboard-axis-parameter-localization-v1.mjs`
- `docs/architecture/dashboard-axis-parameter-localization-v1.md`
- this recovery checkpoint

## Recovery policy

Каждый запуск создаёт runtime REPORT:
- в Downloads;
- в `docs/recovery/ARCTOR_DASHBOARD_AXIS_PARAMETER_LOCALIZATION_V1_PATCH_20260926_<timestamp>_REPORT.txt`.

Runtime REPORT сохраняется при rollback и не входит в patch allowlist.

## Safety

- DB_WRITES=0
- SQL_EXECUTED=0
- COMMIT=false
- PUSH=false
- DEPLOY=false
- exact main/HEAD
- clean staging/worktree
- backup before mutation
- rollback on failure
- exact tracked/new allowlists
- pre-existing untracked files preserved
