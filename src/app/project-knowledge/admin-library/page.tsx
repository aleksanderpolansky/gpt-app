import Link from "next/link";
import { adminKnowledgeDocuments, ADMIN_KNOWLEDGE_LIBRARY_CONTRACT } from "@/lib/admin-knowledge/library.server";

// The protected /project-knowledge/layout.tsx enforces requirePlatformAdmin().
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function AdminKnowledgeLibraryPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6">
          <nav className="mb-4 flex flex-wrap gap-4 text-sm text-blue-700">
            <Link href="/admin">Администрирование</Link>
            <Link href="/project-knowledge">Проектные знания</Link>
            <Link href="/admin/ai-instructions">Действующие инструкции ИИ</Link>
          </nav>
          <div className="text-xs font-bold tracking-widest text-indigo-700">ARCTor · ADM-4K1</div>
          <h1 className="mt-2 text-3xl font-bold">Библиотека администратора</h1>
          <p className="mt-3 leading-relaxed text-slate-700">Документы и решения, необходимые людям и будущим должностным ИИ-исполнителям. На текущем этапе это защищённая библиотека для чтения. Автоматическая передача документов в модель не включена.</p>
          <p className="mt-3 text-sm text-slate-600">Доступ через действующую проверку администратора. Данные пользователей и служебные ключи в библиотеку не помещаются.</p>
        </header>
        <section className="space-y-4" aria-label="Документы">
          {adminKnowledgeDocuments.map((doc) => (
            <article key={doc.id} id={doc.id} className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold text-indigo-700">{doc.category} · {doc.id}</div>
              <h2 className="mt-2 text-xl font-bold">{doc.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{doc.summary}</p>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold">Версия</dt><dd>{doc.version}</dd></div>
                <div><dt className="font-semibold">Согласование</dt><dd>{doc.approvalStatus === "approved" ? "Утверждён" : doc.approvalStatus === "retired" ? "Архив" : "Предложен — требует утверждения"}</dd></div>
                <div><dt className="font-semibold">Должности</dt><dd>{doc.roleCodes.join(", ")}</dd></div>
                <div><dt className="font-semibold">Использование агентом</dt><dd>{doc.agentEnabled ? "Разрешено" : "Не подключено"}</dd></div>
              </dl>
              <div className="mt-3 text-xs text-slate-600">Задачи: {doc.taskCodes.join(", ")}</div>
              <details className="mt-4 rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer font-semibold text-blue-700">Открыть полный текст документа</summary>
                <pre className="mt-3 max-h-[65vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 font-sans text-sm leading-6 text-slate-800">{doc.markdown}</pre>
              </details>
              <p className="mt-3 text-xs text-slate-500">Источник: {doc.source}</p>
            </article>
          ))}
        </section>
        <footer className="text-xs text-slate-500">{ADMIN_KNOWLEDGE_LIBRARY_CONTRACT}. Без записи в БД, вызовов ИИ и изменения дел.</footer>
      </div>
    </main>
  );
}
