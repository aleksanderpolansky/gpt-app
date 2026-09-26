# ARCTor Dashboard Multi-Series Fact Analytics V4 — Patch V1 Recovery

Дата: 2026-09-26

## Baseline

- branch: `main`
- expected HEAD: `9b4ae3a7cdad437e7b7541ea2cbc353f6846733e`
- предыдущий runtime fix опубликован и проверен.

## Задача

Добавить в Dashboard возможность строить один line-график по нескольким
наблюдаемым показателям одновременно.

Целевой пользовательский пример:

- чашки кофе по дням;
- глубокий сон по дням;
- факт принятия мелатонина по дням.

## Решение

V4 добавляет `metric_key = multi_series` поверх существующей таблицы
`dashboard_analytics_blocks`. Новая схема БД не создаётся.

`config_json` хранит 2–6 рядов.

Поддерживаются:

- numeric — существующий V3 numeric fact resolver;
- presence — наличие подтверждённого факта по выбранному ОН.

Presence не подменяет неизвестность нулём: день без подтверждённого факта
остаётся `null`.

Для разных единиц измерения первая версия использует независимые скрытые
Y-шкалы. Tooltip показывает реальные значения.

## Обратная совместимость

V4 является аддитивным к V3. Старые `numeric_value` блоки остаются прежними.

## Safety

Установщик:

- DB_WRITES=0;
- SQL_EXECUTED=0;
- commit=false;
- push=false;
- deploy=false;
- проверяет exact baseline hashes;
- создаёт backup изменяемых tracked-файлов;
- выполняет rollback при любой ошибке;
- не включает старые untracked recovery artifacts в staging.

## Обязательные проверки

- V4 validator;
- V3 regression validator;
- measurement rollup validator;
- targeted ESLint;
- TypeScript;
- `git diff --check`;
- production build;
- tracked/untracked allowlist.

Этап не закрывается до `RESULT=PASS`.
