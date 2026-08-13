# ARCTor.app — AI Architecture Lock v1

Дата фиксации: 2026-08-12
Статус: CANONICAL ARCHITECTURE LOCK
Основание: «Архитектура ИИ ARCTor» Design Lock Candidate v1.0 + AI-A0 source/live DB audit.

## 1. Главный принцип

ARCTor не строит долговременную память продукта внутри OpenAI и не развивает один бесконечно растущий prompt.

**ARCTor owns the memory.**

- Git хранит неизменяемые законы, протоколы, JSON Schema, validators и gold tests.
- PostgreSQL/Supabase хранит изменяемое структурированное знание, версии, ontology, recognition, instructions, feedback и права использования.
- Object Storage хранит тяжёлые исходные материалы и будущие dataset artifacts.
- Retrieval indexes являются производными и пересоздаваемыми.
- OpenAI/другой provider получает только минимальный Context Pack конкретной операции и остаётся заменяемым вычислителем.

## 2. Физические классы памяти

### 2.1 Core Protocol — Git

Хранит:
- обязательные этапы Analyzer/Compiler/Optimizer;
- hard guards;
- запреты на произвольную запись;
- правила происхождения чисел;
- правила preview-before-write;
- правила UNKNOWN/NO_MATCH;
- правила safety/privacy.

### 2.2 Structured Contracts — Git

Хранит:
- JSON Schema output contracts;
- TypeScript types;
- deterministic validators;
- gold fixtures;
- version/hash contracts.

### 2.3 Operational Knowledge — PostgreSQL/Supabase

Хранит:
- системные AI instructions и revisions;
- actor-specific AI preferences и revisions;
- Value Objects;
- aliases;
- recognition profiles;
- parameters/assignments;
- relations/evidence;
- model/rule registries;
- personal context where explicitly allowed.

### 2.4 Data Capital — PostgreSQL + Object Storage

Пользовательские исправления являются долгосрочным активом, а не расходным логом.

Нужно сохранять воспроизводимую пару:

`что увидела система -> какие варианты ей были доступны -> что она выбрала -> что исправил человек -> почему -> какой результат получился позже`.

Нельзя сохранять только финальный исправленный ответ.

Data Capital должен сохранять provenance, version lineage, purpose/right-to-use и append-only историю.

### 2.5 Retrieval Index — PostgreSQL search / future extensions

Индекс не является источником истины.

- exact/normalized aliases;
- lexical/full-text search;
- fuzzy/semantic index при необходимости;
- embeddings только как пересоздаемый слой поверх canonical data.

### 2.6 Large Knowledge — Object Storage + DB metadata

Исследования, стандарты, длинные документы и большие streams не должны попадать в каждый prompt.
Они извлекаются только когда конкретная задача требует RAG/tool context.

## 3. Универсальный Context Manifest

Каждый production AI provider call должен быть частью `ai_analysis_execution` и иметь `ai_context_manifest`.

Execution фиксирует логическую операцию ARCTor.

Manifest фиксирует воспроизводимый контекст одного provider stage:
- protocol code/version;
- code commit SHA, если доступен;
- JSON Schema name/version/hash;
- system prompt hash, но не giant raw prompt archive;
- request hash;
- response hash;
- provider/model/tier;
- store/retry/token controls;
- instruction version references;
- bounded retrieval snapshot;
- allowed tools;
- model config;
- validator result;
- stage status.

Raw user text не дублируется в Context Manifest. Он может существовать в отдельном source/event layer по собственным privacy/retention rules; manifest хранит hash/refs и bounded context.

## 4. Recognition Layer

Recognition не должен состоять из огромной системной инструкции.

Используются:
- existing `concept_aliases`;
- versioned `value_object_recognition_profiles`;
- positive/negative examples;
- semantic signature;
- cues/disambiguation;
- server-side candidate bounding;
- allowed parameters/relations;
- явный NO_MATCH / PROPOSAL_NEEDED.

Модель не может выбрать canonical Value Object, которого сервер не включил в разрешённый candidate set.

## 5. Data Capital Layer

Целевые сущности:
- `ai_feedback_events`;
- `ai_feedback_corrections`;
- `ai_feedback_preferences`;
- `ai_capability_requests`;
- `ai_feedback_outcomes`;
- `ai_feedback_clusters`;
- `ai_optimizer_proposals`.

Существующие activity corrections/reviews/logs не удаляются и не дублируются без необходимости. Они становятся источниками/evidence для общего Data Capital layer.

Feedback = evidence, а не majority truth. Даже большое число одинаковых corrections не переписывает canonical ontology автоматически.

## 6. Rights / Purpose Layer

Будущая коммерческая ценность данных не означает автоматическое право на любое использование.

До dataset/model export должны существовать:
- purpose registry;
- actor/user grants or another lawful permission record;
- jurisdiction/restrictions/retention metadata;
- dataset manifest;
- reproducible membership filter.

Права на operational improvement ARCTor, research, commercial model training, psychometric use, robotics/implant use и game-world generation не считаются одинаковыми целями автоматически.

## 7. Optimizer

Optimizer может:
- агрегировать telemetry;
- кластеризовать ошибки;
- формировать proposal;
- делать offline replay;
- оценивать expected benefit/risk.

Optimizer не может напрямую:
- перестраивать canonical ontology;
- auto-create canonical leaf;
- выполнять split/merge/reparent без approval gate;
- расширять privacy permissions;
- создавать медицинские/психологические правила без соответствующего model/review layer.

## 8. Runtime order

Базовый runtime:

`raw input -> deterministic pre-processing -> Context Compiler -> bounded retrieval -> provider Structured Output -> server validation -> preview -> user correction/confirmation -> domain writes -> feedback/data capital`.

Неизменяемый приоритет:

`deterministic code/DB guard -> bounded model decision -> validator -> write gate`.

## 9. Recovery / development governance

Для AI architecture действует общий процесс ARCTor:

`INTAKE -> DESIGN -> IMPLEMENTATION -> TEST -> RECOVERY`.

Изменение AI architecture не закрывается без:
1. code/schema state;
2. human-readable decision/reason;
3. evidence/validator/build result;
4. recovery update.
