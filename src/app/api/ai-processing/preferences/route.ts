import { NextResponse } from "next/server";

import {
  normalizeAiProcessingLocale,
  readActorProcessingPreferenceSnapshot,
  resolveRequiredAiProcessingActorContext,
  restoreActorProcessingPreference,
  saveActorProcessingPreference,
} from "@/lib/ai/processingInstructions.server";
import { ActorContextError } from "../../../../../lib/actor-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "actor-ai-processing-preferences-p4b-v1" as const;

function errorResponse(error: unknown) {
  if (error instanceof ActorContextError) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: error.message,
        errorCode: error.code,
      },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : "Unknown AI processing preference error.";

  const status = message.startsWith("AI_PROCESSING_TEXT_")
    ? 400
    : 500;

  return NextResponse.json(
    {
      ok: false,
      routeMarker: ROUTE_MARKER,
      error: message,
    },
    { status },
  );
}

export async function GET(request: Request) {
  try {
    const actorContext = await resolveRequiredAiProcessingActorContext();
    const localeCode = normalizeAiProcessingLocale(
      new URL(request.url).searchParams.get("locale"),
    );

    const snapshot = await readActorProcessingPreferenceSnapshot({
      actorContext,
      localeCode,
    });

    return NextResponse.json(
      {
        ok: true,
        routeMarker: ROUTE_MARKER,
        ...snapshot,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actorContext = await resolveRequiredAiProcessingActorContext();
    const parsed = await request.json().catch(() => null);
    const body =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};

    const localeCode = normalizeAiProcessingLocale(body.localeCode);

    if (typeof body.instructionText !== "string") {
      return errorResponse(
        new Error("AI_PROCESSING_TEXT_MUST_BE_STRING"),
      );
    }

    await saveActorProcessingPreference({
      ownerUserId: actorContext.appUserId,
      ownerActorId: actorContext.actorId,
      localeCode,
      instructionText: body.instructionText,
    });

    const snapshot = await readActorProcessingPreferenceSnapshot({
      actorContext,
      localeCode,
    });

    return NextResponse.json(
      {
        ok: true,
        routeMarker: ROUTE_MARKER,
        ...snapshot,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actorContext = await resolveRequiredAiProcessingActorContext();
    const parsed = await request.json().catch(() => null);
    const body =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};

    const localeCode = normalizeAiProcessingLocale(
      body.localeCode ??
        new URL(request.url).searchParams.get("locale"),
    );

    await restoreActorProcessingPreference({
      ownerUserId: actorContext.appUserId,
      ownerActorId: actorContext.actorId,
      localeCode,
    });

    const snapshot = await readActorProcessingPreferenceSnapshot({
      actorContext,
      localeCode,
    });

    return NextResponse.json(
      {
        ok: true,
        routeMarker: ROUTE_MARKER,
        ...snapshot,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
