import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relative) {
  return fs.readFileSync(
    path.join(root, relative),
    "utf8",
  );
}

function check(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    return;
  }

  console.log(`PASS ${name}`);
}

const server = read(
  "src/lib/reality-curator/consequence-constructor.server.ts",
);

const api = read(
  "src/app/api/admin/consequence-constructor/route.ts",
);

const page = read(
  "src/app/admin/consequence-constructor/page.tsx",
);

const canonicalCatalog = read(
  "src/lib/activity/typical-activity-catalog.server.ts",
);

const recovery = read(
  "docs/recovery/ARCTOR_CONSEQUENCE_CANONICAL_LOCALIZED_TYPICAL_ACTIVITY_CATALOG_FIX_V1_RU_20260918.md",
);

check(
  "CANONICAL_LOADER_REUSED",
  server.includes(
    "loadSystemTypicalActivityCatalogV1",
  ),
);

check(
  "CANONICAL_METADATA_CONTRACT_REMAINS",
  canonicalCatalog.includes(
    "ARCTOR_TYPICAL_ACTIVITY_METADATA_V1",
  ) &&
    canonicalCatalog.includes(
      'kind: "typical_activity"',
    ) &&
    canonicalCatalog.includes(
      'catalogVersion: "reality_model_v1"',
    ),
);

check(
  "BROAD_LIST_QUERY_REMOVED",
  !server.includes(
    '.select("id,title,short_title")\n    .eq("template_scope", "system")',
  ),
);

check(
  "LIST_ACCEPTS_LOCALE",
  server.includes(
    "listConsequenceTemplateOptionsV1(\n  localeValue?: unknown",
  ),
);

check(
  "LOCALIZATION_METADATA_USED",
  server.includes(
    "curatorSystemMaterializationV1",
  ) &&
    server.includes(
      "materialization.localizations",
    ),
);

check(
  "LOCALIZATION_FALLBACK_ORDER",
  server.includes(
    "text(localized.title) ||",
  ) &&
    server.includes(
      "text(english.title) ||",
    ) &&
    server.includes(
      "text(template.title) ||",
    ),
);

check(
  "API_PASSES_LOCALE_TO_LIST",
  api.includes(
    "listConsequenceTemplateOptionsV1(\n        locale,",
  ),
);

check(
  "PAGE_PASSES_LOCALE_TO_BIND",
  page.includes(
    'action: "bind_template",',
  ) &&
    page.includes(
      "templateId,\n          locale,",
    ),
);

check(
  "BIND_RECHECKS_CANONICAL_CATALOG",
  server.includes(
    "const canonicalTemplate =",
  ) &&
    server.includes(
      'row.id === input.templateId',
    ) &&
    server.includes(
      '"CONSEQUENCE_TEMPLATE_NOT_AVAILABLE"',
    ),
);

check(
  "LOCALIZED_BINDING_SNAPSHOT",
  server.includes(
    "selectedTemplateTitle: localized.title",
  ) &&
    server.includes(
      "selectedTemplateCanonicalTitle: localized.canonicalTitle",
    ) &&
    server.includes(
      "selectedTemplateLocale: localized.locale",
    ),
);

check(
  "NO_DATABASE_MIGRATION",
  !server.includes(
    "create table",
  ) &&
    !api.includes(
      "create table",
    ),
);

check(
  "RECOVERY_PRESENT",
  recovery.includes(
    "loadSystemTypicalActivityCatalogV1()",
  ) &&
    recovery.includes(
      "Подъём по лестнице",
    ),
);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(
  "VALIDATOR=PASS_12_12",
);