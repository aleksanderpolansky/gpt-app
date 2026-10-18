"use client";
import { useEffect, useRef, useState } from "react";

type Attempt = {id:string; attempt_ordinal:number; state:string; snapshot_version:number; created_at:string;
  agent_execution_permitted:boolean; outbound_authorized:boolean; budget_reserved:boolean};
type Snapshot = {id:string;version_num:number;manifest_digest:string};
type Load = {ok:boolean;errorCode?:string;contract?:string;roleCode?:string;snapshot?:Snapshot|null;
  liveManifestDigest?:string;reviewedInternal?:boolean;eligibleSnapshot?:boolean;attempts?:Attempt[];
  registeredEventCount?:number;executionForbidden?:boolean};
type WriteResult = {ok:boolean;errorCode?:string;result?:{attemptId?:string;state?:string;
  duplicateCandidate?:boolean;idempotentReplay?:boolean;agentExecutionPermitted?:boolean}};
const CASE = /^[A-Z][A-Z0-9]{1,9}-[0-9]{3,6}$/;
const TASK = /^[a-z][a-z0-9_]{2,90}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export default function RegistryClient({caseCode,assignmentId,taskCode}:{caseCode:string;assignmentId:string;taskCode:string}) {
  const [data,setData]=useState<Load|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState("");
  const operationId=useRef<string|null>(null);
  const valid=CASE.test(caseCode)&&UUID.test(assignmentId)&&TASK.test(taskCode);
  async function reload(){
    if(!valid)return;
    setBusy(true);
    try {
      const q=new URLSearchParams({caseCode,assignmentId,taskCode});
      const response=await fetch(`/api/admin/management/agent-attempts?${q.toString()}`,{cache:"no-store",credentials:"same-origin"});
      const body=await response.json() as Load;
      if(!response.ok||!body.ok) throw new Error(body.errorCode||"READ_FAILED");
      setData(body);setError("");
    }catch(e){setError(e instanceof Error?e.message:"READ_FAILED");setData(null);}
    finally{setBusy(false);}
  }
  useEffect(()=>{ if(!valid)return; let cancelled=false;
    const q=new URLSearchParams({caseCode,assignmentId,taskCode});
    void fetch(`/api/admin/management/agent-attempts?${q.toString()}`,{cache:"no-store",credentials:"same-origin"})
      .then(async r=>{const body=await r.json() as Load;if(!r.ok||!body.ok)throw new Error(body.errorCode||"READ_FAILED");return body;})
      .then(body=>{if(!cancelled){setData(body);setError("");}})
      .catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"READ_FAILED");});
    return()=>{cancelled=true};
  },[caseCode,assignmentId,taskCode,valid]);
  async function register(){
    if(!data?.eligibleSnapshot||!data.snapshot||busy) return;
    if(!window.confirm("Создать только запись намерения awaiting_preflight? ИИ не запускается, средства не резервируются.")) return;
    operationId.current ||= crypto.randomUUID();
    setBusy(true);setSaved("");setError("");
    try{
      const response=await fetch("/api/admin/management/agent-attempts",{
        method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"register_intent",caseCode,assignmentId,taskCode,
          snapshotId:data.snapshot.id,expectedManifestDigest:data.snapshot.manifest_digest,operationId:operationId.current})});
      const reply=await response.json() as WriteResult;
      if(!response.ok||!reply.ok) throw new Error(reply.errorCode||"REGISTER_FAILED");
      setSaved(`${reply.result?.duplicateCandidate?"Уже зарегистрировано":"Зарегистрировано"}: ${reply.result?.attemptId??"ID отсутствует"}; состояние ${reply.result?.state??"неизвестно"}`);
      operationId.current=null;
      // Refetch verified history, not a guessed success-state.
      const q=new URLSearchParams({caseCode,assignmentId,taskCode});
      const refreshed=await fetch(`/api/admin/management/agent-attempts?${q.toString()}`,{cache:"no-store",credentials:"same-origin"});
      const content=await refreshed.json() as Load;
      if(refreshed.ok&&content.ok)setData(content);
      else setError("Запись выполнена, но история не загрузилась. Нажмите «Обновить».");
    }catch(e){setError(e instanceof Error?e.message:"REGISTER_FAILED");}
    finally{setBusy(false);}
  }
  return <>
    <section className="rounded-xl border bg-white p-5 space-y-3 text-sm">
      <h2 className="text-lg font-semibold">Выбранное дело и поручение</h2>
      <form method="get" className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1">Дело<input className="rounded border p-2" name="caseCode" defaultValue={caseCode} required/></label>
        <label className="grid gap-1">Поручение (UUID)<input className="rounded border p-2" name="assignmentId" defaultValue={assignmentId} required/></label>
        <label className="grid gap-1">Тип задачи<input className="rounded border p-2" name="taskCode" defaultValue={taskCode} required/></label>
        <button className="rounded border border-indigo-600 p-2 text-indigo-700 sm:col-span-3">Выбрать и проверить</button>
      </form>
      {!valid&&<p className="text-amber-800">Введите действительные значения всех трёх полей.</p>}
      {data&&<><p>Должность: <b>{data.roleCode}</b></p><p>Снимок: версия <b>{data.snapshot?.version_num??"не найдена"}</b>, внутреннее согласование: <b>{data.reviewedInternal?"подтверждено":"отсутствует"}</b>.</p>
        <p>Актуальность перед регистрацией: <b>{data.eligibleSnapshot?"проверена":"НЕ ПОДТВЕРЖДЕНА"}</b>.</p>
        <p className="break-all font-mono text-xs">SHA-256 текущего контекста: {data.liveManifestDigest}</p></>}
      {error&&<p role="alert" className="text-red-700">{error}</p>}
      {saved&&<p role="status" className="text-green-800">{saved}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!valid||busy} onClick={()=>void reload()} className="rounded border px-4 py-2 disabled:opacity-40">Обновить историю (чтение)</button>
        <button type="button" disabled={!data?.eligibleSnapshot||busy} onClick={()=>void register()}
          className="rounded bg-indigo-700 px-4 py-2 text-white disabled:bg-slate-400">Зарегистрировать намерение (БЕЗ ИИ)</button>
      </div>
      <p className="font-semibold text-amber-800">EXECUTION_FORBIDDEN — разрешается только запись намерения. Если кнопка недоступна, проверьте актуальность и событие reviewed_internal.</p>
    </section>
    <section className="rounded-xl border bg-white p-5 space-y-2 text-sm">
      <h2 className="text-lg font-semibold">Зарегистрированные попытки (до 20)</h2>
      <p>Событий регистрации в показанных попытках: {data?.registeredEventCount??"—"}</p>
      {data?.attempts?.length?data.attempts.map(a=><article key={a.id} className="rounded border p-3 space-y-1">
        <p><b>Попытка № {a.attempt_ordinal}</b> · <code>{a.state}</code> · снимок v{a.snapshot_version}</p>
        <p className="break-all font-mono text-xs">ID: {a.id}</p>
        <p>Время регистрации: {a.created_at}</p>
        <p className="text-amber-800">ИИ: {a.agent_execution_permitted?"ПРОВЕРИТЬ НАРУШЕНИЕ":"запрещён"}; передача: {a.outbound_authorized?"ПРОВЕРИТЬ НАРУШЕНИЕ":"запрещена"}; резерв: {a.budget_reserved?"ПРОВЕРИТЬ НАРУШЕНИЕ":"нет"}</p>
      </article>):<p>Зарегистрированных попыток пока нет.</p>}
    </section>
  </>;
}
