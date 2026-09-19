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
  saveFormulaRationaleSource,
  translateFormulaRationaleSection,
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
      await saveFormulaRationaleSource({
        ...fields,
        updatedByAppUserId:
          guard.appUser.id,
      });

    return NextResponse.json({
      ok: true,
      routeMarker:
        ROUTE_MARKER,
      content,
      translationState:
        content.sourceText
          ? "pending"
          : "not_required",
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

export async function POST(
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
      mutationBody(
        parsed,
      );

    const fields =
      readCommonMutationFields(
        body,
      );

    const expectedRevision =
      typeof body.expectedRevision ===
        "number" &&
      Number.isInteger(
        body.expectedRevision,
      ) &&
      body.expectedRevision > 0
        ? body.expectedRevision
        : null;

    if (
      expectedRevision ===
      null
    ) {
      return errorResponse(
        new Error(
          "FORMULA_RATIONALE_EXPECTED_REVISION_REQUIRED",
        ),
      );
    }

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

    const result =
      await translateFormulaRationaleSection({
        ...fields,
        expectedRevision,
        updatedByAppUserId:
          guard.appUser.id,
      });

    return NextResponse.json({
      ok: true,
      routeMarker:
        ROUTE_MARKER,
      translationState:
        result.state,
      content:
        result.content,
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
