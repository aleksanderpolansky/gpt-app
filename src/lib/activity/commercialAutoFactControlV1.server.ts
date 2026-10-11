import "server-only";
import { supabase } from "../../../lib/supabase";

export const ARCTOR_COMMERCIAL_AUTO_FACT_CONTROL_P1_V1 =
  "ARCTOR_COMMERCIAL_AUTO_FACT_CONTROL_P1_V1" as const;

export type CommercialAutoFactSetting = {
  enabled: boolean;
  revision: number;
  updatedAt: string | null;
};

type SettingRow = { enabled: boolean; revision: number; updated_at: string | null };

/** Reads the database switch. A missing or unreadable setting never enables writes. */
export async function readCommercialAutoFactSettingV1(): Promise<CommercialAutoFactSetting> {
  const { data, error } = await supabase
    .from("commercial_auto_fact_settings_v1")
    .select("enabled,revision,updated_at")
    .eq("setting_key", "global")
    .maybeSingle();
  if (error) throw new Error(`COMMERCIAL_AUTO_FACT_SETTING_READ_FAILED:${error.message}`);
  if (!data || typeof data.enabled !== "boolean" ||
      !Number.isSafeInteger(data.revision) || data.revision < 0) {
    throw new Error("COMMERCIAL_AUTO_FACT_SETTING_INVALID_OR_MISSING");
  }
  const row = data as SettingRow;
  return { enabled: row.enabled, revision: row.revision, updatedAt: row.updated_at };
}

export async function commercialAutoFactsEnabledV1(): Promise<boolean> {
  return (await readCommercialAutoFactSettingV1()).enabled;
}

/** Caller MUST have passed requirePlatformAdmin with owner/admin roles. */
export async function changeCommercialAutoFactSettingV1(input: {
  enabled: boolean;
  expectedRevision: number;
  changedByAppUserId: string;
}): Promise<CommercialAutoFactSetting> {
  const { data, error } = await supabase.rpc("arctor_set_commercial_auto_facts_enabled_p1_v1", {
    p_enabled: input.enabled,
    p_expected_revision: input.expectedRevision,
    p_changed_by_app_user_id: input.changedByAppUserId,
  });
  if (error) throw new Error(`COMMERCIAL_AUTO_FACT_SETTING_WRITE_FAILED:${error.message}`);
  const result = data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown> : {};
  if (result.ok !== true || typeof result.enabled !== "boolean" ||
      typeof result.revision !== "number" || !Number.isSafeInteger(result.revision)) {
    throw new Error("COMMERCIAL_AUTO_FACT_SETTING_WRITE_NOT_CONFIRMED");
  }
  return { enabled: result.enabled, revision: result.revision,
    updatedAt: typeof result.updatedAt === "string" ? result.updatedAt : null };
}
