import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function gitText(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function headBlobSha(rel) {
  return gitText(["rev-parse", `HEAD:${rel}`]);
}

function worktreePathIsClean(rel) {
  return gitText(["status", "--porcelain=v1", "--", rel]) === "";
}

const checks = [];
function check(name, passed, detail = null) {
  checks.push({ name, passed: Boolean(passed), detail });
}

const contentServerPath =
  "src/lib/localization/contentLocalization.server.ts";
const helperPath =
  "src/lib/localization/valueObjectOnDemandLocalization.server.ts";
const apiPath = "src/app/api/value-objects/route.ts";
const detailPath = "src/app/value-objects/[id]/page.tsx";
const p2cPath =
  "src/app/api/value-objects/[id]/ontology-definition/route.ts";
const recoveryPath =
  "docs/recovery/ARCTOR_PLATFORM_LOCALIZATION_VALUE_OBJECT_ON_DEMAND_V1_RU_20260825.md";

const contentServer = read(contentServerPath);
const helper = read(helperPath);
const api = read(apiPath);
const detail = read(detailPath);

check(
  "01_target_locale_generator_parameter",
  contentServer.includes(
    "targetLocales?: ArctorContentLocale[];",
  ),
);

check(
  "02_dynamic_translation_schema",
  contentServer.includes(
    "function translationSchema(targetLocales: readonly ArctorContentLocale[])",
  ) &&
    contentServer.includes(
      "targetLocales.map((locale) =>",
    ) &&
    contentServer.includes(
      "required: [...targetLocales]",
    ),
);

check(
  "03_sanitizer_only_requested_targets",
  contentServer.includes(
    "targetLocales: readonly ArctorContentLocale[];",
  ) &&
    contentServer.includes(
      "for (const locale of input.targetLocales)",
    ),
);

check(
  "04_default_old_callers_still_all_locales",
  contentServer.includes(
    "input.targetLocales ?? ARCTOR_CONTENT_LOCALES",
  ),
);

check(
  "05_on_demand_helper_exists",
  exists(helperPath) &&
    helper.includes(
      'ARCTOR_VALUE_OBJECT_ON_DEMAND_LOCALIZATION_RUNTIME',
    ),
);

check(
  "06_helper_uses_universal_db_contract",
  helper.includes(
    '"register_platform_localization_source_v1"',
  ) &&
    helper.includes(
      '"get_platform_localization_batch_v1"',
    ) &&
    helper.includes(
      '"upsert_platform_localized_content_v1"',
    ),
);

check(
  "07_helper_requests_one_target_locale",
  helper.includes(
    "targetLocales: [targetLocale]",
  ) &&
    !helper.includes(
      "targetLocales: ARCTOR_CONTENT_LOCALES",
    ),
);

check(
  "08_helper_preserves_human_locales",
  helper.includes(
    'providerCode: "human"',
  ) &&
    helper.includes(
      'statusCode: "needs_review"',
    ) &&
    helper.includes(
      "humanLocked: true",
    ),
);

check(
  "09_helper_actor_scope_only",
  helper.includes(
    '.eq("owner_user_id", input.appUserId)',
  ) &&
    helper.includes(
      '.eq("owner_actor_id", input.actorId)',
    ),
);

check(
  "10_catalog_integrated",
  api.includes(
    "ensureActorValueObjectLocalizationsV1",
  ) &&
    api.includes(
      "ownedLocalization.fieldsById",
    ),
);

check(
  "11_detail_integrated",
  detail.includes(
    "ensureActorValueObjectLocalizationsV1",
  ) &&
    detail.includes(
      "onDemandLocalization?.fieldsById.get(rawValueObject.id)",
    ),
);

check(
  "12_tree_integrated",
  detail.includes(
    "treeLocalization.fieldsById.get(node.id)",
  ) &&
    detail.includes(
      'fieldCodes: ["title"]',
    ),
);

check(
  "13_global_system_path_preserved",
  api.includes("localizeGlobalSystemValueObject") &&
    detail.includes("localizeGlobalSystemValueObject"),
);

check(
  "14_no_client_metadata_reexpansion",
  api.includes(
    "read_actor_value_object_catalog_localized_v1",
  ) &&
    api.includes(
      "public_image_url",
    ),
);

const p2cHeadBlob = headBlobSha(p2cPath);
const p2cWorktreeClean = worktreePathIsClean(p2cPath);

check(
  "15_p2c_route_untouched",
  p2cHeadBlob ===
    "b2eb2f36994a81781c22ae45be0339ae8e398b93" &&
    p2cWorktreeClean,
  {
    headBlob: p2cHeadBlob,
    worktreeClean: p2cWorktreeClean,
  },
);

check(
  "16_recovery_document_present",
  exists(recoveryPath),
);

check(
  "17_no_mass_db_backfill",
  !helper.includes(".update({ metadata_json") &&
    !helper.includes("ARCTOR_CONTENT_LOCALES.map"),
);

check(
  "18_source_unknown_is_fail_safe",
  helper.includes(
    "VALUE_OBJECT_ON_DEMAND_SOURCE_LOCALE_UNKNOWN",
  ),
);

check(
  "19_source_registry_is_batch_read_before_write",
  helper.includes(
    '.from("platform_localization_sources_v1")',
  ) &&
    helper.includes(
      '"entity_key,field_code,source_locale_code,source_revision"',
    ) &&
    helper.includes(
      "registeredByField",
    ),
);

check(
  "20_unchanged_source_skips_register_rpc",
  helper.includes(
    "existing?.source_locale_code === desired.sourceLocale",
  ) &&
    helper.includes(
      "existing.source_revision === desired.sourceRevision",
    ) &&
    helper.includes(
      "continue;",
    ),
);

check(
  "21_normal_source_read_excludes_metadata_json",
  helper.includes(
    '"id,title,description,owner_user_id,owner_actor_id,scope_code,origin_type_code"',
  ) &&
    !helper.includes(
      '"id,title,description,metadata_json,owner_user_id,owner_actor_id,scope_code,origin_type_code"',
    ),
);

check(
  "22_metadata_json_is_legacy_bootstrap_only",
  helper.includes(
    "metadataBootstrapIds",
  ) &&
    helper.includes(
      '.select("id,metadata_json")',
    ) &&
    helper.includes(
      "VALUE_OBJECT_ON_DEMAND_LEGACY_METADATA_READ_FAILED",
    ),
);

check(
  "23_registered_source_locale_avoids_metadata_detection",
  helper.includes(
    "registeredLocales.size === 1",
  ) &&
    helper.includes(
      ": sourceLocaleFromRow(row)",
    ),
);

check(
  "24_supabase_import_matches_repository_layout",
  helper.includes(
    'import { supabase } from "../../../lib/supabase";',
  ) &&
    !helper.includes(
      'import { supabase } from "../supabase";',
    ),
);

const failed = checks.filter((item) => !item.passed);
console.log(
  JSON.stringify(
    {
      release:
        "ARCTOR_PLATFORM_LOCALIZATION_VALUE_OBJECT_ON_DEMAND_SOURCE_INTEGRATION_V1",
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      allPass: failed.length === 0,
      checks,
    },
    null,
    2,
  ),
);

process.exit(failed.length === 0 ? 0 : 1);
