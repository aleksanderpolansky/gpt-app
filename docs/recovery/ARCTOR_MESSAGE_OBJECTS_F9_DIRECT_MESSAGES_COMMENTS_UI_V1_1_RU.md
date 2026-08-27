# ARCTor — Message Objects F9: личные сообщения и комментарии — UI V1_1

Дата: 2026-08-27

## Точка восстановления

Source baseline до релиза:

`main @ 9c9833e39236689451f83dfda7da6d517b8e23ea`

DB foundation F9 уже выполнен вручную в Supabase SQL Editor и подтверждён `PASS`.

Каноническая терминология:

- концептуальная сущность: **message object**;
- таблица БД: **`message_objects`**.

## История релиза V1 → V1_1

Первая попытка `ARCTOR_MESSAGE_OBJECTS_F9_DIRECT_MESSAGES_COMMENTS_UI_V1`
остановилась fail-closed на `CHANGED_FILES_ESLINT`.

Причина была локализована в `src/app/messages/MessagesClient.tsx`:

- 3 ошибки `react-hooks/set-state-in-effect`;
- warning: неиспользуемый `selectedConversation`.

Commit/push не выполнялись. Launcher успешно вернул рабочее дерево к точному baseline
`9c9833e39236689451f83dfda7da6d517b8e23ea`.

V1_1 сохраняет тот же функциональный scope. Начальная загрузка списка диалогов
и ветки сообщений теперь обновляет React state только из асинхронных Promise callbacks;
синхронные UI-state изменения выполняются только из пользовательских event handlers.
Неиспользуемый `selectedConversation` удалён.

## Что реализовано этим source-релизом

Одна и та же каноническая модель используется для:

- публикации;
- комментария к публикации;
- личного сообщения.

### Личное сообщение

`message_objects`

- `audience_scope_code = direct`
- `intent_code = direct_message`

Получатель хранится через `message_object_audience_actors`.

Интерфейс:

- новый пункт **Сообщения / Messages** в существующей левой колонке;
- `/messages`;
- список диалогов;
- просмотр одного диалога;
- отправка личного сообщения;
- кнопка отправки личного сообщения на публичной карточке человека/аватара.

Новая отдельная фундаментальная таблица сообщений не создаётся.

### Комментарий

Комментарий — отдельный `message_objects`:

- `audience_scope_code = public`;
- `intent_code = comment`.

Связь с публикацией:

`message_object_relations.relation_code = reply_to`

Комментарии добавлены:

- к публикациям в глобальной ленте;
- к публикациям на публичной странице предприятия.

Комментарии загружаются лениво только после открытия блока комментариев, чтобы не создавать N дополнительных запросов при обычном просмотре ленты.

## Что сознательно НЕ реализовано

- likes / reactions;
- reviews / ratings;
- групповые сообщения;
- read receipts;
- unread counters;
- вложения в личных сообщениях;
- вложения в комментариях;
- comment → comment nesting.

Legacy `src/app/api/messages/route.ts` / `chat_messages` не удаляется этим релизом.

## F8 Retail / External Feeds

F8 оставлен в состоянии:

`PAUSED / WAITING_EXTERNAL_DEPENDENCY`

Прямые автоматические retail-importers не запускаются. Ведётся попытка договориться с Grupa Blix об официальной партнёрской форме распространения материалов. До появления разрешённого источника cron/importer не создаётся.

## Безопасность

- запись личных сообщений и комментариев идёт только через server-side API;
- API сначала разрешает текущий Auth0 session + active actor context;
- browser не получает прямой доступ к service-role RPC;
- публичный API комментариев повторно проверяет, что профиль автора комментария публичен, прежде чем отдавать публичный slug/avatar;
- hidden/private profile data не должно раскрываться через публичный комментарий;
- likes/reviews не создаются.

## Точка продолжения

После production smoke:

1. проверить личное сообщение profile A → profile B;
2. ответ profile B → profile A;
3. переключить active avatar и проверить отдельную actor identity;
4. добавить комментарий в `/feed`;
5. проверить тот же комментарий на странице предприятия;
6. проверить anonymous read комментариев;
7. проверить anonymous write = 401;
8. после подтверждения UX решить, нужны ли unread counters / nested replies.

F8 продолжить только после ответа Blix либо появления другого разрешённого upstream feed.
