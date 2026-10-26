"use client";
import {useState} from "react";
import {ON_ONLY_GUIDE} from "@/lib/ontology-research/onOnlyGuideV6";
import {candidateTemplate,parseCandidate,proposalIssues,serializeHandoff,selectReviewedCandidates,
  type Candidate,type ParentEvidence} from "@/lib/ontology-research/proposalHandoffV5";
import type {OntoLocale,ResearchStage,ResearchContext} from "@/lib/ontology-research/ontologyResearchV1";

type Detail={kind:"on"|"template";id:string;data:Record<string,unknown>};
type Props={locale:OntoLocale;answers:Partial<Record<ResearchStage,string>>;context:ResearchContext|null;details:Detail[]};
const COPY:Record<OntoLocale,[string,string,string,string,string,string,string,string,string,string]>={
 ru:["Реестр предложений ОН","Загрузить кандидатов из этапа 3/4","Добавить черновик вручную","Импорт массива onCandidates","Проверьте каждое поле. Предложения ИИ не являются фактами базы; результат поиска может быть неполным.","Проверено куратором: дубли, определения и родитель","Открыть заполненную форму ОН","Создание выполняется отдельно в действующей форме owner/admin. Никаких автоматических записей.","Создать","Проверить / переиспользовать"],
 uk:["Реєстр пропозицій ОН","Завантажити кандидатів з етапу 3/4","Додати чернетку","Імпортувати масив onCandidates","Перевірте всі поля; результати ШІ не є фактами БД.","Перевірено куратором: дублікати, визначення і батьківський ОН","Відкрити заповнену форму ОН","Запис виконується окремо з чинними правами адміністратора.","Створити","Перевірити / використати"],
 pl:["Rejestr propozycji ON","Pobierz kandydatów z etapu 3/4","Dodaj szkic","Importuj tablicę onCandidates","Sprawdź pola; propozycje AI nie są faktami bazy.","Kurator zweryfikował duplikaty, definicje i rodzica","Otwórz formularz tworzenia ON","Zapis tylko w istniejącym formularzu administratora.","Utwórz","Sprawdź / użyj"],
 en:["ON proposal register","Load candidates from stage 3/4","Add manual draft","Import onCandidates array","Verify all fields. AI proposals are not database facts.","Curator checked duplicates, definitions and parent","Open prefilled ON form","Creation is separate and still requires platform owner/admin authorization.","Create","Review / reuse"],
 de:["Register für ON-Vorschläge","Kandidaten aus Phase 3/4 laden","Entwurf hinzufügen","onCandidates-Array importieren","KI-Vorschläge sind keine bestätigten Datenbankfakten.","Kurator hat Duplikate, Definitionen und Elternknoten geprüft","Vorbefülltes ON-Formular öffnen","Erstellung nur im bestehenden Admin-Formular.","Erstellen","Prüfen / wiederverwenden"],
 es:["Registro de propuestas ON","Cargar candidatos de etapa 3/4","Añadir borrador","Importar matriz onCandidates","Verifica los campos; la IA no confirma datos de la base.","Curador revisó duplicados, definiciones y padre","Abrir formulario ON rellenado","Creación independiente con permisos owner/admin.","Crear","Revisar / reutilizar"],
 cs:["Registr návrhů ON","Načíst kandidáty z fáze 3/4","Přidat návrh","Importovat pole onCandidates","Návrhy AI nejsou ověřená data databáze.","Kurátor ověřil duplicity, definice a rodiče","Otevřít vyplněný formulář ON","Vytvoření jen v původním formuláři správce.","Vytvořit","Prověřit / znovu použít"],
};
const field="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";
export function OntologyProposalHandoffV5({locale,answers,context,details}:Props){
  const ui=COPY[locale];
  const guide=ON_ONLY_GUIDE[locale];
  const [items,setItems]=useState<Candidate[]>([]);
  const [manualJson,setManualJson]=useState("");
  const [checked,setChecked]=useState<Record<string,boolean>>({});
  const [message,setMessage]=useState("");
  const parents:ParentEvidence[]=[...(context?.ontology??[]).map(x=>({id:x.id,role:x.role})),
    ...details.filter(x=>x.kind==="on").map(x=>{
      const d=x.data.detail;
      const v=d&&typeof d==="object"&&!Array.isArray(d)?d as Record<string,unknown>:{};
      return{id:x.id,role:typeof v.role==="string"?v.role:typeof v.nodeRole==="string"?v.nodeRole:"unverified"};
    })];
  const hasCritique=typeof answers.critique==="string";
  const load=()=>{
    const result=selectReviewedCandidates(answers.design,answers.critique);
    if(result.status==="invalid_review") {setItems([]);setMessage(guide.invalidReview);return;}
    if(result.status==="reviewed_empty") {setItems([]);setChecked({});setMessage(guide.noCandidates);return;}
    setItems(result.candidates);setChecked({});
    if(result.status==="draft_only")setMessage(guide.reviewRequired);
    else setMessage(`${result.candidates.length} · ${guide.summary}`);
  };
  const patch=(index:number,changes:Partial<Candidate>)=>{
    setItems(prev=>prev.map((x,i)=>i===index?{...x,...changes}:x));
    const draftKey=items[index]?.draftKey;if(draftKey)setChecked(c=>({...c,[draftKey]:false}));
  };
  const importJson=()=>{
    try {
      const parsed:unknown=JSON.parse(manualJson);
      const source=Array.isArray(parsed)?parsed:parsed&&typeof parsed==="object"?(parsed as Record<string,unknown>).onCandidates:null;
      if(!Array.isArray(source)||source.length>100)throw new Error("onCandidates must be an array (max 100)");
      const candidates=source.map(parseCandidate);
      if(candidates.some(v=>v===null))throw new Error("Invalid candidate: check action, role, bilingual titles and relation");
      const unique=new Set(candidates.map(x=>x?.draftKey));
      if(unique.size!==candidates.length)throw new Error("Duplicate draftKey");
      setItems(candidates as Candidate[]);setChecked({});setMessage(guide.accepted);
    }catch(e){setMessage(e instanceof Error?e.message:"INVALID_CANDIDATES_JSON");}
  };
  const openForm=(candidate:Candidate)=>{
    const token=crypto.randomUUID();
    try {
      window.sessionStorage.setItem(`arctor:onto-ai:handoff:${token}`,serializeHandoff(candidate));
      window.location.assign(`/admin/system-observation-objects?locale=${encodeURIComponent(locale)}&handoff=${encodeURIComponent(token)}`);
    }catch(e){setMessage(e instanceof Error?e.message:"HANDOFF_FAILED");}
  };
  return <section className="space-y-3 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 p-4" aria-label="ON proposal register">
    <div><h2 className="text-lg font-bold text-slate-900">{ui[0]}</h2>
      <p className="mt-1 text-sm text-slate-700">{guide.registerHint}</p>
      <p className="text-xs text-amber-800">{ui[4]}</p></div>
    <div className="rounded-lg bg-white p-3 text-sm" role="status">
      <strong>{guide.summary}:</strong> {items.length===0?guide.noCandidates:
        `${guide.statusReuse}: ${items.filter(x=>x.action==="reuse").length} · ${guide.statusCreate}: ${items.filter(x=>x.action==="create").length} · ${guide.statusInvestigate}: ${items.filter(x=>x.action==="investigate").length} · ${guide.statusRevise}: ${items.filter(x=>x.action==="revise").length}`}
      {!hasCritique&&<p className="mt-1 text-amber-800">{guide.reviewRequired}</p>}
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={load} className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white">{guide.load}</button>
      <button type="button" onClick={()=>{setItems(s=>[...s,{...candidateTemplate(),draftKey:`draft-${crypto.randomUUID().slice(0,8)}`}]);setMessage(guide.manual);}} className="rounded-lg border border-indigo-500 px-3 py-2 text-sm text-indigo-700">{guide.manual}</button>
      <button type="button" onClick={()=>{const blob=new Blob([JSON.stringify({onCandidates:items},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="ARCTOR_ONTO_AI_ON_CANDIDATES_DRAFT.json";a.click();URL.revokeObjectURL(url);}} className="rounded-lg border px-3 py-2 text-sm">{guide.export}</button>
    </div>
    <details className="rounded-lg border bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">{guide.import}</summary>
      <textarea className={`${field} mt-2 font-mono`} rows={4} value={manualJson} onChange={e=>setManualJson(e.target.value)} placeholder='{"onCandidates": [...]} '/>
      <button type="button" onClick={importJson} className="mt-2 rounded bg-indigo-600 px-3 py-2 text-sm text-white">{guide.import}</button>
    </details>
    {items.length===0?<p className="text-sm text-slate-600">{hasCritique?guide.noCandidates:guide.reviewRequired}</p>:items.map((item,i)=>{
      const issues=proposalIssues(item,parents,hasCritique);
      const canHandoff=checked[item.draftKey]&&issues.length===0;
      return <div key={`${item.draftKey}:${i}`} className="space-y-3 rounded-xl border bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{i+1}. {item.titleRu||item.draftKey}</strong>
          <button type="button" className="text-xs text-red-600 underline" onClick={()=>{setItems(s=>s.filter((_,j)=>j!==i));setChecked(x=>({...x,[item.draftKey]:false}));}}>×</button></div>
        <div className="grid gap-2 md:grid-cols-3">
          <label className="text-xs">{guide.fieldAction}<select className={field} value={item.action} onChange={e=>patch(i,{action:e.target.value as Candidate["action"]})}>
            <option value="reuse">{guide.statusReuse}</option><option value="create">{guide.statusCreate}</option>
            <option value="investigate">{guide.statusInvestigate}</option><option value="revise">{guide.statusRevise}</option>
          </select></label>
          <label className="text-xs">{guide.fieldRole}<select className={field} value={item.role} onChange={e=>patch(i,{role:e.target.value as Candidate["role"]})}>
            <option value="root">{guide.roleRoot}</option><option value="intermediate">{guide.roleIntermediate}</option><option value="leaf">{guide.roleLeaf}</option>
          </select></label>
          <label className="text-xs">{guide.fieldConfidence}<select className={field} value={item.confidence} onChange={e=>patch(i,{confidence:e.target.value as Candidate["confidence"]})}>{["high","medium","low"].map(v=><option key={v}>{v}</option>)}</select></label>
          <label className="text-xs">{guide.fieldTitleRu}<input className={field} value={item.titleRu} maxLength={180} onChange={e=>patch(i,{titleRu:e.target.value})}/></label>
          <label className="text-xs">{guide.fieldTitleEn}<input className={field} value={item.titleEn} maxLength={180} onChange={e=>patch(i,{titleEn:e.target.value})}/></label>
          <label className="text-xs">{guide.fieldParent}<input className={field} value={item.parentExistingId??""} onChange={e=>patch(i,{parentExistingId:e.target.value||null})} placeholder="UUID (verified)"/></label>
          <label className="text-xs">{guide.fieldDefRu}<textarea className={field} rows={3} maxLength={4000} value={item.definitionRu} onChange={e=>patch(i,{definitionRu:e.target.value})}/></label>
          <label className="text-xs">{guide.fieldDefEn}<textarea className={field} rows={3} maxLength={4000} value={item.definitionEn} onChange={e=>patch(i,{definitionEn:e.target.value})}/></label>
          <div className="space-y-2"><label className="block text-xs">{guide.fieldRel}<select className={field} value={item.relationCode} onChange={e=>patch(i,{relationCode:e.target.value as Candidate["relationCode"]})}>{["part_of","is_a","aspect_of","subprocess_of"].map(v=><option key={v}>{v}</option>)}</select></label>
            <label className="block text-xs">{guide.fieldDraftParent}<input className={field} value={item.parentDraftKey??""} onChange={e=>patch(i,{parentDraftKey:e.target.value||null})}/></label></div>
        </div>
        <label className="block text-xs">{guide.fieldRationale}<textarea className={field} rows={2} maxLength={1500} value={item.rationale} onChange={e=>patch(i,{rationale:e.target.value})}/></label>
        <p className="text-xs text-slate-600">Evidence ON IDs: {item.evidenceOnIds.join(", ")||"none"} · Draft key: {item.draftKey}</p>
        {issues.length>0?<div className="text-xs text-amber-800">{guide.reviewRequired} · {issues.join(" · ")}</div>:<p className="text-xs text-green-700">{guide.approved} — {guide.resultHint}</p>}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={!!checked[item.draftKey]} onChange={e=>setChecked(p=>({...p,[item.draftKey]:e.target.checked}))} />{guide.approved}</label>
        <button type="button" disabled={!canHandoff} onClick={()=>openForm(item)} className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40">{guide.prefill}</button>
        <p className="text-xs text-slate-500">{ui[7]} {item.action!=="create"?guide.noCreate:guide.prefill}</p>
      </div>;
    })}
    {message&&<p role="status" className="text-sm text-indigo-800">{message}</p>}
    <p className="text-xs text-slate-500">{guide.saveHint} {guide.resultHint}</p>
  </section>;
}
