# ARCTor — Message Objects Core F1 — DB Foundation Recovery

Дата: 2026-08-26
Release: `ARCTOR_MESSAGE_OBJECTS_CORE_F1_SOURCE_CHECKPOINT_V1`
Git baseline перед source checkpoint: `main @ da9c06c48d3d8c53250d9c16c6b16c2a8025bec0`

## Решение

В ARCTor введена универсальная сущность `message_objects`: зафиксированная единица информации. Публичный пост, direct message, отзыв, комментарий, уведомление и импортированная публикация внешнего источника различаются контрактами author / audience / target+relation / intent / distribution / lifecycle / media / provenance, а не обязаны быть отдельными фундаментальными таблицами.

`Feed` не является фундаментальной сущностью. Это проекция доступных `message_objects`.

Один canonical `message_object` может иметь несколько `message_object_distributions`; cross-posting не должен создавать независимые копии одного сообщения.

## Intake

`ARCTOR_MESSAGE_OBJECTS_CORE_INTAKE_V1_1` прошёл с `RESULT=PASS` на `da9c06c48d3d8c53250d9c16c6b16c2a8025bec0`. До F1 `message_objects` отсутствовал; `actor_public_profiles`, `activity_events` и `organizations` подтверждены. DB writes = 0, Storage writes = 0, secret scan = PASS, worktree/head не изменились.

Первый intake V1 остановился на launcher-only ошибке с пустым tracked text file; V1_1 добавил `AllowEmptyString` и regression self-test.

## Production DB F1

В production Supabase вручную применён reviewed additive SQL:

`supabase/manual-applied/20260826_message_objects_core_f1_db_foundation_v1.sql`

SHA-256: `f42cfa9746f46507050822c4a4a6313c37353f83725b61218a2b1c6fe7030b3d`

Созданы:

- `public.message_objects`
- `public.message_object_audience_actors`
- `public.message_object_relations`
- `public.message_object_distributions`
- `public.message_object_media`

RPC:

- `public.create_message_object_v1(...)`
- `public.activate_message_object_v1(uuid, uuid)`
- `public.withdraw_message_object_v1(uuid, uuid)`

RLS включён. Direct browser access `anon/authenticated` к новым таблицам закрыт. Application server boundary — `service_role`.

Legacy `public.chat_messages` сохранён и не мигрируется на F1.

## Production acceptance

```text
status,message_objects,audience_actors,relations,distributions,media,message_objects_rls,anon_read_blocked,authenticated_read_blocked,service_create_rpc,legacy_chat_messages_preserved
PASS,true,true,true,true,true,true,true,true,true,true
```

Evidence: `docs/recovery/evidence/MESSAGE_OBJECTS/ARCTOR_MESSAGE_OBJECTS_CORE_F1_DB_ACCEPTANCE_20260826.txt`

## Граница F1

F1 не создаёт UI публикаций, feed, social connectors, Storage bucket и не мигрирует legacy messages/reviews.

## Следующая точка

**F2 Native ARCTor Message / Enterprise Publication**:

1. владелец предприятия создаёт текстовую публикацию;
2. `author_actor_id` = actor предприятия;
3. `created_by_actor_id` = actor человека/аватара, действующего от имени предприятия;
4. `audience_scope_code = public`;
5. создаётся один canonical `message_object`;
6. создаётся ARCTor distribution;
7. после активации публикация видна в Activity/Updates блока публичной страницы предприятия;
8. внешние social API пока не подключаются.
