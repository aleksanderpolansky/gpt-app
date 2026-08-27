# ARCTor — Message Objects F9: Feed Personalization + User Publications UI V1_1

Дата: 2026-08-27

## Базовая точка перед source-релизом

- branch: `main`
- source HEAD / remote main:
  `64f204933a84cd44f0e1f4a08c0e199fc99f3d7a`
- F9 Direct Messages + Publication Comments UI V1_1: PASS / pushed
- F9 direct-message thread RPC runtime hotfix: выполнен вручную в Supabase; реальный диалог после hotfix работает
- F9 Hidden Publications DB Foundation V1: PASS
- `message_objects` остаётся канонической таблицей информационных объектов
- likes / reactions / reviews в этот релиз не входят

## Подтверждённая модель

Один `message_object` может представлять:

- публичную публикацию предприятия;
- публичную публикацию person/avatar;
- комментарий;
- личное сообщение.

Смысл задаётся существующими полями и отношениями, а не отдельными foundational content tables.

Комментарий:
`message_object --reply_to--> publication message_object`

Личное сообщение:
`message_object + direct audience`

## История релиза V1 → V1_1

Первая попытка source-релиза
`ARCTOR_MESSAGE_OBJECTS_F9_FEED_PERSONALIZATION_USER_PUBLICATIONS_UI_V1`
остановилась fail-closed на `FULL_TYPESCRIPT`.

Фактический результат V1:

- baseline / remote main были точными;
- DB preflight PASS;
- baseline ESLint: 244 errors / 107 warnings;
- payload apply PASS;
- release validator PASS;
- changed-files ESLint PASS;
- `FULL_TYPESCRIPT_EXIT=2`;
- commit/push не выполнялись;
- rollback вернул рабочее дерево к
  `64f204933a84cd44f0e1f4a08c0e199fc99f3d7a`.

Причина была локализована в
`src/app/api/publications/[id]/comments/route.ts`.

При построении `localizationSourceById` код ошибочно:

1. обращался к `localization` до объявления `const localization`;
2. обращался к `row.comment_message_object_id`, хотя
   `CommentLocalizationRow` имеет ключ `id`.

V1_1 исправляет только этот контракт:

- canonical localization source использует `row.content_text`;
- `ensurePublicMessageObjectLocalizationsV1` вызывается после построения source map;
- локализованный текст подставляется уже в финальном response mapping по
  `row.comment_message_object_id`;
- validator получил отдельные regression-guards на use-before-declaration
  и неверную форму `CommentLocalizationRow`.

Функциональный scope релиза не расширяется.

## Что добавляет этот source-релиз

### 1. Публичные публикации person/avatar

На `/feed` для активного публичного person/avatar-профиля появляется компактный composer.

Публикация:

- создаётся через `create_message_object_v1`;
- `author_actor_id = active person/avatar actor`;
- `audience_scope_code = public`;
- `origin_kind_code = native`;
- `origin_provider_code = arctor`;
- получает succeeded distribution в канал `arctor`;
- автоматически попадает в Global Feed;
- может содержать одну оптимизированную WebP-фотографию через уже проверенный native media pipeline.

Composer сохраняет Pixel/Android file-picker protection:
видимая кнопка -> отдельный hidden input -> `input.click()` -> возврат focus через `preventScroll`.

Публиковать в Global Feed может только активный профиль с `actor_public_profiles.is_public = true`.

### 2. Global Feed больше не enterprise-only

Feed author projection теперь поддерживает:

- `organization` -> `/directory/<slug>`;
- `person/avatar` -> `/people/<slug>`.

Enterprise filtering/published-directory contract сохраняется.
Person/avatar должен иметь active public profile.

### 3. Счётчик комментариев сразу при загрузке

Количество комментариев вычисляется batch-операцией для набора публикаций:

1. один запрос `message_object_relations` для `reply_to`;
2. один запрос `message_objects` для проверки active/public/comment.

N+1 GET `/comments` для каждой карточки не используется.

`PublicationComments` получает `initialCount`, поэтому число видно сразу до раскрытия блока.

### 4. Перевод комментариев

GET `/api/publications/[id]/comments?locale=<locale>`:

- читает канонические comment message_objects;
- использует существующий `ensurePublicMessageObjectLocalizationsV1`;
- сохраняет перевод в существующий `metadata_json.localizedContent`;
- повторно использует cache/provenance;
- не создаёт отдельный translated comment;
- при первом отсутствии cache может выполнить AI localization в рамках уже существующего billing/runtime контракта.

### 5. Скрытые публикации

Manual DB foundation уже создал:
`message_object_viewer_preferences`

Scope preference:
`owner_user_id + viewer_actor_id + message_object_id`

То есть скрытие привязано к активному профилю, а не глобально к аккаунту.

Source-релиз добавляет:

- кнопку `Hide` на карточке feed для signed-in viewer;
- server-side исключение hidden IDs из обычной ленты;
- `/feed/hidden`;
- пункт `My hidden publications` в дереве Feed;
- кнопку `Restore`;
- canonical message_object не удаляется, не withdraw и не меняется.

### 6. Enterprise publication compatibility

Существующий enterprise composer/media pipeline не меняется по смыслу.
Enterprise messages дополнительно получают initial comment count.

## Не входит

- likes;
- reactions;
- reviews/ratings;
- unread counters;
- view counters;
- social connectors F5;
- retail importer F8;
- Blix integration.

## F8

`F8 Retail / External Feeds` остаётся:
`PAUSED / WAITING_EXTERNAL_DEPENDENCY`

Причина:
ожидается ответ Grupa Blix по возможной официальной партнёрской интеграции.

## Failure gates

Source release считается успешным только если проходят:

- exact branch/head/remote baseline;
- clean worktree;
- payload/hash/path parity;
- DB preflight hidden/comment/message RPCs;
- baseline ESLint evidence;
- release validator;
- changed-files ESLint;
- full TypeScript;
- full Next build;
- `git diff --check`;
- full ESLint no-regression;
- exact staged set;
- commit;
- push;
- remote verification;
- clean worktree after push.

При FAIL до commit:
rollback к точному baseline.

При FAIL после commit/push:
launcher обязан fail-closed остановиться и вывести точную recovery point.

## Smoke после PASS

1. `/feed`:
   - enterprise posts продолжают отображаться;
   - активный публичный person/avatar видит composer;
   - text publication появляется в feed;
   - photo publication появляется в feed.

2. Автор user publication:
   - имя/аватар правильного active profile;
   - переход ведёт на `/people/<slug>`.

3. Комментарии:
   - count виден сразу;
   - раскрытие не меняет count неверно;
   - другой locale возвращает translated comment;
   - создание нового комментария обновляет count.

4. Hide:
   - Hide убирает публикацию только из текущего active profile feed;
   - другой profile того же account продолжает видеть публикацию;
   - `/feed/hidden` показывает hidden item;
   - Restore возвращает публикацию.

5. Enterprise directory:
   - comments продолжают работать;
   - count виден сразу.

## Точка продолжения

После smoke:
если всё PASS — закрыть F9 Feed Personalization/User Publications как DONE и обновить recovery checkpoint.
