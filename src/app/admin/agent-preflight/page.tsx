import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { readAdminContextPreviewV1 } from "@/lib/admin-execution/contextPreview.server";
import { buildContextQualityV1, type SavedEvidence } from "@/lib/admin-execution/contextQualityV1";
import { evaluateAgentPreflightV1, type RoleEvidence } from "@/lib/admin-execution/executionPreflightV1";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Params = { caseCode?: string | string[]; assignmentId?: string | string[]; taskCode?: string | string[] };
const one = (x: string | string[] | undefined) => typeof x === "string" ? x : "";
const CODE = /^[A-Z][A-Z0-9]{1,9}-[0-9]{3,6}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const TASK = /^[a-z][a-z0-9_]{2,90}$/;

export default async function AgentExecutionPreflightPage({ searchParams }: { searchParams: Promise<Params> }) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) notFound();
  const params = await searchParams;
  const caseCode = one(params.caseCode), assignmentId = one(params.assignmentId), taskCode = one(params.taskCode);
  const query = new URLSearchParams({ caseCode, assignmentId, taskCode });
  const valid = CODE.test(caseCode) && UUID.test(assignmentId) && TASK.test(taskCode);
  let error: string | null = null;
  let report: ReturnType<typeof evaluateAgentPreflightV1> | null = null;
  if (valid) {
    try {
      const read = await readAdminContextPreviewV1(caseCode, assignmentId, taskCode);
      if (read.errorCode || !read.preview) error = read.errorCode ?? "PREVIEW_UNAVAILABLE";
      else {
        const roleRow = await supabase.from("arctor_admin_roles_adm2_v1")
          .select("is_active,agent_execution_enabled")
          .eq("role_code", read.preview.roleCode).maybeSingle();
        const role: RoleEvidence = !roleRow.error && roleRow.data &&
          typeof roleRow.data.is_active === "boolean" &&
          typeof roleRow.data.agent_execution_enabled === "boolean"
          ? { isActive: roleRow.data.is_active, agentExecutionEnabled: roleRow.data.agent_execution_enabled }
          : null;
        const savedRows = await supabase.from("arctor_admin_context_snapshots_adm5b3_v1")
          .select("id,version_num,manifest_digest,snapshot_digest,snapshot_text,captured_at")
          .eq("case_id", read.preview.caseId).eq("assignment_id", assignmentId)
          .eq("task_code", taskCode).order("version_num", { ascending: false }).limit(1);
        if (savedRows.error) error = "SNAPSHOT_READ_FAILED";
        else {
          const saved = (savedRows.data?.[0] ?? null) as SavedEvidence | null;
          let latestDecision: "reviewed_internal" | "rejected" | "not_reviewed" | "unknown" = saved ? "unknown" : "not_reviewed";
          let eventHistoryComplete = !saved;
          if (saved) {
            const ev = await supabase.from("arctor_admin_context_snapshot_events_adm5b3_v1")
              .select("kind,event_at")
              .eq("snapshot_id", saved.id).order("event_at", { ascending: false }).limit(21);
            if (ev.error || !ev.data || ev.data.length > 20 || !ev.data.some(x => x.kind === "captured")) {
              error = "AUDIT_HISTORY_UNVERIFIED";
            } else {
              const decision = ev.data.find(x => x.kind !== "captured")?.kind;
              latestDecision = decision === "reviewed_internal" || decision === "rejected" ? decision :
                decision ? "unknown" : "not_reviewed";
              eventHistoryComplete = true;
            }
          }
          if (!error) report = evaluateAgentPreflightV1({ preview: read.preview,
            quality: buildContextQualityV1(read.preview, saved, latestDecision),
            role, latestDecision, eventHistoryComplete });
        }
      }
    } catch { error = "PREFLIGHT_READ_FAILED"; }
  } else if (caseCode || assignmentId || taskCode) error = "INVALID_SELECTION";
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-xl border bg-white p-6">
        <nav className="mb-4 flex flex-wrap gap-3 text-sm text-indigo-700">
          <Link href="/admin">Администрирование</Link>
          <Link href={`/admin/agent-context/quality?${query.toString()}`}>Качество ADM-5B.4</Link>
          <Link href={`/admin/agent-context/snapshots?${query.toString()}`}>Снимки ADM-5B.3</Link>
          <Link href="/project-knowledge/admin-library">Библиотека</Link>
          <Link href={`/admin/agent-budget?${query.toString()}`}>ADM-5C.2 · Модели и бюджет</Link>
        </nav>
        <p className="text-xs font-semibold text-indigo-700">ADM-5C.1 · ПРЕДВАРИТЕЛЬНАЯ ПРОВЕРКА · ТОЛЬКО ЧТЕНИЕ</p>
        <h1 className="mt-2 text-3xl font-bold">Допуск ИИ-исполнителя к поручению</h1>
        <p className="mt-2 text-sm">Показывает доказанные условия и причины блокировки. Это не запуск, не формирование полномочий и не разрешение передавать контекст модели.</p>
      </header>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Существующее дело и поручение ADM-4</h2>
        <form method="get" className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <label className="grid gap-1">Дело<input name="caseCode" required maxLength={30} defaultValue={caseCode} className="rounded border p-2"/></label>
          <label className="grid gap-1">Поручение (UUID)<input name="assignmentId" required maxLength={36} defaultValue={assignmentId} className="rounded border p-2"/></label>
          <label className="grid gap-1">Код задачи<input name="taskCode" required maxLength={90} defaultValue={taskCode} className="rounded border p-2"/></label>
          <button className="rounded border border-indigo-600 p-2 text-indigo-700 sm:col-span-3">Проверить условия (без записей)</button>
        </form>
        {error && <p className="mt-3 text-sm text-amber-800">Проверка остановлена: {error}. Разрешения не выданы.</p>}
      </section>
      {report && <>
        <section className="rounded-xl border border-amber-400 bg-white p-5 space-y-2 text-sm">
          <h2 className="text-xl font-semibold">Исполнение запрещено</h2>
          <p>Дело <b>{report.caseCode}</b>, роль <b>{report.roleCode}</b>, задача <b>{report.taskCode}</b>.</p>
          <p>Условий: {report.gates.length}; доказано: <b>{report.passed}</b>; блокировок: <b>{report.blocked}</b>; неизвестно: <b>{report.unknown}</b>.</p>
          <p>Внутренняя проверка снимка: <b>{report.readyForInternalReview ? "имеются необходимые доказательства" : "не все доказательства собраны"}</b>.</p>
          <p className="font-semibold text-amber-800">Внутренняя проверка не разрешает внешний API, расход бюджета или изменение данных.</p>
        </section>
        <section className="rounded-xl border bg-white p-5 space-y-3 text-sm">
          <h2 className="text-xl font-semibold">Контрольные условия и следующие действия</h2>
          {report.gates.map(g => <div key={g.code} className="rounded border p-3 space-y-1">
            <p><b>{g.title}</b> — <span className={g.state === "pass" ? "text-green-700" : "text-amber-800"}>
              {g.state === "pass" ? "выполнено" : g.state === "blocked" ? "не выполнено" : "не проверено"}</span></p>
            <p className="font-mono text-xs text-slate-700">{g.code}: {g.evidence}</p>
            {g.state !== "pass" && <p>Что делать: {g.nextAction}</p>}
          </div>)}
        </section>
      </>}
      <footer className="rounded-xl border bg-white p-4 text-xs">ARCTOR_ADM5C1_PREFLIGHT_DESIGN_READ_ONLY_V1. Нет POST-маршрутов, SQL-записей, выполнения ИИ, создания попыток, автоматического утверждения, переключения флагов и отправки данных моделям.</footer>
    </div>
  </main>;
}
