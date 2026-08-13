# ARCTor.app — текущее фактическое состояние

Дата снимка: 2026-08-12

## 1. Git

Текущая рабочая ветка:

`feat/gsr1-global-system-reality-machine-contract-v1-20260811`

Последний подтверждённый и отправленный в GitHub commit:

`843d1ea6bdf0ee822416d5ccfa9d8d445718c7c4`

Сообщение commit:

`fix(reality-core): bind routing to live domain facet pairs`

`origin/main` на момент снимка:

`220af0b45d6e91163c25d764d052658ffac32937`

Важно: эксперименты GSR1H/GSR1I после этого commit выполнялись как контролируемые временные изменения. Если тест не проходил, скрипт возвращал рабочую папку к этому commit. Поэтому не следует считать незакоммиченные исправления частью продукта.

## 2. Global System Reality — зафиксированная модель

Global System Reality строится до P8.

Порядок слоёв:

1. Global system layer.
2. Reference/model layer — позже.
3. Personal layer — позже.

Основные сущности:

- Activity Event;
- Value Object;
- Fact / Measure;
- Typed Relation.

Тренды, окна и вычисляемые признаки — производные данные, а не Value Objects.

Жёсткие правила:

- у Value Object один структурный родитель;
- многомерные связи выражаются типизированными отношениями;
- сырые факты прикрепляются только к leaf;
- leaf — конечный семантический адрес и не имеет детей;
- `belongs-to` не означает `influences`;
- причинность не повышается автоматически из временного соседства;
- точная геолокация по умолчанию не собирается.

## 3. Global ontology seed

Зафиксировано:

- 12 DOMAIN roots;
- 35 intermediate;
- 103 leaf;
- всего 150 global ontology objects;
- 32 semantic pilot parameters;
- 27 leaf parameter contracts;
- 24 gold fixtures.

Ключевые объекты, использованные в текущем pilot:

- `state.physiology.body_weight`
- `state.physiology.heart_rate`
- `process.nutrition.meal`
- `process.nutrition.water_intake`
- `process.movement.walking`
- `process.learning.language_practice`
- `context.weather.air_temperature`
- `context.weather.cloudiness`
- `context.resources.available_time`
- `process.social.conflict_interaction`
- `process.creative.instrument_playing`

## 4. База данных / manual-applied ledger

Уже применены и должны считаться частью фактической схемы:

- `supabase/manual-applied/20260811_gsr1c_global_aliases_recognition_v3.sql`
- `supabase/manual-applied/20260811_gsr1d_global_runtime_bridge_ai_budget_v1.sql`
- `supabase/manual-applied/20260811_gsr1e_openai_pilot_price_refresh_budget_hardening_v1.sql`

GSR1B seed уже применён. Его нельзя просто запускать повторно без отдельной проверки.

Основные runtime функции:

- `recognize_global_value_object_text_v1(...)`
- `get_global_value_object_leaf_candidates_v1(...)`
- `preflight_ai_pilot_call_budget_v1(...)`
- global fact writer bridge существует, но preview pilot его не вызывает.

## 5. OpenAI pilot — действующие ограничения

Маршрут:

`/api/ai/reality/global-observation-preview`

Pilot:

- Nano only;
- 2 provider stages;
- 0 automatic retries;
- timeout 25 s на provider call;
- общий route deadline 55 s;
- максимум 20 000 консервативных input tokens на call;
- максимум 4 000 output tokens на call;
- `store=false`;
- preview only;
- факты в Reality Graph не записываются;
- wallet не дебетуется этим preview;
- обязательный hard cap одной операции: USD 0.10.

Документированный максимум обычной двухступенчатой pilot-операции: USD 0.00975.

## 6. Последние подтверждённые результаты GSR1H/GSR1I

Полный малый gold corpus дал 6/8 успешных сценариев:

- G06 Вес 94.8 кг. — PASS.
- G07 Пульс 72. — PASS.
- G11 Съел пирожное. — PASS, без выдуманных калорий.
- G13 Выпил 500 мл воды. — PASS.
- G17 На улице 19 градусов, облачно. — PASS.
- G19 Повторил немецкую фразу 20 раз. — PASS.

Два проблемных сценария:

- G21 `Сегодня вечером у меня есть примерно два свободных часа.`
- G24 `Ужинал вчера около девяти вечера.`

GSR1I V3 исправил G21: `context.resources.available_time` прошёл gold expectation.

G24 к V3 уже правильно определял:

- `process.nutrition.meal`;
- исходный временной фрагмент `вчера около девяти вечера`;
- локальное 21:00 Europe/Warsaw;
- `temporalPrecision=approximate`.

Оставалось канонизировать `meal_label`: AI возвращал русское `ужин`, gold contract ожидает стабильное машинное `dinner`.

GSR1I Dinner Canonical Label Smoke V4 попытался исправить только эту последнюю деталь, но тест снова завершился HTTP 500. Поэтому этот V4 patch НЕ является текущим кодом и должен быть диагностирован перед следующим изменением.

## 7. Что сейчас НЕ делать

- Не начинать P8.
- Не писать preview-факты в Reality Graph.
- Не выполнять полный 24-case OpenAI corpus одной командой без отдельного расчёта/подтверждения бюджета.
- Не повторять уже прошедшие 6 gold cases без причины.
- Не считать неудачный GSR1I V4 частью production source.
- Не применять `npm audit fix --force`.

## 8. Следующий технический шаг

Перед следующей попыткой G24:

1. открыть evidence последнего GSR1I V4;
2. определить точную причину HTTP 500;
3. исправить только найденную причину;
4. прогнать только G24;
5. при PASS — commit код + validator + recovery-документацию + evidence;
6. после этого вернуться к one-week pilot gates.

P8 остаётся заблокирован.
## 9. Авторитетное обновление — GSR1I V5, 2026-08-12

Этот раздел новее описания незавершённого G24 выше.

G21 и G24 теперь оба прошли узкие gold-проверки.

G24 Ужинал вчера около девяти вечера. подтверждён как:

- leaf process.nutrition.meal;
- meal_label=dinner;
- occurredAtRaw=вчера около девяти вечера;
- occurredAtIso=2026-08-11T19:00:00.000Z, что соответствует приблизительно 21:00 Europe/Warsaw;
- 	emporalPrecision=approximate;
- ошибочный duration=9 hour не сохраняется;
- Reality Graph write не выполнялся;
- ровно 2 provider calls;
- actual provider cost USD 0.000742;
- reserved maximum USD 0.004975.

Исправления GSR1I теперь включают:

1. enum-bound selectionKey=segmentId::canonicalKey, не позволяющий переносить leaf между candidate groups;
2. относительное русское время хранит точное исходное свидетельство и преобразуется сервером, а расплывчатый daypart не получает выдуманный час;
3. явное доступное время маршрутизируется как context.resources.available_time, а не leisure;
4. русские meal labels детерминированно нормализуются в стабильные machine values;
5. clock-time evidence не может стать elapsed duration без явной единицы длительности.

Production build, GSR1F validator, Global Seed validator и diff check прошли.

Следующий шаг после фиксации этого commit: продолжить оставшиеся Global System Reality one-week pilot gates. P8 остаётся заблокированным.
## 10. Авторитетное обновление — GSR1J, 2026-08-12

После GSR1I выполнен полный preflight 24 gold fixtures и платный диагностический пакет из пяти информативных случаев.

Preflight подтвердил:

- 24 fixture присутствуют;
- текущий preview умеет факты и один primary leaf на сегмент;
- event links, temporal relations, planning context и aggregate/dedup ещё не представлены в output contract;
- build и оба валидатора прошли.

Реальный Nano diagnostic дал 3 PASS / 2 FAIL:

- G01 PASS: две планки корректно разделены на два события, каждая duration=2 minute;
- G08 PASS: давление 125/78 корректно представлено одной записью с двумя связанными параметрами;
- G12 PASS: explicit 800 kcal корректно извлечено без выдуманных нутриентов;
- G05 FAIL: Спал примерно 6 часов. был отнесён к process.sleep.day_episode с confidence 0.33; duration=6 hour извлечён правильно, но day/night выбран без достаточного свидетельства;
- G14 FAIL: Сегодня выпил две чашки кофе. правильно отнесён к process.nutrition.caffeine_intake, caffeine_mg не выдуман, но количество две чашки потеряно, потому что текущий contract не представил безопасный serving/count fact.

Фактическая стоимость пяти операций: USD 0.00446935. Резерв: USD 0.0264944.

Новое правило стоимости тестов: полезные provider calls разрешены и должны использоваться, если повышают инженерную информативность. USD 0.10 — аварийный предохранитель от зацикливания/сбоя, а не цель экономить на нормальных тестах.

Следующий архитектурный блок: расширить preview contract для server-bounded event links / related targets, затем тестировать relation-heavy fixtures. Отдельно исправить неопределённый sleep и явный serving/count для кофе. Reality Graph write пока не включать. P8 остаётся заблокированным.
## 11. Архитектурный поворот после GSR1K — 2026-08-12

GSR1K проверял расширение preview-контракта для consumes, located_in и временных отношений.

Полученные результаты полезны, но показали границу подхода, основанного на последовательном уточнении prompt под отдельные языковые конструкции.

Факты GSR1K:

- V1: G20 прошёл; G03 и G11 выявили отдельные проблемы.
- V2: G11 полностью прошёл в кандидатной реализации: Meal → consumes → entity.food.item, без ложного meal_label.
- V3: G03 дошёл до правильного bounded temporal link precedes, но модель исказила текст доказательства.
- V4: остановился до OpenAI из-за устаревшей статической проверки; это не runtime-ошибка.
- V5: валидаторы/build прошли, но G03 снова сломался до второго этапа.
- V6: три одинаковых запуска G03 дали 0/3 PASS и три разных класса поведения:
  1. правильное разбиение, но выбран overlaps вместо precedes; сервер безопасно отверг связь;
  2. два корректных сегмента, но оба получили __NONE__;
  3. __NONE__ одновременно с facts/links; сервер безопасно отверг противоречивый output.

V6 подтверждает: строгие server guards работают, но поручать Nano одновременно сегментацию, выбор DOMAIN/FACET, leaf, параметров, event links и temporal links недостаточно устойчиво.

### Новое направление GSR1L

Не продолжать серию G03 V7/V8/V9 как локальное prompt-патчирование.

Спроектировать **профиль распознавания ценного объекта** как данные системы и яснее разделить ответственность:

1. AI понимает человеческий язык и выделяет нейтральные наблюдаемые события/состояния/аргументы.
2. Сервер детерминированно извлекает то, что можно извлечь без семантической догадки: числа, единицы, даты, точное/приблизительное время, длительности, поддерживаемые явные временные маркеры.
3. Сервер по профилям ЦО формирует небольшой допустимый набор leaf-кандидатов, параметров и типов связей.
4. AI только выбирает среди bounded candidates либо возвращает неопределённость.
5. Сервер окончательно проверяет leaf, parameter contract, relation code, тип мишени и source evidence.
6. Неопределённость является допустимым результатом; система не должна выдумывать более узкий ЦО.

Предварительный состав recognition profile для leaf ЦО:

- имена и алиасы;
- краткое смысловое определение;
- положительные примеры;
- разграничивающие/отрицательные примеры;
- характерные действия, состояния и объекты;
- разрешённые параметры;
- разрешённые relation codes;
- допустимые facet/kind для мишеней связей;
- признаки, достаточные для уверенного выбора;
- признаки, при которых нужно оставить unknown;
- fallback-правило, если более узкая классификация не доказана.

Профиль должен храниться как данные, а не как набор if под отдельные фразы.

Для времени сервер должен быть основным источником истины для поддерживаемых форм:
14:20, около 14:20, вчера, вчера вечером, с 14:20 до 15:10, 2 часа, около 2 часов, после X, потом, одновременно.

Для недоопределённых различий нужны нейтральные fallback leaf. Пример: если пользователь говорит Спал примерно 6 часов, но не сообщает день/ночь, нельзя выбирать дневной или ночной сон по догадке; нужен нейтральный sleep episode или эквивалентный безопасный механизм.

### Следующий шаг

GSR1L начинается **без изменения БД**: сначала инвентаризация существующих 103 global leaf, aliases, parameter contracts и relation guards; затем проектирование минимального универсального recognition-profile contract и проверка на репрезентативных объектах (планка, боль, еда, сон, кофе, прогулка).

После утверждения GSR1L создать отдельный Word-документ с архитектурной спецификацией и только затем решать, какие новые поля/таблицы действительно нужны в БД.

P8 остаётся заблокированным.
## GSR1L Recognition Architecture v1.1 — approved 2026-08-12

После полного repository/environment intake и отдельного live Supabase read-only intake утверждён экспериментальный GSR1L.

Фактический live baseline:
- 150 global objects = 12 root / 35 intermediate / 103 leaf;
- 89 approved/published global aliases, но aliases покрывают только 23 leaf;
- 39 active system parameter definitions, 52 active system assignments, покрыто 27 leaf;
- 12 semantic relation types;
- максимальная DOMAIN+FACET группа = 10 leaf; текущий candidate RPC hard-fails при группе >10.

Архитектурное решение:
- AI отвечает за понимание языка и bounded choice;
- Server отвечает за deterministic parsing, ontology constraints, candidate assembly, uncertainty, exact evidence и final validation;
- новая versioned recognition-profile сущность хранит только недостающие recognition/disambiguation данные;
- aliases, parameters и semantic relation registry переиспользуются и не дублируются;
- UNKNOWN/UNRESOLVED является валидным результатом;
- event links не смешиваются с долгоживущими VO relations;
- Reality Graph write path не меняется до отдельного gate.
- UX/input contract: одно сообщение по умолчанию описывает один основной эпизод; параллельные активности, мысли, чувства и состояния разрешены в том же сообщении и сохраняют собственную семантическую роль. Это мягкое правило, не hard rejection.

Следующий блок: **IMPLEMENTATION GSR1L-P1** — минимальная recognition-profile table + read-only assembled profile/candidate RPC + ограниченный pilot seed. Перед SQL/кодовыми изменениями используется уже завершённый intake; новый intake нужен только если implementation scope выходит за проверенную инфраструктуру.

Полная спецификация: `docs/recovery/specs/ARCTor_Value_Object_Recognition_Profile_and_AI_Server_Routing_Architecture_v1_RU_20260812.docx`.

## 2026-08-12 — Global catalog + Activity AI Lab production correction

Маркер: `GLOBAL_CATALOG_ACTIVITY_AI_PRODUCTION_V1`

`/value-objects` теперь является объединённым каталогом доступных ЦО/ОН:
- GLOBAL SYSTEM objects из `scope_code=global`;
- объекты текущего активного actor/profile.

Глобальные системные объекты показываются read-only в списке и явно помечаются
как системные. Персональные объекты сохраняют обычный переход на карточку.

`/activity-ai-lab` остаётся отдельной страницей только для ввода и разбора
активности. Каталог ЦО туда не переносится.

Global Reality preview включён по умолчанию. Точное значение
`GSR1_OPENAI_PILOT_ENABLED=false` остаётся аварийным OFF. Response получает
безопасный `analysisTrace` с реальными bounded candidate groups; скрытая
chain-of-thought не возвращается.

## 2026-08-12 — AI-A0 закрыт; AI-A1 Context Manifest foundation

Маркер: `AI_A1_CONTEXT_MANIFEST_FOUNDATION_V1`

AI-A0 подтверждён по source intake и live read-only DB audit. Фактически переиспользуются существующие system/personal AI instructions, Value Objects/aliases/parameters/relations, AI usage/budget и предметные activity logs/corrections/reviews.

AI-A1 создаёт универсальный execution/context provenance поверх существующей инфраструктуры:
- `ai_analysis_executions` — одна логическая AI-операция ARCTor;
- `ai_context_manifests` — один воспроизводимый manifest на provider stage;
- `ai_usage_events.analysis_execution_id` связывает provider usage с общей операцией.

Runtime Global Reality использует один analysis execution для двух Nano stage. Каждый stage хранит protocol/schema/prompt/request/response hashes, bounded retrieval snapshot, provider controls и validator result. Raw user text и полный prompt не дублируются в manifest.

Сохраняются существующие safety-gates: preview-only, Reality Graph write=false, Nano, максимум 2 provider calls, automatic retries=0, `store=false`, существующий budget preflight/hard cap.

Канонический AI Architecture Lock: `docs/reality-core/ARCTOR_AI_ARCHITECTURE_LOCK_V1_RU.md`.
Матрица AI-A0 REUSE/ALTER/CREATE: `docs/recovery/specs/ARCTOR_AI_A0_REUSE_ALTER_CREATE_V1_RU.md`.

Следующий блок после production runtime postcheck AI-A1: **AI-A2 Recognition Profiles**.
