import fs from "node:fs";

const roadmap = fs.readFileSync("docs/recovery/ARCTOR_MESSAGE_OBJECTS_ROADMAP_CURRENT_20260826_RU.md", "utf8");
const closure = fs.readFileSync("docs/recovery/ARCTOR_MESSAGE_OBJECTS_F4_PRODUCTION_CLOSURE_V1_RU.md", "utf8");
const media = fs.readFileSync("docs/recovery/ARCTOR_MESSAGE_OBJECTS_F2M_MEDIA_ENTRY_CONTRACT_V1_RU.md", "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("ROADMAP_BASELINE", roadmap.includes("fb754c261260e553e0c0434cba6348817a630cc4"));
check("ROADMAP_F4_DONE", roadmap.includes("### F4 — Global ARCTor Feed — DONE"));
check("ROADMAP_F2M_NEXT", roadmap.includes("### F2M — Media for native publications — NEXT"));
check("ROADMAP_NO_FEED_STORAGE", roadmap.includes("без нового feed storage layer"));
check("ROADMAP_F2M_NO_BASE64", roadmap.includes("не архивировать originals") || roadmap.includes("не архивировать original"));

check("CLOSURE_PRODUCTION_PASS", closure.includes("production PASS"));
check("CLOSURE_ITEM_LEVEL", closure.includes("item-level localization hotfix"));
check("CLOSURE_CACHE_F5", closure.includes("после `F5`"));
check("CLOSURE_PROJECTION_LOCK", closure.includes("Feed = projection(message_objects)"));
check("CLOSURE_F2M_NEXT", closure.includes("F2M — image media"));

check("MEDIA_ONE_IMAGE", media.includes("одну фотографию"));
check("MEDIA_SOURCE_10_MIB", media.includes("`10 MiB`"));
check("MEDIA_WEBP", media.includes("`image/webp`"));
check("MEDIA_MAX_EDGE_1600", media.includes("1600 px"));
check("MEDIA_TARGET_400", media.includes("<= 400 KiB"));
check("MEDIA_HARD_512", media.includes("512 KiB"));
check("MEDIA_NO_ORIGINAL_ARCHIVE", media.includes("архивировать оригинальный файл"));
check("MEDIA_NO_BASE64", media.includes("сохранять `data:image"));
check("MEDIA_PUBLIC_BUCKET", media.includes("`arctor-public-media`"));
check("MEDIA_CONTENT_ADDRESSED", media.includes("message-objects/image/<sha256>.webp"));
check("MEDIA_ROW", media.includes("`message_object_media`"));
check("MEDIA_NO_VERCEL_BINARY", media.includes("не через Vercel application response"));
check("MEDIA_ATOMIC_FLOW", media.includes("canonical draft `message_object`"));
check("MEDIA_DEDUP_DELETE_GUARD", media.includes("deduplicated pre-existing"));
check("MEDIA_ARCTOR_STYLE", media.includes("UI style — ARCTor"));
check("MEDIA_ACCENT", media.includes("#3b6ef8"));
check("MEDIA_NO_MESSENGER", media.includes("не messenger clone"));
check("MEDIA_GLOBAL_MAX_HEIGHT", media.includes("420 px"));
check("MEDIA_ENTERPRISE_MAX_HEIGHT", media.includes("300 px"));
check("MEDIA_NO_SQL", media.includes("no new SQL schema"));
check("MEDIA_NEXT_RELEASE", media.includes("ARCTOR_MESSAGE_OBJECTS_F2M_NATIVE_PUBLICATION_IMAGE_V1"));

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_MESSAGE_OBJECTS_F4_CLOSURE_F2M_MEDIA_ENTRY_V1_1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
