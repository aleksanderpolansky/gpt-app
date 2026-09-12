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

## AI_A3_P1_V1_SQL_FAILURE_20260813

Первая версия AI-A3-P1 migration не была применена: Supabase остановил SQL на syntax error near UNION (line 777). Причина — лишняя запятая перед UNION ALL в acceptance CTE. Повторная локальная ревизия также обнаружила, что V1 ownership guard ошибочно отвергал бы active GLOBAL leaf из-за обязательного owner_user_id/owner_actor_id. V2 убрал синтаксическую ошибку и разрешил GLOBAL leaf при сохранении ownership guard для non-global. V2 затем прошёл live acceptance 20/20. V1 не запускать повторно.

## DECISION_AI_A3_P2_FEEDBACK_AND_MANUAL_LINK_V1 — 2026-08-13

1. User feedback является append-only evidence, а не командой немедленно переписать global ontology/rule.
2. ✓ = confirmed, ✕ = rejected, ✎ = commented с explanation; ? = объяснение без записи. Исходное AI proposal snapshot сохраняется.
3. Structured correction через ai_feedback_corrections в P2 намеренно не используется: event+correction позже должен записываться атомарным RPC, чтобы исключить partial write.
4. Selector расширяется только opt-in параметром includeGlobal=1; существующее поведение вызовов без этого параметра не меняется.
5. Manual link intent допустим только к leaf VO; active GLOBAL leaf разрешён, non-global leaf обязан принадлежать текущему app user/active actor согласно DB guard.
6. До создания activity_event manual link существует как Data Capital intent. После canonical activity create он материализуется как semantic_exposure с provenance=manual и semantic_match_method_code=user_confirmed.
7. Existing semantic_exposure не перезаписывается manual materialization; feedback evidence сохраняет факт явного выбора пользователя.
8. Automatic P3 projections по-прежнему writeAllowed=false. Только явный пользовательский manual link может перейти через save-gate в activity_value_object_links.
9. Feedback/materialization endpoints не вызывают OpenAI и не меняют лимит 2 provider calls analysis preview.

## AI_A3_P2_V1_NPM_SPAWN_FAILURE_20260813

Первая release-версия AI-A3-P2 дошла до BUILD_FEATURE после PASS всех validators, но build не стартовал: Node child_process spawn("npm", shell=false) на Windows вернул ENOENT, потому что Windows npm entrypoint — npm.cmd/npm-cli.js. Commit/push не выполнялись; runner очистил только собственные precommit changes. V2 исправил запуск: на Windows npm-cli.js запускается через node.exe и npm preflight выполняется до repository writes. AI-A3-P2 V2 затем прошёл feature/main build и release PASS. Новые release runners обязаны сохранять NODE_NPM_CLI strategy.

## DECISION_AI_A3_P3_DIRECT_SAVE_BYPASS_LEGACY_CONTAINER_V1 — 2026-08-13

1. /activity-ai-lab является основным экраном AI intake и после полного Global Reality анализа должен сам содержать последние необходимые поля save-gate: title, timing, planned targets и manual leaf links.
2. AI Lab больше не обязан переходить через /calendar/activity-review: повторный старый semantic preview после уже выполненного Global Reality анализа является дублированием и создаёт риск расхождения.
3. Legacy Activity Review route в этом release сохраняется неизменным для других существующих callers; удаление route допустимо только после отдельной caller inventory/migration.
4. Canonical write остаётся POST /api/activity/events. Past = actual/completed; future = planned. Planned target и semantic_exposure остаются разными типами связи.
5. Manual leaf intent materializes только после activity_event create через существующий manual-link-materialize endpoint; existing semantic exposure не overwrite.
6. Изменение input text или locale после анализа инвалидирует полный analysis provenance и запрещает save без повторного анализа.
7. После successful activity create + failed link materialization UI хранит activity_event checkpoint, блокирует изменяемые поля и retry не делает второй activity create.
8. Fact/projection auto-write этим шагом не включается. Data Capital confirmations не становятся Reality Graph rows автоматически.
9. Direct save не добавляет OpenAI provider calls и не меняет AI-A2 лимиты.

## AI_A3_P4_OPTIONAL_FACT_FAILURE_BOUNDARY — 2026-08-13

Observed after commit 5f86c97830423ee2e6b9992bb9443d213942f74d: ordinary purchase and future walking phrases fell back because stage-2 returned an optional fact whose value fields did not exactly match the server parameter contract. This was not a candidate-routing failure. Decision: fail closed at the individual optional-fact boundary, not at the entire semantic-analysis boundary. Unsupported parameter/unit/evidence or missing expected typed value is dropped; server-authorized typed values may be normalized by clearing extraneous model fields. No automatic fact write is added. Release V1 additionally exposed a precommit TypeScript TS2677 failure in the fact-array null filter; V2 corrects the predicate without changing runtime facts. V1 created no commit and pushed nothing.

## AI_A3_P5A_FACT_PERSISTENCE_DECISION — 2026-08-13

Decision after 24/24 live persistence preflight: reuse the existing canonical GLOBAL fact writer and existing activity_object_facts.value_object_id / activity_value_object_links semantic_exposure contracts. Do not create a competing fact-to-VO join table. Saving an activity may persist explicit validated facts as proposed even without per-fact confirmation; explicit rejection blocks that fact; explicit confirmation upgrades it to confirmed. This preserves the distinction between observed user text, AI extraction, and user confirmation.

## AI_A3_P5A_WRITER_HOTFIX_AND_P5B_DECISION — 2026-08-13

Failure chain preserved: P5A direct-save created activity_event, but fact materialization failed because the canonical writer selected a composite assignment row into a `%rowtype` variable as `select assignment` instead of `select assignment.*`. Hotfix V1 and V2 failed closed because their source matching was too formatting-specific and changed nothing. Hotfix V3 matched semantically across whitespace, preserved the live function body/security grants, and passed 8/8. P5A then passed 12/12 live. Decision: a measurement is neutral and stored once; multiple leaf object facts may reference the same measure_id. Activity title remains the user's wording; semantic classifications are separate links. P5B is read/display only.


## AI_A3_P5B_GLOBAL_DETAIL_404_FAILURE_AND_DECISION — 2026-08-13

Live P5B acceptance: Facts page showed `31 minute`, the linked `Ходьба` chip and Activity Journal showed both `Ходьба` + `31 minute`; clicking the GLOBAL leaf produced `/value-objects/<global-id>?locale=en` -> 404. Source cause is the old detail-page owner-only query. Decision: GLOBAL System ontology objects are readable from the authenticated combined catalog but read-only. Non-global objects keep the existing active-user/actor ownership gate. Global System objects must not inherit edit/restructure controls.


## 2026-08-14 — GLOBAL full-card hydration ACCESS_DENIED

Наблюдение: серверная часть GLOBAL detail отображалась правильно, но через секунду клиентский full-card показывал ACCESS_DENIED.

Причина: три старых внутренних GET-контракта (ontology, aliases, relations) продолжали трактовать любой ЦО как actor-owned. Основная detail page уже знала scope=global, а hydration-подзапросы — ещё нет.

Решение: разрешать GLOBAL/System только в read-path. Никакие PATCH/POST/lifecycle/restructure права GLOBAL объектам не выдавать. Для GLOBAL relations не смешивать системную онтологию с actor-private relation rows; до отдельного Reference/model relation layer возвращать безопасную read-only системную проекцию. Aliases читать locale-aware, не выдавая русские aliases как польские.


## 2026-08-14 — P5B leaf detail: ontology role must dominate legacy role

Наблюдение: GLOBAL leaf «Ходьба» одновременно имел ontology_node_role_code=leaf и legacy node_role_code=structural. Из-за независимых fallback-проверок UI мог считать его и leaf, и intermediate; заголовок выбирал intermediate раньше leaf. Дополнительно верхний linked-activity counter считал только planned_target, а параметрический GET оставался actor-only/legacy-leaf.

Решение: при наличии ontology_node_role_code он является единственным источником структурной роли. Legacy fallback разрешён только если ontology role отсутствует. Linked activity counter использует те же owner-scoped P5B relation sources, что mutual-links. GLOBAL standards GET не получает actor-private данные: для GLOBAL/System semantic leaf он возвращает read-only empty projection, writeActionsEnabled=false.

## D-P5C-QUICK-CAPTURE-REVIEW-V1 — автоматическое сохранение после разбора

1. Нажатие «Разобрать активность» является единственным первичным пользовательским подтверждением intake.
2. После успешной полной серверной валидации сохранение activity_event выполняется автоматически.
3. Неопределённость не блокирует запись: она остаётся в review snapshot/Data Capital; fallback без Global Reality не сохраняет автоматически.
4. 1..N сегментов создают 1..N независимых activity_event. Отдельная сущность «пакет активностей» запрещена для этого сценария.
5. Каждая новая P5C activity_event получает quickCaptureReviewRequired=true и quickCaptureReviewStatus=pending.
6. actual отображается в журнале, planned — в календаре; «Требуют проверки» является дополнительным представлением тех же записей, а не копией.
7. Для одной активности после intake открывается её review-detail; для нескольких — общий список «Требуют проверки».
8. Review-detail визуально переиспользует post-analysis /activity-ai-lab и открывает изменения одной кнопкой «Внести изменения».
9. Исходный source fragment сохраняется как rawText/inputText конкретной activity_event; полный исходный message остаётся в provenance metadata.
10. P5C не меняет GLOBAL ontology, recognition profiles или write-permissions ЦО/ОН.

<!-- AI_ADMIN_CONTROL_CATALOG_V1 -->
## 2026-08-14 — Управление правилами AI из одной административной точки

1. Единственная административная точка инвентаризации логики AI — /admin/ai-instructions.
2. Все зарегистрированные правила обязаны показывать источник, область действия, приоритет, редактируемость и способ изменения.
3. Системные guards остаются в Git/code release и не редактируются из БД, но полностью видимы в каталоге.
4. Настраиваемые deterministic rules хранятся как версионируемые данные; БД не исполняет произвольный код. Новый экземпляр уже поддерживаемого matcher/action не требует релиза. Новый класс matcher/action требует code release.
5. Отключение правила делается status=inactive внутри версионируемого snapshot. Удаление DB override отдельно возвращает fallback из кода; история сохраняется.
6. Конфликт для deterministic rules выявляется по пересечению runtime+matcher и различным action; одинаковый priority — warning, разный priority разрешается большим priority.
7. Нельзя скрывать отсутствие runtime wiring: каталог явно сообщает, подключено ли правило к runtime.
8. Два предрелизных controller-прогона каталога были безопасно остановлены до commit: V1 на известном устаревшем P5A static checkpoint-check, V2 на двух React Hooks ESLint warnings; оба rollback завершились чистым worktree.

## P5C durable handoff / rule executor decision
- Клиент не является владельцем длинной цепочки записи после «Разобрать активность»: после серверной квитанции страница может быть закрыта.
- DB rules не содержат исполняемый JS/TS/SQL/regexp; executor поддерживает только разрешённые matcher/action.
- При равном priority конфликтующих действий runtime блокируется fail-closed.
- Анализ и применённые правила checkpoint-ятся до создания activity_event, чтобы retry не повторял AI-вызов и не менял правила посередине операции.

## P5C V3 post-commit validator EOL failure
- До commit и на LF validator проходил; после checkout main на Windows core.autocrlf=true durable source стал CRLF.
- Проверка P5C_DURABLE_CHECKPOINT_BEFORE_EVENT искала LF-многострочный literal и дала ложный FAIL.
- Исправление: validator read() нормализует CRLF/CR -> LF до статических сравнений. Продуктовая логика e4e01adea1be0398e62d2d9c143b819737d9490c не меняется.

## P5C review controls hidden after Durable Handoff
- Причина UI-дефекта: reviewActivityEventId + !reviewEditing принудительно передавали operationId=null в TracePanel и скрывали ManualLeafLinkPicker.
- Исправление не откатывает Durable Handoff: сохранённый analysis operationId используется для append-only feedback; ручной + для существующей activity_event сразу вызывает manual-link-materialize.
- ✓ / ✕ / ✎ являются решениями/объяснениями review и остаются append-only Data Capital; этот шаг не объявляет review resolved автоматически.

## P5C review refinements: source/time/intent/localization
- Причина потери «18.00»: durable writer строил rawText/title из model row.sourceFragment вместо полного пользовательского sourceMessageText; temporal evidence оставалось только в preview.
- Причина записи инфинитивного «выгулять» в past: temporal-direction fallback был past и не имел RU/UK task-like infinitive guard.
- Clock parser уже распознавал 18.00, но future exact требовал одновременно date+clock; clock-only future теперь выбирает ближайшую будущую дату.
- UI locale и message locale разделены. Message locale остаётся языком анализа, URL locale управляет интерфейсом.
- Новые детерминированные правила intent/source зарегистрированы в /admin/ai-instructions как read-only system guards с source path и change steps.

## Решение: пользовательский контент многоязычен
- Отменено прежнее правило «пользовательский контент не переводить автоматически».
- Новый контракт: оригинал неизменяем; локализованные представления являются производными и никогда не создают копии сущности. Связи всегда хранят ID, а не локализованный title.
- sourceLocaleHint не считается истиной: переводчик определяет фактический язык текста. Это защищает от случая, когда UI/селектор языка показывает English, а исходное сообщение написано по-русски.
- Ошибка локализации не откатывает activity_event. В review используется original fallback до появления/исправления перевода.
- V1 сознательно не создаёт отдельную DB-таблицу и не требует SQL migration: activity adapter хранит versioned envelope в metadata_json. Общий executor спроектирован для следующих entity adapters.

## Решение: явный temporal intent выше вывода модели
- Пользовательский переключатель «Произошло / Запланировать» является источником истины для activity_role_code и physical routing. Это реализует принцип deterministic before LLM.
- Старое правило RU/UK «инфинитив похож на future intent» сохраняется только как legacy/fallback для старых receipts/внутренних вызовов без explicit mode; оно не может отменять явный выбор.
- При противоречии explicit mode и явно указанного времени система не угадывает и не меняет режим сама: выдаёт conflict и просит исправить время или переключатель.
- Recovery stale quick-capture сделан demand-driven через существующий raw_activity_signals + idempotent claim; новая пользовательская queue/entity и обязательный cron не создаются.

## 2026-08-15 — Authoring должен использовать P1C как единственный ontology write path

Решение: не достраивать старый прямой INSERT в value_objects новыми колонками. Root/intermediate/leaf authoring обязан вызывать create_value_object_ontology_v1, чтобы definition version, canonical identity, root pointer, facet/kind/node role и guards создавались атомарно одним уже проверенным контрактом. Старые личные ручные тестовые объекты пользователя являются disposable test data; release-cleanup допускается только для private/manual/pre-ontology строк конкретного owner, определённого через известный тестовый объект 13d59cef-e45f-49c2-8557-7732b74e2de3, и только если нет внешних activity/fact/relation/parameter/tree ссылок. GLOBAL и коммерческие объекты исключены.

## AI_A1_RUNTIME_CONTEXT_COMPILER_V1 — решение

Запрещено собирать Context Manifest отдельно от фактического provider context: это создаёт drift между тем, что получила модель, и тем, что ARCTor считает воспроизводимым контекстом. Runtime Context Compiler становится обязательным bottleneck для интегрированных стадий. Персональные инструкции остаются untrusted user guidance и не повышаются до системной роли. До AI-A4 права по умолчанию ограничены purpose=service_delivery; training/research/export=false.

## AI_A1_1_EXECUTION_BOUNDARY_HOTFIX_V1_3 — решение и урок

Нельзя исправлять AI-A1 простым analysis_execution_id=null для локализации и нельзя ослаблять runtime postcheck с «ровно 2 usage» до «не меньше 2». Каждый реальный provider-вызов должен принадлежать собственной логической AI-операции и иметь воспроизводимый Context Manifest. parentSemanticExecutionId хранится только как lineage. Отдельно зафиксировано правило: provider usage/cost финализируется сразу после успешного provider response, до детерминированной проверки результата; ошибка валидации не должна ложно превращать успешный и оплаченный provider call в openai_failed.

## AI-A1.1 — execution boundary, schema registry и уроки live acceptance

### Найденные дефекты

Первый live AI-A1 postcheck показал третий usage event внутри уже завершённого semantic execution. Причина: последующая локализация activity наследовала analysisExecutionId семантического разбора.

Исправление: content_localization получает собственный ai_analysis_execution, собственные Context Pack / Context Manifest / usage event. Semantic execution остаётся 2 manifests / 2 usage. Родительский semantic execution хранится только как lineage.

После этого локализация всё ещё падала до provider call. Read-only diagnostic установил точную причину: legacy CHECK ai_usage_events_operation_kind_allowed не разрешал operation_kind=content_localization.

Схема была расширена только новым машинным значением content_localization. Не использовать other как обход: это разрушило бы provenance.

### Ошибка release SQL V1

Первый SQL preflight ошибочно сравнивал извлечённый массив допустимых значений с ручным массивом по порядку. PostgreSQL pg_get_constraintdef представил тот же CHECK как = ANY (ARRAY[...]), а порядок после обработки отличался.

V2 сравнивает точное множество значений взаимными @> и <@. Любое неизвестное значение остаётся fail-closed.

### Методологический вывод

Live acceptance обязан проверять не только функциональный результат для пользователя, но и provenance каждого provider call. Схемные enum/check registries являются частью AI runtime contract и должны эволюционировать вместе с новыми operation kinds.

## AI-A3.1 — отказ от parameter-to-leaf compatibility

Решение пользователя:
фактический parameter не обязан быть заранее перечислен на карточке leaf.

Карточка leaf хранит плановые настройки и коэффициенты/формулы.
Реальные observed values живут только в Fact Journal.

После подтверждения leaf:
- каждый выявленный measurement получает отдельный fact с этим leaf tag;
- process_count=1 всегда;
- duration всегда, если она известна;
- один activity_event может породить много facts по числу measurements × selected leafs;
- многократный аналитический учёт одного времени по разным leaf-проекциям в этой версии допустим и не дедублицируется.

Формула v1 — декларативный multiplier rule.
Missing/no-match/no-rule = 1. Несколько matched rules multiply.
Произвольный JavaScript/SQL expression запрещён.
## 2026-08-17 — CONTENT-L10
Решение: не создавать отдельную таблицу переводов на текущем этапе; расширить уже работающий localizedContent envelope до schemaVersion=2 и хранить его в metadata_json сущности. Публичный read path не имеет fallback на source/original. Авторская ручная версия локали имеет приоритет над AI. AI вызывается только на create/edit, обычный read не вызывает перевод. Legacy schemaVersion=1 читается совместимо и поднимается в памяти до V2.


### 2026-08-18 — решение: public-first inline editing для контактов предприятия

Решение: не создавать отдельную параллельную admin-form для контактов. Phone, Website и Message редактируются из той же строки действий, которую видит посетитель. По клику владельца один компактный editor раскрывается вниз; дополнительные owner-only поля живут в этом раскрытии. Телефон, URL и direct-message identifiers не локализуются. UI labels локализуются на 7 языков. Социальные сети и их ленты не являются messenger fields и будут реализованы отдельным слоем.


### 2026-08-18 — решение: featured commercial slot предприятия

Третий верхний блок карточки не является отдельной админ-панелью. В публичном режиме он показывает спецпредложение/новость и Gift cards. В owner edit режиме тот же блок становится редактируемым и принимает изображение, ссылку и короткое описание. Изображение нельзя хранить data URL внутри social_links_json, потому что этот JSON читается directory list API; иначе медиа раздует список и ухудшит latency. Поэтому binary media вынесено в публичный Supabase Storage bucket, а в JSON остается только URL.

## 2026-08-19 — AI RIGHT RAIL: решения и причина `invalid_price_snapshot`

### Зафиксированные решения

1. `AI-Navigator` — глобальный interaction rail, а не отдельный activity engine. Три режима используют общий composer, но разные контролируемые backend paths.
2. `past` / `future` обязаны переиспользовать `/api/activity/quick-capture`; отдельная запись activity из UI rail запрещена.
3. Retry activity обязан сохранять исходный `clientRequestId`.
4. После успешного past/future write AI rail показывает подтверждение + CTA, а main route переключается на review/calendar без уничтожения истории rail.
5. UX autoscroll: новый user message виден сразу; если пользователь находится у нижней границы, ответы продолжают scroll; если пользователь вручную ушёл вверх, rail не перехватывает позицию и показывает `Новые сообщения`.
6. Визуальный язык — ARCTor (`#3b6ef8`, `#eef2ff`, `#f5f6fb`, белые поверхности, умеренные borders/shadows/radius); копирование Messenger/WhatsApp styling запрещено.
7. Voice V1 = browser dictation. Фото V1 = chat-only; расширение image-to-activity требует отдельного attachment/provenance contract.

### Причина сбоя chat billing

- `/api/test` списывает стоимость из EUR wallet и ожидает либо EUR price, либо USD price + `usd_to_eur_rate`.
- `20260811_gsr1e_openai_pilot_price_refresh_budget_hardening_v1.sql` намеренно создал актуальные OpenAI USD snapshots с `usd_to_eur_rate = null` (`fx_intentionally_unset=true`), потому что GSR pilot контролировал USD budget.
- Эти snapshots одновременно стали активными для обычного EUR-wallet chat route.
- Следствие: `calculateEstimatedCostEur()` возвращал null, UI видел `invalid_price_snapshot`, OpenAI call блокировался preflight-ом.
- Исправление не подменяет актуальные token prices старыми: используется активный snapshot цены, а отсутствующий FX берётся из последнего сохранённого положительного OpenAI rate только как compatibility fallback. Если актуальный snapshot снова содержит FX, fallback автоматически не используется.
- Отдельный будущий housekeeping: определить canonical policy обновления FX snapshots, чтобы compatibility fallback не становился бессрочной бизнес-политикой.

### Release tooling lesson: Windows PowerShell 5.1 и native stderr

Первые два release runner этого блока остановились до любых изменений на `RUN=FETCH_ORIGIN_MAIN`. Строка Git `From https://github.com/...` является обычным stderr/progress native-команды, но при `$ErrorActionPreference='Stop'` и объединении `2>&1` Windows PowerShell 5.1 превратил её в terminating `NativeCommandError` раньше проверки `$LASTEXITCODE`. Поэтому прежняя привязка пользовательского FAIL к CRLF была неверной: EOL-hardening остаётся профилактикой, но не причиной этих двух production FAIL. Исправление V3: stdout/stderr native-команд сохраняются в REPORT, а успех определяется по exit code; REPORT создаётся прямо в корне Downloads. `git diff --check`, build, exact allowlist, rollback/resume и commit/push gates остаются обязательными.

### 19.08.2026 — AI RIGHT RAIL V3: ESLint gate сработал правильно
- V3 успешно прошёл fetch, clean/exact baseline, EOL-safe dry-run/apply и validator 18/18.
- Production ESLint остановил релиз на `global-ai-navigator.tsx`: `react-hooks/set-state-in-effect` для `setSelectedImage(null)` внутри эффекта; одновременно показаны 7 warnings (6 unused legacy symbols + dependency `latestMessage`).
- Commit/push не выполнялись; rollback = PASS; HEAD восстановлен на `f0595a0d...`.
- Решение V4: не ослаблять ESLint и не добавлять disable-comment. Очистка photo attachment выполняется в пользовательском handler смены режима; message-follow effect выполняет state update из deferred callback и зависит от полного `latestMessage`; unused legacy declarations удалены.
- Инженерный вывод: changed-file ESLint остаётся обязательным pre-build gate и должен выполняться до `npm run build`.


## 2026-08-19 — AI RIGHT RAIL V5: photo evidence во всех режимах и stale price recovery

Private binary evidence хранится в Supabase Storage bucket `activity-evidence-media-v1` с `public=false`; activity/signal metadata сохраняет только reference/MIME/size/SHA-256/provenance, без public URL и base64.

1. Фото в `past/future` — это не chat decoration, а private raw evidence конкретной activity. Binary хранится отдельно от activity metadata и не публикуется.
2. На capture фото не должно запускать semantic AI: activity/review marker создаются сразу, AI начинается только при открытии review.
3. До отдельного provenance contract изображение может влиять на semantic proposals, но не создавать numeric measurements/facts. Server guard пропускает при наличии image evidence только те model measurements, чей `rawFragment` буквально поддержан user-declared text; при image-only input model measurements отбрасываются, а server timing остаётся отдельным источником. Это запрещает выдавать распознанный размер порции, часы графика или другие числа за user-declared fact.
4. `PRICE_SNAPSHOT_STALE` — другой дефект, не связан с правой колонкой. GSR1E сознательно требует snapshot <=7 days, поэтому 11.08 snapshot закономерно заблокировал review 19.08.
5. Нельзя бессрочно продлевать старую цену. V5 self-heal работает только для точного `standard/gpt-5.4-mini`, сверяет текущий DB snapshot с проверенными официальными значениями 0.75 / 0.075 / 4.50 USD за 1M input/cached/output и имеет жёсткий verification lease до 26.08.2026. При несовпадении или после expiry — fail-closed.
6. Runtime refresh создаёт новый versioned price snapshot, а не переписывает историческую цену.

### 2026-08-19 — AI RIGHT RAIL V6: background review / model selector
1. Решение: capture и semantic review — два процесса. Capture обязан завершить durable raw write раньше AI; AI запускается через `after()` после ответа и не блокирует переход пользователя.
2. Фото остаётся evidence/source, а не отдельным жизненным событием «загружена фотография». Image-only intake получает техническое временное название, но immutable source/evidence сохраняется отдельно.
3. Факты по-прежнему создаются только после human review commit. Background review создаёт только draft анализа.
4. Параллельный background/manual review может дважды дойти до model stage на разных server instances; DB unique index остаётся последним guard. V6 обрабатывает `23505` повторным чтением winning draft, не создавая второй open draft.
5. Узкий rail не показывает обрезанные `Відбул.../Заплан.../Спілку...`: в narrow desktop остаются фирменные иконки с accessibility labels; в mobile drawer текст разрешён.
6. `Nano/Standard/Pro` больше не являются пользовательскими названиями моделей в right rail. Они остаются внутренними billing tier codes; UI показывает фактические `GPT-5.6 Luna/Terra/Sol`, а Pro-slot использует Sol + reasoning=max.
7. Автоматическое назначение будущей frontier-модели не должно означать «самое новое имя = production». Нужны approved registry, compatible Structured Output/image support, актуальная цена и budget gates. V6 отделяет UI от tier name и создаёт server model catalog как точку дальнейшей автоматизации.
8. Canonical leaf/candidate retrieval в V6 запрещено менять по решению пользователя; этот слой ожидает отдельную новую логику.

### 2026-08-19 — AI RIGHT RAIL V7: TypeScript duplicate-receipt hotfix
1. V6 production release не дошёл до commit: validator 23/23 и ESLint zero-warning прошли, но `next build` выявил `TS7053`/implicit-any на `existing.result.activityEventIds?.[0]`.
2. Причина — `asRecord()` намеренно возвращает `Record<string, unknown>`; optional chaining не превращает неизвестное JSON-поле в массив. Нельзя повторно индексировать JSON после того, как его массивность уже проверена в другом месте.
3. Правило: helper, который валидирует persisted JSON, должен возвращать потребителю уже типизированные scalar/array-derived значения. V7 возвращает `primaryActivityEventId: string | null`.
4. Функциональные решения V6 (background review, progress UX, icon-only narrow rail, GPT-5.6 registry, неизменный canonical leaf routing) остаются без изменений.
5. V6 runner сделал `ROLLBACK=PASS`; authoritative baseline для V7 остаётся `062b22afe2c7250e8ec69383394b994763524e99`.

### 2026-08-19 — AI RIGHT RAIL V8: model option contract hotfix
1. V7 production build failed before commit because UI consumed `AiNavigatorModelOption` with obsolete property name `code`; the actual server/client contract uses `tierCode`.
2. TypeScript correctly caught all three call sites: selection comparison, React key and `setSelectedTier`.
3. Rule: validators for shared typed option contracts must assert exact property names on the consumer side, not only the presence of catalog rendering.
4. V8 uses `tier.tierCode` consistently and explicitly forbids `tier.code`.
5. V7 rollback PASS; production baseline remains V5 commit `062b22afe2c7250e8ec69383394b994763524e99`.


## 2026-08-19 — HELP+FILES V1: решения

### D-HELP-01 — help content не является обычным localized content
Для предприятий CONTENT-L10 защищает ручные locale-версии и AI в основном работает при создании. Для справки зафиксирована противоположная политика: любое новое сохранение администратором означает, что эта locale стала новым каноническим источником; ВСЕ 7 переводов создаются заново одной frontier-моделью. Это сознательное решение пользователя, а не побочный эффект.

### D-HELP-02 — translate first, persist second
Нельзя сначала сохранить source и потом асинхронно пытаться перевести. PUT `/api/admin/help-system` сначала получает и валидирует strict 7-locale Structured Output, затем одной DB-функцией добавляет history revision и заменяет current. Ошибка AI оставляет предыдущую опубликованную справку неизменной.

### D-HELP-03 — strongest model через server catalog, не hardcoded UI
Help translator берет `getNavigatorModelDefinition("pro")`; текущий mapping — `gpt-5.6-sol` + `reasoning=max`. При будущем изменении approved frontier slot help system меняется вместе с server registry, а не с клиентским UI.

### D-HELP-04 — registry в коде, тексты в БД
Структура страниц/heading/link/navigation воспроизводится из source generator; изменяемые WHAT/WHY и их переводы живут в PostgreSQL/Supabase с revision history. Empty text = marker отсутствует.

### D-FILES-01 — private media не превращается в public URL
`Загруженные файлы` открывает activity evidence только через авторизованный endpoint по signal id; endpoint сам получает storage reference из owned DB row, проверяет user path и SHA-256. Произвольный storage path из query запрещен.

### D-HELP-05 — Activity Container не развиваем
Legacy `/calendar/activity-review` container flow остается историческим UI и не используется как основа Help/Files V1. Его удаление/замена будет отдельным блоком.


### D-HELP-02 — stable help identity + all-locale save invalidation
- Persisted help content нельзя связывать только с позиционным ordinal: при вставке нового heading выше справка могла бы перейти к другому элементу. V1 использует semantic page/navigation keys и source fingerprint для heading key; ordinal остаётся только текущим DOM locator.
- Dynamic routes (`[id]`, `[...slug]`, `[[...slug]]`) сопоставляются как route patterns, а не exact pathname.
- После успешного admin save все 7 translations считаются новой единой revision; поэтому любые локальные несохранённые drafts других locale для того же WHAT/WHY блока удаляются как stale.
- Revision RPC сериализует конкурентные save одного блока transaction advisory lock, чтобы не получить одинаковый revision number.
### F-HELP-01 — V1 release preflight: Supabase CLI account token absent
- Симптом: `SUPABASE_LINK_TEMP` завершился exit=1 с `Access token not provided` 20.08.2026.
- Граница безопасности сработала правильно: `ROLLBACK=NOT_NEEDED_NO_SOURCE_MUTATION`; source mutation не начиналась, DB migration не применялась, commit/push отсутствовали.
- Причина: runner умел использовать safe `--db-url` либо уже авторизованный linked Supabase CLI, но не имел bootstrap пути для первого account login на Windows машине.
- Решение V2: сначала пробовать существующий credential без интерактива; только при точном auth-missing результате запускать официальный `supabase login` в attached console/browser, после чего повторять link. Никакой PAT не читается и не логируется нашим кодом.
- Запрещено обходить эту проблему service-role REST ключом или создавать произвольный SQL-executor RPC: application service role не является Management API credential и не должен получать общий DDL execution channel.

### F-HELP-02 — linked Supabase migration history расходится с историческим checkout
- V2 после успешного `supabase login` и `link` дошёл до безопасного `db push --dry-run`, но CLI предложил десятки исторических migrations, а не только HELP/FILES target.
- Это означает, что локальная директория `supabase/migrations` и remote migration history не могут сейчас использоваться как безопасный автоматический release channel без отдельной большой reconciliation-задачи.
- Safety decision: НЕ выполнять `db push --include-all`, НЕ чинить history автоматически и НЕ пытаться прогнать старые migrations повторно.
- Для точечного HELP/FILES schema change SQL выполняется вручную через Supabase SQL Editor. Репозиторная копия живёт в `supabase/manual-applied/20260820_help_files_system_v1.sql`.
- После ручного SQL code runner выполняет только read-only runtime contract probe: таблицы должны читаться service-role, а вызов RPC с заведомо невалидным пустым help_key должен завершаться `HELP_KEY_REQUIRED`, что доказывает наличие функции без записи данных.
- Точный gate V2: `DB_PREFLIGHT_DRY_RUN_UNEXPECTED_PENDING_MIGRATIONS`; source mutation не начиналась, DB не менялась, commit/push отсутствовали.


### F-HELP-03 — V3 code release stopped by pre-existing navigation lint debt
- Manual HELP/FILES SQL был успешно применён и подтверждён PASS; V3 read-only DB preflight также прошёл.
- После patch/registry/validator 34/34 production ESLint с `--max-warnings=0` остановил release на `src/components/app-shell/global-navigation.tsx`: 4 неиспользуемых legacy declaration и 3 `@next/next/no-img-element` warning. Это произошло ДО `npm run build`, commit и push.
- Runner корректно выполнил `ROLLBACK=PASS`, удалил 19 новых файлов и вернул code baseline `10d6bab82cecd2abcfcebd8ead3279d79a2f799a`. DB schema при этом остаётся применённой вручную и не откатывается, потому что SQL уже завершился PASS до запуска code release.
- Решение V4: не снижать lint gate и не менять его на warning-tolerant. Удалить только доказанно неиспользуемый legacy organization-navigation код; static ARCTor logo перевести на `next/image`; произвольный profile media URL оставить обычным `<img>` с узким документированным lint exception, чтобы не вводить небезопасный wildcard remote image policy.
- Инженерное правило: если changed-file lint захватывает исторический файл с legacy warnings, release обязан либо устранить warnings без изменения поведения, либо явно исключить файл из patch. `--max-warnings=0` сохраняется.

- Gate identifier для recovery: `ESLINT_CHANGED_TS_MAX_WARNINGS_0` (production report: `ERROR=ESLINT_CHANGED_TS_FAILED exit=1`).


### F-HELP-04 — V4 build stopped by uploaded-files relative import depth
- V4 production attempt 20.08.2026 прошёл read-only DB preflight, registry generation, validator 36/36 и ESLint `--max-warnings=0`, но `next build` остановился на 4 `Module not found` errors.
- Причина: два новых API route использовали относительные imports к root `lib/` на один уровень глубже фактической директории. Для `src/app/api/uploaded-files/route.ts` нужны `../../../../lib/...`; для `src/app/api/uploaded-files/open/route.ts` нужны `../../../../../lib/...`.
- Runner сделал `ROLLBACK=PASS`, удалил 19 новых файлов; commit/push отсутствовали, code baseline остался `10d6bab82cecd2abcfcebd8ead3279d79a2f799a`. Manual HELP DB schema остаётся применённой и PASS.
- Решение V5: исправить только module import depth, добавить validator checks, запрещающие V4 over-deep imports, и повторить zero-warning ESLint + полный Next build до commit.
- Инженерное правило: для новых nested Next.js route относительный import к root `lib/` должен проверяться по реальному filesystem depth или существующему sibling-route pattern; syntax/transpile без module resolution недостаточен. Gate: `BUILD_FAILED` / `Module not found`.


### 2026-08-20 — HELP popup/mobile marker UX hotfix V1
- Исправлена блокировка desktop sidebar/main scrolling прозрачным full-screen help backdrop: backdrop теперь существует только на mobile, desktop popover закрывается Escape/outside-click и не перехватывает прокрутку страницы.
- Длинный desktop help popover теперь получает viewport-safe top/maxHeight и собственный overflow-y, поэтому весь WHAT/WHY текст доступен без выхода ниже экрана.
- Mobile help markers раньше привязывались к первому nav[aria-label=ARCTor], которым на смартфоне часто был скрытый desktop sidebar; теперь выбирается реально отображаемый nav.
- Добавлен MutationObserver с защитой от self-mutations, чтобы help markers пересканировались после динамического открытия mobile navigation drawer.
- Help content, translation policy, DB schema, registry keys, canonical leaf routing и legacy Activity Container не изменялись.
- Первый production release attempt V1 прошёл functional validator 18/18, но остановился на release-tooling allowlist gate: PowerShell parser получил пустой CHANGED_ALLOWLIST_ACTUAL несмотря на применённые изменения; rollback PASS, commit/push отсутствовали.
- V2 не меняет функциональный hotfix: исправлен только release-tooling — exact allowlist теперь проверяется через explicit staging + git diff --cached --name-only, а отсутствие лишних изменений отдельно подтверждается git diff --quiet и git ls-files --others.

## 2026-08-20 — Decision: stable rendering for HELP markers and dashboard analytics

- Do not implement HELP discovery by destructively removing every marker host and rebuilding it on each MutationObserver callback. Reconcile only missing/stale hosts.
- DOM mutation may trigger discovery, but an already valid marker must retain DOM identity.
- User-created analytics cards use stale-while-revalidate UX: keep the last successful visual result while a background request runs.
- A failed background refresh must not erase a result that was already rendered successfully.
- Changing interface locale must not refetch locale-independent dashboard block definitions. Localized chart data may refresh, but the existing chart remains visible until replacement data is ready.
- This hotfix intentionally does not redesign dashboard/session hydration, page headings, HELP content, or analytics semantics.
- Release tooling rule added after the V1A failure: on Windows PowerShell 5.1, native stderr must be captured as diagnostic output and must not itself be treated as failure; non-zero native exit code remains mandatory for failure.


## ARCTOR_DASHBOARD_ANALYTICS_SINGLE_LOAD_HOTFIX_V2A — решение
Дата: 2026-08-20

1. Locale Dashboard должен быть известен до первой hydration.
2. src/app/page.tsx получает locale/lang из Next.js searchParams и передает initialLocale в FigmaDashboardContent.
3. useInterfaceLocale инициализируется initialLocale и сохраняет popstate-поддержку, но не делает стартовую коррекцию en -> фактическая locale.
4. Release-transform обязан быть CRLF/LF-safe: сравнение выполняется после normalize LF в памяти, запись восстанавливает исходный EOL.
5. Help markers, Help Registry, данные/формулы аналитики и БД не изменяются.


## ARCTOR_DASHBOARD_ANALYTICS_SSR_BLOCKS_HOTFIX_V3 — решение
Дата: 2026-08-20

1. Персональная структура Dashboard не должна появляться после hydration, если сервер уже имеет сессию и actor context.
2. / server-side получает dashboard_analytics_blocks для текущего appUser/active actor и сериализует их в FigmaDashboardContent.
3. 401 для гостя трактуется как корректный пустой персональный список, а не как ошибка интерфейса.
4. Не-401 ошибка server prefetch передаётся как null: Workspace показывает существующий retry UI и может выполнить клиентский loadBlocks только по явному Retry.
5. Обязательный initial client GET /api/dashboard/analytics-blocks удаляется.
6. Данные конкретных графиков, формулы, Help System, Auth0 contract и БД не изменяются.


## ARCTOR_DASHBOARD_SSR_CONTEXT_HOTFIX_V4B — решение
Дата: 2026-08-20

Dashboard SSR использует минимальный уже существующий actor-context вместо общего activityUserContext. SSR initialAnalyticsBlocks сохраняется; client-side позднее появление структуры Dashboard не возвращается. Ошибка actor-context даёт null для существующего retry/error path, отсутствие Auth0 session даёт []. Help System, БД, analytics formulas/data API и общий activityUserContext вне Dashboard не меняются.


## ARCTOR_VO_AUTHORING_ANALYTICS_FOUNDATION_V1D — решения
Дата: 2026-08-20

1. Persisted numeric facts являются исходными наблюдениями и не изменяются аналитическими коэффициентами.
2. Накопленный эффект может быть абсолютным или условным; для условного важны знак, тенденция, скорость и срок до нуля/target/critical boundary.
3. Отсутствие факта в настроенном refresh period может давать inactivity_delta.
4. Symptom v1 — обычный STATE/symptom_state leaf; простая фиксация использует существующий process_count=1 факт после выбора этого leaf.
5. Развитие/деградация — направление и скорость изменения накопленного состояния.
6. Старые private draft_first/manual_draft новые записи больше не создают; commercial usage_scope=commercial сохранён.
7. Product/service/offer/certificate — защищённый production-контур; наличие legacy mirror fields там не является основанием для очистки.
8. Старые A3.1 fact-mutating coefficient rules не удаляются. V1C сохраняет требование: active rows должны отсутствовать, и запрещает создавать новые active rows.
9. Автоматическое обучение коэффициентов V1A не включает; это отдельный будущий версионированный механизм.


## 2026-08-21 — Decision: branch-driven observation leaf semantics

1. Отменено решение V1D, в котором `Symptom` трактовался как отдельный manual leaf kind `STATE/symptom_state`. Симптом — обычный объект наблюдения; отдельный picker/группа/тип для него запрещены.
2. Root / intermediate / leaf описывают только структурное положение. Смысл обычного private leaf определяется structural path и политикой ветви, а не самостоятельным выбором `PROCESS / STATE / ...` на форме листа.
3. `facet_code` и `object_kind_code` пока сохраняются как внутренний compatibility contract P1C, но не должны становиться пользовательской таксономией private observation tree. Нейтральные generic codes нельзя показывать как смысл объекта.
4. Для текущего P1C guard private branch-driven authoring не ломает kind/facet registries: intermediate/leaf используют generic kind technical lineage. Будущая formal branch-policy architecture может заменить это без миграции пользовательского смысла, потому что смысл закреплён путем.
5. Structural edge в пользовательском дереве — `part_of`. `is_a` не используется новым private branch-driven authoring для простого родительства.
6. Private manual ontology objects не имеют полезной стадии черновика в текущем UX. Новый authoring сразу вызывает существующий lifecycle transition `draft -> active`; commercial draft-first остаётся отдельным защищённым контуром.
7. Leaf creation under root запрещено в новом flow: пользователь сначала создаёт intermediate semantic branch, затем leaf внутри неё.
8. Manual normalization старых private drafts должна быть узкой, обратимой и маркированной в metadata; GLOBAL/System, organizations, product/service/offer/certificate не затрагиваются.

## DECISION_CURATOR_FACET_CODE_DEPRECATED_20260905

Дата: 2026-09-05
Code commit: `34d08384f5183a2aac28bca1537e75489dc6c5d4`

Решение: `facet_code` не является частью актуального семантического контракта ARCTor и не должен запрашиваться у Куратора или показываться как смысловая характеристика ОН. Нового обязательного enum взамен не вводится.

Причина: три дерева модели уже задают базовую плоскость реальности, а конкретный смысл ОН определяется карточкой, структурным положением и типизированными связями. Универсальный `ENTITY/PROCESS/STATE/...` создавал вторую онтологию поверх основной.

Техническое ограничение текущего этапа: P1C DB guard пока требует legacy `facet_code/object_kind_code`. Поэтому значения временно остаются server-side compatibility metadata/storage fields и не являются источником истины. Физическое удаление из schema отложено до отдельного dependency audit/migration.

### Ошибки release-runner, зафиксированные до успешного релиза

- 18:46 V1: false FAIL на нормальном Git STDERR во время `fetch`; source/DB mutations отсутствовали.
- 18:50 V1.0.1: allowlist остановил commit из-за загрязнения `git diff --name-only` предупреждением LF/CRLF; один residue-файл остался в worktree.
- V1.0.2: native streams разделены; allowlist переведён на porcelain status; rollback усилен byte snapshot; auto-recovery разрешён только для точного известного residue path+hash.

## DECISION_CURATOR_CANONICAL_KEY_SERVER_GENERATED_20260905

Дата: 2026-09-05
Code commit: `fd8d4b52e39e6188d023601fe1ea3636a9cf591a`

Решение: `canonical_key` остаётся обязательным техническим идентификатором системного ОН, но не является предметным решением Куратора. Ручное поле удаляется из create workflow; ключ генерируется сервером детерминированно.

Формат v1: `system.<english_slug>.<10-hex-sha256>`. Hash seed включает structural role, parent id/ROOT и English title. Это обеспечивает стабильный retry и не требует от меняющегося персонала знания технических namespace.

Ключ не является semantic facet, object kind или полным путём дерева. После создания он не меняется автоматически. Существующие ключи не мигрируются этим релизом.

## DECISION_FACTS_ARE_SINGLE_NUMERIC_TRUTH_STORE_WITH_THREE_ROLES_20260907

Дата: 2026-09-07
Code commit: `9d24805ddf7457620c9c4c8424a6d4ab24b13a08`

Решение: `activity_object_facts` остаётся единым местом хранения числовых/категориальных значений. Объекты наблюдения сами не изменяются и не хранят состояние; они являются структурированными смысловыми метками фактов.

Роль факта (`source/result/snapshot`) отделена от происхождения значения (`source_type`). Результирующий факт хранит значение + идентификатор/версию зарегистрированного правила и ссылки на конкретные входные факты. Срез хранится такой же строкой факта, но фиксирует status quo на момент/границу периода и может ссылаться на предыдущий срез.

Формула не должна дублироваться текстом в каждой строке факта: строка хранит `calculation_rule_code + calculation_rule_version`, а сама формула должна жить в отдельном версионируемом реестре следующего этапа.

## 2026-09-07 - PowerShell parser failure in Ukrainian terminology hotfix V1

- Symptom: the runner failed before execution with ParserError around the Ukrainian U+2019 apostrophe.
- Cause: Windows PowerShell 5.1 recognizes smart quotation marks as quotation delimiters; U+2019 was embedded inside single-quoted PowerShell literals.
- Lesson: release runners must keep executable PowerShell source ASCII-only when localized text contains smart quotation marks. Localized UTF-8 payloads must be constructed at runtime (Base64/Unicode code points) or stored outside PowerShell syntax.
- Impact: no source/DB/commit/push changes occurred because parsing failed before execution.
- Fix: V1.0.1 uses Base64-decoded UTF-8 localization strings and records this failure in recovery.

## 2026-09-07 — публикация системных ОН подтверждением куратора

Решение: отдельный второй этап ручной публикации системного ОН отменен. Подтверждение создания системного ОН авторизованным куратором является моментом публикации общей модели.

Системный ОН создается ownerless, `scope_code=global`, `origin_type_code=system_model`, `status=active` и доступен всем пользователям. Личные ОН остаются закрытыми для других пользователей.

Причина: прежняя схема `draft + system_hidden_from_observation_ui=true` делала уже подтвержденные куратором системные ОН невидимыми обычным пользователям и разрывала единый системный каталог.

Маркер ошибки runner: `GLOBAL_VISIBILITY_V1_RUNNER_TRAILING_WHITESPACE_FAILURE`. Первый запуск прошел все проверки кода и создал code commit `0621af92cd5a2a238869df1c1f56324181c8720f`, но остановился до recovery commit/push из-за пробелов в конце строк автоматически созданного recovery-файла. После rollback три tracked-файла остались помечены измененными только из-за окончаний строк. V1.0.1 разрешает автоматическую очистку лишь этого точно известного остатка после проверки отсутствия смысловых различий и нормализует recovery-файл до staging.


## 2026-09-07 — Решение по языку управляемого контента

- Английский (`en`) — канонический язык управляемого системного контента.
- Язык автора/куратора не является каноническим языком записи.
- Язык читателя определяет отображение.
- Ручной вариант конкретного языка сохраняется как человеческий и не должен молча заменяться машинным.
- Первичные сообщения пользователя сохраняются в исходном языке и не переписываются.
- Системный ОН должен получить полный набор поддерживаемых языков при создании; перевод при обычном просмотре пользователем не используется как штатный путь.

## Сбой первого управляющего скрипта V1 и исправление V1.0.1

Первый запуск релиза остановился до изменения исходников на команде `git fetch origin main`. Причиной был не Git и не проект: Windows PowerShell 5.1 при глобальном `$ErrorActionPreference = "Stop"` воспринял обычный служебный вывод Git в stderr (`From https://...`) как ошибку PowerShell, хотя нулевой код завершения процесса не был обработан. Рабочее дерево было возвращено к исходной точке и осталось чистым.

В V1.0.1 функция `Invoke-Native` временно использует `ErrorActionPreference = "Continue"` только на время запуска внешней программы и определяет успех или ошибку исключительно по `$LASTEXITCODE`. Перед первым обращением к Git выполняется отдельная самопроверка: Node пишет текст в stderr и завершается с кодом 0; управляющий скрипт обязан обработать это как успешный запуск.

## Сбой V1.0.1: предварительно существовавший локальный файл

V1.0.1 успешно исправил обработку stderr внешних программ и прошёл самопроверку, но остановился на защите от неизвестного состояния: в рабочем каталоге уже существовал незакоммиченный `src/lib/reality-core/global-system-value-object-localization.server.ts`, которого нет в исходной точке Git. Рабочее дерево Git при этом было чистым.

Предыдущая аварийная очистка была слишком широкой: она могла удалить любой незакоммиченный файл по этому пути после сбоя. V1.0.2 меняет правило. Предварительно существовавший файл никогда не удаляется автоматически. Если его SHA-256 точно совпадает с ожидаемым содержимым нового системного локализатора, выпуск может безопасно продолжиться; при любом другом содержимом выпуск прекращается без изменения этого файла и сообщает его SHA-256. Если локальное правило Git игнорирует этот новый исходный файл, V1.0.2 явно фиксирует это в отчёте и добавляет только этот проверенный файл с `git add -f`.

## Сбой V1.0.2: противоречивый отрицательный запрос Git

V1.0.2 прошёл проверку обработки обычного stderr, подтвердил `main`, точный исходный commit и чистое рабочее дерево, но остановился на проверке отсутствия нового серверного файла через `git cat-file -e HEAD:<path>`. Управляющий скрипт получил результат, эквивалентный наличию файла в HEAD. Независимая проверка удалённого commit `8f60c37f86afb2d6e49bd61f8408632864592386` и его дерева показала, что `src/lib/reality-core/global-system-value-object-localization.server.ts` в этом commit отсутствует. Поэтому результат отрицательного запроса в V1.0.2 признан противоречивым; причина на границе Windows PowerShell 5.1 / внешней программы окончательно не доказана.

V1.0.3 больше не использует ожидаемо неуспешный `git cat-file -e` для проверки отсутствия пути. Наличие файла в HEAD определяется командой `git ls-tree -r --name-only HEAD -- <path>`, которая успешно завершается и возвращает пустой список при отсутствии файла. Дополнительно до первого изменения проекта выполняется тест внешней программы с преднамеренным кодом завершения 7; управляющий скрипт обязан получить именно 7. Проверки удаления временно созданных файлов при откате также переведены на текстовый `git ls-files -- <path>` без ожидаемого ненулевого кода завершения.

## Сбой V1.0.3: недостоверный `$LASTEXITCODE` во wrapper-функции

V1.0.3 добавил обязательный self-test ненулевого кода завершения. Node-процесс намеренно завершился с кодом 7 и записал диагностический текст в stderr, но Windows PowerShell 5.1 wrapper вернул `ExitCode=0`. Runner остановился до чтения/изменения production repository; rollback подтвердил чистое рабочее дерево.

Исправление V1.0.4: PowerShell больше не исполняет Git/npm/npx и не принимает решений по `$LASTEXITCODE`. Он только декодирует проверенный Node-runner, запускает его через `Start-Process -Wait -PassThru` и возвращает `Process.ExitCode`. Все дочерние Git/Node/TypeScript/ESLint/Next процессы запускаются из Node через `child_process.spawn` с раздельным stdout/stderr и фактическим process exit code.

## V1.0.4: безопасный bootstrap и resume/rollback

- PowerShell bootstrap ASCII-only, CRLF, без BOM; payload Node хранится в Base64.
- До mutation Node-runner проверяет native stderr/exit 0, intentional exit 7 и большой одновременный stdout/stderr.
- Точный baseline: `8f60c37f86afb2d6e49bd61f8408632864592386`; branch/main/origin/worktree и source Git blobs проверяются до изменения.
- Известный локальный helper разрешается только при точном SHA-256 `1AF7D51BE551D3FC98AC82EED892AA1B5A3449ED3EF771C9FB1E3D127AAD3388`; неизвестное содержимое блокирует release.
- Поддерживаются fresh run, resume после точного code-only commit, resume после точного recovery commit и уже опубликованный точный release.
- Rollback возвращает только состояние, созданное текущим запуском; pre-existing verified helper сохраняется.
- До/после изменения выполняются доступные проверки TypeScript, ESLint, `git diff --check`; после изменения — production Next build, отдельный code commit, отдельный recovery commit, push, fetch и remote verification.


## 2026-09-07 — единая семантика публикации и поисковый выбор ОН куратора

Решение: фразы о «системном черновике, скрытом до отдельной публикации» больше не являются допустимыми в UI куратора. Системный ОН после подтверждения куратором сразу является опубликованным глобальным объектом, доступным всем пользователям.

Решение: длинные списки ОН в рабочих формах куратора не должны требовать ручного прокручивания. Базовый паттерн выбора — searchable combobox. Минимальный поисковый индекс варианта включает локализованные название и описание, английские канонические название и описание и canonical key. Фильтр допустимой структурной роли применяется до текстового поиска.

Причина: системная онтология будет расти до сотен и тысяч элементов; обычный HTML select перестает быть рабочим инструментом и провоцирует ошибочный выбор по визуально похожим названиям.


## 2026-09-07 — область каталога объектов наблюдения

Решение: принадлежность ОН и структурная роль являются независимыми измерениями фильтрации. Верхний переключатель выбирает область данных (`mine/system/all`), а существующие фильтры ниже выбирают роль (`all/root/intermediate/leaf/draft`). Нельзя реализовывать область только визуальным скрытием карточек: сначала формируется scoped read-model, и уже он передаётся во все представления каталога и счётчики.

Визуально новый переключатель не создаёт новый паттерн: повторно используется стиль уже действующего переключателя сертификатов.


## 2026-09-08 — единый визуальный стандарт dashboard/catalog, runner V1.0.3

Решение: High-Fidelity Dashboard Design и его theme tokens считаются рабочей визуальной основой ARCTor. Повторяющиеся controls должны выноситься в shared components, а не копироваться локально.

Сбой runner V1: CRLF/LF exact-match mismatch на dry-run; rollback clean. Исправление: EOL normalization before patch/hash.

Сбой runner V1.0.1: source allowlist использовал только git diff --name-only и не видел намеренно создаваемые untracked paths. Исправление V1.0.2: tracked diff + git ls-files --others --exclude-standard.

Сбой runner V1.0.2: после успешного post-TypeScript touched ESLint дал 2 errors / 3 warnings. Эти нарушения уже присутствуют в exact baseline certificates-dashboard.tsx: 2 x react-hooks/set-state-in-effect и 3 x @next/next/no-img-element. Ошибка release-runner состояла в предположении, что каждый существующий touched-файл обязан иметь 0/0, без измерения его собственного baseline.

Исправление V1.0.3: baseline ESLint вычисляется из содержимого exact baseline Git commit через ESLint --stdin --stdin-filename для каждого существующего touched-файла. После patch counts и rule histogram обязаны остаться без изменений, а каждый новый linted-файл обязан иметь 0/0. Full-project ESLint также не может увеличить baseline 244 errors / 107 warnings.

Это изменение не ослабляет gate: существующий lint debt не разрешается расти или менять правило, а новый код обязан быть чистым.


## 2026-09-08 — правило contextual create action

Решение: зелёная contextual create action должна создавать сущность текущего раздела, а не переносить пользователя в несвязанный домен. На desktop такая кнопка размещается в верхней action-row справа. Для каталога ОН это «Добавить ОН» → /value-objects/new; для сертификатов «Добавить суперпредложение» → /offers/new. Вторичные специализированные действия могут находиться рядом в белом secondary style.


## 2026-09-08 — правило create action row / scope row

Решение: на desktop contextual create action занимает собственную верхнюю строку справа. Scope/navigation switch располагается отдельной следующей строкой слева. Каталог ОН не ведёт через универсальный commercial selector: contextual create action направляется непосредственно в ordinary observation-object creation flow /value-objects/new/root.

## 2026-09-12 — PRICE_SNAPSHOT_STALE в curator localization
Решение: не блокировать создание ОН локализацией. Persist-first + persistent retry queue. Model names больше не хранятся в .env.local; центральный источник — navigatorModelCatalog. Price snapshot автоматически освежается из versioned catalog при точном совпадении модели/цен; несовпадение — fail-closed.

### Ошибка runner V1
Первый запуск V1 дошёл до targeted ESLint и завершился exit=1 до build/commit/push. Первый REPORT не сохранял полный вывод ESLint.

### Ошибка runner V1_0_1
Второй запуск подтвердил validator 15/15, но targeted ESLint остановил релиз на react-hooks/set-state-in-effect. Исправлено разделением fetchQueue и UI state update.

### Ошибка runner V1_0_2
Третий запуск прошёл validator 15/15 и targeted ESLint, но Next production build остановился на strict TypeScript check. Исправлен тип emptyVariants и добавлен отдельный tsc --noEmit gate.

### Ошибка runner V1_0_3
Четвёртый запуск полностью прошёл validator, ESLint, TypeScript и production build. Harness ошибочно трактовал LF/CRLF warning из native STDERR как terminating error. Исправлено решением PASS/FAIL по native exit code.

### Ошибка runner V1_0_4
Пятый запуск полностью прошёл validator 15/15, targeted ESLint, TypeScript и production build. git diff --check затем корректно нашёл настоящую проблему recovery-записи: double-quoted PowerShell here-strings интерпретировали Markdown backticks как escape-последовательности, а Add-Content в Windows PowerShell 5.1 нарушал стабильность существующего UTF-8/CRLF файла. V1_0_5 использует single-quoted here-strings, .NET UTF8Encoding(false), byte-preserving append, CRLF normalization и byte-prefix integrity check. Commit/push V1_0_4 не выполнялись; failure path снова запустил rollback.

### Ошибка runner V1_0_5
Шестой запуск V1_0_5 прошёл recovery integrity, validator 15/15, targeted ESLint, `tsc --noEmit`, production build и `git diff --check`, но остановился на source allowlist до commit/push: `git status --porcelain=v1` вернул новый каталог `src/app/admin/localization-jobs/` как одну агрегированную untracked-запись. Это ложное срабатывание harness: разрешённый файл `src/app/admin/localization-jobs/page.tsx` находился внутри этого каталога. V1_0_6 использует `git status --porcelain=v1 --untracked-files=all` и тем самым сохраняет строгий file-level allowlist без разрешения произвольных директорий.

## 2026-09-12 — Решение по контексту последствий ОН
Пара «исходный ОН → целевой ОН» не является самостоятельным универсальным правилом. Будущее вычислительное последствие определяется минимум контекстом: типовая активность + исходный параметр + исходный листовой ОН + целевой листовой ОН. Один и тот же исходный ОН в другой типовой активности может не иметь такого последствия вообще.

V1 конструктора последствий поэтому создаёт только очередь исходных заданий и сохраняет provenance сырой активности. Пока связи ОН не настроены, выбор целевого ОН заблокирован. value_object_relations, формулы и результирующие факты этим релизом не создаются.

## 2026-09-12 — Граница общей связи ОН и последствия активности
Решение: «Конструктор связей» фиксирует только общую смысловую связь между двумя ОН и имеет ровно четыре поля: source ОН, target ОН, тип связи, свободный комментарий куратора. Типовая активность не является полем общей связи. Общая связь нужна для карты связей и как допустимый кандидат для последующего выбора в «Конструкторе последствий». Конкретная применимость связи к типовой активности, формула и запись результирующего факта определяются отдельным последующим правилом. Комментарий куратора хранится как append-oriented provenance в `activity_processing_logs`, без расширения SQL identity-row `system_value_object_relations`.

## 2026-09-12 — Ошибка runner Relation Search/List V1
Первая попытка V1 прошла validator 22/22, но targeted ESLint остановил релиз на `react-hooks/set-state-in-effect` в новой странице списка связей. Причина: `useEffect` напрямую вызывал `load()`, которая после fetch выполняла `setRelations`. V1_0_1 оставляет загрузчик чистым (`fetchRelations`) и переносит setState в асинхронный Promise callback эффекта. Commit/push V1 не выполнялись; исходники были откатаны к baseline.

## 2026-09-12 — Ошибка runner Relation Search/List V1_0_1
Вторая попытка V1_0_1 остановилась на `NAVIGATION PATCHER` с `RELATIONS_NAV_LABEL_ANCHOR_NOT_FOUND` до validator/build/commit/push. Причина: patcher использовал LF-only строковые anchors против Windows checkout `global-navigation.tsx` с CRLF. V1_0_2 нормализует EOL только внутри patcher, выполняет преобразование на LF и затем восстанавливает исходный LF/CRLF. Source rollback V1_0_1 был выполнен.

## 2026-09-12 — Ошибка runner Relation Search/List V1_0_2
Третья попытка V1_0_2 прошла navigation patcher, recovery integrity, validator 22/22 и targeted ESLint, но full TypeScript gate остановил релиз на `TS2307`: `/api/admin/relations/route.ts` использовал `../../../../lib/supabase`. Для admin API на этой глубине рабочий canonical import — `../../../../../lib/supabase`, как уже используется в `/api/admin/relation-constructor/route.ts`. V1_0_3 исправляет путь и добавляет статическую validator-проверку импорта. Commit/push V1_0_2 не выполнялись; source rollback был выполнен.

## 2026-09-12 — Навигация и выбор ОН для общего слоя связей
Решение: выбор исходного и связанного ОН в «Конструкторе связей» должен использовать поисковое поле-комбобокс, аналогичное выбору родителя: фокус открывает каталог, ввод текста фильтрует каталог. Тип связи остаётся закрытым системным списком. Общие связи получают отдельную административную страницу `/admin/relations`, расположенную в меню сразу под «Конструктором последствий». Эта страница показывает канонические `system_value_object_relations`; она не вводит контекст типовой активности и не создаёт формулы.
