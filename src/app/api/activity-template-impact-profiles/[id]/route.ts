import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import { saveActivityTemplateAuthoringV2 } from "@/lib/activity/activity-template-authoring-v2.server";
import { normalizeActivityTemplateAuthoringV2Input } from "@/lib/activity-template-impact-profile-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "activity-template-impact-profile-detail-admin-v2" as const;

type RouteContext = { params: Promise<{ id: string }> };

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

async function resolveOwnedTemplate(
  id: string,
  ownerUserId: string,
  ownerActorId: string,
) {
  const { data, error } = await supabase
    .from("activity_templates")
    .select(
      "id,title,description,template_group,default_duration_minutes,status,is_active,updated_at",
    )
    .eq("id", id)
    .eq("template_scope", "user")
    .eq("owner_user_id", ownerUserId)
    .eq("owner_actor_id", ownerActorId)
    .is("organization_id", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "Active actor context not found" },
      { status: 500 },
    );
  }

  const { id } = await context.params;

  try {
    const template = await resolveOwnedTemplate(
      id,
      appUser.id,
      personActor.id,
    );

    if (!template) {
      return NextResponse.json(
        { ok: false, error: "Типовая активность не найдена." },
        { status: 404 },
      );
    }

    const { data: profileData, error: profileError } = await supabase
      .from("activity_template_impact_profiles_v1")
      .select(
        "id,template_id,version_no,status,notes,created_at,updated_at,routing_contract_code",
      )
      .eq("template_id", id)
      .eq("owner_user_id", appUser.id)
      .eq("owner_actor_id", personActor.id)
      .eq("status", "active")
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    const profile = profileData as ProfileRow | null;

    if (!profile) {
      return NextResponse.json(
        {
          ok: true,
          template,
          profile: null,
          parameterDefinitionIds: [],
          targetValueObjectIds: [],
          legacyParameterCodes: [],
        },
        { headers: { "Cache-Control": "private, no-store, max-age=0" } },
      );
    }

    const { data: linksData, error: linksError } = await supabase
      .from("activity_template_profile_object_links_v1")
      .select("target_value_object_id")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: true });

    if (linksError) {
      throw new Error(linksError.message);
    }

    const targetValueObjectIds = (linksData ?? []).map((row) =>
      String(row.target_value_object_id),
    );

    if (profile.routing_contract_code === "parameter_registry_v2") {
      const { data: parametersData, error: parametersError } = await supabase
        .from("activity_template_profile_parameters_v2")
        .select("parameter_definition_id")
        .eq("profile_id", profile.id)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (parametersError) {
        throw new Error(parametersError.message);
      }

      return NextResponse.json(
        {
          ok: true,
          template,
          profile,
          parameterDefinitionIds: (parametersData ?? []).map((row) =>
            String(row.parameter_definition_id),
          ),
          targetValueObjectIds,
          legacyParameterCodes: [],
        },
        { headers: { "Cache-Control": "private, no-store, max-age=0" } },
      );
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from("activity_template_profile_parameters_v1")
      .select("parameter_code")
      .eq("profile_id", profile.id)
      .order("display_order", { ascending: true });

    if (legacyError) {
      throw new Error(legacyError.message);
    }

    return NextResponse.json(
      {
        ok: true,
        template,
        profile,
        parameterDefinitionIds: [],
        targetValueObjectIds,
        legacyParameterCodes: (legacyData ?? []).map((row) =>
          String(row.parameter_code),
        ),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load template profile",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }
  if (!appUser || !personActor) {
    return NextResponse.json(
      { ok: false, error: "Active actor context not found" },
      { status: 500 },
    );
  }

  const { id } = await context.params;

  try {
    const template = await resolveOwnedTemplate(
      id,
      appUser.id,
      personActor.id,
    );

    if (!template) {
      return NextResponse.json(
        { ok: false, error: "Типовая активность не найдена." },
        { status: 404 },
      );
    }

    const body = normalizeActivityTemplateAuthoringV2Input(
      await request.json(),
    );
    const result = await saveActivityTemplateAuthoringV2({
      ownerUserId: appUser.id,
      ownerActorId: personActor.id,
      templateId: id,
      body,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Invalid profile payload",
      },
      { status: 400 },
    );
  }
}
