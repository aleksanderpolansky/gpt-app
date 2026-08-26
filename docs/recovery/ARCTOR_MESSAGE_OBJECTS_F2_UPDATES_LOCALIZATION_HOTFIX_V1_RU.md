# ARCTor — Message Objects F2 — Updates / Localization Hotfix V1

Дата: 2026-08-26
Release: `ARCTOR_MESSAGE_OBJECTS_F2_UPDATES_LOCALIZATION_HOTFIX_V1`
Baseline: `main @ c0814b800f4dd88bcf0aac7c6c39fa3b46ce3101`

## Причина

F2 native enterprise publication успешно прошёл production build/push и smoke-test: владелец создал тестовую публикацию, она появилась в публичном блоке; guest-view не показывает форму создания.

После UX review зафиксированы три изменения:

1. `Activity / Aktywność` двусмысленно и может означать операционную деятельность предприятия.
2. Блок публикаций переносится в верхний правый слот рядом с Description; `Public offers` — вниз вправо.
3. User-authored `message_objects` подключаются к существующему ARCTor content-localization runtime. Если первый запрос нового locale требует AI-перевода, остальная страница не ждёт: конкретный блок показывает локализованный translation-pending placeholder через React Suspense.

## Канонические UI-названия

- RU — `Новости и публикации`
- PL — `Aktualności`
- EN — `Updates`
- UK — `Новини та публікації`
- DE — `Neuigkeiten`
- ES — `Novedades`
- CS — `Aktuality`

Те же названия используются на public directory page и organization edit dashboard.

## Translation pending UX

- RU — `Переводится на русский…`
- PL — `Tłumaczenie na język polski…`
- EN — `Translating into English…`
- UK — `Перекладається українською…`
- DE — `Wird ins Deutsche übersetzt…`
- ES — `Traduciendo al español…`
- CS — `Překládá se do češtiny…`

Fallback находится внутри карточки Updates: задержка первой локализации не блокирует всю страницу.

## Message localization contract

Runtime adapter: `ARCTOR_MESSAGE_OBJECT_ON_DEMAND_LOCALIZATION_V1`.

Он переиспользует доказанный `generateLocalizedContentBatch` / Nano / budget preflight / AI usage accounting.

- source text остаётся каноническим `message_objects.content_text`;
- `language_code` — только source-locale hint;
- фактический язык определяет существующий AI localization runtime;
- генерируется только текущий requested locale;
- результат кешируется в `message_objects.metadata_json.localizedContent`;
- повторное открытие locale использует кеш;
- старый F2 message без envelope локализуется при первом locale request;
- failure non-fatal: запись остаётся видна в оригинале;
- бюджетирование использует `owner_user_id + created_by_actor_id`, а не guest viewer.

## Layout

Public page:

`Description | Updates`

`Certificates and POINTS | Public offers`

Edit dashboard получает тот же порядок и заголовки.

## Не меняется

- F1 DB schema;
- message identity / audience / distribution contract;
- legacy `chat_messages`;
- external social connectors;
- media upload;
- global `/feed`.

## Следующая точка

После production smoke проверить:

1. PL: `Aktualności` сверху справа;
2. EN guest: `Updates`, composer отсутствует;
3. первый EN/PL запрос русскоязычного поста показывает translation-pending fallback, затем локализованный текст;
4. повторный запрос того же locale использует кеш;
5. public offers снизу справа;
6. edit page имеет те же локализованные заголовки и порядок.
