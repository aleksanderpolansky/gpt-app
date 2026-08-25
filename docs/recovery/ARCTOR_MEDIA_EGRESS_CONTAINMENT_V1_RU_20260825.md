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
