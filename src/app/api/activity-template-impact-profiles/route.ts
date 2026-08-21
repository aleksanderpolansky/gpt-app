import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../lib/supabase";
import { normalizeActivityTemplateImpactProfileInput } from "@/lib/activity-template-impact-profile-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function countByProfile(rows: Array<{ profile_id: string }>) {
  const result = new Map<string, number>();
  for (const row of rows) {
    result.set(row.profile_id, (result.get(row.profile_id) ?? 0) + 1);
  }
  return result;
}

export async function GET() {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) {
    return errorResponse;
  }
  if (!appUser || !personActor) {
    return NextResponse.json({ ok: false, error: "Active actor context not found" }, { status: 500 });
  }

  const { data: templatesData, error: templatesError } = await supabase
    .from("activity_templates")
    .select("id,title,description,template_group,default_duration_minutes,status,is_active,updated_at")
    .eq("template_scope", "user")
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .is("organization_id", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (templatesError) {
    return NextResponse.json({ ok: false, error: templatesError.message }, { status: 500 });
  }

  const templateIds = (templatesData ?? []).map((row) => row.id as string);
  if (templateIds.length === 0) {
    return NextResponse.json({ ok: true, templates: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from("activity_template_impact_profiles_v1")
    .select("id,template_id,version_no,status,notes,updated_at")
    .eq("owner_user_id", appUser.id)
    .eq("owner_actor_id", personActor.id)
    .eq("status", "active")
    .in("template_id", templateIds);

  if (profilesError) {
    return NextResponse.json({ ok: false, error: profilesError.message }, { status: 500 });
  }

  const profileIds = (profilesData ?? []).map((row) => row.id as string);
  let parameterRows: Array<{ profile_id: string }> = [];
  let linkRows: Array<{ profile_id: string }> = [];

  if (profileIds.length > 0) {
    const [parameterResult, linkResult] = await Promise.all([
      supabase
        .from("activity_template_profile_parameters_v1")
        .select("profile_id")
        .in("profile_id", profileIds),
      supabase
        .from("activity_template_profile_object_links_v1")
        .select("profile_id")
        .in("profile_id", profileIds),
    ]);

    if (parameterResult.error) {
      return NextResponse.json({ ok: false, error: parameterResult.error.message }, { status: 500 });
    }
    if (linkResult.error) {
      return NextResponse.json({ ok: false, error: linkResult.error.message }, { status: 500 });
    }

    parameterRows = (parameterResult.data ?? []) as Array<{ profile_id: string }>;
    linkRows = (linkResult.data ?? []) as Array<{ profile_id: string }>;
  }

  const profileByTemplate = new Map(
    (profilesData ?? []).map((row) => [row.template_id as string, row]),
  );
  const parameterCount = countByProfile(parameterRows);
  const linkCount = countByProfile(linkRows);

  const templates = (templatesData ?? []).map((template) => {
    const profile = profileByTemplate.get(template.id as string) as
      | { id: string; version_no: number; status: string; notes: string | null; updated_at: string }
      | undefined;

    return {
      id: template.id,
      title: template.title,
      description: template.description,
      templateGroup: template.template_group,
      defaultDurationMinutes: template.default_duration_minutes,
      status: template.status,
      isActive: template.is_active,
      updatedAt: template.updated_at,
      activeProfile: profile
        ? {
            id: profile.id,
            versionNo: profile.version_no,
            notes: profile.notes,
            parameterCount: parameterCount.get(profile.id) ?? 0,
            objectCount: linkCount.get(profile.id) ?? 0,
            updatedAt: profile.updated_at,
          }
        : null,
    };
  });

  return NextResponse.json(
    { ok: true, templates },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) {
    return errorResponse;
  }
  if (!appUser || !personActor) {
    return NextResponse.json({ ok: false, error: "Active actor context not found" }, { status: 500 });
  }

  try {
    const body = normalizeActivityTemplateImpactProfileInput(await request.json());
    const { data, error } = await supabase.rpc("save_activity_template_impact_profile_v1", {
      p_owner_user_id: appUser.id,
      p_owner_actor_id: personActor.id,
      p_template_id: null,
      p_title: body.title,
      p_description: body.description || null,
      p_template_group: body.templateGroup,
      p_default_duration_minutes: body.defaultDurationMinutes,
      p_notes: body.notes || null,
      p_parameters: body.parameters,
      p_links: body.links,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, result: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid profile payload" },
      { status: 400 },
    );
  }
}
