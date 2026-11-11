# ARCTor — M-0122 / ARI-03.05.05. Версионированный кеш embeddings (проект)

## Цель

Не оплачивать повторное преобразование ОН в embedding, когда одобренные текстовые данные фактически не изменились. Сохранить версионирование, ссылку на источник, область доступа, модель и возможность немедленного возврата к lexical-only.

Это **DESIGN**, не запуск кеша в реальном поиске. База Supabase не изменяется. `pgvector` по последней инвентаризации доступен, но не установлен. Проверка RLS/E2E ещё не пройдена.

## Интерфейс

Новый серверный модуль `src/lib/ontology-research/embeddingCacheV1.ts` использует готовую единицу M-0119 из `src/lib/ontology-research/vectorRetrievalV1.ts` **без изменения** исходного модуля и его зафиксированного SHA-256. Вызовы `describeEmbeddingCacheKeyV1()` и `decideEmbeddingCacheV1()` — чистое построение идентичности и решения. Они **не** вызывают OpenAI, не читают Supabase, не создают embeddings, не являются проверкой полномочий.

Для одной записи фиксируются UUID ОН, язык, `scope_kind`, `owner_actor_id` (для приватного ОН), версии онтологии и словаря, ID+версия embedding-модели, размерность, версия подготовки текста, SHA-256 утверждённого текста. Контрольные суммы создаются из канонического payload M-0119. Алиасы без утверждения в payload не включаются.

Существуют два различных ключа: `versionedLogicalKey` содержит версии метаданных; `reusableVectorKey` содержит модель, версию препроцессинга и **содержимое текста**, но не версии-ярлыки. Изменение номера словаря без изменения утверждённого текста допускает повторное использование вектора с новым логическим указателем после авторизованной записи. Изменение определения, названия или утверждённых алиасов требует нового вектора и отдельного разрешения затрат. Разные UUID и разные владельцы не делят cache key, даже если их тексты совпали.

## Состояния

- `REUSE_READY`: строго совпали контент, модель, размерность и scope, запись готова; для новой версии нужен авторизованный alias-pointer, который этот шаг НЕ пишет.
- `RECALCULATE_REQUIRES_APPROVAL`: отсутствует соответствующий готовый вектор; только предложение на последующую генерацию, без платного вызова.
- `LEXICAL_ONLY`: нет провайдера или недоступна векторная инфраструктура, пользовательский поиск не должен блокироваться.
- `BLOCKED`: недействительные входные данные, нарушение границы owner/scope, отозванный источник. Никакого автоматического разыменования приватных данных.

`usage_scope=private` **не** является самостоятельным критерием личной принадлежности: системные ОН определяются `scope_code=global`, `origin_type_code=system_model`, владельцы NULL и дополнительной проверкой источника. Наличие таких полей не доказывает RLS для обычного пользователя.

## Проект SQL — НЕ исполнять, НЕ миграция

Следующая схема исключительно для обсуждения и проверки на другом шаге; никаких SQL-файлов в `supabase/migrations/` не добавляется.

```sql
-- НЕ ИСПОЛНЯТЬ: DRAFT for future review, no automatic migrations.
-- CREATE EXTENSION IF NOT EXISTS vector;
-- CREATE TABLE public.on_embedding_store_v1 (...);
-- add: on_id, locale, ontology_version, dictionary_version, scope_kind,
-- owner_actor_id, model_id, model_version, embedding_dimensions, embedding,
-- content_sha256, preprocessing_version, versioned_logical_key, reusable_vector_key,
-- source_ids, review_status, state, created_at, updated_at.
-- CHECK (scope_kind='global_system' AND owner_actor_id IS NULL OR
--        scope_kind='owner_private' AND owner_actor_id IS NOT NULL);
-- CHECK (vector_dims(embedding) = embedding_dimensions);
-- RLS: DENY_BY_DEFAULT; private caller verification must be proven with E2E.
-- No migration, index or backfill before explicit owner approval.
```

## M-0121 свидетельства и ограничения

Сравнили две настоящие модели на 36 утверждённых владельцем запросах и 18 системных ОН: `3-small` Recall@1 33/36, `3-large` 34/36, обе Recall@5 36/36. Эти данные **не** означают выбор production-модели. Gold не независимо валидирован и на шесть нерусских языков приходится по одному запросу. Никакой vector search в production не включён.

## Критерий текущей приёмки

- Детерминированный versioned cache, неизменность уже принятого `vectorRetrievalV1.ts`.
- Инвалидация при изменении утверждённого текста; повторное использование при неизменном тексте и иной версии-ярлыке.
- Изоляция владельцев и моделей, явное `LEXICAL_ONLY` без провайдера.
- Полная регрессия принятых шагов M-0104—M-0121, TypeScript strict, новые тесты.
- Ноль SQL, API-расходов, commit, push, deploy; результат — локальный проект и evidence.
