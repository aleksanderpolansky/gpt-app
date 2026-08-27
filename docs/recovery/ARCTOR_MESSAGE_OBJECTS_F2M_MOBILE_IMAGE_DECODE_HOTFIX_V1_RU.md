# ARCTor — F2M Mobile Image Decode Hotfix V1

Дата: 2026-08-27
Release: `ARCTOR_MESSAGE_OBJECTS_F2M_MOBILE_IMAGE_DECODE_HOTFIX_V1`
Baseline: `main @ 06180c9ec0e38aa119c17130bbcf22c940a94885`

## Production finding

F2M image V1 на desktop прошёл production smoke:

- публикация с фото создана;
- фото отображается в Enterprise Updates;
- фото отображается в Global Feed;
- исходное фото было около 7 MiB.

На Android/Chrome после выбора фотографии страница становилась пустой до публикации.

Так как failure происходил сразу после local file selection, до FormData/API/Storage, проблема локализована в client image decode/optimization path, а не в message_object, Storage или public delivery.

## Root cause model

V1 использовал:

`new Image() -> naturalWidth/naturalHeight -> canvas`

То есть мобильный browser сначала декодировал полное исходное изображение в память, даже если затем canvas уменьшал его до 1600 px.

Для современных телефонных камер JPEG 5–10 MiB может содержать 40–60+ megapixel. Полный RGBA decode может потребовать сотни MiB и вызвать renderer memory pressure / blank page на мобильном устройстве.

## Hotfix

Новый browser pipeline:

1. source bytes <= 10 MiB читаются локально;
2. dimensions извлекаются без full raster decode:
   - JPEG SOF;
   - PNG IHDR;
   - WebP VP8X / VP8 / VP8L;
3. target dimensions вычисляются заранее с max edge 1600 px;
4. preferred decode:
   `createImageBitmap(file, resizeWidth/resizeHeight, resizeQuality=high)`;
5. browser получает возможность downsample image во время decode, до создания большого DOM bitmap;
6. canvas никогда не создаётся больше рассчитанного 1600 px target;
7. ImageBitmap освобождается через `.close()` в `finally`;
8. перед тяжёлой операцией один `requestAnimationFrame` позволяет UI показать `Оптимизация фото...`.

## Safe fallback

Если `createImageBitmap` недоступен или не сработал:

- старый HTMLImageElement fallback допускается только до 16 megapixel;
- для большего файла hotfix возвращает контролируемую ошибку `PUBLICATION_IMAGE_DECODE_FAILED`;
- это предпочтительнее mobile renderer crash/blank page.

## Что не меняется

- source limit 10 MiB;
- WebP output;
- max edge 1600 px;
- target <= 400 KiB;
- hard <= 512 KiB;
- FormData binary upload;
- server WebP validation;
- SHA-256;
- content-addressed Storage;
- message_object_media;
- direct Storage/CDN delivery;
- ARCTor visual style;
- DB schema.

## Production smoke

1. Android Chrome: открыть owner enterprise page;
2. выбрать ту же крупную фотографию или фото камеры 5–10 MiB;
3. страница не должна исчезать;
4. должна быть видна `Оптимизация фото...`;
5. затем появляется preview;
6. опубликовать;
7. Enterprise Updates показывает фото;
8. Global Feed показывает фото;
9. F5 сохраняет нормальное отображение;
10. desktop сценарий остаётся рабочим.
