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

  return {
    contract:
      ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1,

    templateId:
      String(result.templateId),

    profileId:
      String(result.profileId),

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