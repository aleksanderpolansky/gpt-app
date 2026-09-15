# ARCTOR Formula Unit Algebra + No-Write Test Runner API V1

Дата: 2026-09-15
Baseline: `9b4589b3c401fdcaa5b228a888780a03a310e8bf`

## Цель

Добавить безопасный серверный тест формулы после Formula Builder UI и до publish/executor.

## Что добавлено

- `src/lib/reality-curator/formula-rule-test-runner.server.ts`
- `POST /api/admin/formula-rules` с `action=test_draft`

Test runner принимает `ruleVersionId` и явные `sampleInputs`.

Тестовые значения считаются уже разрешёнными значениями после selector/window/selection. Этот этап не читает пользовательские факты из БД.

## Ограничения тестируемой версии

Тестируется только version со status `draft/testing`, у которой:

- `draftIncomplete=false`;
- `formulaState=configured`;
- expression соответствует `arctor_formula_v1`.

## Детерминированный evaluator

Поддерживаются операции текущего закрытого AST:

literal, input, add, subtract, multiply, divide, min, max, round, if,
eq, ne, gt, gte, lt, lte, and, or, not, coalesce, sum, average, count,
count_unique_days, latest.

Нет `eval`, JavaScript, SQL или внешнего кода.

## Unit algebra V1

Проверка консервативная:

- add/subtract/min/max — одинаковая размерность;
- число-literal в additive context трактуется как число в единице второго размерного аргумента;
- умножение/деление на обычный числовой коэффициент сохраняет размерность;
- деление одинаковых размерностей даёт безразмерный результат;
- round/sum/average/latest сохраняют размерность;
- boolean-операции проверяются отдельно;
- итог сравнивается с value type, dimension и canonical unit целевого параметра.

Составные физические размерности и автоматическое преобразование разных unit codes пока не моделируются. Они получают `unresolved`, а не ложный PASS.

## Missing input

Контракт Formula Registry допускает только:

- `skip` -> `skipped_missing_input`;
- `insufficient_data` -> `insufficient_data`;
- `zero` -> отсутствующий обязательный numeric input подставляется как `0`.

Для `zero` V1.0.1 требует, чтобы selector ссылался на активный numeric parameter.
Если тип не numeric или parameter definition отсутствует, тест блокируется ошибкой.

## Ошибка первого launcher и исправление V1.0.1

Первый `ARCTOR_FORMULA_UNIT_TEST_RUNNER_API_V1` был остановлен на TypeScript до commit.

Ошибка:

`TS2367: types "zero" | "skip" | "insufficient_data" and "fail" have no overlap`

Причина: test runner ошибочно использовал политику `fail`, которой нет в
Formula Registry contract и SQL constraint. Канонический набор политик:
`insufficient_data`, `skip`, `zero`.

Rollback завершился `PASS`; commit и push не выполнялись.

V1.0.1 синхронизирован с каноническим контрактом и добавляет безопасную
семантику `zero` только для активных numeric inputs.

## No-write гарантия

Test runner не пишет:

- Formula Registry;
- `activity_object_facts`;
- lineage;
- recalculation queue;
- любые другие таблицы.

Даже при `testPassed=true` API возвращает `publishEligibleFromThisTest=false`.

## Что остаётся выключено

- publish;
- executor;
- result/snapshot write;
- lineage;
- recalculation execution.

## Следующая точка

Добавить Test Panel в Formula Builder UI: ввод sample values, запуск `test_draft`,
показ output и unit algebra. После этого — отдельный test-evidence/publish governance.
