import fs from "node:fs";

const checks = [
  [
    "lib/media-storage.ts",
    [
      'PUBLIC_MEDIA_BUCKET_ID = "arctor-public-media"',
      'PRIVATE_MEDIA_BUCKET_ID = "arctor-private-media"',
      'PRIVATE_MEDIA_TOKEN_PREFIX = "arctor-private-media:"',
      "createHash",
      "upsert: true",
      "readPrivateMediaObject",
      "MAX_BUCKET_FILE_BYTES = 512 * 1024",
      "Raw user originals are never persisted",
    ],
  ],
  [
    "src/app/profiles/[id]/edit/PersonalProfileEditor.tsx",
    [
      "PROFILE_MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024",
      "PROFILE_MAX_DATA_URL_LENGTH = 300_000",
      'canvas.toDataURL("image/webp", quality)',
      "profileImageSrc",
      "original file never leaves the device",
    ],
  ],
  [
    "src/app/api/profiles/route.ts",
    [
      "persistMediaImageValue",
      'visibility: "private"',
      "maxBytes: 256 * 1024",
    ],
  ],
  [
    "src/app/api/profiles/[id]/route.ts",
    [
      "persistMediaImageValue",
      "imageWasSubmitted",
      "maxBytes: 256 * 1024",
    ],
  ],
  [
    "src/app/api/profiles/[id]/image/route.ts",
    [
      "readPrivateMediaObject",
      "row.is_public",
      "getCurrentAppUserId",
    ],
  ],
  [
    "src/app/people/page.tsx",
    ["toMediaDeliveryUrl", "/api/profiles/"],
  ],
  [
    "src/app/people/[slug]/page.tsx",
    ["toMediaDeliveryUrl", "profileImageUrl"],
  ],
  [
    "src/app/certificates/gift-certificate-data.ts",
    ["toMediaDeliveryUrl", "providerPublicProfile.updated_at"],
  ],
  [
    "src/app/organizations/[id]/edit/OrganizationPublicProfileEditClient.tsx",
    [
      "MAX_ORGANIZATION_LOGO_DATA_URL_CHARS = 400_000",
      'canvas.toDataURL("image/webp", quality)',
      "ORGANIZATION_IMAGE_TOO_LARGE_AFTER_OPTIMIZATION",
      "original data URL is never used as a fallback upload",
    ],
  ],
  [
    "src/app/api/organizations/[id]/public-profile/route.ts",
    [
      "persistMediaImageValue",
      'visibility: "public"',
      "maxBytes: 512 * 1024",
    ],
  ],
  [
    "src/components/workspace/value-objects/value-object-profile-top-grid.tsx",
    [
      "MAX_DATA_URL_LENGTH = 600_000",
      "imageUrl === savedImageUrl ? undefined",
      "readValueObjectPublicImageUrl",
    ],
  ],
  [
    "src/app/api/value-objects/[id]/route.ts",
    [
      "persistDraftPublicProfileImage",
      'visibility: "public"',
      "maxBytes: 512 * 1024",
    ],
  ],
  [
    "docs/recovery/ARCTOR_MEDIA_EGRESS_CONTAINMENT_V1_RU_20260825.md",
    ["V1B1 — new-write Storage + client optimization"],
  ],
];

let failures = 0;

for (const [file, needles] of checks) {
  const text = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`FAIL ${file}: missing ${needle}`);
      failures += 1;
    }
  }
}

const profileCreate = fs.readFileSync(
  "src/app/api/profiles/route.ts",
  "utf8",
);
if (/p_image_url:\s*body\.imageUrl/.test(profileCreate)) {
  console.error("FAIL profile create still writes raw request imageUrl");
  failures += 1;
}

const organizationRoute = fs.readFileSync(
  "src/app/api/organizations/[id]/public-profile/route.ts",
  "utf8",
);
if (/logo_url:\s*parseNullableText\(body\.logoUrl\)/.test(organizationRoute)) {
  console.error("FAIL organization route still writes raw inline logo");
  failures += 1;
}

const organizationEditor = fs.readFileSync(
  "src/app/organizations/[id]/edit/OrganizationPublicProfileEditClient.tsx",
  "utf8",
);
if (
  organizationEditor.includes(
    "if (value.length <= MAX_ORGANIZATION_LOGO_DATA_URL_CHARS)",
  ) ||
  /catch\s*\{\s*return value;\s*\}/s.test(organizationEditor)
) {
  console.error("FAIL organization editor can submit an unoptimized original data URL");
  failures += 1;
}

if (failures > 0) {
  console.error(`ARCTOR_MEDIA_STORAGE_OPTIMIZATION_V1B1=FAIL checks=${failures}`);
  process.exit(1);
}

console.log("ARCTOR_MEDIA_STORAGE_OPTIMIZATION_V1B1=PASS");
