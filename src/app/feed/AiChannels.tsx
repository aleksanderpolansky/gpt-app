'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChannelSpec,ChannelRow,ChannelItem,OntologyOption } from '@/lib/ai-channels/contracts';
import { channelWords } from '@/lib/ai-channels/copy';
const inputClass='w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900';
const buttonClass='rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40';
type Run={id:string;status:string;started_at:string;error_code:string|null;published_count:number;items:ChannelItem[];usage:Record<string,unknown>;revision:number};
const fresh=(locale:string,admin:boolean):ChannelSpec=>({name:'',topic:'',geography:'',exclusions:'',domains:[],language:locale,intervalHours:24,lookbackDays:7,maxItems:5,objectIds:[],scope:admin?'public':'private'});
export default function AiChannels({locale}:{locale:string}){
 const t=channelWords(locale),router=useRouter();
 const [channels,setChannels]=useState<ChannelRow[]>([]),[signedIn,setSignedIn]=useState(false),[admin,setAdmin]=useState(false);
 const [open,setOpen]=useState(false),[editing,setEditing]=useState<string|null>(null),[spec,setSpec]=useState<ChannelSpec>(fresh(locale,false));
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[options,setOptions]=useState<OntologyOption[]>([]),[search,setSearch]=useState('');
 const [preview,setPreview]=useState<{id:string;runId:string;items:ChannelItem[]}|null>(null),[runs,setRuns]=useState<Run[]>([]),[historyId,setHistoryId]=useState('');
 async function load(){const r=await fetch('/api/ai-channels',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);setChannels(d.channels);setSignedIn(d.signedIn);setAdmin(d.admin);}
 useEffect(()=>{let current=true;fetch('/api/ai-channels',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(current){setChannels(d.channels);setSignedIn(d.signedIn);setAdmin(d.admin);}}).catch(e=>{if(current)setError(String(e.message));});return()=>{current=false;};},[]);
 useEffect(()=>{if(!open)return;const abort=new AbortController();const timer=setTimeout(()=>{fetch('/api/ai-channels?objects='+encodeURIComponent(search),{signal:abort.signal}).then(r=>r.json()).then(d=>{if(d.error)throw Error(d.error);setOptions(d.objects??[]);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});},250);return()=>{clearTimeout(timer);abort.abort();};},[search,open]);
 async function action(body:Record<string,unknown>){const r=await fetch('/api/ai-channels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}
 async function perform(fn:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await fn();await load();router.refresh();}catch(e){setError(e instanceof Error?e.message:'CHANNEL_REQUEST_FAILED');}finally{setBusy(false);}}
 const field=(key:keyof ChannelSpec,value:unknown)=>setSpec(s=>({...s,[key]:value}));
 return <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-slate-800" aria-label={t[1]}>
 <div className="flex flex-wrap items-start gap-2"><details className="min-w-[160px] flex-1"><summary className="cursor-pointer py-2 font-semibold">{t[1]} ({channels.length})</summary>
 {!channels.length&&<p className="py-2 text-sm">{t[38]}</p>}
 {channels.map(c=><div key={c.id} className="border-t py-3"><label className="flex items-center gap-2"><input type="checkbox" checked={c.enabled} disabled={!signedIn||busy} onChange={e=>{const enabled=e.target.checked;void perform(async()=>{await action({action:'preference',id:c.id,enabled});});}} aria-label={`${t[31]}: ${c.name}`}/><strong>{c.name}</strong><span className="text-xs">{c.scope==='public'?t[19]:t[20]}</span></label>
 {c.canManage&&<><p className="my-1 text-xs">{t[27]}: {c.last_run_at?new Date(c.last_run_at).toLocaleString(locale):'—'} · {c.status==='active'?t[16]:t[17]}</p>{c.last_error&&<p className="text-xs text-red-700">{c.last_error}</p>}
 <div className="flex flex-wrap gap-1">
 <button className={buttonClass} disabled={busy} onClick={()=>{setEditing(c.id);setSpec({...c.spec,revision:c.revision});setSearch('');setOpen(true);setPreview(null);}}>{t[13]}</button>
 <button className={buttonClass} disabled={busy} onClick={()=>void perform(async()=>{const d=await action({action:'test',id:c.id});setPreview({id:c.id,runId:d.runId,items:d.items});})}>{t[14]}</button>
 <button className={buttonClass} disabled={busy} onClick={()=>void perform(async()=>{await action({action:'status',id:c.id,status:c.status==='active'?'paused':'active'});})}>{c.status==='active'?t[17]:t[16]}</button>
 <button className={buttonClass} disabled={busy} onClick={()=>void perform(async()=>{const r=await fetch('/api/ai-channels?history='+c.id);const d=await r.json();if(!r.ok)throw Error(d.error);setRuns(d.runs);setHistoryId(c.id);})}>{t[21]}</button>
 <button className={buttonClass} disabled={busy} onClick={()=>{if(window.confirm(t[35]))void perform(async()=>{await action({action:'status',id:c.id,status:'archived'});setPreview(null);});}}>{t[18]}</button>
 </div></>}
 </div>)}</details>
 {signedIn?<button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40" disabled={busy} onClick={()=>{setEditing(null);setSpec(fresh(locale,admin));setSearch('');setOpen(true);setPreview(null);}}>{t[0]}</button>:<p className="text-sm">{t[30]}</p>}</div>
 {signedIn&&<p className="mt-2 text-xs text-slate-500">{t[29]}</p>}
 {busy&&<p role="status" className="mt-2">{t[28]}</p>}{notice&&<p role="status" className="mt-2 text-green-700">{notice}</p>}{error&&<p role="alert" className="mt-2 text-red-700">{error==='CHANNEL_SCHEMA_REQUIRED'?t[36]:error}</p>}
 {open&&<form className="mt-4 space-y-3 border-t pt-4" onSubmit={e=>{e.preventDefault();void perform(async()=>{const d=await action({action:'save',id:editing,spec});setEditing(d.id);setOpen(false);setNotice(t[33]);});}}>
 <h2 className="font-semibold">{editing?t[13]:t[0]}</h2>
 {(['name','topic','geography','exclusions'] as const).map((key,i)=><label key={key} className="block text-sm">{t[i+2]}{key==='topic'?<textarea className={inputClass} rows={3} maxLength={2000} required value={spec[key]} onChange={e=>field(key,e.target.value)}/>:<input className={inputClass} maxLength={key==='name'?120:key==='geography'?200:1000} required={key==='name'} value={spec[key]} onChange={e=>field(key,e.target.value)}/>}</label>)}
 <label className="block text-sm">{t[6]}<input className={inputClass} value={spec.domains.join(', ')} onChange={e=>field('domains',e.target.value.split(',').map(x=>x.trim()))}/></label>
 <div className="grid grid-cols-2 gap-3"><label>{t[7]}<select className={inputClass} value={spec.language} onChange={e=>field('language',e.target.value)}>{['ru','uk','pl','en','de','es','cs'].map(l=><option key={l}>{l}</option>)}</select></label>
 <label>{t[8]}<select className={inputClass} value={spec.intervalHours} onChange={e=>field('intervalHours',Number(e.target.value))}>{[1,6,24,168].map(h=><option key={h} value={h}>{h} h</option>)}</select></label>
 <label>{t[22]}<input className={inputClass} type="number" min={1} max={30} value={spec.lookbackDays} onChange={e=>field('lookbackDays',Number(e.target.value))}/></label>
 <label>{t[23]}<input className={inputClass} type="number" min={1} max={10} value={spec.maxItems} onChange={e=>field('maxItems',Number(e.target.value))}/></label></div>
 {admin&&!editing&&<label className="flex items-center gap-2"><input type="checkbox" checked={spec.scope==='public'} onChange={e=>field('scope',e.target.checked?'public':'private')}/>{t[19]}</label>}
 <fieldset><legend>{t[9]} ({spec.objectIds.length}/8)</legend><p className="text-xs">{t[32]}</p><input aria-label={t[10]} className={inputClass} placeholder={t[10]} value={search} onChange={e=>setSearch(e.target.value)}/>
 <div className="max-h-48 overflow-y-auto border p-2">{options.map(o=><label key={o.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={spec.objectIds.includes(o.id)} disabled={!spec.objectIds.includes(o.id)&&spec.objectIds.length>=8} onChange={e=>field('objectIds',e.target.checked?[...spec.objectIds,o.id]:spec.objectIds.filter(id=>id!==o.id))}/>{o.title}</label>)}</div>
 {spec.objectIds.filter(id=>!options.some(o=>o.id===id)).map(id=><button key={id} type="button" className="m-1 rounded border px-2 text-xs" onClick={()=>field('objectIds',spec.objectIds.filter(x=>x!==id))}>{id.slice(0,8)} ×</button>)}</fieldset>
 <div className="flex gap-2"><button className={buttonClass} disabled={busy||!spec.objectIds.length} type="submit">{t[11]}</button><button className={buttonClass} disabled={busy} type="button" onClick={()=>setOpen(false)}>{t[12]}</button></div>
 </form>}
 {preview&&<div className="mt-4 space-y-2 border-t pt-3"><strong>{t[14]}</strong>{!preview.items.length&&<p>{t[24]}</p>}{preview.items.map((i,k)=><article key={k} className="rounded-lg bg-slate-50 p-3 text-sm"><p>{i.summary} <a className="text-blue-700 underline" href={i.url} target="_blank" rel="noopener noreferrer">{t[26]}: {i.source}</a></p><p className="text-xs text-slate-500">{i.publishedAt?new Date(i.publishedAt).toLocaleDateString(locale):t[37]}</p></article>)}
 {preview.items.length>0&&<button className={buttonClass} disabled={busy} onClick={()=>void perform(async()=>{await action({action:'publish',id:preview.id,runId:preview.runId});setPreview(null);setNotice(t[34]);})}>{t[15]}</button>}<button className={buttonClass} onClick={()=>setPreview(null)}>{t[12]}</button></div>}
 {historyId&&<div className="mt-4 border-t pt-3"><h3>{t[21]}</h3>{runs.map(r=><div key={r.id} className="border-b py-2 text-xs"><p>{new Date(r.started_at).toLocaleString(locale)} · {r.status} · {r.error_code??''} · {r.published_count}</p><details><summary>Usage</summary><pre className="overflow-auto">{JSON.stringify(r.usage,null,2)}</pre></details>{r.status==='ready'&&<button className={buttonClass} onClick={()=>setPreview({id:historyId,runId:r.id,items:r.items})}>{t[14]}</button>}</div>)}<button className={buttonClass} onClick={()=>setHistoryId('')}>{t[12]}</button></div>}
 </section>;
}
