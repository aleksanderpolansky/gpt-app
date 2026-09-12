import { supabase } from "../supabase";
import {
  NAVIGATOR_MODEL_CATALOG_VERIFIED_AT,
  getNavigatorModelDefinition,
  type NavigatorAiTierCode,
} from "./navigatorModelCatalog";

export const ARCTOR_NAVIGATOR_PRICE_SNAPSHOT_RUNTIME_V1 =
  "ARCTOR_NAVIGATOR_PRICE_SNAPSHOT_RUNTIME_V1" as const;

const DEFAULT_MAX_AGE_HOURS = 72;
const MIN_FORCE_REFRESH_AGE_MINUTES = 5;

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asDateMs(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTierCode(value: string): NavigatorAiTierCode {
  if (value === "nano" || value === "standard" || value === "pro") {
    return value;
  }
  throw new Error(`NAVIGATOR_PRICE_TIER_UNSUPPORTED:${value}`);
}

function modelSourceUrl(modelName: string, sourceUrl: string) {
  const base = sourceUrl.replace(/\/+$/, "");
  return base.endsWith("/models") ? `${base}/${modelName}` : base;
}

export async function ensureNavigatorPriceSnapshotV1(input: {
  tierCode: string;
  modelName: string;
  maxAgeHours?: number;
  forceRefresh?: boolean;
}) {
  const tierCode = normalizeTierCode(input.tierCode);
  const definition = getNavigatorModelDefinition(tierCode);
  if (!definition || definition.modelName !== input.modelName) {
    throw new Error(
      `NAVIGATOR_PRICE_MODEL_CATALOG_MISMATCH:${tierCode}:${input.modelName}`,
    );
  }

  const { data: currentRows, error: currentError } = await supabase
    .from("ai_model_price_snapshots")
    .select(
      "id,valid_from,input_cost_per_1m_tokens,cached_input_cost_per_1m_tokens,output_cost_per_1m_tokens,usd_to_eur_rate,eur_markup_multiplier",
    )
    .eq("provider", "openai")
    .eq("tier_code", tierCode)
    .eq("model_name", definition.modelName)
    .eq("pricing_currency", "USD")
    .eq("is_active", true)
    .order("valid_from", { ascending: false })
    .limit(1);

  if (currentError) {
    throw new Error(`NAVIGATOR_PRICE_CURRENT_READ_FAILED:${currentError.message}`);
  }

  const current = currentRows?.[0] ?? null;
  if (current) {
    const inputPrice = finiteNumber(current.input_cost_per_1m_tokens);
    const cachedPrice = finiteNumber(current.cached_input_cost_per_1m_tokens);
    const outputPrice = finiteNumber(current.output_cost_per_1m_tokens);
    if (
      inputPrice !== definition.inputUsdPer1m ||
      cachedPrice !== definition.cachedInputUsdPer1m ||
      outputPrice !== definition.outputUsdPer1m
    ) {
      throw new Error(
        `NAVIGATOR_PRICE_ACTIVE_SNAPSHOT_DIFFERS_FROM_CATALOG:${tierCode}:${definition.modelName}`,
      );
    }
  }

  const nowMs = Date.now();
  const currentMs = asDateMs(current?.valid_from);
  const ageMs = currentMs === null ? Number.POSITIVE_INFINITY : Math.max(0, nowMs - currentMs);
  const maxAgeHours = Number.isFinite(input.maxAgeHours)
    ? Math.max(1, Math.trunc(input.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS))
    : DEFAULT_MAX_AGE_HOURS;
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const forceMinAgeMs = MIN_FORCE_REFRESH_AGE_MINUTES * 60 * 1000;

  if (
    current &&
    ageMs <= maxAgeMs &&
    (!input.forceRefresh || ageMs <= forceMinAgeMs)
  ) {
    return {
      refreshed: false,
      priceSnapshotId: String(current.id),
      tierCode,
      modelName: definition.modelName,
    };
  }

  let usdToEurRate = current ? finiteNumber(current.usd_to_eur_rate) : null;
  let eurMarkupMultiplier = current
    ? finiteNumber(current.eur_markup_multiplier)
    : null;

  if (usdToEurRate === null || eurMarkupMultiplier === null) {
    const { data: fxRows, error: fxError } = await supabase
      .from("ai_model_price_snapshots")
      .select("usd_to_eur_rate,eur_markup_multiplier")
      .eq("provider", "openai")
      .eq("pricing_currency", "USD")
      .not("usd_to_eur_rate", "is", null)
      .order("valid_from", { ascending: false })
      .limit(1);

    if (fxError) {
      throw new Error(`NAVIGATOR_PRICE_FX_READ_FAILED:${fxError.message}`);
    }
    const fx = fxRows?.[0] ?? null;
    usdToEurRate = usdToEurRate ?? finiteNumber(fx?.usd_to_eur_rate);
    eurMarkupMultiplier =
      eurMarkupMultiplier ?? finiteNumber(fx?.eur_markup_multiplier);
  }

  const now = new Date(nowMs).toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from("ai_model_price_snapshots")
    .insert({
      tier_code: tierCode,
      model_name: definition.modelName,
      provider: "openai",
      pricing_currency: "USD",
      display_currency: "EUR",
      input_cost_per_1m_tokens: definition.inputUsdPer1m,
      cached_input_cost_per_1m_tokens: definition.cachedInputUsdPer1m,
      output_cost_per_1m_tokens: definition.outputUsdPer1m,
      usd_to_eur_rate: usdToEurRate,
      eur_markup_multiplier: eurMarkupMultiplier ?? 1,
      valid_from: now,
      valid_to: null,
      is_active: true,
      source_url: modelSourceUrl(definition.modelName, definition.sourceUrl),
      source_note:
        "ARCTor server model catalog price snapshot. Catalog is versioned in Git; runtime refresh keeps the budget RPC snapshot fresh without model names in env variables.",
      metadata: {
        verification_contract: ARCTOR_NAVIGATOR_PRICE_SNAPSHOT_RUNTIME_V1,
        catalog_verified_at: NAVIGATOR_MODEL_CATALOG_VERIFIED_AT,
        source: "official_openai_model_documentation",
        model_id: definition.modelName,
        input_usd_per_1m_tokens: definition.inputUsdPer1m,
        cached_input_usd_per_1m_tokens: definition.cachedInputUsdPer1m,
        output_usd_per_1m_tokens: definition.outputUsdPer1m,
      },
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(
      `NAVIGATOR_PRICE_REFRESH_INSERT_FAILED:${insertError?.message ?? "missing id"}`,
    );
  }

  // Close only snapshots older than the row we just inserted. This avoids the
  // two concurrent refreshes closing each other's new row.
  const { error: closeError } = await supabase
    .from("ai_model_price_snapshots")
    .update({ is_active: false, valid_to: now })
    .eq("provider", "openai")
    .eq("tier_code", tierCode)
    .eq("model_name", definition.modelName)
    .eq("pricing_currency", "USD")
    .eq("is_active", true)
    .lt("valid_from", now)
    .neq("id", inserted.id);

  if (closeError) {
    console.error("NAVIGATOR_PRICE_OLD_SNAPSHOT_CLOSE_FAILED", closeError.message);
  }

  return {
    refreshed: true,
    priceSnapshotId: String(inserted.id),
    tierCode,
    modelName: definition.modelName,
  };
}

export async function syncNavigatorPriceSnapshotsV1(input?: {
  maxAgeHours?: number;
}) {
  const results: Array<Record<string, unknown>> = [];
  for (const tierCode of ["nano", "standard", "pro"] as const) {
    const definition = getNavigatorModelDefinition(tierCode);
    try {
      const result = await ensureNavigatorPriceSnapshotV1({
        tierCode,
        modelName: definition.modelName,
        maxAgeHours: input?.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS,
      });
      results.push({ ok: true, ...result });
    } catch (error) {
      results.push({
        ok: false,
        tierCode,
        modelName: definition.modelName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}
