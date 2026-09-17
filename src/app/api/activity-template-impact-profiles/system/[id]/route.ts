import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { loadSystemTypicalActivityCatalogV1 } from "@/lib/activity/typical-activity-catalog.server";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER =
  "activity-template-impact-profile-system-detail-v1" as const;

type LocaleCode =
  | "en"
  | "pl"
  | "ru"
  | "uk"
  | "de"
  | "es"
  | "cs";

type JsonRecord =
  Record<string, unknown>;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TemplateRow = {
  id: string;
  title: string;
  description: string | null;
  default_duration_minutes: number | null;
  status: string;
  is_active: boolean;
  visibility: string;
  source_type: string;
  updated_at: string;
  default_metadata_json: unknown;
};

type ProfileRow = {
  id: string;
  template_id: string;
  version_no: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  routing_contract_code: string;
};

type ParameterRow = {
  parameter_definition_id: string;
  display_order: number;
};

type DefinitionRow = {
  id: string;
  parameter_code: string;
  title: string;
  description: string | null;
  dimension_code: string;
  canonical_unit_code: string;
};

function normalizeLocale(
  value: string | null,
): LocaleCode {
  return value === "pl" ||
    value === "ru" ||
    value === "uk" ||
    value === "de" ||
    value === "es" ||
    value === "cs"
    ? value
    : "en";
}

function asRecord(
  value: unknown,
): JsonRecord | null {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asString(
  value: unknown,
): string | null {
  return typeof value === "string" &&
    value.trim()
    ? value
    : null;
}

function localizedTemplate(
  template: TemplateRow,
  locale: LocaleCode,
) {
  const metadata =
    asRecord(
      template.default_metadata_json,
    );

  const materialization =
    asRecord(
      metadata?.curatorSystemMaterializationV1,
    );

  const localizations =
    asRecord(
      materialization?.localizations,
    );

  const localized =
    asRecord(
      localizations?.[locale],
    );

  const english =
    asRecord(
      localizations?.en,
    );

  return {
    title:
      asString(
        localized?.title,
      ) ??
      asString(
        english?.title,
      ) ??
      template.title,

    description:
      asString(
        localized?.description,
      ) ??
      asString(
        english?.description,
      ) ??
      template.description,

    canonicalTitle:
      template.title,

    creationLocale:
      asString(
        materialization?.creationLocale,
      ),

    publicationState:
      asString(
        materialization?.publicationState,
      ),

    sourceSignalId:
      asString(
        materialization?.sourceSignalId,
      ),
  };
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  const guard =
    await requirePlatformAdmin();

  if (!guard.ok) {
    return platformAdminErrorResponse(
      guard,
      ROUTE_MARKER,
    );
  }

  const {
    id,
  } =
    await context.params;

  const locale =
    normalizeLocale(
      new URL(request.url)
        .searchParams
        .get("locale"),
    );

  try {
    const canonicalCatalog =
      await loadSystemTypicalActivityCatalogV1({
        limit: 5001,
      });

    const canonicalTemplate =
      canonicalCatalog.find(
        (row) =>
          row.id === id,
      );

    if (!canonicalTemplate) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "System typical activity not found",
        },
        {
          status: 404,
        },
      );
    }

    const {
      data: templateData,
      error: templateError,
    } = await supabase
      .from(
        "activity_templates",
      )
      .select(
        [
          "id",
          "title",
          "description",
          "default_duration_minutes",
          "status",
          "is_active",
          "visibility",
          "source_type",
          "updated_at",
          "default_metadata_json",
        ].join(","),
      )
      .eq(
        "id",
        id,
      )
      .maybeSingle();

    if (templateError) {
      throw new Error(
        templateError.message,
      );
    }

    if (!templateData) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "System typical activity not found",
        },
        {
          status: 404,
        },
      );
    }

    const template =
      templateData as unknown as TemplateRow;

    const localized =
      localizedTemplate(
        template,
        locale,
      );

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from(
        "activity_template_impact_profiles_v1",
      )
      .select(
        [
          "id",
          "template_id",
          "version_no",
          "status",
          "notes",
          "created_at",
          "updated_at",
          "routing_contract_code",
        ].join(","),
      )
      .eq(
        "template_id",
        id,
      )
      .eq(
        "status",
        "active",
      )
      .order(
        "version_no",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

    if (profileError) {
      throw new Error(
        profileError.message,
      );
    }

    const profile =
      profileData
        ? (
            profileData as unknown as ProfileRow
          )
        : null;

    if (!profile) {
      return NextResponse.json(
        {
          ok: true,
          scope: "system",
          locale,

          template: {
            id:
              template.id,

            title:
              localized.title,

            canonicalTitle:
              localized.canonicalTitle,

            description:
              localized.description,

            defaultDurationMinutes:
              template.default_duration_minutes,

            status:
              template.status,

            isActive:
              template.is_active,

            visibility:
              template.visibility,

            sourceType:
              template.source_type,

            updatedAt:
              template.updated_at,

            creationLocale:
              localized.creationLocale,

            publicationState:
              localized.publicationState,

            sourceSignalId:
              localized.sourceSignalId,
          },

          profile: null,

          parameters: [],

          targetValueObjectIds: [],
        },
        {
          headers: {
            "Cache-Control":
              "private, no-store, max-age=0",
          },
        },
      );
    }

    if (
      profile.routing_contract_code !==
      "parameter_registry_v2"
    ) {
      throw new Error(
        "SYSTEM_TEMPLATE_ROUTING_CONTRACT_NOT_V2",
      );
    }

    const [
      parameterResult,
      objectResult,
    ] = await Promise.all([
      supabase
        .from(
          "activity_template_profile_parameters_v2",
        )
        .select(
          [
            "parameter_definition_id",
            "display_order",
          ].join(","),
        )
        .eq(
          "profile_id",
          profile.id,
        )
        .order(
          "display_order",
          {
            ascending: true,
          },
        ),

      supabase
        .from(
          "activity_template_profile_object_links_v1",
        )
        .select(
          "target_value_object_id",
        )
        .eq(
          "profile_id",
          profile.id,
        )
        .order(
          "created_at",
          {
            ascending: true,
          },
        ),
    ]);

    if (parameterResult.error) {
      throw new Error(
        parameterResult.error.message,
      );
    }

    if (objectResult.error) {
      throw new Error(
        objectResult.error.message,
      );
    }

    const parameterRows =
      (
        parameterResult.data ??
        []
      ) as unknown as ParameterRow[];

    const parameterIds =
      parameterRows.map(
        (row) =>
          row.parameter_definition_id,
      );

    const definitionResult =
      parameterIds.length > 0
        ? await supabase
            .from(
              "value_object_parameter_definitions",
            )
            .select(
              [
                "id",
                "parameter_code",
                "title",
                "description",
                "dimension_code",
                "canonical_unit_code",
              ].join(","),
            )
            .in(
              "id",
              parameterIds,
            )
        : {
            data: [],
            error: null,
          };

    if (definitionResult.error) {
      throw new Error(
        definitionResult.error.message,
      );
    }

    const definitions =
      (
        definitionResult.data ??
        []
      ) as unknown as DefinitionRow[];

    const definitionById =
      new Map(
        definitions.map(
          (definition) => [
            definition.id,
            definition,
          ],
        ),
      );

    const parameters =
      parameterRows.map(
        (row) => {
          const definition =
            definitionById.get(
              row.parameter_definition_id,
            );

          return {
            id:
              row.parameter_definition_id,

            parameterCode:
              definition?.parameter_code ??
              row.parameter_definition_id,

            title:
              definition?.title ??
              row.parameter_definition_id,

            description:
              definition?.description ??
              null,

            dimensionCode:
              definition?.dimension_code ??
              "unknown",

            canonicalUnitCode:
              definition?.canonical_unit_code ??
              "",
          };
        },
      );

    const targetValueObjectIds =
      (
        (objectResult.data ?? []) as Array<{
          target_value_object_id: unknown;
        }>
      ).map(
        (row) =>
          String(
            row.target_value_object_id,
          ),
      );

    return NextResponse.json(
      {
        ok: true,
        scope: "system",
        locale,

        template: {
          id:
            template.id,

          title:
            localized.title,

          canonicalTitle:
            localized.canonicalTitle,

          description:
            localized.description,

          defaultDurationMinutes:
            template.default_duration_minutes,

          status:
            template.status,

          isActive:
            template.is_active,

          visibility:
            template.visibility,

          sourceType:
            template.source_type,

          updatedAt:
            template.updated_at,

          creationLocale:
            localized.creationLocale,

          publicationState:
            localized.publicationState,

          sourceSignalId:
            localized.sourceSignalId,
        },

        profile: {
          id:
            profile.id,

          versionNo:
            profile.version_no,

          status:
            profile.status,

          notes:
            profile.notes,

          routingContractCode:
            profile.routing_contract_code,

          createdAt:
            profile.created_at,

          updatedAt:
            profile.updated_at,
        },

        parameters,

        targetValueObjectIds,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Could not load system typical activity",
      },
      {
        status: 500,
      },
    );
  }
}