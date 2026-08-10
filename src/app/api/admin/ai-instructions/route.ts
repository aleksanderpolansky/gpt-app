import { NextResponse } from "next/server";

import {
  isKnownAiProcessingInstructionCode,
  normalizeAiProcessingLocale,
  readAdminInstructionCatalog,
  restoreSystemInstructionDefault,
  saveSystemInstructionOverride,
} from "@/lib/ai/processingInstructions.server";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "admin-ai-processing-instructions-p4b-v1" as const;

function errorResponse(error: unknown, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      routeMarker: ROUTE_MARKER,
      error:
        error instanceof Error
          ? error.message
          : "Unknown AI instruction settings error.",
    },
    { status },
  );
}

export async function GET(request: Request) {
  const guard = await requirePlatformAdmin({
    allowedRoles: ["owner", "admin", "viewer"],
  });

  if (!guard.ok) {
    return platformAdminErrorResponse(guard, ROUTE_MARKER);
  }

  try {
    const localeCode = normalizeAiProcessingLocale(
      new URL(request.url).searchParams.get("locale"),
    );

    const catalog = await readAdminInstructionCatalog(localeCode);

    return NextResponse.json(
      {
        ok: true,
        routeMarker: ROUTE_MARKER,
        canEdit:
          guard.platformAdmin.role === "owner" ||
          guard.platformAdmin.role === "admin",
        admin: {
          appUserId: guard.appUser.id,
          role: guard.platformAdmin.role,
        },
        ...catalog,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function PUT(request: Request) {
  const guard = await requirePlatformAdmin({
    allowedRoles: ["owner", "admin"],
  });

  if (!guard.ok) {
    return platformAdminErrorResponse(guard, ROUTE_MARKER);
  }

  try {
    const parsed = await request.json().catch(() => null);
    const body =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};

    if (!isKnownAiProcessingInstructionCode(body.instructionCode)) {
      return errorResponse(
        new Error("AI_PROCESSING_UNKNOWN_INSTRUCTION_CODE"),
      );
    }

    const localeCode = normalizeAiProcessingLocale(body.localeCode);

    if (typeof body.instructionText !== "string") {
      return errorResponse(
        new Error("AI_PROCESSING_TEXT_MUST_BE_STRING"),
      );
    }

    const catalog = await saveSystemInstructionOverride({
      instructionCode: body.instructionCode,
      localeCode,
      instructionText: body.instructionText,
      updatedByAppUserId: guard.appUser.id,
    });

    return NextResponse.json(
      {
        ok: true,
        routeMarker: ROUTE_MARKER,
        canEdit: true,
        admin: {
          appUserId: guard.appUser.id,
          role: guard.platformAdmin.role,
        },
        ...catalog,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const guard = await requirePlatformAdmin({
    allowedRoles: ["owner", "admin"],
  });

  if (!guard.ok) {
    return platformAdminErrorResponse(guard, ROUTE_MARKER);
  }

  try {
    const parsed = await request.json().catch(() => null);
    const body =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};

    if (!isKnownAiProcessingInstructionCode(body.instructionCode)) {
      return errorResponse(
        new Error("AI_PROCESSING_UNKNOWN_INSTRUCTION_CODE"),
      );
    }

    const localeCode = normalizeAiProcessingLocale(body.localeCode);

    const catalog = await restoreSystemInstructionDefault({
      instructionCode: body.instructionCode,
      localeCode,
      updatedByAppUserId: guard.appUser.id,
    });

    return NextResponse.json(
      {
        ok: true,
        routeMarker: ROUTE_MARKER,
        canEdit: true,
        admin: {
          appUserId: guard.appUser.id,
          role: guard.platformAdmin.role,
        },
        ...catalog,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
