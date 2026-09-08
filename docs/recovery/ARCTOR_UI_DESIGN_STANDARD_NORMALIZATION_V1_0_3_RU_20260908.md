# ARCTOR_UI_DESIGN_STANDARD_NORMALIZATION_V1_0_3

Дата: 2026-09-08
Статус: corrected code release + recovery checkpoint

## Исправления управляющего скрипта

1. Runner V1 остановился до изменения исходников на dry-run patch gate: локальный src/app/value-objects/page.tsx использовал CRLF, а точный шаблон patcher был задан с LF. Baseline/blob gates прошли, rollback подтвердил clean worktree; commits/push отсутствовали.
2. Runner V1.0.1 исправил EOL-нормализацию и успешно прошёл dry-run реального baseline, TypeScript pre и baseline ESLint. Затем после локальной записи пяти ожидаемых source paths allowlist был проверен только через git diff --name-only. Эта команда не показывает новые untracked paths, поэтому были видны только три изменённых tracked файла, а новые src/components/ui/arctor-segmented-switch.tsx и docs/ui/ARCTOR_UI_DESIGN_STANDARD_V1_RU_20260907.md не попали в список. Runner остановился и rollback снова подтвердил clean worktree; commits/push отсутствовали.
3. Runner V1.0.2 исправил allowlist и дошёл до post-mutation lint. TypeScript после изменения прошёл, но gate требовал абсолютный touched ESLint 0/0 и получил 2 errors / 3 warnings. Анализ exact baseline показал, что это существующий lint debt certificates-dashboard.tsx: два react-hooks/set-state-in-effect и три @next/next/no-img-element. Изменение UI не добавляло эти проблемы. Runner корректно остановился, rollback подтвердил clean worktree; commits/push отсутствовали.
4. V1.0.3 вводит per-file lint contract: для существующих изменяемых файлов сначала проверяется точный baseline по counts и rule histogram, после patch он обязан остаться точно тем же; новый ArctorSegmentedSwitch обязан иметь 0 errors / 0 warnings. Полный project ESLint по-прежнему не может регрессировать.

## Цель

Устранить визуальное расхождение между каталогом объектов наблюдения и dashboard сертификатов без изменения данных, API, БД, RLS или бизнес-логики.

## Решения

1. High-Fidelity Dashboard Design принят как визуальная основа ARCTor; базовые токены зафиксированы в docs/ui/ARCTOR_UI_DESIGN_STANDARD_V1_RU_20260907.md.
2. Scope switch больше не копируется между страницами: введён общий ArctorSegmentedSwitch.
3. Сертификаты и ОН используют один и тот же shared segmented-switch implementation.
4. Workspace каталога ОН использует #f0f2f7, p-5 и доступную ширину без локального max-w-[1440px].
5. Обычные dashboard surfaces каталога ОН используют rounded-xl и стандартную card border.
6. Структурные фильтры ОН приведены к filter-chip pattern сертификатов.
7. «Добавить суперпредложение» имеет одинаковую positive-action семантику на обеих страницах.

## Границы

- SQL: нет.
- Supabase writes: нет.
- OpenAI calls: нет.
- API/read model: без изменений.
- RLS/privacy: без изменений.
- Scope logic mine/system/all: без изменений.

## Evidence

Runner обязан пройти exact baseline/blob gates, EOL-safe dry-run transformation на копиях реальных production-файлов, self-test worktree allowlist с tracked+untracked файлами, TypeScript до/после, exact per-file Git-baseline lint для существующих touched-файлов, 0/0 lint для нового shared-компонента, полный ESLint без регрессии, git diff --check, production build, code/recovery commits, push, remote verification и clean worktree.

## Live acceptance

После deployment сравнить /value-objects и /certificates на одном desktop viewport: scope switch, page padding, card radii, filter chips и «Добавить суперпредложение» должны визуально соответствовать одному стандарту.

## Фактический code commit

Code commit: `8d3e5f178afcecd76f951219d115a6af2758ae53`.
