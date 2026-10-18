import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { adminKnowledgeDocuments } from "@/lib/admin-knowledge/library.server";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADM5A_READINESS_CONTRACT = "ARCTOR_ADM5A_READ_ONLY_AGENT_READINESS_V1";
const ROLE_ORDER = ["process", "product", "semantic", "ai", "engineering", "quality", "commercial", "support"] as const;

type RoleCode = (typeof ROLE_ORDER)[number];
type RoleRow = {
  role_code: string;
  title_ru: string;
  manager_title_ru: string;
  responsibility_summary_ru: string;
  is_active: boolean;
  agent_execution_enabled: boolean;
};

const ROLE_CODES = new Set<string>(ROLE_ORDER);
function isRoleRow(value: unknown): value is RoleRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.role_code === "string" && typeof v.title_ru === "string"
    && typeof v.manager_title_ru === "string" && typeof v.responsibility_summary_ru === "string"
    && typeof v.is_active === "boolean" && typeof v.agent_execution_enabled === "boolean";
}

export default async function AgentReadinessPage() {
  // This page only reads existing metadata. It does NOT contain any agent runner or mutation handler.
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin", "viewer"] });
  if (!guard.ok) notFound();

  const result = await supabase.from("arctor_admin_roles_adm2_v1")
    .select("role_code,title_ru,manager_title_ru,responsibility_summary_ru,is_active,agent_execution_enabled")
    .order("role_code", { ascending: true }).limit(32);

  const rows = Array.isArray(result.data) ? result.data.filter(isRoleRow) : [];
  const hasReadError = Boolean(result.error) || !Array.isArray(result.data)
    || rows.length !== result.data.length;
  const byCode = new Map<string, RoleRow>(rows.map((role) => [role.role_code, role]));
  const unknownRoles = rows.filter((role) => !ROLE_CODES.has(role.role_code));
  const hasEight = !hasReadError && rows.length === 8 && ROLE_ORDER.every((code) => byCode.has(code));
  const allAgentsOff = hasEight && rows.every((row) => row.agent_execution_enabled === false);
  const eligibleDocs = adminKnowledgeDocuments.filter((doc) => doc.approvalStatus === "approved" && doc.agentEnabled);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-6">
          <nav className="mb-3 flex flex-wrap gap-4 text-sm text-blue-700">
            <Link href="/admin">Администрирование</Link>
            <Link href="/project-knowledge/admin-library">Библиотека администратора</Link>
            <Link href="/admin/agent-governance">ADM-5A.2 · Полномочия</Link>
            <Link href="/admin/ai-instructions">AI Instructions</Link>
          </nav>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">ARCTor · ADM-5A.1</p>
          <h1 className="mt-2 text-3xl font-bold">Готовность должностных ИИ-исполнителей</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">Это карта текущих ролей и документов, а не включение ИИ. Никаких запросов к моделям, создания дел, регистрации попыток или изменений базы эта страница не выполняет.</p>
          <p className="mt-3 text-xs text-slate-500">{ADM5A_READINESS_CONTRACT} · Только чтение · Исполнение через ADM-5 отсутствует</p>
        </header>
        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-label="Сводка готовности">
          <h2 className="text-lg font-semibold">Контрольные условия</h2>
          {hasReadError ? (
            <p className="mt-2 text-red-700">Не удалось проверить роли в Supabase. Готовность не подтверждена; исполнение запрещено.</p>
          ) : (
            <div className="mt-2 space-y-2 text-sm">
              <p>Восемь штатных должностей: <strong>{hasEight ? "подтверждены" : "не подтверждены"}</strong> (получено {rows.length}; посторонних {unknownRoles.length}).</p>
              <p>Флаг запуска агентов: <strong>{allAgentsOff ? "отключён для всех восьми должностей" : "требуется проверка — возможны активные флаги или неполные данные"}</strong>.</p>
              <p>Утверждённые документы с разрешением использования агентами: <strong>{eligibleDocs.length}</strong> из {adminKnowledgeDocuments.length}.</p>
              <p>Статус ADM-5: <strong>только проектирование; запуск ИИ не реализован</strong>.</p>
            </div>
          )}
        </section>
        <section aria-label="Восемь должностей" className="grid gap-3 md:grid-cols-2">
          {ROLE_ORDER.map((code: RoleCode) => {
            const role = byCode.get(code);
            const related = adminKnowledgeDocuments.filter((doc) => doc.roleCodes.includes(code));
            const eligible = related.filter((doc) => doc.approvalStatus === "approved" && doc.agentEnabled);
            return (
              <article key={code} className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">{role?.title_ru ?? `Отсутствующая должность: ${code}`}</h2>
                <p className="mt-1 text-xs text-slate-500">{code} · {role?.manager_title_ru ?? "Нет записи в реестре"}</p>
                <p className="mt-2 text-sm text-slate-700">{role?.responsibility_summary_ru ?? "Ответственность не подтверждена"}</p>
                <dl className="mt-3 space-y-1 text-sm">
                  <div><dt className="inline font-semibold">Должность: </dt><dd className="inline">{role ? (role.is_active ? "активна" : "отключена") : "отсутствует"}</dd></div>
                  <div><dt className="inline font-semibold">Флаг агента в БД: </dt><dd className="inline">{role ? (role.agent_execution_enabled ? "включён — требуется аудит" : "отключён") : "неизвестен"}</dd></div>
                  <div><dt className="inline font-semibold">Относящихся документов: </dt><dd className="inline">{related.length}, разрешённых агенту: {eligible.length}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-amber-800">Контекст по taskCode ещё не собран. Назначение, AI-вызовы и изменение данных не выполняются.</p>
                {related.length > 0 ? (
                  <p className="mt-2 text-xs text-blue-700">Документы: {related.map((doc) => `${doc.id} (${doc.approvalStatus}, agentEnabled=${String(doc.agentEnabled)})`).join("; ")}</p>
                ) : <p className="mt-2 text-xs text-slate-500">Документы для этой роли пока не зарегистрированы.</p>}
              </article>
            );
          })}
        </section>
        <footer className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600">
          Следующий этап: согласование ADR-ADM5A-001 и отдельный проектный контракт попыток, контекста, аудита и AI Billing. Незавершённые условия нельзя считать успешно пройденными.
        </footer>
      </div>
    </main>
  );
}
