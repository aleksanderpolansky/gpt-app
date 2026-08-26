# ARCTOR_MEDIA_EGRESS_CONTAINMENT_V1 — Recovery checkpoint

Дата: 25.08.2026
Baseline: `main @ 8a99f1e829b8c0cdf60d111bfdc85c656d18776d`

## Причина

Диагностика Vercel/Supabase показала, что legacy `data:image/...;base64,...` значения многократно попадали в JSON/RSC payload. Наибольший ущерб давали `/api/actor-context` и `/api/sync-user`; дополнительно inline media использовались в коммерческих представлениях.

## Изменение V1A

- Actor context по-прежнему возвращает `imageUrl`, но для legacy data URL это короткий versioned media endpoint; Base64 больше не входит в actor-context JSON.
- GET actor-context дедуплицируется между sidebar и profile switcher на один document lifecycle.
- `/api/sync-user` возвращает только реально используемые client fields; `actor_public_profiles.image_url` больше не входит в response.
- Добавлены owner-only media endpoints для profile / organization / value-object legacy images.
- Directory public logo endpoint получает versioned URLs и cache policy вместо `no-store`.
- Directory detail API больше не возвращает raw `logo_url` / `cover_image_url`.
- `/offers/new` и `/value-objects/[id]` не сериализуют legacy Base64 image в page payload; вместо него используют media endpoint.
- Binary media responses конвертируют decoded `Uint8Array` в отдельный `ArrayBuffer` перед `NextResponse`, чтобы соответствовать Next.js 16 / TypeScript `BodyInit` контракту.
- БД и содержимое Base64 пока не мигрируются: это отдельный V1B.

## Не изменяется

- SQL/schema/RLS.
- Сами пользовательские изображения.
- Публичность/приватность профилей. Owner media endpoints требуют текущую Auth0 session и ownership.
- Storage migration не выполняется.

## Acceptance

1. `node scripts/validate-media-egress-containment-v1.mjs` PASS.
2. Full-repo ESLint baseline/post delta: новых errors/warnings относительно baseline нет. Исторический lint backlog не маскируется и сохраняется отдельными JSON artifacts.
3. `npm run build` PASS.
4. `git diff --check` PASS.
5. После production rollout повторить Vercel Fast Data Transfer probe.

## Следующий шаг

V1B: deduplicated migration 9 unique Base64 payloads to privacy-appropriate Storage + postcheck `data:image` references = 0.

## V1B1 — new-write Storage + client optimization

Статус после применения launcher: кодовый слой готовит переход новых пользовательских изображений с inline Base64 на Storage без миграции исторических строк.

Изменения V1B1:

- лимит 10 MiB относится только к файлу, выбранному локально в браузере; исходник не сохраняется и не отправляется в ARCTor. До сети уходит только browser-optimized WebP: profile/avatar максимум 1024 px и целевой payload около 220 KiB;
- profile image после server validation сохраняется в private bucket \`arctor-private-media\`; в \`actor_public_profiles.image_url\` сохраняется короткий token, а не Base64;
- endpoint \`/api/profiles/[id]/image\` читает private Storage: публичный профиль доступен посетителю, скрытый профиль — только владельцу; legacy data URL остаётся читаемым;
- directory People, public profile и gift-certificate provider image преобразуют private token в versioned media delivery URL;
- enterprise logo при новом inline upload записывается в public bucket \`arctor-public-media\`, content-addressed по SHA-256; в БД сохраняется URL Storage;
- Value Object image ограничен новым client target \`MAX_DATA_URL_LENGTH = 600000\` (~450 KiB payload), затем server сохраняет его в public Storage и заменяет metadata image на URL;
- одинаковые payload внутри одного namespace используют один SHA-256 object path; повторная запись идемпотентна;
- server hard limits: profile 256 KiB, enterprise/value-object 512 KiB; Storage bucket new-write ceiling также 512 KiB. Оригиналы ARCTor не архивирует;
- SQL/schema/RLS не меняются;
- существующие Base64 rows не мигрируются в V1B1 и остаются задачей V1B2.

Acceptance V1B1:

1. \`node scripts/validate-media-storage-optimization-v1b1.mjs\` = PASS.
2. ESLint full-repo baseline/delta: total errors/warnings и touched-file errors/warnings не увеличиваются.
3. \`npm run build\` = PASS.
4. \`git diff --check\` и staged \`git diff --cached --check\` = PASS.
5. Commit/push разрешены только после всех gates.
6. После production deployment повторить Vercel Fast Data Transfer probe и затем выполнять V1B2 migration исторических 9 unique payloads.

## V1B2 — legacy Base64 migration

Дата выполнения: 26.08.2026

Production migration закрыла исторический inline-media backlog после V1B1.

- baseline перед миграцией: 10 Base64 references, 8 unique payloads, 7502913 referenced bytes;
- migrated references: 10; optimized Storage assets: 8; newly uploaded objects in this run: 8;
- legacy изображения читались в память локального migration process, оптимизировались через Sharp и записывались как WebP; raw Base64/original bytes не архивировались в ARCTor и не попадали в REPORT/PACKAGE;
- personal/avatar media migrated в private bucket `arctor-private-media` и заменены short private token;
- organization / Value Object / gift-certificate media migrated в public bucket `arctor-public-media` как content-addressed objects;
- одинаковые legacy payloads для Value Object и gift-certificate snapshot используют общий immutable content-addressed object;
- DB writes выполнялись optimistic-CAS по `id + updated_at`; при apply failure launcher migration выполняет best-effort rollback уже изменённых строк;
- postcheck после migration: `data:image` references в контролируемых profile / organization / Value Object / gift-certificate полях = 0.

Следующий шаг: V1B3 — удалить legacy Base64 fallback-код и перевести private profile media delivery с binary Vercel proxy на authorization + direct/signed Storage delivery, чтобы убрать оставшийся media egress через Vercel.

## V1B3 — signed private media delivery

Дата: 26.08.2026

После V1B2 исторические `data:image` references в контролируемых media-полях равны нулю. V1B3 удаляет только legacy delivery fallbacks и не меняет new-write optimization contract.

- `/api/profiles/[id]/image` сохраняет проверку публичности/ownership, но больше не скачивает private Storage object через Vercel и не возвращает image bytes;
- после authorization private token преобразуется в Supabase signed URL с коротким TTL, а endpoint возвращает только HTTP redirect; binary media идёт браузеру непосредственно из Supabase Storage/CDN;
- signed redirect имеет `private, no-store, max-age=0`, поэтому истёкший signed URL не должен закрепляться в browser/CDN cache;
- owner organization logo, Value Object public-image и directory logo delivery больше не содержат Base64 decode fallback; после V1B2 они принимают только Storage/public HTTP(S) URL;
- `lib/media-egress.ts` больше не содержит runtime Base64 decoder / binary response helper;
- `lib/media-storage.ts` по-прежнему декодирует только новый уже browser-optimized upload payload перед записью в Storage. Это ingestion transport, а не legacy persisted-media fallback;
- SQL/schema/RLS и содержимое БД V1B3 не изменяет;
- production acceptance после deploy: `/api/profiles/[id]/image` должен отдавать небольшой redirect вместо ~200–300 KiB image body, а Vercel Fast Data Transfer на этом route должен снизиться до уровня response headers/redirect.

Acceptance V1B3:

1. read-only signed URL infrastructure preflight = PASS;
2. `node scripts/validate-media-egress-containment-v1.mjs` = PASS;
3. `node scripts/validate-media-storage-optimization-v1b1.mjs` = PASS;
4. `node scripts/validate-media-storage-delivery-v1b3.mjs` = PASS;
5. full-repo ESLint baseline/delta без новых errors/warnings;
6. `npm run build` = PASS;
7. `git diff --check` и staged `git diff --cached --check` = PASS;
8. commit/push разрешены только после всех gates.

Следующий шаг после production Vercel probe: закрыть MEDIA EGRESS V1 как завершённый слой и вернуться к основной архитектурной дорожной карте ARCTor.
