# ARCTor — Message Objects F4 — Production Closure V1

Дата: 2026-08-27
Release: `ARCTOR_MESSAGE_OBJECTS_F4_CLOSURE_F2M_MEDIA_ENTRY_V1_1`
Baseline перед closure: `main @ fb754c261260e553e0c0434cba6348817a630cc4`

## Статус

**F4 Global ARCTor Feed = production PASS.**

## Подтверждённый production smoke

Проверены реальные browser-сценарии:

1. `/feed?locale=pl` показывает `Aktualności ARCTor`;
2. `/feed?locale=ru` показывает `Лента ARCTor`;
3. navigation item локализуется и ведёт на `/feed`;
4. существующая enterprise publication отображается;
5. после создания второй публикации она появляется сверху;
6. ordering сохраняется;
7. first-time PL localization показывает translation pending;
8. после localization появляется польский текст;
9. первоначальный F4 V1 имел UX-дефект: translation wait одной новой записи скрывал всю ленту;
10. item-level localization hotfix исправил дефект;
11. cached старые карточки остаются видимыми;
12. новая карточка остаётся на своём месте и показывает `Tłumaczenie na język polski…` только в body;
13. после перевода body заменяется польским текстом;
14. после `F5` верхняя публикация появляется сразу и translation pending повторно не возникает.

## Финальный F4 runtime contract

Feed остаётся read projection над `message_objects`.

Eligibility:

- `audience_scope_code = public`;
- `lifecycle_status = active`;
- `origin_kind_code = native`;
- `origin_provider_code = arctor`;
- `message_object_distributions.channel_code = arctor`;
- `delivery_status = succeeded`;
- active organization actor;
- organization public/published/listed.

Ordering:

1. `activated_at DESC NULLS LAST`;
2. `created_at DESC`;
3. `id DESC`.

## Localization

- existing message-object localization runtime переиспользуется;
- cache проверяется с `sourceRevision`;
- cached cards render immediately;
- pending cards имеют собственный Suspense boundary;
- pending cards на одной странице используют один shared batched localization promise;
- Guest viewer не становится billing identity.

## Архитектурный вывод

F4 подтвердил, что отдельная фундаментальная таблица `feed_items` не требуется.

`Feed = projection(message_objects)` остаётся design lock.

## Следующая точка

Следующий функциональный этап: **F2M — image media for native publications**.

F2M обязан соблюдать уже закрытый MEDIA EGRESS contract:

- no persisted Base64;
- no original image archive;
- browser optimization before network;
- public Storage/CDN delivery;
- no Vercel image-binary proxy;
- content-addressed immutable media where possible;
- 512 KiB server hard ceiling for persisted new-write public image media.
