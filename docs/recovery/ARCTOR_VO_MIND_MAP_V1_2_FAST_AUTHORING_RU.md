# ARCTOR_VO_MIND_MAP_V1_2_FAST_AUTHORING

Дата: 2026-08-24
Source baseline: `1670e9067b3c46a4ae37da44c11a3862aa19590d` (`vo-mind-map-v1-1-controlled-reparent-vertical-v2`)
DB schema change: NONE

## Точка восстановления

Mind Map V0 CLOSED/PASS.
Mind Map V1 AUTHORING CLOSED/PASS.
Mind Map V1.1 CONTROLLED REPARENT CLOSED/PASS: top-to-bottom layout, preview/cancel no-write, forward apply, reverse apply и восстановление исходной структуры доказаны на production runtime.

Контрольная ветвь после завершения reparent-теста снова находится в исходном состоянии:

`Activity → Physical activity → Pull-ups → Narrow-grip pull-up`.

## Цель V1.2

Убрать переход на отдельную страницу при последовательном строительстве большой ветви ЦО/ОН. Кнопка `+` на Map сохраняется, но выбор `Intermediate` или `Leaf` теперь открывает компактный ARCTor modal непосредственно поверх карты.

Modal содержит:

- выбранного structural parent;
- тип создаваемого node;
- Name;
- Description;
- Cancel / Create;
- success state с `Open object` и `Continue on map`.

Для intermediate-parent внутри modal тип можно переключать между Intermediate и Leaf. Для root Leaf не предлагается и fail-closed не разрешается.

## Write contract

V1.2 **не вводит новый endpoint/RPC** и не пишет напрямую в Supabase.

Используется существующий:

`POST /api/value-objects`

с уже проверенными режимами:

- `intermediate_branch_active_v4`;
- `leaf_branch_active_v4`.

Передаются существующие поля `parentValueObjectId`, `title`, `description`, `locale` и отдельный idempotency key для modal request. Серверные branch rules, ownership/access guards, create-time localization и activation semantics остаются авторитетными.

После успешного ответа Map использует возвращённый `valueObject`, нормализует только известные client-side поля текущего отображения и передаёт объект в общий catalog callback. `ActualValueObjectsList` добавляет его в единый `valueObjects` state; Tree/Cards/Map перестраиваются из той же коллекции без полной перезагрузки страницы. Parent автоматически раскрывается, а существующий fit-view реагирует на новый graph.

При следующем каноническом GET `/api/value-objects` сервер снова остаётся источником истины для всех derived/root/localization полей.

## Safety

- double submit блокируется `createPending` + success state;
- idempotency key создаётся при открытии modal и при смене типа до первой успешной записи;
- title ограничен 180 символами;
- description ограничен 4000 символами;
- root → Intermediate only;
- intermediate → Intermediate или Leaf;
- Leaf не получает child create control;
- ошибка сервера показывается в modal и не добавляет fake node в client-state;
- прямой `insert/update` Supabase из React Flow отсутствует;
- V1.1 controlled reparent, guarded delete, collapse/expand и localization должны остаться без регрессии;
- DB migration отсутствует.

## Локализация

Fast Authoring modal имеет UI-copy для EN/PL/RU/UK/DE/ES/CS. Пользовательский Name/Description отправляются с текущим `locale`; существующий server create-time localization pipeline сохраняется без изменения.

## Проверки релиза

Launcher обязан до commit выполнить:

- exact branch/origin/HEAD/blob baseline;
- clean Git;
- package/payload SHA;
- patcher self-test;
- whitespace/EOF guard до mutation;
- in-memory TS transpile + repo ESLint preflight до mutation;
- repo TypeScript semantic virtual-overlay preflight до mutation;
- V1.2 release validator;
- V1.1 controlled reparent regression;
- Tree Table / Tree Mobile L10 / Create Delete / Branch Authoring regressions;
- ESLint `--max-warnings=0`;
- полный `npm run build`;
- `git diff --check` и `git diff --cached --check`;
- exact changed/staged path allowlist;
- commit/push/fetch/remote HEAD verification;
- clean worktree after push;
- precommit rollback к baseline при FAIL.

## Runtime PASS

После deployment достаточно создать один настоящий следующий node, который реально нужен ветви, через Map modal. PASS требует:

1. modal открывается без навигации со страницы Map;
2. правильный parent и role видны до Create;
3. Create успешно проходит один раз;
4. success state появляется в modal;
5. новый node появляется на Map под правильным parent без page reload;
6. Tree показывает тот же node в той же structural позиции;
7. после переключения locale серверная локализация объекта читается штатно.

## Следующая точка

После runtime PASS V1.2 редактор Map считается достаточно быстрым для массового построения настоящих рабочих ветвей. Следующий приоритет должен определяться реальной практикой наполнения ontology, а не добавлением generic-функций React Flow заранее.

## Release candidate V1: FAIL до commit и исправление V2

Первый release candidate V1 корректно дошёл до post-mutation regression suite и был остановлен **до commit/push** историческим V1.1 validator. Сам V1.2 validator прошёл полностью: `95/95`. V1.1 regression дал `95/97`; единственные два FAIL:

- `CREATE_INTERMEDIATE_RETAINED`;
- `CREATE_LEAF_RETAINED`.

Причина не в потере create-функции. Старый V1.1 validator проверял конкретную реализацию V1.1 через наличие строк `/value-objects/${id}/new-intermediate` и `/value-objects/${id}/new-leaf` непосредственно в Map component. V1.2 намеренно заменяет эти map-links на inline modal, при этом полные страницы создания и те же server create modes остаются в проекте. Поэтому исторический validator стал несовместим с новой, но семантически эквивалентной create surface.

Launcher выполнил `ROLLBACK_PRECOMMIT=PASS` к `1670e9067b3c46a4ae37da44c11a3862aa19590d`; commit и push не создавались. Evidence/report: `ARCTOR_VO_MIND_MAP_V1_2_FAST_AUTHORING_20260824_073249_REPORT.txt`.

V2 не подделывает старые route-строки и не возвращает лишнюю навигацию в Map. Вместо этого V1.1 regression validator сделан forward-compatible на уровне поведения: `CREATE_*_RETAINED` проходит либо через legacy full-page route surface, либо через inline surface только если одновременно сохранены существующий `POST /api/value-objects`, соответствующий `*_branch_active_v4` mode, node create request и shared-state callback. V1.2 validator отдельно проверяет сам факт такого dual-path regression contract.

Это изменение validator contract не ослабляет server guards и не меняет DB/API. Полные intermediate/leaf формы продолжают существовать как отдельные маршруты; V1.2 лишь перестаёт использовать их как основной переход из Map.
