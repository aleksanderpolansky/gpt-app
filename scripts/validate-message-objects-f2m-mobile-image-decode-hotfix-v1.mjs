import fs from "node:fs";

const browser = fs.readFileSync("src/lib/media/browserPublicationImage.ts", "utf8");
const recovery = fs.readFileSync("docs/recovery/ARCTOR_MESSAGE_OBJECTS_F2M_MOBILE_IMAGE_DECODE_HOTFIX_V1_RU.md", "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("SOURCE_LIMIT_10_MIB", browser.includes("10 * 1024 * 1024"));
check("TARGET_400_KIB", browser.includes("400 * 1024"));
check("HARD_512_KIB", browser.includes("512 * 1024"));
check("MAX_EDGE_1600", browser.includes("PUBLICATION_IMAGE_MAX_EDGE_PX = 1600"));
check("SAFE_FALLBACK_16MP", browser.includes("PUBLICATION_IMAGE_SAFE_FALLBACK_PIXELS = 16_000_000"));

check("JPEG_DIMENSION_PARSER", browser.includes("readJpegDimensions") && browser.includes("isJpegStartOfFrame"));
check("PNG_DIMENSION_PARSER", browser.includes("readPngDimensions") && browser.includes('"PNG"'));
check("WEBP_DIMENSION_PARSER", browser.includes("readWebPDimensions") && browser.includes('"VP8X"') && browser.includes('"VP8L"'));

check("CREATE_IMAGE_BITMAP", browser.includes('typeof createImageBitmap !== "function"') && browser.includes("await createImageBitmap"));
check("BITMAP_RESIZE_WIDTH", browser.includes("resizeWidth: target.width"));
check("BITMAP_RESIZE_HEIGHT", browser.includes("resizeHeight: target.height"));
check("BITMAP_HIGH_QUALITY", browser.includes('resizeQuality: "high"'));
check("BITMAP_ORIENTATION", browser.includes('imageOrientation: "from-image"'));
check("BITMAP_CLOSE", browser.includes("bitmap.close()"));
check("FINALLY_CLOSE", browser.includes("finally") && browser.includes("decoded.close()"));

check("YIELD_BEFORE_HEAVY_WORK", browser.includes("requestAnimationFrame"));
check("FALLBACK_PIXEL_GUARD", browser.includes("sourcePixels > PUBLICATION_IMAGE_SAFE_FALLBACK_PIXELS"));
check("CONTROLLED_DECODE_FAILURE", browser.includes('throw new Error("PUBLICATION_IMAGE_DECODE_FAILED")'));

check("CANVAS_TARGET_BOUNDED", browser.includes("decoded.width * dimensionFactor") && browser.includes("decoded.height * dimensionFactor"));
check("WEBP_TO_BLOB", browser.includes("canvas.toBlob") && browser.includes('"image/webp"'));
check("NO_TO_DATA_URL", !browser.includes("toDataURL"));
check("NO_NETWORK", !browser.includes("fetch("));
check("NO_DDL", !/create table|alter table|drop table/i.test(browser));

check("RECOVERY_MOBILE_FINDING", recovery.includes("Android/Chrome"));
check("RECOVERY_MEMORY_MODEL", recovery.includes("RGBA decode"));
check("RECOVERY_CREATE_IMAGE_BITMAP", recovery.includes("createImageBitmap"));
check("RECOVERY_NO_SCHEMA_CHANGE", recovery.includes("DB schema"));

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_MESSAGE_OBJECTS_F2M_MOBILE_IMAGE_DECODE_HOTFIX_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
