import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { readAdminContextPreviewV1 } from "@/lib/admin-execution/contextPreview.server";
import { buildContextQualityV1, type SavedEvidence } from "@/lib/admin-execution/contextQualityV1";
import { supabase } from "../../../../../lib/supabase";
import CostSandbox from "./CostSandbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Params = { caseCode?: string | string[]; assignmentId?: string | string[]; taskCode?: string | string[] };
const first = (s: string | string[] | undefined) => typeof s === "string" ? s : "";
const CODE = /^[A-Z][A-Z0-9]{1,9}-[0-9]{3,6}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const TASK = /^[a-z][a-z0-9_]{2,90}$/;
export default async function ContextQualityPage({ searchParams }: { searchParams: Promise<Params> }) {
  const guard = await requirePlatformAdmin({ allowedRoles: ["owner", "admin"] });
  if (!guard.ok) notFound();
  const params = await searchParams;
  const caseCode = first(params.caseCode), assignmentId = first(params.assignmentId), taskCode = first(params.taskCode);
  const query = new URLSearchParams({caseCode, assignmentId, taskCode});
  const valid = CODE.test(caseCode) && UUID.test(assignmentId) && TASK.test(taskCode);
  let error: string | null = null;
  let report: ReturnType<typeof buildContextQualityV1> | null = null;
  if (valid) {
    try {
      const read = await readAdminContextPreviewV1(caseCode,assignmentId,taskCode);
      if (read.errorCode || !read.preview) error = read.errorCode || "CONTEXT_UNAVAILABLE";
      else {
        const rows = await supabase.from("arctor_admin_context_snapshots_adm5b3_v1")
          .select("id,version_num,manifest_digest,snapshot_digest,snapshot_text,captured_at")
          .eq("case_id",read.preview.caseId).eq("assignment_id",assignmentId)
          .eq("task_code",taskCode).order("version_num",{ascending:false}).limit(1);
        if (rows.error) error = rows.error.code === "42P01" ? "ADM5B3_SQL_NOT_INSTALLED" : "SNAPSHOT_READ_FAILED";
        else {
          const saved = (rows.data?.[0] || null) as SavedEvidence | null;
          let decision = "none";
          if (saved) {
            const events = await supabase.from("arctor_admin_context_snapshot_events_adm5b3_v1")
              .select("kind,event_at").eq("snapshot_id",saved.id).order("event_at",{ascending:false}).limit(20);
            if (events.error) error = "AUDIT_READ_FAILED";
            else decision = events.data?.find(e=>e.kind!=="captured")?.kind || "not_reviewed";
          }
          if (!error) report = buildContextQualityV1(read.preview,saved,decision);
        }
      }
    } catch { error = "QUALITY_DIAGNOSTIC_UNAVAILABLE"; }
  } else if (caseCode || assignmentId || taskCode) error="INVALID_SELECTION";
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-xl border bg-white p-6">
        <nav className="mb-4 flex flex-wrap gap-3 text-sm text-indigo-700">
          <Link href={`/admin/agent-context/snapshots?${query.toString()}`}>Снимки ADM-5B.3</Link>
          <Link href={`/admin/agent-context/manifest?${query.toString()}`}>Манифест ADM-5B.2</Link>
          <Link href="/project-knowledge/admin-library">Библиотека</Link>
          <Link href={`/admin/agent-preflight?${query.toString()}`}>ADM-5C.1 · Допуск</Link>
        </nav>
        <p className="text-xs text-indigo-700">ADM-5B.4 · только чтение · без запуска ИИ</p>
        <h1 className="mt-2 text-3xl font-bold">Качество, актуальность и стоимость контекста</h1>
        <p className="mt-2 text-sm">Раздельные хеши текста, политики отбора и сохранённого снимка. Плановый расчёт стоимости по введённым вручную тарифам; никаких обращений к моделям.</p>
      </header>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Выберите существующее поручение ADM-4</h2>
        <form method="get" className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <label className="grid gap-1">Дело<input required maxLength={30} name="caseCode" defaultValue={caseCode} className="rounded border p-2"/></label>
          <label className="grid gap-1">Поручение (UUID)<input required maxLength={36} name="assignmentId" defaultValue={assignmentId} className="rounded border p-2"/></label>
          <label className="grid gap-1">Код задачи<input required maxLength={90} name="taskCode" defaultValue={taskCode} className="rounded border p-2"/></label>
          <button className="rounded border border-indigo-600 p-2 text-indigo-700 sm:col-span-3">Повторить проверку (без записи)</button>
        </form>
        {error && <p className="mt-3 text-sm text-amber-800">Диагностика недоступна: {error}. Изменений нет.</p>}
      </section>
      {report && <>
        <section className="rounded-xl border bg-white p-5 space-y-2 text-sm">
          <h2 className="text-xl font-semibold">Состояние и защитные границы</h2>
          <p><b>{report.caseCode}</b> · {report.roleCode} · {report.taskCode}; секций: {report.sectionCount}.</p>
          <p>Объём: <b>{report.characters}/{report.contextCharLimit}</b> символов; резерв: {report.contextCharLimit-report.characters} символов; приблизительно {report.tokensApproxMin}–{report.tokensApproxMax} токенов.</p>
          <p>Размер сериализованного снимка: {report.frozenBytes} байт (отдельный лимит ADM-5B.3 — 32 000 байт).</p>
          <p>Запреты: <b>{report.blockingReasons.join(" · ")}</b></p>
          <p className="font-semibold text-amber-800">Внутреннее согласование не разрешает отправку данных ИИ. Любой будущий запуск требует отдельного контракта.</p>
        </section>
        <section className="rounded-xl border bg-white p-5 space-y-3 text-sm">
          <h2 className="text-xl font-semibold">Три разных контрольных суммы</h2>
          <p><b>Манифест B2</b> — учитывает метаданные отбора, исключения и блокировки.</p>
          <p className="break-all font-mono text-xs">{report.manifestDigest}</p>
          <p><b>Включённые тексты</b> — идентичность секций, их порядка, источников и текстов (ADM-5B.4).</p>
          <p className="break-all font-mono text-xs">{report.includedTextDigest}</p>
          <p><b>Метаданные политики</b> — версии инструкций, причины исключения, коды блокировок и проверка источника.</p>
          <p className="break-all font-mono text-xs">{report.policyMetadataDigest}</p>
          <p><b>Полный снимок B3</b> — сериализованный JSON со всеми текстами и манифестом.</p>
          <p className="break-all font-mono text-xs">{report.frozenDigest}</p>
          <p className="text-xs text-slate-600">Различные значения этих хешей ожидаемы: они вычислены из разных структур. Историческое расхождение B2/B3 нельзя объяснить достоверно без сохранённого старого манифеста и его версий документов.</p>
        </section>
        <section className="rounded-xl border bg-white p-5 space-y-3 text-sm">
          <h2 className="text-xl font-semibold">Сохранённый снимок и актуальность</h2>
          {!report.snapshot ? <p>Для этого поручения сохранённые снимки отсутствуют.</p> : <>
            <p>Версия {report.snapshot.version} · ID {report.snapshot.id} · решение: {report.snapshot.status}.</p>
            <p>Контроль целостности: <b>{report.snapshot.integrity}</b>.</p>
            <p>Сравнение с текущим манифестом: <b>{report.snapshot.currentManifestMatches ? "совпадает" : "отличается"}</b>.</p>
            <p>Причина изменения по имеющимся доказательствам: <b>{report.snapshot.changed}</b>.</p>
            <p>Хеш полного сохранённого JSON: {report.snapshot.frozenDigestMatches ? "PASS" : "FAIL"}; вложенный хеш манифеста: {report.snapshot.embeddedDigestMatches ? "PASS" : "FAIL"}; хеши секций: {report.snapshot.sectionHashesMatch ? "PASS" : "FAIL"}.</p>
            {report.snapshot.changed === "metadata_or_exclusions" && <p className="text-amber-800">Включённые тексты совпадают. Расхождение общего хеша связано с другими элементами манифеста, но точную причину нужно установить по сопоставлению версий метаданных.</p>}
          </>}
        </section>
        <section className="rounded-xl border bg-white p-5 space-y-3 text-sm">
          <h2 className="text-xl font-semibold">Состав контекста и минимизация</h2>
          {report.sections.map(s=><div className="rounded border p-3" key={`${s.ordinal}-${s.reference}`}>
            <p><b>{s.ordinal+1}. {s.sourceType}</b> · {s.reference} · {s.chars} символов.</p>
            <p>{s.rationale}</p><p>{s.required ? "Обязательный фрагмент, сокращать автоматически нельзя." : "Сокращение возможно только отдельным утверждённым решением."}</p>
            <p className="break-all font-mono text-xs">{s.sha256}</p>
          </div>)}
          <h3 className="font-semibold">Документы, исключённые текущей политикой</h3>
          {report.excludedDocuments.length ? report.excludedDocuments.map(d=><p key={`${d.id}-${d.version}`}>{d.id}@{d.version}: {d.reason}</p>) : <p>Нет исключений.</p>}
          <p className="text-xs text-slate-600">Автоматическое сокращение и удаление секций не выполняются; предложения не заменяют утверждённый исходник или снимок.</p>
        </section>
        <section className="rounded-xl border bg-white p-5 space-y-3 text-sm">
          <h2 className="text-xl font-semibold">Плановая оценка токенов и стоимости</h2>
          <CostSandbox low={report.tokensApproxMin} high={report.tokensApproxMax}/>
        </section>
      </>}
      <footer className="rounded-xl border bg-white p-4 text-xs">ADM-5B.4 — административная диагностика. Никаких OpenAI/API вызовов, SQL-записей, выбора модели к исполнению, переключения агентов, автоматического утверждения или изменения ADM-4.</footer>
    </div>
  </main>;
}
