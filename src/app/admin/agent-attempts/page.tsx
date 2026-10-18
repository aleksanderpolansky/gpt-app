import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { readAdminContextPreviewV1 } from "@/lib/admin-execution/contextPreview.server";
import { buildContextQualityV1, type SavedEvidence } from "@/lib/admin-execution/contextQualityV1";
import { evaluateAgentPreflightV1, type RoleEvidence } from "@/lib/admin-execution/executionPreflightV1";
import { planAttemptCandidateV1, ATTEMPT_STATES } from "@/lib/admin-execution/attemptRegistryDesignV1";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Params = { caseCode?: string | string[]; assignmentId?: string | string[]; taskCode?: string | string[] };
const one = (x:string|string[]|undefined) => typeof x === "string" ? x : "";
const CODE = /^[A-Z][A-Z0-9]{1,9}-[0-9]{3,6}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const TASK = /^[a-z][a-z0-9_]{2,90}$/;

export default async function AgentAttemptsReadOnlyPage({searchParams}:{searchParams:Promise<Params>}){
  const guard=await requirePlatformAdmin({allowedRoles:["owner","admin"]});
  if(!guard.ok) notFound();
  const params=await searchParams;
  const caseCode=one(params.caseCode),assignmentId=one(params.assignmentId),taskCode=one(params.taskCode);
  const query=new URLSearchParams({caseCode,assignmentId,taskCode});
  const valid=CODE.test(caseCode)&&UUID.test(assignmentId)&&TASK.test(taskCode);
  let error:string|null=null;
  let quality:ReturnType<typeof buildContextQualityV1>|null=null;
  let preflight:ReturnType<typeof evaluateAgentPreflightV1>|null=null;
  if(valid){
    try{
      const read=await readAdminContextPreviewV1(caseCode,assignmentId,taskCode);
      if(read.errorCode||!read.preview) error=read.errorCode??"PREVIEW_UNAVAILABLE";
      else {
        const p=read.preview;
        const roleRow=await supabase.from("arctor_admin_roles_adm2_v1")
          .select("is_active,agent_execution_enabled").eq("role_code",p.roleCode).maybeSingle();
        const role:RoleEvidence=!roleRow.error&&roleRow.data&&
          typeof roleRow.data.is_active==="boolean"&&typeof roleRow.data.agent_execution_enabled==="boolean"
          ? {isActive:roleRow.data.is_active,agentExecutionEnabled:roleRow.data.agent_execution_enabled}:null;
        const rows=await supabase.from("arctor_admin_context_snapshots_adm5b3_v1")
          .select("id,version_num,manifest_digest,snapshot_digest,snapshot_text,captured_at")
          .eq("case_id",p.caseId).eq("assignment_id",assignmentId)
          .eq("task_code",taskCode).order("version_num",{ascending:false}).limit(1);
        if(rows.error) error="SNAPSHOT_READ_FAILED";
        else {
          const saved=(rows.data?.[0]??null) as SavedEvidence|null;
          let latestDecision:"reviewed_internal"|"rejected"|"not_reviewed"|"unknown"=saved?"unknown":"not_reviewed";
          let eventHistoryComplete=!saved;
          if(saved){
            const ev=await supabase.from("arctor_admin_context_snapshot_events_adm5b3_v1")
              .select("kind,event_at").eq("snapshot_id",saved.id)
              .order("event_at",{ascending:false}).limit(21);
            if(ev.error||!ev.data||ev.data.length>20||!ev.data.some(x=>x.kind==="captured"))
              error="AUDIT_HISTORY_UNVERIFIED";
            else {
              const decision=ev.data.find(x=>x.kind!=="captured")?.kind;
              latestDecision=decision==="reviewed_internal"||decision==="rejected"?decision:decision?"unknown":"not_reviewed";
              eventHistoryComplete=true;
            }
          }
          if(!error){
            quality=buildContextQualityV1(p,saved,latestDecision);
            preflight=evaluateAgentPreflightV1({preview:p,quality,role,latestDecision,eventHistoryComplete});

          }
        }
      }
    }catch{error="ATTEMPT_CANDIDATE_READ_FAILED";quality=null;preflight=null;}
  }else if(caseCode||assignmentId||taskCode) error="INVALID_SELECTION";
  const candidate = quality&&preflight ? planAttemptCandidateV1(preflight,quality) : null;
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-xl border bg-white p-6">
        <nav className="mb-4 flex flex-wrap gap-3 text-sm text-indigo-700">
          <Link href={`/admin/agent-preflight?${query.toString()}`}>Допуск ADM-5C.1</Link>
          <Link href={`/admin/agent-budget?${query.toString()}`}>Бюджет ADM-5C.2</Link>
          <Link href={`/admin/agent-context/snapshots?${query.toString()}`}>Снимок ADM-5B.3</Link>
          <Link href="/project-knowledge/admin-library">Библиотека</Link>
        </nav>
        <p className="text-xs font-semibold text-indigo-700">ADM-5C.3A · ПРОЕКТ КОНТРАКТА ПОПЫТКИ · ТОЛЬКО ЧТЕНИЕ</p>
        <h1 className="mt-2 text-3xl font-bold">Предварительная карточка попытки ИИ</h1>
        <p className="mt-2 text-sm">Это не созданная попытка и не готовый реестр. Система собирает проверяемую структуру для будущей регистрации, не создавая UUID, записей, платежей или запросов к ИИ.</p>
      </header>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Конкретное дело и поручение ADM-4</h2>
        <form method="get" className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <label className="grid gap-1">Дело<input name="caseCode" required maxLength={30} defaultValue={caseCode} className="rounded border p-2"/></label>
          <label className="grid gap-1">Поручение UUID<input name="assignmentId" required maxLength={36} defaultValue={assignmentId} className="rounded border p-2"/></label>
          <label className="grid gap-1">Код задачи<input name="taskCode" required maxLength={90} defaultValue={taskCode} className="rounded border p-2"/></label>
          <button className="rounded border border-indigo-600 p-2 text-indigo-700 sm:col-span-3">Проверить проект попытки (без записи)</button>
        </form>
        {error&&<p className="mt-3 text-amber-800 text-sm">Проверка остановлена: {error}. Реестр не изменён.</p>}
      </section>
      {candidate&&<>
        <section className="rounded-xl border border-amber-500 bg-white p-5 space-y-2 text-sm">
          <h2 className="text-xl font-bold">Исполнение запрещено</h2>
          <p><b>{candidate.caseCode}</b> · должность <b>{candidate.roleCode}</b> · задача <b>{candidate.taskCode}</b>.</p>
          <p>Проверка ADM-5C.1: выполнено {preflight!.passed}, блокировок {preflight!.blocked}, неизвестно {preflight!.unknown}.</p>
          <p>Внутренняя проверка снимка не выдаёт право внешнего API, запуска или расходования средств.</p>
          <p className="font-semibold text-amber-800">ИТОГ: EXECUTION_FORBIDDEN. Регистрируемых попыток этот экран не создаёт.</p>
        </section>
        <section className="rounded-xl border bg-white p-5 space-y-3 text-sm">
          <h2 className="text-xl font-semibold">Кандидат записи — без сохранения</h2>
          <p>Привязка: <b>{candidate.caseCode}</b> / <code className="break-all">{candidate.assignmentId}</code> / {candidate.taskCode}.</p>
          <p>Снимок: {candidate.snapshotId ? <><code className="break-all">{candidate.snapshotId}</code>, версия {candidate.snapshotVersion}</>:"не подтверждён"}.</p>
          <p>Манифест: <code className="break-all">{candidate.currentManifestDigest??"не проверен"}</code></p>
          <p>Отпечаток проектного кандидата (не ID попытки): <code className="break-all">{candidate.candidateFingerprint}</code></p>
          <p>Фактически сохранённый ID попытки: <b>отсутствует</b>. Число попыток в БД: <b>не проверялось</b>.</p>
          <p>Модель, ценовой снимок, лимит, плательщик, резерв и исходящая политика: <b>не закреплены</b>.</p>
          <p>Проектное начальное состояние после будущей регистрации: <code>{candidate.targetState}</code>. Переходы пока не работают.</p>
          <p className="text-slate-600">Отпечаток позволяет сравнить проекты с одинаковыми параметрами. Настоящую уникальность попытки и защиту от повторной записи обязан обеспечить сервер и БД.</p>
        </section>
        <section className="rounded-xl border bg-white p-5 space-y-3 text-sm">
          <h2 className="text-xl font-semibold">Почему пока нельзя создать исполнительную попытку</h2>
          <p>Выявлено условий, требующих работы или проверки: <b>{candidate.issues.length}</b>.</p>
          {candidate.issues.map((i,index)=><div key={index} className="rounded border p-3 space-y-1">
            <p><b>{i.code}</b> — {i.status==="blocked"?"не выполнено":"не проверено"}</p>
            <p>{i.explanation}</p>
            <p className="text-amber-800">Следующее действие: {i.nextAction}</p>
          </div>)}
        </section>
        <section className="rounded-xl border bg-white p-5 space-y-3 text-sm">
          <h2 className="text-xl font-semibold">Проект жизненного цикла (ещё не действующие состояния)</h2>
          <div className="flex flex-wrap gap-2">{ATTEMPT_STATES.map((s,i)=><span key={s} className="rounded border bg-slate-50 px-2 py-1">{i+1}. {s}</span>)}</div>
          <p>Каждый переход в будущей версии должен требовать отдельного серверного права и записываться в append-only журнал. Изменение отчёта после возврата потребует новую попытку, а не перезапись завершённой.</p>
        </section>
      </>}
      <footer className="rounded-xl border bg-white p-4 text-xs">ARCTOR_ADM5C3A_ATTEMPT_CANDIDATE_READ_ONLY_V1. Нет SQL-миграций, POST-маршрутов, записи намерения, резерва средств, исполнения ИИ, доступа агента или изменения флагов ADM-4.</footer>
    </div>
  </main>;
}
