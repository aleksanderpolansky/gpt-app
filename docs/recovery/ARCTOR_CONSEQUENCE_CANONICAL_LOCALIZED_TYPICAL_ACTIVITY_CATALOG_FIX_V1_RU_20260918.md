# ARCTor — Consequence Constructor: canonical localized typical activity catalog fix V1

Дата: 2026-09-18

## Состояние

VALIDATED_RELEASE_READY

## Baseline

`262aa6b3deb2e2989d752c71058fe9f1f15bb90b`

## Обнаруженная runtime-проблема

На странице:

`/admin/consequence-constructor?locale=ru`

в выпадающем списке типовых активностей отображались:

- AI Navigator manual activity;
- Confirmed purchase;
- Confirmed sale;
- German marketing handwriting practice;
- Gift certificate;
- Knee training health practice;
- Stair ascent.

Это нарушало уже закреплённый системный контракт каталога типовых
активностей.

Коммерческие workflow, исторические тестовые шаблоны и технический
AI Navigator container не должны становиться типовыми активностями только
потому, что у них `template_scope = system`.

Кроме того, названия брались из `activity_templates.title`, то есть из
канонического английского поля, поэтому при `locale=ru` отображалось
`Stair ascent` вместо `Подъём по лестнице`.

## Корневая причина

`listConsequenceTemplateOptionsV1()` самостоятельно выполнял широкий запрос:

`template_scope = system`
`status = active`
`is_active = true`

и не использовал общий канонический загрузчик:

`loadSystemTypicalActivityCatalogV1()`.

Также функция не принимала locale и не читала локализации:

`default_metadata_json.curatorSystemMaterializationV1.localizations`.

## Исправление

Consequence Constructor теперь обязан использовать тот же канонический
контракт, что и системная страница типовых активностей:

`ARCTOR_TYPICAL_ACTIVITY_METADATA_V1`

через:

`loadSystemTypicalActivityCatalogV1()`.

### Список выбора

`listConsequenceTemplateOptionsV1(locale)`:

1. получает canonical catalog IDs;
2. читает только эти activity templates;
3. локализует название по текущему locale;
4. fallback:
   - requested locale;
   - English localization;
   - canonical `activity_templates.title`;
5. сортирует уже локализованные названия.

### Запись выбора

`bindConsequenceTaskToTemplateV1()`:

1. повторно проверяет, что выбранный template входит в canonical catalog;
2. не позволяет вручную подставить ID коммерческого/test/technical system template;
3. сохраняет локализованное название как snapshot;
4. отдельно сохраняет каноническое английское название.

### API / UI

GET передаёт locale в каталог.

POST `bind_template` получает locale от страницы и использует его при
создании binding snapshot.

## Ожидаемый результат пилота

При `locale=ru` dropdown должен содержать только канонические системные
типовые активности.

В текущем состоянии модели ожидается одна запись:

`Подъём по лестнице`

вместо семи широких system templates.

## Без изменений

- БД не изменяется;
- SQL migration нет;
- excluded templates не удаляются;
- коммерческие workflow не меняются;
- Formula Catalog / F1 не меняется;
- Formula Executor остаётся выключенным.

## Изменяемые файлы

docs/recovery/ARCTOR_CONSEQUENCE_CANONICAL_LOCALIZED_TYPICAL_ACTIVITY_CATALOG_FIX_V1_RU_20260918.md
scripts/validate-consequence-canonical-localized-typical-activity-catalog-v1.mjs
src/app/admin/consequence-constructor/page.tsx
src/app/api/admin/consequence-constructor/route.ts
src/lib/reality-curator/consequence-constructor.server.ts

## Проверки

- dedicated validator;
- `git diff --check`;
- ESLint;
- TypeScript `--noEmit`;
- production build;
- exact staged file set;
- commit/push;
- clean worktree.

## Failure / notes

Нет.