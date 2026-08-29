# ARCTOR_LOCAL_DOCX_EDITOR_V1_7_MOBILE_FIT_UX — recovery checkpoint

Дата: 29.08.2026
Baseline: `f95e93738f984f43d5788ba73d50b621970f0101` (`local-editors-v1-6-2-csp-shell-image-cleanup`).

## Причина этапа

DOCX V1.5/V1.6.2 прошёл production acceptance по локальному открытию, редактированию, сохранению и privacy boundary. После проверки на смартфоне выявлена отдельная проблема удобства: при стандартном масштабе 100% страница DOCX шире мобильного окна и левая часть документа визуально уходит за границу. Встроенный CasualOffice 1.4.2 рассчитан прежде всего на настольный paginated UX, поэтому ARCTor должен дать безопасный мобильный слой адаптации, не меняя parser/serializer и не патча node_modules.

## Решение V1.7

Изменяется только `src/components/local-editors/local-docx-editor.tsx` плюс этот recovery checkpoint.

На экранах до 720 px:

- после `onReady` ARCTor через штатный `DocxEditorRef.setZoom()` автоматически подбирает консервативный масштаб, рассчитанный от фактической ширины контейнера;
- масштаб ограничен диапазоном 25–75%, чтобы страница помещалась по ширине и одновременно не становилась бессмысленно маленькой;
- при повороте устройства или переходе через мобильный breakpoint выполняется повторная подгонка;
- в верхней панели появляется отдельная компактная кнопка «По ширине» для ручного возврата к полному виду страницы после пользовательского изменения масштаба;
- кнопка сохранения на телефоне получает доступную ширину и обрезает слишком длинную подпись без разрыва макета;
- контейнер редактора получает `min-w-0/max-w-full/overflow-hidden`, чтобы сам ARCTor не создавал внешний горизонтальный вылет;
- мобильная высота использует `dvh`, чтобы редактор лучше учитывал адресную строку и встроенные браузерные оболочки;
- показывается краткая мобильная подсказка о подгонке и возможности увеличить документ встроенным контролем масштаба.

Desktop поведение не меняется: автоматическая подгонка работает только при `max-width: 720px`, а штатный масштаб/toolbar остаются в распоряжении CasualOffice.

## Почему используется штатный setZoom

В установленном `@casualoffice/docs@1.4.2` публичный `DocxEditorRef` содержит `setZoom(zoom: number)` и `getZoom()`. Поэтому V1.7 не трогает внутренние DOM-классы CasualOffice, не применяет CSS transform к странице и не зависит от приватной структуры редактора.

## Ограничение

Это адаптация ARCTor вокруг существующего движка, а не обещание полноценного touch-first Word-клона. Встроенные сложные меню CasualOffice могут оставаться менее удобными на телефоне, чем на desktop. Основная цель V1.7 — гарантировать полный вид страницы по ширине, доступное сохранение и предсказуемое поведение при повороте устройства.

## Privacy contract

Документ по-прежнему проходит только путь:

`локальный диск -> File/Blob в памяти браузера -> DOCX editor -> Blob -> локальный диск`.

SQL: 0
Миграции БД: 0
Серверное хранение документа: 0
Document upload endpoint: 0
OpenAI/document-content calls: 0

`next.config.ts`, CSP и V1.6.2 shell-image boundary не ослабляются.

## Release safety

Runner обязан до изменения main проверить exact baseline/origin/clean state, baseline build, baseline ESLint counts, detached scratch worktree, patcher/validator self-tests, LF/CRLF, exact dirty set, staged `git diff --cached --check`, changed-files ESLint, full TypeScript, production build и whole-repo ESLint no-regression. Только после полного pre-mutation PASS допускаются те же проверки на main, exact stage, commit, push и remote verify.

До commit любой FAIL возвращает tracked files к baseline. После созданного commit при push failure commit сохраняется и REPORT должен дать resume hint.

## Production acceptance

После деплоя проверить на смартфоне:

1. открыть DOCX в `/local-editors`;
2. первая страница целиком видна по ширине, левая граница не обрезана;
3. поворот portrait/landscape повторно подгоняет страницу;
4. встроенный zoom можно увеличить вручную, а мобильная кнопка «По ширине» возвращает полный вид;
5. редактирование и `Save DOCX locally` работают;
6. desktop внешний вид и масштаб не изменились;
7. Console не получает новых privacy/CSP ошибок.

После PASS V1.7 перейти к локальному XLSX editor.
