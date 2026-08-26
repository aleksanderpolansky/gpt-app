import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const actor = read("lib/actor-context.ts");
assert(
  actor.includes("toMediaDeliveryUrl("),
  "actor-context must use media delivery URLs",
);
assert(
  !actor.includes("imageUrl: profile.image_url"),
  "actor-context must not return raw profile image_url",
);

const sync = read("src/app/api/sync-user/route.ts");
assert(
  sync.includes(
    'select("id, public_slug, display_name, profile_kind, is_public")',
  ),
  "sync-user must use the narrow profile projection",
);
assert(
  !sync.includes("    user: appUser,"),
  "sync-user response must not return full appUser",
);
assert(
  !sync.includes("    spaces: {"),
  "sync-user response must not return spaces payload",
);
assert(
  !sync.includes("    roles: {"),
  "sync-user response must not return roles payload",
);

const client = read("src/lib/actor-context-client.ts");
assert(
  client.includes("let actorContextRequest"),
  "actor-context client request cache missing",
);
assert(
  read("src/components/auth/user-session-client.tsx").includes(
    "loadActorContextClient()",
  ),
  "switcher must use shared actor-context cache",
);
assert(
  read("src/components/app-shell/global-navigation.tsx").includes(
    "loadActorContextClient()",
  ),
  "sidebar must use shared actor-context cache",
);

const directoryLogo = read(
  "src/app/api/directory/organizations/[slug]/logo/route.ts",
);
assert(
  directoryLogo.includes("getMediaCacheControl"),
  "directory logo cache helper missing",
);
assert(
  !directoryLogo.includes("private, no-store, max-age=0"),
  "directory public logo must not be no-store",
);
assert(
  !directoryLogo.includes("DATA_URL_RE"),
  "directory logo legacy Base64 fallback must be removed",
);
assert(
  !directoryLogo.includes("Buffer.from("),
  "directory logo must not decode legacy Base64",
);
assert(
  read("src/app/api/directory/organizations/route.ts").includes(
    "/logo?v=",
  ),
  "directory list logo URL must be versioned",
);
assert(
  read("src/app/api/directory/organizations/[slug]/route.ts").includes(
    "/logo?v=",
  ),
  "directory detail API logo URL must be versioned",
);

const offers = read("src/app/offers/new/page.tsx");
assert(
  offers.includes(
    "/api/profiles/${encodeURIComponent(profile.id)}/image",
  ),
  "offers/new profile media resolver missing",
);
assert(
  offers.includes(
    "/api/organizations/${encodeURIComponent(organization.id)}/logo",
  ),
  "offers/new organization media resolver missing",
);
assert(
  offers.includes(
    "/api/value-objects/${encodeURIComponent(item.id)}/public-image",
  ),
  "offers/new value-object media resolver missing",
);
assert(
  read("src/app/value-objects/[id]/page.tsx").includes("/public-image"),
  "value-object detail media resolver missing",
);

const profileRoute = read("src/app/api/profiles/[id]/image/route.ts");
assert(
  profileRoute.includes("NOT_AUTHENTICATED"),
  "profile image private auth guard missing",
);
assert(
  profileRoute.includes("createPrivateMediaSignedUrl"),
  "profile image signed Storage redirect missing",
);
assert(
  profileRoute.includes("NextResponse.redirect(signedUrl, 307)"),
  "profile image must redirect to signed Storage URL",
);
assert(
  profileRoute.includes("getSignedMediaRedirectCacheControl"),
  "signed redirect cache policy missing",
);
assert(
  !profileRoute.includes("readPrivateMediaObject"),
  "profile image binary proxy must be removed",
);
assert(
  !profileRoute.includes("decodeInlineImageDataUrl"),
  "profile image legacy Base64 fallback must be removed",
);
assert(
  !profileRoute.includes("toResponseBody"),
  "profile image Vercel binary response helper must be removed",
);

for (const route of [
  "src/app/api/organizations/[id]/logo/route.ts",
  "src/app/api/value-objects/[id]/public-image/route.ts",
]) {
  const text = read(route);
  assert(text.includes("NOT_AUTHENTICATED"), route + ": auth guard missing");
  assert(
    text.includes("getMediaCacheControl"),
    route + ": cache policy missing",
  );
  assert(
    text.includes("NextResponse.redirect("),
    route + ": Storage/public redirect missing",
  );
  assert(
    !text.includes("decodeInlineImageDataUrl"),
    route + ": legacy Base64 fallback must be removed",
  );
  assert(
    !text.includes("toResponseBody"),
    route + ": binary Vercel response must be removed",
  );
  assert(
    !text.includes("Buffer.from("),
    route + ": Base64 decoder must be removed",
  );
}

console.log("ARCTOR_MEDIA_EGRESS_CONTAINMENT_V1_STATIC=PASS");
