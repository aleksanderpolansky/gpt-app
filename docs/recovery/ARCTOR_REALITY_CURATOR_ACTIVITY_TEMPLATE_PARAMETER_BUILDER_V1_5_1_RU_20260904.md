# ARCTor — Recovery checkpoint: Activity Template Parameter Builder V1.5.1

Дата подготовки: 2026-09-04
Ожидаемый baseline: `3c405d51e8ef814bcc643941be4e52681f5c2402`
Релиз: `ARCTOR_REALITY_CURATOR_ACTIVITY_TEMPLATE_PARAMETER_BUILDER_V1_5_1`

## 1. Точка продолжения

Предыдущий production baseline после `ARCTOR_REALITY_MODEL_CURATOR_DUAL_SCOPE_BOOTSTRAP_V1_4`:
`3c405d51e8ef814bcc643941be4e52681f5c2402`.

Пилотный сигнал: «шёл пешком на работу 15 минут».

Уже работают очередь куратора, принятие сигнала, ручная проверка системной типовой активности, проверка каталога параметров, системный параметр `Количество / Count` (`count`), а также parameter-independent конструктор ОН с ортогональными признаками `root/intermediate/leaf` и `Private/System`.

## 2. Что произошло с V1.5

Попытка `ARCTOR_REALITY_CURATOR_ACTIVITY_TEMPLATE_PARAMETER_BUILDER_V1_5` была корректно остановлена release gate на шаге `TypeScript --noEmit`.

Фактическая ошибка:

`src/app/api/admin/reality-curator/signals/template-parameters/route.ts(324,5): TS2345`

Выражение внутри `Boolean(...)` имело тип `true | JsonRecord | null`, что в фактическом project TypeScript contract не прошло проверку.

До сбоя успели пройти:

- exact baseline/blob contracts;
- clean worktree;
- read-only DB preflight;
- проверка `count`;
- changed-files ESLint без ошибок и предупреждений;
- full ESLint no-regression.

После сбоя runner выполнил rollback:

- `ROLLBACK_GIT_DIFF_CHECK: PASS`;
- `ROLLBACK_WORKTREE_CLEAN: YES`;
- commit/push отсутствовали;
- release-time DB mutations отсутствовали.

Следовательно baseline остаётся `3c405d51e8ef814bcc643941be4e52681f5c2402`.

## 3. Исправление V1.5.1

Архитектура и UX V1.5 не меняются. Исправляется только TypeScript-safe вычисление завершённости parameter-specific measurable-object mapping.

Было логически:

`Boolean(decision && (result !== "new_leaf_required" || targetLeaf))`

Стало явно boolean:

`decision !== null && (result !== "new_leaf_required" || targetLeaf !== null)`

Это сохраняет исходную семантику:

- без decision mapping не завершён;
- для решения, отличного от `new_leaf_required`, decision достаточно;
- для `new_leaf_required` обязательно наличие созданного target leaf.

## 4. Маршрут конструктора, который вводит V1.5.1

После `related_parameter_catalog_checked`:

1. **Параметры типовой активности**.
2. Выбрать существующий системный параметр либо создать новый системный параметр.
3. Показывать уже выбранные параметры.
4. Предлагать `+ Добавить дополнительный параметр`.
5. Запретить подтверждение пустого набора.
6. Подтвердить набор отдельным решением куратора с комментарием.
7. После подтверждения запускать **Определение измеримого объекта** отдельно для каждого выбранного параметра.
8. При необходимости строить `root → intermediate → … → leaf`.
9. После завершения одного параметра переходить к следующему.

Типовая активность не считается полностью определённой без хотя бы одного параметра.

## 5. Архитектура ОН не меняется

- структурные роли: `root | intermediate | leaf`;
- intermediate-уровней может быть сколько угодно;
- `Private/System` — отдельное свойство доступа/происхождения каждого ОН;
- Private actor-owned;
- System ownerless global system-model draft до отдельного выпуска.

## 6. Безопасность релиза

Release-time:

- migrations: `0`;
- DB mutations: `0`;
- OpenAI calls: `0`.

Runtime mutations возможны только после явных действий куратора в production UI.

Runner обязан до commit/push снова выполнить полный набор gates: exact baseline/blob, read-only DB preflight, ESLint no-regression, changed-files ESLint, TypeScript noEmit, Next build, `git diff --check`, allowlist changed files, commit/push/remote verification.

## 7. Следующая ручная проверка после PASS

На production открыть текущий сигнал.

Ожидается:

1. После зелёного блока проверки параметров появляется **«Параметры типовой активности»**.
2. Видны уже выбранные параметры.
3. Можно выбрать `Количество / count`.
4. Можно создать новый системный параметр и сразу добавить его в набор.
5. После первого параметра видна кнопка `+ Добавить дополнительный параметр`.
6. Пустой набор подтвердить нельзя.
7. После подтверждения появляется контекст конкретного параметра, затем **«Определение измеримого объекта»**.
8. При нескольких параметрах mapping выполняется последовательно для каждого.
9. Проверить append-only журнал и current-stage.

Этап не считать закрытым без production UI evidence, DB/log postcheck и следующего актуального checkpoint в `docs/recovery/`.
