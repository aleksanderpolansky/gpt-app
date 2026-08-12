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