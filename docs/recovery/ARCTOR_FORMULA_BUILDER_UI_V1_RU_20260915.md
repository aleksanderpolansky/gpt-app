# ARCTOR Formula Builder UI V1

Дата: 2026-09-15
Baseline: `dc765aa59a5773281dfe8c428a3e202e33086be0`

## Цель

Дать куратору рабочий интерфейс настройки уже созданного draft rule после server-side Formula Builder validation gate.

## Новый маршрут

Добавлен:

`/admin/formula-builder?versionId=<uuid>&locale=<locale>`

Открывается из карточки существующего draft в «Конструкторе последствий».

## Возможности UI V1

Builder загружает реестр через существующий:

`GET /api/admin/formula-rules`

и находит конкретную version по `versionId`.

Доступно:

- просмотр rule code, scope, version/status;
- просмотр source/target semantic address;
- просмотр result unit;
- редактирование input contract;
- редактирование condition contract;
- редактирование expression AST;
- выбор triggers;
- выбор result fact role;
- выбор missing-input policy;
- сохранение через `POST action=configure_draft`.

## Быстрые формулы

Для распространённых случаев добавлен простой визуальный помощник:

- source;
- source × constant;
- source ÷ constant;
- source + constant;
- source − constant.

Он не создаёт отдельный вид формулы, а лишь формирует тот же `arctor_formula_v1` AST, который затем проходит общий server validator.

## Расширенный режим

V1 также оставляет JSON-редакторы для:

- inputs;
- condition;
- expression.

Это временный административный интерфейс, позволяющий не ограничивать возможности контракта только простыми формулами.

В будущем JSON-поля можно заменить визуальными блоками без изменения реестра и executor contract.

## Связка с Конструктором последствий

В карточке существующего draft добавлена ссылка:

`Настроить формулу`

Она доступна только если у draft есть `versionId`.

## Безопасность

UI сам не считается источником доверия.

Сохранение всегда проходит существующий server action `configure_draft` и Validation Hardening V1.0.1.

Publish, executor и fact write остаются выключены.

## Что ещё не включено

- test run;
- publish;
- unit algebra;
- deterministic executor;
- result/snapshot write;
- lineage;
- recalculation execution.

## Ошибка первого launcher и исправление V1.0.1

Первый `ARCTOR_FORMULA_BUILDER_UI_V1` был остановлен на ESLint до commit.

Ошибка:

`react-hooks/set-state-in-effect`

Причина: initial load вызывался непосредственно из `useEffect`, а функция `load()`
синхронно меняет React state до первого `await`. Текущая конфигурация ESLint
справедливо блокирует такой каскадный render pattern.

Rollback завершился `PASS`; commit и push не выполнялись.

V1.0.1 переносит вызов `load()` в отложенный callback `window.setTimeout(..., 0)`
и очищает timer при размонтировании компонента. Начальная загрузка остаётся
асинхронной, а прямого state update из body эффекта больше нет.

## Проверки

Launcher выполняет:

- exact baseline;
- clean worktree;
- exact patch markers;
- ESLint двух UI-файлов;
- `tsc --noEmit`;
- production build;
- staged exact allowlist;
- `git diff --cached --check`;
- commit/push;
- remote SHA verification.

## Точка продолжения

После Formula Builder UI следующий gate должен быть не executor, а:

1. unit-algebra contract;
2. deterministic test runner без записи фактов;
3. test/publish governance;
4. только после этого executor + result fact + lineage.
