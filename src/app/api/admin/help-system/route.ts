import { NextResponse } from "next/server";

import { isLocaleCode } from "@/i18n";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { getNavigatorModelDefinition } from "../../../../../lib/ai/navigatorModelCatalog";
import {
  findHelpRegistryEntry,
  getHelpRegistry,
} from "@/lib/help/helpRegistry";
import {
  readAllHelpContent,
  writeHelpContentRevision,
} from "@/lib/help/helpStore.server";
import {
  HELP_TRANSLATION_POLICY_V1,
  translateHelpBlockAllLocales,
} from "@/lib/help/helpTranslation.server";
import type { HelpBlockKind } from "@/lib/help/helpTypes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const ROUTE_MARKER = "admin-help-system-v1" as const;
const MAX_HELP_TEXT_CHARS = 12_000;

function errorResponse(error: unknown, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      routeMarker: ROUTE_MARKER,
      error: error instanceof Error ? error.message : "HELP_SYSTEM_UNKNOWN_ERROR",
    },
    { status },
  );
}

function normalizeBlockKind(value: unknown): HelpBlockKind | null {
  return value === "what" || value === "why" ? value : null;
}

export async function GET() {
  const guard = await requirePlatformAdmin({
    allowedRoles: ["owner", "admin", "viewer"],
  });
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  try {
    const content = await readAllHelpContent();
    const frontier = getNavigatorModelDefinition("pro");
    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      canEdit:
        guard.platformAdmin.role === "owner" ||
        guard.platformAdmin.role === "admin",
      admin: {
        appUserId: guard.appUser.id,
        role: guard.platformAdmin.role,
      },
      translationPolicy: HELP_TRANSLATION_POLICY_V1,
      translationModel: {
        modelName: frontier.modelName,
        displayName: frontier.displayName,
        reasoningEffort: frontier.reasoningEffort,
      },
      registry: getHelpRegistry(),
      content,
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function PUT(request: Request) {
  const guard = await requirePlatformAdmin({
    allowedRoles: ["owner", "admin"],
  });
  if (!guard.ok) return platformAdminErrorResponse(guard, ROUTE_MARKER);

  try {
    const parsed = await request.json().catch(() => null);
    const body =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};

    const helpKey =
      typeof body.helpKey === "string" ? body.helpKey.trim() : "";
    const blockKind = normalizeBlockKind(body.blockKind);
    const sourceLocaleRaw =
      typeof body.sourceLocale === "string"
        ? body.sourceLocale.trim().toLowerCase()
        : "";
    if (!isLocaleCode(sourceLocaleRaw)) {
      return errorResponse(new Error("HELP_SOURCE_LOCALE_INVALID"));
    }
    const sourceLocale = sourceLocaleRaw;
    const sourceText =
      typeof body.sourceText === "string" ? body.sourceText.trim() : "";

    if (!helpKey || !findHelpRegistryEntry(helpKey)) {
      return errorResponse(new Error("HELP_REGISTRY_KEY_NOT_FOUND"), 404);
    }
    if (!blockKind) {
      return errorResponse(new Error("HELP_BLOCK_KIND_INVALID"));
    }
    if (sourceText.length > MAX_HELP_TEXT_CHARS) {
      return errorResponse(new Error("HELP_SOURCE_TEXT_TOO_LONG"));
    }

    // Deliberate policy: every non-empty admin save invokes the frontier model
    // and regenerates ALL seven locales before any database write occurs.
    const translated = await translateHelpBlockAllLocales({
      sourceLocale,
      sourceText,
    });

    const content = await writeHelpContentRevision({
      helpKey,
      blockKind,
      sourceLocale,
      sourceText,
      translations: translated.translations,
      sourceHash: translated.sourceHash,
      provider: translated.provider,
      modelName: translated.modelName,
      reasoningEffort: translated.reasoningEffort,
      responseId: translated.responseId,
      usage: translated.usage,
      updatedByAppUserId: guard.appUser.id,
    });

    return NextResponse.json(
      {
        ok: true,
        routeMarker: ROUTE_MARKER,
        content,
        translationPolicy: HELP_TRANSLATION_POLICY_V1,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error, 500);
  }
}
