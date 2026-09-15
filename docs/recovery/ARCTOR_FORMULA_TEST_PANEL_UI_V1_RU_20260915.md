# ARCTOR Formula Test Panel UI V1

Дата: 2026-09-15
Baseline: `78d584dabfe7434bc15fa4b1863c4ad4cb9bfd95`

## Цель

Вывести deterministic no-write `test_draft` в Formula Builder UI.

## Ошибка первого launcher и исправление V1.0.1

Первый `ARCTOR_FORMULA_TEST_PANEL_UI_V1` завершился до любых изменений проекта
на самом первом вызове Git:

`ERROR=NATIVE_FAILED_1_git`

Причина была в служебной функции launcher: параметр назывался `$Args`, что
конфликтует с автоматической переменной PowerShell `$args`. В результате
аргументы native-команды могли не передаваться в `git`.

V1.0.1:

- переименовывает параметр в `$Arguments`;
- все native-вызовы переводит на явные `-Exe` / `-Arguments`;
- при ошибке quiet-команды теперь сохраняет её native output в REPORT.

Так как первый запуск остановился до определения RepoRoot и до patch/write,
commit, staged changes и изменения проекта не создавались.

## Изменения

Добавлен отдельный клиентский компонент:

`src/app/admin/formula-builder/FormulaTestPanel.tsx`

Панель:

- строит шаблон `input key -> null` из `input_contract_json`;
- принимает явные пробные значения;
- вызывает только `POST action=test_draft`;
- показывает evaluation status, output, target unit, unit algebra, testPassed и noWrite;
- показывает, что publish не включён;
- позволяет раскрыть технический объект unit algebra.

Тест доступен только для сохранённой configured version:
`draftIncomplete=false` и `formulaState=configured`.

Несохранённые изменения редактора не тестируются.

## Исправление policy

Во время интеграции обнаружен остаток старого значения `fail` в Formula Builder UI.

Канонический contract и SQL допускают только:
`insufficient_data`, `skip`, `zero`.

UI приведён к каноническому набору.

## Безопасность

Test Panel не вычисляет формулу локально и не читает user facts.
Источник истины — server `test_draft`.

Не включены:

- test evidence persistence;
- publish;
- executor;
- result/snapshot writes;
- lineage;
- recalculation execution.

## Локализация

Панель локализована EN/RU/PL/UK/DE/ES/CS.

## Проверки

Exact baseline, clean worktree, exact patch markers, ESLint, TypeScript,
production build, staged allowlist, `git diff --cached --check`, commit/push,
remote SHA verification.

## Точка продолжения

Следующий gate: test-evidence contract + publish governance.
До него executor и fact write не включать.
