import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { readAdminContextPreviewV1 } from "@/lib/admin-execution/contextPreview.server";
import { buildContextQualityV1, type SavedEvidence } from "@/lib/admin-execution/contextQualityV1";
import { evaluateAgentPreflightV1, type RoleEvidence } from "@/lib/admin-execution/executionPreflightV1";
import { readActiveModelPriceSnapshot } from "@/lib/ai-billing/runtime";
import { supabase } from "../../../../lib/supabase";
import {
  ARCTOR_AI_MODEL_ORDER, ARCTOR_AI_MODEL_CATALOG,
  ARCTOR_AI_MODEL_CATALOG_VERIFIED_AT, ARCTOR_AI_MODEL_AUTO_SEED_EXPIRES_AT,
} from "../../../../lib/ai/platformModelCatalog";
import BudgetSandbox, { type CandidateModel } from "./BudgetSandbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Params = { caseCode?: string | string[]; assignmentId?: string | string[]; taskCode?: string | string[] };
const one = (x:string|string[]|undefined) => typeof x === "string" ? x : "";
const CODE = /^[A-Z][A-Z0-9]{1,9}-[0-9]{3,6}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const TASK = /^[a-z][a-z0-9_]{2,90}$/;
async function readCandidates(): Promise<CandidateModel[]> {
  return Promise.all(ARCTOR_AI_MODEL_ORDER.map(async tierCode => {
    const m=ARCTOR_AI_MODEL_CATALOG[tierCode];
    try {
      const price=await readActiveModelPriceSnapshot({modelName:m.modelName,tierCode:m.tierCode});
      return {tierCode:m.tierCode,modelName:m.modelName,displayName:m.displayName,
        reasoningEffort:m.reasoningEffort,price,pricingStatus:"active_snapshot" as const};
    } catch {
      return {tierCode:m.tierCode,modelName:m.modelName,displayName:m.displayName,
        reasoningEffort:m.reasoningEffort,price:null,pricingStatus:"missing_or_invalid" as const};
    }
  }));
}
export default async function AdminModelBudgetPage({searchParams}:{searchParams:Promise<Params>}){
  const guard=await requirePlatformAdmin({allowedRoles:["owner","admin"]});
  if(!guard.ok) notFound();
  const params=await searchParams;
  const caseCode=one(params.caseCode),assignmentId=one(params.assignmentId),taskCode=one(params.taskCode);
  const query=new URLSearchParams({caseCode,assignmentId,taskCode});
  const valid=CODE.test(caseCode)&&UUID.test(assignmentId)&&TASK.test(taskCode);
  let error:string|null=null;
  let quality:ReturnType<typeof buildContextQualityV1>|null=null;
  let preflight:ReturnType<typeof evaluateAgentPreflightV1>|null=null;
  let candidates:CandidateModel[]=[];
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
            candidates=await readCandidates();
          }
        }
      }
    }catch{error="BUDGET_DIAGNOSTIC_READ_FAILED";quality=null;preflight=null;candidates=[];}
  }else if(caseCode||assignmentId||taskCode) error="INVALID_SELECTION";
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded-xl border bg-white p-6">
        <nav className="mb-4 flex flex-wrap gap-3 text-sm text-indigo-700">
          <Link href={`/admin/agent-preflight?${query.toString()}`}>Допуск ADM-5C.1</Link>
          <Link href={`/admin/agent-context/quality?${query.toString()}`}>Качество ADM-5B.4</Link>
          <Link href="/admin/ai-billing">AI Billing (действующий контур)</Link>
          <Link href="/project-knowledge/admin-library">Библиотека</Link>
          <Link href={`/admin/agent-attempts?${query.toString()}`}>ADM-5C.3A · Проект попытки</Link>
        </nav>
        <p className="text-xs font-semibold text-indigo-700">ADM-5C.2 · МОДЕЛЬ И БЮДЖЕТ · ТОЛЬКО ЧТЕНИЕ</p>
        <h1 className="mt-2 text-3xl font-bold">Подбор модели и планирование расходов</h1>
        <p className="mt-2 text-sm">Цены читаются из действующего AI Billing, без копирования тарифов. Все оценки предварительные. Не создаются назначения, резервы, записи кошелька или запросы к ИИ.</p>
      </header>
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Дело и конкретное поручение ADM-4</h2>
        <form method="get" className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <label className="grid gap-1">Дело<input name="caseCode" required maxLength={30} defaultValue={caseCode} className="rounded border p-2"/></label>
          <label className="grid gap-1">Поручение (UUID)<input name="assignmentId" required maxLength={36} defaultValue={assignmentId} className="rounded border p-2"/></label>
          <label className="grid gap-1">Код задачи<input name="taskCode" required maxLength={90} defaultValue={taskCode} className="rounded border p-2"/></label>
          <button className="rounded border border-indigo-600 p-2 text-indigo-700 sm:col-span-3">Пересчитать по текущим данным (без записей)</button>
        </form>
        {error && <p className="mt-3 text-amber-800 text-sm">Проверка остановлена: {error}. Допуски и бюджет не выданы.</p>}
      </section>
      {quality&&preflight&&<>
        <section className="rounded-xl border border-amber-400 bg-white p-5 space-y-2 text-sm">
          <h2 className="text-xl font-semibold">Исполнение запрещено</h2>
          <p><b>{caseCode}</b> · {preflight.roleCode} · {preflight.taskCode}.</p>
          <p>ADM-5C.1: условий {preflight.gates.length}; выполнено {preflight.passed}; блокировок {preflight.blocked}; неизвестно {preflight.unknown}.</p>
          <p>Снимок: {quality.snapshot?`версия ${quality.snapshot.version}; integrity=${quality.snapshot.integrity}; changed=${quality.snapshot.changed}`:"не найден"}.</p>
          <p className="font-semibold text-amber-800">Нельзя использовать этот расчёт как разрешение передачи данных, изменения `agent_execution_enabled`, резервирования кошелька или запуска модели.</p>
        </section>
        <section className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="text-xl font-semibold">Кандидаты моделей и проектный бюджет</h2>
          <p className="text-sm">Входная оценка ADM-5B.4: {quality.tokensApproxMin}–{quality.tokensApproxMax} токенов; символов {quality.characters}; секций {quality.sectionCount}. Данные о цене берутся из активных записей AI Billing.</p>
          <BudgetSandbox candidates={candidates} low={quality.tokensApproxMin} high={quality.tokensApproxMax}
            catalogVerifiedAt={ARCTOR_AI_MODEL_CATALOG_VERIFIED_AT} catalogSeedExpiresAt={ARCTOR_AI_MODEL_AUTO_SEED_EXPIRES_AT}/>
        </section>
        <section className="rounded-xl border bg-white p-5 text-sm space-y-2">
          <h2 className="font-semibold">Что ещё потребуется для настоящего запуска</h2>
          <p>Утверждение точной модели для роли и типа задачи; обновление каталога; цена и курс на момент операции; источник средств и согласованный плательщик; защищённый реестр бюджетных лимитов; атомарное резервирование через действующий AI Billing; отдельная политика внешней передачи; серверное исполнение и аудит попыток ADM-5C.3–5C.7.</p>
          <p>Эта страница не читает персональный кошелёк и не предполагает, что административные задачи оплачиваются средствами пользователя.</p>
        </section>
      </>}
      <footer className="rounded-xl border bg-white p-4 text-xs">ARCTOR_ADM5C2_MODEL_BUDGET_DESIGN_READ_ONLY_V1. Ни POST-маршрутов, ни SQL-записей, ни резервирования, ни вызовов OpenAI, ни выдачи полномочий. Финансовый допуск невозможен без отдельного согласованного контракта.</footer>
    </div>
  </main>;
}
