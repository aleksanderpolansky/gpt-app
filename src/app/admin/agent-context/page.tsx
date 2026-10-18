import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { readAdminContextPreviewV1 } from "@/lib/admin-execution/contextPreview.server";
import { ADM5B1_CONTRACT } from "@/lib/admin-execution/contextContractV1";
import { ADM5A2_TASKS } from "@/lib/admin-execution/contractV1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Params = { caseCode?: string | string[]; assignmentId?: string | string[]; taskCode?: string | string[] };
const first = (value: string | string[] | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;
function href(code: string, id?: string, task?: string) {
  const q = new URLSearchParams({ caseCode: code, taskCode: task ?? "commercial_fact_preflight" });
  if (id) q.set("assignmentId", id);
  return `/admin/agent-context?${q.toString()}`;
}

export default async function AdminAgentContextPage({ searchParams }: { searchParams: Promise<Params> }) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) notFound();
  const query = await searchParams;
  const caseCode = first(query.caseCode, "ADM-000001");
  const id = first(query.assignmentId, "") || null;
  const taskCode = first(query.taskCode, "commercial_fact_preflight");
  let result: Awaited<ReturnType<typeof readAdminContextPreviewV1>>;
  try { result = await readAdminContextPreviewV1(caseCode, id, taskCode); }
  catch { result = { caseChoice: null, choices: [], preview: null, errorCode: "READ_FAILED",
    debug: { sourceLookupStatus: "not_attempted", candidateDocs: 0, selectedTask: taskCode } }; }
  const preview = result.preview;
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-6">
        <nav className="mb-3 flex flex-wrap gap-4 text-sm text-blue-700">
          <Link href="/admin">Администрирование</Link>
          <Link href="/admin/agent-governance">Полномочия ADM-5A.2</Link>
          <Link href="/project-knowledge/admin-library">Библиотека</Link>
          <Link href={`/admin/agent-context/manifest?${new URLSearchParams({ caseCode, assignmentId: id ?? "", taskCode }).toString()}`}>ADM-5B.2 · Манифест</Link>
        </nav>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">ADM-5B.1 · Только чтение</p>
        <h1 className="mt-2 text-3xl font-bold">Предпросмотр контекста конкретного поручения</h1>
        <p className="mt-3 text-sm leading-6">Сервер собирает кандидата на контекст только для администратора.
          Это не готовая инструкция для ИИ и не передача данных модели. Дела, факты и поручения не изменяются.</p>
        <p className="mt-2 break-all text-xs text-slate-500">{ADM5B1_CONTRACT} · agentExecutionPermitted=false</p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold">Выбор настоящего дела и поручения</h2>
        <form action="/admin/agent-context" method="get" className="flex flex-wrap items-end gap-2 text-sm">
          <label className="grid gap-1">Код дела ADM-4<input name="caseCode" defaultValue={caseCode} maxLength={30}
            className="rounded border border-slate-300 px-3 py-2" /></label>
          <label className="grid gap-1">Тип задания<select name="taskCode" defaultValue={taskCode}
            className="max-w-xs rounded border border-slate-300 px-3 py-2">
              {ADM5A2_TASKS.map(t => <option key={t.taskCode} value={t.taskCode}>{t.title}</option>)}
            </select></label>
          <button type="submit" className="rounded border border-blue-500 px-4 py-2 text-blue-800">Найти поручения</button>
        </form>
        {result.caseChoice && <p className="text-sm">Дело <strong>{result.caseChoice.caseCode}</strong>: {result.caseChoice.title}</p>}
        {result.errorCode && <p className="text-sm text-amber-800">{result.errorCode === "SELECT_ASSIGNMENT" ? "Выберите поручение ниже. Ничего не запускается." : `Предпросмотр недоступен: ${result.errorCode}. Проверка не считается успешной.`}</p>}
        <div className="grid gap-2 md:grid-cols-2">
          {result.choices.map(a => <Link key={a.id} href={href(caseCode, a.id, taskCode)}
            className={`rounded-lg border p-3 text-sm ${id === a.id ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
            <strong>{a.roleCode}</strong> · {a.status}<p className="break-all text-xs text-slate-600">{a.id}</p>
          </Link>)}
        </div>
      </section>
      {preview && <>
        <section className="rounded-xl border border-amber-300 bg-white p-5">
          <h2 className="font-semibold">Результат проверки готовности</h2>
          <p className="mt-2 text-sm">Предпросмотр сформирован: <strong>да</strong>. Передача агенту: <strong>запрещена</strong>.</p>
          <p className="mt-1 text-sm">Проверка источника: <code>{preview.sourceVerification}</code>. Инструкций включено: <strong>{preview.documentsSelected.length}</strong>.</p>
          <p className="mt-1 text-sm">Размер: {preview.estimate.characters} символов;
            ориентировочно {preview.estimate.tokensApproxMin}–{preview.estimate.tokensApproxMax} токенов (не расчёт стоимости модели).</p>
          <h3 className="mt-4 font-semibold">Причины блокировки и следующие действия</h3>
          <div className="mt-2 space-y-2">{preview.reasons.map(reason => <article key={reason.code} className="rounded border border-slate-200 p-3 text-sm">
            <p className="font-semibold">{reason.code} · {reason.certainty}</p><p>{reason.humanText}</p>
            <p className="mt-1 text-slate-600">Следующий шаг: {reason.nextAction}</p></article>)}</div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Состав контекста и происхождение</h2>
          <p className="mt-1 text-xs text-slate-600">Информация для просмотра администратором; не пересылается в API моделей.</p>
          <div className="mt-3 space-y-3">{preview.sections.map((section, index) => <article key={`${section.reference}-${index}`} className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold">{section.label} · {section.sourceType}</p>
            <p className="mt-1 break-all text-xs text-slate-500">Источник: {section.reference}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{section.text}</p>
          </article>)}</div>
          <h3 className="mt-4 font-semibold">Исключённые документы</h3>
          {preview.documentsExcluded.length ? <div className="mt-2 space-y-1 text-sm">{preview.documentsExcluded.map((doc,index) => <p key={`${doc.id}-${index}`}>{doc.id}@{doc.version}: {doc.reason}</p>)}</div>
            : <p className="mt-2 text-sm text-slate-500">Нет исключённых документов по выбранным роли и задаче.</p>}
        </section>
      </>}
      <footer className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        Следующий этап — ADM-5B.2: источники и версия утверждённого контекста, проверка безопасности и бюджета.
        Ни SQL-записи, ни agent_execution_enabled, ни вызовы OpenAI этот предпросмотр не выполняет.
      </footer>
    </div>
  </main>;
}
