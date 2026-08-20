import { NextResponse } from "next/server";

import { normalizeLocale } from "@/i18n";
import { getHelpEntriesForRoute } from "@/lib/help/helpRegistry";
import { readHelpContentByKeys } from "@/lib/help/helpStore.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_MARKER = "user-help-content-v1" as const;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pathname = url.searchParams.get("pathname")?.trim() || "/";
    const locale = normalizeLocale(url.searchParams.get("locale"), "en");
    const registryEntries = getHelpEntriesForRoute(pathname);
    const content = await readHelpContentByKeys(
      registryEntries.map((entry) => entry.helpKey),
    );
    const byKey = new Map(
      content.map((item) => [`${item.helpKey}:${item.blockKind}`, item]),
    );

    const entries = registryEntries
      .map((entry) => {
        const what = byKey.get(`${entry.helpKey}:what`);
        const why = byKey.get(`${entry.helpKey}:why`);
        const whatText = what?.translations[locale]?.trim() ?? "";
        const whyText = why?.translations[locale]?.trim() ?? "";
        if (!whatText && !whyText) return null;
        return {
          helpKey: entry.helpKey,
          kind: entry.kind,
          route: entry.route,
          hrefPath: entry.hrefPath ?? null,
          domSelector: entry.domSelector ?? null,
          ordinal: entry.ordinal ?? null,
          what: whatText || null,
          why: whyText || null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      routeMarker: ROUTE_MARKER,
      locale,
      pathname,
      entries,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "HELP_CONTENT_UNKNOWN_ERROR";
    // Missing schema is an operational deployment error, not a reason to break
    // every user page. Hide markers until the additive migration is applied.
    return NextResponse.json(
      {
        ok: false,
        routeMarker: ROUTE_MARKER,
        entries: [],
        error: message,
      },
      { status: message === "HELP_SYSTEM_SCHEMA_NOT_READY" ? 503 : 500 },
    );
  }
}
