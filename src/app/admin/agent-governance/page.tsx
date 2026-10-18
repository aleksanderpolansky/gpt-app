import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { adminKnowledgeDocuments } from "@/lib/admin-knowledge/library.server";
import { supabase } from "../../../../lib/supabase";
import { ADM5A2_CONTRACT, ADM5A2_ROLE_CODES, ADM5A2_TASKS, ADM5A2_DRAFT_TRANSITIONS,
  evaluateGovernance, type RoleEvidence } from "@/lib/admin-execution/contractV1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RoleRow = {
  role_code: string;
  is_active: boolean;
  agent_execution_enabled: boolean;
};
function isRoleRow(row: unknown): row is RoleRow {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  const x = row as Record<string, unknown>;
  return typeof x.role_code === "string" && typeof x.is_active === "boolean"
    && typeof x.agent_execution_enabled === "boolean";
}
const allDocs = adminKnowledgeDocuments.map((doc) => ({
  id: doc.id, version: doc.version, approvalStatus: doc.approvalStatus,
  agentEnabled: doc.agentEnabled, roleCodes: doc.roleCodes, taskCodes: doc.taskCodes,
  sourceSha256: doc.sourceSha256
}));

export default async function AdminAgentGovernancePage() {
  const auth = await requirePlatformAdmin({ allowedRoles: ["owner", "admin", "viewer"] });
  if (!auth.ok) notFound();
  const { data, error } = await supabase.from("arctor_admin_roles_adm2_v1")
    .select("role_code,is_active,agent_execution_enabled").order("role_code").limit(32);
  const valid = !error && Array.isArray(data) && data.every(isRoleRow)
    && data.length === 8 && ADM5A2_ROLE_CODES.every((code) => data.some((role) => role.role_code === code))
    && data.every((role) => ADM5A2_ROLE_CODES.some((code) => code === role.role_code));
  const roles = valid ? (data as RoleRow[]) : [];
  const records = new Map<string, RoleRow>(roles.map((role) => [role.role_code, role]));
  const selectedTask = "admin_executor_governance";
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-6">
        <nav className="mb-3 flex flex-wrap gap-4 text-sm text-blue-700">
          <Link href="/admin">Администрирование</Link>
          <Link href="/admin/agent-readiness">Готовность должностей</Link>
          <Link href="/admin/agent-context">ADM-5B.1 · Контекст</Link>
          <Link href="/project-knowledge/admin-library">Библиотека</Link>
        </nav>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">ADM-5A.2 · Только проектирование</p>
        <h1 className="mt-2 text-3xl font-bold">Контракт полномочий ИИ-исполнителей</h1>
        <p className="mt-3 text-sm leading-6">Роль в организации не даёт ИИ права действовать. На этом этапе разрешён лишь административный просмотр. Поручения людей, флаги агентов, дела и факты не изменяются.</p>
        <p className="mt-3 text-xs text-slate-500">{ADM5A2_CONTRACT} · Никаких OpenAI API, SQL-записей, запуска агентов или автоматического согласования</p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Разделение прав</h2>
        <p className="mt-2 text-sm">Доступно сейчас: <strong>inspect</strong>. Проектные права для следующих этапов: <code>read_approved_context</code>, <code>prepare_report</code>, <code>request_approval</code>, <code>execute_approved_action</code>. Ни одно из них пока не выдаётся агенту.</p>
        <p className="mt-3 text-sm text-amber-800">Критический контракт: `agent_execution_enabled=true` может нарушить выдачу обычных поручений человеку через ADM-2B2. Не включать флаг до отдельной SQL-миграции и регрессионной проверки.</p>
        {!valid && <p className="mt-3 text-red-700">FAIL CLOSED: достоверность восьми ролей из Supabase не подтверждена. Информация о готовности недоступна.</p>}
        {valid && <p className="mt-3 text-sm">Восемь ролей подтверждены. Включённых флагов ИИ: <strong>{roles.filter((role) => role.agent_execution_enabled).length}</strong>. Утверждённых документов для ИИ: <strong>{allDocs.filter((doc) => doc.approvalStatus === "approved" && doc.agentEnabled).length}</strong>.</p>}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Закрытый проектный каталог типов задач</h2>
        <p className="mt-1 text-xs text-slate-600">Это перечень проектных типов задач для дальнейшего утверждения. Он не создает поручения и не назначает агентов.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{ADM5A2_TASKS.map((item) => <div key={item.taskCode} className="rounded-lg border border-slate-200 p-3 text-sm"><p className="font-semibold">{item.title}</p><code className="break-all text-xs text-blue-800">{item.taskCode}</code><p className="mt-1 text-xs text-slate-600">Роли: {item.roles.join(", ")}</p></div>)}</div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Предварительная оценка каждой роли</h2>
        <p className="mt-1 text-xs text-slate-600">Пример для задачи {selectedTask}. Причины отмечены как подтверждённые ограничениями проекта; попытка исполнения не предпринималась.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{ADM5A2_ROLE_CODES.map((code) => {
          const row = records.get(code);
          const evidence: RoleEvidence = { roleCode: code, isActive: row?.is_active ?? null, agentExecutionEnabled: row?.agent_execution_enabled ?? null };
          const result = evaluateGovernance(evidence, selectedTask, allDocs);
          return <article key={code} className="rounded-lg border border-slate-200 p-3 text-sm">
            <h3 className="font-semibold">{code}</h3>
            <p className="mt-1">Человеческая должность: {result.humanRoleEligible ? "активна" : "не подтверждена"}.</p>
            <p>Контекст: {result.authorizedDocuments}/{result.referenceDocuments} разрешённых документов. Исполнение ИИ: <strong>запрещено</strong>.</p>
            {result.reasons.map((reason) => <p key={reason.code} className="mt-2 text-xs"><span className="font-semibold">{reason.code}:</span> {reason.description} <span className="text-slate-500">({reason.certainty})</span> Следующий шаг: {reason.nextAction}</p>)}
          </article>;
        })}</div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Жизненный цикл будущей попытки (не поручения ADM-4)</h2>
        <p className="mt-2 text-xs text-slate-600">Состояния — проектный автомат; он не управляет текущей БД и не вызывает ИИ. После возврата на доработку потребуется новый идентификатор попытки.</p>
        <div className="mt-3 space-y-2 text-sm">{Object.entries(ADM5A2_DRAFT_TRANSITIONS).map(([from, to]) => <p key={from}><code>{from}</code> → {to.length ? to.join(" / ") : "финальное состояние"}</p>)}</div>
      </section>
      <footer className="rounded-xl border border-slate-200 bg-white p-4 text-sm">Дальше: ручная SQL-проверка текущих ограничений ADM-2B2, утверждение ADR-ADM5A2-001, затем ADM-5B (серверная сборка минимального контекста без запуска ИИ). Даже положительный precheck не включает исполнителей.</footer>
    </div>
  </main>;
}
