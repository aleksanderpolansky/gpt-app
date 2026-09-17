import { NextResponse } from "next/server";

import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

import {
  listCalculationModelCatalogV1,
} from "@/lib/reality-curator/calculation-model-catalog.server";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const ROUTE_MARKER =
  "admin-calculation-model-catalog-v1";

export async function GET(
  request: Request,
) {
  const guard =
    await requirePlatformAdmin();

  if (!guard.ok) {
    return platformAdminErrorResponse(
      guard,
      ROUTE_MARKER,
    );
  }

  const url =
    new URL(
      request.url,
    );

  const scope =
    url.searchParams.get(
      "scope",
    ) === "user"
      ? "user"
      : "system";

  try {
    const models =
      await listCalculationModelCatalogV1({
        scopeCode:
          scope,

        ownerUserId:
          scope === "user"
            ? guard.appUser.id
            : null,
      });

    return NextResponse.json({
      ok: true,
      routeMarker:
        ROUTE_MARKER,
      scope,
      models,
    });
  }
  catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        ok: false,
        routeMarker:
          ROUTE_MARKER,
        error:
          message,
      },
      {
        status: 500,
      },
    );
  }
}