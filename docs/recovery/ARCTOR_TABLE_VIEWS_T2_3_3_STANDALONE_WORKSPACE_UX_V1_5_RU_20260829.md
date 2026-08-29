# ARCTor — T2_3_3 Standalone Workspace UX Cleanup V1_5

Дата: 2026-08-29
Базовый commit: `355467878906d84030074a2e933892b7ab575465`

## Подтвержденное состояние до этапа
- T2_3_2 standalone table workspace развернут в production.
- Production postcheck пользователя подтвердил: в отдельной вкладке выделение диапазона и Ctrl+C работают; вставка в Google Sheets раскладывает диапазон по строкам/столбцам корректно.
- Значит standalone workspace остается постоянным архитектурным паттерном, а не временным обходом clipboard.

## Решения T2_3_3
- Кнопка открытия workspace удаляется из верхней панели /value-objects.
- Кнопка `Open table workspace ↗` показывается только в режиме Table и находится рядом с Edit table / Undo / Redo.
- Workspace URL получает `returnTo` и сохраняет текущую locale.
- /value-objects/table становится минимальным: без собственной шапки, статистических карточек, role/search/sort панели, sidebar и AI Navigator; остается сама таблица и ее рабочая панель.
- В standalone route скрывается переключатель Tree/Cards/Map/Table: workspace фиксирован как Table.
- Добавляется локализованная кнопка Close table. Она сначала вызывает window.close(); если браузер не разрешил закрытие вкладки, выполняется fallback на безопасный внутренний returnTo.
- returnTo принимается только как внутренний путь, начинающийся с / и не начинающийся с //, чтобы не создавать open redirect.
- Standalone table получает высоту, привязанную к viewport, чтобы использовать почти весь экран.

## Локализация
Open table workspace и Close table имеют варианты en/pl/ru/uk/de/es/cs. Возврат сохраняет locale исходной страницы.

## Reusable pattern
Создан общий компонент `StandaloneWorkspaceCloseButton`. Этот сценарий предназначен для повторного применения в будущих Document / Spreadsheet / Mind Map workspace: обычная страница ARCTor -> Open workspace in new tab -> минимальный fullscreen editor -> Close -> возврат в исходный локализованный контекст.

## Safety / contracts
- Табличные write contracts не меняются: редактирование title/description, read-only gates, Undo/Redo, paste compensation и clipboard остаются существующими.
- Нет SQL/schema migrations, DB/Storage/OpenAI writes из release-runner.
- Release выполняет detached scratch preflight с full TypeScript, changed-files ESLint, Next production build и git diff --check до mutation main, затем повторяет проверки на main до commit.
- При precommit FAIL main возвращается к exact baseline; при push FAIL после commit commit сохраняется и отчет дает resume hint.

## Pre-mutation failure V1 и исправление V1_1
- V1 остановился в detached scratch до изменения main: patcher успешно применил все 6 ожидаемых файлов, а validator прошел 50 из 51 проверок и упал только на check 027 `standalone viewport table height`.
- Причина: validator искал многострочный фрагмент только с LF, тогда как Windows scratch сохранил исходный CRLF. Само изменение высоты `calc(100vh - 138px)` patcher применил корректно.
- Отчет зафиксировал `ROLLBACK=NOT_NEEDED_PREMUTATION`; HEAD/main/origin не изменялись и остались на baseline `355467878906d84030074a2e933892b7ab575465`.
- V1_1 делает проверку высоты whitespace/newline-agnostic через RegExp и добавляет validator self-test для LF и CRLF до создания scratch-worktree.

## Pre-mutation failure V1_1 и исправление V1_2
- V1_1 успешно прошел patcher/validator 53/53, changed-files ESLint, full TypeScript и git diff --check в detached scratch, но остановился на scratch Next build до изменения main.
- Next.js 16.2.11 по умолчанию использует Turbopack; scratch подключал production `node_modules` через Windows junction, и Turbopack fail-closed завершился ошибкой `Symlink [project]/node_modules is invalid, it points out of the filesystem root`.
- Отчет снова зафиксировал `ROLLBACK=NOT_NEEDED_PREMUTATION`; product source в main не менялся.
- V1_2 использует `next build --webpack` только для detached scratch, потому что webpack способен валидировать Next production build при linked/junction node_modules. На main перед commit по-прежнему запускается обычный `next build` (Turbopack) с физическим production node_modules.
- Таким образом до mutation сохраняются validator + ESLint + full TypeScript + git diff + production Next/webpack build, а Turbopack-specific gate выполняется на main до commit с exact rollback при FAIL.

## Pre-mutation failure V1_2 и исправление V1_3
- V1_2 прошел patcher/validator 56/56, changed-files ESLint, full TypeScript и git diff --check в detached scratch.
- Scratch `next build --webpack` успешно скомпилировал код, но затем остановился на уже существующем вне T2_3_3 Next route-type defect в `src/app/api/activity/quick-capture/route.ts`: route экспортирует `ARCTOR_AI_RIGHT_RAIL_BACKGROUND_REVIEW_V1`, тогда как Next route module допускает только контрактные exports.
- Этот файл T2_3_3 не меняет. Отчет снова зафиксировал `ROLLBACK=NOT_NEEDED_PREMUTATION`; main/origin остались на baseline.
- V1_3 не маскирует build failure. Он выполняет build baseline и patched state одинаковым способом и допускает продолжение только при строгом build no-regression: если baseline build PASS, patched build обязан PASS; если baseline уже FAIL, patched build может продолжить только при совпадающем нормализованном diagnostic fingerprint либо при улучшении до PASS.
- Для реального main до mutation выполняется обычный Turbopack build snapshot; после patch до commit выполняется такой же Turbopack build и сравнивается с baseline snapshot. Таким образом новый workspace не может добавить новый Next build defect, даже если репозиторий уже содержит отдельный старый route-type defect.
- Pre-existing quick-capture route export следует исправить отдельным maintenance-этапом, а не смешивать с T2_3_3.

## Pre-mutation failure V1_3 и исправление V1_4
- V1_3 подтвердил, что реальный baseline main проходит обычный Turbopack build со status=0, а detached scratch baseline на webpack имеет отдельный pre-existing route-export build defect.
- После baseline webpack build scratch оставлял сгенерированный каталог `.next/types`. Затем patch успешно применялся и validator проходил 59/59, но следующий `tsc --noEmit` читал эти stale generated route types и падал на старых exports (`ARCTOR_AI_RIGHT_RAIL_BACKGROUND_REVIEW_V1`, billing/test compatibility constants и старые page props).
- Это contamination release-runner, а не дефект T2_3_3: отчет снова зафиксировал `ROLLBACK=NOT_NEEDED_PREMUTATION`; main/origin не менялись.
- V1_4 делает build snapshots hermetic: `.next` удаляется до build и гарантированно удаляется в `finally` после каждого baseline/patched build snapshot, независимо от PASS/FAIL. Поэтому последующий `tsc --noEmit` проверяет source tree, а Next route-generated types проверяются собственно Next build gate.
- На main baseline и patched state по-прежнему сравниваются обычные Turbopack build snapshots; baseline PASS означает, что patched Turbopack build обязан PASS до commit.

## Pre-mutation failure V1_4 и исправление V1_5
- V1_4 прошел package integrity, patcher self-test, validator self-test, baseline lint/build capture и baseline scratch webpack snapshot. Затем runner запустил patcher в detached scratch и получил exit code 0, но `git status` остался пустым; exact dirty-set gate остановил release с `PREMUTATION_SCRATCH_DIRTY_SET_MISMATCH actual=[]`.
- Причина найдена в самом entrypoint patcher: нормальный запуск был разрешен только если `process.argv[1]` оканчивался на устаревшее имя `patch-t2-3-3-standalone-workspace-ux-v1-3.mjs`. Фактический файл V1_4 имел имя `...v1-4.mjs`, поэтому patcher молча ничего не делал и завершался status=0.
- Это defect release-runner/patcher dispatch, а не product source. Main не мутировал: отчет зафиксировал `ROLLBACK=NOT_NEEDED_PREMUTATION`; remote `main` остался на baseline `355467878906d84030074a2e933892b7ab575465`.
- V1_5 полностью удаляет filename-dependent entrypoint guard: любой обычный запуск patcher без `--self-test` всегда выполняет `applyT233(process.cwd())` и печатает `PATCH_APPLIED=PASS`.
- Patcher self-test теперь проверяет два пути: прямое применение transformation и отдельный дочерний запуск patcher без аргументов на синтетическом fixture. Это воспроизводит именно тот normal-entrypoint path, который V1_4 не проверял.
- Runner self-test дополнительно fail-closed проверяет отсутствие `process.argv[1]?.endsWith(...)` и наличие normal entrypoint `applyT233(process.cwd())`.


## Следующая точка
После production postcheck T2_3_3 закрыть T2_3 и перейти к T2_4: создание новых ОН непосредственно из таблицы.
