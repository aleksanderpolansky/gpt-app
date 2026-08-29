# ARCTOR_LOCAL_EDITOR_PLATFORM_V1 — recovery checkpoint

Дата: 2026-08-29
Baseline: `188b42792cbf3f357260e5c0d7cf5805de455bbc` (`table-views-t2-5-2-shared-structural-history-rollback-v1`).

## Закрытая предыдущая линия

T2_4 и T2_5 закрыты как PASS. Табличный режим объектов наблюдения поддерживает диапазоны/clipboard, создание, safe-delete, controlled reparent Preview → Apply и domain-managed structural history/rollback. Журнал активностей и факты уже имеют достаточные для текущего scope карточное/табличное представление и текущий функционал редактирования, поэтому отдельная новая табличная ветка для них не создаётся.

## Scope локальных редакторов

Зафиксированы только три редактора:

1. Documents — локальный DOCX.
2. Spreadsheets — локальный XLSX workbook.
3. Mind Maps — локальные мозговые карты.

Отдельные `ARCTor Table Editor` и `ARCTor Safe Viewer` исключены из scope.

## Privacy contract

Содержимое пользовательского файла может находиться только:

- в оперативной памяти браузера, пока файл открыт;
- в локальной файловой системе пользователя при открытии/сохранении.

По умолчанию запрещены server upload, server storage, IndexedDB/OPFS/localStorage/sessionStorage для содержимого, cloud autosave, content analytics и AI-вызовы с содержимым документа.

`/local-editors/:path*` получает отдельный CSP с `connect-src 'none'`. Это блокирует `fetch`, XHR, WebSocket, sendBeacon и другие connect-src каналы из рабочего пространства после загрузки приложения. Разрешены локальные `blob:` URL для сохранения и будущих Web Worker.

## LOCAL_EDITOR_PLATFORM_V1

Добавлен общий browser-only runtime без новых npm-зависимостей:

- `src/lib/local-editors/local-editor-policy.ts` — типы, допустимые расширения, лимиты и privacy contract;
- `src/lib/local-editors/local-file-runtime.ts` — локальное открытие через `<input type=file>`, локальное сохранение через File System Access API при наличии и Blob download fallback;
- `src/components/local-editors/local-editor-platform.tsx` — workspace для Documents / Spreadsheets / Mind Maps;
- `src/app/local-editors/page.tsx` — отдельный route;
- `next.config.ts` — route-scoped CSP/security headers.

На этом этапе движки DOCX/XLSX/Mind Map ещё не подключаются: release проверяет саму общую границу данных и локальный Open → RAM → Save copy → filesystem pipeline. Это сознательно отделяет privacy/runtime contract от конкретного editor engine.

## Безопасность и отсутствие backend document path

Клиентские файлы local editor не должны содержать `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, Supabase, `/api/`, `localStorage`, `sessionStorage`, `indexedDB` или OPFS persistence. Серверные API для файлов не создаются.

Release не выполняет DB/storage/OpenAI writes, SQL или schema migrations.

## Следующие этапы

1. Подключить browser-only DOCX engine за общий local-file runtime.
2. Подключить browser-only XLSX workbook engine за тот же runtime, с тяжёлым parsing/export в Web Worker.
3. Подключить отдельный local Mind Map editor на React Flow.

Конкретные движки должны быть заменяемыми адаптерами и не иметь права обходить `LOCAL_EDITOR_PRIVACY_CONTRACT`.
