import fs from "node:fs";

const nav = fs.readFileSync("src/components/app-shell/global-navigation.tsx", "utf8");
const navI18n = fs.readFileSync("src/i18n/messages/navigation.ts", "utf8");
const page = fs.readFileSync("src/app/feed/page.tsx", "utf8");
const content = fs.readFileSync("src/app/feed/GlobalFeedContent.tsx", "utf8");
const copy = fs.readFileSync("src/app/feed/feedCopy.ts", "utf8");
const helper = fs.readFileSync("src/lib/messages/globalFeed.server.ts", "utf8");
const recovery = fs.readFileSync("docs/recovery/ARCTOR_MESSAGE_OBJECTS_F4_GLOBAL_FEED_V1_RU.md", "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

check("NAV_FEED_ICON", nav.includes("Newspaper"));
check("NAV_FEED_ACTIVE", nav.includes('const isFeedActive = currentPathname === "/feed";'));
check("NAV_FEED_HREF", nav.includes('href={localeHref("/feed")}'));
check("NAV_FEED_LABEL", nav.includes('label={t("navigation.feed")}'));
check("NAV_FEED_KEY", navI18n.includes('"navigation.feed"'));

const navLabels = [
  'ru: "Лента"',
  'pl: "Aktualności"',
  'en: "Feed"',
  'uk: "Стрічка"',
  'de: "Neuigkeiten"',
  'es: "Novedades"',
  'cs: "Aktuality"',
];
for (const label of navLabels) check(`NAV_I18N_${label}`, navI18n.includes(label));

check("PAGE_FORCE_DYNAMIC", page.includes('export const dynamic = "force-dynamic"'));
check("PAGE_REVALIDATE_ZERO", page.includes("export const revalidate = 0"));
check("PAGE_FORCE_NO_STORE", page.includes('export const fetchCache = "force-no-store"'));
check("PAGE_SUSPENSE", page.includes("<Suspense"));
check("PAGE_CONTENT", page.includes("<GlobalFeedContent"));
check("PAGE_LOCALE_PARAM", page.includes("params.locale") && page.includes("params.lang"));

const translatingLabels = [
  "Translating into English…",
  "Tłumaczenie na język polski…",
  "Переводится на русский…",
  "Перекладається українською…",
  "Wird ins Deutsche übersetzt…",
  "Traduciendo al español…",
  "Překládá se do češtiny…",
];
for (const label of translatingLabels) check(`COPY_${label}`, copy.includes(label));

check("HELPER_MESSAGE_OBJECTS", helper.includes('.from("message_objects")'));
check("HELPER_PUBLIC_FILTER", helper.includes('.eq("audience_scope_code", "public")'));
check("HELPER_ACTIVE_FILTER", helper.includes('.eq("lifecycle_status", "active")'));
check("HELPER_NATIVE_FILTER", helper.includes('.eq("origin_kind_code", "native")'));
check("HELPER_ARCTOR_ORIGIN_FILTER", helper.includes('.eq("origin_provider_code", "arctor")'));
check("HELPER_DISTRIBUTIONS", helper.includes('.from("message_object_distributions")'));
check("HELPER_ARCTOR_CHANNEL", helper.includes('.eq("channel_code", "arctor")'));
check("HELPER_SUCCEEDED", helper.includes('.eq("delivery_status", "succeeded")'));
check("HELPER_ACTOR_ACTIVE", helper.includes('.from("actors")') && helper.includes('.eq("status", "active")'));
check("HELPER_ORGANIZATION_AUTHOR", helper.includes('actor.actor_type === "organization"'));
check("HELPER_PUBLIC_ORG_STATUS", helper.includes('.eq("directory_status", "published")'));
check("HELPER_PUBLIC_ORG_ENABLED", helper.includes('.eq("is_public_profile_enabled", true)'));
check("HELPER_PUBLIC_ORG_LISTED", helper.includes('.eq("is_listed_in_directory", true)'));
check("HELPER_LOCALIZATION_REUSE", helper.includes("ensurePublicMessageObjectLocalizationsV1"));
check("HELPER_ORG_LOCALIZATION", helper.includes("resolveLocalizedContentFieldsStrict"));
check("HELPER_DETERMINISTIC_ORDER", helper.includes('.order("activated_at"') && helper.includes('.order("created_at"') && helper.includes('.order("id"'));
check("HELPER_LIMIT_30", helper.includes("const DEFAULT_LIMIT = 30"));
check("CONTENT_PROFILE_LINK", content.includes("/directory/"));
check("CONTENT_LOGO", content.includes("item.author.logoUrl"));
check("CONTENT_SOURCE", content.includes("copy.sourceLabel"));
check("CONTENT_TIMESTAMP", content.includes("formatPublishedAt"));
check("CONTENT_NO_COMPOSER", !content.includes("<form") && !content.includes("textarea"));

check("RECOVERY_NO_PUBLICATIONS_TABLE", recovery.includes("`publications`"));
check("RECOVERY_NO_FEED_ITEMS_TABLE", recovery.includes("`feed_items`"));
check("RECOVERY_PROJECTION", recovery.includes("read projection"));
check("RECOVERY_V1_30", recovery.includes("до 30 feed items"));
check("RECOVERY_SMOKE", recovery.includes("Production smoke после deploy"));

const forbiddenSourcePatterns = [
  /create table/i,
  /alter table/i,
  /drop table/i,
  /\.insert\(/,
  /\.delete\(/,
  /\.upsert\(/,
];
for (const pattern of forbiddenSourcePatterns) {
  check(`HELPER_FORBIDDEN_${pattern}`, !pattern.test(helper));
}

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_MESSAGE_OBJECTS_F4_GLOBAL_FEED_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
