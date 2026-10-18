import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { readAdminContextPreviewV1 } from "@/lib/admin-execution/contextPreview.server";
import { ADM5B2_CONTRACT, buildAdminContextManifestV1, type ContextManifest } from "@/lib/admin-execution/contextManifestV1";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Params = { caseCode?: string | string[]; assignmentId?: string | string[];
  taskCode?: string | string[]; previousDigest?: string | string[] };
const first = (v: string | string[] | undefined) => typeof v === "string" ? v : "";
const isDigest = (s: string) => /^[a-f0-9]{64}$/i.test(s);

export default async function ManifestPage({ searchParams }: { searchParams: Promise<Params> }) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) notFound();
  const p = await searchParams;
  const caseCode = first(p.caseCode); const assignmentId = first(p.assignmentId);
  const taskCode = first(p.taskCode); const previousDigest = first(p.previousDigest);
  const invalidDigest = !!previousDigest && !isDigest(previousDigest);
  let manifest: ContextManifest | null = null;
  let errorCode: string | null = invalidDigest ? "INVALID_PREVIOUS_DIGEST" : null;
  if (!errorCode && caseCode && assignmentId && taskCode) {
    try {
      const result = await readAdminContextPreviewV1(caseCode, assignmentId, taskCode);
      if (result.errorCode || !result.preview) errorCode = result.errorCode ?? "PREVIEW_UNAVAILABLE";
      else manifest = buildAdminContextManifestV1(result.preview, previousDigest || null);
    } catch { errorCode = "MANIFEST_READ_FAILED"; }
  } else if (!errorCode) errorCode = "SELECT_CASE_ASSIGNMENT_AND_TASK";
  const back = new URLSearchParams({ caseCode, assignmentId, taskCode });
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-6">
        <nav className="mb-4 flex flex-wrap gap-4 text-sm text-blue-700">
          <Link href={`/admin/agent-context?${back.toString()}`}>Предпросмотр ADM-5B.1</Link>
          <Link href="/admin/agent-governance">Полномочия</Link>
          <Link href="/project-knowledge/admin-library">Библиотека</Link>
          <Link href={`/admin/agent-context/snapshots?${back.toString()}`}>ADM-5B.3 · Снимки</Link>
        </nav>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">ADM-5B.2 · Только чтение · Никакого запуска ИИ</p>
        <h1 className="mt-2 text-3xl font-bold">Манифест контекста поручения</h1>
        <p className="mt-2 text-sm">Детерминированный список источников и их SHA-256 для проверки изменений.
          Совпадение хеша не утверждает данные и не разрешает передачу модели.</p>
        <p className="mt-2 break-all text-xs text-slate-500">{ADM5B2_CONTRACT}</p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Проверить состояние контекста</h2>
        <form method="get" action="/admin/agent-context/manifest" className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <label className="grid gap-1">Дело<input name="caseCode" defaultValue={caseCode} maxLength={30} required className="rounded border p-2" /></label>
          <label className="grid gap-1">Поручение (UUID)<input name="assignmentId" defaultValue={assignmentId} maxLength={36} required className="rounded border p-2" /></label>
          <label className="grid gap-1">Код типа задачи<input name="taskCode" defaultValue={taskCode} maxLength={100} required className="rounded border p-2" /></label>
          <label className="grid gap-1">Прежний SHA-256 (необязательно)<input name="previousDigest" defaultValue={previousDigest} maxLength={64} pattern="[a-fA-F0-9]{64}" className="rounded border p-2 font-mono text-xs" /></label>
          <button type="submit" className="rounded border border-blue-500 px-4 py-2 text-blue-800 sm:col-span-2">Пересобрать и сравнить (без записи)</button>
        </form>
        {errorCode && <p className="mt-3 text-sm text-amber-800">Предпросмотр не подтверждён: {errorCode}. Ничего не запускается.</p>}
      </section>
      {manifest && <>
        <section className="rounded-xl border border-amber-300 bg-white p-5 text-sm space-y-2">
          <h2 className="text-lg font-semibold">Результат: контекст не разрешён к передаче ИИ</h2>
          <p>Дело: <b>{manifest.caseCode}</b>. Должность: <b>{manifest.roleCode}</b>. Тип: <code>{manifest.taskCode}</code>.</p>
          <p>Секций: <b>{manifest.totals.sectionCount}</b>; символов: <b>{manifest.totals.characters}</b>;
            ориентировочно {manifest.totals.tokensApproxMin}–{manifest.totals.tokensApproxMax} токенов.
            {manifest.totals.withinCharLimit ? " Лимит символов соблюдён." : " Лимит символов превышен."}</p>
          <p>Проверка публичного текста: <code>{manifest.sourceVerification}</code>. Это подтверждает буквальное вхождение текста в активную публичную публикацию на момент чтения, а не право отправки ИИ.</p>
          <div className="rounded border p-3">
            <p className="font-semibold">SHA-256 состава и содержимого</p>
            <p className="break-all font-mono text-xs">{manifest.digestSha256}</p>
            <p className="mt-2">Сравнение с прежним хешем: <b>{manifest.comparison.result}</b>.
              Хеш не хранится в БД и не является электронной подписью.</p>
          </div>
          <h3 className="font-semibold">Блокирующие условия</h3>
          <p className="break-words">{manifest.blockingReasons.join(" · ")}</p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold">Секции и происхождение</h2>
          {manifest.entries.map(item => <article key={`${item.ordinal}-${item.sourceRef}`} className="rounded border p-3 text-sm">
            <p className="font-semibold">{item.ordinal + 1}. {item.label} — {item.classification}</p>
            <p>Происхождение: {item.provenance}</p>
            <p className="break-all text-xs text-slate-600">Источник: {item.sourceRef} · Символов: {item.chars}</p>
            <p className="break-all font-mono text-xs">SHA-256: {item.sha256}</p>
          </article>)}
          <h3 className="font-semibold">Включённые утверждённые версии</h3>
          {manifest.documentsIncluded.length ? manifest.documentsIncluded.map(doc => <p key={doc.id} className="text-sm">{doc.id}@{doc.version} · {doc.sha256}</p>) : <p className="text-sm text-amber-700">Нет утверждённых и разрешённых агенту документов.</p>}
          <h3 className="font-semibold">Исключённые документы</h3>
          {manifest.documentsExcluded.map(doc => <p key={`${doc.id}-${doc.version}`} className="text-sm">{doc.id}@{doc.version}: {doc.reason}</p>)}
        </section>
      </>}
      <footer className="rounded-xl border bg-white p-4 text-xs text-slate-600">
        Только административная диагностика. Ни модели, ни автоматическое согласование, ни запись манифеста, ни изменение существующих дел не выполняются.
        Реальный допуск, версии политики, бюджет и хранение утверждённого снимка будут разработаны отдельно.
      </footer>
    </div>
  </main>;
}
