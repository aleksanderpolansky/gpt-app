import { NextResponse } from "next/server";

import {
  isLocaleCode,
} from "@/i18n";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import {
  isFormulaRationaleSection,
} from "@/lib/formula-rationale/formula-rationale";
import {
  readFormulaRationalesForVersionIds,
  saveFormulaRationaleLocale,
} from "@/lib/formula-rationale/formula-rationale.server";
import {
  listFormulaRuleRegistryV1,
} from "@/lib/reality-curator/formula-rule-registry.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const ROUTE_MARKER =
  "admin-formula-rationales-v1" as const;
const MAX_TEXT_CHARS = 12_000;

function errorResponse(
  error: unknown,
  status = 400,
) {
  return NextResponse.json(
    {
      ok: false,
      routeMarker: ROUTE_MARKER,
      error:
        error instanceof Error
          ? error.message
          : "FORMULA_RATIONALE_UNKNOWN_ERROR",
    },
    {
      status,
    },
  );
}

function text(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

async function loadRegistryAndContent() {
  const series =
    await listFormulaRuleRegistryV1();

  const versionIds = series.flatMap(
    (item) =>
      item.versions.map(
        (version) => version.id,
      ),
  );

  const content =
    await readFormulaRationalesForVersionIds(
      versionIds,
    );

  return {
    series,
    content,
  };
}

export async function GET() {
  const guard =
    await requirePlatformAdmin({
      allowedRoles: [
        "owner",
        "admin",
        "viewer",
      ],
    });

  if (!guard.ok) {
    return platformAdminErrorResponse(
      guard,
      ROUTE_MARKER,
    );
  }

  try {
    const {
      series,
      content,
    } = await loadRegistryAndContent();

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
      localizationMode:
        "manual",
      machineTranslation:
        false,
      supportedLocales: [
        "ru",
        "pl",
        "en",
        "es",
        "uk",
        "de",
        "cs",
      ],
      series,
      content,
    });
  } catch (error) {
    return errorResponse(
      error,
      500,
    );
  }
}

function mutationBody(
  parsed: unknown,
) {
  return (
    parsed &&
    typeof parsed ===
      "object" &&
    !Array.isArray(
      parsed,
    )
      ? parsed as Record<
          string,
          unknown
        >
      : {}
  );
}

async function validateVersionExists(
  ruleVersionId: string,
) {
  const registry =
    await listFormulaRuleRegistryV1();

  return registry.some(
    (series) =>
      series.versions.some(
        (version) =>
          version.id ===
          ruleVersionId,
      ),
  );
}

function readCommonMutationFields(
  body: Record<string, unknown>,
) {
  const ruleVersionId =
    text(
      body.ruleVersionId,
    );

  const section =
    body.section;

  const sourceLocaleRaw =
    text(
      body.sourceLocale,
    )
      .toLowerCase();

  const sourceText =
    typeof body.sourceText ===
      "string"
      ? body.sourceText.trim()
      : "";

  if (
    !ruleVersionId
  ) {
    throw new Error(
      "FORMULA_RATIONALE_VERSION_ID_REQUIRED",
    );
  }

  if (
    !isFormulaRationaleSection(
      section,
    )
  ) {
    throw new Error(
      "FORMULA_RATIONALE_SECTION_INVALID",
    );
  }

  if (
    !isLocaleCode(
      sourceLocaleRaw,
    )
  ) {
    throw new Error(
      "FORMULA_RATIONALE_SOURCE_LOCALE_INVALID",
    );
  }

  if (
    sourceText.length >
    MAX_TEXT_CHARS
  ) {
    throw new Error(
      "FORMULA_RATIONALE_SOURCE_TEXT_TOO_LONG",
    );
  }

  return {
    ruleVersionId,
    section,
    sourceLocale:
      sourceLocaleRaw,
    sourceText,
  };
}

export async function PUT(
  request: Request,
) {
  const guard =
    await requirePlatformAdmin({
      allowedRoles: [
        "owner",
        "admin",
      ],
    });

  if (!guard.ok) {
    return platformAdminErrorResponse(
      guard,
      ROUTE_MARKER,
    );
  }

  try {
    const parsed =
      await request
        .json()
        .catch(() => null);

    const fields =
      readCommonMutationFields(
        mutationBody(
          parsed,
        ),
      );

    const versionExists =
      await validateVersionExists(
        fields.ruleVersionId,
      );

    if (!versionExists) {
      return errorResponse(
        new Error(
          "FORMULA_RATIONALE_VERSION_NOT_FOUND",
        ),
        404,
      );
    }

    const content =
      await saveFormulaRationaleLocale({
        ruleVersionId:
          fields.ruleVersionId,
        section:
          fields.section,
        locale:
          fields.sourceLocale,
        text:
          fields.sourceText,
        updatedByAppUserId:
          guard.appUser.id,
      });

    return NextResponse.json({
      ok: true,
      routeMarker:
        ROUTE_MARKER,
      localizationMode:
        "manual",
      machineTranslation:
        false,
      content,
    });
  } catch (error) {
    return errorResponse(
      error,
      500,
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      routeMarker:
        ROUTE_MARKER,
      error:
        "FORMULA_RATIONALE_MACHINE_TRANSLATION_DISABLED",
      localizationMode:
        "manual",
      machineTranslation:
        false,
    },
    {
      status:
        405,
      headers: {
        Allow:
          "GET, PUT",
      },
    },
  );
}
