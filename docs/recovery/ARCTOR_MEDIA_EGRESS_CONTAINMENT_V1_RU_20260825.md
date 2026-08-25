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
