import fs from "node:fs";

const page = fs.readFileSync("src/app/feed/page.tsx", "utf8");
const content = fs.readFileSync("src/app/feed/GlobalFeedContent.tsx", "utf8");
const copy = fs.readFileSync("src/app/feed/feedCopy.ts", "utf8");
const helper = fs.readFileSync("src/lib/messages/globalFeed.server.ts", "utf8");
const messageLocalization = fs.readFileSync("src/lib/messages/messageObjectOnDemandLocalization.server.ts", "utf8");
const recovery = fs.readFileSync("docs/recovery/ARCTOR_MESSAGE_OBJECTS_F4_ITEM_LEVEL_LOCALIZATION_HOTFIX_V1_RU.md", "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("PAGE_LOADING_NOT_TRANSLATING", page.includes("{copy.loading}") && !page.includes("{copy.translating}"));

const loadingLabels = [
  "Loading updates…",
  "Ładowanie aktualności…",
  "Загрузка ленты…",
  "Завантаження стрічки…",
  "Neuigkeiten werden geladen…",
  "Cargando novedades…",
  "Načítání aktualit…",
];
for (const label of loadingLabels) check(`COPY_LOADING_${label}`, copy.includes(label));

const translatingLabels = [
  "Translating into English…",
  "Tłumaczenie na język polski…",
  "Переводится на русский…",
  "Перекладається українською…",
  "Wird ins Deutsche übersetzt…",
  "Traduciendo al español…",
  "Překládá se do češtiny…",
];
for (const label of translatingLabels) check(`COPY_TRANSLATING_${label}`, copy.includes(label));

check("MESSAGE_CACHE_READER_EXPORT", messageLocalization.includes("export function readCachedPublicMessageObjectLocalizationV1"));
check("MESSAGE_CACHE_SOURCE_REVISION", messageLocalization.includes("existing?.sourceRevision !== revision"));
check("MESSAGE_CACHE_TARGET_VARIANT", messageLocalization.includes("existing.variants[targetLocale]?.contentText"));

check("HELPER_NO_AWAIT_LOCALIZATION_IN_FEED_QUERY", !helper.includes("const localization = await ensurePublicMessageObjectLocalizationsV1({\n      targetLocale: input.locale,\n      messages: eligibleMessages"));
check("HELPER_RETURNS_SOURCE_CONTENT", helper.includes("sourceContentText: message.content_text"));
check("HELPER_RETURNS_LOCALIZATION_SOURCE", helper.includes("localizationSource"));
check("HELPER_CACHE_READER", helper.includes("readCachedGlobalArctorFeedItemContent"));
check("HELPER_SHARED_BATCH", helper.includes("localizeGlobalArctorFeedItems"));
check("HELPER_EXISTING_ENSURE_REUSED", helper.includes("ensurePublicMessageObjectLocalizationsV1"));
check("HELPER_NO_NEW_WRITE_PATH", !helper.includes('.insert(') && !helper.includes('.delete(') && !helper.includes('.upsert('));

check("CONTENT_ITEM_SUSPENSE", content.includes("<Suspense"));
check("CONTENT_PENDING_ITEM_COMPONENT", content.includes("PendingGlobalFeedItem"));
check("CONTENT_SHARED_PROMISE", content.includes("const localizationPromise"));
check("CONTENT_SHARED_PROMISE_PROP", content.includes("localizationPromise={localizationPromise}"));
check("CONTENT_PENDING_SET", content.includes("const pendingIds = new Set"));
check("CONTENT_CACHE_FIRST", content.includes("readCachedGlobalArctorFeedItemContent"));
check("CONTENT_BATCH_PENDING_ONLY", content.includes("items: pendingItems"));
check("CONTENT_ITEM_FALLBACK", content.includes("pendingLabel={copy.translating}"));
check("CONTENT_CACHED_DIRECT", content.includes("cachedContentById.get(item.id)"));
check(
  "CONTENT_NO_WHOLE_FEED_TRANSLATION_FALLBACK",
  !page.includes("{copy.translating}") &&
    content.includes("pendingLabel={copy.translating}"),
);

check("RECOVERY_SHARED_BATCH", recovery.includes("один shared localization promise"));
check("RECOVERY_ITEM_LEVEL", recovery.includes("каждая находится в своей `<Suspense>` boundary"));
check("RECOVERY_CACHE_REVISION", recovery.includes("source revision"));
check("RECOVERY_NO_SQL", recovery.includes("SQL не требуется"));

const forbiddenSchemaPatterns = [
  /create table/i,
  /alter table/i,
  /drop table/i,
];
for (const pattern of forbiddenSchemaPatterns) {
  check(`NO_SCHEMA_${pattern}`, !pattern.test(helper) && !pattern.test(messageLocalization));
}

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_MESSAGE_OBJECTS_F4_ITEM_LEVEL_LOCALIZATION_HOTFIX_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
