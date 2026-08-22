# ARCTOR_VO_TREE_MOBILE_L10_INSERT_V1

Дата: 2026-08-22
Source baseline: `fb4e1150407e568e15818a16e458a6f7ac6ea146` (`vo-tree-table-v1`)
DB schema change: NONE

## Точка восстановления

`ARCTOR_VO_TREE_TABLE_V1` закрыт как PASS: Tree/Cards, desktop table, mobile compact tree, collapse/expand, counts, полный Next build, commit/push и remote verification прошли. Production evidence находится в `ARCTOR_VO_TREE_TABLE_V1_20260822_163103_REPORT.txt`.

После runtime-проверки выявлены три связанные задачи до Mind Map:

1. На mobile при сворачивании ветви её дочерние leaf/intermediate могли появляться ниже как самостоятельные объекты.
2. UI-подписи переключались на `uk/pl/ru/de/es/cs`, но actor-owned названия и описания ЦО/ОН продолжали отображаться в исходном английском.
3. Для быстрого проектирования дерева не хватало компактной вставки дочернего ЦО прямо между строками Tree Table.

## Root cause mobile

Tree traversal сначала корректно обходил roots и прекращал рекурсию для collapsed parent. После этого второй fallback-loop повторно обходил все ещё `unvisited` объекты и вызывал `walk(..., 0)`. Поэтому скрытый descendant становился визуальным standalone root. На desktop эффект был менее заметен из-за плотной таблицы; на mobile карточки явно теряли иерархию.

Решение: fallback re-walk удалён. Объекты с отсутствующим parent уже входят в `roots`; циклическая/некорректная структура не должна маскироваться как новые корни. Desktop и mobile используют один и тот же массив `rows`.

## Политика локализации

Актуальный общий контракт ARCTor уже существует в `src/lib/localization/contentLocalization.ts` и `contentLocalization.server.ts`:

- 7 языков: `en`, `pl`, `ru`, `uk`, `de`, `es`, `cs`;
- metadata envelope `localizedContent` schema v2;
- immutable original/source evidence;
- `variants` для каждого языка;
- `humanLocales` и `lastEditedLocale` защищают вручную заданную языковую версию;
- AI-перевод использует существующий `ARCTOR_CONTENT_LOCALIZATION_V1`, Nano tier, budget preflight, usage log и context manifest;
- таблица `value_objects` уже разрешена как localizable entity.

Сбой был не в политике, а в подключении surface: `/api/value-objects` локализовал только `scope_code=global` через отдельный global resolver, а actor-owned ЦО возвращал raw.

## Решение локализации ЦО/ОН

1. List API для actor-owned ЦО разрешает `title/description` через общий `localizedContent` resolver с fallback на исходные поля.
2. Новые private root/intermediate/leaf после успешного ontology create сразу запускают существующий content-localization runtime. Ошибка AI локализации не превращает уже сохранённый ЦО в HTTP 500 и не создаёт риск повторного создания; она возвращается как warning.
3. Для существующих объектов без `localizedContent` добавлен actor-scoped one-time backfill endpoint. Он:
   - требует Auth0 + active actor;
   - обрабатывает максимум 5 объектов за AI batch;
   - не трогает global/system;
   - не трогает commercial;
   - не трогает скрытые `Products & Services` и их коммерческий контур;
   - пропускает любой объект, у которого envelope уже существует;
   - сохраняет исходный detected locale как human-protected source locale;
   - объединяет metadata, а не перезаписывает её целиком.
4. Каталог при первом чтении сам вызывает backfill только если API сообщил, что он нужен, затем один раз перечитывает каталог. Если backfill временно недоступен, список остаётся рабочим с исходными fallback-текстами.
5. Detail API, основная карточка ЦО, path/subtree карточки и parent label на страницах Add intermediate/Add leaf используют тот же resolver.

Таким образом, переключение UI locale меняет не только интерфейсные подписи, но и сохранённые локализованные `title/description` ЦО/ОН. Никакого перевода «на лету» при каждом открытии страницы нет после первого backfill/create-time generation.

## Inline insert в Tree Table

После каждой строки root/intermediate появляется небольшой корпоративный `+` на разделительной линии:

- root → `Add intermediate`;
- intermediate → `Add intermediate` или `Add leaf`;
- leaf → структурный `+` не показывается.

Контрол не создаёт новую API/DB модель и использует уже проверенные страницы authoring:

- `/value-objects/{id}/new-intermediate`;
- `/value-objects/{id}/new-leaf`.

Desktop и mobile имеют одинаковую логику. Визуально сохраняются ARCTor primary `#3b6ef8`, soft blue `#eef2ff`, тонкие borders и существующая типографика/скругления.

## Что не меняется

- схема Supabase не меняется;
- hidden commercial `Products & Services` не затрагиваются;
- gift certificates / offers / commerce не затрагиваются;
- structural parent rules не меняются;
- leaf не получает structural children;
- React Flow пока не добавляется;
- drag/reparent не добавляется.

## Evidence / проверки релиза

Launcher обязан до commit выполнить:

- exact branch/origin/HEAD/blob baseline;
- clean Git preflight;
- patcher self-test;
- in-memory ESLint + TS transpile до mutation;
- release validator;
- regression `VO_TREE_TABLE_V1`;
- regression `VO_CREATE_DELETE_UX_V1`;
- regression branch-driven authoring;
- ESLint `--max-warnings=0` всех изменённых TS/TSX;
- полный `npm run build`;
- `git diff --check` и cached diff check;
- exact changed/staged path allowlist;
- commit/push/fetch/remote HEAD verification;
- clean worktree after push;
- rollback до baseline при precommit failure.

## Следующая точка

После runtime proof mobile collapse + localization + inline insert этот слой считается закрытым. Следующий продуктовый этап — **ARCTor VO Mind Map V0 / React Flow Free**, читающий ту же `parent_value_object_id` и использующий те же controlled authoring primitives.
