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
  short_title?: string | null;
  description: string | null;
  template_scope?: string;
  owner_user_id?: string | null;
  owner_actor_id?: string | null;
  organization_id?: string | null;
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

const SYSTEM_TYPICAL_ACTIVITY_LOCALES: readonly LocaleCode[] = [
  "en",
  "pl",
  "ru",
  "uk",
  "de",
  "es",
  "cs",
] as const;

const LOCALIZATION_EDIT_CONTRACT =
  "ARCTOR_SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_EDIT_V1" as const;

type PatchBody = {
  locale?: unknown;
  title?: unknown;
  description?: unknown;
  expectedUpdatedAt?: unknown;
};

function strictLocale(
  value: unknown,
): LocaleCode | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim() as LocaleCode;

  return SYSTEM_TYPICAL_ACTIVITY_LOCALES.includes(
    normalized,
  )
    ? normalized
    : null;
}

function stringArray(
  value: unknown,
): string[] {
  return Array.isArray(value)
    ? value
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function uniqueAliases(
  values: string[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();

    if (!trimmed) {
      continue;
    }

    const key =
      trimmed.toLocaleLowerCase("en-US");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

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

  const localizedTitle =
    asString(
      localized?.title,
    );

  const localizedDescription =
    typeof localized?.description ===
      "string"
      ? localized.description
      : null;

  const englishTitle =
    asString(
      english?.title,
    );

  const englishDescription =
    typeof english?.description ===
      "string"
      ? english.description
      : null;

  const hasRequestedLocalization =
    Boolean(localizedTitle);

  const availableLocales =
    SYSTEM_TYPICAL_ACTIVITY_LOCALES.filter(
      (candidate) => {
        const row =
          asRecord(
            localizations?.[candidate],
          );

        return Boolean(
          asString(row?.title),
        );
      },
    );

  const fallbackUsed =
    locale !== "en" &&
    !hasRequestedLocalization;

  return {
    title:
      localizedTitle ??
      englishTitle ??
      template.title,

    description:
      hasRequestedLocalization
        ? localizedDescription
        : englishDescription ??
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

    requestedLocale:
      locale,

    hasRequestedLocalization,

    fallbackUsed,

    fallbackLocale:
      fallbackUsed
        ? "en"
        : locale,

    availableLocales,
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

            requestedLocale:
              localized.requestedLocale,

            hasRequestedLocalization:
              localized.hasRequestedLocalization,

            fallbackUsed:
              localized.fallbackUsed,

            fallbackLocale:
              localized.fallbackLocale,

            availableLocales:
              localized.availableLocales,
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

          requestedLocale:
            localized.requestedLocale,

          hasRequestedLocalization:
            localized.hasRequestedLocalization,

          fallbackUsed:
            localized.fallbackUsed,

          fallbackLocale:
            localized.fallbackLocale,

          availableLocales:
            localized.availableLocales,
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

export async function PATCH(
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

  const { id } =
    await context.params;

  let body: PatchBody;

  try {
    body =
      (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        errorCode:
          "SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_BODY_INVALID",
        error:
          "Request body must be valid JSON",
      },
      { status: 400 },
    );
  }

  const locale =
    strictLocale(body.locale);

  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : "";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : "";

  const expectedUpdatedAt =
    typeof body.expectedUpdatedAt === "string" &&
    body.expectedUpdatedAt.trim()
      ? body.expectedUpdatedAt.trim()
      : null;

  if (!locale) {
    return NextResponse.json(
      {
        ok: false,
        errorCode:
          "SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_LOCALE_INVALID",
        error:
          "locale must be one of en, pl, ru, uk, de, es, cs",
      },
      { status: 400 },
    );
  }

  if (!title) {
    return NextResponse.json(
      {
        ok: false,
        errorCode:
          "SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_TITLE_REQUIRED",
        error:
          "Localized title is required",
      },
      { status: 400 },
    );
  }

  if (title.length > 240) {
    return NextResponse.json(
      {
        ok: false,
        errorCode:
          "SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_TITLE_TOO_LONG",
        error:
          "Localized title is too long",
      },
      { status: 400 },
    );
  }

  if (description.length > 6000) {
    return NextResponse.json(
      {
        ok: false,
        errorCode:
          "SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_DESCRIPTION_TOO_LONG",
        error:
          "Localized description is too long",
      },
      { status: 400 },
    );
  }

  try {
    const {
      data: templateData,
      error: templateError,
    } = await supabase
      .from("activity_templates")
      .select(
        [
          "id",
          "title",
          "short_title",
          "description",
          "template_scope",
          "owner_user_id",
          "owner_actor_id",
          "organization_id",
          "default_duration_minutes",
          "status",
          "is_active",
          "visibility",
          "source_type",
          "updated_at",
          "default_metadata_json",
        ].join(","),
      )
      .eq("id", id)
      .eq("template_scope", "system")
      .is("owner_user_id", null)
      .is("owner_actor_id", null)
      .is("organization_id", null)
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
          errorCode:
            "SYSTEM_TYPICAL_ACTIVITY_NOT_FOUND",
          error:
            "System typical activity not found",
        },
        { status: 404 },
      );
    }

    const template =
      templateData as unknown as TemplateRow;

    if (
      expectedUpdatedAt &&
      template.updated_at !== expectedUpdatedAt
    ) {
      return NextResponse.json(
        {
          ok: false,
          errorCode:
            "SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_CONFLICT",
          error:
            "The system typical activity changed after it was loaded. Reload and try again.",
        },
        { status: 409 },
      );
    }

    const metadata =
      asRecord(
        template.default_metadata_json,
      ) ?? {};

    const typicalActivity =
      asRecord(
        metadata.arctorTypicalActivity,
      );

    if (
      asString(typicalActivity?.kind) !==
        "typical_activity" ||
      asString(typicalActivity?.scope) !==
        "system"
    ) {
      return NextResponse.json(
        {
          ok: false,
          errorCode:
            "SYSTEM_TYPICAL_ACTIVITY_METADATA_INVALID",
          error:
            "Template is not a canonical System typical activity",
        },
        { status: 409 },
      );
    }

    const materialization =
      asRecord(
        metadata.curatorSystemMaterializationV1,
      ) ?? {};

    const localizations =
      asRecord(
        materialization.localizations,
      ) ?? {};

    const audit =
      asRecord(
        materialization.localizationEditsV1,
      ) ?? {};

    const auditLocales =
      asRecord(
        audit.locales,
      ) ?? {};

    const now =
      new Date().toISOString();

    const nextLocalizations: JsonRecord = {
      ...localizations,
      [locale]: {
        title,
        description,
      },
    };

    const nextAliases =
      uniqueAliases([
        ...stringArray(
          materialization.recognitionAliases,
        ),
        template.title,
        ...Object.values(nextLocalizations)
          .flatMap((value) => {
            const row =
              asRecord(value);

            const localizedTitle =
              asString(row?.title);

            return localizedTitle
              ? [localizedTitle]
              : [];
          }),
      ]);

    const nextMetadata: JsonRecord = {
      ...metadata,
      curatorSystemMaterializationV1: {
        ...materialization,
        localizations:
          nextLocalizations,
        recognitionAliases:
          nextAliases,
        localizationEditsV1: {
          ...audit,
          contract:
            LOCALIZATION_EDIT_CONTRACT,
          updatedAt:
            now,
          locales: {
            ...auditLocales,
            [locale]: {
              source:
                "human_admin",
              status:
                "confirmed",
              updatedAt:
                now,
              updatedByAppUserId:
                guard.appUser.id,
              updatedByAdminId:
                guard.platformAdmin.id,
              updatedByRole:
                guard.platformAdmin.role,
            },
          },
        },
      },
    };

    const updatePayload: JsonRecord = {
      default_metadata_json:
        nextMetadata,
      updated_at:
        now,
    };

    if (locale === "en") {
      updatePayload.title = title;
      updatePayload.short_title = title;
      updatePayload.description =
        description || null;
    }

    let updateQuery =
      supabase
        .from("activity_templates")
        .update(updatePayload)
        .eq("id", id)
        .eq("template_scope", "system")
        .is("owner_user_id", null)
        .is("owner_actor_id", null)
        .is("organization_id", null);

    if (expectedUpdatedAt) {
      updateQuery =
        updateQuery.eq(
          "updated_at",
          expectedUpdatedAt,
        );
    }

    const {
      data: updatedData,
      error: updateError,
    } = await updateQuery
      .select(
        [
          "id",
          "title",
          "short_title",
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
      .maybeSingle();

    if (updateError) {
      throw new Error(
        updateError.message,
      );
    }

    if (!updatedData) {
      return NextResponse.json(
        {
          ok: false,
          errorCode:
            "SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_CONFLICT",
          error:
            "The system typical activity changed before the localization was saved. Reload and try again.",
        },
        { status: 409 },
      );
    }

    const updatedTemplate =
      updatedData as unknown as TemplateRow;

    const localized =
      localizedTemplate(
        updatedTemplate,
        locale,
      );

    return NextResponse.json(
      {
        ok: true,
        routeMarker:
          ROUTE_MARKER,
        scope: "system",
        locale,
        template: {
          id:
            updatedTemplate.id,
          title:
            localized.title,
          canonicalTitle:
            localized.canonicalTitle,
          description:
            localized.description,
          defaultDurationMinutes:
            updatedTemplate.default_duration_minutes,
          status:
            updatedTemplate.status,
          isActive:
            updatedTemplate.is_active,
          visibility:
            updatedTemplate.visibility,
          sourceType:
            updatedTemplate.source_type,
          updatedAt:
            updatedTemplate.updated_at,
          creationLocale:
            localized.creationLocale,
          publicationState:
            localized.publicationState,
          sourceSignalId:
            localized.sourceSignalId,
          requestedLocale:
            localized.requestedLocale,
          hasRequestedLocalization:
            localized.hasRequestedLocalization,
          fallbackUsed:
            localized.fallbackUsed,
          fallbackLocale:
            localized.fallbackLocale,
          availableLocales:
            localized.availableLocales,
        },
        localizationEdit: {
          contract:
            LOCALIZATION_EDIT_CONTRACT,
          locale,
          source:
            "human_admin",
          status:
            "confirmed",
          updatedAt:
            now,
        },
        sideEffects: {
          templateMetadataWriteExecuted:
            true,
          canonicalEnglishWriteExecuted:
            locale === "en",
          profileWriteExecuted:
            false,
          parameterWriteExecuted:
            false,
          routingWriteExecuted:
            false,
          openAiCallExecuted:
            false,
        },
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
        errorCode:
          "SYSTEM_TYPICAL_ACTIVITY_LOCALIZATION_SAVE_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Could not save system typical activity localization",
      },
      { status: 500 },
    );
  }
}
