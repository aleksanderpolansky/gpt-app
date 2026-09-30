import { NextResponse } from "next/server";

import {
  ARCTOR_NAVIGATOR_MODEL_CATALOG_V2,
  NAVIGATOR_MODEL_CATALOG_VERIFIED_AT,
  getPublicNavigatorModelCatalog,
} from "../../../../../lib/ai/navigatorModelCatalog";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    contract: ARCTOR_NAVIGATOR_MODEL_CATALOG_V2,
    verifiedAt: NAVIGATOR_MODEL_CATALOG_VERIFIED_AT,
    selectionPolicy: "server_approved_model_catalog_with_flagship",
    models: getPublicNavigatorModelCatalog(),
  });
}
