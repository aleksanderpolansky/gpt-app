# ARCTor — Message Objects F4 — Item-Level Localization Hotfix V1

Дата: 2026-08-27
Release: `ARCTOR_MESSAGE_OBJECTS_F4_ITEM_LEVEL_LOCALIZATION_HOTFIX_V1`
Baseline: `main @ c8bb7874f8293b9c9f84db968cccdc108744dbd4`

## Причина

Production smoke F4 Global Feed V1 подтвердил:

- `/feed?locale=pl` работает;
- `/feed?locale=ru` работает;
- существующая публикация отображается;
- после создания второй публикации она появилась сверху;
- on-demand localization работает;
- PL translation после завершения кешируется.

UX-дефект: когда хотя бы одна новая feed item ещё не имела перевода requested locale, вся лента находилась под одним async localization wait и временно заменялась большим `Tłumaczenie na język polski…`.

Это нарушало уже принятый принцип ARCTor: задержка конкретного контента не должна скрывать уже готовые соседние блоки/элементы.

## Исправление

F4 localization разделена на две стадии.

### 1. Feed projection

`getGlobalArctorFeed()` теперь:

- читает eligibility/author/organization;
- формирует хронологический список;
- НЕ ждёт AI localization;
- возвращает source content + localization source metadata.

Это позволяет построить структуру ленты до завершения перевода.

### 2. Cache-first item rendering

Для каждой feed item синхронно проверяется translation cache.

Проверка не доверяет envelope вслепую. Новый:

`readCachedPublicMessageObjectLocalizationV1`

проверяет:

- requested locale поддерживается;
- source locale поддерживается;
- вычисленный source revision совпадает с envelope `sourceRevision`;
- вариант requested locale действительно существует.

Поэтому устаревший translation cache после изменения source content не считается валидным.

### 3. Один batched promise для всех pending items

Если на странице несколько непереведённых записей, hotfix НЕ создаёт отдельный AI-call на каждую карточку.

Все pending items передаются одним списком в существующий:

`ensurePublicMessageObjectLocalizationsV1`

Его batching/budget contract сохраняется.

Все pending item-компоненты ждут один shared localization promise, но каждая находится в своей `<Suspense>` boundary.

Следствие:

- cached item показывается сразу;
- untranslated item остаётся на своём месте;
- у неё видны author/logo/source/timestamp;
- вместо только её body временно показано `Переводится… / Tłumaczenie… / Translating…`;
- другие карточки не исчезают;
- после batch completion pending bodies заменяются локализованным текстом;
- кеш записывается существующим runtime.

## Loading vs Translating

Outer feed Suspense теперь показывает отдельный data-loading текст:

- EN — `Loading updates…`
- PL — `Ładowanie aktualności…`
- RU — `Загрузка ленты…`
- UK — `Завантаження стрічки…`
- DE — `Neuigkeiten werden geladen…`
- ES — `Cargando novedades…`
- CS — `Načítání aktualit…`

`Translating…` используется только внутри конкретной feed item, которая реально ожидает localization.

## Что не меняется

- DB schema;
- `message_objects`;
- eligibility contract F4;
- ordering;
- max 30 items;
- organization-publicity filters;
- owner/creator billing identity;
- Nano/content localization runtime;
- translation cache storage;
- navigation;
- `/feed` route;
- social connectors;
- media;
- pagination.

SQL не требуется.

## Production smoke после deploy

Сценарий:

1. уже иметь хотя бы одну cached PL publication;
2. создать новую RU publication;
3. сразу открыть `/feed?locale=pl`;
4. старая cached PL publication должна оставаться видимой;
5. новая карточка должна быть видна выше неё;
6. только в body новой карточки показывается `Tłumaczenie na język polski…`;
7. после окончания перевода body новой карточки заменяется PL-текстом;
8. `F5` не должен повторно показывать translation pending для уже cached item;
9. проверить EN аналогично при необходимости.

## Статус

После этого smoke F4 можно закрыть полностью как:

- data/model PASS;
- global projection PASS;
- multilingual localization PASS;
- cache PASS;
- item-level streaming UX PASS.
