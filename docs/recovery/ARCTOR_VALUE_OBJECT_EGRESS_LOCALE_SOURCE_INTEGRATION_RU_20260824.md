# ARCTOR — оптимизация egress и локализации ЦО/ОН

## Release

`ARCTOR_VALUE_OBJECT_EGRESS_LOCALE_SOURCE_INTEGRATION_V1`

Дата подготовки: 2026-08-24.

## Точка восстановления

Baseline исходного кода:

`7d56b66ba989eccaabc07ba86ed1616919629d08`

DB foundation:

`ARCTOR_VALUE_OBJECT_EGRESS_LOCALE_DB_FOUNDATION_V1`

Production postcheck перед source release:

- total: 25
- passed: 25
- failed: 0
- allPass: true


## Предыдущая попытка V1

Первая попытка source integration 2026-08-24 в 17:38 завершилась до `tsc`, ESLint, build, commit и push.

Фактический результат:

- package SHA: PASS;
- baseline local/remote: PASS;
- baseline blob guards: PASS;
- patcher self-test: PASS;
- patcher dry-run: PASS;
- source marker verification: PASS;
- release validator: 27/30;
- ложные FAIL валидатора: 12, 16, 25;
- commit: НЕ создавался;
- push: НЕ выполнялся;
- автоматический precommit rollback: PASS;
- итоговый HEAD: `7d56b66ba989eccaabc07ba86ed1616919629d08`;
- Git после rollback: CLEAN.

Причина V2: проверки 12 и 16 зависели от LF и давали ложный FAIL на CRLF-файлах Windows; проверка 25 ошибочно запрещала наличие helper/совместимого минимального `metadata_json` в файле целиком, хотя actor catalog RPC уже возвращает узкий набор без полного localization envelope. В V2 исправляется только валидатор и evidence; source patch остаётся тем же.


## Предыдущая попытка V2

Вторая попытка source integration 2026-08-24 в 17:45 прошла release validator 30/30 и дошла до настоящего `tsc --noEmit`.

TypeScript обнаружил три точные ошибки source patch:

- `src/app/api/value-objects/route.ts`: TS7006 — callback `row` имел неявный `any`;
- `src/app/value-objects/[id]/page.tsx`: TS2451 — `criteria` был объявлен дважды (две позиции, одна логическая причина).

До ESLint, build, commit и push релиз не дошёл.

Launcher выполнил автоматический rollback:

- HEAD после rollback: `7d56b66ba989eccaabc07ba86ed1616919629d08`;
- Git: CLEAN;
- commit: не создавался;
- push: не выполнялся.

V3 исправляет именно эти две source-причины и добавляет отдельные validator/verify-applied guards против их повторения.


## Предыдущая попытка V3

Третья попытка source integration 2026-08-24 в 17:58 прошла:

- release validator: 32/32 PASS;
- `tsc --noEmit`: PASS;
- `git diff --check`: PASS.

Затем строгий ESLint (`--max-warnings=0`) остановил релиз на трёх предупреждениях:

- `readLocalizedContentEnvelope` — больше не используется;
- `localizeActorOwnedObservationObject` — больше не используется;
- `initialNodeRoleCode` использован внутри `useEffect`, но отсутствовал в dependency array.

До build, commit и push релиз не дошёл.

Автоматический rollback:

- HEAD: `7d56b66ba989eccaabc07ba86ed1616919629d08`;
- Git: CLEAN;
- commit не создавался;
- push не выполнялся.

V4 удаляет два устаревших элемента локализации и добавляет `initialNodeRoleCode` в зависимости эффекта. Validator и `--verify-applied` получили отдельные guards для всех трёх предупреждений.


## Предыдущая попытка V4

Четвёртая попытка source integration 2026-08-24 в 18:06 прошла все проверки, относящиеся к этому релизу:

- release validator: 34/34 PASS;
- `git diff --check`: PASS;
- `tsc --noEmit`: PASS;
- ESLint изменённых файлов с `--max-warnings=0`: PASS;
- VO Mind Map regression: 97/97 PASS;
- Branch-driven leaf regression: 32/32 PASS.

Релиз остановил сторонний старый валидатор
`scripts/validate-ai-a3-1-review-first-semantic-fact-pipeline-v1.mjs`.

Он завершился с 6 FAIL из 125, причём все шесть относятся к
`src/app/activity-ai-lab/page.tsx` и старому review-first UI-контракту.
Этот файл не входит в allowlist данного релиза и не изменяется patcher'ом.

Следовательно, это не регрессия V4, а уже существующее несоответствие отдельного
AI A3 валидатора текущему baseline. До build, commit и push релиз не дошёл.

Автоматический rollback снова подтвердил:
- HEAD: `7d56b66ba989eccaabc07ba86ed1616919629d08`;
- Git: CLEAN;
- commit не создавался;
- push не выполнялся.

V5 сохраняет этот AI A3 валидатор как диагностический запуск, но больше не
использует его как блокирующий gate для независимого релиза локализации ЦО/ОН.
Два относящихся к ЦО/ОН regression-валидатора остаются блокирующими.


## Что исправляет этап

- каталог actor-owned ЦО/ОН больше не получает полный `metadata_json` со всеми языковыми вариантами;
- для обычного чтения возвращается только текущий язык;
- автоматический localization backfill при открытии каталога удалён;
- новый пользовательский ЦО сохраняет человеческий текущий язык без автоматического AI-перевода сразу на семь языков;
- actor-owned дерево читает локализованные названия узлов без передачи `metadata_json` каждого узла;
- независимые чтения владельца, локации, дерева и критериев запускаются параллельно;
- root/intermediate не запрашивают `/standards`, поэтому ожидаемый 409 исчезает;
- выбранные тяжёлые ссылки не запускают автоматический Next.js prefetch;
- редактор явно передаёт текущую locale;
- API редактирования использует `edit_value_object_localized_definition_v1`;
- существующий P2C versioned editor остаётся канонической записью определения.

## Что сознательно не делается

- нет backfill существующих бизнес-данных;
- нет удаления старых локализаций;
- нет переноса GLOBAL System локализаций из статического каталога;
- нет автоматического перевода при обычном чтении;
- нет изменения дерева, фактов или активностей;
- нет миграции всех переводов в отдельную таблицу на этом этапе.

## После установки проверить

1. Каталог ЦО/ОН: нет POST `/api/value-objects/localization/backfill`.
2. Root/intermediate: нет GET `/standards`, нет 409.
3. Повторить Resource Timing и сравнить длительности.
4. На English изменить title/description и проверить новое значение после возврата.
5. Наблюдать Supabase egress несколько дней при обычном использовании.

## Evidence

- launcher timestamp: 2026-08-24T18:19:49+02:00
- baseline local/remote: $Baseline
- DB foundation production postcheck: 25/25, allPass=true
- package SHA256: $packageSha
- exact baseline blob guards: PASS
- patcher self-test: PASS
- patcher dry-run: PASS
- source marker verification: PASS
- release validator: PASS
- changed-path allowlist: PASS
- git diff --check: PASS
- npx tsc --noEmit: PASS
- ESLint changed paths with --max-warnings=0: PASS
- optional regression validators: executed when present
- npm run build: PASS
- warning-token hits before commit: $script:WarningHitCount
- final commit SHA and remote verification: see REPORT in Downloads.
