import "server-only";

import { NextResponse } from "next/server";

import { ActorContextError, resolveActiveActorContext } from "../../../../../lib/actor-context";
import { auth0 } from "../../../../../lib/auth0";
import { supabase } from "../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLE = "arctor_feed_saved_search_tabs_v1";
const MAX_TABS = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUM_RE = /^-?\d{1,10}(?:\.\d{1,6})?$/;
const UNIT_RE = /^[a-z][a-z0-9_]{0,15}$/;

type Filters = {
  on: string;
  metric: string;
  money?: string;
  parameter: string;
  min: string;
  max: string;
  unit: string;
};
type TabRow = {
  id: string;
  title: string;
  filter_spec: Filters;
  created_at: string;
};

function failure(status: number, code: string) {
  return NextResponse.json({ ok: false, error: code }, { status, headers: { "Cache-Control": "no-store" } });
}

async function ownerId(): Promise<string | null> {
  const session = await auth0.getSession();
  if (!session?.user?.sub) return null;
  const context = await resolveActiveActorContext(session.user.sub);
  return context.appUserId;
}

function validateFilters(value: unknown): Filters | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const required = ["on", "metric", "parameter", "min", "max", "unit"];
  const names = [...required, "money"];
  if (Object.keys(v).some(key => !names.includes(key))) return null;
  if (required.some(key => typeof v[key] !== "string")) return null;
  if (v.money !== undefined && typeof v.money !== "string") return null;
  const money = (v.money as string | undefined)?.trim() ?? "";
  if (money !== "" && money !== "1") return null;
  const on = (v.on as string).trim();
  const metric = (v.metric as string).trim();
  const parameter = (v.parameter as string).trim();
  const min = (v.min as string).trim();
  const max = (v.max as string).trim();
  const unit = (v.unit as string).trim().toLowerCase();
  const ids = on ? on.split(",").map(id => id.trim()) : [];
  if (ids.length > 8 || new Set(ids).size !== ids.length || ids.some(id => !UUID_RE.test(id))) return null;
  if (!ids.length && !metric && money !== "1") return null;
  if (money === "1") {
    if (metric || parameter || !UNIT_RE.test(unit) || (!min && !max)) return null;
    if ((min && !NUM_RE.test(min)) || (max && !NUM_RE.test(max))) return null;
    if (min && max && Number(min) > Number(max)) return null;
    return { on: ids.join(","), money, metric: "", parameter: "", min, max, unit };
  }
  if (metric) {
    if (!UUID_RE.test(metric) || !UUID_RE.test(parameter) || !UNIT_RE.test(unit) || (!min && !max)) return null;
    if ((min && !NUM_RE.test(min)) || (max && !NUM_RE.test(max))) return null;
    if (min && max && Number(min) > Number(max)) return null;
  } else if (parameter || min || max || unit) return null;
  return { on: ids.join(","), metric, parameter, min, max, unit };
}

function validateTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value.trim().replace(/\s+/g, " ");
  return title.length > 0 && title.length <= 80 && !/[\x00-\x1f\x7f]/.test(title) ? title : null;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

async function safeBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return null;
  const size = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(size) || size > 8192) return null;
  const raw = await request.text();
  if (raw.length > 8192) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return data && typeof data === "object" && !Array.isArray(data)
      ? data as Record<string, unknown> : null;
  } catch { return null; }
}

function handleException(error: unknown) {
  if (error instanceof ActorContextError) return failure(error.status, error.code);
  console.error("F322_SAVED_SEARCH_FAILURE", error instanceof Error ? error.name : "unknown");
  return failure(503, "SAVED_SEARCH_UNAVAILABLE");
}

export async function GET() {
  try {
    const owner = await ownerId();
    if (!owner) return failure(401, "LOGIN_REQUIRED");
    const { data, error } = await supabase.from(TABLE)
      .select("id,title,filter_spec,created_at")
      .eq("owner_user_id", owner)
      .order("created_at", { ascending: true })
      .limit(MAX_TABS + 1);
    if (error) throw error;
    const rows = (data ?? []) as TabRow[];
    return NextResponse.json({ ok: true, tabs: rows.slice(0, MAX_TABS).map(row => ({
      id: row.id, title: row.title, filters: row.filter_spec, createdAt: row.created_at,
    })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return handleException(error); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return failure(403, "ORIGIN_REJECTED");
  try {
    const owner = await ownerId();
    if (!owner) return failure(401, "LOGIN_REQUIRED");
    const body = await safeBody(request);
    const title = validateTitle(body?.title);
    const filters = validateFilters(body?.filters);
    if (!title || !filters) return failure(400, "INVALID_SAVED_SEARCH");
    const { count, error: countError } = await supabase.from(TABLE)
      .select("id", { count: "exact", head: true }).eq("owner_user_id", owner);
    if (countError) throw countError;
    if ((count ?? 0) >= MAX_TABS) return failure(409, "SAVED_SEARCH_LIMIT_REACHED");
    const { data, error } = await supabase.from(TABLE)
      .insert({ owner_user_id: owner, title, filter_spec: filters })
      .select("id,title,filter_spec,created_at").single();
    if (error || !data) throw error ?? new Error("INSERT_EMPTY");
    const row = data as TabRow;
    return NextResponse.json({ ok: true, tab: {
      id: row.id, title: row.title, filters: row.filter_spec, createdAt: row.created_at,
    } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleException(error); }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return failure(403, "ORIGIN_REJECTED");
  try {
    const owner = await ownerId();
    if (!owner) return failure(401, "LOGIN_REQUIRED");
    const body = await safeBody(request);
    const id = body?.id;
    const title = validateTitle(body?.title);
    if (typeof id !== "string" || !UUID_RE.test(id) || !title) return failure(400, "INVALID_SAVED_SEARCH");
    const { data, error } = await supabase.from(TABLE).update({ title, updated_at: new Date().toISOString() })
      .eq("id", id).eq("owner_user_id", owner).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return failure(404, "NOT_FOUND");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleException(error); }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return failure(403, "ORIGIN_REJECTED");
  try {
    const owner = await ownerId();
    if (!owner) return failure(401, "LOGIN_REQUIRED");
    const body = await safeBody(request);
    const id = body?.id;
    if (typeof id !== "string" || !UUID_RE.test(id)) return failure(400, "INVALID_SAVED_SEARCH");
    const { data, error } = await supabase.from(TABLE).delete()
      .eq("id", id).eq("owner_user_id", owner).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return failure(404, "NOT_FOUND");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleException(error); }
}
