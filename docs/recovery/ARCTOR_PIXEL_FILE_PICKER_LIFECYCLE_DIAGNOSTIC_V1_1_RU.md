# ARCTor — Pixel File Picker Lifecycle Diagnostic V1_1

Дата: 2026-08-27
Release: `ARCTOR_PIXEL_FILE_PICKER_LIFECYCLE_DIAGNOSTIC_V1_1`
Baseline: `main @ 46100896a798fcd92dd1dff5fc9ce39e6636d591`

## Что произошло в V1

V1 корректно остановился на changed-files ESLint до commit/push.

Ошибка:

`react-hooks/set-state-in-effect`

в `pixel-file-picker-lifecycle-diagnostic.tsx`.

Причина — синхронный `setEnabled(true)` внутри `useEffect`.

Launcher выполнил fail-closed rollback, поэтому baseline остался неизменным.

## Исправление V1_1

Диагностический control больше не использует React state для включения.

Теперь:

- control рендерится с HTML `hidden`;
- `useEffect` проверяет `?pickerdiag=1` или sessionStorage;
- при включении effect синхронизирует внешний DOM:
  `controlRef.current?.removeAttribute("hidden")`;
- статус `Copy diag` меняется через `copyButtonRef`, без setState;
- `useState`, `setEnabled`, `setCopyState` отсутствуют.

Это сохраняет весь диагностический contract V1 и устраняет конкретную lint-регрессию.

## Contract

- query-gated `?pickerdiag=1`;
- sessionStorage-only;
- no fetch;
- no reload;
- no router.refresh;
- no DB/Storage writes;
- no textarea content;
- no file names;
- file click/cancel/change;
- visibility/pageshow/pagehide/focus/blur/popstate;
- visualViewport;
- shell/main geometry;
- runtime errors/unhandled rejection;
- `Copy diag` + `Reset`.

## Production test

1. Pixel → enterprise page с `pickerdiag=1`.
2. `Reset`.
3. `Фото`.
4. Ничего не выбирать.
5. Закрыть picker.
6. Если white-screen — `Copy diag` сразу, если control виден.
7. Иначе Back/Reload → `Copy diag`.
8. Прислать полный JSON.
