import { NextResponse } from "next/server";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { supabase } from "../../../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTRACT = "ARCTOR_ADMIN_ADM2B1_REGISTRY_READ_ONLY_V1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };

type CaseRow = { id: string };

function failure(code: string, status: number) {
  return NextResponse.json({ ok: false, contract: CONTRACT, errorCode: code },
    { status, headers: HEADERS });
}

// Owner/admin/viewer may read this admin-only projection. No write handlers.
// The Supabase service key never leaves the server, and no event details_json
// or user/agent identifiers are returned to the browser.
export async function GET(request: Request) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin", "viewer"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, CONTRACT);

  const url = new URL(request.url);
  const selectedId = url.searchParams.get("caseId");
  const limitParam = url.searchParams.get("limit");
  const parsedLimit = limitParam === null ? 100 : Number(limitParam);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
    return failure("ADM2B1_INVALID_LIMIT", 400);
  }
  if (selectedId !== null && !UUID_RE.test(selectedId)) {
    return failure("ADM2B1_INVALID_CASE_ID", 400);
  }

  try {
    if (selectedId) {
      const [caseResult, assignmentsResult, eventsResult] = await Promise.all([
        supabase.from("arctor_admin_cases_adm2_v1")
          .select("id,case_code,title,status,owner_role_code")
          .eq("id", selectedId).maybeSingle(),
        supabase.from("arctor_admin_assignments_adm2_v1")
          .select("id,case_id,recipient_role_code,assignment_text,required_result,status,created_at,accepted_at,completed_at")
          .eq("case_id", selectedId).order("created_at", { ascending: false }).limit(100),
        supabase.from("arctor_admin_case_events_adm2_v1")
          .select("id,case_id,assignment_id,event_kind,performed_by_type,result_summary,occurred_at")
          .eq("case_id", selectedId).order("occurred_at", { ascending: false }).limit(100),
      ]);
      if (caseResult.error || assignmentsResult.error || eventsResult.error) {
        console.error("ADM2B1_DETAIL_QUERY_FAILED", {
          caseError: caseResult.error?.code,
          assignmentsError: assignmentsResult.error?.code,
          eventsError: eventsResult.error?.code,
        });
        return failure("ADM2B1_DETAIL_READ_FAILED", 500);
      }
      if (!caseResult.data) return failure("ADM2B1_CASE_NOT_FOUND", 404);
      return NextResponse.json({ ok: true, contract: CONTRACT, mode: "case_detail",
        case: caseResult.data, assignments: assignmentsResult.data ?? [], events: eventsResult.data ?? [],
        limits: { assignments: 100, events: 100 },
        truncated: { assignments: (assignmentsResult.data ?? []).length === 100,
          events: (eventsResult.data ?? []).length === 100 },
        dbWritesPerformed: false }, { headers: HEADERS });
    }

    const [rolesResult, casesResult] = await Promise.all([
      supabase.from("arctor_admin_roles_adm2_v1")
        .select("role_code,title_ru,manager_title_ru,responsibility_summary_ru,is_active,agent_execution_enabled")
        .order("role_code", { ascending: true }).limit(20),
      supabase.from("arctor_admin_cases_adm2_v1")
        .select("id,case_code,title,description,case_type,priority,status,owner_role_code,source_system,source_entity_kind,source_external_id,source_path,next_expected_result,created_at,updated_at")
        .order("created_at", { ascending: false }).limit(parsedLimit + 1),
    ]);
    if (rolesResult.error || casesResult.error) {
      console.error("ADM2B1_LIST_QUERY_FAILED", { rolesError: rolesResult.error?.code,
        casesError: casesResult.error?.code });
      return failure("ADM2B1_REGISTRY_READ_FAILED", 500);
    }

    const allCases = (casesResult.data ?? []) as CaseRow[];
    const limitedCases = allCases.slice(0, parsedLimit);
    const ids = limitedCases.map((row) => row.id);
    let assignmentSummaries: unknown[] = [];
    let assignmentOverflow = false;
    if (ids.length) {
      const result = await supabase.from("arctor_admin_assignments_adm2_v1")
        .select("id,case_id,recipient_role_code,status,created_at")
        .in("case_id", ids).order("created_at", { ascending: false }).limit(501);
      if (result.error) {
        console.error("ADM2B1_ASSIGNMENTS_QUERY_FAILED", result.error.code);
        return failure("ADM2B1_ASSIGNMENTS_READ_FAILED", 500);
      }
      assignmentSummaries = (result.data ?? []).slice(0, 500);
      assignmentOverflow = (result.data ?? []).length > 500;
    }

    return NextResponse.json({ ok: true, contract: CONTRACT, mode: "registry",
      roles: rolesResult.data ?? [], cases: limitedCases, assignments: assignmentSummaries,
      limits: { cases: parsedLimit, assignments: 500 },
      truncated: { cases: allCases.length > parsedLimit, assignments: assignmentOverflow },
      dbWritesPerformed: false, agentExecutionPerformed: false }, { headers: HEADERS });
  } catch (error) {
    console.error("ADM2B1_UNEXPECTED_READ_ERROR", error instanceof Error ? error.name : "unknown");
    return failure("ADM2B1_INTERNAL_READ_ERROR", 500);
  }
}
