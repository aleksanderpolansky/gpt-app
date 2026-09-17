import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER =
  "activity-template-impact-profiles-system-catalog-v1" as const;

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
  updated_at: string;
  routing_contract_code: string;
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

  const title =
    asString(localized?.title) ??
    asString(english?.title) ??
    template.title;

  const description =
    asString(localized?.description) ??
    asString(english?.description) ??
    template.description;

  return {
    title,
    description,
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
  };
}

function countByProfile(
  rows: Array<{
    profile_id: string;
  }>,
) {
  const result =
    new Map<string, number>();

  for (const row of rows) {
    result.set(
      row.profile_id,
      (result.get(row.profile_id) ?? 0) + 1,
    );
  }

  return result;
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

  const locale =
    normalizeLocale(
      new URL(request.url)
        .searchParams
        .get("locale"),
    );

  const {
    data: templatesData,
    error: templatesError,
  } = await supabase
    .from("activity_templates")
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
      "template_scope",
      "system",
    )
    .is(
      "owner_user_id",
      null,
    )
    .is(
      "owner_actor_id",
      null,
    )
    .is(
      "organization_id",
      null,
    )
    .eq(
      "status",
      "active",
    )
    .eq(
      "is_active",
      true,
    )
    .order(
      "updated_at",
      {
        ascending: false,
      },
    )
    .limit(500);

  if (templatesError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          templatesError.message,
      },
      {
        status: 500,
      },
    );
  }

  const templates =
    (templatesData ??
      []) as unknown as TemplateRow[];

  const templateIds =
    templates.map(
      (template) =>
        template.id,
    );

  if (
    templateIds.length === 0
  ) {
    return NextResponse.json(
      {
        ok: true,
        scope: "system",
        locale,
        templates: [],
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  }

  const {
    data: profilesData,
    error: profilesError,
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
        "updated_at",
        "routing_contract_code",
      ].join(","),
    )
    .eq(
      "status",
      "active",
    )
    .in(
      "template_id",
      templateIds,
    )
    .order(
      "version_no",
      {
        ascending: false,
      },
    );

  if (profilesError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          profilesError.message,
      },
      {
        status: 500,
      },
    );
  }

  const profiles =
    (profilesData ??
      []) as unknown as ProfileRow[];

  const profileByTemplate =
    new Map<string, ProfileRow>();

  for (const profile of profiles) {
    if (
      !profileByTemplate.has(
        profile.template_id,
      )
    ) {
      profileByTemplate.set(
        profile.template_id,
        profile,
      );
    }
  }

  const profileIds =
    [
      ...profileByTemplate
        .values(),
    ].map(
      (profile) =>
        profile.id,
    );

  const parameterResult =
    profileIds.length > 0
      ? await supabase
          .from(
            "activity_template_profile_parameters_v2",
          )
          .select(
            "profile_id",
          )
          .in(
            "profile_id",
            profileIds,
          )
      : {
          data: [],
          error: null,
        };

  const objectResult =
    profileIds.length > 0
      ? await supabase
          .from(
            "activity_template_profile_object_links_v1",
          )
          .select(
            "profile_id",
          )
          .in(
            "profile_id",
            profileIds,
          )
      : {
          data: [],
          error: null,
        };

  if (parameterResult.error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          parameterResult.error.message,
      },
      {
        status: 500,
      },
    );
  }

  if (objectResult.error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          objectResult.error.message,
      },
      {
        status: 500,
      },
    );
  }

  const parameterCount =
    countByProfile(
      (parameterResult.data ??
        []) as Array<{
        profile_id: string;
      }>,
    );

  const objectCount =
    countByProfile(
      (objectResult.data ??
        []) as Array<{
        profile_id: string;
      }>,
    );

  return NextResponse.json(
    {
      ok: true,
      scope: "system",
      locale,

      templates:
        templates.map(
          (template) => {
            const localized =
              localizedTemplate(
                template,
                locale,
              );

            const profile =
              profileByTemplate.get(
                template.id,
              );

            return {
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

              activeProfile:
                profile
                  ? {
                      id:
                        profile.id,

                      versionNo:
                        profile.version_no,

                      routingContractCode:
                        profile.routing_contract_code,

                      parameterCount:
                        parameterCount.get(
                          profile.id,
                        ) ?? 0,

                      objectCount:
                        objectCount.get(
                          profile.id,
                        ) ?? 0,

                      updatedAt:
                        profile.updated_at,
                    }
                  : null,
            };
          },
        ),
    },
    {
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    },
  );
}