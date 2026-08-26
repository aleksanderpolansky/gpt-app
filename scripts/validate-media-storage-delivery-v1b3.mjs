import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  }
}

const mediaStorage = read("lib/media-storage.ts");
assert(
  mediaStorage.includes(".createSignedUrl(objectPath, expiresInSeconds)"),
  "private media must use Supabase createSignedUrl",
);
assert(
  mediaStorage.includes("PRIVATE_MEDIA_SIGNED_URL_TTL_INVALID"),
  "signed URL TTL guard missing",
);
assert(
  !mediaStorage.includes("readPrivateMediaObject"),
  "legacy private binary reader must be removed",
);
assert(
  !mediaStorage.includes(".download(objectPath)"),
  "Vercel must not download private profile bytes",
);

const mediaEgress = read("lib/media-egress.ts");
for (const forbidden of [
  "DecodedImageDataUrl",
  "DATA_URL_RE",
  "isInlineImageDataUrl",
  "decodeInlineImageDataUrl",
  "toResponseBody",
]) {
  assert(
    !mediaEgress.includes(forbidden),
    `lib/media-egress.ts still contains legacy delivery helper ${forbidden}`,
  );
}
assert(
  mediaEgress.includes("getSignedMediaRedirectCacheControl"),
  "signed redirect cache helper missing",
);
assert(
  mediaEgress.includes('"private, no-store, max-age=0"'),
  "signed redirect must not be cached past signed URL TTL",
);

const profile = read("src/app/api/profiles/[id]/image/route.ts");
for (const required of [
  "createPrivateMediaSignedUrl",
  "isPrivateMediaToken",
  "NextResponse.redirect(signedUrl, 307)",
  "X-ARCTor-Media-Delivery",
  "supabase-signed-redirect",
]) {
  assert(profile.includes(required), `profile route missing ${required}`);
}
for (const forbidden of [
  "readPrivateMediaObject",
  "decodeInlineImageDataUrl",
  "toResponseBody",
  "Content-Length",
  "data:image",
]) {
  assert(
    !profile.includes(forbidden),
    `profile route still contains binary/Base64 delivery path ${forbidden}`,
  );
}

for (const route of [
  "src/app/api/organizations/[id]/logo/route.ts",
  "src/app/api/value-objects/[id]/public-image/route.ts",
  "src/app/api/directory/organizations/[slug]/logo/route.ts",
]) {
  const text = read(route);
  for (const forbidden of [
    "decodeInlineImageDataUrl",
    "toResponseBody",
    "DATA_URL_RE",
    "Buffer.from(",
    "data:image",
    "Content-Length",
  ]) {
    assert(
      !text.includes(forbidden),
      `${route} still contains legacy binary/Base64 delivery path ${forbidden}`,
    );
  }
}

const recovery = read(
  "docs/recovery/ARCTOR_MEDIA_EGRESS_CONTAINMENT_V1_RU_20260825.md",
);
assert(
  recovery.includes("## V1B3 — signed private media delivery"),
  "recovery V1B3 section missing",
);

if (process.exitCode) {
  console.error("ARCTOR_MEDIA_DELIVERY_OFFLOAD_V1B3=FAIL");
  process.exit(1);
}

console.log("ARCTOR_MEDIA_DELIVERY_OFFLOAD_V1B3=PASS");
