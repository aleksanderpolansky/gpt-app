# ARCTor.app — решения, ошибки и выводы

Дата первого сводного журнала: 2026-08-12

Этот файл хранит не только успешные решения. Он специально фиксирует тупиковые подходы и причины отказа от них, чтобы не проходить тот же путь повторно.

---

## GSR1A–GSR1E — основание pilot

### Решение

Создать отдельный Global System Reality layer до P8 и дать ему собственную глобальную ontology seed, безопасную семантическую маршрутизацию и жёсткое ограничение стоимости OpenAI.

### Зафиксировано

- 150 global Value Objects;
- один structural parent;
- typed horizontal relations вместо multi-parent;
- fact only to leaf;
- deterministic server validation;
- provider price snapshots;
- USD 0.10 hard cap per operation;
- stale/unknown price blocks call.

### Вывод

Сначала формируется контролируемый словарь мира и контракты фактов, потом Goal World Compiler.

---

## GSR1F — bounded global observation preview

### Что сделали

Двухступенчатый OpenAI preview:

`text -> segmentation + DOMAIN/FACET -> <=10 leaf candidates -> selected leaf + allowed facts -> deterministic validation`

### Главный принцип

Модель не получает все 150 объектов и не может писать произвольные параметры.

### Безопасность

Preview only, `store=false`, без Reality Graph write.

---

## GSR1G — ошибка независимого DOMAIN/FACET

### Ошибка

Модель могла вернуть допустимый DOMAIN и допустимый FACET по отдельности, но их комбинация могла быть невозможной в живой ontology.

Первый реальный smoke остановился после stage 1 на несовместимой паре.

### Исправление

DOMAIN и FACET были объединены в один enum-bound `domainFacetKey`, сформированный только из реально существующих пар.

### Дополнительный вывод

Количество/единица измерения должно оставаться внутри сегмента события, а не становиться отдельным событием.

### Итог

Фраза `делал планку две минуты` успешно прошла как один `process.exercise.plank` с duration 2 minute.

Commit:

`843d1ea6bdf0ee822416d5ccfa9d8d445718c7c4`

---

## GSR1H — инфраструктурные ошибки тестового harness

### V1

Попытка использовать уже работающий Next dev server.

Проблема: временный route не появился за 60 секунд.

OpenAI calls: 0.

Вывод: gold test не должен зависеть от старого localhost процесса.

### V2

Создан detached worktree и junction на `node_modules`.

Проблема: Next 16 Turbopack запретил symlink/junction, выходящий за filesystem root.

OpenAI calls: 0.

Вывод: для disposable local harness нужно явно использовать Webpack.

### V3

Webpack успешно стартовал.

Проблема: временный route имел ошибку `Identifier 'reservations' has already been declared`.

OpenAI calls: 0.

Вывод: временный test route тоже должен иметь статические self-checks до запуска.

### V4

Первый полноценный small gold corpus.

Результат: 6/8 PASS.

Проблемы остались только G21 и G24.

Дополнительная проблема самого PowerShell: итоговая сборка объекта дала `Argument types do not match`, поэтому raw response двух failed cases не сохранился.

Вывод: диагностические HTTP bodies нужно сохранять сразу, до итоговой агрегации PowerShell.

### V5

Повторены только G21 и G24.

Raw responses успешно сохранены.

Это позволило перейти от общей догадки к точной диагностике.

---

## GSR1I — G21 Available Time

### Исходная проблема

Фраза:

`Сегодня вечером у меня есть примерно два свободных часа.`

AI мог разделить её на:

- `Сегодня вечером`;
- `примерно два свободных часа`;

и ошибочно отнести к leisure/free_rest.

### Ошибочная попытка V1

Добавили числовые relative-time hints:

- relativeDayOffset;
- localTimeHour;
- localTimeMinute.

Проблема: для расплывчатого `вечером` модель сама придумала 18:00.

### Вывод

Нельзя превращать daypart в конкретный час без явного часа пользователя.

### V2

Удалили опасные числовые hints и оставили exact temporal evidence.

Но prompt всё ещё не был hard contract: AI снова разрезал Available Time и маршрутизировал как leisure.

### V3

Добавлен deterministic server rule для явного доступного временного ресурса.

Результат: G21 PASS.

### Закреплённое правило

`есть/доступно/осталось X свободных часов/минут` — это `context.resources.available_time`, а не leisure и не отдельный DOMAIN Time.

Daypart без конкретного часа остаётся временным окном.

---

## GSR1I — G24 Dinner / temporal parsing

### Исходная фраза

`Ужинал вчера около девяти вечера.`

### Найденная проблема

JavaScript `\b` плохо подходит как граница слова для русских букв. Регулярные выражения для русских временных слов и meal labels не срабатывали стабильно.

### Исправление V3

Убрана зависимость от ASCII-style `\b`.

Результат:

- meal leaf правильный;
- `occurredAtRaw` правильный;
- вчера + 21:00 local восстановлено;
- timezone conversion правильный;
- precision approximate.

### Последний оставшийся дефект после V3

AI вернул `meal_label="ужин"` вместо стабильного машинного `meal_label="dinner"`.

### Попытка V4

Сервер должен был заменять explicit Russian lexical surface value на canonical machine value:

- завтрак -> breakfast;
- обед -> lunch;
- ужин -> dinner.

Но smoke V4 завершился HTTP 500.

### Статус

Причина HTTP 500 V4 ещё не разобрана. Patch откатан. Нельзя считать canonical-label fix завершённым.

---

## Постоянные методологические выводы

1. Prompt не является достаточным hard contract там, где правило можно проверить детерминированно.
2. AI не должен придумывать точное время из расплывчатого daypart.
3. Машинные enum/category values должны быть стабильными и независимыми от языка пользователя.
4. Raw evidence сохраняется отдельно от machine-normalized value.
5. Не повторять дорогие уже прошедшие cases без необходимости.
6. После failure сохранять raw response прежде, чем выполнять вторичную обработку отчёта.
7. Failed experiment должен оставаться в человеческом журнале даже если код автоматически откатывается.
8. P8 не разблокируется из-за одного удачного smoke; нужен завершённый pilot gate.
---

## GSR1I V5 — различение времени события и длительности

### Причина V4 HTTP 500

V4 показал новую ошибку второго AI-этапа: фраза около девяти вечера была предложена как duration=9 hour.

Это неверно: здесь девять — час наступления события, а не продолжительность.

### Исправление

Перед обычной валидацией фактов сервер детерминированно отбрасывает proposed duration, если:

- его raw evidence пересекается с occurredAtRaw;
- evidence выглядит как clock/daypart выражение;
- в evidence нет явной единицы длительности (час, минута, секунда).

Настоящее два часа остаётся допустимой длительностью.

### Результат

G24 PASS:

- process.nutrition.meal;
- meal_label=dinner;
- вчера около 21:00 local;
- approximate temporal precision;
- нет ложного duration;
- нет Reality Graph write;
- ровно два provider calls;
- actual cost USD 0.000742.

### Методологический вывод

Число само по себе не определяет тип измерения. Временной контекст должен быть отделён от продолжительности детерминированным правилом, а не только prompt-инструкцией.
---

## GSR1J — платные тесты как инженерный инструмент

### Уточнение политики стоимости

Hard cap USD 0.10 существует как аварийный предохранитель. Он должен останавливать зацикливание, повторные запросы, зависание API и другие аномальные сценарии.

Нормальный полезный тест не нужно избегать только потому, что он стоит несколько тысячных доллара.

### Результат пяти реальных диагностических случаев

G01 подтвердил, что текущая сегментация уже умеет два независимых события в одном сообщении. Поэтому preflight-классификация multi-event unsupported была слишком консервативной.

G08 подтвердил поддержку парных измерений внутри одного leaf.

G12 подтвердил безопасное извлечение явно названной энергии.

G05 обнаружил более важную проблему: при отсутствии слов днём/ночью система выбрала day_episode с низкой уверенностью 0.33. Это нельзя исправлять простым правилом по умолчанию ночь, потому что такое правило само создаст не подтверждённый факт. Нужно либо безопасное generic/unknown sleep representation, либо явное правило fixture, не требующее догадки.

G14 подтвердил правильный caffeine-intake leaf и отсутствие выдуманного caffeine_mg, но выявил потерю явного количества две чашки. Это отдельный quantity-contract gap, а не ошибка распознавания кофе.

### Вывод

Платные diagnostic calls следует выбирать по ожидаемой информационной ценности. Не тестировать нужно только то, что текущий контракт физически не способен представить: такой вызов не различает качество модели и отсутствие поля в output schema.
---

## GSR1K — отказ от бесконечного prompt-патчирования и переход к recognition profiles

### Что было проверено

GSR1K доказал, что bounded event-link/temporal-link contract как идея жизнеспособен: отдельные случаи G11 и G20 проходили в кандидатных реализациях, а server guards успешно блокировали недоказанные или противоречивые output.

Однако V6 показал нестабильность одного и того же входа После планки начала болеть поясница. при неизменных коде и схеме.

Три запуска дали три разных проблемы:

1. модель выбрала overlaps вместо precedes;
2. модель корректно разделила два сегмента, но отказалась выбрать leaf для обоих;
3. модель выбрала __NONE__, но одновременно вернула facts/links.

### Решение

Не создавать правило для каждой конкретной фразы и не продолжать локальные prompt-патчи для G03.

Вместо этого перейти к архитектуре **AI как языковой интерпретатор + сервер как владелец онтологии и проверяемых правил**.

У каждого global leaf ЦО должен быть машиночитаемый профиль распознавания, который ограничивает:

- по каким смысловым признакам ЦО является кандидатом;
- какие параметры к нему допустимы;
- какие связи от него допустимы;
- к каким типам объектов эти связи могут вести;
- когда данных достаточно для уверенного выбора;
- когда нужно сохранить неопределённость.

Recognition profile является данными системы, а не hardcoded цепочкой частных if.

### Правило детерминированности

То, что можно надёжно вычислить без семантической догадки, должна вычислять серверная логика: единицы, числа, интервалы, длительности, поддерживаемые абсолютные/относительные временные выражения и явные временные маркеры.

AI может помогать распознавать смысл, но не должен быть единственным источником истины для этих вычислимых полей.

### Правило неопределённости

Не знаю / недостаточно данных — валидный результат.

Если существующая онтология заставляет выбирать между двумя более узкими leaf без достаточного evidence, следует предусмотреть нейтральный fallback leaf либо другой явный механизм неопределённости. Нельзя компенсировать отсутствие evidence статистической догадкой модели.

### Статус GSR1K кода

Экспериментальные runtime-кандидаты V1–V6 не считаются принятой production-реализацией. После диагностик основная рабочая папка возвращалась к commit 10ce6be0653eeefe6535766fc21f1c09bda567c.

Следующий блок — GSR1L: спроектировать recognition-profile contract и разделение AI/server responsibilities до новых изменений runtime.
---

## Постоянное правило процесса разработки ARCTor — 2026-08-12

**INTAKE -> DESIGN -> IMPLEMENTATION -> TEST -> RECOVERY**

Если следующий шаг зависит от существующего кода, файлов, DB objects, routes, runtime environment или project contracts, implementation не создаётся до read-only intake фактического состояния.

Intake обязан установить: branch/head/remote/worktree; точные source-of-truth paths; существующие functions/RPC/types/contracts/validators; релевантные DB ledgers и при необходимости live read-only DB state; версии runtime/tools; противоречия docs/code/DB/recovery; уже существующие механизмы, которые нужно reuse; prerequisites будущего implementation.

Ошибки путей, имён, версий среды и повторное изобретение уже существующего механизма считаются ошибкой процесса intake, а не нормальной implementation iteration.

Необязательный environment probe не должен валить intake. Gate failure допустим только для safety/source-of-truth условий.
---

## GSR1L Recognition Architecture v1.1 approved — 2026-08-12

Решено проверить data-driven recognition profiles вместо дальнейшего case-specific prompt patching.

Причина: GSR1K доказал, что strict server guards безопасны, но одинаковый текст может давать разные model decisions. Поэтому уменьшается поверхность решений AI.

Первый experiment не заполняет все 103 leaf и не меняет Reality Graph writes. Он вводит minimal versioned recognition profiles только для репрезентативного pilot set, assembled candidate retrieval, UNKNOWN contract и последующую runtime integration.

Дополнительное решение по входу: пользователь по умолчанию сообщает один основной эпизод за сообщение. Одновременно происходившие дополнительные действия, мысли, чувства и состояния разрешены в том же сообщении. Параллельные действия при необходимости становятся отдельными activity events и связываются temporal relations; чувства/состояния не обязаны становиться activities. Правило является UX-guidance, а не жёстким валидатором.

Принцип «не попробуем — не узнаем» применяется контролируемо: эксперимент должен быть ограничен, versioned, preview-only и проверяем на G01–G24 плюс stability tests.

## 2026-08-12 — Разделение каталога ЦО и Activity AI Lab

Маркер: `DECISION_GLOBAL_CATALOG_SEPARATE_FROM_ACTIVITY_AI_LAB`

Страница `/value-objects` — единый визуальный каталог системных глобальных и
actor-owned ЦО/ОН. Страница `/activity-ai-lab` — только intake/analyzer.

Причина исправления: прежний GET `/api/value-objects` фильтровал только
`owner_user_id + owner_actor_id`, поэтому 150 Global System Reality объектов
существовали в live DB и использовались recognizer-ом, но не отображались
пользователю на странице каталога.

## 2026-08-12 — AI Architecture physical storage decision / AI-A1

Маркер: `DECISION_AI_ARCHITECTURE_STORAGE_AND_CONTEXT_V1`

Зафиксировано:
- OpenAI не является долговременной памятью ARCTor;
- Git хранит protocol/schema/validators;
- PostgreSQL/Supabase хранит изменяемое структурированное знание и Data Capital;
- Object Storage используется для тяжёлых материалов/dataset artifacts;
- каждый production provider call должен быть связан с `ai_analysis_execution` и `ai_context_manifest`;
- raw input не копируется в Context Manifest: сохраняются hash/refs и bounded context;
- пользовательские corrections должны сохраняться append-only как стратегический Data Capital с provenance и future rights/purpose lineage;
- existing activity corrections/reviews/logs не выбрасываются и не дублируются без необходимости; общий Data Capital layer позже связывает их как evidence sources;
- embeddings/search indexes являются производными, а не источником истины.

AI-A0 live audit подтвердил, что `value_object_recognition_profiles`, универсальные Data Capital/rights/optimizer/dataset tables отсутствовали и должны создаваться отдельными gated этапами.

## DECISION_AI_A2_RECOGNITION_PROFILES_V1 — 2026-08-13

Закреплено: recognition/disambiguation является отдельным versioned data layer. Aliases, parameter assignments и long-lived semantic relations не дублируются в recognition profiles. AI выбирает только из server-bounded candidates либо возвращает uncertainty; server остаётся владельцем ontology constraints и final validation.

AI-A2-P1 live acceptance: 14/14 PASS. Stokrotka regression стала обязательным архитектурным fixture: process.finance.purchase должен присутствовать среди bounded candidates, process.home.household_task не должен попадать туда по известной ошибочной бытовой маршрутизации.

### AI_A1_RELEASE_FAILURE_CHAIN_20260813

При реализации AI-A1 была допущена серия ошибок управляющей обвязки, которые не должны теряться из recovery history: uninitialized PowerShell variables; interpolation of $npm; UTF-8-no-BOM/PowerShell 5.1 parsing around non-ASCII dash; invalid backslash regex; stderr Git warning LF/CRLF incorrectly treated as fatal; final cached diff check caught an extra blank line at EOF. Содержательная AI-A1 реализация при этом прошла validators/build, а финальный release commit dc2c5243d51def829a1998d0eccb5560ca0baf8d прошёл AI_A1/GSR1F/Global Seed validators, feature/main builds и production runtime 6/6.

Процессное правило: user execution начинается только после максимально доступной машинной проверки orchestration code. Native stderr сам по себе не является failure; authoritative signal — exit code. Precommit, post-commit/push, rollback/resume paths должны проверяться отдельно.

## DECISION_AI_A2_P2_RECOGNITION_RUNTIME_V1 — 2026-08-13

0. P1 migration integrity проверяется по LF-normalized SHA-256, поэтому CRLF/LF checkout не меняет результат validator. Raw-byte SHA working tree больше не используется как cross-platform invariant.
1. Recognition candidate retrieval в preview является глобальным data-driven поиском по sourceFragment и versioned recognition profiles; Stage-1 DOMAIN/FACET остаётся только неавторитетной подсказкой до следующего redesign neutral semantic frame.
2. Candidate output bound = 5. Лимит относится к возвращаемому candidate set, а не к размеру ветви ontology.
3. supporting-only evidence не даёт права выбрать leaf. Выбор разрешён только exact/strong в SINGLE_CANDIDATE или CANDIDATES_READY.
4. UNRESOLVED / UNRESOLVED_TOO_BROAD / NO_MATCH принудительно дают __NONE__; сервер независимо проверяет этот запрет после ответа модели.
5. sourceFragment является evidence source для recognition RPC; lookupText модели не используется как authority.
6. Старые exact/coarse RPC в БД не удаляются, но coarse DOMAIN+FACET fallback больше не участвует в Global Reality preview runtime.
7. На P2 semantic_tags=[] специально: нельзя подменять будущий neutral semantic frame существующим hard DOMAIN/FACET решением.
8. Reality Graph write path не меняется; production preview test обязателен перед следующим implementation gate.

## DECISION_AI_A2_P3_SEMANTIC_PROJECTIONS_V1 — 2026-08-13

1. Один физический эпизод и один primary leaf могут иметь несколько secondary semantic projections; это не multi-parent hierarchy и не дублирование активности.
2. P3 v1 является deterministic server layer после AI-A2-P2 selection. Он не добавляет LLM-вызов.
3. Любая projection имеет epistemicStatus, evidenceFragments, writeAllowed=false и primaryClassificationChanged=false.
4. DERIVED разрешён только для детерминированного класса, явно опирающегося на source evidence. INFERRED обязательно видимо маркируется как предположение.
5. Family benefit запрещено выводить из факта покупки еды без явного family cue или будущего разрешённого personal context.
6. Cross-segment context разрешён только как вспомогательный контекст secondary projection; primary recognition остаётся segment-bound.
7. Projection targets ограничены allowlist и повторно проверяются в live Global ontology по canonical key, active status и node role.
8. Никаких P3 relation/fact writes до отдельного storage/write contract; Activity Review остаётся единственной существующей save boundary.
9. P2 live acceptance фиксируется как PASS до перехода в P3.
