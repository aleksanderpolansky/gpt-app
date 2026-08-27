# ARCTor — F9 Publication Author Selector V1

Дата: 2026-08-27

## Baseline

`main @ e83e673fbb6a5185d8307d3ed8910f94e56f7ce1`

Предыдущий F9 Feed Personalization/User Publications V1_1 прошёл полный
TypeScript, Next build, ESLint no-regression, commit/push и remote verify.

## Production smoke

Подтверждено:
- пользователь может создать публичную публикацию;
- person/avatar публикации появляются в Global Feed;
- initial comment count отображается сразу;
- count сохраняется при смене locale;
- `/feed/hidden` существует.

## Hide ambiguity

При production smoke кнопка Hide вернула:
`column reference "message_object_id" is ambiguous`.

Это отдельная DB ошибка и она НЕ вызвана выбором автора.

Ручной hotfix:
`ARCTOR_MESSAGE_OBJECTS_F9_HIDE_AMBIGUITY_HOTFIX_V1.sql`

Он меняет conflict target в `hide_message_object_for_viewer_v1` на точный
`message_object_viewer_preferences_pkey`.

## Author selector

Feed composer получает явный Author selector по тому же UX-принципу, который
уже используется в Super Offer / certificate flow.

Разрешённые варианты:
- Personal profile;
- Avatar;
- Enterprise.

Список формируется server-side только из actor/profile/organization,
принадлежащих текущему account.

Browser `authorActorId` является только requested value.
POST `/api/publications` повторно проверяет его server-side через
`getPublicationAuthorOptionForUser`.

`created_by_actor_id` остаётся текущим active actor.
`author_actor_id` становится выбранным server-validated автором.

Для Enterprise используется active organization actor; организация должна быть
active, иметь public_slug и принадлежать одному из actor-профилей account.

## Важное разделение ролей

Author selector не меняет personalization scope Hide.

- author = от чьего имени создан message_object;
- viewer_actor_id = для какого активного профиля скрывается карточка.

Смена автора публикации не обязана переключать active profile.

## Не входит

- likes;
- reactions;
- reviews/ratings;
- view counters;
- F8 retail importer;
- F5 social connectors.

## Smoke после PASS

1. В composer виден Author selector.
2. Есть Personal profile / Avatar / Enterprise, если они доступны.
3. Personal публикация отображается от personal.
4. Avatar публикация отображается от avatar.
5. Enterprise публикация отображается от enterprise и ведёт в directory.
6. После DB hotfix Hide убирает карточку из текущей viewer-ленты.
7. `/feed/hidden` показывает скрытую карточку.
8. Restore возвращает карточку.
9. Другой active profile имеет независимый hidden state.

F9 не закрывать как DONE до этого smoke.
