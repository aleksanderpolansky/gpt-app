import { NextResponse } from "next/server";

import {
  isLocaleCode,
} from "@/i18n";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import {
  HELP_TRANSLATION_POLICY_V1,
} from "@/lib/help/helpTranslation.server";
import {
  getNavigatorModelDefinition,
} from "../../../../../lib/ai/navigatorModelCatalog";
import {
  isFormulaRationaleSection,
} from "@/lib/formula-rationale/formula-rationale";
import {
  readFormulaRationalesForVersionIds,
  writeFormulaRationaleSection,
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

    const frontier =
      getNavigatorModelDefinition(
        "pro",
      );

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
      translationPolicy:
        HELP_TRANSLATION_POLICY_V1,
      translationModel: {
        modelName: frontier.modelName,
        displayName: frontier.displayName,
        reasoningEffort:
          frontier.reasoningEffort,
      },
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

    const body =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
        ? (
            parsed as Record<
              string,
              unknown
            >
          )
        : {};

    const ruleVersionId =
      text(body.ruleVersionId);

    const section =
      body.section;

    const sourceLocaleRaw =
      text(body.sourceLocale)
        .toLowerCase();

    const sourceText =
      typeof body.sourceText === "string"
        ? body.sourceText.trim()
        : "";

    if (
      !ruleVersionId
    ) {
      return errorResponse(
        new Error(
          "FORMULA_RATIONALE_VERSION_ID_REQUIRED",
        ),
      );
    }

    if (
      !isFormulaRationaleSection(
        section,
      )
    ) {
      return errorResponse(
        new Error(
          "FORMULA_RATIONALE_SECTION_INVALID",
        ),
      );
    }

    if (
      !isLocaleCode(
        sourceLocaleRaw,
      )
    ) {
      return errorResponse(
        new Error(
          "FORMULA_RATIONALE_SOURCE_LOCALE_INVALID",
        ),
      );
    }

    if (
      sourceText.length >
      MAX_TEXT_CHARS
    ) {
      return errorResponse(
        new Error(
          "FORMULA_RATIONALE_SOURCE_TEXT_TOO_LONG",
        ),
      );
    }

    const registry =
      await listFormulaRuleRegistryV1();

    const versionExists =
      registry.some(
        (series) =>
          series.versions.some(
            (version) =>
              version.id ===
              ruleVersionId,
          ),
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
      await writeFormulaRationaleSection({
        ruleVersionId,
        section,
        sourceLocale:
          sourceLocaleRaw,
        sourceText,
        updatedByAppUserId:
          guard.appUser.id,
      });

    return NextResponse.json({
      ok: true,
      routeMarker:
        ROUTE_MARKER,
      content,
      translationPolicy:
        HELP_TRANSLATION_POLICY_V1,
    });
  } catch (error) {
    return errorResponse(
      error,
      500,
    );
  }
}
