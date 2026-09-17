# ARCTor — Calculation Model / Formula Catalog Foundation V1

Дата: 2026-09-17

## Baseline

a00f5a5e44611ba6ca3808a86a9376b31a23ae08

## Архитектурное решение

ARCTor использует один канонический язык формул:

`arctor_formula_v1`.

Не создаётся второй AST, второй список математических операций или
отдельный язык формул для типовых активностей.

Существующий файл:

`formula-rule-registry.contract.ts`

остаётся каноническим источником:

- `FORMULA_EXPRESSION_LANGUAGE`;
- `FORMULA_OPERATIONS`;
- `FormulaExpressionNodeV1`;
- `isFormulaExpressionNodeV1`.

## Почему создан отдельный каталог

Существующий Formula Rule Registry описывает конкретное применение:

activity/template/profile
→ source ON + parameter
→ formula
→ target ON + parameter
→ result/snapshot fact.

Формула как интеллектуальный объект должна существовать независимо от
этого применения.

Поэтому добавлены:

- `calculation_model_series_v1`;
- `calculation_model_versions_v1`.

## Calculation Model Series

Содержит идентичность модели:

- model_code;
- title;
- description;
- category;
- scope;
- owner;
- visibility;
- status.

Поддерживаются области:

- system;
- user;
- organization.

Поддерживается видимость:

- private;
- shared;
- public.

Это оставляет архитектурную возможность будущей библиотеки / каталога /
marketplace без изменения математического контракта.

## Calculation Model Version

Содержит конкретную неизменяемую версию расчётной модели:

- `arctor_formula_v1`;
- inputs;
- expression;
- output;
- applicability;
- evidence;
- version;
- publication state;
- provenance metadata.

## Ссылки из мест применения

Существующий consequence Formula Rule получает nullable:

`calculation_model_version_id`.

Существующий parameter→ON route получает nullable:

- `calculation_model_version_id`;
- `calculation_model_binding_json`.

Поэтому одна и та же модель может позднее применяться в разных местах с
разными привязками входов.

## Важная граница

На этом этапе:

- существующие consequence formulas НЕ мигрируются автоматически;
- Formula Builder НЕ переписывается;
- Formula Executor НЕ включается;
- DIRECT/COEFFICIENT/FORMULA mapping пока НЕ реализуется;
- Stair Ascent НЕ изменяется;
- source/result facts НЕ изменяются.

Это отдельный фундамент общего хранилища.

## UI

Добавлена административная страница:

`/admin/formula-catalog?scope=system&locale=ru`

и:

`/admin/formula-catalog?scope=user&locale=ru`

Страница является read-only каталогом на этом этапе.

## Следующий этап

После применения и проверки этой миграции:

1. подключить Formula Builder к Calculation Model Catalog;
2. переносить/создавать reusable Formula Model Version;
3. concrete consequence rule должен ссылаться на model version;
4. Curator Model mapping DIRECT/COEFFICIENT/FORMULA также должен ссылаться
   на model version;
5. coefficient может быть простым интерфейсом над тем же
   `arctor_formula_v1`;
6. только затем возвращаться к E03 runtime.

## Recovery gate

Этап нельзя считать production-complete до:

- SQL rollout;
- DB postcheck;
- runtime открытия formula catalog;
- recovery update с production evidence.
## Production DB rollout — 2026-09-17

Миграция:

`supabase/migrations/20260917180000_calculation_model_catalog_v1.sql`

применена вручную через Supabase SQL Editor.

Проверено после применения:

- `calculation_model_series_v1` — существует;
- `calculation_model_versions_v1` — существует;
- `activity_fact_calculation_rule_versions_v1.calculation_model_version_id` — существует;
- `activity_template_parameter_routes_v2.calculation_model_version_id` — существует;
- `activity_template_parameter_routes_v2.calculation_model_binding_json` — существует.

Postcheck:

`ARCTOR_CALCULATION_MODEL_CATALOG_V1 = PASS_5_5`.

Дополнительный read-only PostgREST/OpenAPI postcheck перед release:

`DB_POSTCHECK=PASS_5_5`.

SQL повторно runner не выполнял.

На момент release:

- Formula Executor остаётся выключенным;
- существующие consequence formulas не мигрированы автоматически;
- существующий Formula Builder не изменён;
- Stair Ascent не изменён;
- новый каталог пока является фундаментом и read-only представлением.

Следующий runtime gate после deployment:

`/admin/formula-catalog?scope=system&locale=ru`

Ожидаемо каталог может быть пустым, пока существующие формулы не перенесены/не опубликованы в новом общем хранилище.
