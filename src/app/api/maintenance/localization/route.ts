import { NextResponse } from "next/server";

import { syncNavigatorPriceSnapshotsV1 } from "../../../../../lib/ai/navigatorPriceSnapshot.server";
import { processCuratorSystemLocalizationQueueV1 } from "@/lib/reality-core/global-system-value-object-localization.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "localization-maintenance-v1" as const;

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, routeMarker: ROUTE_MARKER, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const priceSnapshots = await syncNavigatorPriceSnapshotsV1({ maxAgeHours: 72 });
    const localizationQueue = await processCuratorSystemLocalizationQueueV1({
      limit: 10,
    });
    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      priceSnapshots,
      localizationQueue,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
