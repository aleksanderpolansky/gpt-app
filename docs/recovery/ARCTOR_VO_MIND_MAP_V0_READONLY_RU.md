# ARCTOR_VO_MIND_MAP_V0_READONLY

Дата: 2026-08-22
Source baseline: `c15d831201b8e3814b2320a94075c765917c345f` (`vo-tree-mobile-l10-insert-v1`)
DB schema change: NONE

## Точка восстановления

Предыдущий слой Tree/Mobile/L10 закрыт runtime-проверкой пользователя как PASS: desktop Tree Table, мобильная иерархия, collapse/expand, локализация actor-owned ЦО/ОН и inline `+` работают на реальных восьми объектах.

Контрольная рабочая онтология перед Mind Map:

- `Human body → Musculoskeletal system → Back muscles → Latissimus dorsi`;
- `Activity → Physical activity → Pull-ups → Narrow-grip pull-up`.

Коммерческие скрытые `Products & Services` остаются вне обычного каталога и не должны появляться на карте.

## Решение V0

Добавляется третий режим каталога:

`Tree | Cards | Map`

`Map` — это только новое READ-ONLY представление тех же `value_objects`, а не новая модель данных.

Источник структуры остаётся один:

`value_objects.parent_value_object_id`.

Никакой отдельной таблицы координат, копии дерева или дополнительного ontology store не создаётся.

## React Flow Free

Используется `@xyflow/react` версии `12.11.3`, MIT-лицензия.

Для V0 не требуется аккаунт React Flow / xyflow и не требуется Pro subscription. Стандартная attribution React Flow остаётся видимой; `hideAttribution` и `proOptions` не используются.

Стили React Flow подключаются глобально после Tailwind, в соответствии с актуальной рекомендацией для Tailwind CSS 4.

## Scope V0

V0 обязан поддерживать:

- реальные root/intermediate/leaf из текущего каталога;
- structural edge `parent → child`;
- deterministic auto-layout без новой layout-библиотеки;
- zoom / pan / pinch / fit view;
- collapse / expand ветви;
- переход из node в существующую карточку ЦО;
- текущие EN/PL/RU/UK/DE/ES/CS локализованные title/description;
- текущие catalog search/filter — карта получает тот же набор visible IDs и ancestors;
- desktop и smartphone;
- корпоративный стиль ARCTor.

V0 сознательно НЕ поддерживает:

- drag/reparent;
- создание ЦО на карте;
- удаление ЦО на карте;
- semantic relations editing;
- undo/redo;
- collaborative editing;
- AI-вызовы;
- запись в БД.

## Read-only guarantees

Компонент Mind Map не выполняет `fetch()` и не вызывает POST/PATCH/PUT/DELETE.

React Flow запускается с:

- `nodesDraggable={false}`;
- `nodesConnectable={false}`;
- visible attribution;
- structural edges, построенными только из уже загруженных catalog rows.

Таким образом, V0 не способен изменить `parent_value_object_id` или любой другой reality-core state.

## Layout

Для V0 используется собственная детерминированная tree-layout функция:

- X = structural depth;
- Y листа/свернутой ветви = следующая свободная строка;
- Y родителя = середина между первым и последним видимым ребёнком;
- независимые roots разделяются дополнительным вертикальным gap.

Это достаточно для проверки реального дерева и не создаёт преждевременную зависимость от Dagre/ELK. Если реальные рабочие ветви покажут необходимость более сложной раскладки, engine выбирается отдельным решением позже.

## Фильтры и локализация

Map не делает отдельный запрос. `ValueObjectCatalogViews` передаёт ему тот же `valueObjects`, уже локализованный текущим content-localization слоем, и ограничивает набор тем же `visibleIds`, который используется Tree при поиске/role filter.

Следовательно, Tree/Cards/Map остаются тремя представлениями одного Reality Core.

## Проверки релиза

Launcher обязан до commit выполнить:

- exact branch/origin/HEAD/blob baseline;
- clean Git;
- package/payload SHA checks;
- `npm view @xyflow/react@12.11.3` до mutation;
- patcher self-test;
- TS transpile + ESLint preflight нового TSX до mutation;
- controlled `npm install --save-exact @xyflow/react@12.11.3`;
- release validator;
- regression Tree Table;
- regression Tree/Mobile/L10;
- regression create/delete;
- regression branch authoring;
- ESLint `--max-warnings=0`;
- полный `npm run build`;
- `git diff --check` и cached diff check;
- exact changed/staged path allowlist;
- commit/push/fetch/remote HEAD verification;
- clean worktree after push;
- rollback к baseline при precommit failure.

## Следующая точка

После runtime PASS V0 следующий этап — **ARCTor VO Mind Map V1**: `+ Intermediate`, `+ Leaf`, guarded Delete и затем отдельным шагом controlled drag/change parent, используя уже существующие backend primitives, а не создавая новые параллельные контракты.

## Precommit lesson V1 → V2

Первая упаковка `V1_READONLY_REAL_TREE` дошла до полного `next build`: компиляция завершилась успешно, но TypeScript semantic check остановил релиз до commit. Причина была в словаре `COPY` каталога: польский блок содержал два одинаковых поля `map`, а чешский блок не содержал `map` вообще. Launcher выполнил `ROLLBACK_PRECOMMIT` и вернул HEAD к baseline `c15d831201b8e3814b2320a94075c765917c345f`; commit/push не выполнялись.

В `V2_COPY_LOCALE_CONTRACT_FIX` исправлены оба дефекта и усилен fail-fast preflight: payload теперь до mutation проверяет, что каждый из семи locale-блоков каталога имеет ровно одно поле `map`. Release validator повторяет тот же контракт. Это фиксируется как обязательный урок для следующих локализованных UI-расширений: `transpileModule` недостаточен для semantic ошибок object literal, поэтому структурные контракты словарей должны иметь отдельную проверку.

## Runtime closure V0

Релиз `vo-mind-map-v0-readonly` успешно установлен commit `911d8c0f0dbb658f07fc47328cac5db760c26ed7`. Launcher V3 прошёл полный release contour: основной validator 53/53, Tree regression 33/33, Mobile/L10 regression 68/68, create/delete regression 47/47, branch-authoring regression 32/32, ESLint, полный Next.js build, `git diff --check`, cached diff check, commit/push и remote HEAD verification.

Runtime-скриншот пользователя подтверждает реальную карту на `/value-objects?locale=pl`: обе контрольные ветви отображаются как structural parent-child graph, польская локализация применяется к названиям/описаниям, corporate ARCTor styling сохранён. V0 считается CLOSED/PASS.

Precommit lesson V2 → V3: после полностью успешного build V2 был остановлен только `git diff --cached --check` из-за blank line at EOF recovery markdown. V3 добавил fail-fast payload whitespace/EOF guard до source mutation. Этот guard обязателен для следующих release packages.

Следующая точка восстановления: `ARCTOR_VO_MIND_MAP_V1_AUTHORING` — controlled `+ Intermediate`, `+ Leaf` и guarded Delete на карте; drag/reparent остаётся отдельным V1.1.
