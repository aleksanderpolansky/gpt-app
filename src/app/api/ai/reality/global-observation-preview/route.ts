import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { auth0 } from "../../../../../../lib/auth0";
import {
  ActorContextError,
  resolveActiveActorContext,
} from "../../../../../../lib/actor-context";
import {
  GlobalObservationPilotError,
  runGlobalObservationPreview,
} from "../../../../../../lib/reality/globalObservationPilot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PilotRequestBody = {
  inputText?: unknown;
  locale?: unknown;
  timeZone?: unknown;
  operationId?: unknown;
};

function optionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  let actorContext;

  try {
    actorContext = await resolveActiveActorContext(session.user.sub);
  } catch (error) {
    if (error instanceof ActorContextError) {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          error: error.message,
        },
        { status: error.status },
      );
    }

    throw error;
  }

  let body: PilotRequestBody;

  try {
    body = (await request.json()) as PilotRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const inputText = optionalText(body.inputText);
  const locale = optionalText(body.locale) || "ru";
  const timeZone = optionalText(body.timeZone) || "UTC";
  const operationId = optionalText(body.operationId) || randomUUID();

  try {
    const result = await runGlobalObservationPreview({
      appUserId: actorContext.appUserId,
      actorId: actorContext.actorId,
      inputText,
      locale,
      timeZone,
      operationId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GlobalObservationPilotError) {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          error: error.message,
          details: error.details,
          operationId,
        },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error ? error.message : "OpenAI pilot request failed.";

    return NextResponse.json(
      {
        ok: false,
        code: "GSR1_OPENAI_PILOT_FAILED",
        error: message,
        operationId,
      },
      { status: 502 },
    );
  }
}
