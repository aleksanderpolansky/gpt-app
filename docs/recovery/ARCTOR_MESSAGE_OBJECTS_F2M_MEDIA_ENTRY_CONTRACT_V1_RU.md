# ARCTor — Message Objects F2M — Image Media Entry Contract V1

Дата: 2026-08-27
Entry baseline: `main @ fb754c261260e553e0c0434cba6348817a630cc4`

## Цель V1

Добавить **одну фотографию** к native enterprise publication так, чтобы она одновременно отображалась:

- в `Новости и публикации / Aktualności / Updates` предприятия;
- в Global ARCTor Feed.

Video, document и link preview в этот релиз не входят.

## 1. Не ломать закрытый MEDIA EGRESS слой

Недавняя проблема с многократной передачей больших изображений считается архитектурным уроком, а не локальным bugfix.

F2M запрещено:

- сохранять `data:image/...;base64,...` в `message_objects`;
- сохранять Base64 в `message_object_media`;
- возвращать Base64 через JSON/RSC;
- отправлять оригинальный 3–10 MiB файл на backend;
- архивировать оригинальный файл в ARCTor;
- проксировать public image binary через Vercel;
- создавать случайные дубликаты одного и того же оптимизированного payload при повторной загрузке.

## 2. Resize/compression contract

Локальный input ceiling:

`10 MiB`

Это лимит только файла, выбранного пользователем на устройстве. Исходник остаётся в браузере.

До сети уходит только:

`image/webp`

V1 target:

- max edge: **1600 px**;
- preferred payload: **<= 400 KiB**;
- server hard ceiling: **512 KiB**.

Алгоритм browser optimization:

1. decode locally;
2. respect image orientation through browser decode/canvas path;
3. resize preserving aspect ratio;
4. never enlarge;
5. try descending dimensions/quality;
6. stop when payload <= target;
7. if hard limit cannot be reached — block publish with localized error;
8. original file/data URL is never used as fallback network payload.

Почему 1600 px:

- Global Feed content column сейчас около 860 px;
- 1600 px даёт качественный high-density render без хранения многомегабайтного original;
- это соответствует уже принятому generic public-media профилю: качество сохраняется, но egress ограничен.

## 3. Storage contract

Bucket:

`arctor-public-media`

Message image object:

`message-objects/image/<sha256>.webp`

Принципы:

- SHA-256 считается по уже оптимизированным WebP bytes;
- content-addressed path;
- повторный одинаковый payload идемпотентен;
- immutable cache для content-addressed asset;
- в `message_object_media` сохраняются metadata/reference, а не image body.

V1 media row:

- `message_object_id`;
- `media_kind_code = image`;
- `media_origin_code = native`;
- `storage_bucket = arctor-public-media`;
- `storage_path`;
- `mime_type = image/webp`;
- `byte_size`;
- `sha256_hex`;
- `width_px`;
- `height_px`;
- `sort_order = 0`;
- `metadata_json` object.

## 4. Delivery contract

Public browser должен получать image bytes **не через Vercel application response**.

Разрешённый путь:

ARCTor metadata/API
→ короткий/versioned media URL или small 307 redirect
→ Supabase Storage/CDN
→ browser.

Это сохраняет V1B3-принцип: application server проверяет contract/authorization где нужно, но не становится транспортом image binary.

Для public message image private signed URL не нужен.

## 5. Atomic publication behavior

V1 publication flow:

browser optimized WebP
→ server verifies owner + organization
→ canonical draft `message_object`
→ content-addressed Storage upload
→ `message_object_media` row
→ ARCTor distribution
→ activate message.

При failure после draft creation:

- canonical draft удаляется;
- child DB rows cascade;
- newly-created Storage object удаляется best-effort **только если этот run действительно создал его**;
- deduplicated pre-existing content-addressed asset нельзя удалять.

Нельзя публиковать active message со ссылкой на media row, если Storage persistence не подтверждена.

## 6. UI style — ARCTor, не messenger clone

Composer сохраняет существующий ARCTor стиль:

- `rounded-xl`;
- border `#e2e6f3 / #dfe3f1`;
- background `#f8f9fd`;
- accent `#3b6ef8`;
- compact typography 11–13 px;
- небольшая кнопка `Фото / Photo` с icon, а не крупная messenger attachment bubble;
- selected image preview внутри composer;
- remove button компактный, secondary/destructive;
- publish button остаётся текущего размера/стиля.

Media preview:

- `rounded-xl`;
- border `#e7eaf4`;
- background `#f8f9fd`;
- preserve aspect ratio;
- no forced square crop;
- no oversized hero treatment;
- no visually dominant controls.

Enterprise Updates card:

- image располагается внутри publication card;
- ширина `100%`;
- aspect ratio сохраняется;
- max visual height ориентировочно 300 px;
- `object-contain`/natural aspect behavior предпочтительнее агрессивного crop.

Global Feed:

- image располагается после text body;
- ширина `100%`;
- max visual height ориентировочно 420 px;
- `object-contain`;
- та же border/radius/background система, что у feed card.

Mobile:

- media занимает доступную ширину карточки;
- без горизонтального overflow;
- без отдельного full-width chat style.

## 7. V1 scope guard

F2M V1:

- максимум 1 image на publication;
- text-only publication остаётся полностью рабочей;
- image-only publication пока не требуется: text остаётся обязательным как в F2;
- alt-text manual editor пока не обязателен; DB поле не удаляется и остаётся для следующего accessibility step;
- no video;
- no gallery;
- no external social upload;
- no image AI analysis;
- no new SQL schema.

## 8. Обязательный preflight перед implementation

До source implementation launcher должен доказать:

- `lib/media-storage.ts` сохраняет `arctor-public-media`;
- current server media ceiling = 512 KiB;
- current content-addressed/upsert contract существует;
- originals-not-persisted guard существует;
- V1B1 optimization validator = PASS;
- V1B3 delivery validator = PASS;
- egress containment validator = PASS;
- `message_object_media` имеет требуемые F1 columns;
- `arctor-public-media` bucket существует и public;
- никаких DB/Storage writes в preflight.

## 9. Следующий source release

После этого entry checkpoint следующий релиз должен быть:

`ARCTOR_MESSAGE_OBJECTS_F2M_NATIVE_PUBLICATION_IMAGE_V1`

Он должен менять только существующий message/media/UI контур и не создавать новую media schema.
