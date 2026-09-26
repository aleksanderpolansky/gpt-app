# Recovery — ARCTOR_DASHBOARD_MULTI_SERIES_UI_POLISH_V1_PATCH_FIX1_20260926

Дата: 2026-09-26
Baseline: `main @ ad0746984246cc10ea970612afef7d232cfdd6e5`

## Предыдущее состояние

Unit Bands V5 был успешно закоммичен и отправлен в `origin/main` как:

`ad0746984246cc10ea970612afef7d232cfdd6e5`

Live acceptance подтвердил:
- две горизонтальные Y-зоны;
- одну общую X-ось;
- `Продолжительность, мин`;
- `Количество, шт.`;
- корректные точки по одной дате.

## Запрошенные UI-изменения

1. Убрать пояснение:
   `Совместимые единицы показаны...`
2. Увеличить отступ между заголовком Y-зоны и графиком.
3. Дополнить заголовок `Сравнение показателей` названиями выбранных ОН.

## Scope

Modified:
- `src/components/figma-dashboard/dashboard-analytics-builder.tsx`

Added:
- `scripts/validate-dashboard-multi-series-ui-polish-v1.mjs`
- `docs/architecture/dashboard-multi-series-ui-polish-v1.md`
- this recovery checkpoint

## Recovery policy

Каждый запуск пишет runtime REPORT:
- в Downloads;
- в `docs/recovery/ARCTOR_DASHBOARD_MULTI_SERIES_UI_POLISH_V1_PATCH_FIX1_20260926_<timestamp>_REPORT.txt`.

Runtime REPORT сохраняется даже при rollback.

## Safety

- DB_WRITES=0
- SQL_EXECUTED=0
- COMMIT=false
- PUSH=false
- DEPLOY=false
- exact HEAD/branch
- clean tracked/staged preflight
- backup before mutation
- rollback on failure
- exact tracked/new allowlists
- pre-existing untracked preserved

## FIX1 — validator correction

Предыдущий запуск применил все четыре функциональные UI-замены, но dedicated
validator дал два ложных FAIL и затем runner выполнил полный rollback.

1. `FAIL title uses ON names`
   - фактический helper использует `item.valueObjectTitle.trim()`;
   - validator ошибочно искал `series.valueObjectTitle.trim()`.

2. `FAIL explanatory paragraph is not rendered`
   - поясняющий JSX-блок в карточке был удалён;
   - validator ошибочно требовал глобального отсутствия
     `independentScaleDescription` во всём файле, хотя ключ остаётся частью
     словаря/других UI участков.

FIX1 меняет только validator:
- проверяет реальный `item.valueObjectTitle.trim()`;
- проверяет отсутствие конкретного старого JSX-блока пояснения в карточке.

Функциональные replacements, V5/V4/V3 regressions, build и safety gates
остаются без изменений.

По предыдущему REPORT:
`ROLLBACK=START -> ROLLBACK=COMPLETE`.

Baseline:
`main @ ad0746984246cc10ea970612afef7d232cfdd6e5`.
