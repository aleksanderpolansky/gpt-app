# ARCTor — F2M Production Closure Cleanup V1

Дата: 2026-08-27
Release: `ARCTOR_MESSAGE_OBJECTS_F2M_PRODUCTION_CLOSURE_CLEANUP_V1`
Baseline: `main @ 1710384870ebefc8db7331151abd9845045dcdd2`

## Итог F2M

F2M — native enterprise publication with one image — подтверждён в production на desktop и Google Pixel / Android Chrome.

Рабочий end-to-end путь:

1. владелец предприятия создаёт native `message_object`;
2. текст и одна фотография публикуются в Enterprise Updates;
3. та же canonical публикация появляется в Global Feed;
4. изображение хранится через существующий `arctor-public-media`;
5. доставка изображения идёт прямым public Storage/CDN URL, без Vercel image binary proxy;
6. browser-side image pipeline оставляет исходник локально, выдаёт WebP, max edge 1600 px, target 400 KiB, hard limit 512 KiB.

## Pixel white-screen — установленная причина

Lifecycle diagnostic доказал, что white-screen начинался ДО возврата из системного picker и ДО image decode/upload.

До исправления:

- перед file click: `main.top=60`, `main.bottom=788`;
- на `file-input:click`: `main.top=-1452`, `main.bottom=-724`;
- `main.scrollTop` при этом не изменялся;
- `activeElement` становился `input[type=file]`.

Это локализовало проблему в focus-scroll Chrome/Android на конструкции:

`<label> + <input type=file className="sr-only">`.

## Постоянное исправление

Оставляется:

- видимая ARCTor-кнопка Photo/Zdjęcie/Фото;
- отдельный `input[type=file]` с `hidden` и `tabIndex=-1`;
- picker открывается через `photoInputRef.current.click()` внутри user gesture;
- focus возвращается видимой кнопке через `focus({ preventScroll: true })`.

Production diagnostic после исправления подтвердил:

- на `file-input:click` `main.top=60`, `main.bottom=788`;
- `activeElement=button`;
- после cancel и `window:focus` геометрия остаётся стабильной;
- реальная фотография успешно выбрана, обработана, опубликована и видна и в Enterprise Updates, и в `/feed`.

## Что cleanup удаляет

1. `PixelFilePickerLifecycleDiagnostic`;
2. `Copy diag / Reset`;
3. `pickerdiag` sessionStorage/query instrumentation;
4. временные `data-arctor-app-shell` / `data-arctor-main`;
5. viewport-recovery workaround с `visualViewport`, `pageshow`, `visibilitychange` и CSS `--arctor-app-viewport-height`.

Viewport workaround удаляется, потому что diagnostic evidence показал: viewport и shell dimensions оставались стабильными, а сдвиг `<main>` происходил синхронно с focus на скрытый file input.

## Что cleanup НЕ меняет

- focus-scroll fix;
- mobile large-image decode protection;
- `createImageBitmap` pre-resize;
- WebP/1600/400KiB/512KiB contracts;
- FormData binary upload;
- server-side WebP/dimension/SHA validation;
- Storage/CDN delivery;
- message_objects / message_object_media schema;
- localization;
- Enterprise Updates / Global Feed behavior.

## Evidence / lesson

При browser-specific mobile regressions нельзя автоматически связывать белый экран с последней тяжёлой операцией. В этом случае file content вообще не был выбран. Lifecycle + DOM geometry evidence локализовал ошибку в focus-scroll за миллисекунды до открытия picker.

## Точка продолжения

После PASS этого cleanup F2M считать закрытым. Следующая работа по публикациям должна строиться поверх сохранённой основы `message_objects + distributions + media`: следующий scope выбирать уже отдельно (external social connectors/import, cross-posting или дальнейшее развитие feed), без возврата к диагностическому коду F2M.
