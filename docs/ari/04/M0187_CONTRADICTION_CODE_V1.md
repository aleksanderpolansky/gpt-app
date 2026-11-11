# ARCTor — M-0187 / ARI-04.06.01: выборочные противоречия (CODE v1)

**Статус:** CODE-предложение, не runtime-интеграция и не приёмка шага. Исходный код основан на read-only intake от 2026-11-07, Git HEAD `7d4e9aa00c92387e1163ffda98639c07f7753e58`.

## Задача мастер-плана

> Задать пары взаимоисключающих утверждений по выбранным relation types.

Implementation target: `src/lib/ontology/contradictionDetectorV1.ts`.
Проверка: self-link, forbidden domain/facet, incompatible polarity, cycles, conflicts. При конфликте — объяснимый conflict set, а не несанкционированное изменение графа.

## Что реально делает модуль

- Чистая функция `detectContradictionsV1(input)` обрабатывает ограниченный набор кандидата, существующих утверждений, разрешённых ОН и реестра типов отношений. Никаких Supabase/Auth0/Next.js/network API.
- Использует типы и ограничения **переданного** авторизованным вызывающим кодом реестра `value_object_relation_types`: `allow_self_link`, source/target facets и scope. Неполное/некорректное ограниченное представление -> BLOCKED; отсутствие типа -> BLOCKED.
- Только явное **утверждение и отрицание** того же выбранного relation type (`related_to`, `same_subject_as`, `supports`, `depends_on`, `conflicts_with`, `influences`, `classified_as`), в **одинаковых `claimKey` и `contextKey`**, при **обоих статусах `verified`**, представляет строгую противоречивость. Реальная текущая таблица не хранит `assertionPolarity`; это контракты для будущих проверяемых claims, а не новая физическая колонка.
- Пары `supports` / `conflicts_with` на одной паре ОН — `REVIEW`, **не** автоматически логическое отрицание: один объект может одновременно помогать и мешать другому в разных отношениях.
- Противоположные `influences` effect-sign — `REVIEW` по умолчанию. BLOCK допускается только при явно подтверждённой вызывающей стороной политике `strictSingleValuedEffectTypes` и совпадающих контекстах/предметах, оба verified.
- Цикл `depends_on` / `classified_as` — `REVIEW` по умолчанию; BLOCK только с явно заданной политикой `strictAcyclicTypes`. Отсутствие доказательств, expired review или rejected status не служат отрицанием.
- Выход: стабильный `findings[]` с идентификаторами связанных assertions, evidence refs, причиной и (для циклов) witness path. В любом случае `approvesRelation=false` и `verifiesSource=false`.

## Границы и ограничения

1. Этот код **не подключается** к живому validate/promote API. Запись и применение рекомендаций запрещены до отдельных шагов и тестов.
2. `value_object_relation_types` содержит обратные aliases, не все активны. Полная canonical orientation/reverse-alias дедупликация запланирована на **M-0188**; временная валидность — **M-0189**, обратные симметричные дубликаты — **M-0190**.
3. Метаданные `claimKey`, `contextKey`, `assertionPolarity`, `effectPolarity` передаются в аналитический объект, а не берутся из непроверенных SQL-колонок. Ни один новый DB-контракт не предполагается существующим.
4. Только явно разрешённый, tenant-scoped subset должен поступать от вызывающего кода. В V1 нет механизма авторизации или RLS. Неполный набор графа не должен использоваться как доказательство отсутствия противоречий вне проверенного scope.
5. Нет календарных моделей, автоматического TTL, законов физиологической причинности, универсальных ограничений цикличности или inferred negative evidence.
6. Результат `NO_CONTRADICTION_DETECTED` означает только отсутствие *обнаруженных локальных* конфликтов, а не разрешение на promote.
7. В этой версии нет runtime/нагрузочных/e2e/SEC-06 отрицательных тестов: `SEC-06=OPEN_BLOCKER`, release `BLOCKED`.

## Офлайн-проверка

```powershell
node scripts/ari/ontologyContradictionDetectorV1.test.mjs
```

72 синтетических сценария + 34 независимых инварианта и TypeScript strict-check. Вся проверка read-only. **После локального применения не выполняйте автоматический commit/push/deploy.** Результат CODE-патча потребует отдельного evidence review и принятия M-0187 владельцем.
