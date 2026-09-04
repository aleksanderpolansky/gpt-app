import { supabase } from "../../../lib/supabase";

export const ARCTOR_SYSTEM_TYPICAL_ACTIVITY_CATALOG_V1 =
  "arctor_system_typical_activity_catalog_v1" as const;

export const ARCTOR_TYPICAL_ACTIVITY_METADATA_V1 = {
  arctorTypicalActivity: {
    kind: "typical_activity",
    scope: "system",
    catalogVersion: "reality_model_v1",
  },
} as const;

export type SystemTypicalActivityCatalogRow = {
  id: string;
  title: string;
  short_title: string | null;
  template_group: string;
  updated_at: string;
};

export async function loadSystemTypicalActivityCatalogV1(input?: {
  limit?: number;
}): Promise<SystemTypicalActivityCatalogRow[]> {
  const limit = Math.max(1, Math.min(input?.limit ?? 500, 5001));

  const { data, error } = await supabase
    .from("activity_templates")
    .select(
      "id,title,short_title,template_group,updated_at,default_metadata_json",
    )
    .eq("template_scope", "system")
    .is("owner_user_id", null)
    .is("organization_id", null)
    .eq("status", "active")
    .eq("is_active", true)
    .contains("default_metadata_json", ARCTOR_TYPICAL_ACTIVITY_METADATA_V1)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(
      `SYSTEM_TYPICAL_ACTIVITY_CATALOG_READ_FAILED:${error.message}`,
    );
  }

  return (data ?? []).map((row) => {
    const updatedAt =
      typeof row.updated_at === "string" ? row.updated_at.trim() : "";

    if (!updatedAt) {
      throw new Error(
        "SYSTEM_TYPICAL_ACTIVITY_CATALOG_INVALID_UPDATED_AT",
      );
    }

    return {
      id: String(row.id),
      title: String(row.title ?? "").trim(),
      short_title:
        typeof row.short_title === "string" && row.short_title.trim()
          ? row.short_title.trim()
          : null,
      template_group:
        typeof row.template_group === "string" && row.template_group.trim()
          ? row.template_group.trim()
          : "general",
      updated_at: updatedAt,
    };
  });
}
