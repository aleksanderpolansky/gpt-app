# ARCTor — Activity Message Time Patch V1.1

Дата: 22.09.2026

## Причина

Production browser acceptance для активности:

`Выпил одну порцию протеиновой добавки`

показал:

- `startedAt = null`
- `endedAt = null`
- `durationMinutes = null`
- source-fact preflight: `SOURCE_SNAPSHOT_ACTIVITY_TIME_REQUIRED`

При этом AI-Навигатор уже сохраняет `reportedAt` в durable raw activity signal.

## Установленная первопричина

Production write-path:

`AI Navigator -> POST /api/activity/quick-capture -> buildAiLabQuickCaptureTiming -> POST /api/activity/events`

Для фактической активности без явного времени и без длительности
`buildAiLabQuickCaptureTiming()` оставлял `startedAt` и `endedAt` равными `null`.

Из-за этого snapshot resolver не имел временной координаты активности.

## Design Lock

Время создания исходного/результирующего факта и время выполнения формулы
не являются временем активности.

Для фактической завершённой активности:

1. Явное время/интервал пользователя имеет приоритет.
2. Если времени нет, но есть длительность:
   - `ended_at = message reportedAt`
   - `started_at = ended_at - duration`.
3. Если нет ни времени, ни длительности:
   - `started_at = message reportedAt`
   - `ended_at = message reportedAt`
   - `duration_minutes = null`.
4. Если пользователь указал только дату без точного времени,
   точный момент не выдумывается автоматически.
5. Source/result/derived facts наследуют temporal context activity_event.
6. `SOURCE_SNAPSHOT_ACTIVITY_TIME_REQUIRED` остаётся строгим guard и не ослабляется.

## Scope патча

- `src/lib/activity/aiLabQuickCapture.ts`
- `src/app/api/activity/quick-capture/route.ts`
- `scripts/validate-activity-message-time-patch-v1.cjs`
- этот recovery checkpoint

## Дополнительное исправление воспроизводимости

`/api/activity/quick-capture` теперь использует один server receipt timestamp
для durable receipt и direct save. При retry переиспользуется `reportedAt`
из уже существующего durable signal, а не текущее время повтора.

## Ожидаемая browser acceptance

Новая фактическая активность без explicit времени:

`Выпил одну порцию протеиновой добавки`

должна получить `started_at = ended_at = reportedAt` сообщения.

После базового анализа source-fact preflight должен использовать это время
для выбора последнего подтверждённого snapshot.

Для текущего теста ожидаемый результат после подтверждения:

`Масса = 35 г`.

Старая activity с уже сохранёнными NULL started_at/ended_at автоматически
не переписывается этим source patch; для приёмки требуется новая activity.

## Release status

До запуска INSTALL.ps1:
- commit: false
- push: false
- deploy: false

INSTALL.ps1 допишет фактический результат локальной проверки.

## Installer V1.1 correction

V1 source patch passed the custom validator (14/14), targeted ESLint and TypeScript,
but the V1 installer stopped before `git diff --check` because PowerShell parsed
`-Arguments @(...) + $AllPatchFiles` as an extra positional argument.

V1.1 changes only installer orchestration: the Git argument array is built first
and then passed to `Invoke-NativeLogged`. Production source payload is unchanged.

## Installer run 2026-09-22 18:55:06 +02:00

- status: PASS
- baseline: 66a5643cd4dbe1a20f1d35623bb0a071e184f49e
- report: C:\Users\Admin\Downloads\ARCTOR_ACTIVITY_MESSAGE_TIME_PATCH_V1_1_20260922_20260922_185339_REPORT.txt
- commit: false
- push: false
- deploy: false

## Validation evidence

- custom validator: PASS
- targeted ESLint: PASS
- TypeScript: PASS
- git diff --check: PASS
- production build: PASS

## Browser acceptance still required

Create a NEW completed actual activity after deploy:

Ð’Ñ‹Ð¿Ð¸Ð» Ð¾Ð´Ð½Ñƒ Ð¿Ð¾Ñ€Ñ†Ð¸ÑŽ Ð¿Ñ€Ð¾Ñ‚ÐµÐ¸Ð½Ð¾Ð²Ð¾Ð¹ Ð´Ð¾Ð±Ð°Ð²ÐºÐ¸

Expected:
- activity_event.started_at = message reportedAt
- activity_event.ended_at = message reportedAt
- duration_minutes = null
- source-fact preflight becomes eligible if snapshot 35 g is available
- after confirmation Mass = 35 g

Then test:
Ð£Ð¿Ð¾Ñ‚Ñ€ÐµÐ±Ð¸Ð» 20 Ð³ Ð¿Ñ€Ð¾Ñ‚ÐµÐ¸Ð½Ð¾Ð²Ð¾Ð¹ Ð´Ð¾Ð±Ð°Ð²ÐºÐ¸
Expected Mass = 20 g because explicit value wins.
