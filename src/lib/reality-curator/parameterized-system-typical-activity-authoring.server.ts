import crypto from "node:crypto";

import { supabase } from "../../../lib/supabase";

export const ARCTOR_PARAMETERIZED_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1 =
  "ARCTOR_PARAMETERIZED_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1" as const;

export type TypicalActivityActorApplicability =
  | "private"
  | "commercial"
  | "both";

export type TypicalActivityAcceptanceMode =
  | "user_confirmation"
  | "auto_if_unambiguous";

export type ParameterizedTargetBinding = {
  parameterDefinitionId: string;
  intermediateValueObjectId: string;
};

export type ParameterizedDefaultNumericValue = {
  parameterDefinitionId: string;
  valueNumeric: number;
};

type CuratorIdentity = {
  curatorAppUserId: string;
  curatorActorId: string;
  curatorAdminId: string;
  curatorRole: string;
};

export type ParameterizedSystemTypicalActivityAuthoringInput = {
  requestId: string;
  curator: CuratorIdentity;
  locale: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  actorApplicability: TypicalActivityActorApplicability;
  acceptanceMode: TypicalActivityAcceptanceMode;
  parameterDefinitionIds: string[];
  dynamicTargetBindings: ParameterizedTargetBinding[];
  parameterDefaults: ParameterizedDefaultNumericValue[];
};

export type ParameterizedSystemTypicalActivityAuthoringResult = {
  contract:
    typeof ARCTOR_PARAMETERIZED_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1;
  templateId: string;
  profileId: string;
  versionNo: number;
  routingContractCode: "parameter_registry_v2";
  templateScope: "system";
  fingerprint: string;
  replayed: boolean;
  profileVersionCreated: boolean;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => stableJson(item))
      .join(",")}]`;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const row =
      value as Record<
        string,
        unknown
      >;

    return `{${Object.keys(row)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableJson(
            row[key],
          )}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function stableUuid(seed: string): string {
  const bytes = Buffer.from(
    crypto
      .createHash("sha256")
      .update(seed, "utf8")
      .digest()
      .subarray(0, 16),
  );

  bytes[6] =
    (bytes[6] & 0x0f) |
    0x50;
  bytes[8] =
    (bytes[8] & 0x3f) |
    0x80;

  const hex =
    bytes.toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function normalizeBindings(
  bindings:
    readonly ParameterizedTargetBinding[],
) {
  const byPair =
    new Map<
      string,
      ParameterizedTargetBinding
    >();

  for (const binding of bindings) {
    const key =
      `${binding.parameterDefinitionId}|${binding.intermediateValueObjectId}`;

    byPair.set(key, {
      parameterDefinitionId:
        binding.parameterDefinitionId,
      intermediateValueObjectId:
        binding.intermediateValueObjectId,
    });
  }

  return [
    ...byPair.values(),
  ].sort(
    (left, right) =>
      left.parameterDefinitionId.localeCompare(
        right.parameterDefinitionId,
      ) ||
      left.intermediateValueObjectId.localeCompare(
        right.intermediateValueObjectId,
      ),
  );
}

function normalizeDefaultNumericValues(
  values:
    readonly ParameterizedDefaultNumericValue[],
) {
  const byParameter =
    new Map<
      string,
      ParameterizedDefaultNumericValue
    >();

  for (const value of values) {
    if (
      !Number.isFinite(
        value.valueNumeric,
      )
    ) {
      throw new Error(
        `PARAMETERIZED_SYSTEM_TEMPLATE_DEFAULT_VALUE_INVALID:${value.parameterDefinitionId}`,
      );
    }

    byParameter.set(
      value.parameterDefinitionId,
      {
        parameterDefinitionId:
          value.parameterDefinitionId,
        valueNumeric:
          value.valueNumeric,
      },
    );
  }

  return [
    ...byParameter.values(),
  ].sort(
    (
      left,
      right,
    ) =>
      left.parameterDefinitionId.localeCompare(
        right.parameterDefinitionId,
      ),
  );
}

function fingerprint(
  input:
    ParameterizedSystemTypicalActivityAuthoringInput,
) {
  return crypto
    .createHash("sha256")
    .update(
      stableJson({
        contract:
          ARCTOR_PARAMETERIZED_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1,
        requestId:
          input.requestId,
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
        actorApplicability:
          input.actorApplicability,
        templateMode:
          "parameterized",
        acceptanceMode:
          input.acceptanceMode,
        parameterDefinitionIds:
          unique(
            input.parameterDefinitionIds,
          ).sort(),
        dynamicTargetBindings:
          normalizeBindings(
            input.dynamicTargetBindings,
          ),
        parameterDefaults:
          normalizeDefaultNumericValues(
            input.parameterDefaults,
          ),
      }),
      "utf8",
    )
    .digest("hex");
}

async function applyDefaultNumericValues(
  input: {
    profileId: string;
    values:
      readonly ParameterizedDefaultNumericValue[];
  },
) {
  const values =
    normalizeDefaultNumericValues(
      input.values,
    );

  if (values.length === 0) {
    return;
  }

  const parameterDefinitionIds =
    values.map(
      (
        value,
      ) =>
        value.parameterDefinitionId,
    );

  const [
    definitionsResult,
    profileParametersResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "value_object_parameter_definitions",
        )
        .select(
          "id,value_type_code,canonical_unit_code,allow_negative,scope_code,status",
        )
        .in(
          "id",
          parameterDefinitionIds,
        ),
      supabase
        .from(
          "activity_template_profile_parameters_v2",
        )
        .select(
          "id,parameter_definition_id,metadata_json",
        )
        .eq(
          "profile_id",
          input.profileId,
        )
        .in(
          "parameter_definition_id",
          parameterDefinitionIds,
        ),
    ]);

  if (definitionsResult.error) {
    throw new Error(
      `PARAMETERIZED_SYSTEM_TEMPLATE_DEFAULT_DEFINITION_READ_FAILED:${definitionsResult.error.message}`,
    );
  }

  if (profileParametersResult.error) {
    throw new Error(
      `PARAMETERIZED_SYSTEM_TEMPLATE_DEFAULT_PROFILE_PARAMETER_READ_FAILED:${profileParametersResult.error.message}`,
    );
  }

  if (
    (
      definitionsResult.data ??
      []
    ).length !==
      parameterDefinitionIds.length ||
    (
      profileParametersResult.data ??
      []
    ).length !==
      parameterDefinitionIds.length
  ) {
    throw new Error(
      "PARAMETERIZED_SYSTEM_TEMPLATE_DEFAULT_PARAMETER_SET_CHANGED",
    );
  }

  const definitions =
    new Map(
      (
        definitionsResult.data ??
        []
      ).map(
        (
          row,
        ) => [
          String(
            row.id,
          ),
          row,
        ],
      ),
    );

  const profileParameters =
    new Map(
      (
        profileParametersResult.data ??
        []
      ).map(
        (
          row,
        ) => [
          String(
            row.parameter_definition_id,
          ),
          row,
        ],
      ),
    );

  for (const value of values) {
    const definition =
      definitions.get(
        value.parameterDefinitionId,
      );

    const profileParameter =
      profileParameters.get(
        value.parameterDefinitionId,
      );

    if (
      !definition ||
      !profileParameter ||
      definition.scope_code !==
        "system" ||
      definition.status !==
        "active" ||
      definition.value_type_code !==
        "numeric"
    ) {
      throw new Error(
        `PARAMETERIZED_SYSTEM_TEMPLATE_DEFAULT_PARAMETER_INVALID:${value.parameterDefinitionId}`,
      );
    }

    if (
      value.valueNumeric <
        0 &&
      definition.allow_negative !==
        true
    ) {
      throw new Error(
        `PARAMETERIZED_SYSTEM_TEMPLATE_DEFAULT_NEGATIVE_FORBIDDEN:${value.parameterDefinitionId}`,
      );
    }

    const metadata =
      record(
        profileParameter.metadata_json,
      );

    const {
      error,
    } =
      await supabase
        .from(
          "activity_template_profile_parameters_v2",
        )
        .update({
          metadata_json: {
            ...metadata,
            defaultLiteralValueV1: {
              contract:
                "ARCTOR_DEFAULT_LITERAL_VALUE_V1",
              valueTypeCode:
                "numeric",
              valueNumeric:
                value.valueNumeric,
              unitCode:
                definition.canonical_unit_code,
              useWhenMissing:
                true,
            },
          },
        })
        .eq(
          "id",
          profileParameter.id,
        );

    if (error) {
      throw new Error(
        `PARAMETERIZED_SYSTEM_TEMPLATE_DEFAULT_WRITE_FAILED:${error.message}`,
      );
    }
  }
}

async function appendAuditLog(input: {
  source:
    ParameterizedSystemTypicalActivityAuthoringInput;
  result:
    ParameterizedSystemTypicalActivityAuthoringResult;
}) {
  const now =
    new Date().toISOString();

  const id =
    stableUuid(
      `${ARCTOR_PARAMETERIZED_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1}|${input.source.requestId}|${input.result.fingerprint}`,
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
          input.source
            .curator
            .curatorAppUserId,
        raw_signal_id:
          null,
        activity_event_id:
          null,
        processor_name:
          "parameterized_system_typical_activity_authoring",
        processor_version:
          "1",
        processing_stage:
          "validate",
        processing_status:
          "completed",
        severity:
          "notice",
        message:
          "Parameterized system typical activity published by administrator",
        input_json:
          {},
        output_json:
          {},
        error_json:
          {},
        metadata_json: {
          contract:
            ARCTOR_PARAMETERIZED_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1,
          eventCode:
            "parameterized_system_typical_activity_published",
          requestId:
            input.source
              .requestId,
          fingerprint:
            input.result
              .fingerprint,
          title:
            input.source
              .title,
          titleEn:
            input.source
              .titleEn,
          actorApplicability:
            input.source
              .actorApplicability,
          templateMode:
            "parameterized",
          acceptanceMode:
            input.source
              .acceptanceMode,
          templateId:
            input.result
              .templateId,
          profileId:
            input.result
              .profileId,
          profileVersionNo:
            input.result
              .versionNo,
          parameterDefinitionIds:
            unique(
              input.source
                .parameterDefinitionIds,
            ),
          dynamicTargetBindings:
            normalizeBindings(
              input.source
                .dynamicTargetBindings,
            ),
          parameterDefaults:
            normalizeDefaultNumericValues(
              input.source
                .parameterDefaults,
            ),
          rawSignalCreated:
            false,
          activityEventCreated:
            false,
          activityFactCreated:
            false,
          curatorAppUserId:
            input.source
              .curator
              .curatorAppUserId,
          curatorActorId:
            input.source
              .curator
              .curatorActorId,
          curatorAdminId:
            input.source
              .curator
              .curatorAdminId,
          curatorRole:
            input.source
              .curator
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
      `PARAMETERIZED_SYSTEM_TEMPLATE_AUDIT_WRITE_FAILED:${error.message}`,
    );
  }
}

export async function
authorParameterizedSystemTypicalActivityV1(
  input:
    ParameterizedSystemTypicalActivityAuthoringInput,
): Promise<
  ParameterizedSystemTypicalActivityAuthoringResult
> {
  const parameterDefinitionIds =
    unique(
      input.parameterDefinitionIds,
    );

  const dynamicTargetBindings =
    normalizeBindings(
      input.dynamicTargetBindings,
    );

  const parameterDefaults =
    normalizeDefaultNumericValues(
      input.parameterDefaults,
    );

  for (const value of parameterDefaults) {
    if (
      !parameterDefinitionIds.includes(
        value.parameterDefinitionId,
      )
    ) {
      throw new Error(
        `PARAMETERIZED_SYSTEM_TEMPLATE_DEFAULT_PARAMETER_NOT_SELECTED:${value.parameterDefinitionId}`,
      );
    }
  }

  if (
    parameterDefinitionIds.length ===
      0 ||
    dynamicTargetBindings.length ===
      0
  ) {
    throw new Error(
      "PARAMETERIZED_SYSTEM_TEMPLATE_PROFILE_EMPTY",
    );
  }

  for (
    const parameterDefinitionId
    of parameterDefinitionIds
  ) {
    if (
      !dynamicTargetBindings.some(
        (binding) =>
          binding
            .parameterDefinitionId ===
          parameterDefinitionId,
      )
    ) {
      throw new Error(
        `PARAMETERIZED_SYSTEM_TEMPLATE_INTERMEDIATE_BINDING_MISSING:${parameterDefinitionId}`,
      );
    }
  }

  const materializationFingerprint =
    fingerprint(input);

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "save_curator_parameterized_system_typical_activity_v1",
      {
        p_request_id:
          input.requestId,
        p_curator_app_user_id:
          input.curator
            .curatorAppUserId,
        p_curator_actor_id:
          input.curator
            .curatorActorId,
        p_curator_admin_id:
          input.curator
            .curatorAdminId,
        p_curator_role:
          input.curator
            .curatorRole,
        p_locale:
          input.locale,
        p_title:
          input.title.trim(),
        p_title_en:
          input.titleEn.trim(),
        p_description:
          input.description.trim() ||
          null,
        p_description_en:
          input.descriptionEn.trim() ||
          null,
        p_fingerprint:
          materializationFingerprint,
        p_actor_applicability:
          input.actorApplicability,
        p_acceptance_mode:
          input.acceptanceMode,
        p_parameters:
          parameterDefinitionIds.map(
            (
              parameterDefinitionId,
              index,
            ) => ({
              parameterDefinitionId,
              capturePolicyCode:
                "deterministic_or_ai",
              isRequired:
                true,
              displayOrder:
                (index + 1) *
                100,
            }),
          ),
        p_dynamic_bindings:
          dynamicTargetBindings,
      },
    );

  if (error) {
    const details = [
      `code=${error.code || "unknown"}`,
      `message=${error.message || "unknown"}`,
      error.details
        ? `details=${error.details}`
        : "",
      error.hint
        ? `hint=${error.hint}`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const rpcUnavailable =
      error.code === "PGRST202";

    if (rpcUnavailable) {
      throw new Error(
        `PARAMETERIZED_SYSTEM_TEMPLATE_RPC_UNAVAILABLE:${details}`,
      );
    }

    throw new Error(
      `PARAMETERIZED_SYSTEM_TEMPLATE_RPC_FAILED:${details}`,
    );
  }

  const payload =
    record(data);

  const result:
    ParameterizedSystemTypicalActivityAuthoringResult = {
      contract:
        ARCTOR_PARAMETERIZED_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1,
      templateId:
        text(
          payload.templateId,
        ),
      profileId:
        text(
          payload.profileId,
        ),
      versionNo:
        Number(
          payload.versionNo,
        ),
      routingContractCode:
        "parameter_registry_v2",
      templateScope:
        "system",
      fingerprint:
        text(
          payload.fingerprint,
        ) ||
        materializationFingerprint,
      replayed:
        payload.replayed ===
        true,
      profileVersionCreated:
        payload.profileVersionCreated ===
        true,
    };

  if (
    !result.templateId ||
    !result.profileId ||
    !Number.isInteger(
      result.versionNo,
    ) ||
    result.versionNo < 1
  ) {
    throw new Error(
      "PARAMETERIZED_SYSTEM_TEMPLATE_RPC_RESULT_INVALID",
    );
  }

  await applyDefaultNumericValues({
    profileId:
      result.profileId,
    values:
      parameterDefaults,
  });

  await appendAuditLog({
    source:
      input,
    result,
  });

  return result;
}
