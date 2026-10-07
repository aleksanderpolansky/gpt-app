import {
  authorDirectSystemTypicalActivityV1,
} from "@/lib/reality-curator/direct-system-typical-activity-authoring.server";

import {
  supabase,
} from "../../../lib/supabase";

export const ARCTOR_TYPICAL_ACTIVITY_AUTHORING_V2 =
  "ARCTOR_TYPICAL_ACTIVITY_AUTHORING_V2" as const;

export type TypicalActivityActorApplicability =
  | "private"
  | "commercial"
  | "both";

export type TypicalActivityAcceptanceMode =
  | "user_confirmation"
  | "auto_if_unambiguous";

type CuratorIdentity = {
  curatorAppUserId: string;
  curatorActorId: string;
  curatorAdminId: string;
  curatorRole: string;
};

type MappingPair = Parameters<
  typeof authorDirectSystemTypicalActivityV1
>[0]["mappings"][number];

type JsonRecord =
  Record<string, unknown>;

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

export type FixedSystemTypicalActivityAuthoringV2Input = {
  requestId: string;
  curator: CuratorIdentity;
  locale: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  actorApplicability:
    TypicalActivityActorApplicability;
  acceptanceMode:
    TypicalActivityAcceptanceMode;
  parameterDefinitionIds: string[];
  mappings: MappingPair[];
};

async function
annotateFixedTemplateV2(
  input: {
    templateId: string;
    profileId: string;
    actorApplicability:
      TypicalActivityActorApplicability;
    acceptanceMode:
      TypicalActivityAcceptanceMode;
  },
) {
  const [
    templateResult,
    profileResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "activity_templates",
        )
        .select(
          "id,default_metadata_json",
        )
        .eq(
          "id",
          input.templateId,
        )
        .maybeSingle(),

      supabase
        .from(
          "activity_template_impact_profiles_v1",
        )
        .select(
          "id,metadata_json",
        )
        .eq(
          "id",
          input.profileId,
        )
        .maybeSingle(),
    ]);

  if (
    templateResult.error ||
    !templateResult.data
  ) {
    throw new Error(
      `TYPICAL_ACTIVITY_AUTHORING_V2_TEMPLATE_READ_FAILED:${templateResult.error?.message ?? "missing"}`,
    );
  }

  if (
    profileResult.error ||
    !profileResult.data
  ) {
    throw new Error(
      `TYPICAL_ACTIVITY_AUTHORING_V2_PROFILE_READ_FAILED:${profileResult.error?.message ?? "missing"}`,
    );
  }

  const expected = {
    contract:
      ARCTOR_TYPICAL_ACTIVITY_AUTHORING_V2,
    actorApplicability:
      input.actorApplicability,
    templateMode:
      "fixed",
    acceptanceMode:
      input.acceptanceMode,
  };

  const templateMetadata =
    record(
      templateResult
        .data
        .default_metadata_json,
    );

  const profileMetadata =
    record(
      profileResult
        .data
        .metadata_json,
    );

  const existing =
    record(
      templateMetadata
        .typicalActivityAuthoringV2,
    );

  if (
    Object.keys(existing).length >
      0 &&
    (
      text(
        existing
          .contract,
      ) !==
        ARCTOR_TYPICAL_ACTIVITY_AUTHORING_V2 ||
      text(
        existing
          .actorApplicability,
      ) !==
        input.actorApplicability ||
      text(
        existing
          .templateMode,
      ) !==
        "fixed" ||
      text(
        existing
          .acceptanceMode,
      ) !==
        input.acceptanceMode
    )
  ) {
    throw new Error(
      "TYPICAL_ACTIVITY_AUTHORING_V2_CONFIG_CONFLICT",
    );
  }

  const now =
    new Date()
      .toISOString();

  const [
    templateUpdate,
    profileUpdate,
  ] =
    await Promise.all([
      supabase
        .from(
          "activity_templates",
        )
        .update({
          default_metadata_json: {
            ...templateMetadata,
            typicalActivityAuthoringV2: {
              ...expected,
              updatedAt:
                now,
            },
          },
        })
        .eq(
          "id",
          input.templateId,
        ),

      supabase
        .from(
          "activity_template_impact_profiles_v1",
        )
        .update({
          metadata_json: {
            ...profileMetadata,
            typicalActivityAuthoringV2: {
              ...expected,
              updatedAt:
                now,
            },
          },
        })
        .eq(
          "id",
          input.profileId,
        ),
    ]);

  if (
    templateUpdate.error
  ) {
    throw new Error(
      `TYPICAL_ACTIVITY_AUTHORING_V2_TEMPLATE_WRITE_FAILED:${templateUpdate.error.message}`,
    );
  }

  if (
    profileUpdate.error
  ) {
    throw new Error(
      `TYPICAL_ACTIVITY_AUTHORING_V2_PROFILE_WRITE_FAILED:${profileUpdate.error.message}`,
    );
  }
}

export async function
authorFixedSystemTypicalActivityV2(
  input:
    FixedSystemTypicalActivityAuthoringV2Input,
) {
  const result =
    await authorDirectSystemTypicalActivityV1({
      requestId:
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
      parameterDefinitionIds:
        input.parameterDefinitionIds,
      mappings:
        input.mappings,
    });

  await annotateFixedTemplateV2({
    templateId:
      result.templateId,
    profileId:
      result.profileId,
    actorApplicability:
      input.actorApplicability,
    acceptanceMode:
      input.acceptanceMode,
  });

  return result;
}
