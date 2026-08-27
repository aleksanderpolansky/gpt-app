# ARCTor — Message Objects F2M — Native Publication Image V1

Дата: 2026-08-27
Release: `ARCTOR_MESSAGE_OBJECTS_F2M_NATIVE_PUBLICATION_IMAGE_V1`
Baseline: `main @ a03ef814597a4d33d69103bec4a9a7116c8dc2eb`

## Реализовано

Одна фотография на native enterprise publication с отображением в Enterprise Updates и Global Feed.

## Media egress contract

- source <= 10 MiB и остаётся локально;
- browser canvas -> WebP Blob;
- max edge 1600 px;
- target <= 400 KiB;
- hard <= 512 KiB;
- `canvas.toBlob`, без client Base64/data URL;
- binary FormData до API;
- server повторно проверяет RIFF/WEBP, VP8X/VP8/VP8L dimensions и hard limits;
- server-side SHA-256;
- existing `persistMediaImageValue`;
- public bucket `arctor-public-media`;
- path `message-objects/image/<sha256>.webp`;
- `message_object_media` хранит reference/metadata, а не binary.

Server создаёт bounded Base64 data URL только временно в Node memory для уже существующего `persistMediaImageValue`; он не приходит от browser, не хранится в DB и не возвращается в JSON/RSC.

## Atomic behavior

draft message -> content-addressed Storage -> media row -> distribution -> activate -> succeeded.

Перед upload проверяется существование content-addressed object. При последующем FAIL message удаляется, DB media cascade удаляется, а Storage object best-effort удаляется только если этот run создал его. Deduplicated pre-existing object не удаляется.

## Public delivery

`messageMedia.server.ts` превращает server-side Storage reference в public Supabase Storage/CDN URL. UI использует обычный `<img>`, не `next/image`; binary не проходит через Vercel image optimizer/application response.

## ARCTor style

- `#3b6ef8` primary;
- `#f8f9fd` composer/media background;
- borders `#e2e6f3`, `#dfe3f1`, `#e7eaf4`;
- compact 10–13 px typography;
- small secondary `Фото / Photo` control;
- no messenger attachment bubble;
- local preview max-height 220 px;
- Enterprise image max-height 300 px;
- Global Feed image max-height 420 px;
- `object-contain`, no forced square crop.

## V1 scope

- max 1 image;
- text required;
- no gallery/video/document;
- no image-only post;
- no alt-text editor yet;
- no social media distribution;
- no image AI analysis;
- no SQL schema changes.

## Production smoke

1. выбрать 3–10 MiB JPEG/PNG;
2. дождаться локального preview;
3. опубликовать текст + фото;
4. фото видно в Enterprise Updates;
5. то же фото видно сверху в `/feed`;
6. Guest видит фото;
7. PL/EN translation pending не скрывает media;
8. DevTools Network: image bytes идут к Supabase Storage/CDN, а не ARCTor/Vercel binary route;
9. F5 не вызывает повторную upload/optimization;
10. text-only post продолжает работать.
