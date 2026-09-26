# ARCTor Dashboard Axis + Parameter Localization V1

Дата: 2026-09-26

## Причина

После публикации Dashboard Unit Bands V5 и UI Polish V1 live-проверка на
`locale=pl` показала:

- ОН уже локализованы корректно:
  - `Czas trwania snu nocnego`
  - `Liczba przebudzeń`
- единицы также локализованы:
  - `min`
  - `szt.`
- но названия параметров внутри легенды и Y-зон оставались русскими:
  - `Продолжительность`
  - `Количество`

На странице каталога параметров те же параметры уже отображаются правильно:
`Czas trwania`, `Liczba`, `Dauer`, `Anzahl` и т.д.

## Корневая причина

Dashboard analytics-data возвращал `definitionRow.title` напрямую. Это
каноническое/сохранённое название не проходило через общий слой представления
параметров.

Каталог параметров уже использует:

`getActivityParameterPresentation(parameterCode, locale, ...)`.

## Решение

Dashboard теперь использует тот же общий источник локализации, что и каталог:

`getActivityParameterPresentation`.

Поддерживаемые locale общего словаря:

- en
- pl
- ru
- uk
- de
- es
- cs

Для неизвестного пользовательского parameterCode сохранённое название остаётся
fallback.

Это автоматически локализует:

- подпись серии в легенде;
- название Y-зоны;
- tooltip/name, где используется `parameterTitle`;
- single-series fact analytics, поскольку они используют тот же API resolver.

## Пропущенная отметка 480

Для продолжительности 480 минут scale V5 формирует ticks:

`0, 120, 240, 360, 480, 600`

Но Recharts мог автоматически скрыть один из переданных ticks из-за своей
политики interval/minTickGap. Поэтому на live-графике было видно:
`0, 120, 240, 360, 600`.

Для небольших наборов до 8 явных ticks задаётся `interval=0`, поэтому все
рассчитанные отметки отображаются. Для больших наборов сохраняется
`preserveStartEnd`, чтобы не создавать визуальную кашу.

## Не меняется

- модель данных;
- config_json;
- факты;
- unit conversion;
- unit bands;
- общая X-ось;
- DB schema.
