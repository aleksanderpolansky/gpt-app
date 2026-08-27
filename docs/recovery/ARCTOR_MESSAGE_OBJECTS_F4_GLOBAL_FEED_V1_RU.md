# ARCTor — Message Objects F4 — Global ARCTor Feed V1

Дата: 2026-08-26
Release: `ARCTOR_MESSAGE_OBJECTS_F4_GLOBAL_FEED_V1`
Baseline: `main @ d250ceef573f20d7ec40f98e5953023e8089b87e`

## Основание

Read-only intake `ARCTOR_MESSAGE_OBJECTS_F4_GLOBAL_FEED_INTAKE_V1` прошёл с `RESULT=PASS`.

Intake подтвердил:

- `message_objects` существует;
- `message_object_distributions` существует;
- `actors` существует;
- `organizations` существует;
- активный public sample = 1;
- feed-eligible ARCTor sample = 1;
- distinct author actors = 1;
- текущий sample имеет organization author;
- DB GETs = 4;
- DB writes = 0;
- Storage writes = 0;
- OpenAI calls = 0;
- отдельного `/feed` data-layer в БД нет и он не требуется.

## Архитектурное решение

F4 не создаёт:

- `publications`;
- `feed_items`;
- новую feed storage table;
- SQL schema changes.

Global Feed — server-side read projection над существующими `message_objects`.

V1 eligibility:

1. `message_objects.audience_scope_code = public`;
2. `message_objects.lifecycle_status = active`;
3. `message_objects.origin_kind_code = native`;
4. `message_objects.origin_provider_code = arctor`;
5. существует `message_object_distributions`:
   - `channel_code = arctor`;
   - `delivery_status = succeeded`;
6. author actor:
   - `status = active`;
   - `actor_type = organization`;
7. organization:
   - `status = active`;
   - `directory_status = published`;
   - `is_public_profile_enabled = true`;
   - `is_listed_in_directory = true`;
   - есть `public_slug`.

Это сознательно означает, что F4 V1 показывает только публичные native ARCTor-публикации опубликованных предприятий.

## Ordering

Детерминированный порядок:

1. `activated_at DESC NULLS LAST`;
2. `created_at DESC`;
3. `id DESC`.

V1 показывает до 30 feed items. Cursor/load-more не добавляется в этот релиз: production sample на момент intake содержит одну eligible запись. Pagination остаётся следующим расширением после появления реального объёма.

## Localization

Переиспользуется существующий:

`ensurePublicMessageObjectLocalizationsV1`

То есть:

- source text остаётся canonical в `message_objects.content_text`;
- requested locale переводится on-demand;
- owner/creator сообщения остаётся billing identity;
- Guest не становится плательщиком AI-вызова;
- перевод кешируется в `metadata_json.localizedContent`;
- повторный locale request использует кеш;
- fallback блока локализован на 7 языков.

Organization name использует уже существующий localized-content envelope при наличии и original `organization_name` как безопасный fallback.

## Public author presentation

Feed item показывает:

- versioned public organization logo endpoint;
- localized/fallback organization name;
- ссылку на `/directory/[slug]`;
- `ARCTor` как source;
- timestamp;
- localized publication text.

Media публикаций не входит в F4 V1. Это остаётся F2M.

## UI / Navigation

Новый route:

`/feed`

Новый основной sidebar item:

- RU — `Лента`
- PL — `Aktualności`
- EN — `Feed`
- UK — `Стрічка`
- DE — `Neuigkeiten`
- ES — `Novedades`
- CS — `Aktuality`

Page header:

- RU — `Лента ARCTor`
- PL — `Aktualności ARCTor`
- EN — `ARCTor Feed`
- UK — `Стрічка ARCTor`
- DE — `ARCTor Neuigkeiten`
- ES — `Novedades de ARCTor`
- CS — `Aktuality ARCTor`

## Cache / freshness

Route `/feed` является dynamic/no-store:

- `dynamic = force-dynamic`;
- `revalidate = 0`;
- `fetchCache = force-no-store`.

Поэтому публикация после успешного F2 POST появляется в feed на следующем request без отдельной feed cache invalidation.

## DB preflight release gate

Launcher выполняет read-only F4 preflight и требует доказать:

- active/public/native/arctor message существует;
- succeeded ARCTor distribution существует;
- active organization actor существует;
- соответствующая organization public/published/listed.

Raw content текста не копируется в DB preflight evidence.

## Production smoke после deploy

1. открыть `/feed?locale=pl`;
2. увидеть `Aktualności ARCTor`;
3. увидеть существующую тестовую публикацию предприятия;
4. открыть её organization name/logo — переход на public directory profile;
5. открыть `/feed?locale=en` как Guest;
6. увидеть `ARCTor Feed`;
7. увидеть cached `ARCTor test publication` без composer;
8. проверить mobile navigation: `Feed/Aktualności/Лента` ведёт на `/feed`;
9. создать вторую публикацию на enterprise page;
10. обновить `/feed` и убедиться, что новая публикация сверху.

## Следующая точка

После production smoke F4 V1:

- либо F2M media;
- либо F4.1 cursor/load-more после появления достаточного количества feed items;
- затем F5 Connected Channels / OAuth.

Fundamental feed entity по-прежнему не создаётся.
