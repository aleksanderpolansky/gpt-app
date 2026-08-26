import fs from "node:fs";

const page = fs.readFileSync("src/app/directory/[slug]/page.tsx", "utf8");
const edit = fs.readFileSync("src/app/organizations/[id]/edit/OrganizationPublicProfileEditClient.tsx", "utf8");
const helper = fs.readFileSync("src/lib/messages/enterpriseMessages.server.ts", "utf8");
const content = fs.readFileSync("src/app/directory/[slug]/EnterprisePublicActivityContent.tsx", "utf8");
const localization = fs.readFileSync("src/lib/messages/messageObjectOnDemandLocalization.server.ts", "utf8");
const recovery = fs.readFileSync("docs/recovery/ARCTOR_MESSAGE_OBJECTS_F2_UPDATES_LOCALIZATION_HOTFIX_V1_RU.md", "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

const bs = "\\";
const publicLabels = [
  'publicActions: "Updates"',
  `publicActions: "Aktualno${bs}u015bci"`,
  `publicActions: "${bs}u041d${bs}u043e${bs}u0432${bs}u0438${bs}u043d${bs}u0438 ${bs}u0442${bs}u0430 ${bs}u043f${bs}u0443${bs}u0431${bs}u043b${bs}u0456${bs}u043a${bs}u0430${bs}u0446${bs}u0456${bs}u0457"`,
  `publicActions: "${bs}u041d${bs}u043e${bs}u0432${bs}u043e${bs}u0441${bs}u0442${bs}u0438 ${bs}u0438 ${bs}u043f${bs}u0443${bs}u0431${bs}u043b${bs}u0438${bs}u043a${bs}u0430${bs}u0446${bs}u0438${bs}u0438"`,
  'publicActions: "Neuigkeiten"',
  'publicActions: "Novedades"',
  'publicActions: "Aktuality"',
];
for (const label of publicLabels) check(`PUBLIC_LABEL_${label}`, page.includes(label));
for (const label of publicLabels) check(`EDIT_LABEL_${label}`, edit.includes(label));

check("PUBLIC_SUSPENSE", page.includes("<Suspense"));
check("PUBLIC_ASYNC_ACTIVITY_CONTENT", page.includes("<EnterprisePublicActivityContent"));
check("PUBLIC_TRANSLATING_RU", page.includes("Переводится на русский…"));
check("PUBLIC_TRANSLATING_PL", page.includes("Tłumaczenie na język polski…"));
check("PUBLIC_TRANSLATING_EN", page.includes("Translating into English…"));
check("PUBLIC_TRANSLATING_UK", page.includes("Перекладається українською…"));
check("PUBLIC_TRANSLATING_DE", page.includes("Wird ins Deutsche übersetzt…"));
check("PUBLIC_TRANSLATING_ES", page.includes("Traduciendo al español…"));
check("PUBLIC_TRANSLATING_CS", page.includes("Překládá se do češtiny…"));

const descIndex = page.indexOf('title={getPublicOrganizationDashboardLabel("description", selectedLocale)}');
const updatesIndex = page.indexOf('title={getPublicOrganizationDashboardLabel("publicActions", selectedLocale)}');
const pointsIndex = page.indexOf('title={t.points.title}');
const offersIndex = page.indexOf('title={t.offers.title}');
check("PUBLIC_LAYOUT_ORDER", descIndex >= 0 && updatesIndex > descIndex && pointsIndex > updatesIndex && offersIndex > pointsIndex);

const editDescription = edit.indexOf('<BigCard title={messages.description}');
const editUpdates = edit.indexOf('<BigCard title={messages.publicActions}');
const editPoints = edit.indexOf('<BigCard title={messages.certificatesAndPoints}');
const editOffers = edit.indexOf('<BigCard title={messages.publicOffers}');
check("EDIT_LAYOUT_ORDER", editDescription >= 0 && editUpdates > editDescription && editPoints > editUpdates && editOffers > editPoints);

check("HELPER_LOCALE_ARG", helper.includes("locale?: string;"));
check("HELPER_LOCALIZATION_CALL", helper.includes("ensurePublicMessageObjectLocalizationsV1"));
check("HELPER_METADATA_READ", helper.includes("metadata_json"));
check("CONTENT_PASSES_LOCALE", content.includes("locale,"));

check("LOCALIZATION_RUNTIME", localization.includes("ARCTOR_MESSAGE_OBJECT_ON_DEMAND_LOCALIZATION_V1"));
check("LOCALIZATION_REUSES_GENERIC_AI", localization.includes("generateLocalizedContentBatch"));
check("LOCALIZATION_TARGET_ONLY", localization.includes("targetLocales: [targetLocale]"));
check("LOCALIZATION_BATCH_LIMIT", localization.includes("const MAX_BATCH_ITEMS = 5"));
check("LOCALIZATION_OWNER_BUDGET", localization.includes("userId: first.message.ownerUserId"));
check("LOCALIZATION_CREATOR_ACTOR", localization.includes("actorId: first.message.createdByActorId"));
check("LOCALIZATION_CACHE_WRITE", localization.includes('.from("message_objects")') && localization.includes("metadata_json"));
check("LOCALIZATION_NON_FATAL", localization.includes("MESSAGE_LOCALIZATION_BATCH_FAILED"));
check("LOCALIZATION_PRESERVES_ORIGINAL", localization.includes("contentText: input.contentText"));
check("LOCALIZATION_PRESERVES_OTHER_VARIANTS", localization.includes("cloneVariants(input.existing)"));
check("RECOVERY_TRANSLATION_PENDING", recovery.includes("Переводится на русский…"));
check("RECOVERY_NO_SCHEMA_CHANGE", recovery.includes("F1 DB schema"));

const failed = checks.filter((item) => !item.pass);
const result = {
  release: "ARCTOR_MESSAGE_OBJECTS_F2_UPDATES_LOCALIZATION_HOTFIX_V1",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  allPass: failed.length === 0,
  checks,
};
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.allPass ? 0 : 1);
