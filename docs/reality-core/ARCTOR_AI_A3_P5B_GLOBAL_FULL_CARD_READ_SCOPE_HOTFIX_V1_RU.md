# AI-A3 P5B — GLOBAL full-card read-scope hotfix v1

Дата: 2026-08-14.

## Причина

После публикации локализации GLOBAL System ЦО/ОН серверная часть detail page уже корректно читает GLOBAL объект, но клиентский блок полной карточки после гидратации отдельно вызывает старые owner-scoped GET:

- ontology;
- aliases;
- relations.

Из-за этого GLOBAL/System объект на секунду отображается правильно, а затем получает `P1C_VALUE_OBJECT_ACCESS_DENIED`, `P2D_VALUE_OBJECT_ACCESS_DENIED` и `Value object not found or access denied`.

## Решение

- ontology GET получает отдельную read-only ветку для `scope_code=global + origin_type_code=system_model + status=active`;
- aliases GET получает такую же ветку и отдаёт только aliases текущей локали плюс language-neutral aliases;
- relations GET для GLOBAL/System возвращает read-only системную проекцию без actor-private candidates/relations и без риска утечки пользовательских связей;
- actor-scoped GET/RPC остаются прежними;
- alias PATCH и relation POST остаются строго actor-owned;
- GLOBAL lifecycle/edit/restructure права не добавляются;
- full-card client передаёт текущую locale в ontology/aliases/relations и перезагружает блок при смене locale.

## Безопасность

Hotfix не выполняет SQL, не меняет schema, не вызывает OpenAI и не пишет в Supabase. Он меняет только серверные read routes, client read projection, validator и recovery-документацию.

## Acceptance

После deployment:

1. открыть GLOBAL root в PL — жёлтый блок ACCESS_DENIED отсутствует;
2. открыть GLOBAL leaf «Ходьба» в PL — full card загружается, P5B Linked reality остаётся;
3. переключить PL/ES/EN — detail/full-card обновляет локализованные системные подписи;
4. Edit/restructure GLOBAL по-прежнему недоступны;
5. actor-owned ЦО по-прежнему читаются и редактируются через прежние owner-scoped контракты.

После PASS P5B можно закрыть и перейти к P5C quick capture + review buffer.
