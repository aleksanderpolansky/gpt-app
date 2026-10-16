import { NextResponse } from "next/server";
import {
  platformAdminErrorResponse,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { supabase } from "../../../../../../lib/supabase";
import { listConsequenceConstructorTasksV1 } from "@/lib/reality-curator/consequence-constructor.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CONTRACT = "ARCTOR_ADM4B2_WORK_QUEUE_PREVIEW_V1";
const HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
const LIMIT = 30;

type WorkItem = {
  id: string;
  category: "commercial_activity" | "consequence_task";
  label: string;
  state: string;
  createdAt: string;
  href: string;
  caseCode: string | null;
  eligibleForAdministrativeIntake: boolean;
  eligibilityReason: string;
};

function safeParameterCode(value: unknown): string {
  return typeof value === "string" && /^[a-zA-Z0-9_.:-]{1,70}$/.test(value) ? value : "не указан";
}
function fail(code: string, status: number) {
  return NextResponse.json({ ok: false, contract: CONTRACT, errorCode: code }, { status, headers: HEADERS });
}

/** Read-only preview. Privacy-gated eligibility never returns user text or private activity metadata. */
export async function GET() {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) return platformAdminErrorResponse(guard, CONTRACT);
  try {
    const [commercial, consequences, cases] = await Promise.all([
      supabase.from("activity_events")
        .select("id,commercial_processing_status,created_at,source_message_object_id")
        .eq("activity_context_code", "commercial")
        .in("commercial_processing_status", ["analysis_ready", "needs_review", "failed"])
        .order("created_at", { ascending: false }).limit(LIMIT + 1),
      listConsequenceConstructorTasksV1(),
      supabase.from("arctor_admin_cases_adm2_v1")
        .select("id,case_code,title,status,source_system,source_entity_kind,source_external_id")
        .order("created_at", { ascending: false }).limit(200),
    ]);
    if (commercial.error || cases.error) {
      console.error("ADM4B2_QUEUE_READ_FAILED", { commercial: commercial.error?.code, cases: cases.error?.code });
      return fail("ADM4B2_QUEUE_READ_FAILED", 503);
    }
    const messageIds = [...new Set((commercial.data ?? [])
      .map((r) => r.source_message_object_id).filter((id): id is string => typeof id === "string" && id.length > 0))];
    const verifiedMessages = messageIds.length > 0
      ? await supabase.from("message_objects").select("id").in("id", messageIds)
        .eq("audience_scope_code", "public").eq("lifecycle_status", "active")
      : { data: [] as Array<{ id: string }>, error: null };
    if (verifiedMessages.error) {
      console.error("ADM4B2_PUBLIC_PROOF_READ_FAILED", verifiedMessages.error.code);
      return fail("ADM4B2_PUBLIC_PROOF_READ_FAILED", 503);
    }
    const publicIds = new Set((verifiedMessages.data ?? []).map((m) => m.id));
    const allCases = cases.data ?? [];
    const linked = new Map(allCases.filter((c) => c.source_system === "arctor" && c.source_entity_kind && c.source_external_id)
      .map((c) => [`${c.source_entity_kind}:${c.source_external_id}`, c.case_code]));
    const commercialItems: WorkItem[] = (commercial.data ?? []).slice(0, LIMIT).map((row) => {
      const isPublic = Boolean(row.source_message_object_id && publicIds.has(row.source_message_object_id));
      const caseCode = linked.get(`commercial_activity_event:${row.id}`) ?? null;
      return {
        id: row.id, category: "commercial_activity" as const,
        label: `Коммерческая активность · ${row.id.slice(0, 8)}`,
        state: row.commercial_processing_status ?? "unknown", createdAt: row.created_at,
        href: "/admin/commercial-activities", caseCode,
        eligibleForAdministrativeIntake: isPublic && !caseCode,
        eligibilityReason: caseCode ? "Уже связано с делом" : isPublic ? "Публичный первоисточник подтверждён" : "Публичность источника не подтверждена — запись запрещена",
      };
    });
    const consequenceItems: WorkItem[] = consequences.slice(0, LIMIT).map((task) => ({
      id: task.id, category: "consequence_task" as const,
      label: `Задание конструктора · параметр ${safeParameterCode(task.parameterCode)}`,
      state: task.state, createdAt: task.createdAt,
      href: `/admin/consequence-constructor/${task.id}`,
      caseCode: linked.get(`consequence_task:${task.id}`) ?? null,
      eligibleForAdministrativeIntake: false,
      eligibilityReason: "Личный контекст: нужен отдельный порядок разрешений личного куратора",
    }));
    const eligibleCases = allCases.filter((c) =>
      ["manual", "admin_console"].includes(c.source_system)
      && c.source_entity_kind == null && c.source_external_id == null
      && !["closed", "cancelled", "resolved"].includes(c.status))
      .map((c) => ({ id: c.id, caseCode: c.case_code, title: c.title.slice(0, 140) }));
    return NextResponse.json({
      ok: true, contract: CONTRACT,
      items: [...commercialItems, ...consequenceItems], eligibleCases,
      counts: { commercialShown: commercialItems.length, consequenceShown: consequenceItems.length },
      truncated: { commercial: (commercial.data ?? []).length > LIMIT, consequence: consequences.length > LIMIT },
      limits: { perQueue: LIMIT, caseSelection: 200 }, isCompleteQueue: false,
      dbWritesPerformed: false, agentExecutionPerformed: false,
    }, { headers: HEADERS });
  } catch (error) {
    console.error("ADM4B2_QUEUE_ERROR", error instanceof Error ? error.name : "unknown");
    return fail("ADM4B2_INTERNAL_ERROR", 500);
  }
}
