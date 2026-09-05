import fs from "node:fs";
import { argv, stdout } from "node:process";

function read(path) {
  return fs.readFileSync(path, "utf8").replace(/\r\n?/g, "\n");
}
function assert(condition, label) {
  if (!condition) throw new Error(`VALIDATION_FAILED:${label}`);
}

const [routePath, uiPath] = argv.slice(2);
if (!routePath || !uiPath) throw new Error("Usage: validator <route.ts> <ui.tsx>");

const route = read(routePath);
const ui = read(uiPath);

assert(route.includes("reality-curator-object-bootstrap-v1-7-locale-aware-fields"), "route_marker");
assert(route.includes("ARCTOR_REALITY_MODEL_CURATOR_ACTIVITY_TEMPLATE_BUILDER_V1_6_LOCALE_AWARE"), "contract_version");
assert(route.includes('const CURATOR_LOCALES = ["en", "pl", "ru", "uk", "de", "es", "cs"] as const;'), "seven_locale_contract");
assert(route.includes("localizedTitle?: unknown;"), "localized_title_body");
assert(route.includes("localizedDescription?: unknown;"), "localized_description_body");
assert(!route.includes("titleRu?: unknown;"), "legacy_ru_title_body_removed");
assert(!route.includes("descriptionRu?: unknown;"), "legacy_ru_description_body_removed");
assert(!route.includes("text(body.titleRu)"), "no_ru_title_read");
assert(!route.includes("text(body.descriptionRu)"), "no_ru_description_read");
assert(!route.includes("input.titleRu"), "no_ru_title_create_input");
assert(!route.includes("input.descriptionRu"), "no_ru_description_create_input");
assert(route.includes("draftLocalizations[input.locale]"), "dynamic_runtime_localization");
assert(route.includes("en: { title: input.titleEn, description: input.descriptionEn }"), "english_fallback_persisted");
assert(route.includes('locale === "en" ? localizedTitle : text(body.titleEn)'), "en_single_field_title_contract");
assert(route.includes('locale === "en" ? localizedDescription : text(body.descriptionEn)'), "en_single_field_description_contract");
assert(route.includes("creationLocale: locale"), "creation_locale_provenance");
assert(route.includes("createdLocalizedTitle: localizedTitle"), "localized_title_provenance");
assert(route.includes("createdEnglishTitle: titleEn"), "english_title_provenance");
assert(route.includes('title: input.titleEn,'), "base_title_remains_english_fallback");
assert(route.includes('description: input.descriptionEn,'), "base_description_remains_english_fallback");

assert(ui.includes("LOCALIZED_FIELD_LABELS"), "localized_field_label_catalog");
for (const marker of [
  '"uk":{"title":"Назва","description":"Визначення","titleEn":"Англійська назва","descriptionEn":"Англійське визначення"}',
  '"pl":{"title":"Nazwa","description":"Definicja"',
  '"ru":{"title":"Название","description":"Определение"',
  '"de":{"title":"Name","description":"Definition"',
  '"es":{"title":"Nombre","description":"Definición"',
  '"cs":{"title":"Název","description":"Definice"',
]) {
  assert(ui.includes(marker), `locale_label_marker_${marker.slice(1, 3)}`);
}
assert(ui.includes('const [localizedTitle, setLocalizedTitle] = useState("");'), "ui_localized_title_state");
assert(ui.includes('const [localizedDescription, setLocalizedDescription] = useState("");'), "ui_localized_description_state");
assert(!ui.includes("value={titleRu}"), "ui_no_ru_title_field");
assert(!ui.includes("value={descriptionRu}"), "ui_no_ru_description_field");
assert(ui.includes('locale !== "en" ? <label'), "ui_en_fallback_hidden_for_english_locale");
assert(ui.includes('titleEn: locale === "en" ? localizedTitle : titleEn'), "ui_en_title_payload");
assert(ui.includes('descriptionEn: locale === "en" ? localizedDescription : descriptionEn'), "ui_en_description_payload");
assert(ui.includes("localizedTitle,"), "ui_localized_title_payload");
assert(ui.includes("localizedDescription,"), "ui_localized_description_payload");

stdout.write("ARCTOR_CURATOR_LOCALIZED_SYSTEM_OBJECT_FIELDS_V1_VALIDATION: PASS\n");
