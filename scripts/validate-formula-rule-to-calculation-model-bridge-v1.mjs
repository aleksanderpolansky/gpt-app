import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function check(name, condition) {
  if (!condition) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${name}`);
}

const api = read("src/app/api/admin/formula-rules/route.ts");
const builder = read("src/app/admin/formula-builder/page.tsx");
const bridge = read(
  "src/lib/reality-curator/calculation-model-rule-bridge.server.ts",
);
const migration = read(
  "supabase/migrations/20260918093000_formula_rule_to_calculation_model_bridge_v1.sql",
);
const formulaContract = read(
  "src/lib/reality-curator/formula-rule-registry.contract.ts",
);
const catalogContract = read(
  "src/lib/reality-curator/calculation-model-catalog.contract.ts",
);
const recovery = read(
  "docs/recovery/ARCTOR_F1_FORMULA_RULE_TO_CATALOG_BRIDGE_V1_RU_20260918.md",
);

check(
  "ONE_FORMULA_LANGUAGE",
  formulaContract.includes(
    'FORMULA_EXPRESSION_LANGUAGE = "arctor_formula_v1"',
  ) &&
    catalogContract.includes(
      'from "./formula-rule-registry.contract"',
    ),
);

check(
  "BRIDGE_RPC_CLIENT",
  bridge.includes(
    "materialize_published_formula_rule_calculation_model_f1_v1",
  ),
);

check(
  "API_EXPLICIT_ACTION",
  api.includes(
    'action === "materialize_calculation_model"',
  ),
);

check(
  "BUILDER_EXPLICIT_BUTTON",
  builder.includes(
    "Добавить в каталог формул",
  ) &&
    builder.includes(
      "addPublishedFormulaToCatalog",
    ),
);

check(
  "PUBLISHED_ONLY_DB_GATE",
  migration.includes(
    "CALCULATION_MODEL_BRIDGE_RULE_VERSION_NOT_PUBLISHED",
  ),
);

check(
  "RULE_VERSION_LINK",
  migration.includes(
    "calculation_model_version_id = v_model_version_id",
  ),
);

check(
  "IDEMPOTENT_EXISTING_LINK",
  migration.includes(
    "v_rule_version.calculation_model_version_id is not null",
  ) &&
    migration.includes(
      "'duplicate', true",
    ),
);

check(
  "ABSTRACT_INPUT_CONTRACT",
  migration.includes(
    "'valueType', v_value_type",
  ) &&
    migration.includes(
      "'unitCode', nullif(v_param.canonical_unit_code, '')",
    ),
);

check(
  "EVIDENCE_CARRIED",
  migration.includes(
    "'testEvidence', v_rule_version.metadata_json -> 'testEvidence'",
  ) &&
    migration.includes(
      "'publishAudit', v_rule_version.metadata_json -> 'publishAudit'",
    ),
);

check(
  "NO_EXECUTOR_ENABLE",
  api.includes(
    "formulaExecutionEnabled: false",
  ) &&
    api.includes(
      "factWriteEnabled: false",
    ),
);

check(
  "SERVICE_ROLE_ONLY_RPC",
  migration.includes(
    "grant execute on function",
  ) &&
    migration.includes(
      "to service_role",
    ),
);

check(
  "NO_AUTOMATIC_MATERIALIZATION",
  !api.includes(
    'publish_version" &&'
  ),
);

check(
  "RECOVERY_RESOLVED",
  recovery.includes(
    "807db78d68c292b07c684f2171133c47dfad9328",
  ) &&
    recovery.includes(
      "supabase/migrations/20260918093000_formula_rule_to_calculation_model_bridge_v1.sql",
    ) &&
    recovery.includes(
      "arctor_formula_v1",
    ),
);

check(
  "RECOVERY_NO_PLACEHOLDERS",
  !recovery.includes("$State") &&
    !recovery.includes("$ExpectedHead") &&
    !recovery.includes("$MigrationRel"),
);

check(
  "RECOVERY_NO_CONTROL_CORRUPTION",
  !recovery.includes("\u0007") &&
    !recovery.includes("\uFFFD"),
);

check(
  "ACTION_DOCUMENTED_IN_ALLOWED_ACTIONS",
  (
    api.match(
      /"materialize_calculation_model"/g,
    ) ?? []
  ).length === 3,
);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("VALIDATOR=PASS_16_16");