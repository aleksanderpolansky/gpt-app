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

## AI_A2_P1_RECOGNITION_FOUNDATION_V1 — 2026-08-13

AI-A1 production runtime postcheck закрыт: 6/6 PASS. Один production Global Reality preview создал одну completed analysis execution, два validated context manifests и два связанных ai_usage_events; store=false, automatic retries=0, обязательные hashes присутствуют.

AI-A2 / GSR1L-P1 применён в live Supabase и прошёл 14/14 acceptance checks. Создан versioned recognition-profile layer для global leaf, 11 активных pilot profiles, service-role-only assembled-profile/candidate RPC boundary. Existing concept_aliases и старый exact recognizer сохранены; global ontology осталась 150 объектов.

Контрольная фраза Stokrotka на уровне нового bounded candidate RPC включает process.finance.purchase и не включает ошибочный process.home.household_task. Generic sleep остаётся unresolved между day/night и не угадывается.

Важно: /activity-ai-lab runtime ещё не переведён на новый AI-A2 candidate assembler. Reality Graph write path не менялся.

Следующий блок: AI-A2-P2 runtime integration — подключить get_global_value_object_recognition_candidates_v1 к Global Reality preview, сохранив bounded choice, UNKNOWN/UNRESOLVED, два provider calls max, AI-A1 manifests и preview-only boundary.

## AI_A2_P2_RUNTIME_INTEGRATION_V1 — 2026-08-13

AI-A2-P1 recognition foundation ранее применён в live Supabase и принят 14/14; repository checkpoint = 23e1e44ed36e8e01c501f2ddf618d0563c48e630.

P1 validator v1 имел Windows-only дефект: он сравнивал raw SHA working-tree SQL и падал при core.autocrlf=true, хотя Git blob и нормализованный SQL были неизменны. P2 исправляет validator на LF-normalized SHA; миграция и live DB не меняются.

AI-A2-P2 переводит Global Reality preview с старого hard DOMAIN/FACET candidate fallback на public.get_global_value_object_recognition_candidates_v1. Сервер отправляет в recognition RPC точный sourceFragment пользователя, а не AI-перефразированный lookupText. На этом шаге semantic_tags намеренно пусты: Stage 1 ещё не перепроектирован в neutral semantic frame.

Candidate set ограничен 5. NO_MATCH, UNRESOLVED и UNRESOLVED_TOO_BROAD остаются невыбранными; Stage 2 получает только __NONE__ как допустимый selection key. SINGLE_CANDIDATE/CANDIDATES_READY разрешают выбор только candidate с evidenceClass exact или strong. supporting-only candidate и supporting sibling не могут быть выбраны моделью; дополнительный server guard блокирует обход schema enum.

Старый runtime fallback get_global_value_object_leaf_candidates_v1 и hard error по размеру DOMAIN+FACET >10 удалены из preview runtime. Старые DB RPC/aliases физически не удаляются: AI-A2-P1 сохраняет их как совместимый слой.

AI-A1 execution/context manifests, два provider calls max, nano tier, store=false, maxRetries=0, budget/timeout fuses и preview-only dbFactWriteExecuted=false сохранены.

Production runtime acceptance AI-A2-P2 ещё PENDING. После release нужен живой preview Stokrotka и отдельный unresolved sleep regression; ничего не сохранять в Reality Graph до прохождения preview gates.

## AI_A2_P3_SEMANTIC_PROJECTION_PREVIEW_V1 — 2026-08-13

AI-A2-P2 code checkpoint eadead1b91fb216156ecd1a330f5e956066a292d прошёл live production acceptance: Stokrotka распознаётся через process.finance.purchase без старого household primary route; generic «спал примерно 6 часов» остаётся unresolved между day/night.

P3 добавляет только детерминированный preview дополнительных смыслов вокруг уже выбранного primary leaf. Primary classification не меняется, новые структурные родители не создаются, Reality Graph не пишется, дополнительных provider calls нет.

Для selected process.finance.purchase P3 v1 различает: пищевые товары -> entity.food.item (DERIVED); релевантность питанию -> domain.nutrition_consumption (DERIVED); возможный бытовой provisioning -> process.home.household_task (INFERRED) только при food cue + store cue; возможный family benefit -> domain.relationships_social_life (INFERRED) только при явном family cue. Продукты сами по себе не являются доказательством интереса семьи.

Stage 1 может разбить один эпизод на несколько fragments. Для secondary projection разрешён полный исходный inputText как context, но food cue обязан присутствовать в sourceFragment выбранной покупки. Projection target обязательно проверяется в live global active value_objects и по allowlisted node role.

/activity-ai-lab показывает эти строки отдельной меткой СМЫСЛ и их epistemic status. Это preview-аннотация; save path пока их не сохраняет. P3 production runtime acceptance после release остаётся PENDING.

## AI_A3_P2_FEEDBACK_REVIEW_UX_V1 — 2026-08-13

AI-A2-P3 production acceptance завершён PASS: обычная Stokrotka даёт purchase + food/nutrition + possible household без family; generic sleep остаётся unresolved без projections; явная покупка жене и детям даёт family только как INFERRED.

AI-A3-P1 Data Capital foundation V2 применён вручную и принят 20/20. Таблицы ai_feedback_events / ai_feedback_corrections / ai_feedback_outcomes append-only для application service role; migration не создала пользовательских строк.

P2 добавляет review controls ✓ / ✕ / ✎ / ? на /activity-ai-lab. ✓/✕/✎ создают append-only ai_feedback_events, привязанные к completed ai_analysis_execution текущего app user + active actor. ? только показывает основание локально и ничего не пишет. Один feedback click является evidence конкретного события и не изменяет global truth/ontology.

Добавлен + Добавить связь с ЦО. Поиск использует существующий selector с opt-in includeGlobal=1 и level=leaf, объединяя active GLOBAL leaves и ЦО активного профиля. До сохранения активности выбор хранится как manual_leaf_link intent в Data Capital. После создания canonical activity_event Activity Review материализует intent в activity_value_object_links как semantic_exposure/manual/user_confirmed. Существующая такая связь не перезаписывается: manual materialization использует ignoreDuplicates=true, а пользовательское подтверждение остаётся отдельным Data Capital event.

P3 automatic semantic projections остаются preview-only и не материализуются. Дополнительных OpenAI calls P2 не добавляет. Production acceptance нового UX после release = PENDING.

## AI_A3_P3_ACTIVITY_AI_LAB_DIRECT_SAVE_V1 — 2026-08-13

AI-A3-P2 live UI проверен: ✓ подтверждает, ✕ отклоняет, ✎ сохраняет комментарий, ? показывает основание; manual leaf selector нашёл GLOBAL leaf «Пищевой продукт/блюдо» и сохранил manual intent. При переходе к сохранению выяснилось, что AI Lab всё ещё отправляет пользователя в legacy /calendar/activity-review. Этот экран повторно запускает старый semantic preview, дублирует уже завершённый Global Reality анализ и в live UI показал mojibake в части русских заголовков. Manual materialization через этот старый маршрут не принят как production gate.

P3 выводит Activity AI Lab из legacy container: после успешного полного Global Reality анализа past/future сохраняются прямо с /activity-ai-lab через canonical POST /api/activity/events. На AI Lab добавлены редактируемый title, общий PP1 timing editor и planned target selector для future. Past после успеха открывает /activity-today; future — /calendar. Exact future schedule сохраняет существующую calendar projection policy API.

Manual leaf intents после создания activity_event материализуются существующим /api/ai/reality/manual-link-materialize как semantic_exposure/manual/user_confirmed без overwrite существующей связи. Text/locale edit после анализа инвалидирует provenance; после partial create поля и исходное сообщение блокируются, retry завершает links без повторного activity create.

Legacy /calendar/activity-review этим шагом физически не удаляется: другие calendar/journal callers ещё могут от него зависеть. Полное удаление — отдельная миграция callers. Automatic facts и P3 semantic projections P3 direct-save не материализует; подтверждения остаются Data Capital до отдельного controlled materialization шага. Production acceptance direct-save = PENDING.

## AI_A3_P4_FACT_CONTRACT_RESILIENCE_V1 — 2026-08-13

AI-A3-P3 direct save remains the canonical path from /activity-ai-lab. Production acceptance exposed a separate Global Reality failure boundary: an optional AI fact row could violate the system parameter value shape and abort the whole analysis, forcing fallback and blocking save. AI-A3-P4 isolates this boundary. The server parameter contract remains authoritative; extra model value fields are normalized away when the expected typed value and exact source evidence exist, otherwise only that optional fact is dropped. Semantic candidate selection, unresolved guards, provider budget and preview/no-write boundaries remain strict. Repository release V1 stopped before commit during TypeScript build with TS2677 in the null-filter type predicate. Release V2 fixes only that compile-time predicate with 'NonNullable<typeof fact>'; runtime semantics are unchanged. Production rerun of the two failed phrases is pending.

## AI_A3_P5A_ACTIVITY_FACT_MATERIALIZATION_V1 — 2026-08-13

The live read-only P5 foundation preflight passed 24/24. Direct save now materializes explicit server-validated Global Reality facts through the existing service-role-only attach_global_observation_facts_gsr1_v1 writer after activity_event creation. The writer transactionally creates activity_event_measures, activity_object_facts(value_object_id=GLOBAL leaf), and activity_value_object_links(semantic_exposure). Confirmed feedback becomes confirmed/is_user_confirmed; rejected facts are skipped; unreviewed facts remain proposed. Semantic projections remain Data Capital only. Manual leaf intents continue through the separate P2 materializer.

## AI_A3_P5B_MUTUAL_LINKS_V1 — 2026-08-13

AI-A3-P5A production acceptance is closed 12/12. The canonical writer hotfix V3 is live 8/8 and is now checkpointed in source/recovery. P5B adds mutual read/display links across Activity Journal/Calendar, Activity Facts and leaf Value Object pages. Neutral measures are grouped by measure_id; one measure may fan out to several leaf projections without duplicating the measured value. Activity titles preserve the user's wording and no longer receive an automatic semantic prefix. P5B adds no OpenAI calls and no new persistence tables.


## AI_A3_P5B_GLOBAL_SYSTEM_VALUE_OBJECT_DETAIL_HOTFIX_V1 — 2026-08-13

P5B live UI acceptance confirmed mutual links on /activity-facts and /activity-today, but opening the linked GLOBAL leaf `process.movement.walking` returned 404. Root cause: `/value-objects/[id]` still loaded only `owner_user_id + owner_actor_id` rows even though the combined catalog and P5B APIs already expose GLOBAL System objects. The hotfix allows authenticated read-only detail for active/system GLOBAL ontology objects while preserving actor ownership for non-global objects. Global objects remain non-editable/non-restructurable. Their tree/path is read from `scope_code=global`, and ontology node roles drive root/intermediate/leaf rendering so the P5B leaf history panel can render. No DB writes/OpenAI calls are added.


## AI-A3 P5B Mobile GLOBAL Catalog Localization Hotfix v2

Дата: 2026-08-13.

- baseline: `d5a474860241aa261220ccaf8e7bd91e8e43da3a`;
- мобильный `/value-objects` ограничен по ширине и не должен создавать горизонтальный overflow;
- GLOBAL/System карточки открывают общую read-only detail page;
- 150 GLOBAL System canonical keys имеют title/description для en/pl/ru/uk/de/es/cs;
- list/detail/path используют локаль интерфейса;
- actor-scoped пользовательские ЦО/ОН не переводятся автоматически;
- GLOBAL edit/restructure права не добавлены;
- SQL, DB writes и OpenAI вызовы отсутствуют;
- после live UI acceptance закрыть P5B и перейти к P5C quick capture + review buffer.


## AI-A3 P5B GLOBAL full-card read-scope hotfix v1

Дата: 2026-08-14.

- baseline: `b3147d26f7e89382994c323b0f2a6ecaf8ec6914`;
- основной GLOBAL detail и локализация уже опубликованы;
- остаточный дефект находился в клиентском full-card блоке: ontology/aliases/relations GET оставались owner-scoped и после гидратации показывали ACCESS_DENIED;
- ontology GET теперь имеет отдельный read-only GLOBAL/System путь;
- aliases GET читает GLOBAL aliases только для текущей locale плюс language-neutral aliases;
- relations GET для GLOBAL/System возвращает безопасную read-only системную проекцию без actor-private candidates/relations;
- actor-scoped RPC и write guards сохранены;
- GLOBAL edit/restructure/alias mutation/relation mutation права не добавлены;
- SQL, schema writes и OpenAI calls отсутствуют;
- следующий шаг: live acceptance root + leaf; после PASS P5B CLOSED и P5C quick capture + review buffer.


## AI-A3 P5B GLOBAL leaf detail consistency hotfix v1

Дата: 2026-08-14.

- baseline: `f661ea575d6864092782b2143ddd2f32a2f7d0b0`;
- GLOBAL full-card read-scope и локализация уже прошли live acceptance;
- ontology_node_role_code теперь авторитетен для root/intermediate/leaf, legacy node_role_code используется только при отсутствии ontology role;
- GLOBAL semantic leaf больше не получает ложное сообщение «это не лист» в параметрическом блоке; standards GET возвращает безопасную read-only пустую проекцию до появления отдельного global parameter-assignment слоя и не читает actor-private assignments/targets;
- верхний счётчик связанных активностей использует P5B relation sources: activity_object_facts + active semantic_exposure/planned_target links;
- ActivityMutualLinksPanel/«Связанная реальность» не изменён;
- GLOBAL edit/restructure/write права не добавлены; SQL/schema/OpenAI вызовов нет;
- следующий шаг: один live screenshot GLOBAL leaf «Ходьба»; при PASS P5B CLOSED и P5C quick capture + review buffer.

## 2026-08-14 — AI-A3 P5C QUICK CAPTURE + REVIEW BUFFER V1

- P5A: CLOSED.
- P5B: CLOSED по live acceptance GLOBAL root + leaf «Ходьба» на main d41a5490f2c153de5e2911837de85beee8ac2008.
- P5C v1: после успешного полного Global Reality анализа activity_event создаётся автоматически без второго подтверждения.
- Один segment = одна самостоятельная activity_event. Несколько сегментов одного сообщения не объединяются в package/container.
- actual автоматически попадает в Журнал активностей + «Требуют проверки»; planned — в Календарь + «Требуют проверки».
- Для одной созданной активности UI открывает её сохранённый review snapshot в /activity-ai-lab; для нескольких — /activity-review.
- Review UI переиспользует страницу результата /activity-ai-lab; вместо «Сохранить как прошедшую» / «Запланировать» — одна кнопка «Внести изменения».
- Очередь проверки — read-model по metadata_json activity_events; новая SQL schema не добавлялась.
- OpenAI/ontology write boundaries не расширялись; fallback-analysis по-прежнему не выполняет автоматическое сохранение.
- NEXT: live acceptance P5C на одной actual, одной planned и одном multi-activity сообщении; затем уточнить жизненный цикл закрытия review item.

<!-- AI_ADMIN_CONTROL_CATALOG_V1 -->
## 2026-08-14 — Единый административный каталог правил AI

- /admin/ai-instructions показывает три уровня управления: редактируемые инструкции AI, версионируемые детерминированные правила обработки и read-only системные ограничения из кода.
- Приоритет: system guard (300) > processing rule (200) > AI instruction (100).
- Детерминированные правила используют конечный безопасный словарь matcher/action; исполняемый JS/SQL/regexp из Supabase запрещён.
- Правило measurement_without_independent_predicate зарегистрировано как системный default каталога. Оно должно быть подключено к runtime универсальным executor в следующем P5C Durable шаге; до этого интерфейс честно показывает catalog_only_until_executor_wired.
- Источник, символ, назначение и инструкция по изменению каждого зарегистрированного hard guard видимы на той же странице.
- P5C Durable Handoff всё ещё не выпущен; последний V2 был остановлен до commit/push старым P5A regression invocation и откатан чисто.

## AI_A3_P5C_DURABLE_RULE_EXECUTOR_V3
- Quick Capture сначала фиксирует raw_activity_signal, после чего обработка продолжается server-side через Next after().
- activity_quick_capture теперь читает активные безопасные processing rules из /admin/ai-instructions runtime-каталога.
- modifier-only measurement/time не создают отдельную activity при соответствующем активном правиле; применённые ruleCode/revision сохраняются в metadata.
- Плановое локальное время конвертируется с учётом IANA timezone пользователя.
- Следующее действие: live acceptance ухода со страницы сразу после клика и контроль «завтра 18:00 тренировка 40 минут».

## AI_A3_P5C_DURABLE_RULE_EXECUTOR_V4_VALIDATOR_EOL_HOTFIX
- V3 product commit e4e01adea1be0398e62d2d9c143b819737d9490c сохранён без изменений.
- Windows post-commit validator был исправлен: все читаемые validator-ом исходники нормализуются CRLF/CR -> LF только в памяти.
- Причина V3 stop: multiline checkpoint invariant зависел от окончания строк после checkout при core.autocrlf=true.
- Следующее действие: live acceptance Durable Handoff и контроль будущей активности.

## AI_A3_P5C_REVIEW_CONTROLS_V1
- Live Durable Handoff принят: уход со страницы не останавливает сохранение; будущая «тренировка 40 минут завтра в 18:00» стала одной planned activity.
- На странице сохранённой активности из «Требуют проверки» восстановлены инструменты ✓ / ✕ / ✎ / ? без скрытого edit-mode gate.
- «+ Добавить связь с ЦО» доступен сразу; для уже созданной activity_event ручная leaf-связь немедленно материализуется как semantic_exposure.
- Статус quickCaptureReviewStatus остаётся pending; автоматическое закрытие проверки в этот шаг не добавляется.
- Следующее действие: live acceptance review controls, затем отдельный контракт завершения проверки.

## AI_A3_P5C_REVIEW_REFINEMENTS_V1
- Review manual leaf picker переведён на staged multi-select: можно выбрать произвольное число ЦО/ОН и материализовать их одной кнопкой подтверждения.
- RU/UK task-like инфинитив (например «выгулять собаку») детерминированно считается future intent; future clock без даты назначается на ближайшее предстоящее wall-clock время.
- Durable source preservation сохраняет полный исходный текст single-row активности, включая «18.00», а multi-row сохраняет независимость действий.
- UI locale Activity AI Lab отделён от языка сообщения; review snapshot больше не переключает интерфейс на язык исходного текста.
- Кнопка «Внести изменения» открывает явный change mode и показывает назначение доступных review-инструментов.
- Следующее действие: live acceptance multi-select, «выгулять собаку 18.00» -> calendar, locale=en/es shell, затем отдельный resolved-transition contract.

## LOCALIZED_CONTENT_FOUNDATION_ACTIVITY_V1
- Зафиксировано новое платформенное правило: пользовательский оригинал хранится неизменным, а содержательные тексты получают версии en/pl/ru/uk/de/es/cs для отображения и поиска.
- Введён общий generic localization envelope/executor; первая production-интеграция — P5C activity_event.
- Локализация activity выполняется в durable background после физического сохранения activity_event и не может отменить сохранение активности при ошибке перевода.
- AI-перевод использует Nano, существующий hard budget preflight и ai_usage_events.
- /activity-review и сохранённый /activity-ai-lab читают локализованные title/inputText по UI locale; исходный текст остаётся в original.
- selector ЦО/ОН принимает locale: GLOBAL объекты локализуются по canonical_key; actor-owned объекты используют localizedContent при наличии.
- Убрана промежуточная кнопка «режим изменений открыт»: на review сразу доступны инструменты, а «Сохранить изменения» явно завершает проверку и переводит quickCaptureReviewStatus в resolved.
- Следующий шаг после live acceptance: адаптеры предприятий, товаров, предложений, профилей и пользовательских ЦО к тому же localization contract.

## AI_A3_P5C_TEMPORAL_INTENT_RECOVERY_V1
- Quick Capture получил обязательный видимый двухпозиционный режим «Произошло / Запланировать». По умолчанию выбран «Произошло», чтобы сохранить быстрый ввод; пользователь может одним кликом переключить на план.
- Выбранный режим записывается в durable receipt до AI-анализа и является authoritative: past -> actual/journal, future -> planned/calendar. LLM/инфинитивная эвристика не могут его переопределить.
- Добавлен fail-closed time conflict guard: будущая явная дата/время при «Произошло» и прошлая явная дата/время при «Запланировать» не сохраняются молча.
- Durable handoff дополнен request-driven recovery watchdog: polling конкретной квитанции и открытие «Требуют проверки» подхватывают pending/received и stale processing сообщения идемпотентно.
- Отдельный Vercel cron не добавлялся: восстановление запускается только когда результат снова нужен пользователю, без фонового расхода ресурсов в отсутствие пользователя.
- P5C temporal/durability после live acceptance этого релиза можно закрывать и переходить к полному Runtime Context Compiler / Data Capital capture.

## 2026-08-15 — VALUE_OBJECT_AUTHORING_ONTOLOGY_BRIDGE_HOTFIX_V1_5

- Исправлен разрыв между старым ручным authoring и P1C runtime ontology: root/intermediate/leaf теперь создаются через существующий service-role RPC create_value_object_ontology_v1.
- Новый пользовательский root сразу создаётся как DOMAIN / domain_root / root, actor-scoped, private, privacy=standard, с root pointer на самого себя и definition version 1.
- Родителем нового intermediate/leaf может быть только ontology-ready actor-owned root/intermediate.
- Старые личные ручные pre-ontology тестовые ЦО текущего владельца разрешено удалить только отдельным release-cleanup после read-only preflight; GLOBAL, system_model, commercial и связанные объекты не являются кандидатами.
- Следующий live acceptance: создать новый root, убедиться в отсутствии P1C/P2D NOT_ONTOLOGY_READY, создать leaf и назначить ему параметр/target.

## AI_A1_RUNTIME_CONTEXT_COMPILER_V1 — 2026-08-15

Runtime Context Compiler V1 добавлен как единая серверная сборка контекста для значимых AI-стадий Global Reality pilot. Компилятор связывает immutable guard, активные системные инструкции, персональную инструкцию как недоверенное пользовательское руководство, actor/locale/timezone, bounded retrieval snapshot, tool permissions, protocol/schema hashes и service-delivery-only data-use snapshot. Тот же скомпилированный system prompt и request payload используются для budget estimate, Context Manifest и provider call. Новая таблица не создаётся: переиспользуется public.ai_context_manifests.

## AI_A1_1_EXECUTION_BOUNDARY_HOTFIX_V1_3 — 2026-08-16

Live AI-A1 acceptance обнаружил execution-boundary defect: semantic analysis имел 2 validated Context Manifest, но последующая локализация activity ошибочно записывала третий ai_usage_event в уже завершённый semantic execution. Hotfix выделяет content_localization в отдельный ai_analysis_execution с собственными Context Pack, Context Manifest и usage event; semantic execution остаётся 2 manifests / 2 usage. Персональные actor-инструкции для перевода отключены, чтобы пользовательские правила не меняли смысл исходного текста. Код выпущен только после production tsc/eslint/build; следующий шаг — новый live postcheck.

## AI-A1 / AI-A1.1 — CLOSED, 2026-08-16

Финальный production postcheck AI-A1.1 прошёл полностью.

Зафиксировано:

- semantic execution: completed, 2 validated Context Manifest, 2 linked usage events;
- content_localization: отдельный completed execution, 1 validated Context Manifest, 1 linked usage event;
- parent semantic execution используется только как lineage;
- actor-specific guidance для локализации отключено;
- provider store=false;
- automatic retries=0;
- все 18 acceptance-флагов финального read-only postcheck=true.

Live acceptance также обнаружил и закрыл schema gap: ai_usage_events_operation_kind_allowed не содержал content_localization. В production вручную применён additive schema hotfix supabase/manual-applied/20260816_ai_a1_1_usage_operation_kind_schema_hotfix_v2.sql. Он изменил только CHECK registry, не менял data rows, RLS или browser privileges.

Статус:

- AI-A0 Storage Audit — CLOSED.
- AI-A1 Context Manifest — CLOSED.
- AI-A1 Runtime Context Compiler — CLOSED.
- AI-A1.1 Execution Boundary — CLOSED.

Следующий архитектурный блок: AI-A3 Data Capital — полный контракт семантического капитала. Бардак ручного authoring ЦО/ОН остаётся отдельным отложенным UI/ontology debt и не должен расширять AI-A3 scope.

## AI-A3.1 review-first semantic facts — 2026-08-17

Зафиксирован новый жизненный цикл активности:
- quick capture сначала создаёт activity_event и review marker;
- на capture AI calls=0 и facts written=0;
- глубокий анализ запускается только при открытии review item;
- semantic review делает один широкий provider call;
- модель получает каталог существующих GLOBAL leaf и возвращает 1 primary + минимум 7 дополнительных разных перспектив;
- human review может accept/reject/replace/add leaf;
- факты создаются только после Save review;
- для каждого выбранного leaf process_count=1 создаётся всегда;
- duration создаётся для каждого выбранного leaf, если duration известна;
- каждый другой measurement также создаётся отдельно для каждого выбранного leaf;
- проверка «parameter compatible with leaf» удалена из нового writer;
- leaf coefficient rules используют контекстный факт другого leaf и multiplier;
- no rule / no context / condition false => x1;
- несколько сработавших коэффициентов перемножаются;
- raw/calculated fact split не вводится;
- primary correction может сохранять actor-scoped wording example, без auto-mutation Global profile.
## CONTENT-L10 Global Content Localization V1 — 2026-08-17
Реализован единый persistent localization envelope V2 для пользовательского контента на 7 локалей: en/pl/ru/uk/de/es/cs. Организации, legacy offers, product/service value_objects и gift-certificate activity_events локализуются при создании/редактировании. Публичные directory/offers/certificates используют strict locale resolver без fallback на исходный язык. Ручная локаль фиксируется в humanLocales и не перезаписывается последующей AI-локализацией. Для organizations/offers добавляется metadata_json; activity_events/value_objects используют существующий metadata_json.


## 2026-08-18 — BUSINESS CONTACTS PUBLIC-FIRST INLINE EDIT V1

- Базовая карточка предприятия получила редактируемые публичные Phone + Website + direct-message channels.
- Редактор остается public-first: автор видит тот же layout, что посетитель; дополнительные owner-only поля раскрываются вниз под строкой публичных действий.
- Одновременно открыт максимум один contact editor.
- Поддержаны WhatsApp, Telegram, Signal, Viber и Custom direct link.
- Соцсети не смешиваются с direct contacts: каналы сохраняются в social_links_json.arctor_contact_channels_v1; social feed/publishing остаются отдельной будущей задачей.
- SQL и изменение схемы БД не требуются.


## 2026-08-18 — BUSINESS FEATURED BLOCK + GIFT CARDS V1

- Третий пустой блок верхней строки карточки предприятия получил public-first назначение: спецпредложения/новости + подарочные карты.
- В owner edit layout этот же блок содержит загрузку изображения, HTTPS-ссылку и короткое локализуемое описание; отдельная admin-form не создается.
- Публичное промо-изображение хранится в Supabase Storage bucket arctor-public-media; в organizations.social_links_json хранится только компактный URL/link metadata.
- Короткое описание входит в существующий CONTENT-L10 localizedContent envelope как featuredShortDescription.
- Полный rename сертификатов/superoffer во всем UI пока не выполнялся.
- Звездочка logo card выровнена со строкой категории; адрес сделан визуально вторичным.


## 2026-08-18 — FEATURED BLOCK V2 layout hotfix

- Подпись `Локализация` на публичной карточке адреса опущена ниже, чтобы визуально относиться к карте, а не к строке адреса.
- Заголовок `Подарочные карты` в public и owner edit featured-card больше не прижат к низу колонки: он идет сразу после ссылки/контента, без лишней пустоты между секциями.


## 2026-08-18 — ARCTOR_BUSINESS_GIFT_CARD_PREVIEW_MEDIA_MOBILE_PERF_V1

- На карточке предприятия превью подарочных карт переведено с legacy `offers.certificate_available` на актуальный activity-based источник `activity_gift_certificate_terms`.
- В блоке подарочных карт показываются компактные превью опубликованных доступных карт: изображение товара/услуги, название и POINTS; переход ведёт на карточку сертификата.
- То же activity-based превью и фактическое количество подарочных карт используются в owner edit странице.
- У изображения спецпредложения/новости в owner edit добавлена явная текстовая кнопка удаления; сохранение пустого imageUrl использует уже существующую server-side семантику удаления.
- Создание подарочного сертификата больше не вызывает повторный AI-перевод title/description, если товар/услуга уже имеет полный 7-locale envelope и termsText пуст. Для неполной локализации или собственных условий сертификата старый AI fallback сохранён.
- Первый шаг `/offers/new` получил mobile intrinsic-width hardening: min-width=0, ограничение form controls, более узкие mobile paddings и двухколоночный layout только с XL.
- SQL/схема БД в этом шаге не меняются.

## 2026-08-19 — AI RIGHT RAIL MULTIMODAL ACTIVITY V1

- Правый `AI-Navigator` переводится из недоделанного single-button rail в три явных режима: `past` / `future` / `chat`.
- Desktop использует корпоративный segmented switcher ARCTor; mobile — три постоянные кнопки справа с теми же режимами. Messenger/WhatsApp используются только как UX-референс поведения, не как визуальный стиль.
- `past` и `future` не создают новый write-path: они вызывают канонический `/api/activity/quick-capture` с явным `temporalDirection` и стабильным `clientRequestId`. Past ведёт в review-first flow; future — в календарь. Retry сохраняет тот же request id, чтобы неопределённый сетевой повтор не дублировал activity event.
- Chat получил optimistic user message, стабильный scroll-to-bottom, сохранение позиции при ручном чтении выше, индикатор новых сообщений, retry, CTA-кнопки и восстановление server chat history, когда локальная история отсутствует.
- Голосовой ввод V1 реализован как browser speech-to-text в composer; новая серверная запись аудио не создаётся.
- Фото V1 из исходного релиза было ограничено `chat`; V5 снимает это ограничение: JPG/PNG/WebP до 3 MiB доступны в `past`, `future` и `chat`. Для activity-mode бинарник сохраняется как private raw evidence в Supabase Storage, а activity capture по-прежнему не вызывает AI.
- Responses API получает изображение как `input_image` data URL с `detail=low`; `store=false` сохраняется.
- `invalid_price_snapshot` диагностирован как compatibility regression между GSR1E активными USD price snapshots (`usd_to_eur_rate = null`) и старым EUR-wallet chat billing. Runtime теперь использует текущие активные token prices и, только если активный snapshot не содержит FX, подставляет последний сохранённый положительный OpenAI USD→EUR rate в памяти. DB/schema этим релизом не меняются.
- Пользовательские тексты новых режимов/ошибок/CTA имеют ru/pl/en/es/uk/de/cs варианты через существующий i18n helper.
- V4 production release завершён PASS и запушен в `main` commit `2edd9026bd0d4e7764993d92c28ae30384fce01f`.
- Статус после V4: RELEASED_AWAITING_LIVE_UX_ACCEPTANCE.

### AI RIGHT RAIL — production gate 19.08.2026 / ESLint hotfix V4
V3 дошёл до реального `npm run lint` на production checkout и был корректно остановлен до commit: validator 18/18 PASS, затем `react-hooks/set-state-in-effect` обнаружил синхронный `setSelectedImage(null)` внутри `useEffect` в `global-ai-navigator.tsx`. Runner выполнил rollback PASS, поэтому baseline остался `f0595a0d286f0a04b88d2bdacf89fb3987852b89`. V4 переносит очистку image attachment в явный обработчик смены режима, делает обработку нового сообщения deferred через `setTimeout`, исправляет dependency массива эффекта и удаляет 6 legacy/unused UI символов, показанных production ESLint. После этого V4 прошёл validator 20/20, ESLint `--max-warnings=0`, production build, commit и push; release commit — `2edd9026bd0d4e7764993d92c28ae30384fce01f`.


### AI RIGHT RAIL — V5 activity image evidence + semantic-review price recovery
- Live acceptance после V4 подтвердил работу трех режимов и canonical past write: сообщение `вчера з'їв мішок картоплі` было сохранено и открыло CTA `Перевірити аналіз`.
- Одновременно выявлен отдельный runtime blocker глубокого review: `AI_A3_1_SEMANTIC_REVIEW_BUDGET_BLOCKED:PRICE_SNAPSHOT_STALE`. Причина — GSR1E max age 7 days; snapshot, проверенный 11.08, стал старше лимита 19.08.
- V5 разрешает фото во всех трех режимах. В `past/future` изображение не отправляется в публичный URL и не кладется base64 в activity metadata: оно сохраняется в private Storage bucket `activity-evidence-media-v1`, а в signal/event metadata остаются только bucket/path/name/mime/size/sha256/provenance.
- Quick capture сохраняет activity + private image evidence без AI (`aiCallsAtCapture=0`, `factsWrittenAtCapture=0`). При открытии semantic review server скачивает приватное изображение через service role, сверяет размер и SHA256 и передает его в Responses API как `input_image`.
- V5 намеренно запрещает превращать image-only числовые значения в fact measurements: изображение пока участвует в semantic proposals/context. Это не только prompt-правило: server deterministic guard отбрасывает model measurements при image evidence, если их `rawFragment` не содержится в явно введённом пользователем тексте. Это сохраняет epistemic separation, пока downstream fact writer не получил отдельный image-measurement provenance contract.
- Для `PRICE_SNAPSHOT_STALE` semantic review делает один fail-closed self-heal только для exact mapping `standard -> gpt-5.4-mini`, если текущий активный snapshot по ценам точно совпадает с server-shipped каталогом, проверенным 19.08.2026. Verification lease истекает 26.08.2026; после этого runtime снова блокируется до новой проверки цен.
- SQL schema change не требуется. Runtime может добавить новый versioned row в `ai_model_price_snapshots` только при stale-price recovery; старые snapshots закрываются после успешной вставки.
- V5 baseline: `main @ 2edd9026bd0d4e7764993d92c28ae30384fce01f`. V5 patch сохраняется в Git только после validator + ESLint zero-warning + production build + diff/staged gates; поэтому состояние, попавшее в release commit, означает `RELEASED_AWAITING_LIVE_ACCEPTANCE`.

### AI RIGHT RAIL — V6 background review + loading UX + GPT-5.6 model selector
- Baseline V6: `main @ 062b22afe2c7250e8ec69383394b994763524e99` (V5 production PASS).
- Для `past/future` quick capture по-прежнему сначала синхронно и идемпотентно сохраняет raw intake/activity/photo evidence; факты на этом шаге не создаются. После формирования HTTP-ответа `next/server after()` запускает `analyzeActivityForSemanticReviewA31` в фоне. Поэтому переход в журнал/календарь не ждёт OpenAI, а при последующем открытии review готовый draft переиспользуется из `activity_semantic_review_drafts_a31`.
- Race между background review и ручным открытием review защищён: при PostgreSQL `23505` проигравший writer перечитывает уже созданный draft вместо показа ошибки. Canonical leaf/candidate retrieval этим шагом намеренно НЕ меняется.
- Экран ожидания глубокого review больше не является пустой чёрной поверхностью: показан корпоративный progress/skeleton из четырёх понятных этапов и явное сообщение, что activity уже сохранена и можно покинуть страницу.
- Узкий desktop rail использует те же три иконки `past / future / chat`, что mobile; текст скрыт визуально, но остаётся в `title`, `aria-label` и `sr-only`. В mobile drawer подписи сохраняются.
- Chat model selector показывает фактические модели `5.6 Luna / 5.6 Terra / 5.6 Sol`; для правого frontier slot применяется `gpt-5.6-sol` с `reasoning.effort=max`. Internal tier codes `nano/standard/pro` сохраняются только как совместимые billing slots.
- Runtime chat routing использует server-verified catalog: Luna 0.20/0.02/1.20 USD, Terra 2.00/0.20/12.00 USD, Sol 5.00/0.50/30.00 USD за 1M input/cached/output. Автоматический seed новых versioned price snapshots разрешён только до `2026-08-26T23:59:59.999Z`; несовпадающая цена или отсутствие FX приводит к fail-closed. Это data write, но не schema/SQL migration.
- Будущая «самая мощная модель» не выбирается по имени вслепую: UI читает server model catalog, а frontier slot меняется только после совместимого registry/pricing gate. Это позволяет менять фактическое название без переделки UI, но не даёт неизвестной новой модели автоматически обойти Structured Output/budget guards.

### AI RIGHT RAIL — V7 TypeScript receipt hotfix
- Первый production-запуск V6 дошёл до validator `23/23`, ESLint `--max-warnings=0` и затем остановился на Next.js TypeScript gate до commit/push. Ошибка: `existing.result` имеет тип `JsonRecord`, поэтому `existing.result.activityEventIds?.[0]` пытался индексировать значение `unknown/{}`.
- Release runner выполнил `ROLLBACK=PASS`; production остался на `main @ 062b22afe2c7250e8ec69383394b994763524e99`.
- V7 не меняет функциональную семантику V6. `readReviewFirstReceipt()` теперь после `Array.isArray(...)` один раз получает проверенный первый id и возвращает `primaryActivityEventId: string | null`; duplicate quick-capture branch использует это типизированное поле вместо повторного чтения неизвестного JSON.
- Acceptance V7 требует validator, ESLint zero-warning и полный local production `npm run build` до упаковки, а затем те же gates повторяются на Windows production repo до commit/push.

### AI RIGHT RAIL — V8 model selector TypeScript hotfix
- Production attempt V7 passed validator `25/25` and ESLint zero-warning, then failed Next.js TypeScript at `global-ai-navigator.tsx`: `AiNavigatorModelOption` defines `tierCode`, while the selector still used legacy `tier.code` in comparison/key/click handler.
- Runner performed `ROLLBACK=PASS`; authoritative production baseline remains `062b22afe2c7250e8ec69383394b994763524e99`.
- V8 changes only this type-contract mismatch and strengthens validator coverage; V6/V7 functional semantics remain unchanged.


## 2026-08-19 — HELP + FILES SYSTEM V1

- В `Мой кабинет` обычному пользователю доступны только `Мои инструкции ИИ` и новая страница `Загруженные файлы`; системные инструкции и административные ссылки показываются только после server-side admin visibility check.
- Администратор дополнительно видит `Системные инструкции ИИ`, `Пользователи`, `AI Billing` и новую `Справочную систему`; сами `/admin/*` страницы остаются под существующим `requirePlatformAdmin()` layout guard.
- `Загруженные файлы` V1 индексирует private raw image evidence, загруженные через AI-Navigator для past/future activity capture. Storage path пользователю не раскрывается; viewer повторно проверяет owner signal path и SHA-256 перед inline/download response.
- Справочная система имеет code-generated registry пользовательских routes/headings/internal links и global navigation. Контент хранится отдельно в PostgreSQL/Supabase по стабильному `help_key`, а не в JSX.
- У каждого help-key два независимых блока: WHAT (`Что это такое?`) и WHY (`Зачем это вам?`). Пустой блок не показывает значок; заполненный WHAT дает `i`, заполненный WHY — `?`.
- Desktop открывает корпоративный popover, mobile — bottom sheet.
- КРИТИЧЕСКОЕ ОТЛИЧИЕ ОТ CONTENT-L10: каждое сохранение администратором непустого WHAT/WHY блока заново вызывает AI и полностью регенерирует ru/pl/en/es/uk/de/cs. Текущая редактируемая locale является новым источником; предыдущие переводы намеренно заменяются новой revision.
- Help translation использует server-approved frontier slot `pro` (`GPT-5.6 Sol`, reasoning `max` в текущем catalog), `store=false`, `maxRetries=0`. Если перевод/валидация не прошли, запись в БД не выполняется.
- История каждой help revision append-only сохраняется в `platform_help_content_history`; current projection — `platform_help_content_current`.
- Canonical leaf/candidate retrieval и legacy Activity Container этим блоком НЕ меняются.


## 2026-08-19 — V8 production release + HELP/FILES intake baseline

- AI RIGHT RAIL V8 фактически прошёл production gate и запушен в `main` commit `10d6bab82cecd2abcfcebd8ead3279d79a2f799a`; старый статус `coded_awaiting_production_release` считать устаревшим.
- HELP + FILES SYSTEM V1 строится от этого clean baseline. Help registry поддерживает dynamic route patterns, а persisted heading keys используют source fingerprint, чтобы вставка несвязанного заголовка выше не перепривязывала уже написанную справку.
- Каждое непустое сохранение WHAT/WHY администратором заново переводит блок на все `ru/pl/en/es/uk/de/cs` через server-approved frontier slot; запись новой revision в БД выполняется только после успешного structured translation.
- Успешное сохранение инвалидирует несохранённые черновики других locale этого же блока, потому что они уже стали устаревшими относительно новой семиязычной revision.
### HELP + FILES SYSTEM V1 — production preflight / Supabase CLI auth hotfix V2
- Первый production release attempt 20.08.2026 остановился ДО source mutation на database preflight: `supabase link` вернул `Access token not provided`; `ROLLBACK=NOT_NEEDED_NO_SOURCE_MUTATION`, migration не применялась, baseline остался `10d6bab82cecd2abcfcebd8ead3279d79a2f799a`.
- Это не дефект HELP/FILES кода и не ошибка migration. Локальный Windows checkout не имел Supabase CLI account credential (`SUPABASE_ACCESS_TOKEN` или сохранённого `supabase login`).
- V2 сохраняет fail-before-mutation boundary, но если безопасный DB URL отсутствует и linked flow требует account auth, выполняет официальный интерактивный `supabase login` с browser authorization, затем повторяет `link` и `db push --dry-run`. Секрет не вводится в ARCTor script, не сохраняется в REPORT и не передаётся как command-line token.
- Интерактивная авторизация — credential bootstrap владельца, а не acceptance/test step. После единственного успешного login Supabase CLI хранит credential в системном credential store и следующие releases могут использовать его повторно.
- HELP/FILES функциональная семантика, fresh-all-7-locale translation policy, canonical leaf routing и legacy Activity Container этим hotfix не меняются.

### HELP + FILES SYSTEM V1 — manual SQL release policy V3
- Второй production attempt 20.08.2026 успешно авторизовал Supabase CLI, но `db push --dry-run` показал большой исторический список локальных migrations, которые remote migration history не считает применёнными, включая HELP/FILES target. Safety gate правильно остановил release ДО source mutation с `DB_PREFLIGHT_DRY_RUN_UNEXPECTED_PENDING_MIGRATIONS`; DB/source/commit/push не менялись, baseline остался `10d6bab82cecd2abcfcebd8ead3279d79a2f799a`.
- Поэтому для HELP/FILES и следующих подобных точечных schema changes принят текущий рабочий режим: additive/idempotent SQL выполняется владельцем вручную в Supabase SQL Editor, после чего code release делает только read-only DB contract preflight и не использует `supabase db push`.
- SQL source-of-truth для HELP/FILES хранится в `supabase/manual-applied/20260820_help_files_system_v1.sql`, чтобы намеренно не добавлять ещё одну запись в локальную migration queue, которую CLI воспринимает как неприменённую.
- Code release запрещён, пока read-only preflight не подтвердит обе help tables и наличие RPC boundary. Никакой DDL через application service-role executor не создаётся.


### HELP + FILES SYSTEM V1 — V4 ESLint hotfix after manual SQL PASS
- 20.08.2026 manual SQL `20260820_help_files_system_v1.sql` выполнен в Supabase SQL Editor и дал PASS по обеим help tables, RLS, RPC и service-role execute. V3 read-only DB preflight также дал PASS.
- V3 code release затем остановился ДО build/commit/push на changed-file ESLint: `global-navigation.tsx` содержал 4 legacy dead declarations и 3 `@next/next/no-img-element` warnings. Runner сделал `ROLLBACK=PASS`; production code baseline остался `10d6bab82cecd2abcfcebd8ead3279d79a2f799a`, но HELP DB schema уже применена вручную.
- V4 не ослабляет `--max-warnings=0`: удаляет только доказанно неиспользуемый legacy organization-nav код, переводит два локальных brand image на `next/image`, а для произвольного profile image оставляет точечное документированное исключение, потому что remote host заранее не перечислим.
- V4 release должен начинаться с read-only DB contract preflight; повторный SQL/DDL и `supabase db push` не требуются.


### HELP + FILES SYSTEM V1 — V5 import-depth hotfix
- Manual HELP DB SQL уже применён и подтверждён PASS; повторный SQL не нужен.
- V4 code release: DB preflight PASS, validator 36/36 PASS, ESLint zero-warning PASS, затем Next build FAIL на четырёх `Module not found` из-за over-deep imports в двух новых `/api/uploaded-files*` routes; rollback PASS, commit/push отсутствуют.
- V5 исправляет module import depth и ожидает production build/commit/push. Code baseline до release остаётся `10d6bab82cecd2abcfcebd8ead3279d79a2f799a`.


### 2026-08-20 — HELP popup/mobile marker UX hotfix V1
- Исправлена блокировка desktop sidebar/main scrolling прозрачным full-screen help backdrop: backdrop теперь существует только на mobile, desktop popover закрывается Escape/outside-click и не перехватывает прокрутку страницы.
- Длинный desktop help popover теперь получает viewport-safe top/maxHeight и собственный overflow-y, поэтому весь WHAT/WHY текст доступен без выхода ниже экрана.
- Mobile help markers раньше привязывались к первому nav[aria-label=ARCTor], которым на смартфоне часто был скрытый desktop sidebar; теперь выбирается реально отображаемый nav.
- Добавлен MutationObserver с защитой от self-mutations, чтобы help markers пересканировались после динамического открытия mobile navigation drawer.
- Help content, translation policy, DB schema, registry keys, canonical leaf routing и legacy Activity Container не изменялись.
- Первый production release attempt V1 прошёл functional validator 18/18, но остановился на release-tooling allowlist gate: PowerShell parser получил пустой CHANGED_ALLOWLIST_ACTUAL несмотря на применённые изменения; rollback PASS, commit/push отсутствовали.
- V2 не меняет функциональный hotfix: исправлен только release-tooling — exact allowlist теперь проверяется через explicit staging + git diff --cached --name-only, а отсутствие лишних изменений отдельно подтверждается git diff --quiet и git ls-files --others.
