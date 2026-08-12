# GSR1L — Recognition Architecture v1

Статус: **APPROVED FOR EXPERIMENTAL IMPLEMENTATION**
Дата: 2026-08-12

## Решение

GSR1L заменяет дальнейшее case-specific prompt-патчирование на архитектуру:

**AI = языковой интерпретатор; Server = владелец онтологии, детерминированных правил, candidate bounding, uncertainty и final validation.**

Текущая live-система имеет 150 global objects (12 root / 35 intermediate / 103 leaf), 89 approved/published global aliases, но aliases покрывают только 23 leaf; system parameters назначены 27 leaf. Максимальная текущая DOMAIN+FACET группа уже содержит 10 leaf — это текущий hard bound RPC, поэтому размер ontology group нельзя использовать как лимит candidate set.

## Переиспользуем

- `value_objects`
- `concept_aliases`
- `value_object_parameter_definitions`
- `value_object_parameter_assignments`
- `value_object_facet_registry`
- `value_object_kind_registry`
- `value_object_relation_types`
- exact recognizer и существующие guards

Aliases/parameters/semantic relations не копируются в recognition profile.

## Новый минимальный слой

Versioned `value_object_recognition_profiles` для global leaf. Минимальные данные профиля:

- semantic signature;
- positive / negative examples;
- recognition cues;
- disambiguation rules;
- uncertainty policy + optional approved fallback leaf;
- allowed event links + target facet/kind guards;
- temporal semantics roles;
- source/version/audit.

Пилотная реализация может хранить эти структуры в JSONB. Это не означает, что JSONB является финальной нормализацией.

## Pipeline

1. Server детерминированно извлекает числа, единицы, время, интервалы и поддерживаемые temporal markers.
2. AI возвращает neutral semantic frame и raw span IDs, но не создаёт canonical objects.
3. Server собирает candidates через title/aliases + recognition profiles + существующие contracts.
4. AI выбирает только из небольшого bounded candidate set или возвращает UNKNOWN.
5. Server окончательно проверяет leaf, parameters, event links, temporal links и source evidence.
6. Preview остаётся без Reality Graph writes до отдельного gate.

DOMAIN/FACET от AI может использоваться как мягкий сигнал, но не как единственные ворота распознавания.

## Неопределённость

UNKNOWN/UNRESOLVED — нормальный результат. Пример: «Спал примерно 6 часов» не позволяет угадывать day/night. До отдельного ontology decision система хранит duration/precision и оставляет leaf unresolved между day/night candidates.

## Два relation-слоя

Event links конкретного эпизода (`consumes`, `located_in`, `with_participant`, `occurs_in_context`, `precedes`, `follows`, `overlaps`) не смешиваются с долгоживущими semantic VO relations (`related_to`, `supports`, `depends_on`, `conflicts_with`, ...).

## Правило одного основного эпизода

По умолчанию одно сообщение пользователя описывает **один основной эпизод**: одно основное действие, состояние или наблюдаемую ситуацию. Это UX-рекомендация и ожидаемая структура первого этапа разбора, а не жёсткий запрет.

Если одновременно происходило что-то ещё, пользователь может сообщить это в том же сообщении. Внутренний контракт различает:

- `primary_observation` — основной якорь сообщения;
- `concurrent_events[]` — параллельные/вложенные действия;
- `states[]` — чувства, симптомы и состояния;
- `context[]` — явно названные участники и обстоятельства;
- `relations[]` — временные и event links.

Параллельные активности остаются **отдельными событиями** для учёта времени и аналитики и связываются `overlaps` / `occurs_during`. Мысли и чувства не превращаются автоматически в activity records, если пользователь не описывает отдельное когнитивное действие.

Несколько независимых последовательных действий в одном сообщении не запрещены: при высокой уверенности система может показать несколько preview-карточек; при неоднозначности — предложить разделить или подтвердить разбор.

Это правило уменьшает сложность сегментации, но не заменяет recognition profiles. G03 («После планки начала болеть поясница») всё равно требует распознавания планки, состояния боли, анатомической локализации и temporal relation.

## Первый implementation block

**GSR1L-P1**:

- минимальная versioned recognition-profile table;
- read-only assembled profile/candidate RPC;
- ограниченный seed пилотных профилей;
- без изменения Reality Graph write path;
- затем отдельный server temporal/evidence span parser и runtime integration.

Полная спецификация: `ARCTor_Value_Object_Recognition_Profile_and_AI_Server_Routing_Architecture_v1_1_RU_20260812.docx`.