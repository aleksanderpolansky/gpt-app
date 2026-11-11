# ARCTor / M-0120 — Проект хранения embeddings (DRAFT; НЕ исполнять)

Мастер-план: **ARI-03.05.03**; режим **DESIGN**. Это документ проверки будущей схемы, **НЕ SQL-миграция** и не разрешение выполнять запросы в Supabase. На M-0118 инвентаризация через SQL Editor показала: PostgreSQL 17.0.6, 803 записи ОН, pgvector доступен, но НЕ установлен; vector-столбцов нет. Достоверность — owner-attested SQL export.

## 1. Единица данных

Каждая запись хранит строго одно embedding для **ОН UUID + язык + версия определения + версия словаря + область видимости/владелец + модель/version + SHA-256 утверждённого текста**. Для одного ОН разрешены разные модели, языки, версии. Обязательные поля перечислены в `M0120_EMBEDDING_STORAGE_DESIGN_V1.json`.

Поле `embedding vector` имеет **переменную размерность**: при выборе конкретной модели сравнение только внутри той же пары `(model_id, model_version)` и той же размерности. Перед применением нужны проверка расширения, физическая схема хранения, оценка стоимости и gold-тесты двух моделей (M-0121). Нельзя считать, что установлено pgvector.

## 2. Проект структуры (НЕ запускаемый SQL)

```sql
-- ILLUSTRATION ONLY. NOT A MIGRATION. NOT VERIFIED AGAINST LIVE SUPABASE SCHEMA.
-- CREATE TABLE public.on_embedding_store_v1 (
--   id uuid PRIMARY KEY,
--   on_id uuid NOT NULL, -- FK to public.value_objects requires real schema verification
--   locale text NOT NULL CHECK (locale IN ('en','pl','es','de','cs','uk','ru')),
--   ontology_version text NOT NULL,
--   dictionary_version text NOT NULL,
--   scope_kind text NOT NULL CHECK (scope_kind IN ('global_system','owner_private')),
--   owner_actor_id uuid NULL,
--   model_id text NOT NULL,
--   model_version text NOT NULL,
--   embedding_dimensions integer NOT NULL,
--   embedding vector NOT NULL, -- requires pgvector installation + extension schema verification
--   content_sha256 text NOT NULL,
--   source_ids jsonb NOT NULL,
--   review_status text NOT NULL,
--   state text NOT NULL CHECK (state IN ('draft','ready','stale','revoked')),
--   created_at timestamptz NOT NULL,
--   updated_at timestamptz NOT NULL,
--   CHECK ((scope_kind='global_system' AND owner_actor_id IS NULL)
--      OR (scope_kind='owner_private' AND owner_actor_id IS NOT NULL)),
--   CHECK (embedding_dimensions > 0),
--   CHECK (vector_dims(embedding) = embedding_dimensions)
-- );
-- Index/unique strategy: NULLS NOT DISTINCT or separate partial unique indexes
-- for global/private; versioned immutable content, with no cross-tenant uniqueness.
```

**Важно:** пример закомментирован намеренно. Не копировать и не исполнять его как миграцию. Предложенные поля `on_id` и `owner_actor_id` **не подтверждают**, что именно такие PK/FK присутствуют в живой БД. На этапе реализации сначала сверить реальные типы и RLS.

## 3. Изоляция и безопасность (обязательные будущие gates)

- По умолчанию запретить `anon` и прямые обращения `authenticated`. Записи/чтение только через авторизованный серверный контур, проверяющий владельца и права, с RLS defense-in-depth; не выдавать `service_role` клиенту.
- Для `global_system` owner_actor_id всегда NULL; `owner_private` требует реального ownerActorId. Никаких общих индексов или выдач, смешивающих приватные записи разных пользователей.
- Source IDs/хэши сами могут быть метаданными: избегать PII, не копировать сырой пользовательский текст в публичные отчёты. Политики retention/revocation принять отдельно.
- Не индексировать несовместимые размерности или модели в одном vector ANN индексе; index HNSW/IVFFlat рассматривается позже после анализа данных и costs. Любой lookup до этого — **lexical-only**.

## 4. Что нельзя считать готовым на M-0120

- Никаких `CREATE EXTENSION`, `CREATE TABLE`, `GRANT`, RLS policy, RPC, embeddings, model calls, live E2E, deploy и SQL Editor instructions.
- Ни настоящая миграция, ни FK, ни RLS, ни производительность не проверены.
- M-0121: сравнение двух многоязычных embedding-моделей на одном held-out Gold **только после согласования расходов**. При отсутствии независимого Gold или approval не делать вывод о качестве и оставаться на lexical-only.

## 5. Предварительные критерии будущей миграции

1. Подтверждённые UUID/PK и видимость `public.value_objects`, место установки vector, таблица пользователей/акторов и RLS/GRANT после Oct 30 Supabase.
2. Два сценария: системные ON общедоступны после проверки прав; приватные ON доступны только своему владельцу. Negatives: cross-tenant deny, wrong model/dim deny, pending aliases deny.
3. Уникальность корректна для `NULL` в global; `content_sha256` пересчитывается только при изменении утверждённого текста; прослеживаются источник и отзыв.
4. Тесты: backup, rollback rehearsal, no orphan rows, concurrency, invalid dimensions, p95 query latency, fallback search, cost limits.

**Окончательное решение:** DRAFT, НЕ ПРИМЕНЯТЬ; владелец утверждает отдельный SQL-step после проверки живой схемы.
