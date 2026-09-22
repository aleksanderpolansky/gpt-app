# ARCTor — Confirmation Gate + Source-Fact Preflight V1.2

Дата: 22.09.2026
Пакет: `ARCTOR_CONFIRMATION_GATE_PREFLIGHT_PATCH_V1_2_20260922`
Исходный baseline intake: `main @ 2d4a1aa9ca3dab79205f1d777294bb6890e49392`

## 1. Причина изменения

На `/activity-ai-lab` действие «Подтвердить и записать исходные факты» было связано с клиентским условием `measurements.length > 0`.

Это корректно работало для активности с явно извлечёнными значениями, например подъём по лестнице с количеством этажей и длительностью, но скрывало действие для корректного сценария `direct_or_snapshot`, когда явного значения в тексте нет, а исходный факт должен быть рассчитан из подтверждённого факта-среза.

Контрольный пример: «Выпил одну порцию протеиновой добавки»; `mass` отсутствует в тексте; профиль системной типовой активности использует `direct_or_snapshot`; текущий подтверждённый срез порции = `35 gram`; ожидаемое значение исходного факта = `35 gram × 1`.

## 2. Зафиксированное решение

1. Кнопка подтверждения после завершённого базового анализа больше не скрывается из-за отсутствия явно извлечённых `measurements`.
2. Готовность кнопки определяется серверным read-only preflight, который выполняет тот же путь подготовки writer rows, что и реальная материализация.
3. Preflight не вызывает RPC записи фактов и не обновляет `raw_activity_signals`.
4. Если запись невозможна, кнопка остаётся видимой, но неактивной; непосредственно под ней выводится короткая локализованная причина.
5. Реальный POST commit сохраняет все прежние server-side guards и повторно проверяет состояние на момент записи.

## 3. Изменённые файлы

- `src/components/activity/activity-basic-intake-analysis-card.tsx`
- `src/app/api/activity/intake-analysis/materialize-source-facts/route.ts`
- `src/lib/activity/activity-intake-source-fact-materializer.server.ts`
- `scripts/validate-confirmation-gate-preflight-v1.cjs`
- `docs/recovery/ARCTOR_CONFIRMATION_GATE_PREFLIGHT_V1_2_20260922.md`

## 4. Новый read-only preflight

`GET /api/activity/intake-analysis/materialize-source-facts?activityEventId=<uuid>`

При готовности возвращает `eligible=true` и `factsPlanned`.

При ожидаемом блокере возвращает `eligible=false` + `reasonCode`; UI показывает локализованное короткое объяснение.

Инфраструктурные ошибки остаются HTTP 500 и не маскируются как обычный blocker.

## 5. Инварианты source resolution

Без изменений:

- `direct`: используется только явное значение;
- `direct_or_snapshot`: явное значение имеет приоритет; при отсутствии используется snapshot;
- `snapshot_only`: явное значение игнорируется, используется snapshot;
- explicit `0` остаётся настоящим значением;
- snapshot выбирается для пользователя/актора, `confirmed`, на момент активности;
- multiplier применяется детерминированно;
- POST materialization остаётся idempotent.

## 6. Локальная проверка пакета

Offline behavioral validator расширен preflight-сценариями и на этапе подготовки пакета дал:

`VALIDATOR=PASS_23_23`

Дополнительно исходники трёх изменённых TypeScript/TSX-файлов прошли синтаксическую TypeScript-transpile проверку без diagnostics.

После установки обязательно выполняются в реальном репозитории:

- targeted validator;
- targeted ESLint;
- `tsc --noEmit`;
- `git diff --check`;
- production build.

## 7. Browser acceptance после deploy

1. Создать новую завершённую активность: `Выпил одну порцию протеиновой добавки.`
2. Убедиться, что типовая активность найдена, явный `mass` отсутствует, кнопка видима и после preflight активна.
3. Нажать подтверждение; ожидать исходный факт `mass = 35 gram` из snapshot × 1.
4. Создать новую активность: `Употребил 20 г протеиновой добавки.`
5. Ожидать `mass = 20 gram`, snapshot не должен замещать explicit.
6. Проверить `/activity-facts` после перезагрузки.
7. Проверить blocker: для `direct` без явного значения кнопка должна оставаться видимой, быть неактивной и объяснять причину.

## 8. Release state

Установщик этого пакета не выполняет commit, push или deploy. После PASS локальных проверок требуется отдельный release gate.

## 9. Installer V1.2 — Windows native stderr fix

Предыдущая локальная попытка V1.1 прошла validator, ESLint, TypeScript, `git diff --check` и production build, но после build установщик ошибочно завершился на диагностическом `git diff --stat`: предупреждение Git об LF/CRLF было преобразовано PowerShell в `NativeCommandError` при глобальном `ErrorActionPreference=Stop`. Source-файлы были откатаны.

V1.2 исправляет только orchestration установщика:

- итоговый `git diff --stat` выполняется как read-only команда с `core.autocrlf=false` только для этого вызова;
- вокруг финальных native-диагностик временно используется `ErrorActionPreference=Continue`;
- результат определяется по `$LASTEXITCODE`, а не по наличию текста в STDERR;
- status PASS/FAIL обязательно дописывается в этот recovery-файл;
- commit / push / deploy по-прежнему не выполняются.

## Ð›Ð¾ÐºÐ°Ð»ÑŒÐ½Ñ‹Ð¹ Ð·Ð°Ð¿ÑƒÑÐº ÑƒÑÑ‚Ð°Ð½Ð¾Ð²Ñ‰Ð¸ÐºÐ° â€” 20260922_171758

- release: ARCTOR_CONFIRMATION_GATE_PREFLIGHT_PATCH_V1_2_20260922
- status: PASS
- baseline HEAD: 2d4a1aa9ca3dab79205f1d777294bb6890e49392
- branch: main
- report: C:\Users\Admin\Downloads\ARCTOR_CONFIRMATION_GATE_PREFLIGHT_PATCH_V1_2_20260922_20260922_171758_REPORT.txt
- backup: C:\Users\Admin\Documents\projects\gpt-app\docs\recovery\ARCTOR_CONFIRMATION_GATE_PREFLIGHT_PATCH_V1_2_20260922_20260922_171758_BACKUP.zip
- commit: ÐÐ• Ð²Ñ‹Ð¿Ð¾Ð»Ð½ÑÐ»ÑÑ
- push: ÐÐ• Ð²Ñ‹Ð¿Ð¾Ð»Ð½ÑÐ»ÑÑ
- deploy: ÐÐ• Ð²Ñ‹Ð¿Ð¾Ð»Ð½ÑÐ»ÑÑ
- error:
