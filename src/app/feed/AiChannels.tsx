'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHANNEL_MODEL_OPTIONS, type ChannelSpec, type ChannelRow, type ChannelItem, type OntologyOption } from '@/lib/ai-channels/contracts';
import { channelWords,channelDetailWords } from '@/lib/ai-channels/copy';
const inputClass='w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900';
const buttonClass='rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40';
type Run={id:string;status:string;started_at:string;error_code:string|null;published_count:number;items:ChannelItem[];usage:Record<string,unknown>;revision:number};
type CreationAccess={allowed:boolean;reason:string;availableEur:number|null};
const MODERATOR_ACTOR_ID='d4727330-1cd4-475a-ac0b-aaba89087f4a';
const creationGateCopy=(locale:string)=>{
 const copy={
  ru:{lead:'Недостаточно токенов для создания ИИ канала.',action:'Написать сообщение модератору для получения тестовых 100 000 токенов'},
  pl:{lead:'Za mało tokenów, aby utworzyć kanał AI.',action:'Napisz wiadomość do moderatora, aby otrzymać testowe 100 000 tokenów'},
  en:{lead:'Not enough tokens to create an AI channel.',action:'Message the moderator to receive 100,000 test tokens'},
  uk:{lead:'Недостатньо токенів для створення ШІ-каналу.',action:'Напишіть модератору, щоб отримати тестові 100 000 токенів'},
  de:{lead:'Nicht genügend Token, um einen KI-Kanal zu erstellen.',action:'Schreiben Sie dem Moderator, um 100.000 Test-Token zu erhalten'},
  es:{lead:'No hay suficientes tokens para crear un canal de IA.',action:'Escribe al moderador para recibir 100 000 tokens de prueba'},
  cs:{lead:'Pro vytvoření AI kanálu není dostatek tokenů.',action:'Napište moderátorovi a získejte 100 000 testovacích tokenů'}
 } as const;
 return copy[locale as keyof typeof copy]??copy.en;
};
const fresh=(locale:string,admin:boolean):ChannelSpec=>({
 name:'',topic:'',geography:'',exclusions:'',domains:[],language:locale,intervalHours:24,lookbackDays:7,maxItems:15,
 searchDepth:'detailed',freshness:'recent',timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,
 model:'gpt-5.4-mini',reasoningEffort:'medium',maxToolCalls:10,searchContextSize:'high',maxOutputTokens:12000,
 coverageMode:'diverse',maxPerProvider:3,minDistinctProviders:3,categoryMode:'open',allowedCategories:[],feedPreviewCount:1,
 objectIds:[],scope:admin?'public':'private'
});
const normalized=(value:ChannelSpec,revision:number):ChannelSpec=>{
 const detailed=(value.searchDepth??'quick')==='detailed';
 return {...value,revision,searchDepth:value.searchDepth??'quick',freshness:value.freshness??'recent',timeZone:value.timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone,
  model:value.model??'gpt-5.4-mini',reasoningEffort:value.reasoningEffort??(detailed?'medium':'low'),maxToolCalls:value.maxToolCalls??(detailed?10:4),
  searchContextSize:value.searchContextSize??(detailed?'high':'medium'),maxOutputTokens:value.maxOutputTokens??(detailed?12000:6500),coverageMode:value.coverageMode??'ranked',
  maxPerProvider:value.maxPerProvider??3,minDistinctProviders:value.minDistinctProviders??3,categoryMode:value.categoryMode??'open',allowedCategories:value.allowedCategories??[],feedPreviewCount:value.feedPreviewCount??1};
};
export default function AiChannels({locale,adminMode=false}:{locale:string;adminMode?:boolean}){
 const t=channelWords(locale),v=channelDetailWords(locale),router=useRouter(),gateCopy=creationGateCopy(locale);
 const moderatorMessageHref='/messages?to='+encodeURIComponent(MODERATOR_ACTOR_ID)+'&locale='+encodeURIComponent(locale);
 const [channels,setChannels]=useState<ChannelRow[]>([]),[signedIn,setSignedIn]=useState(false),[admin,setAdmin]=useState(false),[creationAccess,setCreationAccess]=useState<CreationAccess|null>(null);
 const [open,setOpen]=useState(false),[editing,setEditing]=useState<string|null>(null),[spec,setSpec]=useState<ChannelSpec>(fresh(locale,false));
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[options,setOptions]=useState<OntologyOption[]>([]),[search,setSearch]=useState('');
 const [preview,setPreview]=useState<{id:string;runId:string;items:ChannelItem[];usage?:Record<string,unknown>}|null>(null),[runs,setRuns]=useState<Run[]>([]),[historyId,setHistoryId]=useState('');
 const [activeRun,setActiveRun]=useState<{id:string;runId:string}|null>(null),[pollPaused,setPollPaused]=useState(false);
 async function load(){const r=await fetch('/api/ai-channels',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);setChannels(d.channels);setSignedIn(d.signedIn);setAdmin(d.admin);setCreationAccess(d.creationAccess??null);const pending=(d.channels as ChannelRow[]).find(c=>c.runningRunId);if(pending)setActiveRun({id:pending.id,runId:pending.runningRunId!});}
 useEffect(()=>{let current=true;fetch('/api/ai-channels',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(current){setChannels(d.channels);setSignedIn(d.signedIn);setAdmin(d.admin);setCreationAccess(d.creationAccess??null);const pending=(d.channels as ChannelRow[]).find(c=>c.runningRunId);if(pending)setActiveRun({id:pending.id,runId:pending.runningRunId!});}}).catch(e=>{if(current)setError(String(e.message));});return()=>{current=false;};},[]);
 useEffect(()=>{if(!open)return;const abort=new AbortController();const timer=setTimeout(()=>{fetch('/api/ai-channels?objects='+encodeURIComponent(search),{signal:abort.signal}).then(r=>r.json()).then(d=>{if(d.error)throw Error(d.error);setOptions(d.objects??[]);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});},250);return()=>{clearTimeout(timer);abort.abort();};},[search,open]);
 async function action(body:Record<string,unknown>){const r=await fetch('/api/ai-channels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}
 async function perform(fn:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await fn();await load();router.refresh();}catch(e){setError(e instanceof Error?e.message:'CHANNEL_REQUEST_FAILED');}finally{setBusy(false);}}
 useEffect(()=>{
  if(!activeRun||pollPaused)return;
  const controller=new AbortController();let stopped=false,errors=0,timer:ReturnType<typeof setTimeout>;const current=activeRun;
  const tick=async()=>{try{
   const r=await fetch('/api/ai-channels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'poll',id:current.id,runId:current.runId}),signal:controller.signal});
   const d=await r.json();if(!r.ok)throw Error(d.error??'CHANNEL_REQUEST_FAILED');if(stopped)return;
   if(d.status==='running'){errors=0;timer=setTimeout(tick,5000);return;}
   setChannels(cs=>cs.map(c=>c.id===current.id?{...c,runningRunId:null}:c));setError(d.status==='failed'?(d.error??'CHANNEL_COLLECTION_FAILED'):'');
   if(d.status==='ready'&&d.kind==='test')setPreview({id:current.id,runId:current.runId,items:d.items,usage:d.usage});
   const list=await fetch('/api/ai-channels',{cache:'no-store',signal:controller.signal});const data=await list.json();if(stopped)return;if(!list.ok)throw Error(data.error??'CHANNEL_REQUEST_FAILED');
   setChannels(data.channels);const next=(data.channels as ChannelRow[]).find(c=>c.runningRunId);setActiveRun(next?{id:next.id,runId:next.runningRunId!}:null);router.refresh();
  }catch(e){if(stopped)return;errors++;if(errors>=3){setPollPaused(true);setError(e instanceof Error?e.message:'CHANNEL_REQUEST_FAILED');return;}timer=setTimeout(tick,8000);}};
  timer=setTimeout(tick,1000);return()=>{stopped=true;clearTimeout(timer);controller.abort();};
 },[activeRun,pollPaused,router]);
 const field=(key:keyof ChannelSpec,value:unknown)=>setSpec(s=>({...s,[key]:value}));
 return <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800" aria-label={t[1]}>
 {adminMode&&<div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4"><div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-800">4 · Каналы ИИ</div><h2 className="mt-1 text-xl font-black text-slate-900">Панель управления каналами</h2><p className="mt-2 text-sm leading-6 text-slate-600">Здесь администратор управляет содержанием канала и его runtime-настройками: моделью, бюджетом поиска, глубиной, охватом, тематическим фильтром, количеством результатов и видом группы в ленте. Жёсткие пределы расходов и безопасности остаются в коде.</p></div>}
 <div className="flex flex-wrap items-start gap-2"><details className="min-w-[160px] flex-1" open={adminMode||undefined}><summary className="cursor-pointer py-2 font-semibold">{t[1]} ({channels.length})</summary>
 {!channels.length&&<p className="py-2 text-sm">{t[38]}</p>}
 {channels.map(c=><div key={c.id} className="border-t py-3"><label className="flex items-center gap-2"><input type="checkbox" checked={c.enabled} disabled={!signedIn||busy} onChange={e=>{const enabled=e.target.checked;void perform(async()=>{await action({action:'preference',id:c.id,enabled});});}} aria-label={`${t[31]}: ${c.name}`}/><strong>{c.name}</strong><span className="text-xs">{c.scope==='public'?t[19]:t[20]}</span></label>
 {adminMode&&c.canManage&&<p className="mt-1 text-xs text-slate-500">{c.spec.model??'gpt-5.4-mini'} · {c.spec.searchDepth??'quick'} · {c.spec.coverageMode??'ranked'} · max {c.spec.maxItems} · preview {c.spec.feedPreviewCount??1}</p>}
 {c.canManage&&<><p className="my-1 text-xs">{t[27]}: {c.last_run_at?new Date(c.last_run_at).toLocaleString(locale):'—'} · {c.status==='active'?v.active:v.paused}</p>{c.last_error&&<p className="text-xs text-red-700">{c.last_error}</p>}
 <div className="flex flex-wrap gap-1">
 <button className={buttonClass} disabled={busy||Boolean(c.runningRunId)} onClick={()=>{setEditing(c.id);setSpec(normalized(c.spec,c.revision));setSearch('');setOpen(true);setPreview(null);}}>{t[13]}</button>
 <button className={buttonClass} disabled={busy||Boolean(activeRun)||Boolean(c.runningRunId)} onClick={()=>void perform(async()=>{setPreview(null);setPollPaused(false);const d=await action({action:'test',id:c.id});if(d.status==='running')setActiveRun({id:c.id,runId:d.runId});else if(d.status==='failed')throw Error(d.error);else setPreview({id:c.id,runId:d.runId,items:d.items,usage:d.usage});})}>{t[14]}</button>
 <button className={buttonClass} disabled={busy||Boolean(c.runningRunId)} onClick={()=>void perform(async()=>{await action({action:'status',id:c.id,status:c.status==='active'?'paused':'active'});})}>{c.status==='active'?t[17]:t[16]}</button>
 <button className={buttonClass} disabled={busy} onClick={()=>void perform(async()=>{const r=await fetch('/api/ai-channels?history='+c.id);const d=await r.json();if(!r.ok)throw Error(d.error);setRuns(d.runs);setHistoryId(c.id);})}>{t[21]}</button>
 <button className={buttonClass} disabled={busy||Boolean(c.runningRunId)} onClick={()=>{if(window.confirm(t[35]))void perform(async()=>{await action({action:'status',id:c.id,status:'archived'});setPreview(null);});}}>{t[18]}</button>
 </div></>}
 </div>)}</details>
 {signedIn?<div className="flex items-start gap-2"><button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={busy||creationAccess?.allowed!==true} onClick={()=>{setEditing(null);setSpec(fresh(locale,admin));setSearch('');setOpen(true);setPreview(null);}}>{t[0]}</button>{creationAccess?.allowed===false&&<span className="group relative inline-flex"><button type="button" aria-label={gateCopy.lead+' '+gateCopy.action} className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-base font-black text-amber-700">!</button><span role="tooltip" className="absolute right-0 top-full z-50 mt-2 hidden w-80 rounded-xl border border-amber-200 bg-white p-3 text-xs leading-5 text-slate-700 shadow-xl group-hover:block group-focus-within:block"><span>{gateCopy.lead} </span><a className="font-semibold text-blue-700 underline" href={moderatorMessageHref}>{gateCopy.action}</a></span></span>}</div>:<p className="text-sm">{t[30]}</p>}</div>
 {signedIn&&<p className="mt-2 text-xs text-slate-500">{t[29]}</p>}
 {busy&&<p role="status" className="mt-2">{t[28]}</p>}{notice&&<p role="status" className="mt-2 text-green-700">{notice}</p>}{error&&<p role="alert" className="mt-2 text-red-700">{/^CHANNEL_SCHEMA/.test(error)?t[36]:error}</p>}
 {activeRun&&<div role="status" className="mt-3 rounded-lg bg-blue-50 p-3 text-sm"><p>{pollPaused?v.retry:v.running}</p>{pollPaused&&<button className={buttonClass} onClick={()=>{setError('');setPollPaused(false);}}>{v.resume}</button>}<button className={buttonClass} disabled={busy} onClick={()=>void perform(async()=>{await action({action:'cancel',id:activeRun.id,runId:activeRun.runId});setActiveRun(null);setPollPaused(false);})}>{v.cancel}</button><p className="mt-1 text-xs">{v.cancelHint}</p></div>}
 {open&&<form className="mt-4 space-y-3 border-t pt-4" onSubmit={e=>{e.preventDefault();void perform(async()=>{const d=await action({action:'save',id:editing,spec});setEditing(d.id);setOpen(false);setNotice(t[33]);});}}>
 <h2 className="font-semibold">{editing?t[13]:t[0]}</h2>
 {(['name','topic','geography','exclusions'] as const).map((key,i)=><label key={key} className="block text-sm">{t[i+2]}{key==='topic'?<textarea className={inputClass} rows={3} maxLength={2000} required value={spec[key]} onChange={e=>field(key,e.target.value)}/>:<input className={inputClass} maxLength={key==='name'?120:key==='geography'?200:1000} required={key==='name'} value={spec[key]} onChange={e=>field(key,e.target.value)}/>}</label>)}
 <label className="block text-sm">{t[6]}<input className={inputClass} value={spec.domains.join(', ')} onChange={e=>field('domains',e.target.value.split(',').map(x=>x.trim()).filter(Boolean))}/></label>
 <div className="grid grid-cols-2 gap-3"><label>{t[7]}<select className={inputClass} value={spec.language} onChange={e=>field('language',e.target.value)}>{['ru','uk','pl','en','de','es','cs'].map(l=><option key={l}>{l}</option>)}</select></label>
 <label>{t[8]}<select className={inputClass} value={spec.intervalHours} onChange={e=>field('intervalHours',Number(e.target.value))}>{[1,6,24,168].map(h=><option key={h} value={h}>{h} h</option>)}</select></label>
 <label>{t[22]}<input className={inputClass} type="number" min={1} max={30} disabled={spec.freshness==='current'} value={spec.lookbackDays} onChange={e=>field('lookbackDays',Number(e.target.value))}/></label>
 <label>{t[23]}<input className={inputClass} type="number" min={1} max={30} value={spec.maxItems} onChange={e=>field('maxItems',Number(e.target.value))}/></label></div>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 <label className="text-sm">{v.depth}<select className={inputClass} value={spec.searchDepth??'quick'} onChange={e=>field('searchDepth',e.target.value)}><option value="quick">{v.quick}</option><option value="detailed">{v.detailed}</option></select></label>
 <label className="text-sm">{v.freshness}<select className={inputClass} value={spec.freshness??'recent'} onChange={e=>field('freshness',e.target.value)}><option value="recent">{v.recent}</option><option value="current">{v.current}</option></select></label>
 <label className="text-sm">{v.timeZone}<input className={inputClass} required value={spec.timeZone??'UTC'} onChange={e=>field('timeZone',e.target.value)}/></label></div>
 <p className="text-xs text-slate-500">{v.cost}</p>{spec.freshness==='current'&&<p className="text-xs text-slate-500">{v.currentHint}</p>}
 {adminMode&&admin&&<details className="rounded-xl border border-cyan-200 bg-cyan-50 p-3" open><summary className="cursor-pointer text-sm font-bold text-cyan-900">Расширенные настройки администратора</summary><p className="mt-2 text-xs leading-5 text-slate-600">Эти значения хранятся в spec канала. Сервер всё равно применяет жёсткие пределы: до 20 поисковых вызовов, до 20 000 выходных токенов, до 30 результатов и до 10 результатов одного поставщика.</p>
  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
   <label className="text-sm">Модель<select className={inputClass} value={spec.model??'gpt-5.4-mini'} onChange={e=>field('model',e.target.value)}>{CHANNEL_MODEL_OPTIONS.map(model=><option key={model.id} value={model.id}>{model.label} · {model.id}</option>)}</select></label>
   <label className="text-sm">Уровень рассуждения<select className={inputClass} value={spec.reasoningEffort??'medium'} onChange={e=>field('reasoningEffort',e.target.value)}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
   <label className="text-sm">Макс. поисковых вызовов<input className={inputClass} type="number" min={1} max={20} value={spec.maxToolCalls??10} onChange={e=>field('maxToolCalls',Number(e.target.value))}/></label>
   <label className="text-sm">Контекст веб-поиска<select className={inputClass} value={spec.searchContextSize??'high'} onChange={e=>field('searchContextSize',e.target.value)}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
   <label className="text-sm">Макс. выходных токенов<input className={inputClass} type="number" min={1000} max={20000} step={500} value={spec.maxOutputTokens??12000} onChange={e=>field('maxOutputTokens',Number(e.target.value))}/></label>
   <label className="text-sm">Стратегия охвата<select className={inputClass} value={spec.coverageMode??'ranked'} onChange={e=>field('coverageMode',e.target.value)}><option value="ranked">Обычная</option><option value="diverse">Разнообразная</option><option value="exhaustive">Исчерпывающая</option></select></label>
   <label className="text-sm">Макс. находок одного поставщика<input className={inputClass} type="number" min={1} max={10} value={spec.maxPerProvider??3} onChange={e=>field('maxPerProvider',Number(e.target.value))}/></label>
   <label className="text-sm">Цель: минимум разных поставщиков<input className={inputClass} type="number" min={1} max={10} value={spec.minDistinctProviders??3} onChange={e=>field('minDistinctProviders',Number(e.target.value))}/></label>
   <label className="text-sm">Фильтр категории<select className={inputClass} value={spec.categoryMode??'open'} onChange={e=>field('categoryMode',e.target.value)}><option value="open">Открытый</option><option value="strict">Строгий</option></select></label>
   <label className="text-sm md:col-span-2">Разрешённые категории, коды через запятую<input className={inputClass} placeholder="food_grocery, non_alcoholic_beverage" value={(spec.allowedCategories??[]).join(', ')} onChange={e=>field('allowedCategories',e.target.value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean))}/></label>
   <label className="text-sm">Показывать сразу в группе<input className={inputClass} type="number" min={1} max={5} value={spec.feedPreviewCount??1} onChange={e=>field('feedPreviewCount',Number(e.target.value))}/></label>
  </div>
  {spec.categoryMode==='strict'&&!(spec.allowedCategories?.length)&&<p className="mt-2 text-xs font-semibold text-red-700">Для строгого фильтра укажите хотя бы одну разрешённую категорию.</p>}
 </details>}
 {admin&&!editing&&<label className="flex items-center gap-2"><input type="checkbox" checked={spec.scope==='public'} onChange={e=>field('scope',e.target.checked?'public':'private')}/>{t[19]}</label>}
 <fieldset><legend>{t[9]} ({spec.objectIds.length}/8)</legend><p className="text-xs">{t[32]}</p><input aria-label={t[10]} className={inputClass} placeholder={t[10]} value={search} onChange={e=>setSearch(e.target.value)}/>
 <div className="max-h-48 overflow-y-auto border p-2">{options.map(o=><label key={o.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={spec.objectIds.includes(o.id)} disabled={!spec.objectIds.includes(o.id)&&spec.objectIds.length>=8} onChange={e=>field('objectIds',e.target.checked?[...spec.objectIds,o.id]:spec.objectIds.filter(id=>id!==o.id))}/>{o.title}</label>)}</div>
 {spec.objectIds.filter(id=>!options.some(o=>o.id===id)).map(id=><button key={id} type="button" className="m-1 rounded border px-2 text-xs" onClick={()=>field('objectIds',spec.objectIds.filter(x=>x!==id))}>{id.slice(0,8)} ×</button>)}</fieldset>
 <div className="flex gap-2"><button className={buttonClass} disabled={busy||!spec.objectIds.length||(spec.categoryMode==='strict'&&!(spec.allowedCategories?.length))} type="submit">{t[11]}</button><button className={buttonClass} disabled={busy} type="button" onClick={()=>setOpen(false)}>{t[12]}</button></div>
 </form>}
 {preview&&<div className="mt-4 space-y-2 border-t pt-3"><strong>{t[14]}</strong>{typeof preview.usage?.coverageSummary==='string'&&<p className="text-sm text-slate-600">{v.coverage}: {preview.usage.coverageSummary}</p>}{!preview.items.length&&<p>{t[24]}</p>}{preview.items.map((i,k)=><article key={k} className="rounded-lg bg-slate-50 p-3 text-sm"><p>{i.summary} <a className="text-blue-700 underline" href={i.url} target="_blank" rel="noopener noreferrer">{t[26]}: {i.source}</a></p><p className="text-xs text-slate-500">{i.providerKey?`${i.providerKey} · `:''}{i.category?`${i.category} · `:''}{i.publishedAt?new Date(i.publishedAt).toLocaleDateString(locale):t[37]}{i.validUntil?` · ${v.validUntil}: ${i.validUntil}`:''}</p></article>)}
 {preview.items.length>0&&<button className={buttonClass} disabled={busy} onClick={()=>void perform(async()=>{await action({action:'publish',id:preview.id,runId:preview.runId});setPreview(null);setNotice(t[34]);})}>{t[15]}</button>}<button className={buttonClass} onClick={()=>setPreview(null)}>{t[12]}</button></div>}
 {historyId&&<div className="mt-4 border-t pt-3"><h3>{t[21]}</h3>{runs.map(r=><div key={r.id} className="border-b py-2 text-xs"><p>{new Date(r.started_at).toLocaleString(locale)} · {r.status} · {r.error_code??''} · {r.published_count}</p><details><summary>Usage</summary><pre className="overflow-auto">{JSON.stringify(r.usage,null,2)}</pre></details>{r.status==='ready'&&<button className={buttonClass} onClick={()=>setPreview({id:historyId,runId:r.id,items:r.items,usage:r.usage})}>{t[14]}</button>}</div>)}<button className={buttonClass} onClick={()=>setHistoryId('')}>{t[12]}</button></div>}
 </section>;
}
