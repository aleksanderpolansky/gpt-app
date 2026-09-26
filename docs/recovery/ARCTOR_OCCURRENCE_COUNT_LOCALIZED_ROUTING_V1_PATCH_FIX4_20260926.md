# Recovery — ARCTOR_OCCURRENCE_COUNT_LOCALIZED_ROUTING_V1_PATCH_FIX4_20260926

Baseline: `main @ 5843cf6536c6207345910440347ff12e997cfb7b`

## Live acceptance that triggered the patch

Input:

`Спал 7 часов, 3 раза проснулся`

Observed:

- typical activity `Ночной сон` matched;
- `7 ч` correctly planned to the night-sleep duration target;
- the UI showed target titles in English;
- `3 раза проснулся` appeared as `Повторения: 3 повт.` and did not route to
  `Количество пробуждений`.

## Decision

Implement two universal changes:

1. Distinguish generic occurrence count (`N times <action>`) from explicit
   exercise repetitions.
2. Localize Observation Object titles in the routing review using the existing
   global-system localization reader.

A guarded routing fallback is allowed only when a `count` measurement has an
explicit qualifier and the matched profile has exactly one direct
`explicit_qualifier` target for that count parameter.

## Expected acceptance after deployment

For:

`Спал 7 часов, 3 раза проснулся`

the review should show at least:

- `7 ч -> Продолжительность -> Продолжительность ночного сна`;
- `3 -> Количество -> Количество пробуждений`.

Light / Deep / REM remain optional unless explicitly stated.

## Files

Modified:
- `src/lib/activity/activity-basic-intake-analysis.server.ts`
- `src/lib/activity/activity-intake-source-fact-materializer.server.ts`
- `src/app/api/activity/intake-analysis/materialize-source-facts/route.ts`
- `src/components/activity/activity-basic-intake-analysis-card.tsx`

Added:
- `scripts/validate-occurrence-count-localized-routing-v1.mjs`
- `docs/architecture/occurrence-count-localized-routing-v1.md`
- this recovery note

## Safety

- DB_WRITES=0 in installer;
- SQL_EXECUTED=0;
- no migration;
- no commit/push/deploy;
- exact baseline HEAD required;
- clean tracked worktree and staging required;
- rollback restores only the four modified files;
- pre-existing untracked files are preserved.

## FIX1

Первый runner остановился безопасно на
`PATCH_ANCHOR_MISSING:analyzer-repetition-explicit-only`.

Причина была в самом генераторе патча: регулярное выражение в строковом
якоре было переэкранировано. До сбоя четыре предыдущих изменения выполнялись
только в рабочем дереве, после чего runner сделал полный rollback.

FIX1:
- не ищет целиком строку регулярного выражения;
- удаляет только два точных фрагмента `раз(?:а)?|` и `razy|` из старого
  детектора повторений;
- использует `String.raw` для вставляемых регулярных выражений;
- заменяет кириллически ненадёжный конечный `\b` на Unicode-aware lookahead;
- сохраняет прежнюю формулировку `shortest verbatim noun phrase`, чтобы не
  ломать действующий validator qualified bindings;
- локализатор ОН загружается лениво только при наличии locale, чтобы старый
  offline source/snapshot regression не тянул JSON localization catalog.

## FIX2

FIX1 успешно прошёл все изменения анализатора и остановился на
`PATCH_ANCHOR_NOT_UNIQUE:materializer-lazy-localizer-helper`.

Причина: точка вставки
`export async function materializeBasicIntakeSourceFactsE03V1(input: {`
в текущем TypeScript-файле встречается три раза из-за перегрузок функции.

FIX2 не ослабляет проверку уникальности. Вместо поиска неуникального якоря
helper локализации добавляется в рамках уже уникальной замены типа
`ValueObjectRow`.

Первый FIX1 выполнил rollback полностью; baseline остаётся
`5843cf6536c6207345910440347ff12e997cfb7b`.

## FIX3

FIX2 успешно применил весь функциональный патч: анализатор, маршрутизацию,
локализацию, API и UI. Новый validator прошёл 32 проверки и остановился только
на 5 текстовых assertions.

Все пять были ложными отрицаниями validator:
- четыре условия fallback реально присутствовали, но TypeScript форматировал
  выражения на нескольких строках;
- GET route реально передавал `locale`, но порядок полей был
  `activityEventId, locale, preflightOnly: true`, а validator ожидал обратный.

FIX3 меняет только validator:
- проверки fallback используют whitespace-tolerant regex;
- GET locale проверяется в фактическом порядке аргументов.

Функциональный код патча не изменён относительно FIX2.
После FAIL в FIX2 выполнен полный rollback.

## FIX4

FIX3 прошёл все функциональные и регрессионные проверки до запуска ESLint:

- dedicated occurrence/localization validator: `PASS_38_38`;
- routing review UI regression: `PASS_32_32`;
- qualified bindings regression: `PASS_53_53`;
- source/snapshot regression: `PASS_18_18`;
- baseline-aware basic intake: PASS.

Остановка произошла не из-за ESLint-ошибок в коде, а на запуске процесса:
`TARGETED_ESLINT failed with exit code -1`, без stdout/stderr.

Причина — Node runner запускал Windows wrapper `npx.cmd` через
`spawnSync(..., shell:false)`. Для `.cmd` на Windows это ненадёжно и может
завершиться до запуска самого ESLint.

FIX4 меняет только инфраструктуру runner:
- для команд с расширением `.cmd` на Windows используется shell wrapper;
- для `git.exe`, `node.exe` и остальных обычных executable shell остаётся
  выключенным;
- при spawn error теперь логируется `SPAWN_ERROR`.

Функциональный код патча и validators не изменены относительно FIX3.
После FAIL в FIX3 выполнен полный rollback.
