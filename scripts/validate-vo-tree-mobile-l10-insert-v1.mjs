import fs from "node:fs";
import path from "node:path";

const checks = [];
function check(name, passed, detail = "") {
  const ok = Boolean(passed);
  checks.push({ name, passed: ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` ${detail}` : ""}`);
}
function read(relativePath) {
  const file = path.resolve(process.cwd(), relativePath);
  const exists = fs.existsSync(file);
  check(`FILE_EXISTS:${relativePath}`, exists);
  return exists ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
}

const list = read("src/components/workspace/value-objects/actual-value-objects-list.tsx");
const view = read("src/components/workspace/value-objects/value-object-catalog-views.tsx");
const route = read("src/app/api/value-objects/route.ts");
const detailRoute = read("src/app/api/value-objects/[id]/route.ts");
const detailPage = read("src/app/value-objects/[id]/page.tsx");
const intermediatePage = read("src/app/value-objects/[id]/new-intermediate/page.tsx");
const leafPage = read("src/app/value-objects/[id]/new-leaf/page.tsx");
const backfill = read("src/app/api/value-objects/localization/backfill/route.ts");
const localization = read("src/lib/localization/contentLocalization.ts");
const localizationServer = read("src/lib/localization/contentLocalization.server.ts");
const recovery = read("docs/recovery/ARCTOR_VO_TREE_MOBILE_L10_INSERT_V1_RU.md");
const evidence = read("docs/recovery/evidence/HELP_FILES/ARCTOR_VO_TREE_MOBILE_L10_INSERT_V1_EVIDENCE.json");

// Tree integrity / mobile hierarchy regression.
check("TREE_REAL_PARENT_LINK", view.includes("parent_value_object_id") && view.includes("childrenByParent"));
check("TREE_COLLAPSE_STATE", view.includes("activeExpandedIds") && view.includes("toggleExpanded"));
check("TREE_MOBILE_AND_DESKTOP_SHARE_ROWS", view.includes("{rows.map((row) =>") && view.includes("md:hidden") && view.includes("md:block"));
check("TREE_COLLAPSED_DESCENDANTS_NOT_REWALKED", !view.includes("for (const valueObject of sortObjects(valueObjects, sortMode, locale))") && view.includes("Do not re-walk descendants hidden by a collapsed ancestor"));
check("TREE_LEAF_NOT_BRANCH", view.includes('role !== "leaf" ? renderInsertControl(row, true) : null') && view.includes('role !== "leaf" ? ('));

// Inline insert controls use existing controlled authoring routes only.
check("INSERT_PLUS_ICON", view.includes("Plus,") && view.includes("<Plus size={11}"));
check("INSERT_CONTROL_FUNCTION", view.includes("function renderInsertControl(row: TreeRow, mobile: boolean)"));
check("INSERT_INTERMEDIATE_ROUTE", view.includes("/new-intermediate"));
check("INSERT_LEAF_ROUTE", view.includes("/new-leaf"));
check("INSERT_ROOT_INTERMEDIATE_ONLY", view.includes('role === "root"') && view.includes('role === "intermediate"'));
check("INSERT_DESKTOP", view.includes("renderInsertControl(row, false)"));
check("INSERT_MOBILE", view.includes("renderInsertControl(row, true)"));
check("INSERT_CORPORATE_STYLE", view.includes("#3b6ef8") && view.includes("#dfe4ff") && view.includes("#eef2ff"));
check("INSERT_SEVEN_LOCALES", [
  'addChild: "Add child object"',
  'addChild: "Dodaj obiekt podrzędny"',
  'addChild: "Добавить дочерний объект"',
  'addChild: "Додати дочірній об’єкт"',
  'addChild: "Untergeordnetes Objekt hinzufügen"',
  'addChild: "Añadir objeto hijo"',
  'addChild: "Přidat podřízený objekt"',
].every((token) => view.includes(token)));

// Universal content localization policy must remain the source of truth.
check("L10_SUPPORTED_LOCALES", localization.includes('ARCTOR_CONTENT_LOCALES = ["en", "pl", "ru", "uk", "de", "es", "cs"]'));
check("L10_SCHEMA_V2", localization.includes("ARCTOR_LOCALIZED_CONTENT_SCHEMA_VERSION = 2"));
check("L10_HUMAN_LOCALES", localization.includes("humanLocales") && localization.includes("lastEditedLocale"));
check("L10_VALUE_OBJECT_TABLE_SUPPORTED", localizationServer.includes('"organizations" | "offers" | "activity_events" | "value_objects"'));
check("L10_BATCH_RUNTIME", localizationServer.includes("generateLocalizedContentBatch") && localizationServer.includes("ARCTOR_CONTENT_LOCALIZATION_RUNTIME"));

// Actor-owned observation objects now resolve stored localizedContent just like global system objects.
check("LIST_ACTOR_LOCALIZATION_RESOLVER", route.includes("localizeActorOwnedObservationObject") && route.includes("resolveLocalizedContentFields"));
check("LIST_GLOBAL_LOCALIZATION_RETAINED", route.includes("localizeGlobalSystemValueObject(valueObject, locale)"));
check("LIST_BACKFILL_FLAG", route.includes("localizationBackfillNeeded") && route.includes("readLocalizedContentEnvelope"));
check("CLIENT_AUTO_BACKFILL", list.includes("/api/value-objects/localization/backfill") && list.includes("refreshedResponse"));
check("CLIENT_BACKFILL_FAILS_SOFT", list.includes("if (backfillResponse.ok") && !list.includes("throw new Error(\"LOCALIZATION_BACKFILL"));

// Creation-time localization: no duplicate-risk retry is required if AI generation fails.
check("CREATE_LOCALIZATION_HELPER", route.includes("async function localizeCreatedObservationObject"));
check("CREATE_LOCALIZATION_FAILS_SOFT", route.includes('warning:\n        error instanceof Error') && route.includes('"VALUE_OBJECT_CONTENT_LOCALIZATION_FAILED"'));
check("CREATE_ROOT_LOCALIZED", route.includes('mode: branchActiveRequested ? "root_branch_active_v4"') && route.includes("contentLocalization"));
check("CREATE_INTERMEDIATE_LOCALIZED", route.includes('"intermediate_branch_active_v4"') && route.includes("contentLocalization"));
check("CREATE_LEAF_LOCALIZED", route.includes('"leaf_branch_active_v4"') && route.includes("contentLocalization"));

// Backfill is actor-scoped, hidden/commercial-safe, batched, metadata-preserving, and source-language aware.
check("BACKFILL_AUTH", backfill.includes("auth0.getSession") && backfill.includes("resolveActiveActorContext"));
check("BACKFILL_BATCH_5", backfill.includes("const BATCH_SIZE = 5") && backfill.includes("chunks(pending, BATCH_SIZE)"));
check("BACKFILL_EXISTING_ENVELOPE_SKIP", backfill.includes("readLocalizedContentEnvelope(row.metadata_json)"));
check("BACKFILL_GLOBAL_EXCLUDED", backfill.includes('row.scope_code !== "global"'));
check("BACKFILL_COMMERCIAL_EXCLUDED", backfill.includes('row.usage_scope !== "commercial"'));
check("BACKFILL_HIDDEN_EXCLUDED", backfill.includes("system_hidden_from_observation_ui") && backfill.includes('system_root_code !== "products_services"'));
check("BACKFILL_GENERATOR", backfill.includes("generateLocalizedContentBatch"));
check("BACKFILL_METADATA_MERGE", backfill.includes("...metadata") && backfill.includes("localizedContent: protectedSourceEnvelope"));
check("BACKFILL_SOURCE_LOCALE_PROTECTED", backfill.includes("detectedSourceLocale") && backfill.includes("humanLocales") && backfill.includes("lastEditedLocale"));
check("BACKFILL_ACTOR_WRITE_GUARD", backfill.includes('.eq("owner_user_id", actorContext.appUserId)') && backfill.includes('.eq("owner_actor_id", actorContext.actorId)'));
check("BACKFILL_NO_SCHEMA_WRITE", !backfill.includes("create table") && !backfill.includes("alter table") && !backfill.includes("drop table"));

// Detail surfaces and authoring-parent labels also resolve the same localizedContent envelope.
check("DETAIL_API_LOCALIZED", detailRoute.includes("resolveLocalizedContentFields") && detailRoute.includes("new URL(request.url).searchParams.get(\"locale\")"));
check("DETAIL_PAGE_LOCALIZED", detailPage.includes("resolveLocalizedContentFields") && detailPage.includes("metadata: valueObject.metadata_json"));
check("DETAIL_TREE_PATH_LOCALIZED", detailPage.includes("metadata: node.metadata_json") && detailPage.includes("metadata_json"));
check("INTERMEDIATE_PARENT_LOCALIZED", intermediatePage.includes("resolveLocalizedContentField") && intermediatePage.includes("localizedParentTitle"));
check("LEAF_PARENT_LOCALIZED", leafPage.includes("resolveLocalizedContentField") && leafPage.includes("localizedParentTitle"));

// Scope locks / recovery evidence.
check("NO_REACT_FLOW_YET", !view.includes("@xyflow/react") && !list.includes("@xyflow/react"));
check("NO_DB_SCHEMA_CHANGE_MARKER", recovery.includes("DB schema change: NONE") && evidence.includes('"dbSchemaChange": false'));
check("COMMERCIAL_PRODUCTS_SERVICES_PRESERVED", recovery.includes("Products & Services") && recovery.includes("не затраг"));
check("RECOVERY_BASELINE", recovery.includes("fb4e1150407e568e15818a16e458a6f7ac6ea146"));
check("RECOVERY_ROOT_CAUSE", recovery.includes("повторно") && recovery.includes("standalone"));
check("RECOVERY_TRANSLATION_POLICY", recovery.includes("localizedContent") && recovery.includes("humanLocales") && recovery.includes("7"));
check("RECOVERY_MIND_MAP_NEXT", recovery.includes("Mind Map") && recovery.includes("React Flow"));
check("EVIDENCE_SOURCE_ONLY", evidence.includes('"sourceOnly": true'));
check("EVIDENCE_MOBILE_FIX", evidence.includes('"mobileCollapseFix": true'));
check("EVIDENCE_LOCALIZATION", evidence.includes('"valueObjectLocalization": true'));
check("EVIDENCE_INLINE_INSERT", evidence.includes('"inlineTreeInsert": true'));

const failed = checks.filter((item) => !item.passed);
console.log(`SUMMARY total=${checks.length} passed=${checks.length - failed.length} failed=${failed.length}`);
if (failed.length > 0) process.exit(1);
