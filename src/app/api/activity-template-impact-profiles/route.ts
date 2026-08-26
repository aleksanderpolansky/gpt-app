import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { getActivityUserContext } from "../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../lib/supabase";
import { saveActivityTemplateAuthoringV2 } from "@/lib/activity/activity-template-authoring-v2.server";
import { normalizeActivityTemplateAuthoringV2Input } from "@/lib/activity-template-impact-profile-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "activity-template-impact-profiles-admin-v2" as const;

type ProfileRow = {
  id: string;
  template_id: string;
  version_no: number;
  status: string;
  notes: string | null;
  updated_at: string;
  routing_contract_code: string;
};

function countByProfile(rows: Array<{ profile_id: string }>) {
  const result = new Map<string, number>();
  for (const row of rows) {
    result.set(row.profile_id, (result.get(row.profile_id) ?? 0) + 1);
  }
  return result;
}

export async function GET() {
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

  const { data: templatesData, error: templatesError } = await supabase
    .from("activity_templates")
    .select(
      "id,title,description,template_group,default_duration_minutes,status,is_active,updated_at",
    )
    .eq("template_scope", "user")
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .is("organization_id", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (templatesError) {
    return NextResponse.json(
      { ok: false, error: templatesError.message },
      { status: 500 },
    );
  }

  const templateIds = (templatesData ?? []).map((row) => row.id as string);
  if (templateIds.length === 0) {
    return NextResponse.json(
      { ok: true, templates: [] },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from("activity_template_impact_profiles_v1")
    .select(
      "id,template_id,version_no,status,notes,updated_at,routing_contract_code",
    )
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .eq("status", "active")
    .in("template_id", templateIds);

  if (profilesError) {
    return NextResponse.json(
      { ok: false, error: profilesError.message },
      { status: 500 },
    );
  }

  const profiles = (profilesData ?? []) as ProfileRow[];
  const v2ProfileIds = profiles
    .filter((profile) => profile.routing_contract_code === "parameter_registry_v2")
    .map((profile) => profile.id);
  const legacyProfileIds = profiles
    .filter((profile) => profile.routing_contract_code !== "parameter_registry_v2")
    .map((profile) => profile.id);
  const profileIds = profiles.map((profile) => profile.id);

  const v2ParameterResult =
    v2ProfileIds.length > 0
      ? await supabase
          .from("activity_template_profile_parameters_v2")
          .select("profile_id")
          .in("profile_id", v2ProfileIds)
      : { data: [], error: null };

  const legacyParameterResult =
    legacyProfileIds.length > 0
      ? await supabase
          .from("activity_template_profile_parameters_v1")
          .select("profile_id")
          .in("profile_id", legacyProfileIds)
      : { data: [], error: null };

  const linksResult =
    profileIds.length > 0
      ? await supabase
          .from("activity_template_profile_object_links_v1")
          .select("profile_id")
          .in("profile_id", profileIds)
      : { data: [], error: null };

  if (v2ParameterResult.error) {
    return NextResponse.json(
      { ok: false, error: v2ParameterResult.error.message },
      { status: 500 },
    );
  }
  if (legacyParameterResult.error) {
    return NextResponse.json(
      { ok: false, error: legacyParameterResult.error.message },
      { status: 500 },
    );
  }
  if (linksResult.error) {
    return NextResponse.json(
      { ok: false, error: linksResult.error.message },
      { status: 500 },
    );
  }

  const parameterCount = countByProfile([
    ...((v2ParameterResult.data ?? []) as Array<{ profile_id: string }>),
    ...((legacyParameterResult.data ?? []) as Array<{ profile_id: string }>),
  ]);
  const linkCount = countByProfile(
    (linksResult.data ?? []) as Array<{ profile_id: string }>,
  );
  const profileByTemplate = new Map(
    profiles.map((profile) => [profile.template_id, profile]),
  );

  const templates = (templatesData ?? []).map((template) => {
    const profile = profileByTemplate.get(template.id as string);

    return {
      id: template.id,
      title: template.title,
      description: template.description,
      defaultDurationMinutes: template.default_duration_minutes,
      status: template.status,
      isActive: template.is_active,
      updatedAt: template.updated_at,
      activeProfile: profile
        ? {
            id: profile.id,
            versionNo: profile.version_no,
            notes: profile.notes,
            routingContractCode: profile.routing_contract_code,
            parameterCount: parameterCount.get(profile.id) ?? 0,
            objectCount: linkCount.get(profile.id) ?? 0,
            updatedAt: profile.updated_at,
          }
        : null,
    };
  });

  return NextResponse.json(
    { ok: true, templates },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function POST(request: Request) {
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

  try {
    const body = normalizeActivityTemplateAuthoringV2Input(
      await request.json(),
    );
    const result = await saveActivityTemplateAuthoringV2({
      ownerUserId: appUser.id,
      ownerActorId: personActor.id,
      templateId: null,
      body,
    });

    return NextResponse.json({ ok: true, result }, { status: 201 });
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
