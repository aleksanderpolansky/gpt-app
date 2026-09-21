import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const RELEASE = "ARCTOR_PROTEIN_INTAKE_ONTOLOGY_DIRECT_APPLY_V1_20260921";
const APPLY = process.argv.includes("--apply");

const reportArgIndex = process.argv.indexOf("--report");
const REPORT_PATH =
  reportArgIndex >= 0 && process.argv[reportArgIndex + 1]
    ? path.resolve(process.argv[reportArgIndex + 1])
    : null;

const IDS = {
  systemsRoot: "1f86ed22-e220-562a-b2a4-341abf5c5780",
  statesRoot: "6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a",
  states: "2613b07c-36fb-537f-8cd8-058e15df28f7",
  actionsRoot: "5b0746a5-0089-5ef4-8cb9-f8279c0ca233",
  humanActivity: "2216b487-4a8c-50bd-a875-ae5f59036bc2",
};

const NODES = [
  {
    code: "material_objects_substances",
    id: "cdbcf20b-944a-5d96-b4dc-bd2b279710ea",
    canonicalKey: "system.material_objects_and_substances.d467910c1d",
    role: "intermediate",
    parentId: IDS.systemsRoot,
    rootId: IDS.systemsRoot,
    facet: "ENTITY",
    kind: "generic_entity",
    relation: "is_a",
    parentRu: "Системы и структуры",
    parentEn: "Systems and Structures",
    titleRu: "Материальные объекты и вещества",
    titleEn: "Material objects and substances",
    descriptionRu:
      "Материальные объекты и вещества, существующие независимо от отдельных действий и наблюдений над ними.",
    descriptionEn:
      "Material objects and substances that exist independently of individual actions and observations of them.",
    commentRu:
      "Создано как общая структурная ветвь для физических объектов, веществ и продуктов, которые могут участвовать в действиях и иметь изменяемые состояния.",
    commentEn:
      "Created as a reusable structural branch for physical objects, substances and products that can participate in actions and have changing states.",
  },
  {
    code: "dietary_supplements",
    id: "bc553950-8ccf-576b-bff2-156955435f6c",
    canonicalKey: "system.dietary_supplements.c9ec3d9db4",
    role: "intermediate",
    parentId: "cdbcf20b-944a-5d96-b4dc-bd2b279710ea",
    rootId: IDS.systemsRoot,
    facet: "ENTITY",
    kind: "generic_entity",
    relation: "is_a",
    parentRu: "Материальные объекты и вещества",
    parentEn: "Material objects and substances",
    titleRu: "Пищевые добавки",
    titleEn: "Dietary supplements",
    descriptionRu:
      "Потребляемые продукты и вещества, используемые как пищевые добавки.",
    descriptionEn:
      "Consumable products and substances used as dietary supplements.",
    commentRu:
      "Создано как структурный вид потребляемых материальных продуктов и веществ для отделения пищевых добавок от обычной пищи и других объектов.",
    commentEn:
      "Created as a structural type of consumable material products and substances, separating dietary supplements from ordinary food and other objects.",
  },
  {
    code: "protein_supplement",
    id: "9776f0a8-b0c1-5caf-8844-9658f81b19cd",
    canonicalKey: "system.protein_supplement.20bbd97969",
    role: "leaf",
    parentId: "bc553950-8ccf-576b-bff2-156955435f6c",
    rootId: IDS.systemsRoot,
    facet: "ENTITY",
    kind: "generic_entity",
    relation: "is_a",
    parentRu: "Пищевые добавки",
    parentEn: "Dietary supplements",
    titleRu: "Протеиновая добавка",
    titleEn: "Protein supplement",
    descriptionRu:
      "Протеиновый продукт или смесь, употребляемые как пищевая добавка и являющиеся объектом действия употребления.",
    descriptionEn:
      "A protein product or mixture consumed as a dietary supplement and serving as the object of an intake action.",
    commentRu:
      "Создано как канонический системный объект самого протеинового продукта. Числовые значения порции в этом ОН не хранятся.",
    commentEn:
      "Created as the canonical system object for the protein product itself. Numeric serving values are not stored in this observation object.",
  },
  {
    code: "consumption_states",
    id: "7495e90b-8b56-5a4c-9ccc-0ed0bda70e2e",
    canonicalKey: "system.consumption_states.b84677b1e6",
    role: "intermediate",
    parentId: IDS.states,
    rootId: IDS.statesRoot,
    facet: "STATE",
    kind: "generic_state",
    relation: "is_a",
    parentRu: "Состояния",
    parentEn: "States",
    titleRu: "Состояния потребления",
    titleEn: "Consumption states",
    descriptionRu:
      "Текущие состояния и применимые настройки, характеризующие количество или другие параметры потребляемых объектов.",
    descriptionEn:
      "Current states and applicable settings characterizing quantities or other parameters of consumed objects.",
    commentRu:
      "Создано как ветвь состояний для изменяемых во времени параметров потребления, которые могут использоваться при интерпретации событий.",
    commentEn:
      "Created as a state branch for time-varying consumption parameters that can be used when interpreting events.",
  },
  {
    code: "current_protein_serving",
    id: "2446f05a-bee3-5844-91ba-ab63afa9f5a3",
    canonicalKey: "system.current_protein_supplement_serving.576eeac9a4",
    role: "leaf",
    parentId: "7495e90b-8b56-5a4c-9ccc-0ed0bda70e2e",
    rootId: IDS.statesRoot,
    facet: "STATE",
    kind: "generic_state",
    relation: "is_a",
    parentRu: "Состояния потребления",
    parentEn: "Consumption states",
    titleRu: "Текущая порция протеиновой добавки",
    titleEn: "Current protein supplement serving",
    descriptionRu:
      "Действующий для пользователя размер одной порции протеиновой добавки на определённый момент времени. Числовое значение хранится в факте-срезе, а не в объекте наблюдения.",
    descriptionEn:
      "The user's currently applicable serving size of a protein supplement at a specific point in time. The numeric value is stored in a snapshot fact, not in the observation object.",
    commentRu:
      "Создано как лист состояния для факт-среза действующей порции. Параметр Mass хранит 35 г, 50 г или другое значение с effective_at.",
    commentEn:
      "Created as the state leaf for the currently applicable serving snapshot. The Mass parameter stores 35 g, 50 g or another value with effective_at.",
  },
  {
    code: "nutrition_consumption",
    id: "cdfc2985-d327-5ac2-ab60-dee697634162",
    canonicalKey: "system.nutrition_and_consumption.24bc2f80b5",
    role: "intermediate",
    parentId: IDS.humanActivity,
    rootId: IDS.actionsRoot,
    facet: "PROCESS",
    kind: "generic_process",
    relation: "is_a",
    parentRu: "Деятельность человека",
    parentEn: "Human activity",
    titleRu: "Питание и потребление",
    titleEn: "Nutrition and consumption",
    descriptionRu:
      "Действия человека, связанные с употреблением пищи, напитков, пищевых добавок и других потребляемых веществ.",
    descriptionEn:
      "Human actions involving consumption of food, beverages, dietary supplements, and other consumable substances.",
    commentRu:
      "Создано как системная ветвь пользовательских действий, связанных с питанием и потреблением.",
    commentEn:
      "Created as the system branch for user actions related to nutrition and consumption.",
  },
  {
    code: "dietary_supplement_intake",
    id: "9a2f93bb-ba2b-5711-8906-972571654023",
    canonicalKey: "system.dietary_supplement_intake.39f5598708",
    role: "intermediate",
    parentId: "cdfc2985-d327-5ac2-ab60-dee697634162",
    rootId: IDS.actionsRoot,
    facet: "PROCESS",
    kind: "generic_process",
    relation: "is_a",
    parentRu: "Питание и потребление",
    parentEn: "Nutrition and consumption",
    titleRu: "Приём пищевых добавок",
    titleEn: "Dietary supplement intake",
    descriptionRu: "Действия человека по употреблению пищевых добавок.",
    descriptionEn: "Human actions involving the intake of dietary supplements.",
    commentRu:
      "Создано как промежуточная ветвь для конкретных видов употребляемых пищевых добавок.",
    commentEn:
      "Created as an intermediate branch for specific types of dietary-supplement intake.",
  },
  {
    code: "protein_supplement_intake",
    id: "b6ae376a-89a9-5c7c-82b3-d72019e57dac",
    canonicalKey: "system.protein_supplement_intake.df29ab42ec",
    role: "leaf",
    parentId: "9a2f93bb-ba2b-5711-8906-972571654023",
    rootId: IDS.actionsRoot,
    facet: "PROCESS",
    kind: "generic_process",
    relation: "is_a",
    parentRu: "Приём пищевых добавок",
    parentEn: "Dietary supplement intake",
    titleRu: "Употребление протеиновой добавки",
    titleEn: "Protein supplement intake",
    descriptionRu:
      "Конкретный эпизод употребления протеиновой добавки пользователем.",
    descriptionEn:
      "A specific episode in which a user consumes a protein supplement.",
    commentRu:
      "Создано как лист действия для типовой активности «Выпил протеин». Параметр Mass хранит массу реально употреблённой порции как исходный факт активности.",
    commentEn:
      "Created as the action leaf for the typical activity “Drank protein supplement”. Mass stores the actually consumed serving mass as a source fact.",
  },
];

const TARGETS = {
  proteinSupplement: "9776f0a8-b0c1-5caf-8844-9658f81b19cd",
  currentProteinServing: "2446f05a-bee3-5844-91ba-ab63afa9f5a3",
  proteinSupplementIntake: "b6ae376a-89a9-5c7c-82b3-d72019e57dac",
};

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const body = fs.readFileSync(file, "utf8");
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    if (process.env[key] !== undefined) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

for (const file of [".env.local", ".env.production.local", ".env.production", ".env"]) {
  loadEnvFile(path.resolve(file));
}

const supabaseUrl =
  (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const serviceRoleKey =
  (process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    "").trim();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "MISSING_SERVICE_ROLE_ENV: expected SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function stableUuid(seed) {
  const bytes = Buffer.from(
    crypto.createHash("sha256").update(seed, "utf8").digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepReplace(value, replacements) {
  if (typeof value === "string") {
    return replacements.has(value) ? replacements.get(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepReplace(item, replacements));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = deepReplace(item, replacements);
    }
    return out;
  }
  return value;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function assertFoundation() {
  const expected = [
    [IDS.systemsRoot, "system.systems_and_structures.1295aaa773", "root", null],
    [IDS.statesRoot, "system.states_and_needs.6a08d8afe9", "root", null],
    [IDS.states, "system.states.bf2031ffd0", "intermediate", IDS.statesRoot],
    [IDS.actionsRoot, "domain.actions_processes", "root", null],
    [
      IDS.humanActivity,
      "system.human_activity.2bebe7751a",
      "intermediate",
      IDS.actionsRoot,
    ],
  ];

  const { data, error } = await supabase
    .from("value_objects")
    .select(
      "id,canonical_key,parent_value_object_id,ontology_node_role_code,scope_code,origin_type_code,status",
    )
    .in("id", expected.map((item) => item[0]));

  if (error) throw new Error(`FOUNDATION_READ_FAILED:${error.message}`);

  for (const [id, canonicalKey, role, parentId] of expected) {
    const row = (data || []).find((item) => item.id === id);
    if (
      !row ||
      row.canonical_key !== canonicalKey ||
      row.ontology_node_role_code !== role ||
      row.parent_value_object_id !== parentId ||
      row.scope_code !== "global" ||
      row.origin_type_code !== "system_model" ||
      row.status !== "active"
    ) {
      throw new Error(`FOUNDATION_CONTRACT_MISMATCH:${canonicalKey}`);
    }
  }
}

async function loadLocalizationTemplate() {
  const { data, error } = await supabase
    .from("value_objects")
    .select("id,title,description,metadata_json")
    .eq("id", IDS.humanActivity)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `LOCALIZATION_TEMPLATE_READ_FAILED:${error?.message || "missing Human activity"}`,
    );
  }

  const metadata = asRecord(data.metadata_json);
  const draft = asRecord(metadata.curator_system_draft_v1);
  const localizations = asRecord(draft.localizations);
  const en = asRecord(localizations.en);
  const ru = asRecord(localizations.ru);

  if (!metadata.localizedContent || !metadata.contentLocalizationRuntime) {
    throw new Error("LOCALIZATION_TEMPLATE_CONTRACT_MISSING");
  }

  return {
    metadata,
    titleEn: normalizeText(en.title) || normalizeText(data.title),
    descriptionEn: normalizeText(en.description) || normalizeText(data.description),
    titleRu: normalizeText(ru.title),
    descriptionRu: normalizeText(ru.description),
  };
}

function localizedContentForSpec(spec, template) {
  const localizedContent = deepClone(template.metadata.localizedContent);
  const variants = asRecord(localizedContent.variants);

  localizedContent.variants = {
    ...variants,
    en: {
      ...asRecord(variants.en),
      title: spec.titleEn,
      description: spec.descriptionEn,
    },
    ru: {
      ...asRecord(variants.ru),
      title: spec.titleRu,
      description: spec.descriptionRu,
    },
  };

  return localizedContent;
}

function buildMetadata(spec, template) {
  const now = new Date().toISOString();
  const localizedContent = localizedContentForSpec(spec, template);

  return {
    localizedContent,
    contentLocalizationRuntime:
      template.metadata.contentLocalizationRuntime,
    systemValueObjectLocalizationRuntime:
      template.metadata.systemValueObjectLocalizationRuntime ||
      "ARCTOR_SYSTEM_VALUE_OBJECT_CANONICAL_ENGLISH_LOCALIZATION_V1",
    curator_system_draft_v1: {
      contract:
        "ARCTOR_REALITY_MODEL_CURATOR_ACTIVITY_TEMPLATE_BUILDER_V2_CANONICAL_ENGLISH_LOCALIZATION",
      requestHash: crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            canonicalKey: spec.canonicalKey,
            parentId: spec.parentId,
            rootId: spec.rootId,
            role: spec.role,
            titleRu: spec.titleRu,
            titleEn: spec.titleEn,
            descriptionRu: spec.descriptionRu,
            descriptionEn: spec.descriptionEn,
            relation: spec.relation,
          }),
          "utf8",
        )
        .digest("hex")
        .toUpperCase(),
      rawSignalId: null,
      curatorAppUserId: null,
      curatorAdminId: null,
      curatorRole: "system_code_apply",
      createdAt: now,
      publicationState: "published_by_confirmed_code_apply",
      publishedAt: now,
      canonicalKeyMode: "deterministic_locked_v1",
      canonicalLocale: "en",
      creationLocale: "ru",
      localizationState: "pending",
      localizationLocales: ["en", "ru"],
      localizationMissingLocales: ["pl", "uk", "de", "es", "cs"],
      localizationAttemptCount: 0,
      localizationQueuedAt: now,
      localizationLastAttemptAt: null,
      localizationNextAttemptAt: now,
      localizationLastError: null,
      localizationCompletedAt: null,
      localizationRequestedByUserId: null,
      localizationRequestedByActorId: null,
      nodeRole: spec.role,
      localizations: {
        en: {
          title: spec.titleEn,
          description: spec.descriptionEn,
        },
        ru: {
          title: spec.titleRu,
          description: spec.descriptionRu,
        },
      },
    },
    systemMigrationV1: {
      release: RELEASE,
      confirmedByProjectOwner: true,
      createdAt: now,
      creationCommentRu: spec.commentRu,
      creationCommentEn: spec.commentEn,
    },
    proteinIntakePilotV1: {
      release: RELEASE,
      manualFields: {
        accessProperty: "system",
        structuralRole: spec.role,
        parentValueObjectId: spec.parentId,
        parentTitleRu: spec.parentRu,
        parentTitleEn: spec.parentEn,
        titleRu: spec.titleRu,
        titleEn: spec.titleEn,
        definitionRu: spec.descriptionRu,
        definitionEn: spec.descriptionEn,
        hierarchyRelationCode: spec.relation,
        creationCommentRu: spec.commentRu,
        creationCommentEn: spec.commentEn,
      },
    },
  };
}

function validateNode(row, spec) {
  const metadata = asRecord(row.metadata_json);
  const pilot = asRecord(metadata.proteinIntakePilotV1);
  const manual = asRecord(pilot.manualFields);
  const draft = asRecord(metadata.curator_system_draft_v1);
  const localizations = asRecord(draft.localizations);
  const en = asRecord(localizations.en);
  const ru = asRecord(localizations.ru);
  const localizedContent = asRecord(metadata.localizedContent);
  const runtimeVariants = asRecord(localizedContent.variants);
  const runtimeEn = asRecord(runtimeVariants.en);
  const runtimeRu = asRecord(runtimeVariants.ru);

  const checks = {
    id: row.id === spec.id,
    title: row.title === spec.titleEn,
    description: row.description === spec.descriptionEn,
    canonical_key: row.canonical_key === spec.canonicalKey,
    parent: row.parent_value_object_id === spec.parentId,
    root: row.root_value_object_id === spec.rootId,
    structural: row.node_role_code === "structural",
    branch: row.branch_type_code === "ontology_v1",
    role: row.ontology_node_role_code === spec.role,
    facet: row.facet_code === spec.facet,
    kind: row.object_kind_code === spec.kind,
    relation: row.hierarchy_relation_code === spec.relation,
    scope: row.scope_code === "global",
    origin: row.origin_type_code === "system_model",
    owner_user: row.owner_user_id === null,
    owner_actor: row.owner_actor_id === null,
    created_by_actor: row.created_by_actor_id === null,
    status: row.status === "active",
    ru_title: normalizeText(ru.title) === spec.titleRu,
    ru_description: normalizeText(ru.description) === spec.descriptionRu,
    en_title: normalizeText(en.title) === spec.titleEn,
    en_description: normalizeText(en.description) === spec.descriptionEn,
    runtime_ru_title: normalizeText(runtimeRu.title) === spec.titleRu,
    runtime_ru_description:
      normalizeText(runtimeRu.description) === spec.descriptionRu,
    runtime_en_title: normalizeText(runtimeEn.title) === spec.titleEn,
    runtime_en_description:
      normalizeText(runtimeEn.description) === spec.descriptionEn,
    comment_ru: normalizeText(manual.creationCommentRu) === spec.commentRu,
    comment_en: normalizeText(manual.creationCommentEn) === spec.commentEn,
  };

  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);

  if (failed.length) {
    throw new Error(`NODE_CONTRACT_CONFLICT:${spec.code}:${failed.join(",")}`);
  }
}


function runtimeLocalizationMatches(row, spec) {
  const metadata = asRecord(row.metadata_json);
  const localizedContent = asRecord(metadata.localizedContent);
  const variants = asRecord(localizedContent.variants);
  const en = asRecord(variants.en);
  const ru = asRecord(variants.ru);

  return (
    normalizeText(en.title) === spec.titleEn &&
    normalizeText(en.description) === spec.descriptionEn &&
    normalizeText(ru.title) === spec.titleRu &&
    normalizeText(ru.description) === spec.descriptionRu
  );
}

async function repairRuntimeLocalizationIfNeeded(row, spec, template) {
  if (runtimeLocalizationMatches(row, spec)) {
    return {
      row,
      localizationStatus: "already_correct",
    };
  }

  if (!APPLY) {
    return {
      row,
      localizationStatus: "would_repair",
    };
  }

  const metadata = deepClone(asRecord(row.metadata_json));
  metadata.localizedContent = localizedContentForSpec(spec, template);

  const draft = asRecord(metadata.curator_system_draft_v1);
  metadata.curator_system_draft_v1 = {
    ...draft,
    localizationState: "pending",
    localizationLocales: ["en", "ru"],
    localizationMissingLocales: ["pl", "uk", "de", "es", "cs"],
    localizationQueuedAt: new Date().toISOString(),
    localizations: {
      ...asRecord(draft.localizations),
      en: {
        title: spec.titleEn,
        description: spec.descriptionEn,
      },
      ru: {
        title: spec.titleRu,
        description: spec.descriptionRu,
      },
    },
  };

  const { error: updateError } = await supabase
    .from("value_objects")
    .update({
      metadata_json: metadata,
    })
    .eq("id", spec.id);

  if (updateError) {
    throw new Error(
      `NODE_RUNTIME_LOCALIZATION_REPAIR_FAILED:${spec.code}:${updateError.message}`,
    );
  }

  const { data: repaired, error: readError } = await supabase
    .from("value_objects")
    .select(
      "id,title,description,canonical_key,parent_value_object_id,root_value_object_id,node_role_code,branch_type_code,ontology_node_role_code,facet_code,object_kind_code,hierarchy_relation_code,scope_code,origin_type_code,owner_user_id,owner_actor_id,created_by_actor_id,status,metadata_json",
    )
    .eq("id", spec.id)
    .maybeSingle();

  if (readError || !repaired) {
    throw new Error(
      `NODE_RUNTIME_LOCALIZATION_REPAIR_POSTCHECK_FAILED:${spec.code}:${readError?.message || "missing"}`,
    );
  }

  if (!runtimeLocalizationMatches(repaired, spec)) {
    throw new Error(
      `NODE_RUNTIME_LOCALIZATION_REPAIR_NOT_EFFECTIVE:${spec.code}`,
    );
  }

  return {
    row: repaired,
    localizationStatus: "repaired",
  };
}

async function ensureNode(spec, template) {
  const { data: byKey, error: byKeyError } = await supabase
    .from("value_objects")
    .select(
      "id,title,description,canonical_key,parent_value_object_id,root_value_object_id,node_role_code,branch_type_code,ontology_node_role_code,facet_code,object_kind_code,hierarchy_relation_code,scope_code,origin_type_code,owner_user_id,owner_actor_id,created_by_actor_id,status,metadata_json",
    )
    .eq("canonical_key", spec.canonicalKey)
    .limit(2);

  if (byKeyError) {
    throw new Error(`NODE_READ_FAILED:${spec.code}:${byKeyError.message}`);
  }

  if ((byKey || []).length > 1) {
    throw new Error(`NODE_CANONICAL_KEY_NOT_UNIQUE:${spec.code}`);
  }

  if (byKey?.[0]) {
    const repaired = await repairRuntimeLocalizationIfNeeded(
      byKey[0],
      spec,
      template,
    );
    validateNode(repaired.row, spec);
    return {
      code: spec.code,
      id: spec.id,
      status: "reused",
      localizationStatus: repaired.localizationStatus,
    };
  }

  const { data: byId, error: byIdError } = await supabase
    .from("value_objects")
    .select("id,canonical_key")
    .eq("id", spec.id)
    .limit(1);

  if (byIdError) {
    throw new Error(`NODE_ID_READ_FAILED:${spec.code}:${byIdError.message}`);
  }
  if (byId?.[0]) {
    throw new Error(`NODE_ID_COLLISION:${spec.code}:${byId[0].canonical_key}`);
  }

  if (!APPLY) {
    return { code: spec.code, id: spec.id, status: "would_create" };
  }

  const metadata = buildMetadata(spec, template);

  const { error: insertError } = await supabase.from("value_objects").insert({
    id: spec.id,
    owner_actor_id: null,
    value_type: "other",
    title: spec.titleEn,
    description: spec.descriptionEn,
    organization_id: null,
    commercial_usage: "none",
    parent_value_object_id: spec.parentId,
    actor_id: null,
    app_user_id: null,
    owner_user_id: null,
    visibility: "public",
    source: "manual",
    usage_scope: "private",
    created_by_actor_id: null,
    object_kind: "other",
    node_role_code: "structural",
    branch_type_code: "ontology_v1",
    root_value_object_id: spec.rootId,
    instance_of_value_object_id: null,
    privacy_level: "public",
    sensitivity_level: "standard",
    status: "active",
    canonical_key: spec.canonicalKey,
    facet_code: spec.facet,
    object_kind_code: spec.kind,
    ontology_node_role_code: spec.role,
    hierarchy_relation_code: spec.relation,
    scope_code: "global",
    visibility_code: "public",
    privacy_class_code: "public_ontology",
    definition_version: 1,
    origin_type_code: "system_model",
    metadata_json: metadata,
    identity_attributes_json: {},
  });

  if (insertError) {
    throw new Error(`NODE_CREATE_FAILED:${spec.code}:${insertError.message}`);
  }

  const { data: post, error: postError } = await supabase
    .from("value_objects")
    .select(
      "id,title,description,canonical_key,parent_value_object_id,root_value_object_id,node_role_code,branch_type_code,ontology_node_role_code,facet_code,object_kind_code,hierarchy_relation_code,scope_code,origin_type_code,owner_user_id,owner_actor_id,created_by_actor_id,status,metadata_json",
    )
    .eq("id", spec.id)
    .maybeSingle();

  if (postError || !post) {
    throw new Error(
      `NODE_POSTCHECK_FAILED:${spec.code}:${postError?.message || "missing"}`,
    );
  }
  validateNode(post, spec);

  const { data: versions, error: versionError } = await supabase
    .from("value_object_definition_versions")
    .select("value_object_id,version,scope_code,owner_actor_id,origin_type_code")
    .eq("value_object_id", spec.id)
    .eq("version", 1)
    .limit(1);

  if (versionError) {
    throw new Error(
      `NODE_VERSION_POSTCHECK_FAILED:${spec.code}:${versionError.message}`,
    );
  }
  const version = versions?.[0];
  if (
    !version ||
    version.scope_code !== "global" ||
    version.owner_actor_id !== null ||
    version.origin_type_code !== "system_model"
  ) {
    throw new Error(`NODE_DEFINITION_VERSION_INVALID:${spec.code}`);
  }

  return {
    code: spec.code,
    id: spec.id,
    status: "created",
    localizationStatus: "created_correctly",
  };
}

async function ensureMassAssignments() {
  const { data: defs, error: defError } = await supabase
    .from("value_object_parameter_definitions")
    .select(
      "id,parameter_code,dimension_code,value_type_code,canonical_unit_code,allowed_unit_codes,scope_code,status",
    )
    .eq("scope_code", "system")
    .eq("parameter_code", "mass")
    .eq("status", "active")
    .limit(2);

  if (defError) throw new Error(`MASS_DEFINITION_READ_FAILED:${defError.message}`);
  if ((defs || []).length !== 1) {
    throw new Error(`MASS_DEFINITION_NOT_UNIQUE:${(defs || []).length}`);
  }

  const definition = defs[0];
  const units = Array.isArray(definition.allowed_unit_codes)
    ? definition.allowed_unit_codes
    : [];

  if (
    definition.dimension_code !== "mass" ||
    definition.value_type_code !== "numeric" ||
    definition.canonical_unit_code !== "kilogram" ||
    !units.includes("gram")
  ) {
    throw new Error("MASS_DEFINITION_CONTRACT_MISMATCH");
  }

  const targets = [
    {
      valueObjectId: TARGETS.currentProteinServing,
      key: `${RELEASE}:mass:current_protein_serving`,
    },
    {
      valueObjectId: TARGETS.proteinSupplementIntake,
      key: `${RELEASE}:mass:protein_supplement_intake`,
    },
  ];

  const results = [];

  for (const target of targets) {
    const { data: existing, error: existingError } = await supabase
      .from("value_object_parameter_assignments")
      .select(
        "id,value_object_id,parameter_definition_id,scope_code,assignment_scope_code,owner_user_id,owner_actor_id,created_by_actor_id,status",
      )
      .eq("value_object_id", target.valueObjectId)
      .eq("parameter_definition_id", definition.id)
      .eq("status", "active")
      .limit(2);

    if (existingError) {
      throw new Error(`MASS_ASSIGNMENT_READ_FAILED:${existingError.message}`);
    }
    if ((existing || []).length > 1) {
      throw new Error(`MASS_ASSIGNMENT_NOT_UNIQUE:${target.valueObjectId}`);
    }

    if (existing?.[0]) {
      const row = existing[0];
      if (
        row.scope_code !== "system" ||
        row.assignment_scope_code !== "system" ||
        row.owner_user_id !== null ||
        row.owner_actor_id !== null ||
        row.created_by_actor_id !== null
      ) {
        throw new Error(`MASS_ASSIGNMENT_SCOPE_CONFLICT:${target.valueObjectId}`);
      }
      results.push({
        valueObjectId: target.valueObjectId,
        assignmentId: row.id,
        status: "reused",
      });
      continue;
    }

    if (!APPLY) {
      results.push({
        valueObjectId: target.valueObjectId,
        assignmentId: null,
        status: "would_create",
      });
      continue;
    }

    const assignmentId = stableUuid(target.key);
    const { error: insertError } = await supabase
      .from("value_object_parameter_assignments")
      .insert({
        id: assignmentId,
        value_object_id: target.valueObjectId,
        parameter_definition_id: definition.id,
        owner_user_id: null,
        owner_actor_id: null,
        created_by_actor_id: null,
        status: "active",
        display_order: 1000,
        valid_to: null,
        idempotency_key: target.key,
        metadata_json: {
          release: RELEASE,
          source: "confirmed_code_apply",
          semanticUse:
            target.valueObjectId === TARGETS.currentProteinServing
              ? "snapshot_state_mass"
              : "activity_source_mass",
        },
        scope_code: "system",
        assignment_scope_code: "system",
      });

    if (insertError) {
      throw new Error(
        `MASS_ASSIGNMENT_CREATE_FAILED:${target.valueObjectId}:${insertError.message}`,
      );
    }

    results.push({
      valueObjectId: target.valueObjectId,
      assignmentId,
      status: "created",
    });
  }

  return {
    definitionId: definition.id,
    results,
  };
}

async function ensureSameSubjectRelation() {
  const { data: relationTypes, error: typeError } = await supabase
    .from("value_object_relation_types")
    .select(
      "relation_type_code,directionality_code,status,canonical_write_policy_code,allowed_source_facet_codes,allowed_target_facet_codes,allowed_source_node_roles,allowed_target_node_roles",
    )
    .eq("relation_type_code", "same_subject_as")
    .limit(1);

  if (typeError) {
    throw new Error(`RELATION_TYPE_READ_FAILED:${typeError.message}`);
  }
  const type = relationTypes?.[0];
  if (!type || type.status !== "active") {
    throw new Error("SAME_SUBJECT_RELATION_TYPE_UNAVAILABLE");
  }

  const direct = await supabase
    .from("system_value_object_relations")
    .select(
      "id,relation_type_code,source_value_object_id,target_value_object_id,status,provenance_code",
    )
    .eq("relation_type_code", "same_subject_as")
    .eq("source_value_object_id", TARGETS.currentProteinServing)
    .eq("target_value_object_id", TARGETS.proteinSupplement)
    .limit(1);

  if (direct.error) {
    throw new Error(`RELATION_READ_FAILED:${direct.error.message}`);
  }

  if (direct.data?.[0]) {
    if (direct.data[0].status !== "active") {
      if (!APPLY) {
        return { id: direct.data[0].id, status: "would_reactivate" };
      }
      const { error } = await supabase
        .from("system_value_object_relations")
        .update({
          status: "active",
          provenance_code: "expert_model",
        })
        .eq("id", direct.data[0].id);
      if (error) throw new Error(`RELATION_REACTIVATE_FAILED:${error.message}`);
      return { id: direct.data[0].id, status: "reactivated" };
    }
    return { id: direct.data[0].id, status: "reused" };
  }

  if (!APPLY) {
    return { id: null, status: "would_create" };
  }

  const relationId = stableUuid(
    `${RELEASE}:same_subject_as:${TARGETS.currentProteinServing}:${TARGETS.proteinSupplement}`,
  );

  const { error } = await supabase.from("system_value_object_relations").insert({
    id: relationId,
    relation_type_code: "same_subject_as",
    source_value_object_id: TARGETS.currentProteinServing,
    target_value_object_id: TARGETS.proteinSupplement,
    status: "active",
    provenance_code: "expert_model",
    created_by_user_id: null,
  });

  if (error) throw new Error(`RELATION_CREATE_FAILED:${error.message}`);

  return { id: relationId, status: "created" };
}

async function verifyFinalState() {
  const { data: objects, error: objectError } = await supabase
    .from("value_objects")
    .select(
      "id,canonical_key,title,parent_value_object_id,root_value_object_id,ontology_node_role_code,facet_code,object_kind_code,hierarchy_relation_code,scope_code,origin_type_code,status,metadata_json",
    )
    .in("id", NODES.map((node) => node.id));

  if (objectError) {
    throw new Error(`FINAL_OBJECT_READ_FAILED:${objectError.message}`);
  }

  const { data: defs, error: defError } = await supabase
    .from("value_object_parameter_definitions")
    .select("id")
    .eq("scope_code", "system")
    .eq("parameter_code", "mass")
    .eq("status", "active")
    .limit(2);

  if (defError || (defs || []).length !== 1) {
    throw new Error("FINAL_MASS_DEFINITION_CHECK_FAILED");
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("value_object_parameter_assignments")
    .select("id,value_object_id,status")
    .eq("parameter_definition_id", defs[0].id)
    .in("value_object_id", [
      TARGETS.currentProteinServing,
      TARGETS.proteinSupplementIntake,
    ])
    .eq("status", "active");

  if (assignmentError) {
    throw new Error(`FINAL_ASSIGNMENT_READ_FAILED:${assignmentError.message}`);
  }

  const { data: relationRows, error: relationError } = await supabase
    .from("system_value_object_relations")
    .select("id,status")
    .eq("relation_type_code", "same_subject_as")
    .eq("source_value_object_id", TARGETS.currentProteinServing)
    .eq("target_value_object_id", TARGETS.proteinSupplement)
    .eq("status", "active")
    .limit(1);

  if (relationError) {
    throw new Error(`FINAL_RELATION_READ_FAILED:${relationError.message}`);
  }

  const localizationChecks = NODES.map((spec) => {
    const row = (objects || []).find((item) => item.id === spec.id);
    const metadata = asRecord(row?.metadata_json);
    const localizedContent = asRecord(metadata.localizedContent);
    const variants = asRecord(localizedContent.variants);
    const en = asRecord(variants.en);
    const ru = asRecord(variants.ru);

    return {
      id: spec.id,
      code: spec.code,
      expectedRuTitle: spec.titleRu,
      actualRuTitle: normalizeText(ru.title),
      expectedEnTitle: spec.titleEn,
      actualEnTitle: normalizeText(en.title),
      ok:
        normalizeText(ru.title) === spec.titleRu &&
        normalizeText(ru.description) === spec.descriptionRu &&
        normalizeText(en.title) === spec.titleEn &&
        normalizeText(en.description) === spec.descriptionEn,
    };
  });

  const localizationReady = localizationChecks.every((item) => item.ok);

  const ready =
    (objects || []).length === NODES.length &&
    (assignments || []).length === 2 &&
    (relationRows || []).length === 1 &&
    localizationReady;

  if (APPLY && !ready) {
    throw new Error(
      `FINAL_POSTCHECK_FAILED:objects=${(objects || []).length};assignments=${(assignments || []).length};relation=${(relationRows || []).length}`,
    );
  }

  return {
    ready,
    objectCount: (objects || []).length,
    expectedObjectCount: NODES.length,
    massAssignmentCount: (assignments || []).length,
    expectedMassAssignmentCount: 2,
    sameSubjectRelationCount: (relationRows || []).length,
    expectedSameSubjectRelationCount: 1,
    localizationReady,
    localizationChecks,
    objects: objects || [],
  };
}

async function main() {
  const startedAt = new Date().toISOString();

  await assertFoundation();
  const template = await loadLocalizationTemplate();

  const nodeResults = [];
  for (const node of NODES) {
    nodeResults.push(await ensureNode(node, template));
  }

  const massAssignments = await ensureMassAssignments();
  const relation = await ensureSameSubjectRelation();
  const verification = await verifyFinalState();

  const report = {
    release: RELEASE,
    mode: APPLY ? "apply" : "dry_run",
    startedAt,
    finishedAt: new Date().toISOString(),
    nodeResults,
    massAssignments,
    relation,
    verification,
    explicitNonWrites: {
      activityEvents: 0,
      activityFacts: 0,
      typicalActivities: 0,
      formulas: 0,
    },
  };

  const json = JSON.stringify(report, null, 2);
  if (REPORT_PATH) {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, json + "\n", "utf8");
  }

  process.stdout.write(json + "\n");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const report = {
    release: RELEASE,
    mode: APPLY ? "apply" : "dry_run",
    ok: false,
    error: message,
  };
  if (REPORT_PATH) {
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");
  }
  console.error(message);
  process.exit(2);
});
