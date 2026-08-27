import fs from "node:fs";

const route = fs.readFileSync("src/app/api/organizations/[id]/messages/route.ts", "utf8");
const panel = fs.readFileSync("src/app/directory/[slug]/EnterprisePublicActivityPanel.tsx", "utf8");
const enterprise = fs.readFileSync("src/lib/messages/enterpriseMessages.server.ts", "utf8");
const globalHelper = fs.readFileSync("src/lib/messages/globalFeed.server.ts", "utf8");
const globalContent = fs.readFileSync("src/app/feed/GlobalFeedContent.tsx", "utf8");
const browserMedia = fs.readFileSync("src/lib/media/browserPublicationImage.ts", "utf8");
const messageMedia = fs.readFileSync("src/lib/messages/messageMedia.server.ts", "utf8");
const recovery = fs.readFileSync("docs/recovery/ARCTOR_MESSAGE_OBJECTS_F2M_NATIVE_PUBLICATION_IMAGE_V1_RU.md", "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("CLIENT_10_MIB", browserMedia.includes("10 * 1024 * 1024"));
check("CLIENT_400_KIB", browserMedia.includes("400 * 1024"));
check("CLIENT_512_KIB", browserMedia.includes("512 * 1024"));
check("CLIENT_1600", browserMedia.includes("1600"));
check("CLIENT_WEBP_BLOB", browserMedia.includes("canvas.toBlob") && browserMedia.includes('"image/webp"'));
check("CLIENT_NO_DATA_URL", !browserMedia.includes("toDataURL"));
check("PANEL_FORMDATA", panel.includes("new FormData()"));
check("PANEL_BINARY_BLOB", panel.includes("image.blob"));
check("PANEL_PHOTO_CONTROL", panel.includes("<ImagePlus"));
check("PANEL_PREVIEW_220", panel.includes("max-h-[220px]"));
check("PANEL_ENTERPRISE_300", panel.includes("max-h-[300px]"));
check("PANEL_ARCTOR_COLORS", panel.includes("#3b6ef8") && panel.includes("#f8f9fd"));
check("PANEL_NO_NEXT_IMAGE", !panel.includes('from "next/image"'));

check("ROUTE_MULTIPART", route.includes('multipart/form-data'));
check("ROUTE_JSON_COMPAT", route.includes("request.json()"));
check("ROUTE_512", route.includes("512 * 1024"));
check("ROUTE_1600", route.includes("MAX_IMAGE_EDGE_PX = 1600"));
check("ROUTE_WEBP_MIME", route.includes('imageValue.type !== "image/webp"'));
check("ROUTE_RIFF_WEBP", route.includes('"RIFF"') && route.includes('"WEBP"'));
check("ROUTE_VP8X", route.includes('"VP8X"'));
check("ROUTE_VP8", route.includes('"VP8 "'));
check("ROUTE_VP8L", route.includes('"VP8L"'));
check("ROUTE_SHA", route.includes('createHash("sha256")'));
check(
  "ROUTE_CONTENT_ADDRESS",
  route.includes("MESSAGE_IMAGE_NAMESPACE") &&
    route.includes("storagePath:") &&
    route.includes("sha256Hex") &&
    route.includes(".webp"),
);
check("ROUTE_EXISTING_STORAGE", route.includes("persistMediaImageValue"));
check("ROUTE_MEDIA_TABLE", route.includes('.from("message_object_media")'));
check("ROUTE_DEDUP_CHECK", route.includes("publicMediaObjectExists"));
check("ROUTE_SAFE_CLEANUP", route.includes("input.existedBefore"));

check("MEDIA_READ_TABLE", messageMedia.includes('.from("message_object_media")'));
check("MEDIA_PUBLIC_BUCKET", messageMedia.includes("PUBLIC_MEDIA_BUCKET_ID"));
check("MEDIA_PUBLIC_URL", messageMedia.includes(".getPublicUrl(row.storage_path)"));
check("MEDIA_NO_DOWNLOAD", !messageMedia.includes(".download("));
check("ENTERPRISE_MEDIA", enterprise.includes("getPublicMessageImageMap") && enterprise.includes("image: imageByMessageId.get(row.id)"));
check("GLOBAL_MEDIA", globalHelper.includes("getPublicMessageImageMap") && globalHelper.includes("image: imageByMessageId.get(message.id)"));
check("GLOBAL_420", globalContent.includes("max-h-[420px]"));
check("GLOBAL_DIRECT_IMG", globalContent.includes("<img") && !globalContent.includes('from "next/image"'));
check("GLOBAL_LAZY", globalContent.includes('loading="lazy"'));
check("RECOVERY_NO_SQL", recovery.includes("no SQL schema changes"));
check("RECOVERY_CDN", recovery.includes("Supabase Storage/CDN"));
check("RECOVERY_ARCTOR_STYLE", recovery.includes("ARCTor style"));

for (const text of [route, browserMedia, messageMedia]) {
  check("NO_DDL_" + checks.length, !/create table|alter table|drop table/i.test(text));
}

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_MESSAGE_OBJECTS_F2M_NATIVE_PUBLICATION_IMAGE_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
