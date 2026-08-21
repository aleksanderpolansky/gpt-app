import { NextResponse } from "next/server";

import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";
import { supabase } from "../../../../../lib/supabase";
import { normalizeActivityTemplateImpactProfileInput } from "@/lib/activity-template-impact-profile-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function resolveOwnedTemplate(id: string, ownerUserId: string, ownerActorId: string) {
  const { data, error } = await supabase
    .from("activity_templates")
    .select("id,title,description,template_group,default_duration_minutes,status,is_active,updated_at")
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

export async function GET(_request: Request, context: RouteContext) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) {
    return errorResponse;
  }
  if (!appUser || !personActor) {
    return NextResponse.json({ ok: false, error: "Active actor context not found" }, { status: 500 });
  }

  const { id } = await context.params;

  try {
    const template = await resolveOwnedTemplate(id, appUser.id, personActor.id);
    if (!template) {
      return NextResponse.json({ ok: false, error: "Типовая активность не найдена." }, { status: 404 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("activity_template_impact_profiles_v1")
      .select("id,template_id,version_no,status,notes,created_at,updated_at")
      .eq("template_id", id)
      .eq("owner_user_id", appUser.id)
      .eq("owner_actor_id", personActor.id)
      .eq("status", "active")
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (!profile) {
      return NextResponse.json({ ok: true, template, profile: null });
    }

    const [parametersResult, linksResult] = await Promise.all([
      supabase
        .from("activity_template_profile_parameters_v1")
        .select("id,profile_id,parameter_code,title,unit_code,is_required,display_order")
        .eq("profile_id", profile.id)
        .order("display_order", { ascending: true }),
      supabase
        .from("activity_template_profile_object_links_v1")
        .select("id,profile_id,target_value_object_id,relation_code,confidence,notes")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: true }),
    ]);

    if (parametersResult.error) {
      throw new Error(parametersResult.error.message);
    }
    if (linksResult.error) {
      throw new Error(linksResult.error.message);
    }

    const links = linksResult.data ?? [];
    const linkIds = links.map((row) => row.id as string);
    let routes: unknown[] = [];

    if (linkIds.length > 0) {
      const routesResult = await supabase
        .from("activity_template_parameter_routes_v1")
        .select("id,profile_object_link_id,profile_parameter_id,target_parameter_code,aggregation_code")
        .in("profile_object_link_id", linkIds);
      if (routesResult.error) {
        throw new Error(routesResult.error.message);
      }
      routes = routesResult.data ?? [];
    }

    return NextResponse.json(
      {
        ok: true,
        template,
        profile,
        parameters: parametersResult.data ?? [],
        links,
        routes,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not load template profile" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { appUser, personActor, errorResponse } = await getActivityUserContext();
  if (errorResponse) {
    return errorResponse;
  }
  if (!appUser || !personActor) {
    return NextResponse.json({ ok: false, error: "Active actor context not found" }, { status: 500 });
  }

  const { id } = await context.params;

  try {
    const template = await resolveOwnedTemplate(id, appUser.id, personActor.id);
    if (!template) {
      return NextResponse.json({ ok: false, error: "Типовая активность не найдена." }, { status: 404 });
    }

    const body = normalizeActivityTemplateImpactProfileInput(await request.json());
    const { data, error } = await supabase.rpc("save_activity_template_impact_profile_v1", {
      p_owner_user_id: appUser.id,
      p_owner_actor_id: personActor.id,
      p_template_id: id,
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

    return NextResponse.json({ ok: true, result: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid profile payload" },
      { status: 400 },
    );
  }
}
