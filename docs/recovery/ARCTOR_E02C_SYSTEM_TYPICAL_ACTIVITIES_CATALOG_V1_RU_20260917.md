# ARCTor — E02C System Typical Activities Catalog V1

Дата: 2026-09-17

Baseline:

221143b9c7dd7162003c12a573c283dfa67412b4

## Исходное подтверждённое состояние

E02 runtime materialization завершён успешно.

Проверка arctor_e02_runtime_verify:

- e02_pass = true;
- template_scope = system;
- owner_user_id = null;
- owner_actor_id = null;
- organization_id = null;
- status = active;
- is_active = true;
- routing_contract_code = parameter_registry_v2;
- profile version = 1;
- parameter_count = 2;
- object_link_count = 2.

Первая системная типовая активность:

- RU: Подъём по лестнице;
- EN canonical: Stair ascent;
- template_id: 40e05f51-b34d-42c2-b4c8-022f2ce112f7;
- profile_id: 6a21528e-9524-46c3-a59e-93b80171aefa.

## Обнаруженный UI gap

Существующий endpoint:

/api/activity-template-impact-profiles

выбирает только:

template_scope = user

и дополнительно ограничивается текущими owner_user_id / owner_actor_id.

Поэтому ownerless SYSTEM template не мог появиться в существующем
экране "Мои типовые активности".

Это не дефект E02 materialization.

Это отсутствовавшая read-surface системного каталога.

## E02C решение

На /activity-templates добавляется URL scope:

- scope=user
- scope=system

По умолчанию:

scope=user

В обоих режимах отображается переключатель:

- Мои типовые активности
- Системные типовые активности

## User scope

Существующий пользовательский редактор сохраняется без изменения
write-path.

## System scope

Добавлен отдельный read-only каталог.

Системный API выбирает только ownerless system templates:

- template_scope = system;
- owner_user_id is null;
- owner_actor_id is null;
- organization_id is null;
- status = active;
- is_active = true.

Активный профиль не фильтруется по owner_user / owner_actor,
так как owner-поля профиля являются provenance автора/куратора,
а не runtime ownership системной типовой активности.

## Localization

Канонический activity_templates.title остаётся английским.

Пользовательское отображение берётся из:

default_metadata_json
  .curatorSystemMaterializationV1
  .localizations[locale]

Fallback:

requested locale
-> en localization
-> canonical template fields.

## Read-only invariant

Вкладка SYSTEM:

- не содержит кнопки создания;
- не содержит кнопки сохранения;
- не вызывает PUT/POST authoring;
- используется только для просмотра системного каталога.

Изменение системной типовой активности остаётся обязанностью
Reality Curator flow.

## Curator navigation

После materialization кнопка:

"Открыть типовые активности"

теперь ведёт на:

/activity-templates?scope=system&locale=...

## DB

DB writes: NONE.

SQL: NONE.

Migration: NONE.

Созданная Stair ascent не изменяется.

## Следующая точка

После deployment проверить:

1. /activity-templates?scope=user&locale=ru
   показывает существующий личный редактор.

2. Переключатель содержит:
   - Мои типовые активности
   - Системные типовые активности.

3. /activity-templates?scope=system&locale=ru
   показывает системный read-only каталог.

4. В списке присутствует:
   Подъём по лестнице.

5. При открытии:
   - canonical EN = Stair ascent;
   - profile version = 1;
   - parameters = 2;
   - observation objects = 2.

6. Duration отображается как Продолжительность.

7. Count отображается как Количество.

8. Объекты наблюдения локализуются через существующий selector.

9. Кнопка из Куратора открывает сразу scope=system.

После подтверждения E02C можно переходить к E03:

user activity
-> recognition of Stair ascent
-> active system profile
-> parameter extraction
-> raw facts.
## E02C runtime-source correction — ESLint gate

Во время release-проверки ESLint остановил публикацию E02C до commit.

Ошибка:

react-hooks/set-state-in-effect

Файл:

src/app/activity-templates/system-activity-template-catalog.tsx

Причина:

при selectedId = null useEffect синхронно выполнял:

- setDetail(null)
- setObjects([])

Эти записи состояния не требовались, поскольку при отсутствии selectedId
интерфейс и так не отображает detail/object state.

Исправление:

ветка заменена на простой ранний выход:

if (!selectedId) {
  return;
}

Результат:

- лишний каскадный render исключён;
- поведение UI не изменено;
- stale detail state не отображается при selectedId = null;
- новый fetch при следующем selectedId заменяет detail/object state.

До обнаружения ошибки:

- commit НЕ выполнялся;
- push НЕ выполнялся;
- DB НЕ изменялась;
- SQL НЕ выполнялся.

После исправления обязательны повторные:

- git diff --check;
- ESLint --max-warnings=0;
- TypeScript --noEmit;
- production build;
- exact staged file audit;
- commit/push.
## E02C TypeScript correction — Supabase import paths

Во время следующего release gate ESLint прошёл успешно:

ESLint --max-warnings=0 = PASS.

TypeScript остановил release до commit.

Ошибки:

TS2307:
Cannot find module '@/lib/supabase'

в:

- src/app/api/activity-template-impact-profiles/system/route.ts
- src/app/api/activity-template-impact-profiles/system/[id]/route.ts

и TS7006 для target_value_object_id row.

Причина TS2307:

общий service-role Supabase client проекта расположен в:

/lib/supabase.ts

а не в:

/src/lib/supabase.ts

Существующая архитектура API использует относительные пути к корневому
lib/supabase.

Исправлено:

system/route.ts:

../../../../../lib/supabase

system/[id]/route.ts:

../../../../../../lib/supabase

Дополнительно targetValueObjectIds получает явную структурную
типизацию строки:

Array<{
  target_value_object_id: unknown;
}>

что исключает implicit any независимо от вывода типов Supabase SDK.

До этой ошибки:

- commit НЕ выполнялся;
- push НЕ выполнялся;
- DB НЕ изменялась;
- SQL НЕ выполнялся.

Обязательный повторный gate:

- ESLint;
- TypeScript;
- production build;
- staged-file audit;
- commit/push.