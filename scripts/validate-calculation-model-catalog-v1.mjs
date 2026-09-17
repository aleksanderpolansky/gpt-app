import fs from "node:fs";
import path from "node:path";

const root =
  process.cwd();

function read(relative) {
  return fs.readFileSync(
    path.join(
      root,
      relative,
    ),
    "utf8",
  );
}

function pass(
  name,
  condition,
) {
  if (!condition) {
    console.error(
      `FAIL ${name}`,
    );

    process.exitCode =
      1;

    return;
  }

  console.log(
    `PASS ${name}`,
  );
}

const contract =
  read(
    "src/lib/reality-curator/calculation-model-catalog.contract.ts",
  );

const registryContract =
  read(
    "src/lib/reality-curator/formula-rule-registry.contract.ts",
  );

const server =
  read(
    "src/lib/reality-curator/calculation-model-catalog.server.ts",
  );

const api =
  read(
    "src/app/api/admin/calculation-models/route.ts",
  );

const page =
  read(
    "src/app/admin/formula-catalog/page.tsx",
  );

const migration =
  read(
    "supabase/migrations/20260917180000_calculation_model_catalog_v1.sql",
  );


pass(
  "ONE_CANONICAL_FORMULA_LANGUAGE",
  contract.includes(
    'from "./formula-rule-registry.contract"',
  ) &&
    contract.includes(
      "FORMULA_EXPRESSION_LANGUAGE",
    ) &&
    contract.includes(
      "isFormulaExpressionNodeV1",
    ),
);


pass(
  "NO_SECOND_OPERATION_REGISTRY",
  !contract.includes(
    "FORMULA_OPERATIONS =",
  ) &&
    !contract.includes(
      "CALCULATION_MODEL_OPERATIONS",
    ),
);


pass(
  "REGISTRY_STILL_CANONICAL_ARCTOR_FORMULA_V1",
  registryContract.includes(
    'FORMULA_EXPRESSION_LANGUAGE = "arctor_formula_v1"',
  ),
);


pass(
  "CATALOG_SERIES_TABLE",
  migration.includes(
    "calculation_model_series_v1",
  ),
);


pass(
  "CATALOG_VERSION_TABLE",
  migration.includes(
    "calculation_model_versions_v1",
  ),
);


pass(
  "CONSEQUENCE_RULE_REFERENCE",
  migration.includes(
    "activity_fact_calculation_rule_versions_v1",
  ) &&
    migration.includes(
      "calculation_model_version_id",
    ),
);


pass(
  "PARAMETER_ROUTE_REFERENCE",
  migration.includes(
    "activity_template_parameter_routes_v2",
  ) &&
    migration.includes(
      "calculation_model_binding_json",
    ),
);


pass(
  "NO_FORMULA_EXECUTION",
  !migration.includes(
    "activity_object_facts"
  ) &&
    !migration.includes(
      "activity_event_measures"
    ),
);


pass(
  "ADMIN_API_READ_MODEL",
  api.includes(
    "listCalculationModelCatalogV1",
  ) &&
    api.includes(
      "requirePlatformAdmin",
    ),
);


pass(
  "CATALOG_SCOPE_TABS",
  page.includes(
    "Мои формулы",
  ) &&
    page.includes(
      "Системные формулы",
    ),
);


pass(
  "CATALOG_EXPRESSION_VISIBLE",
  page.includes(
    "expression_contract_json",
  ),
);


pass(
  "CATALOG_EVIDENCE_VISIBLE",
  page.includes(
    "evidence_contract_json",
  ),
);


pass(
  "SERVER_USER_SCOPE_FILTER",
  server.includes(
    'input.scopeCode === "user"',
  ) &&
    server.includes(
      '"owner_user_id"',
    ),
);


if (
  process.exitCode
) {
  process.exit(
    process.exitCode,
  );
}

console.log(
  "VALIDATOR=PASS_13_13",
);