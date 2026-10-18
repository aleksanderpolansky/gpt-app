import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { readAdminContextPreviewV1 } from "@/lib/admin-execution/contextPreview.server";
import { makeInternalSnapshot, ADM5B3_CONTRACT } from "@/lib/admin-execution/contextSnapshotV1";
import { supabase } from "../../../../../lib/supabase";
import SnapshotActions from "./SnapshotActions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Params = { caseCode?: string | string[]; assignmentId?: string | string[]; taskCode?: string | string[]; snapshotId?: string | string[] };
const first = (v: string | string[] | undefined) => typeof v === "string" ? v : "";
type SnapshotRow = { id: string; version_num: number; manifest_digest: string; snapshot_digest: string;
  snapshot_text: string; captured_at: string; captured_by_app_user_id: string };
type EventRow = { id: string; snapshot_id: string; kind: string; reason: string; event_at: string };

export default async function SnapshotReviewPage({ searchParams }: { searchParams: Promise<Params> }) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) notFound();
  const p = await searchParams;
  const caseCode = first(p.caseCode);
  const assignmentId = first(p.assignmentId);
  const taskCode = first(p.taskCode);
  const selectedId = first(p.snapshotId);
  const url = new URLSearchParams({ caseCode, assignmentId, taskCode });
  let frozen: ReturnType<typeof makeInternalSnapshot> | null = null;
  let meta: { caseId: string; roleCode: string } | null = null;
  let error = "";
  let snapshots: SnapshotRow[] = [];
  let events: EventRow[] = [];
  if (caseCode && assignmentId && taskCode) {
    try {
      const result = await readAdminContextPreviewV1(caseCode, assignmentId, taskCode);
      if (result.errorCode || !result.preview) error = result.errorCode || "PREVIEW_MISSING";
      else {
        frozen = makeInternalSnapshot(result.preview);
        meta = { caseId: result.preview.caseId, roleCode: result.preview.roleCode };
        const snapshotQuery = await supabase.from("arctor_admin_context_snapshots_adm5b3_v1")
          .select("id,version_num,manifest_digest,snapshot_digest,snapshot_text,captured_at,captured_by_app_user_id")
          .eq("case_id", meta.caseId).eq("assignment_id", assignmentId).eq("task_code", taskCode)
          .order("version_num", { ascending: false }).limit(20);
        if (snapshotQuery.error) error = snapshotQuery.error.code === "42P01" ? "RUN_MANUAL_SQL_MIGRATION_FIRST" : "SNAPSHOT_READ_FAILED";
        else {
          snapshots = (snapshotQuery.data || []) as SnapshotRow[];
          if (snapshots.length) {
            const eventsQuery = await supabase.from("arctor_admin_context_snapshot_events_adm5b3_v1")
              .select("id,snapshot_id,kind,reason,event_at")
              .in("snapshot_id", snapshots.map(s => s.id)).order("event_at", { ascending: true });
            if (eventsQuery.error) error = "EVENTS_READ_FAILED";
            else events = (eventsQuery.data || []) as EventRow[];
          }
        }
      }
    } catch { error = "CONTEXT_VALIDATION_UNAVAILABLE"; }
  }
  const selected = snapshots.find(s => s.id === selectedId) ?? snapshots[0];
  let content: { sections?: { ordinal: number; sourceType: string; reference: string; text: string; sha256: string }[] } = {};
  if (selected) { try { content = JSON.parse(selected.snapshot_text) as typeof content; } catch { error = "STORED_SNAPSHOT_INVALID"; } }
  const lastDecision = selected ? events.filter(e => e.snapshot_id === selected.id && e.kind !== "captured").at(-1) : undefined;
  const isStale = !!(selected && frozen && selected.manifest_digest !== frozen.manifestDigest);
  const canReview = !!(selected && frozen && meta && !isStale && !lastDecision && !error);
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-xl border bg-white p-6">
        <nav className="mb-3 flex flex-wrap gap-3 text-sm text-indigo-700">
          <Link href={`/admin/agent-context/manifest?${url.toString()}`}>Манифест ADM-5B.2</Link>
          <Link href="/admin/agent-governance">Полномочия</Link>
          <Link href="/project-knowledge/admin-library">Библиотека</Link>
          <Link href={`/admin/agent-context/quality?${url.toString()}`}>ADM-5B.4 · Качество</Link>
        </nav>
        <p className="text-xs uppercase tracking-wide text-indigo-700">ADM-5B.3 · внутренние снимки · без запуска ИИ</p>
        <h1 className="mt-2 text-3xl font-bold">Снимки контекста и решения администратора</h1>
        <p className="mt-2 text-sm">Снимки неизменяемы. Решения — отдельные записи истории. Подтверждение только внутреннее: отправка внешним ИИ запрещена.</p>
        <p className="mt-2 text-xs text-slate-500">{ADM5B3_CONTRACT}</p>
      </header>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Выбор дела и поручения</h2>
        <form method="get" className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <label className="grid gap-1">Дело<input name="caseCode" required maxLength={30} defaultValue={caseCode} className="rounded border p-2" /></label>
          <label className="grid gap-1">Поручение (UUID)<input name="assignmentId" required maxLength={36} defaultValue={assignmentId} className="rounded border p-2" /></label>
          <label className="grid gap-1">Код задачи<input name="taskCode" required maxLength={100} defaultValue={taskCode} className="rounded border p-2" /></label>
          <button className="rounded border border-indigo-500 p-2 text-indigo-800 sm:col-span-3">Проверить актуальность и загрузить историю</button>
        </form>
        {error && <p className="mt-3 text-sm text-amber-800">Проверка остановлена: {error}. Изменений не было.</p>}
      </section>
      {frozen && meta && <>
        <section className="rounded-xl border bg-white p-5 space-y-2 text-sm">
          <h2 className="text-lg font-semibold">Текущий манифест</h2>
          <p>Дело <b>{caseCode}</b>, роль <b>{meta.roleCode}</b>, задача <b>{taskCode}</b>.</p>
          <p>Секций: {frozen.sectionCount}; символов: {frozen.characters}.</p>
          <p className="break-all font-mono text-xs">SHA-256: {frozen.manifestDigest}</p>
          <p>Блокировки передачи ИИ: <b>{frozen.blockingReasons.join(" · ")}</b></p>
          <p className="font-semibold text-amber-800">Ни один снимок не даёт права запускать модель.</p>
          {error ? <p className="text-amber-800">До установки SQL сохранение недоступно.</p> : <SnapshotActions mode="capture" caseCode={caseCode}
            assignmentId={assignmentId} taskCode={taskCode} expectedDigest={frozen.manifestDigest} />}
        </section>
        <section className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="text-lg font-semibold">Неизменяемые версии ({snapshots.length})</h2>
          {!snapshots.length && <p className="text-sm">Снимков пока нет. Это не ошибка, пока SQL не установлен или снимок не сохранён.</p>}
          {snapshots.map(s => <Link key={s.id} href={`/admin/agent-context/snapshots?${url.toString()}&snapshotId=${s.id}`}
            className={`block rounded border p-3 text-sm ${selected?.id === s.id ? "border-indigo-500" : "border-slate-200"}`}>
            <b>Версия {s.version_num}</b> · {new Date(s.captured_at).toLocaleString("ru-RU", { timeZone: "UTC" })} UTC
            <p className="break-all font-mono text-xs">{s.manifest_digest}</p>
            <p>{frozen.manifestDigest === s.manifest_digest ? "Актуален при текущей проверке" : "Устарел: текущий контекст отличается"}</p>
          </Link>)}
        </section>
        {selected && <section className="rounded-xl border bg-white p-5 space-y-3 text-sm">
          <h2 className="text-lg font-semibold">Сохранённый снимок · версия {selected.version_num}</h2>
          <p className="break-all font-mono text-xs">ID: {selected.id} · SHA-256 снимка: {selected.snapshot_digest}</p>
          <p><b>Актуальность:</b> {isStale ? "ИЗМЕНИЛСЯ — запрещено подтверждать эту версию" : "Совпадает с текущим манифестом"}</p>
          <p><b>Решение:</b> {lastDecision ? `${lastDecision.kind}: ${lastDecision.reason}` : "Не принято"}</p>
          <h3 className="font-semibold">Зафиксированные исходные фрагменты</h3>
          {(content.sections || []).map(e => <article key={e.ordinal} className="rounded border p-3">
            <p className="font-semibold">{e.ordinal + 1}. {e.sourceType} · {e.reference}</p>
            <p className="mt-2 whitespace-pre-wrap break-words">{e.text}</p>
            <p className="mt-2 break-all font-mono text-xs">SHA-256: {e.sha256}</p>
          </article>)}
          {canReview && <div className="grid gap-3 sm:grid-cols-2">
            <SnapshotActions mode="review_internal" caseCode={caseCode} assignmentId={assignmentId}
              taskCode={taskCode} expectedDigest={selected.manifest_digest} snapshotId={selected.id} />
            <SnapshotActions mode="reject" caseCode={caseCode} assignmentId={assignmentId}
              taskCode={taskCode} expectedDigest={selected.manifest_digest} snapshotId={selected.id} />
          </div>}
          <h3 className="font-semibold">Неизменяемый журнал событий</h3>
          {events.filter(e => e.snapshot_id === selected.id).map(e => <p key={e.id} className="rounded border p-2">
            {e.kind} · {new Date(e.event_at).toLocaleString("ru-RU", { timeZone: "UTC" })} UTC · {e.reason}
          </p>)}
        </section>}
      </>}
      <footer className="rounded-xl border bg-white p-4 text-xs">Нет OpenAI-запросов, автоматических решений, изменений ADM-4 или переключения agent_execution_enabled. SQL выполняется только вручную в Supabase.</footer>
    </div>
  </main>;
}
