import "server-only";

import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// F3.2.4: public commercial evidence, same-event ON intersection, server-only RPC.
// Money facts are NOT classified as prices; all approved money_value facts qualify.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNIT_RE = /^[a-z][a-z0-9_]{0,15}$/;
type DbFacet = {
  unit_code: string;
  min_value: number;
  max_value: number;
  publications: number;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("on") ?? "";
  const ids = raw ? raw.split(",").map(id => id.trim()) : [];
  if (ids.length > 8 || new Set(ids).size !== ids.length || ids.some(id => !UUID_RE.test(id))) {
    return NextResponse.json({ ok: false, error: "INVALID_ON_FILTER" }, { status: 400 });
  }
  try {
    const { data, error } = await supabase.rpc("arctor_feed_money_facets_f324_v1", {
      p_object_ids: ids,
    });
    if (error || !Array.isArray(data)) throw new Error("F324_FACETS_UNAVAILABLE");
    const facets = (data as DbFacet[]).filter(f =>
      UNIT_RE.test(f.unit_code) && Number.isFinite(Number(f.min_value)) &&
      Number.isFinite(Number(f.max_value)) && Number(f.publications) >= 1,
    ).map(f => ({
      unit: f.unit_code,
      minValue: Number(f.min_value),
      maxValue: Number(f.max_value),
      publications: Number(f.publications),
    }));
    return NextResponse.json({ ok: true, facets }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("F324_MONEY_FACETS_FAILURE", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false, error: "MONEY_FACETS_UNAVAILABLE" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
