# ARCTor — Message Objects F2 — Native Enterprise Publication

Дата: 2026-08-26
Release: `ARCTOR_MESSAGE_OBJECTS_F2_NATIVE_ENTERPRISE_PUBLICATION_V1_2`
Baseline: `main @ c023fa6d2fb3b067ceaa9e0d4bdbe5a03adda8cb`

## Цель

Первый end-to-end сценарий поверх F1 `message_objects`:

`enterprise owner -> native ARCTor public message -> ARCTor distribution -> public enterprise page`.

Внешние Facebook / Instagram / LinkedIn / TikTok / YouTube API на F2 не используются.

## Реализация

Добавлены:

- owner-only POST `/api/organizations/[id]/messages`;
- server helper чтения public enterprise messages;
- owner composer в блоке Activity публичной страницы предприятия;
- public feed того же блока;
- один canonical `message_object` на публикацию;
- один `message_object_distributions` row с `channel_code = arctor`.

## Identity

Для публикации предприятия:

- `owner_user_id` = текущий app user;
- `created_by_actor_id` = активный actor пользователя;
- `author_actor_id` = active organization actor;
- `audience_scope_code = public`;
- `origin_kind_code = native`;
- `origin_provider_code = arctor`.

API дополнительно проверяет, что активный actor совпадает с `organizations.owner_actor_id`.

## Failure semantics

Создание идёт:

1. `create_message_object_v1` в draft;
2. ARCTor distribution в `pending`;
3. `activate_message_object_v1`;
4. distribution -> `succeeded`.

Если distribution/activation/final delivery update падает, source route пытается удалить созданный canonical message; FK cascade удаляет его технические дочерние rows. Публичный read показывает только:

- `audience_scope_code = public`;
- `lifecycle_status = active`;
- ARCTor distribution со статусом `succeeded`.

## UX

На публичной странице предприятия существующий placeholder `Public actions` заменён на `Activity`.

Владелец видит inline composer.
Обычный посетитель видит только опубликованные записи.
Первый F2 поддерживает текст до 5000 символов.
Media отложены на следующий микрошаг.

## Локализация

UI copy добавлен для EN / PL / UK / RU / DE / ES / CS.

## Что F2 НЕ делает

- не мигрирует `chat_messages`;
- не создаёт direct messages;
- не создаёт reviews/comments UI;
- не подключает external social APIs;
- не создаёт media upload;
- не создаёт global `/feed`.

## V1 failure / V1_1 correction

Первый launcher `ARCTOR_MESSAGE_OBJECTS_F2_NATIVE_ENTERPRISE_PUBLICATION_V1` корректно прошёл:

- F1 DB preflight;
- baseline ESLint snapshot;
- payload apply;
- release validator;
- changed-files ESLint.

Он остановился на полном TypeScript gate:

```text
src/lib/messages/enterpriseMessages.server.ts(1,26):
TS2307 Cannot find module '../supabase'
```

Причина: helper находится в `src/lib/messages/`, а production Supabase module находится в корневом `lib/supabase`, не в `src/lib/supabase`.

Канонический импорт для server helpers на глубине `src/lib/<module>/...` уже используется в source:

```text
../../../lib/supabase
```

V1_1 меняет только этот module path:

```text
../supabase
->
../../../lib/supabase
```

После V1 failure launcher выполнил `ROLLBACK_TO_BASELINE=PASS`; commit/push не выполнялись, baseline остаётся `c023fa6d2fb3b067ceaa9e0d4bdbe5a03adda8cb`.

## V1_1 packaging failure

V1_1 stopped before payload apply with:

`PAYLOAD_FILE_MISSING: docs/recovery/ARCTOR_MESSAGE_OBJECTS_F2_NATIVE_ENTERPRISE_PUBLICATION_V1_1_1_RU.md`

Cause: launcher metadata was accidentally versioned twice, while the ZIP contained the correct `V1_1_RU.md` file. `ROLLBACK_TO_BASELINE=PASS`; source was not changed and baseline remained `c023fa6d2fb3b067ceaa9e0d4bdbe5a03adda8cb`.

V1_2 rebuilds the ZIP manifest, `$FinalHashes`, `$NewPaths`, validator path and recovery path from the same explicit path set and verifies exact ZIP/runtime manifest parity before delivery.

## Следующая точка

После production smoke:

1. owner создаёт первую тестовую публикацию;
2. запись появляется на публичной странице;
3. read-only DB postcheck подтверждает один active public `message_object` + один succeeded `arctor` distribution;
4. затем F2M: media для native publication либо F3 global feed.
