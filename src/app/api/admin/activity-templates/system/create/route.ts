import {
  parseSourceResolution,
  parseSourceTargetQualification,
  validateSourceBindingTargetQualifications,
  type SourceBinding,
  type SourceResolution,
  type SourceTargetQualification,
} from "@/lib/activity/source-snapshot-resolution";
import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

import {
  getActivityParameterPresentation,
} from "@/lib/activity/activity-parameter-presentation";

import {
  localizeGlobalSystemValueObject,
  normalizeGlobalSystemValueObjectLocale,
} from "@/lib/reality-core/global-system-value-object-localization";

import {
  authorFixedSystemTypicalActivityV2,
  type TypicalActivityAcceptanceMode,
  type TypicalActivityActorApplicability,
} from "@/lib/reality-curator/system-typical-activity-authoring-v2.server";

import {
  authorParameterizedSystemTypicalActivityV1,
  type ParameterizedTargetBinding,
} from "@/lib/reality-curator/parameterized-system-typical-activity-authoring.server";

import {
  getActivityUserContext,
} from "../../../../../../../lib/activity/activityUserContext";

import {
  supabase,
} from "../../../../../../../lib/supabase";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const ROUTE_MARKER =
  "system-typical-activity-authoring-v2" as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonRecord =
  Record<string, unknown>;

type TemplateMode =
  | "fixed"
  | "parameterized";

type WorkBody = {
  requestId?: unknown;
  locale?: unknown;
  title?: unknown;
  titleEn?: unknown;
  description?: unknown;
  descriptionEn?: unknown;
  actorApplicability?: unknown;
  templateMode?: unknown;
  acceptanceMode?: unknown;
  parameterDefinitionIds?: unknown;
  mappings?: unknown;
  dynamicTargetBindings?: unknown;
};

type MappingPair = {
  parameterDefinitionId: string;
  valueObjectId: string;
  sourceResolution?: SourceResolution;
  targetQualification?: SourceTargetQualification;
};

type ValueObjectRow = {
  id: string;
  canonical_key: string | null;
  title: string | null;
  description: string | null;
  metadata_json: unknown;
  scope_code: string;
  origin_type_code: string | null;
  ontology_node_role_code: string | null;
  status: string;
};

function text(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function record(
  value: unknown,
): JsonRecord {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function stringArray(
  value: unknown,
): string[] {
  return Array.isArray(value)
    ? value
        .filter(
          (
            item,
          ): item is string =>
            typeof item ===
            "string",
        )
        .map(
          (item) =>
            item.trim(),
        )
        .filter(Boolean)
    : [];
}

function mappingArray(
  value: unknown,
): MappingPair[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const mappings =
    value.flatMap(
      (item) => {
        const row =
          record(item);

        const parameterDefinitionId =
          text(
            row.parameterDefinitionId,
          );

        const valueObjectId =
          text(
            row.valueObjectId,
          );

        if (
          !UUID_RE.test(
            parameterDefinitionId,
          ) ||
          !UUID_RE.test(
            valueObjectId,
          )
        ) {
          return [];
        }

        const sourceResolution =
          parseSourceResolution(
            row.sourceResolution,
          );

        const targetQualification =
          parseSourceTargetQualification(
            row.targetQualification,
          );

        return [
          {
            parameterDefinitionId,
            valueObjectId,
            ...(sourceResolution
              ? {
                  sourceResolution,
                }
              : {}),
            ...(targetQualification
              ? {
                  targetQualification,
                }
              : {}),
          },
        ];
      },
    );

  validateSourceBindingTargetQualifications(
    mappings as SourceBinding[],
  );

  return mappings;
}

function dynamicTargetBindingArray(
  value: unknown,
): ParameterizedTargetBinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(
    (item) => {
      const row =
        record(item);

      const parameterDefinitionId =
        text(
          row.parameterDefinitionId,
        );

      const intermediateValueObjectId =
        text(
          row.intermediateValueObjectId,
        );

      if (
        !UUID_RE.test(
          parameterDefinitionId,
        ) ||
        !UUID_RE.test(
          intermediateValueObjectId,
        )
      ) {
        return [];
      }

      return [
        {
          parameterDefinitionId,
          intermediateValueObjectId,
        },
      ];
    },
  );
}

function errorResponse(
  errorCode: string,
  error: string,
  status: number,
) {
  return NextResponse.json(
    {
      ok:
        false,
      routeMarker:
        ROUTE_MARKER,
      errorCode,
      error,
    },
    {
      status,
    },
  );
}

function isActorApplicability(
  value: string,
): value is
  TypicalActivityActorApplicability {
  return [
    "private",
    "commercial",
    "both",
  ].includes(value);
}

function isAcceptanceMode(
  value: string,
): value is
  TypicalActivityAcceptanceMode {
  return [
    "user_confirmation",
    "auto_if_unambiguous",
  ].includes(value);
}

function isTemplateMode(
  value: string,
): value is TemplateMode {
  return [
    "fixed",
    "parameterized",
  ].includes(value);
}

export async function GET(
  request: Request,
) {
  const guard =
    await requirePlatformAdmin();

  if (!guard.ok) {
    return platformAdminErrorResponse(
      guard,
      ROUTE_MARKER,
    );
  }

  const url =
    new URL(
      request.url,
    );

  const locale =
    normalizeGlobalSystemValueObjectLocale(
      url.searchParams.get(
        "locale",
      ),
    );

  const parameterDefinitionId =
    text(
      url.searchParams.get(
        "parameterDefinitionId",
      ),
    );

  const targetNodeRole =
    text(
      url.searchParams.get(
        "targetNodeRole",
      ),
    ) ||
    "leaf";

  if (
    targetNodeRole !==
      "leaf" &&
    targetNodeRole !==
      "intermediate"
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_TARGET_NODE_ROLE_INVALID",
      "targetNodeRole must be leaf or intermediate",
      400,
    );
  }

  try {
    if (!parameterDefinitionId) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "value_object_parameter_definitions",
          )
          .select(
            "id,scope_code,parameter_code,title,description,dimension_code,value_type_code,canonical_unit_code,status",
          )
          .eq(
            "scope_code",
            "system",
          )
          .eq(
            "status",
            "active",
          )
          .order(
            "title",
            {
              ascending:
                true,
            },
          )
          .limit(
            1000,
          );

      if (error) {
        throw new Error(
          `SYSTEM_TEMPLATE_PARAMETER_CATALOG_READ_FAILED:${error.message}`,
        );
      }

      const parameters =
        (data ?? [])
          .map(
            (row) => {
              const presentation =
                getActivityParameterPresentation(
                  row.parameter_code,
                  locale,
                  row.title,
                  row.description,
                );

              return {
                id:
                  row.id,
                scopeCode:
                  row.scope_code,
                parameterCode:
                  row.parameter_code,
                title:
                  presentation.title,
                description:
                  presentation.description,
                dimensionCode:
                  row.dimension_code,
                valueTypeCode:
                  row.value_type_code,
                canonicalUnitCode:
                  row.canonical_unit_code,
              };
            },
          );

      return NextResponse.json({
        ok:
          true,
        routeMarker:
          ROUTE_MARKER,
        parameters,
      });
    }

    if (
      !UUID_RE.test(
        parameterDefinitionId,
      )
    ) {
      return errorResponse(
        "SYSTEM_TEMPLATE_PARAMETER_ID_INVALID",
        "parameterDefinitionId is invalid",
        400,
      );
    }

    const {
      data:
        valueObjectRows,
      error:
        valueObjectError,
    } =
      await supabase
        .from(
          "value_objects",
        )
        .select(
          "id,canonical_key,title,description,metadata_json,scope_code,origin_type_code,ontology_node_role_code,status",
        )
        .eq(
          "scope_code",
          "global",
        )
        .eq(
          "origin_type_code",
          "system_model",
        )
        .eq(
          "ontology_node_role_code",
          targetNodeRole,
        )
        .eq(
          "status",
          "active",
        )
        .order(
          "title",
          {
            ascending:
              true,
          },
        )
        .limit(
          3000,
        );

    if (valueObjectError) {
      throw new Error(
        `SYSTEM_TEMPLATE_VALUE_OBJECTS_READ_FAILED:${valueObjectError.message}`,
      );
    }

    const valueObjects =
      (
        (
          valueObjectRows ??
          []
        ) as unknown as
          ValueObjectRow[]
      )
        .map(
          (row) => {
            const localized =
              localizeGlobalSystemValueObject(
                row,
                locale,
              );

            const english =
              localizeGlobalSystemValueObject(
                row,
                "en",
              );

            return {
              id:
                row.id,
              canonicalKey:
                row.canonical_key,
              title:
                text(
                  localized.title,
                ) ||
                text(
                  english.title,
                ) ||
                text(
                  row.title,
                ) ||
                row.id,
              titleEn:
                text(
                  english.title,
                ) ||
                text(
                  row.title,
                ) ||
                row.id,
              description:
                text(
                  localized.description,
                ) ||
                text(
                  english.description,
                ) ||
                text(
                  row.description,
                ) ||
                null,
              nodeRole:
                row.ontology_node_role_code,
            };
          },
        )
        .sort(
          (
            left,
            right,
          ) =>
            left.title.localeCompare(
              right.title,
              locale,
            ),
        );

    return NextResponse.json({
      ok:
        true,
      routeMarker:
        ROUTE_MARKER,
      targetNodeRole,
      valueObjects,
    });
  } catch (
    error
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_GET_FAILED",
      error instanceof Error
        ? error.message
        : "System template data load failed",
      500,
    );
  }
}

export async function POST(
  request: Request,
) {
  const guard =
    await requirePlatformAdmin();

  if (!guard.ok) {
    return platformAdminErrorResponse(
      guard,
      ROUTE_MARKER,
    );
  }

  let body:
    WorkBody;

  try {
    body =
      await request.json() as
        WorkBody;
  } catch {
    return errorResponse(
      "SYSTEM_TEMPLATE_JSON_INVALID",
      "Invalid JSON body",
      400,
    );
  }

  const requestId =
    text(
      body.requestId,
    );

  const locale =
    normalizeGlobalSystemValueObjectLocale(
      body.locale,
    );

  const title =
    text(
      body.title,
    );

  const titleEn =
    text(
      body.titleEn,
    );

  const description =
    text(
      body.description,
    );

  const descriptionEn =
    text(
      body.descriptionEn,
    );

  const actorApplicability =
    text(
      body.actorApplicability,
    ) ||
    "private";

  const templateMode =
    text(
      body.templateMode,
    ) ||
    "fixed";

  const acceptanceMode =
    text(
      body.acceptanceMode,
    ) ||
    "user_confirmation";

  if (
    !isActorApplicability(
      actorApplicability,
    )
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_ACTOR_APPLICABILITY_INVALID",
      "actorApplicability is invalid",
      400,
    );
  }

  if (
    !isTemplateMode(
      templateMode,
    )
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_MODE_INVALID",
      "templateMode is invalid",
      400,
    );
  }

  if (
    !isAcceptanceMode(
      acceptanceMode,
    )
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_ACCEPTANCE_MODE_INVALID",
      "acceptanceMode is invalid",
      400,
    );
  }

  const parameterDefinitionIds =
    [
      ...new Set(
        stringArray(
          body.parameterDefinitionIds,
        ),
      ),
    ];

  let mappings:
    MappingPair[];

  let dynamicTargetBindings:
    ParameterizedTargetBinding[];

  try {
    mappings =
      mappingArray(
        body.mappings,
      );

    dynamicTargetBindings =
      dynamicTargetBindingArray(
        body.dynamicTargetBindings,
      );

    if (
      !Array.isArray(
        body.mappings,
      ) ||
      mappings.length !==
        body.mappings.length ||
      mappings.some(
        (mapping) =>
          !parameterDefinitionIds.includes(
            mapping.parameterDefinitionId,
          ),
      ) ||
      new Set(
        mappings.map(
          (mapping) =>
            `${mapping.parameterDefinitionId}|${mapping.valueObjectId}`,
        ),
      ).size !==
        mappings.length
    ) {
      throw new Error(
        "SOURCE_BINDINGS_INVALID",
      );
    }

    if (
      !Array.isArray(
        body.dynamicTargetBindings,
      ) ||
      dynamicTargetBindings.length !==
        body.dynamicTargetBindings.length ||
      dynamicTargetBindings.some(
        (binding) =>
          !parameterDefinitionIds.includes(
            binding.parameterDefinitionId,
          ),
      ) ||
      new Set(
        dynamicTargetBindings.map(
          (binding) =>
            `${binding.parameterDefinitionId}|${binding.intermediateValueObjectId}`,
        ),
      ).size !==
        dynamicTargetBindings.length
    ) {
      throw new Error(
        "DYNAMIC_TARGET_BINDINGS_INVALID",
      );
    }

    if (
      templateMode ===
      "fixed"
    ) {
      validateSourceBindingTargetQualifications(
        mappings as SourceBinding[],
      );
    }
  } catch (
    error
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_BINDINGS_INVALID",
      error instanceof Error
        ? error.message
        : "Invalid bindings",
      400,
    );
  }

  if (
    !UUID_RE.test(
      requestId,
    )
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_REQUEST_ID_INVALID",
      "requestId is invalid",
      400,
    );
  }

  if (
    !title ||
    title.length > 180
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_TITLE_INVALID",
      "title is required and must be 180 characters or fewer",
      400,
    );
  }

  if (
    !titleEn ||
    titleEn.length > 180
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_TITLE_EN_INVALID",
      "titleEn is required and must be 180 characters or fewer",
      400,
    );
  }

  if (
    description.length > 4000 ||
    descriptionEn.length > 4000
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_DESCRIPTION_TOO_LONG",
      "description fields must be 4000 characters or fewer",
      400,
    );
  }

  if (
    parameterDefinitionIds.length ===
    0
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_PARAMETERS_REQUIRED",
      "At least one parameter is required",
      400,
    );
  }

  if (
    templateMode ===
      "fixed" &&
    mappings.length ===
      0
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_FIXED_MAPPINGS_REQUIRED",
      "Fixed template requires parameter-to-leaf mappings",
      400,
    );
  }

  if (
    templateMode ===
      "parameterized" &&
    dynamicTargetBindings.length ===
      0
  ) {
    return errorResponse(
      "SYSTEM_TEMPLATE_PARAMETERIZED_BINDINGS_REQUIRED",
      "Parameterized template requires parameter-to-intermediate bindings",
      400,
    );
  }

  for (
    const parameterDefinitionId
    of parameterDefinitionIds
  ) {
    if (
      !UUID_RE.test(
        parameterDefinitionId,
      )
    ) {
      return errorResponse(
        "SYSTEM_TEMPLATE_PARAMETER_ID_INVALID",
        "parameterDefinitionIds contains an invalid id",
        400,
      );
    }

    const hasTarget =
      templateMode ===
      "fixed"
        ? mappings.some(
            (mapping) =>
              mapping.parameterDefinitionId ===
              parameterDefinitionId,
          )
        : dynamicTargetBindings.some(
            (binding) =>
              binding.parameterDefinitionId ===
              parameterDefinitionId,
          );

    if (!hasTarget) {
      return errorResponse(
        "SYSTEM_TEMPLATE_PARAMETER_TARGET_MISSING",
        "Every selected parameter must have at least one configured target",
        400,
      );
    }
  }

  try {
    const {
      appUser,
      personActor,
      errorResponse:
        actorContextError,
    } =
      await getActivityUserContext();

    if (actorContextError) {
      return actorContextError;
    }

    if (
      !appUser ||
      !personActor
    ) {
      return errorResponse(
        "SYSTEM_TEMPLATE_ACTIVE_ACTOR_REQUIRED",
        "Active actor context not found",
        409,
      );
    }

    if (
      appUser.id !==
      guard.appUser.id
    ) {
      return errorResponse(
        "SYSTEM_TEMPLATE_ADMIN_ACTOR_CONTEXT_MISMATCH",
        "Current actor context does not belong to the active platform admin.",
        409,
      );
    }

    const curator = {
      curatorAppUserId:
        guard.appUser.id,
      curatorActorId:
        personActor.id,
      curatorAdminId:
        guard.platformAdmin.id,
      curatorRole:
        guard.platformAdmin.role,
    };

    const result =
      templateMode ===
      "parameterized"
        ? await authorParameterizedSystemTypicalActivityV1({
            requestId,
            curator,
            locale,
            title,
            titleEn,
            description,
            descriptionEn,
            actorApplicability,
            acceptanceMode,
            parameterDefinitionIds,
            dynamicTargetBindings,
          })
        : await authorFixedSystemTypicalActivityV2({
            requestId,
            curator,
            locale,
            title,
            titleEn,
            description,
            descriptionEn,
            actorApplicability,
            acceptanceMode,
            parameterDefinitionIds,
            mappings,
          });

    return NextResponse.json({
      ok:
        true,
      routeMarker:
        ROUTE_MARKER,
      result,
      authoring: {
        actorApplicability,
        templateMode,
        acceptanceMode,
      },
      sideEffects: {
        rawSignalsCreated:
          0,
        activityEventsCreated:
          0,
        activityFactsCreated:
          0,
        formulasCreated:
          0,
      },
    });
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "System template authoring failed";

    const status =
      message.includes(
        "CONFLICT",
      ) ||
      message.includes(
        "COLLIDES",
      )
        ? 409
        : 500;

    return errorResponse(
      "SYSTEM_TEMPLATE_POST_FAILED",
      message,
      status,
    );
  }
}
