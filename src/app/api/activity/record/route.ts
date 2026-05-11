import { NextResponse } from "next/server";
import {
  ACTIVITY_RECORDING_DISABLED_MESSAGE,
  ACTIVITY_RECORDING_ENABLED,
} from "../../../../../lib/activity/activityRecordingConfig";
import { getActivityUserContext } from "../../../../../lib/activity/activityUserContext";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/activity/record",
    method: "POST",
    enabled: ACTIVITY_RECORDING_ENABLED,
    status: ACTIVITY_RECORDING_ENABLED ? "ready" : "disabled",
    message: ACTIVITY_RECORDING_ENABLED
      ? "Activity recording endpoint is available."
      : ACTIVITY_RECORDING_DISABLED_MESSAGE,
    supportedInputExample: {
      input: "11-341 25 коммерческое письмо",
    },
  });
}

export async function POST(request: Request) {
  if (!ACTIVITY_RECORDING_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        error: ACTIVITY_RECORDING_DISABLED_MESSAGE,
      },
      { status: 503 }
    );
  }

  const { appUser, personActor, errorResponse } =
    await getActivityUserContext();

  if (errorResponse) {
    return errorResponse;
  }

  if (!appUser || !personActor) {
    return NextResponse.json(
      {
        ok: false,
        error: "User context not found",
      },
      { status: 500 }
    );
  }

  const body = await request.json();

  return NextResponse.json({
    ok: true,
    status: "skeleton_only",
    message:
      "Activity recording API skeleton is working. Database insert will be added in STEP A3.",
    received: {
      input: body.input ?? null,
      code: body.code ?? null,
      durationMinutes: body.durationMinutes ?? null,
      comment: body.comment ?? null,
    },
  });
}