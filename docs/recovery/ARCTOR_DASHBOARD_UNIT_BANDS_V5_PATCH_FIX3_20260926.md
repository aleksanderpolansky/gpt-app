# Recovery — ARCTOR_DASHBOARD_UNIT_BANDS_V5_PATCH_FIX3_20260926

Дата: 2026-09-26
Baseline: `main @ dcc0df837774ab8cdd2bf5457ac338162c3b77bc`

## Причина

Live smoke после occurrence-count patch подтвердил, что:

- `8 hour` записан как факт `Продолжительность ночного сна`;
- `2 count` записан как факт `Количество пробуждений`;
- multi-series график показывал только count-точку.

Корневая причина в analytics-data: выбранный параметр имеет canonical unit
`minute`, а факт содержит `hour`; V4 отвергал его как unit mismatch.

Дополнительно V4 назначал каждой серии отдельную скрытую Y-шкалу, из-за чего
разные значения могли занимать одинаковую относительную высоту и пользователь
не видел реальную шкалу.

## Решение V5

1. Универсальная совместимая конверсия единиц (`hour -> minute`, и другие
   линейные семейства).
2. Multi-series нормализует ряды до preferred unit семейства.
3. Серии группируются в горизонтальные Y-зоны по совместимым единицам.
4. Ось X одна — только внизу.
5. Вертикальные сетки и hover синхронизированы по индексу даты.
6. Между зонами тонкий разделитель.
7. В каждой зоне видимая Y-шкала.
8. В локализатор ОН передаётся metadata_json.

## Ожидаемый smoke

Для `Спал 8 часов, 2 раза проснулся`:

- верхняя duration-зона: `480` минут на 26.09;
- нижняя count-зона: `2` на 26.09;
- X-дата отображается один раз снизу;
- обе точки стоят строго на одной вертикали даты;
- легенда/названия ОН при locale=ru — русские.

## Safety

- DB_WRITES=0
- SQL_EXECUTED=0
- COMMIT=false
- PUSH=false
- DEPLOY=false
- exact baseline + branch gate
- clean tracked staging/worktree gate
- backup before mutation
- rollback on failure
- exact changed/new allowlist
- existing untracked files preserved

## FIX1

Первый V5 package не дошёл до проверки репозитория: Node.js остановился на
синтаксическом разборе `apply-patch.mjs` с:

`SyntaxError: missing ) after argument list`

Причина: replacement-блок TSX был заключён во внешний JavaScript template
literal, а внутри него оставались три неэкранированных template literals:
- формирование `bandTitle`;
- `syncId`;
- `dataKey`.

Поэтому Node считал внутренний backtick концом внешней строки.

FIX1 не меняет функциональную спецификацию V5. В generated TSX:
- `bandTitle` собирается через массив + `.join(", ")`;
- `syncId` строится конкатенацией строк;
- `dataKey` строится конкатенацией строк.

Дополнительно package теперь статически проверен через `node --check
apply-patch.mjs` до выдачи пользователю.

Так как исходный runner упал при парсинге до выполнения `try`, рабочее дерево
репозитория им не изменялось. PowerShell успел только создать backup.

## FIX2

FIX1 прошёл preflight на `main @ dcc0df837774ab8cdd2bf5457ac338162c3b77bc`,
успешно выполнил `data-unit-normalization-import`, затем остановился на:

`PATCH_ANCHOR_NOT_UNIQUE:data-runtime-localization-metadata`

Причина подтверждена по baseline: одинаковый вызов
`localizeGlobalSystemValueObject(...)` есть ровно в двух read-paths:
1. числовой ряд фактов;
2. ряд наличия факта.

Для V5 `metadata_json` нужно передать в оба read-paths, поэтому FIX2 не
пытается искусственно выбирать один из них. Вместо `replaceOnce` используется
`replaceExpectedCount(..., 2, ...)`: патч продолжится только если найдено ровно
два ожидаемых совпадения. Любое другое количество считается drift и приводит
к rollback.

### Recovery policy

Для каждого запуска сохраняются оба вида recovery-следа:

- статический checkpoint:
  `docs/recovery/ARCTOR_DASHBOARD_UNIT_BANDS_V5_PATCH_FIX3_20260926.md`;
- runtime REPORT:
  `docs/recovery/ARCTOR_DASHBOARD_UNIT_BANDS_V5_PATCH_FIX3_20260926_<timestamp>_REPORT.txt`.

Пути к обоим теперь также записываются в сам REPORT.

FIX1 после ошибки выполнил `ROLLBACK=START` -> `ROLLBACK=COMPLETE`, поэтому
baseline остаётся неизменным.

## FIX3

FIX2 применил весь V5 функциональный патч и новый dedicated validator прошёл
`PASS_36_36`.

Остановка произошла на историческом V4 validator:

`Error: FAIL builder renders legend`

Это ожидаемая несовместимость старой текстовой проверки с новой
визуализацией. V4 validator требовал literal `<Legend` от Recharts, а V5
намеренно заменяет его на общий custom legend над всеми unit-bands.

В том же V4 validator есть ещё одна заведомо устаревшая проверка:
`builder uses independent hidden Y axes`. V5 намеренно удаляет отдельные
скрытые Y-оси и заменяет их видимыми шкалами по группам совместимых единиц.

FIX3 не ослабляет функциональные проверки. Вместо исторического validator
добавлен additive compatibility validator:
`scripts/validate-dashboard-multi-series-v4-compat-v5.mjs`.

Он повторно проверяет V4-контракт, API, создание/сохранение multi-series,
presence-семантику, лимит 2..6, обратную совместимость V3/rollup и все
остальные V4 инварианты, а две намеренно заменённые UI-проверки проверяет уже
по V5-правилам:
- общий custom legend;
- unit bands;
- отсутствие hidden per-series Y axes;
- одна нижняя X-ось;
- синхронизация полос по общей временной шкале.

### Recovery

Как и раньше, сохраняются:
- статический checkpoint в `docs/recovery`;
- runtime `_REPORT.txt` каждого запуска в `docs/recovery`.

FIX2 после FAIL выполнил полный rollback.
