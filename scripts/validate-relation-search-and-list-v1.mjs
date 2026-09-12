import fs from "node:fs";

const checks = [];

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`MISSING_FILE:${path}`);
  return fs.readFileSync(path, "utf8");
}

function check(name, ok) {
  if (!ok) throw new Error(`FAIL ${name}`);
  console.log(`PASS ${name}`);
  checks.push(name);
}

const constructorPage = read("src/app/admin/relation-constructor/page.tsx");
const constructorApi = read("src/app/api/admin/relation-constructor/route.ts");
const listPage = read("src/app/admin/relations/page.tsx");
const listApi = read("src/app/api/admin/relations/route.ts");
const nav = read("src/components/app-shell/global-navigation.tsx");

check("SOURCE_COMBOBOX", constructorPage.includes("<ObservationObjectCombobox") && constructorPage.includes("options={sourceComboboxOptions}"));
check("TARGET_COMBOBOX", constructorPage.includes("options={targetComboboxOptions}"));
check("OBJECT_SEARCH_PLACEHOLDER", constructorPage.includes("objectSearchPlaceholder"));
check("SOURCE_PREFILL_AFTER_CATALOG", constructorPage.includes("requestedSourceValueObjectId") && constructorPage.includes("setSourceValueObjectId(requestedSourceValueObjectId)"));
check("SOURCE_EFFECT_NO_SELECTION_RELOAD", constructorPage.includes("}, [fetchCatalog]);"));
check("ENGLISH_SEARCH_PAYLOAD", constructorApi.includes("titleEn: english.title") && constructorApi.includes("descriptionEn: english.description"));
check("CANONICAL_KEY_SEARCH_PAYLOAD", constructorApi.includes("canonicalKey: localized.canonical_key"));
check("RELATION_TYPE_REMAINS_CLOSED_SELECT", constructorPage.includes("3. {copy.relation}") && constructorPage.includes("<select"));
check("RELATIONS_LIST_PAGE", listPage.includes("Связи объектов наблюдения"));
check("RELATIONS_LIST_API", listApi.includes("admin-system-relations-list-v1"));
check("RELATIONS_LIST_SUPABASE_IMPORT_PATH", listApi.includes('from "../../../../../lib/supabase"'));
check("RELATIONS_LIST_READS_CANONICAL_TABLE", listApi.includes('.from("system_value_object_relations")'));
check("RELATIONS_LIST_READS_CURATOR_COMMENT", listApi.includes("curatorComment") && listApi.includes("activity_processing_logs"));
check("RELATIONS_LIST_LOCALIZES_OBJECTS", listApi.includes("localizeGlobalSystemValueObject"));
check("RELATIONS_LIST_ADD_BUTTON", listPage.includes("+ Добавить связь") && listPage.includes("/admin/relation-constructor"));
check("RELATIONS_LIST_SEARCH", listPage.includes('type="search"'));
check("RELATIONS_LIST_OBJECT_LINKS", listPage.includes("/value-objects/"));
check("NAV_RELATIONS_LABEL", nav.includes("RELATIONS_LIST_LABEL_BY_LOCALE"));
check("NAV_RELATIONS_ROUTE", nav.includes('href={localeHref("/admin/relations")}'));
check("NAV_RELATIONS_UNDER_CONSEQUENCE", nav.indexOf('href={localeHref("/admin/relations")}') > nav.indexOf('href={localeHref("/admin/consequence-constructor")}'));
check("NO_TYPICAL_ACTIVITY_IN_RELATION_CONSTRUCTOR", !constructorPage.includes("typicalActivity") && !constructorApi.includes("typicalActivity"));
check("NO_FORMULA_WRITE", !constructorApi.includes("formula") && !listApi.includes("formula"));
check("NO_SQL_SCHEMA_CHANGE", !fs.existsSync("supabase/migrations/20260912123000_relation_search_and_list_v1.sql"));

console.log(`PASS ${checks.length}/23`);
