import crypto from "node:crypto";

import { supabase } from "../../../lib/supabase";

export const
  ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1 =
    "ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1" as const;

type MappingPair = {
  parameterDefinitionId: string;
  valueObjectId: string;
};

type CuratorIdentity = {
  curatorAppUserId: string;
  curatorActorId: string;
  curatorAdminId: string;
  curatorRole: string;
};

export type CuratorSystemTypicalActivityMaterializationInput = {
  sourceSignalId: string;

  curator: CuratorIdentity;

  locale: string;

  title: string;
  titleEn: string;

  description: string;
  descriptionEn: string;

  parameterDefinitionIds: string[];

  mappings: MappingPair[];
};

export type CuratorSystemTypicalActivityMaterializationResult = {
  contract: typeof ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1;

  templateId: string;
  profileId: string;

  versionNo: number;

  routingContractCode: string;
  templateScope: "system";

  fingerprint: string;

  replayed: boolean;
  profileVersionCreated: boolean;
};

type AssignmentRow = {
  id: string;
  value_object_id: string;
  parameter_definition_id: string;
  scope_code: string;
  assignment_scope_code: string;
  status: string;
};

type JsonRecord = Record<string, unknown>;

type MaterializedProfileRow = {
  id: string;
  template_id: string;
  status: string;
  routing_contract_code: string;
  metadata_json: unknown;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): JsonRecord {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function normalizedMappings(
  mappings: readonly MappingPair[],
): MappingPair[] {
  const map = new Map<string, MappingPair>();

  for (const mapping of mappings) {
    map.set(
      `${mapping.parameterDefinitionId}|${mapping.valueObjectId}`,
      mapping,
    );
  }

  return [...map.values()].sort(
    (left, right) =>
      left.parameterDefinitionId.localeCompare(
        right.parameterDefinitionId,
      ) ||
      left.valueObjectId.localeCompare(
        right.valueObjectId,
      ),
  );
}

function parsePersistedSourceValueBindingsV1(
  value: unknown,
): MappingPair[] | null {
  if (value === undefined) {
    return null;
  }

  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      "CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_INVALID",
    );
  }

  const parsed = value.map((item) => {
    const row = asRecord(item);
    const parameterDefinitionId =
      text(row.parameterDefinitionId);
    const valueObjectId =
      text(row.valueObjectId);

    if (
      !UUID_RE.test(parameterDefinitionId) ||
      !UUID_RE.test(valueObjectId)
    ) {
      throw new Error(
        "CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_INVALID",
      );
    }

    return {
      parameterDefinitionId,
      valueObjectId,
    };
  });

  const normalized =
    normalizedMappings(parsed);

  if (normalized.length !== parsed.length) {
    throw new Error(
      "CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_DUPLICATE",
    );
  }

  return normalized;
}

function mappingsEqual(
  left: readonly MappingPair[],
  right: readonly MappingPair[],
): boolean {
  const leftNormalized =
    normalizedMappings(left);
  const rightNormalized =
    normalizedMappings(right);

  return (
    leftNormalized.length ===
      rightNormalized.length &&
    leftNormalized.every(
      (item, index) =>
        item.parameterDefinitionId ===
          rightNormalized[index]
            .parameterDefinitionId &&
        item.valueObjectId ===
          rightNormalized[index]
            .valueObjectId,
    )
  );
}

async function readMaterializedProfile(
  profileId: string,
): Promise<MaterializedProfileRow> {
  const { data, error } = await supabase
    .from("activity_template_impact_profiles_v1")
    .select(
      "id,template_id,status,routing_contract_code,metadata_json",
    )
    .eq("id", profileId)
    .limit(1);

  if (error) {
    throw new Error(
      `CURATOR_SYSTEM_TEMPLATE_PROFILE_BINDING_READ_FAILED:${error.message}`,
    );
  }

  const profile =
    data?.[0] as
      | MaterializedProfileRow
      | undefined;

  if (!profile) {
    throw new Error(
      "CURATOR_SYSTEM_TEMPLATE_PROFILE_BINDING_PROFILE_MISSING",
    );
  }

  return profile;
}

async function ensureExplicitSourceValueBindingsV1(
  input: {
    profileId: string;
    templateId: string;
    mappings: MappingPair[];
  },
) {
  const expectedMappings =
    normalizedMappings(input.mappings);

  if (expectedMappings.length === 0) {
    throw new Error(
      "CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_EMPTY",
    );
  }

  const profile =
    await readMaterializedProfile(
      input.profileId,
    );

  if (
    profile.template_id !== input.templateId ||
    profile.status !== "active" ||
    profile.routing_contract_code !==
      "parameter_registry_v2"
  ) {
    throw new Error(
      "CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_PROFILE_INVARIANT_FAILED",
    );
  }

  const metadata =
    asRecord(profile.metadata_json);

  const existingBindings =
    parsePersistedSourceValueBindingsV1(
      metadata.sourceValueBindingsV1,
    );

  if (existingBindings) {
    if (
      !mappingsEqual(
        existingBindings,
        expectedMappings,
      )
    ) {
      throw new Error(
        "CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_CONFLICT",
      );
    }

    return;
  }

  const sourceValueBindingsV1 =
    expectedMappings.map((mapping) => ({
      parameterDefinitionId:
        mapping.parameterDefinitionId,
      valueObjectId:
        mapping.valueObjectId,
    }));

  const { error: updateError } =
    await supabase
      .from(
        "activity_template_impact_profiles_v1",
      )
      .update({
        metadata_json: {
          ...metadata,
          sourceValueBindingsV1,
        },
      })
      .eq("id", input.profileId)
      .eq("template_id", input.templateId);

  if (updateError) {
    throw new Error(
      `CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_WRITE_FAILED:${updateError.message}`,
    );
  }

  const verifiedProfile =
    await readMaterializedProfile(
      input.profileId,
    );

  const verifiedBindings =
    parsePersistedSourceValueBindingsV1(
      asRecord(
        verifiedProfile.metadata_json,
      ).sourceValueBindingsV1,
    );

  if (
    !verifiedBindings ||
    !mappingsEqual(
      verifiedBindings,
      expectedMappings,
    )
  ) {
    throw new Error(
      "CURATOR_SYSTEM_TEMPLATE_SOURCE_BINDINGS_VERIFY_FAILED",
    );
  }
}

function fingerprint(input: {
  title: string;
  titleEn: string;

  description: string;
  descriptionEn: string;

  parameterDefinitionIds: string[];

  mappings: MappingPair[];
}) {
  const payload = JSON.stringify({
    contract:
      ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1,

    title: input.title.trim(),
    titleEn: input.titleEn.trim(),

    description: input.description.trim(),
    descriptionEn: input.descriptionEn.trim(),

    parameterDefinitionIds:
      [...input.parameterDefinitionIds].sort(),

    mappings:
      normalizedMappings(input.mappings),
  });

  return crypto
    .createHash("sha256")
    .update(payload, "utf8")
    .digest("hex");
}

export async function
materializeCuratorSystemTypicalActivityV1(
  input: CuratorSystemTypicalActivityMaterializationInput,
): Promise<CuratorSystemTypicalActivityMaterializationResult> {

  const parameterDefinitionIds =
    unique(input.parameterDefinitionIds);

  const mappings =
    normalizedMappings(input.mappings);

  if (
    parameterDefinitionIds.length === 0 ||
    mappings.length === 0
  ) {
    throw new Error(
      "CURATOR_SYSTEM_TEMPLATE_PROFILE_EMPTY",
    );
  }

  for (const parameterDefinitionId of parameterDefinitionIds) {
    if (
      !mappings.some(
        (mapping) =>
          mapping.parameterDefinitionId ===
          parameterDefinitionId,
      )
    ) {
      throw new Error(
        `CURATOR_SYSTEM_TEMPLATE_PARAMETER_MAPPING_MISSING:${parameterDefinitionId}`,
      );
    }
  }

  const targetValueObjectIds =
    unique(
      mappings.map(
        (mapping) =>
          mapping.valueObjectId,
      ),
    );

  const { data, error } = await supabase
    .from("value_object_parameter_assignments")
    .select(
      "id,value_object_id,parameter_definition_id,scope_code,assignment_scope_code,status",
    )
    .eq("scope_code", "system")
    .eq("assignment_scope_code", "system")
    .eq("status", "active")
    .in(
      "parameter_definition_id",
      parameterDefinitionIds,
    )
    .in(
      "value_object_id",
      targetValueObjectIds,
    );

  if (error) {
    throw new Error(
      `CURATOR_SYSTEM_TEMPLATE_ASSIGNMENT_READ_FAILED:${error.message}`,
    );
  }

  const assignmentRows =
    (data ?? []) as unknown as AssignmentRow[];

  const assignmentByPair =
    new Map(
      assignmentRows.map(
        (assignment) => [
          `${assignment.parameter_definition_id}|${assignment.value_object_id}`,
          assignment,
        ],
      ),
    );

  for (const mapping of mappings) {
    const key =
      `${mapping.parameterDefinitionId}|${mapping.valueObjectId}`;

    if (!assignmentByPair.has(key)) {
      throw new Error(
        `CURATOR_SYSTEM_TEMPLATE_SYSTEM_ASSIGNMENT_MISSING:${key}`,
      );
    }
  }

  const parameters =
    parameterDefinitionIds.map(
      (parameterDefinitionId, index) => ({
        parameterDefinitionId,

        capturePolicyCode:
          "deterministic_or_ai",

        isRequired: false,

        displayOrder:
          (index + 1) * 10,
      }),
    );

  const links =
    targetValueObjectIds.map(
      (targetValueObjectId) => {

        const routes =
          mappings
            .filter(
              (mapping) =>
                mapping.valueObjectId ===
                targetValueObjectId,
            )
            .map((mapping) => {

              const assignment =
                assignmentByPair.get(
                  `${mapping.parameterDefinitionId}|${mapping.valueObjectId}`,
                );

              if (!assignment) {
                throw new Error(
                  "CURATOR_SYSTEM_TEMPLATE_ASSIGNMENT_DISAPPEARED",
                );
              }

              return {
                sourceParameterDefinitionId:
                  mapping.parameterDefinitionId,

                targetParameterAssignmentId:
                  assignment.id,

                routeKindCode:
                  "direct_measure",

                derivationContract: {},
              };
            });

        return {
          targetValueObjectId,

          relationCode:
            "affects",

          confidence:
            1,

          notes:
            "",

          routes,
        };
      },
    );

  const materializationFingerprint =
    fingerprint({
      title:
        input.title,

      titleEn:
        input.titleEn,

      description:
        input.description,

      descriptionEn:
        input.descriptionEn,

      parameterDefinitionIds,

      mappings,
    });

  const { data: rpcData, error: rpcError } =
    await supabase.rpc(
      "save_curator_system_typical_activity_v1",
      {
        p_source_signal_id:
          input.sourceSignalId,

        p_curator_app_user_id:
          input.curator.curatorAppUserId,

        p_curator_actor_id:
          input.curator.curatorActorId,

        p_curator_admin_id:
          input.curator.curatorAdminId,

        p_curator_role:
          input.curator.curatorRole,

        p_locale:
          input.locale,

        p_title:
          input.title.trim(),

        p_title_en:
          input.titleEn.trim(),

        p_description:
          input.description.trim() || null,

        p_description_en:
          input.descriptionEn.trim() || null,

        p_fingerprint:
          materializationFingerprint,

        p_parameters:
          parameters,

        p_links:
          links,
      },
    );

  if (rpcError) {

    const migrationMissing =
      rpcError.code === "PGRST202" ||
      rpcError.code === "42883" ||
      /save_curator_system_typical_activity_v1/i.test(
        rpcError.message,
      );

    if (migrationMissing) {
      throw new Error(
        "CURATOR_SYSTEM_TEMPLATE_MATERIALIZATION_MIGRATION_REQUIRED",
      );
    }

    throw new Error(
      `CURATOR_SYSTEM_TEMPLATE_MATERIALIZATION_FAILED:${rpcError.message}`,
    );
  }

  const result =
    rpcData as
      | Partial<CuratorSystemTypicalActivityMaterializationResult>
      | null;

  if (
    !result?.templateId ||
    !result.profileId ||
    !Number.isInteger(result.versionNo)
  ) {
    throw new Error(
      "CURATOR_SYSTEM_TEMPLATE_MATERIALIZATION_INVALID_RESULT",
    );
  }

  if (
    result.routingContractCode !==
      "parameter_registry_v2" ||
    result.templateScope !==
      "system"
  ) {
    throw new Error(
      "CURATOR_SYSTEM_TEMPLATE_MATERIALIZATION_INVARIANT_FAILED",
    );
  }

  const templateId =
    String(result.templateId);
  const profileId =
    String(result.profileId);

  await ensureExplicitSourceValueBindingsV1({
    templateId,
    profileId,
    mappings,
  });

  return {
    contract:
      ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1,

    templateId,

    profileId,

    versionNo:
      Number(result.versionNo),

    routingContractCode:
      result.routingContractCode,

    templateScope:
      "system",

    fingerprint:
      String(
        result.fingerprint ??
        materializationFingerprint,
      ),

    replayed:
      result.replayed === true,

    profileVersionCreated:
      result.profileVersionCreated === true,
  };
}
