# ARCTor — F1 Formula Rule → Calculation Model Catalog Bridge V1

Дата: 2026-09-18

## Состояние выполнения

VALIDATED_READY_FOR_DB_ROLLOUT_REVIEW

## Baseline

`807db78d68c292b07c684f2171133c47dfad9328`

## Предыдущий закрытый этап

F0 Calculation Model / Formula Catalog Foundation завершён и находится в
production.

Production baseline перед F1:

`807db78d68c292b07c684f2171133c47dfad9328`

Общий каталог формул существует:

- `calculation_model_series_v1`;
- `calculation_model_versions_v1`.

Канонический язык формул:

`arctor_formula_v1`.

## Цель F1

Связать существующий Formula Rule Registry / Formula Builder с общим
Calculation Model Catalog так, чтобы опубликованная формула могла стать
самостоятельной переиспользуемой расчётной моделью.

При этом F1 не включает Formula Executor и не создаёт факты.

## Архитектурная граница

Calculation Model хранит самостоятельную расчётную модель:

- абстрактные входы;
- выражение `arctor_formula_v1`;
- описание выхода;
- applicability;
- evidence;
- версию.

Formula Rule остаётся конкретным применением:

- activity/template/profile;
- source ON + parameter;
- target ON + parameter;
- triggers;
- condition;
- missing-input policy;
- result fact role.

Таким образом один Calculation Model в дальнейшем сможет использоваться
в разных местах применения.

## F1 — пользовательский поток

Для опубликованной rule version в Formula Builder появляется явное действие:

`Добавить в каталог формул`

Действие:

`materialize_calculation_model`

вызывает серверный bridge:

`materializePublishedFormulaRuleCalculationModelV1`

и DB RPC:

`materialize_published_formula_rule_calculation_model_f1_v1`

## Materialization contract

Разрешена только опубликованная версия rule.

RPC:

1. проверяет `status_code = published`;
2. проверяет `expression_language_code = arctor_formula_v1`;
3. создаёт или находит `calculation_model_series_v1`;
4. материализует `calculation_model_versions_v1`;
5. переносит expression;
6. преобразует input selectors в абстрактный input contract;
7. переносит output contract;
8. переносит test evidence и publish audit;
9. сохраняет applicability исходного rule;
10. записывает
   `activity_fact_calculation_rule_versions_v1.calculation_model_version_id`;
11. повторный вызов для уже связанной версии является идемпотентным.

## Важное ограничение F1 V1

В первой версии bridge все входы должны иметь:

`parameterDefinitionId`

Если вход невозможно выразить через параметр реестра V1, bridge должен
завершиться ошибкой, а не создавать неполную модель.

## Безопасность

DB RPC:

- `security definer`;
- закрыт для `public`;
- закрыт для `anon`;
- закрыт для `authenticated`;
- разрешён только `service_role`.

## Что F1 НЕ делает

- Formula Executor НЕ включается;
- source facts НЕ создаются;
- result facts НЕ создаются;
- snapshot facts НЕ создаются;
- существующие опубликованные formula rules НЕ переносятся автоматически;
- каталог не меняет старое правило без явного действия администратора.

## API contract

`materialize_calculation_model` должен присутствовать ровно в трёх местах:

1. реальная ветка обработки API;
2. `allowedActions` для retired raw-draft action;
3. `allowedActions` для invalid action.

Это отдельно проверяется валидатором.

## Исправления в ходе подготовки F1

### V1.0.1

Исправлен recovery checkpoint:

- удалены неразрешённые PowerShell placeholders;
- добавлены проверки recovery integrity;
- валидатор расширен до `PASS_15_15`.

### V1.0.2 / V1.0.3

Обнаружено, что два массива `allowedActions` имеют разные отступы.

V1.0.2 корректно остановился до изменения.

V1.0.3 исправил оба массива независимо.

Проверка:

`ACTION_DOCUMENTED_IN_ALLOWED_ACTIONS`

должна проходить.

### V1.0.4

Recovery полностью переписан из single-quoted template, чтобы Markdown
backticks не могли превратиться в управляющие символы Windows PowerShell.

Обязательный gate:

`RECOVERY_NO_CONTROL_CORRUPTION`

## Изменяемые файлы F1

docs/recovery/ARCTOR_F1_FORMULA_RULE_TO_CATALOG_BRIDGE_V1_RU_20260918.md
scripts/validate-formula-rule-to-calculation-model-bridge-v1.mjs
src/app/admin/formula-builder/page.tsx
src/app/api/admin/formula-rules/route.ts
src/lib/reality-curator/calculation-model-rule-bridge.server.ts
supabase/migrations/20260918093000_formula_rule_to_calculation_model_bridge_v1.sql

## Миграция F1

`supabase/migrations/20260918093000_formula_rule_to_calculation_model_bridge_v1.sql`

На этапе подготовки source migration НЕ выполняется.

## Проверки

Ожидаемые обязательные gates:

- `git diff --check`;
- ESLint;
- `VALIDATOR=PASS_16_16`;
- TypeScript `--noEmit`;
- production build;
- exact F1 change set;
- recovery control-character scan.

## Текущее состояние

VALIDATED_READY_FOR_DB_ROLLOUT_REVIEW

## Failure / notes

Нет.

## Точка продолжения

Если состояние `VALIDATED_READY_FOR_DB_ROLLOUT_REVIEW`:

1. проверить PACKAGE и REPORT;
2. подготовить контролируемый SQL rollout;
3. применить F1 migration вручную;
4. проверить DB postcheck;
5. только после DB evidence делать commit/push;
6. выполнить runtime smoke test Formula Builder → Formula Catalog.
## Production DB rollout and F1 release

Дата выполнения: 2026-09-18 11:52:40 +02:00

Состояние: DB_VERIFIED_RELEASE_VALIDATION_RUNNING

### Production DB evidence

Миграция:

`supabase/migrations/20260918093000_formula_rule_to_calculation_model_bridge_v1.sql`

применена вручную через Supabase SQL Editor.

Подтверждён postcheck:

- `contract = ARCTOR_FORMULA_RULE_TO_CALCULATION_MODEL_BRIDGE_V1`;
- `rpcPresent = true`;
- `catalogSeriesPresent = true`;
- `catalogVersionsPresent = true`;
- `ruleLinkColumnPresent = true`.

Дополнительный read-only runtime audit перед release:

`F1_DB_POSTCHECK=PASS_4_4`.

### Release validation

- `git diff --check` — PASS;
- ESLint — PASS;
- `VALIDATOR=PASS_16_16`;
- TypeScript `--noEmit` — PASS;
- production build — PASS;
- exact staged file set — PASS;
- recovery control-character scan — PASS.

### Git release

Commit:

`PENDING_COMMIT`

Commit message:

`feat(formulas): bridge published rules to formula catalog`

После push:

- `HEAD == origin/main`;
- worktree clean.

### Безопасность

- SQL этим release-runner повторно НЕ выполнялся;
- Formula Executor НЕ включён;
- source/result/snapshot facts НЕ создавались;
- существующие published rules НЕ материализуются автоматически;
- перенос в каталог остаётся явным действием администратора
  `materialize_calculation_model`.

### Следующая точка

Runtime smoke test:

1. открыть Formula Builder;
2. выбрать опубликованную formula rule;
3. нажать `Добавить в каталог формул`;
4. открыть `/admin/formula-catalog?scope=system&locale=ru`;
5. убедиться, что создана самостоятельная Calculation Model Version;
6. повторное нажатие должно быть идемпотентным.

### Failure / notes

Нет.
