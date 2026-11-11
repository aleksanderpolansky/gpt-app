# ARI-03.02.03 · M-0099 — exact UUID lookup и suggest-by-text (DESIGN ONLY)

## Назначение и принятые источники
Разделить два непересекающихся режима. Зафиксированные входные контракты: M-0097 `QueryRequest` и M-0098 `SearchResult`. Снимок данных — M-0096. Этап только DESIGN: **никакого runtime API, новой миграции, индекса, интеграции production или поиска в реальной базе**.

## Exact UUID lookup
Вход `{mode:'exact_uuid_lookup',objectId,locale,actorScope}`. `objectId` — корректный UUID; запрос по **идентичности**, а не ранжирование текста, синонимов или алиасов. Ответ `{mode:'exact_uuid_lookup', outcome:'found'|'not_available', objectId:string|null, selectedObjectId:null, serverAuthorizationVerified:true, identityJoinVerified:true}`. `found` только когда сервер по авторитетной базе проверил существование ОН, видимость, контекст актёра и целевую идентичность; `not_available` используется **одинаково** для несуществующего и запрещённого объекта, без раскрытия приватного title/metadata, различий 403/404 на внешнем контрактном уровне или намёка о существовании. Не делать запросы алиасов, vector/BM25, fallback к тексту или автосоздание ОН. Exact lookup не означает автоматическое подтверждение объекта пользователем (`selectedObjectId:null`).

## Suggest-by-text
Вход `{mode:'suggest_by_text',query:<принятый M-0097 QueryRequest>}`. Сначала строгая валидация шести полей `text, locale, actorScope, intent, limit, filters`; затем **серверный** контроль прав и только затем поиск кандидатов. Выход `{mode:'suggest_by_text',searchResult:<принятый M-0098 SearchResult>}`. Текст даже в форме UUID не превращается в exact UUID lookup неявно. Классы exact/alias/partial/lexical/vector/graph обозначают природу **совпадения в поиске текста**, не право доступа. Состояние `ambiguous` требует кандидатов + уточняющего вопроса, `selectedObjectId` остаётся null.

## Защита границ
`actorScope` — пожелание поиска, не полномочие; идентификаторы владельцев из клиента запрещены. Для `global_and_own` частные объекты разрешаются только через **серверный** authenticated actor + RLS/ACL. При неопределённой области, непроверенной привязке локализации к ОН, невалидной версии/контексте, отсутствующей цели алиаса — fail closed. Отказ по UUID не должен попадать в поиск по тексту, поскольку такой fallback может выдать скрытые имена. Ошибки запроса и публичный `not_available` не содержат персональных сведений. Обе ветви учитывают scope и актуальность снимка; смена снимка требует переоценки.

## Выбор режима и независимые тесты
Только `mode` выбирает ветвь. `exact_uuid_lookup` требует `objectId`, `locale`, `actorScope`, не принимает `query`; `suggest_by_text` требует `query` целиком, не принимает `objectId`, `ownerId`, `actorId`, `userId`, `fallback`. Дублирующие и неизвестные поля отклоняются. Синтетические кейсы: UUID found, UUID unavailable (включая запрещённый), текст single, ambiguous, no_match, blocked, текст-UUID остаётся текстом; отрицательные кейсы — owner leak, неправильный UUID, невалидные limit/locale/filter, fallback/autoselect, попытка выдать частные детали.

## Что сознательно откладывается
M-0100 нормализация Unicode/диакритики; M-0101 приоритет полного выражения; M-0102 контролируемые пути предков. Не вводить эти правила в M-0099. Отдельные runtime, integration и E2E проверки обязательны. 89 алиасов с ненайденными целями и неразрешённые границы из M-0093 не признаны исправленными. Новый поиск выключен, качество INCONCLUSIVE, Recall@20 N/A.
