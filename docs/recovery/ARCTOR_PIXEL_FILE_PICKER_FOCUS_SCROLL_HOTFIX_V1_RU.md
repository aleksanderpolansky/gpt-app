# ARCTor — Pixel File Picker Focus Scroll Hotfix V1

Дата: 2026-08-27
Release: `ARCTOR_PIXEL_FILE_PICKER_FOCUS_SCROLL_HOTFIX_V1`
Baseline: `main @ 8c72bb195f17e2393e8c2cf74deec257eb9548b8`

## Диагностический вывод

Pixel lifecycle diagnostic дал прямое evidence до открытия системного picker.

Непосредственно перед file click:

- viewport: 411 x 788;
- shell rect: top=0, height=788;
- main rect: top=60, bottom=788;
- main scrollTop=1827.81.

Через ~6 ms, на `file-input:click`:

- viewport не изменился;
- shell rect не изменился;
- main height не изменился;
- main scrollTop не изменился;
- НО main rect стал `top=-1452`, `bottom=-724`;
- activeElement стал `input[type=file]`.

Следующий `window:blur`, то есть фактический уход в системный picker, произошёл позже.

Следовательно white-screen начинается ДО picker return, image decode и upload.

## Root cause

Текущий UI использовал:

`<label> ... <input type="file" className="sr-only">`

В момент активации Chrome/Android переводит focus на visually-hidden file input и выполняет focus scrolling.

ARCTor shell одновременно содержит positioned ancestor + `overflow-hidden` и вложенный scrollable `<main>`.
`overflow:hidden` всё равно является scroll container для программного/focus scrolling. Поэтому браузер может изменить скрытый scroll offset родителя и физически сдвинуть `<main>` за clipped viewport, сохранив DOM, высоту и содержимое.

Именно это соответствует diagnostic rect delta `60 -> -1452` при неизменных viewport/shell/main scrollTop.

## Hotfix

Убирается label + `sr-only` file input pattern.

Вместо него:

1. обычная видимая ARCTor-кнопка `Photo / Zdjęcie / Фото`;
2. отдельный `<input type=file hidden tabIndex=-1>`;
3. кнопка вызывает `photoInputRef.current.click()` внутри пользовательского click gesture;
4. synthetic file-input click останавливает bubbling;
5. после запуска picker focus возвращается видимой кнопке через `focus({ preventScroll: true })`.

Hidden input не является focus target и не должен запускать Chrome scroll-into-view для скрытого элемента.

## Что НЕ меняется

- browser image optimization;
- 10 MiB source limit;
- WebP;
- max edge 1600 px;
- target 400 KiB;
- hard 512 KiB;
- FormData binary upload;
- server WebP validation;
- Storage/CDN;
- message_object_media;
- enterprise feed;
- global feed;
- localization;
- diagnostic instrumentation.

Diagnostic V1_1 пока остаётся включаемым через `?pickerdiag=1` для подтверждения исправления.

## Production smoke

1. Pixel → enterprise page с `pickerdiag=1`.
2. Reset.
3. Нажать Photo.
4. Ничего не выбирать.
5. Закрыть picker.
6. Страница должна остаться на месте, без white-screen.
7. Copy diag: main top должен остаться около 60.
8. Повторить с реальным фото.
9. Preview → Publish → Enterprise Updates → Global Feed.
10. После PASS отдельным closure release удалить diagnostic instrumentation.
