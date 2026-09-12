import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import {
  attemptCuratorSystemValueObjectLocalizationV1,
  listCuratorSystemLocalizationJobsV1,
  processCuratorSystemLocalizationQueueV1,
} from "@/lib/reality-core/global-system-value-object-localization.server";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../lib/actor-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-localization-jobs-v1" as const;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function currentActor(auth0Sub: string | null | undefined) {
  const sub = text(auth0Sub);
  if (!sub) {
    throw new ActorContextError(
      409,
      "LOCALIZATION_QUEUE_ACTIVE_PROFILE_AUTH_LINK_MISSING",
      "Current administrator is not linked to an Auth0 identity.",
    );
  }
  return resolveActiveActorContext(sub);
}

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  try {
    const url = new URL(request.url);
    const includeComplete = url.searchParams.get("includeComplete") === "1";
    const jobs = await listCuratorSystemLocalizationJobsV1({ includeComplete });
    const pendingCount = jobs.filter(
      (job) => job.state === "pending" || job.state === "retrying" || job.state === "blocked",
    ).length;

    if (url.searchParams.get("summary") === "1") {
      return NextResponse.json({
        ok: true,
        routeMarker: ROUTE_MARKER,
        pendingCount,
      });
    }

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      pendingCount,
      jobs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  try {
    const actor = await currentActor(guard.appUser.auth0_sub);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = text(body.action) || "retry_due";

    if (action === "retry_one") {
      const valueObjectId = text(body.valueObjectId);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valueObjectId)) {
        return NextResponse.json(
          { ok: false, routeMarker: ROUTE_MARKER, error: "valueObjectId is invalid" },
          { status: 400 },
        );
      }
      const result = await attemptCuratorSystemValueObjectLocalizationV1({
        valueObjectId,
        fallbackUserId: guard.appUser.id,
        fallbackActorId: actor.actorId,
        force: true,
      });
      return NextResponse.json({ ok: true, routeMarker: ROUTE_MARKER, result });
    }

    if (action !== "retry_due" && action !== "retry_all") {
      return NextResponse.json(
        { ok: false, routeMarker: ROUTE_MARKER, error: "Unsupported action" },
        { status: 400 },
      );
    }

    const result = await processCuratorSystemLocalizationQueueV1({
      limit: action === "retry_all" ? 25 : 5,
      force: action === "retry_all",
      fallbackUserId: guard.appUser.id,
      fallbackActorId: actor.actorId,
    });
    return NextResponse.json({ ok: true, routeMarker: ROUTE_MARKER, result });
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        { ok: false, routeMarker: ROUTE_MARKER, error: error.message, errorCode: error.code },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: message },
      { status: 500 },
    );
  }
}
