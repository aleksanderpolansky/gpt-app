# ARCTor — E02C.1 Canonical Typical Activity Catalog Contract Restore

Дата: 2026-09-17

## Baseline

ab6113021b0169764437931ad60d9a8031898a66

## Причина

После E02C страница:

/activity-templates?scope=system

показывала 7 записей, потому что новый API снова определял системную
типовую активность только условием:

template_scope = system

Это противоречило ранее утверждённому контракту системного каталога.

## Уже существующий канонический контракт

Единый server-loader:

src/lib/activity/typical-activity-catalog.server.ts

определяет системную типовую активность через:

default_metadata_json.arctorTypicalActivity.kind = typical_activity

default_metadata_json.arctorTypicalActivity.scope = system

default_metadata_json.arctorTypicalActivity.catalogVersion = reality_model_v1

Именно этот loader уже является общим источником кандидатов для
Reality Curator и AI analyzer.

## E02D evidence

Read-only аудит E02D подтвердил, что остальные видимые system templates
имеют другие назначения.

### Commercial workflow

- Confirmed purchase
- Confirmed sale
- Gift certificate

Они остаются в рабочем коммерческом контуре и НЕ удаляются.

### Legacy/test P4.x

- German marketing handwriting practice
- Knee training health practice

Они имеют исторические связи, registry/impact-rule evidence и сейчас
физически НЕ удаляются.

### Technical / historical AI ingress

- AI Navigator manual activity

Это generic system seed старого single-entry AI composer /
controlled-write контура.

Это НЕ модель измерения времени нахождения пользователя на платформе.

Объект сейчас НЕ удаляется.

## Каноническая системная typical activity пилота

- RU: Подъём по лестнице
- EN: Stair ascent
- template_id: 40e05f51-b34d-42c2-b4c8-022f2ce112f7
- profile_id: 6a21528e-9524-46c3-a59e-93b80171aefa
- profile version: 1
- parameters: 2
- observation object links: 2

## Исправление E02C.1

System list API больше самостоятельно не определяет типовые активности.

Он:

1. вызывает loadSystemTypicalActivityCatalogV1();
2. получает только canonical template IDs;
3. загружает расширенные поля только для этих IDs;
4. сохраняет порядок shared catalog;
5. fail-closed проверяет несовпадение набора.

System detail API:

1. сначала вызывает тот же shared catalog;
2. проверяет членство requested template ID;
3. возвращает 404 для любого system template, который не является
   canonical typical activity;
4. только после этого читает профиль/параметры/ОН.

## Что НЕ делаем

- DB mutation: нет;
- SQL: нет;
- migration: нет;
- удаления шаблонов: нет;
- переименования: нет;
- blacklist по названиям: нет;
- изменения commercial workflows: нет;
- изменения legacy P4 data: нет;
- изменения AI Navigator manual activity: нет.

## Runtime expectation

После deployment:

/activity-templates?scope=system&locale=ru

должен показывать только canonical typical activities.

На текущем пилоте ожидается:

1 запись:

Подъём по лестнице

Карточка:

- canonical EN = Stair ascent
- profile version = 1
- parameters = 2
- observation objects = 2

Прямой вызов detail API для commercial/test/technical template должен
возвращать 404 как для объекта, не являющегося system typical activity.

## Следующая точка

После runtime PASS E02C.1 закрывается.

Далее E03:

raw user activity
→ canonical typical activity recognition
→ Stair ascent
→ active parameter_registry_v2 profile
→ Duration / Count
→ mapped leaf ON
→ source facts.