# ARCTor.app — CUX1 Calendar Timing Correctness

## Scope

CUX1 исправляет только semantic/timing correctness и видимость schedule mode controls.

## Contract

### Unknown means unknown

Если пользователь не указал дату, время или длительность:

- поле остаётся пустым;
- semantic preview показывает missing;
- система не подставляет завтра;
- система не подставляет 08:00;
- система не подставляет 30 минут.

### Exact interval

Фразы вида:

- `с 18:00 до 18:45`;
- `from 18:00 to 18:45`;
- `od 18:00 do 18:45`;
- `von 18:00 bis 18:45`;

означают `scheduleModeCode=exact`.

`до` между двумя временами не является deadline.

### Deadline

Deadline выбирается только при явном смысле due-by:

- крайний срок;
- дедлайн;
- не позднее;
- сделать до даты;
- due by;
- deadline;
- spätestens;
- fecha límite;
- nejpozději.

### Year resolution

Если год не указан:

- future использует ближайшее будущее вхождение даты;
- past использует ближайшее прошлое вхождение даты;
- явный год всегда имеет приоритет.

### Start/end/duration

- start + end → duration вычисляется автоматически;
- start + duration → end вычисляется автоматически;
- противоречащие end и duration блокируют сохранение;
- overnight interval переносит end на следующий день.

### Model response

Semantic API возвращает `timingDraft` в канонической структуре PP1.

Deterministic extraction явных значений имеет приоритет над model suggestion.

### UI

Schedule mode представлен пятью radio-cards:

- Без даты;
- Только дата;
- Диапазон дат;
- Крайний срок;
- Точное время.

CUX1 не переносит composer внутрь календаря. Это CUX2.

## Acceptance fixtures

Локальный contract check содержит 12 сценариев на RU/EN/PL/DE/ES/CS, включая:

- unscheduled без defaults;
- exact interval;
- exact start + duration;
- deadline;
- relative date;
- date range;
- year rollover;
- overnight interval.
