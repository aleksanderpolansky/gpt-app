import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const checks = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function check(name, ok, detail='') { checks.push({name, ok:Boolean(ok), detail}); }
function has(rel, ...needles) {
  const text = read(rel);
  return needles.every((needle) => text.includes(needle));
}

const core = 'src/lib/localization/contentLocalization.ts';
const server = 'src/lib/localization/contentLocalization.server.ts';
check('01_core_schema_v2', has(core, 'ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION = 2', 'humanLocales', 'lastEditedLocale'));
check('02_seven_locales', has(core, '["en", "pl", "ru", "uk", "de", "es", "cs"]'));
check('03_v1_backward_read', has(core, 'schemaVersion !== 1 && schemaVersion !== ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION'));
check('04_public_strict_field_resolver', has(core, 'resolveLocalizedContentFieldStrict', 'return envelope.variants[locale]?.[input.fieldCode] ?? null'));
check('05_public_strict_fields_resolver', has(core, 'resolveLocalizedContentFieldsStrict'));
check('06_manual_locale_lock', has(server, 'humanLocales', 'protectedLocales', 'protectedLocales.has(locale)'));
check('07_manual_first_persist', has(server, 'const humanEnvelope = createHumanEnvelope', 'localizedContent: humanEnvelope', 'generateLocalizedContentBatch'));
check('08_no_ai_on_read_core', !read(core).includes('openai.responses') && !read(core).includes('generateLocalizedContentBatch('));
check('09_organization_create_localized', has('src/app/api/organizations/route.ts', 'localizeEntityContent({', 'table: "organizations"', 'sourceLocaleHint: body.locale'));
check('10_organization_edit_locale_sent', has('src/app/organizations/[id]/edit/OrganizationPublicProfileEditClient.tsx', 'locale: initialData.locale'));
check('11_organization_edit_localized', has('src/app/api/organizations/[id]/public-profile/route.ts', 'table: "organizations"', 'sourceLocaleHint: body.locale'));
check('12_org_author_locale_strict', has('src/app/organizations/[id]/edit/page.tsx', 'resolveLocalizedContentFieldsStrict'));
check('13_directory_list_strict', has('src/app/api/directory/organizations/route.ts', 'resolveLocalizedContentFieldsStrict', 'contentLocalizationStatus'));
check('14_directory_detail_strict', has('src/app/api/directory/organizations/[slug]/route.ts', 'resolveLocalizedContentFieldsStrict', 'contentLocalizationStatus'));
check('15_directory_offers_strict', has('src/app/api/directory/organizations/[slug]/offers/route.ts', 'resolveLocalizedContentFieldsStrict', 'contentLocalizationStatus'));
check('16_legacy_offer_create_localized', has('src/app/api/offers/route.ts', 'table: "offers"', 'contentLocalization'));
check('17_legacy_offer_public_strict', has('src/app/offers/[id]/page.tsx', 'resolveLocalizedContentFieldsStrict'));
check('18_product_service_create_localized', has('src/app/api/value-objects/product-service/route.ts', 'table: "value_objects"', 'sourceLocaleHint: locale'));
check('19_product_service_edit_locale_sent', has('src/components/workspace/value-objects/value-object-inline-editor.tsx', 'locale,', 'body: JSON.stringify(body)'));
check('20_product_service_edit_localized', has('src/app/api/value-objects/[id]/route.ts', 'table: "value_objects"', 'sourceLocaleHint: body.locale'));
check('21_certificate_create_localized', has('src/app/api/value-objects/[id]/gift-certificates/draft/route.ts', 'table: "activity_events"', 'termsText'));
check('22_certificate_terms_locale_sent', has('src/app/certificates/[activityEventId]/certificate-terms-editor.tsx', 'JSON.stringify({ termsText: value, locale })'));
check('23_certificate_terms_localized', has('src/app/api/gift-certificates/[activityEventId]/terms/route.ts', 'table: "activity_events"', 'fields: { termsText }'));
check('24_certificate_public_strict', has('src/app/certificates/gift-certificate-data.ts', 'resolveLocalizedContentFieldsStrict'));
check('25_certificate_pages_pass_locale', has('src/app/certificates/page.tsx', 'listPublicGiftCertificates(', 'locale'));
check('26_org_metadata_migration', has('supabase/migrations/20260817173000_content_l10_global_content_localization_v1.sql', 'alter table public.organizations', 'add column if not exists metadata_json'));
check('27_offer_metadata_migration', has('supabase/migrations/20260817173000_content_l10_global_content_localization_v1.sql', 'alter table public.offers', 'add column if not exists metadata_json'));
check('28_rollback_present', has('supabase/rollbacks/20260817173000_content_l10_global_content_localization_v1_ROLLBACK.sql', 'drop column if exists metadata_json'));

const publicFiles = [
  'src/app/api/directory/organizations/route.ts',
  'src/app/api/directory/organizations/[slug]/route.ts',
  'src/app/api/directory/organizations/[slug]/offers/route.ts',
  'src/app/offers/[id]/page.tsx',
  'src/app/certificates/gift-certificate-data.ts',
];
for (const rel of publicFiles) {
  check(`public_strict_import:${rel}`, read(rel).includes('resolveLocalizedContentFieldsStrict') || read(rel).includes('resolveLocalizedContentFieldsStrict'));
}

for (const row of checks) {
  console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}${row.detail ? ` :: ${row.detail}` : ''}`);
}
const failed = checks.filter((x) => !x.ok);
console.log(`SUMMARY total=${checks.length} passed=${checks.length-failed.length} failed=${failed.length}`);
process.exit(failed.length ? 1 : 0);
