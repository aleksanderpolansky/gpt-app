# GPT-APP / AI-NAVIGATOR — Step 53 / 76: Activity Facts read API

Дата: 2026-06-17
Блок: `ACTIVITY_FACTS_READ_API_STEP53`
Фаза генерального плана: 8 / 12
Микрошаг: 53 / 76

## Route

`GET /api/activity/facts`

## Цель

Создать server-mediated read API для пользовательской таблицы фактов активности.

Этот endpoint является первым read surface для `activity_object_facts`.

## Security contract

Route должен:

- требовать Auth0 session;
- резолвить authenticated user в `app_users`;
- читать только строки, где `activity_object_facts.user_id = authenticated app_users.id`;
- возвращать JSON, а не redirect;
- возвращать `401` для unauthenticated requests;
- возвращать `403`, если Auth0 user не связан ровно с одной строкой `app_users`;
- не выполнять DB writes;
- не выполнять SQL execution;
- не вызывать OpenAI;
- не открывать direct browser access к private facts tables.

## Schema alignment after Step 53C2

Step 53C показал, что previous draft route пытался читать value-поля, которых нет в текущей `activity_object_facts` migration.

Step 53C2 меняет стратегию:

- route читает только реальные колонки `activity_object_facts`;
- route не требует direct value columns от fact table;
- route возвращает `metricValue: null`;
- route явно помечает `metricValueSource: activity_event_measures_join_pending_step54`;
- количественное отображение будет расширено в Step 54 через UI/read-model join или отдельный enrichment layer.

Основная связь с количественной мерой остаётся через:

- `measure_id`
- `measure_type`
- `unit`

## Таблица-источник

`public.activity_object_facts`

Факты остаются user-owned. Shared/system Value Objects могут быть ссылками через `value_object_id`, но сами fact rows остаются приватными.

## Начальные фильтры

- `limit`
- `semanticObjectKey`
- `valueObjectId`
- `activityEventId`
- `factStatus`

## Ответ

Минимальный response включает:

- `ok`
- `endpoint`
- `readStatus`
- `facts`
- `count`
- `filters`
- `ownership`
- `schemaMode`
- `sideEffects`

## Safety

Step 53C2 не включает:

- DB writes;
- SQL execution;
- OpenAI calls;
- UI wiring;
- correction actions;
- commit;
- push.

UI page `/activity-facts` будет подключена к этому route в Step 54.
## Import path alignment after Step 53C5

Step 53C4 smoke showed a Next.js build error:

Module not found: Can't resolve '@/lib/auth0'

Reason: this project uses root-level lib/auth0 and lib/supabase in existing API routes, not src/lib/auth0 through the @/ alias.

Step 53C5 repairs the route imports to:

- ../../../../../lib/auth0
- ../../../../../lib/supabase

This is an import-path-only repair. It does not change DB schema, SQL, OpenAI, or write behavior.
