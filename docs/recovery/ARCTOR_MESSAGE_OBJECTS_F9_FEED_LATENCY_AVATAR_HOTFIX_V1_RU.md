# ARCTor — F9 Feed latency + Avatar author hotfix V1

Дата: 2026-08-27

## Baseline

`main @ 734c8da7d7822b70635fa2926f57d5fde8703a9d`

Предыдущий release Author Selector прошёл полный TypeScript, Next build,
changed-files ESLint, no-regression ESLint, commit/push и remote verify.

## Production smoke до hotfix

Подтверждено:

- Author selector отображает Personal profile и Enterprise;
- Avatar, который доступен в Super Offer provider selector, в Feed selector не
  отображается;
- Hide после DB ambiguity hotfix работает функционально;
- скрытая карточка появляется в `/feed/hidden` и Restore работает;
- initial comment count работает;
- locale localization работает.

## Почему Avatar отсутствовал

Feed author resolver требовал одновременно `profile.is_public=true` и
`public_slug`.

Super Offer provider selector использует другой, правильный для ownership
выбора контракт: собственный profile + active actor, включая Avatar.

Hotfix приводит Feed author selector к той же ownership-логике.

Публичная публикация от private Avatar не делает весь профиль публичным.
В самой публичной публикации отображается имя автора; ссылка на `/people/...`
и profile image используются только если public profile действительно открыт.

## Почему Hide / Restore выглядели медленными

До hotfix:

1. browser POST visibility;
2. server auth + active actor + DB RPC;
3. ответ;
4. `router.refresh()`;
5. полный повторный Server Component read Global Feed.

Поэтому кнопка могла снова стать активной раньше, чем карточка реально исчезала.

Hotfix использует optimistic UI:

- карточка скрывается локально сразу при клике;
- DB request идёт после мгновенного UI update;
- при FAIL карточка возвращается и показывается ошибка;
- при PASS полный `router.refresh()` не запускается.

Server остаётся источником истины. Следующее открытие Feed/Hidden читает
viewer preference из DB.

Visibility API дополнительно отдаёт `Server-Timing` и безопасные `timingsMs`
для context / RPC / revalidation / total, чтобы дальнейшую latency измерять, а
не оценивать визуально.

## Publication latency

Native publication finalization раньше делала последовательные round-trips:

- create message;
- create pending distribution;
- activate message;
- update distribution to succeeded.

После создания message и optional media hotfix параллельно выполняет:

- activate message;
- insert ARCTor distribution сразу как succeeded.

Feed требует одновременно active message + succeeded distribution, поэтому
промежуточное состояние не становится видимым. При ошибке существующий cleanup
удаляет созданный message/resources.

`/feed` уже `force-dynamic`, а browser после успешной публикации делает
`router.refresh()`, поэтому дополнительный `revalidatePath("/feed")` из POST был
избыточен и удалён из critical path.

## Scope

Входит:

- Avatar в Author selector по owned active actor contract;
- private Avatar может быть автором public message без автоматической
  публикации всего профиля;
- optimistic Hide / Restore;
- visibility timing diagnostics;
- сокращение publication DB round-trip waves.

Не входит:

- likes/reactions/reviews;
- view counters;
- F8 Retail importer;
- F5 social connectors;
- изменение canonical message object модели.

## Production smoke после PASS

1. Author selector содержит Personal / Avatar / Enterprise, если они есть.
2. Публикация от Avatar появляется в Feed.
3. Если Avatar profile private, имя видно в публикации, но нет ссылки на
   закрытый profile.
4. Hide визуально убирает карточку сразу.
5. Ошибка Hide возвращает карточку.
6. Hidden page показывает скрытую публикацию после открытия.
7. Restore визуально убирает карточку из Hidden сразу.
8. Возврат в Feed показывает restored item.
9. Text publication появляется быстрее; отдельный POST больше не делает
   pending-distribution + delivery-update round-trip.
10. Если latency всё ещё велика, смотреть `Server-Timing` visibility API до
    решения об апгрейде сервера.
