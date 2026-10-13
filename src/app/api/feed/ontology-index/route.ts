import { NextResponse } from "next/server";

import { normalizeLocale } from "@/i18n";
import { localizeGlobalSystemValueObject } from "@/lib/reality-core/global-system-value-object-localization";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";

// A public, *minimal* search dictionary. Never expose private/actor-owned ON,
// metadata_json, ownership fields or service_role credentials to the browser.
const PAGE_SIZE = 1000;
const MAX_ITEMS = 25000;

type GlobalObservationObject = {
  id: string;
  title: string | null;
  canonical_key: string | null;
  parent_value_object_id: string | null;
  ontology_node_role_code: string | null;
  metadata_json: Record<string, unknown> | null;
};

type PublicCatalogEntry = {
  id: string;
  title: string;
  parentId: string | null;
  role: string;
};

export async function GET(request: Request) {
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));
  const entries: PublicCatalogEntry[] = [];
  let totalRead = 0;

  try {
    for (let offset = 0; offset < MAX_ITEMS; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("value_objects")
        .select("id,title,canonical_key,parent_value_object_id,ontology_node_role_code,metadata_json")
        .eq("scope_code", "global")
        .eq("status", "active")
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("F32_OBSERVATION_INDEX_READ_ERROR", error.code);
        return NextResponse.json({ ok: false, error: "INDEX_UNAVAILABLE" }, { status: 503 });
      }

      const rows = (data ?? []) as GlobalObservationObject[];
      totalRead += rows.length;
      for (const row of rows) {
        const metadata = row.metadata_json;
        if (
          metadata?.system_hidden_from_observation_ui === true ||
          metadata?.system_root_code === "products_services"
        ) {
          continue;
        }

        const localized = localizeGlobalSystemValueObject(row, locale);
        const title = typeof localized.title === "string"
          ? localized.title.trim() : "";
        if (!title) continue;

        entries.push({
          id: row.id,
          title,
          parentId: row.parent_value_object_id,
          role: row.ontology_node_role_code ?? "intermediate",
        });
      }

      if (rows.length < PAGE_SIZE) break;
    }

    // Fail closed instead of silently dropping part of a growing ontology.
    if (totalRead >= MAX_ITEMS) {
      return NextResponse.json(
        { ok: false, error: "INDEX_CAPACITY_REACHED" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { ok: true, entries },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("F32_OBSERVATION_INDEX_EXCEPTION", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ ok: false, error: "INDEX_UNAVAILABLE" }, { status: 503 });
  }
}
