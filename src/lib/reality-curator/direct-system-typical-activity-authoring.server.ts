import { parseSourceResolution, type SourceResolution } from "../activity/source-snapshot-resolution";
import { validateSnapshotBindings } from "../activity/source-snapshot-resolution.server";
import crypto from "node:crypto";

import {
  materializeCuratorSystemTypicalActivityV1,
  type CuratorSystemTypicalActivityMaterializationResult,
} from "@/lib/reality-curator/system-typical-activity-materialization.server";

import {
  supabase,
} from "../../../lib/supabase";

export const
  ARCTOR_DIRECT_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1 =
    "ARCTOR_DIRECT_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1" as const;

type MappingPair = {
  parameterDefinitionId: string;
  valueObjectId: string;
  sourceResolution?: SourceResolution;
};

type CuratorIdentity = {
  curatorAppUserId: string;
  curatorActorId: string;
  curatorAdminId: string;
  curatorRole: string;
};

export type DirectSystemTypicalActivityAuthoringInput = {
  requestId: string;
  curator: CuratorIdentity;
  locale: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  parameterDefinitionIds: string[];
  mappings: MappingPair[];
};

export type DirectSystemTypicalActivityAuthoringResult = {
  contract:
    typeof ARCTOR_DIRECT_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1;
  templateId: string;
  profileId: string;
  versionNo: number;
  routingContractCode: string;
  templateScope: "system";
  curatorMaterializationFingerprint: string;
  directAuthoringFingerprint: string;
  replayed: boolean;
  profileVersionCreated: boolean;
};

type JsonRecord =
  Record<string, unknown>;

type ExistingDirectTemplateRow = {
  id: string;
  default_metadata_json: unknown;
};

type ExistingProfileRow = {
  id: string;
  version_no: number;
  routing_contract_code: string;
  metadata_json: unknown;
};

function record(
  value: unknown,
): JsonRecord {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function unique(
  values: readonly string[],
): string[] {
  return [
    ...new Set(
      values,
    ),
  ];
}

function normalizedMappings(
  mappings:
    readonly MappingPair[],
): MappingPair[] {
  const byPair =
    new Map<
      string,
      MappingPair
    >();

  for (
    const mapping
    of mappings
  ) {
    byPair.set(
      `${mapping.parameterDefinitionId}|${mapping.valueObjectId}`,
      { ...mapping, ...(parseSourceResolution(mapping.sourceResolution) ? { sourceResolution: parseSourceResolution(mapping.sourceResolution) } : {}) },
    );
  }

  return [
    ...byPair.values(),
  ].sort(
    (
      left,
      right,
    ) =>
      left.parameterDefinitionId.localeCompare(
        right.parameterDefinitionId,
      ) ||
      left.valueObjectId.localeCompare(
        right.valueObjectId,
      ),
  );
}

function directFingerprint(
  input: {
    locale: string;
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    parameterDefinitionIds: string[];
    mappings: MappingPair[];
  },
) {
  return crypto
    .createHash(
      "sha256",
    )
    .update(
      JSON.stringify({
        contract:
          ARCTOR_DIRECT_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1,
        locale:
          input.locale,
        title:
          input.title.trim(),
        titleEn:
          input.titleEn.trim(),
        description:
          input.description.trim(),
        descriptionEn:
          input.descriptionEn.trim(),
        parameterDefinitionIds:
          [
            ...input
              .parameterDefinitionIds,
          ].sort(),
        mappings:
          normalizedMappings(
            input.mappings,
          ),
      }),
      "utf8",
    )
    .digest(
      "hex",
    );
}

function stableUuid(
  seed: string,
): string {
  const bytes =
    Buffer.from(
      crypto
        .createHash(
          "sha256",
        )
        .update(
          seed,
          "utf8",
        )
        .digest()
        .subarray(
          0,
          16,
        ),
    );

  bytes[6] =
    (bytes[6] & 0x0f) |
    0x50;

  bytes[8] =
    (bytes[8] & 0x3f) |
    0x80;

  const hex =
    bytes.toString(
      "hex",
    );

  return [
    hex.slice(
      0,
      8,
    ),
    hex.slice(
      8,
      12,
    ),
    hex.slice(
      12,
      16,
    ),
    hex.slice(
      16,
      20,
    ),
    hex.slice(
      20,
    ),
  ].join(
    "-",
  );
}

async function
assertRequestIdIsNotRawSignal(
  requestId: string,
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "raw_activity_signals",
      )
      .select(
        "id",
      )
      .eq(
        "id",
        requestId,
      )
      .limit(
        1,
      );

  if (error) {
    throw new Error(
      `DIRECT_SYSTEM_TEMPLATE_REQUEST_COLLISION_CHECK_FAILED:${error.message}`,
    );
  }

  if (data?.[0]) {
    throw new Error(
      "DIRECT_SYSTEM_TEMPLATE_REQUEST_ID_COLLIDES_WITH_RAW_SIGNAL",
    );
  }
}

async function
readExistingDirectTemplate(
  requestId: string,
): Promise<
  ExistingDirectTemplateRow |
  null
> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "activity_templates",
      )
      .select(
        "id,default_metadata_json",
      )
      .contains(
        "default_metadata_json",
        {
          directSystemAuthoringV1: {
            requestId,
          },
        },
      )
      .limit(
        2,
      );

  if (error) {
    throw new Error(
      `DIRECT_SYSTEM_TEMPLATE_EXISTING_READ_FAILED:${error.message}`,
    );
  }

  if (
    (data ?? [])
      .length > 1
  ) {
    throw new Error(
      "DIRECT_SYSTEM_TEMPLATE_REQUEST_NOT_UNIQUE",
    );
  }

  return (
    (
      data?.[0] as
        ExistingDirectTemplateRow |
        undefined
    ) ??
    null
  );
}

async function
readActiveProfile(
  templateId: string,
): Promise<
  ExistingProfileRow
> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "activity_template_impact_profiles_v1",
      )
      .select(
        "id,version_no,routing_contract_code,metadata_json",
      )
      .eq(
        "template_id",
        templateId,
      )
      .eq(
        "status",
        "active",
      )
      .order(
        "version_no",
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      );

  if (error) {
    throw new Error(
      `DIRECT_SYSTEM_TEMPLATE_PROFILE_READ_FAILED:${error.message}`,
    );
  }

  const profile =
    data?.[0] as
      ExistingProfileRow |
      undefined;

  if (!profile) {
    throw new Error(
      "DIRECT_SYSTEM_TEMPLATE_ACTIVE_PROFILE_MISSING",
    );
  }

  if (
    profile
      .routing_contract_code !==
    "parameter_registry_v2"
  ) {
    throw new Error(
      "DIRECT_SYSTEM_TEMPLATE_ROUTING_CONTRACT_INVALID",
    );
  }

  return profile;
}

function replayResult(
  input: {
    templateId: string;
    profile:
      ExistingProfileRow;
    directAuthoringFingerprint:
      string;
    curatorMaterializationFingerprint:
      string;
  },
): DirectSystemTypicalActivityAuthoringResult {
  return {
    contract:
      ARCTOR_DIRECT_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1,
    templateId:
      input.templateId,
    profileId:
      input.profile.id,
    versionNo:
      input.profile.version_no,
    routingContractCode:
      input.profile
        .routing_contract_code,
    templateScope:
      "system",
    curatorMaterializationFingerprint:
      input
        .curatorMaterializationFingerprint,
    directAuthoringFingerprint:
      input
        .directAuthoringFingerprint,
    replayed:
      true,
    profileVersionCreated:
      false,
  };
}

async function
ensureSystemParameterAssignments(
  mappings:
    readonly MappingPair[],
) {
  const normalized =
    normalizedMappings(
      mappings,
    );

  const parameterIds =
    unique(
      normalized.map(
        (
          mapping,
        ) =>
          mapping
            .parameterDefinitionId,
      ),
    );

  const valueObjectIds =
    unique(
      normalized.map(
        (
          mapping,
        ) =>
          mapping
            .valueObjectId,
      ),
    );

  const [
    parameterResult,
    valueObjectResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "value_object_parameter_definitions",
        )
        .select(
          "id,scope_code,status",
        )
        .in(
          "id",
          parameterIds,
        )
        .eq(
          "scope_code",
          "system",
        )
        .eq(
          "status",
          "active",
        ),

      supabase
        .from(
          "value_objects",
        )
        .select(
          "id,scope_code,origin_type_code,ontology_node_role_code,status",
        )
        .in(
          "id",
          valueObjectIds,
        ),
    ]);

  if (
    parameterResult.error
  ) {
    throw new Error(
      `DIRECT_SYSTEM_TEMPLATE_PARAMETER_VALIDATION_FAILED:${parameterResult.error.message}`,
    );
  }

  if (
    valueObjectResult.error
  ) {
    throw new Error(
      `DIRECT_SYSTEM_TEMPLATE_OBJECT_VALIDATION_FAILED:${valueObjectResult.error.message}`,
    );
  }

  if (
    (
      parameterResult.data ??
      []
    ).length !==
    parameterIds.length
  ) {
    throw new Error(
      "DIRECT_SYSTEM_TEMPLATE_SYSTEM_PARAMETER_SET_CHANGED",
    );
  }

  const validObjectIds =
    new Set(
      (
        valueObjectResult.data ??
        []
      )
        .filter(
          (
            row,
          ) =>
            row.scope_code ===
              "global" &&
            row.origin_type_code ===
              "system_model" &&
            row.ontology_node_role_code ===
              "leaf" &&
            row.status ===
              "active",
        )
        .map(
          (
            row,
          ) =>
            String(
              row.id,
            ),
        ),
    );

  if (
    validObjectIds.size !==
    valueObjectIds.length
  ) {
    throw new Error(
      "DIRECT_SYSTEM_TEMPLATE_TARGET_NOT_ACTIVE_SYSTEM_LEAF",
    );
  }

  for (
    const mapping
    of normalized
  ) {
    const {
      data:
        existingRows,
      error:
        existingError,
    } =
      await supabase
        .from(
          "value_object_parameter_assignments",
        )
        .select(
          "id,scope_code,assignment_scope_code,owner_user_id,owner_actor_id,created_by_actor_id,status",
        )
        .eq(
          "value_object_id",
          mapping.valueObjectId,
        )
        .eq(
          "parameter_definition_id",
          mapping
            .parameterDefinitionId,
        )
        .limit(
          2,
        );

    if (existingError) {
      throw new Error(
        `DIRECT_SYSTEM_TEMPLATE_ASSIGNMENT_READ_FAILED:${existingError.message}`,
      );
    }

    if (
      (
        existingRows ??
        []
      ).length > 1
    ) {
      throw new Error(
        `DIRECT_SYSTEM_TEMPLATE_ASSIGNMENT_NOT_UNIQUE:${mapping.parameterDefinitionId}:${mapping.valueObjectId}`,
      );
    }

    const existing =
      existingRows?.[0];

    if (existing) {
      if (
        existing
          .scope_code !==
          "system" ||
        existing
          .assignment_scope_code !==
          "system" ||
        existing
          .owner_user_id !==
          null ||
        existing
          .owner_actor_id !==
          null ||
        existing
          .created_by_actor_id !==
          null
      ) {
        throw new Error(
          `DIRECT_SYSTEM_TEMPLATE_ASSIGNMENT_SCOPE_CONFLICT:${mapping.parameterDefinitionId}:${mapping.valueObjectId}`,
        );
      }

      if (
        existing.status !==
        "active"
      ) {
        const {
          error:
            reactivateError,
        } =
          await supabase
            .from(
              "value_object_parameter_assignments",
            )
            .update({
              status:
                "active",
              valid_to:
                null,
            })
            .eq(
              "id",
              existing.id,
            );

        if (
          reactivateError
        ) {
          throw new Error(
            `DIRECT_SYSTEM_TEMPLATE_ASSIGNMENT_REACTIVATE_FAILED:${reactivateError.message}`,
          );
        }
      }

      continue;
    }

    const idempotencyKey =
      `direct_system_typical_activity:${mapping.parameterDefinitionId}:${mapping.valueObjectId}`;

    const assignmentId =
      stableUuid(
        `ARCTOR_DIRECT_SYSTEM_PARAMETER_ASSIGNMENT_V1|${mapping.parameterDefinitionId}|${mapping.valueObjectId}`,
      );

    const {
      error:
        insertError,
    } =
      await supabase
        .from(
          "value_object_parameter_assignments",
        )
        .insert({
          id:
            assignmentId,
          value_object_id:
            mapping
              .valueObjectId,
          parameter_definition_id:
            mapping
              .parameterDefinitionId,
          owner_user_id:
            null,
          owner_actor_id:
            null,
          created_by_actor_id:
            null,
          status:
            "active",
          display_order:
            1000,
          valid_to:
            null,
          idempotency_key:
            idempotencyKey,
          metadata_json: {
            source:
              "direct_system_typical_activity_authoring",
            semanticUse:
              "activity_source_measurement",
          },
          scope_code:
            "system",
          assignment_scope_code:
            "system",
        });

    if (
      insertError &&
      insertError.code !==
        "23505"
    ) {
      throw new Error(
        `DIRECT_SYSTEM_TEMPLATE_ASSIGNMENT_CREATE_FAILED:${insertError.message}`,
      );
    }
  }
}

async function
markDirectAuthoring(
  input: {
    requestId: string;
    directFingerprint:
      string;
    mappings: MappingPair[];
    source:
      CuratorSystemTypicalActivityMaterializationResult;
    curator:
      CuratorIdentity;
  },
) {
  const now =
    new Date()
      .toISOString();

  const {
    data: templateRows,
    error:
      templateReadError,
  } =
    await supabase
      .from(
        "activity_templates",
      )
      .select(
        "id,default_metadata_json",
      )
      .eq(
        "id",
        input.source
          .templateId,
      )
      .limit(
        1,
      );

  if (
    templateReadError ||
    !templateRows?.[0]
  ) {
    throw new Error(
      `DIRECT_SYSTEM_TEMPLATE_METADATA_READ_FAILED:${templateReadError?.message ?? "missing"}`,
    );
  }

  const templateMetadata =
    record(
      templateRows[0]
        .default_metadata_json,
    );

  const directMarker = {
    contract:
      ARCTOR_DIRECT_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1,
    requestId:
      input.requestId,
    fingerprint:
      input.directFingerprint,
    creationMode:
      "direct_admin",
    rawSignalCreated:
      false,
    activityEventCreated:
      false,
    compatibilityJourneyKeyField:
      "curatorSystemMaterializationV1.sourceSignalId",
    compatibilityJourneyKeyValue:
      input.requestId,
    curatorAppUserId:
      input.curator
        .curatorAppUserId,
    curatorActorId:
      input.curator
        .curatorActorId,
    curatorAdminId:
      input.curator
        .curatorAdminId,
    curatorRole:
      input.curator
        .curatorRole,
    publishedAt:
      now,
  };

  const profile =
    await readActiveProfile(
      input.source
        .templateId,
    );

  const profileMetadata =
    record(
      profile
        .metadata_json,
    );

  const {
    error:
      profileUpdateError,
  } =
    await supabase
      .from(
        "activity_template_impact_profiles_v1",
      )
      .update({
        metadata_json: {
          ...profileMetadata,
          sourceValueBindingsV1: input.mappings,
          directSystemAuthoringV1:
            directMarker,
        },
      })
      .eq(
        "id",
        profile.id,
      );

  if (profileUpdateError) {
    throw new Error(
      `DIRECT_SYSTEM_TEMPLATE_PROFILE_METADATA_WRITE_FAILED:${profileUpdateError.message}`,
    );
  }
  const {
    error:
      templateUpdateError,
  } =
    await supabase
      .from(
        "activity_templates",
      )
      .update({
        default_metadata_json: {
          ...templateMetadata,
          directSystemAuthoringV1:
            directMarker,
        },
      })
      .eq(
        "id",
        input.source
          .templateId,
      );

  if (templateUpdateError) {
    throw new Error(
      `DIRECT_SYSTEM_TEMPLATE_METADATA_WRITE_FAILED:${templateUpdateError.message}`,
    );
  }


}

async function
appendAuditLog(
  input: {
    requestId: string;
    directFingerprint:
      string;
    result:
      DirectSystemTypicalActivityAuthoringResult;
    curator:
      CuratorIdentity;
    parameterDefinitionIds:
      string[];
    mappings:
      MappingPair[];
    title: string;
    titleEn: string;
  },
) {
  const now =
    new Date()
      .toISOString();

  const id =
    stableUuid(
      `${ARCTOR_DIRECT_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1}|${input.requestId}|${input.directFingerprint}`,
    );

  const {
    error,
  } =
    await supabase
      .from(
        "activity_processing_logs",
      )
      .insert({
        id,
        user_id:
          input.curator
            .curatorAppUserId,
        raw_signal_id:
          null,
        activity_event_id:
          null,
        processor_name:
          "direct_system_typical_activity_authoring",
        processor_version:
          "1",
        processing_stage:
          "validate",
        processing_status:
          "completed",
        severity:
          "notice",
        message:
          "System typical activity published by direct administrator authoring",
        input_json:
          {},
        output_json:
          {},
        error_json:
          {},
        metadata_json: {
          contract:
            ARCTOR_DIRECT_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1,
          eventCode:
            "direct_system_typical_activity_published",
          requestId:
            input.requestId,
          directFingerprint:
            input.directFingerprint,
          title:
            input.title,
          titleEn:
            input.titleEn,
          templateId:
            input.result
              .templateId,
          profileId:
            input.result
              .profileId,
          profileVersionNo:
            input.result
              .versionNo,
          routingContractCode:
            input.result
              .routingContractCode,
          parameterDefinitionIds:
            input
              .parameterDefinitionIds,
          mappings:
            input.mappings,
          rawSignalCreated:
            false,
          activityEventCreated:
            false,
          curatorAppUserId:
            input.curator
              .curatorAppUserId,
          curatorActorId:
            input.curator
              .curatorActorId,
          curatorAdminId:
            input.curator
              .curatorAdminId,
          curatorRole:
            input.curator
              .curatorRole,
        },
        started_at:
          now,
        finished_at:
          now,
        duration_ms:
          0,
      });

  if (
    error &&
    error.code !==
      "23505"
  ) {
    throw new Error(
      `DIRECT_SYSTEM_TEMPLATE_AUDIT_WRITE_FAILED:${error.message}`,
    );
  }
}

export async function
authorDirectSystemTypicalActivityV1(
  input: DirectSystemTypicalActivityAuthoringInput,
): Promise<
  DirectSystemTypicalActivityAuthoringResult
> {
  const parameterDefinitionIds =
    unique(
      input
        .parameterDefinitionIds,
    );

  const mappings =
    normalizedMappings(
      input.mappings,
    );

  if (
    parameterDefinitionIds.length ===
      0 ||
    mappings.length ===
      0
  ) {
    throw new Error(
      "DIRECT_SYSTEM_TEMPLATE_PROFILE_EMPTY",
    );
  }

  for (
    const parameterDefinitionId
    of parameterDefinitionIds
  ) {
    if (
      !mappings.some(
        (mapping) =>
          mapping
            .parameterDefinitionId ===
          parameterDefinitionId,
      )
    ) {
      throw new Error(
        `DIRECT_SYSTEM_TEMPLATE_PARAMETER_MAPPING_MISSING:${parameterDefinitionId}`,
      );
    }
  }

  await validateSnapshotBindings(mappings);

  await assertRequestIdIsNotRawSignal(
    input.requestId,
  );

  const fingerprint =
    directFingerprint({
      locale:
        input.locale,
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

  const existing =
    await readExistingDirectTemplate(
      input.requestId,
    );

  if (existing) {
    const metadata =
      record(
        existing
          .default_metadata_json,
      );

    const direct =
      record(
        metadata
          .directSystemAuthoringV1,
      );

    const existingFingerprint =
      text(
        direct
          .fingerprint,
      );

    if (
      existingFingerprint !==
      fingerprint
    ) {
      throw new Error(
        "DIRECT_SYSTEM_TEMPLATE_REQUEST_FINGERPRINT_CONFLICT",
      );
    }

    const curatorMetadata =
      record(
        metadata
          .curatorSystemMaterializationV1,
      );

    const curatorFingerprint =
      text(
        curatorMetadata
          .fingerprint,
      );

    const profile =
      await readActiveProfile(
        existing.id,
      );

    const replay =
      replayResult({
        templateId:
          existing.id,
        profile,
        directAuthoringFingerprint:
          fingerprint,
        curatorMaterializationFingerprint:
          curatorFingerprint,
      });

    await appendAuditLog({
      requestId:
        input.requestId,
      directFingerprint:
        fingerprint,
      result:
        replay,
      curator:
        input.curator,
      parameterDefinitionIds,
      mappings,
      title:
        input.title,
      titleEn:
        input.titleEn,
    });

    return replay;
  }

  await ensureSystemParameterAssignments(
    mappings,
  );

  const curatorResult =
    await materializeCuratorSystemTypicalActivityV1({
      sourceSignalId:
        input.requestId,
      curator:
        input.curator,
      locale:
        input.locale,
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

  await markDirectAuthoring({
    mappings,
    requestId:
      input.requestId,
    directFingerprint:
      fingerprint,
    source:
      curatorResult,
    curator:
      input.curator,
  });

  const result:
    DirectSystemTypicalActivityAuthoringResult = {
      contract:
        ARCTOR_DIRECT_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1,
      templateId:
        curatorResult
          .templateId,
      profileId:
        curatorResult
          .profileId,
      versionNo:
        curatorResult
          .versionNo,
      routingContractCode:
        curatorResult
          .routingContractCode,
      templateScope:
        "system",
      curatorMaterializationFingerprint:
        curatorResult
          .fingerprint,
      directAuthoringFingerprint:
        fingerprint,
      replayed:
        curatorResult
          .replayed,
      profileVersionCreated:
        curatorResult
          .profileVersionCreated,
    };

  await appendAuditLog({
    requestId:
      input.requestId,
    directFingerprint:
      fingerprint,
    result,
    curator:
      input.curator,
    parameterDefinitionIds,
    mappings,
    title:
      input.title,
    titleEn:
      input.titleEn,
  });

  return result;
}
